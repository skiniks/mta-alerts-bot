export interface AlertEntity {
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

export interface FormattedAlert {
  text: string
  id: string
  headerTranslation: string
}
