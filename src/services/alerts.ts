import { ALERT_FEED_URL, API_KEY } from '../config/index.js'
import { formatAlertText, isValidAlert } from '../utils/alerts.js'
import { postAlertToBsky } from './bsky.js'
import { insertAlertToDb, isAlertDuplicate } from './database.js'

export async function fetchAlerts(): Promise<void> {
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
        const formattedAlert = formatAlertText(entity)
        if (!formattedAlert)
          continue

        if (isValidAlert(entity, bufferTimestamp)) {
          const isDuplicate = await isAlertDuplicate(formattedAlert.id)
          if (!isDuplicate) {
            const inserted = await insertAlertToDb(formattedAlert)
            if (inserted) {
              await postAlertToBsky(formattedAlert)
              foundNewAlert = true
            }
          }
        }
      }
    }
    else {
      console.warn('data.entity is not an array:', data.entity)
    }

    if (!foundNewAlert)
      console.warn('No new alerts')
  }
  catch (error) {
    console.error('Error fetching MTA alerts:', error)
  }
}
