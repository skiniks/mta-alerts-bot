import type { VercelRequest, VercelResponse } from '@vercel/node'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockConfig, mockSupabaseResponse } from '../utils/testSetup'

vi.mock('../../config', () => mockConfig)
vi.mock('../../utils/supabaseClient', () => ({
  supabase: mockSupabaseResponse,
}))
vi.mock('../../services/bsky', () => ({
  loginToBsky: vi.fn().mockResolvedValue(undefined),
  postAlertToBsky: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../../services/database', () => ({
  isAlertDuplicate: vi.fn(),
  insertAlertToDb: vi.fn(),
  deleteOldAlerts: vi.fn(),
}))
vi.mock('../../services/alerts', () => ({
  fetchAlerts: vi.fn().mockResolvedValue(undefined),
}))

const handler = await import('../../api/handler').then(m => m.default)
const { loginToBsky } = await import('../../services/bsky')

describe('alert Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should process an alert through the entire system', async () => {
    const mockReq = {} as VercelRequest
    const mockRes = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    } as unknown as VercelResponse

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
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
      }),
    })

    await handler(mockReq, mockRes)

    expect(loginToBsky).toHaveBeenCalled()
    expect(mockRes.status).toHaveBeenCalledWith(200)
    expect(mockRes.send).toHaveBeenCalledWith('OK')
  })
})
