import type { FormattedAlert } from '../types'
import { supabase } from '../utils/supabaseClient.js'

export async function isAlertDuplicate(alertId: string, headerTranslation: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('mta_alerts')
    .select('id')
    .or(`alert_id.eq.${alertId},header_translation.eq.${headerTranslation}`)

  if (error) {
    console.error('Error checking for duplicates:', error.message)
    return true
  }

  return data.length > 0
}

export async function insertAlertToDb(formattedAlert: FormattedAlert): Promise<boolean> {
  const { error } = await supabase
    .from('mta_alerts')
    .insert([{
      alert_id: formattedAlert.id,
      header_translation: formattedAlert.headerTranslation,
      created_at: new Date(),
    }])

  if (error) {
    console.error('Error inserting alert into database:', error)
    return false
  }

  return true
}

export async function deleteOldAlerts(): Promise<void> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const { error } = await supabase
    .from('mta_alerts')
    .delete()
    .lt('created_at', twentyFourHoursAgo.toISOString())

  if (error)
    console.error('Error deleting old alerts:', error)
}
