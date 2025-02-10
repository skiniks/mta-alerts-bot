import type { AlertEntity, FormattedAlert } from '../types/index.js'

export function formatAlertText(entity: AlertEntity): FormattedAlert | null {
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

export function isValidAlert(entity: AlertEntity, bufferTimestamp: number): boolean {
  const createdAt = entity.alert?.['transit_realtime.mercury_alert']?.created_at

  if (!entity.alert || !entity.alert.header_text || !createdAt || entity.id.startsWith('lmm:planned_work'))
    return false

  return createdAt >= bufferTimestamp
}
