import { BskyAgent } from '@atproto/api'
import { createKysely } from '@vercel/postgres-kysely'

interface Database {
  mta_alerts: {
    alert_id: string
    header_translation: string
    created_at: Date
  }
}

interface AlertEntity {
  id: string
  alert?: {
    'header_text'?: {
      translation?: Array<{ language: string, text: string }>
    }
    'transit_realtime.mercury_alert'?: {
      created_at: number
    }
  }
}

interface FormattedAlert {
  text: string
  id: string
  headerTranslation: string
}

const API_KEY = process.env.MTA_API_KEY
const ALERT_FEED_URL = process.env.MTA_API_URL
const bskyUsername = process.env.BSKY_USERNAME
const bskyPassword = process.env.BSKY_PASSWORD

const db = createKysely<Database>()

const agent = new BskyAgent({
  service: 'https://bsky.social',
})

function formatAlertText(entity: AlertEntity): FormattedAlert | null {
  if (!entity?.alert?.header_text?.translation)
    return null

  const headerTranslations = entity.alert.header_text.translation
  const headerTranslation = headerTranslations.find(t => t.language === 'en')

  if (!headerTranslation)
    return null

  const headerText = headerTranslation.text

  return {
    text: `${headerText}`,
    id: entity.id,
    headerTranslation: headerText,
  }
}

function isValidAlert(entity: AlertEntity, bufferTimestamp: number): boolean {
  const createdAt = entity.alert?.['transit_realtime.mercury_alert']?.created_at

  if (!entity.alert || !entity.alert.header_text || !createdAt || entity.id.startsWith('lmm:planned_work'))
    return false

  return createdAt >= bufferTimestamp
}

async function isAlertDuplicate(headerTranslation: string): Promise<boolean> {
  const result = await db
    .selectFrom('mta_alerts')
    .select('header_translation')
    .where('header_translation', '=', headerTranslation)
    .executeTakeFirst()

  return !!result
}

async function postAlertToBsky(formattedAlert: FormattedAlert): Promise<void> {
  const truncatedText = formattedAlert.text.slice(0, 300)
  await agent.post({
    $type: 'app.bsky.feed.post',
    text: truncatedText,
    createdAt: new Date().toISOString(),
  })

  // eslint-disable-next-line no-console
  console.log('New alert posted:', truncatedText)
}

async function insertAlertToDb(formattedAlert: FormattedAlert): Promise<boolean> {
  try {
    await db
      .insertInto('mta_alerts')
      .values({
        alert_id: formattedAlert.id,
        header_translation: formattedAlert.headerTranslation,
        created_at: new Date(),
      })
      .execute()

    return true
  }
  catch (error) {
    console.error('Error inserting alert into database:', error)
    return false
  }
}

async function deleteOldAlerts(): Promise<void> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  try {
    await db
      .deleteFrom('mta_alerts')
      .where('created_at', '<', twentyFourHoursAgo)
      .execute()
  }
  catch (error) {
    console.error('Error deleting old alerts:', error)
  }
}

async function fetchAlerts(): Promise<void> {
  try {
    const response = await fetch(ALERT_FEED_URL!, {
      headers: { 'x-api-key': API_KEY! },
    })

    if (!response.ok)
      throw new Error(`HTTP error! status: ${response.status}`)

    const data = await response.json()

    if (!data || !data.entity) {
      console.warn('Unexpected data structure:', data)
      return
    }

    const bufferTimestamp = Math.floor(Date.now() / 1000) - 24 * 60 * 60
    let foundNewAlert = false

    if (Array.isArray(data.entity)) {
      for (const entity of data.entity) {
        const formattedAlert = formatAlertText(entity as AlertEntity)
        if (!formattedAlert)
          continue

        if (isValidAlert(entity as AlertEntity, bufferTimestamp)) {
          const isDuplicate = await isAlertDuplicate(formattedAlert.headerTranslation)
          if (!isDuplicate) {
            await postAlertToBsky(formattedAlert)
            const inserted = await insertAlertToDb(formattedAlert)
            if (inserted)
              foundNewAlert = true
          }
        }
      }
    }
    else {
      console.warn('data.entity is not an array:', data.entity)
    }
    if (!foundNewAlert)
      // eslint-disable-next-line no-console
      console.log('No new alerts')
  }
  catch (error) {
    console.error('Error fetching MTA alerts:', error instanceof Error ? error.message : error)
  }
}

export default async function handler(_req: any, res: any): Promise<void> {
  try {
    await agent.login({
      identifier: bskyUsername!,
      password: bskyPassword!,
    })

    await fetchAlerts()
    await deleteOldAlerts()
    res.status(200).send('OK')
  }
  catch (error) {
    console.error('Error in handler:', error)
    res.status(500).send('An error occurred while processing your request.')
  }
}
