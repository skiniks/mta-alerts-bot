import type { FormattedAlert } from '../types/index.js'
import { postgrest } from '../utils/supabaseClient.js'

export async function isAlertDuplicate(alertId: string): Promise<boolean> {
  const { data, error } = await postgrest
    .from('mta_alerts')
    .select('id')
    .eq('alert_id', alertId)
    .limit(1)

  if (error) {
    console.error('Error checking for duplicates:', error.message)
    return true
  }

  return data.length > 0
}

export async function isAlertTextDuplicate(headerTranslation: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

  const { data, error } = await postgrest
    .from('mta_alerts')
    .select('id')
    .eq('header_translation', headerTranslation)
    .gte('created_at', oneHourAgo.toISOString())
    .limit(1)

  if (error) {
    console.error('Error checking for text duplicates:', error.message)
    return false
  }

  return data.length > 0
}

export async function insertAlertToDb(formattedAlert: FormattedAlert): Promise<boolean> {
  const { error } = await postgrest
    .from('mta_alerts')
    .insert([{
      alert_id: formattedAlert.id,
      header_translation: formattedAlert.headerTranslation,
      created_at: new Date(),
    }])
    .select()

  if (error) {
    if (error.code === '23505') {
      console.log(`Alert ${formattedAlert.id} already exists (race condition handled)`)
      return false
    }
    console.error('Error inserting alert into database:', error)
    return false
  }

  return true
}

export async function deleteOldAlerts(): Promise<void> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const { error } = await postgrest
    .from('mta_alerts')
    .delete()
    .lt('created_at', twentyFourHoursAgo.toISOString())

  if (error)
    console.error('Error deleting old alerts:', error)
}
