import { BskyAgent } from '@atproto/api'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY
const API_KEY = process.env.MTA_API_KEY
const ALERT_FEED_URL = process.env.MTA_API_URL
const bskyUsername = process.env.BSKY_USERNAME
const bskyPassword = process.env.BSKY_PASSWORD

const supabase = createClient(supabaseUrl!, supabaseKey!)

const agent = new BskyAgent({
  service: 'https://bsky.social',
})

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
  const { data, error } = await supabase
    .from('mta_alerts')
    .select('*')
    .eq('header_translation', headerTranslation)
    .limit(1)

  if (error) {
    console.error('Error checking for duplicate alert:', error)
    return true
  }

  return data.length > 0
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
  const { error: insertError } = await supabase.from('mta_alerts').insert({
    alert_id: formattedAlert.id,
    header_translation: formattedAlert.headerTranslation,
  })

  if (insertError) {
    console.error('Error inserting alert into Supabase:', insertError)
    return false
  }

  return true
}

async function deleteOldAlerts(): Promise<void> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const { error } = await supabase
    .from('mta_alerts')
    .delete()
    .lt('created_at', twentyFourHoursAgo.toISOString())

  if (error)
    console.error('Error deleting old alerts:', error)
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