import type { IncomingMessage, ServerResponse } from 'node:http'

export interface AlertEntity {
  id: string
  alert: {
    'header_text': {
      translation: Array<{ language: string, text: string }>
    }
    'transit_realtime.mercury_alert': {
      created_at: number
    }
  }
}

export interface FormattedAlert {
  text: string
  id: string
  headerTranslation: string
}

export type ApiRequest = IncomingMessage & {
  query: { [key: string]: string | string[] }
  cookies: { [key: string]: string }
  body: any
}

export type ApiResponse = ServerResponse & {
  send: (body: any) => ApiResponse
  json: (jsonBody: any) => ApiResponse
  status: (statusCode: number) => ApiResponse
  redirect: (statusOrUrl: string | number, url?: string) => ApiResponse
}
