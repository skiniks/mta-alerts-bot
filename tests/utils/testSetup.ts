import type { ApiRequest, ApiResponse } from '../../src/types/index.js'
import { vi } from 'vitest'

export const mockConfig = {
  API_KEY: 'test-api-key',
  ALERT_FEED_URL: 'https://api.mta.info',
  BSKY_USERNAME: 'test-user',
  BSKY_PASSWORD: 'test-pass',
  SUPABASE_URL: 'https://supabase.com',
  SUPABASE_KEY: 'test-key',
}

export const mockAlert = {
  id: 'test-id',
  text: 'Test Alert',
  headerTranslation: 'Test Alert',
}

export const mockAlertResponse = {
  entity: [{
    id: 'test-alert',
    alert: {
      'header_text': {
        translation: [{ language: 'en', text: 'Test Alert' }],
      },
      'transit_realtime.mercury_alert': {
        created_at: Math.floor(Date.now() / 1000),
      },
    },
  }],
}

export function setupConsoleMocks() {
  const errorSpy = vi.spyOn(console, 'error')
  const warnSpy = vi.spyOn(console, 'warn')

  return {
    errorSpy,
    warnSpy,
    restore: () => {
      errorSpy.mockRestore()
      warnSpy.mockRestore()
    },
  }
}

export const mockSupabaseResponse = {
  from: () => ({
    select: () => ({
      or: () => ({
        data: [],
        error: null,
      }),
    }),
    insert: () => ({
      error: null,
    }),
    delete: () => ({
      lt: () => ({
        error: null,
      }),
    }),
  }),
}

export const mockApiRequest = {} as ApiRequest
export const mockApiResponse = {
  status: vi.fn().mockReturnThis(),
  send: vi.fn(),
} as unknown as ApiResponse

export function createMockFetchResponse(data: any = mockAlertResponse) {
  return {
    ok: true,
    json: () => Promise.resolve(data),
  }
}

export const mocks = {
  config: mockConfig,
  alert: mockAlert,
  response: mockAlertResponse,
  supabase: mockSupabaseResponse,
}

export const utils = {
  setupConsoleMocks,
  createMockFetchResponse,
}
