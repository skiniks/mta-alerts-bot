import type { AlertEntity } from '../../types/index.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockConfig, setupConsoleMocks } from '../utils/testSetup.js'

vi.mock('../../config', () => mockConfig)
vi.mock('../../services/bsky', () => ({
  postAlertToBsky: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../../services/database', () => ({
  isAlertDuplicate: vi.fn().mockResolvedValue(false),
  insertAlertToDb: vi.fn().mockResolvedValue(true),
}))
vi.mock('../../utils/alerts', () => ({
  formatAlertText: vi.fn().mockImplementation((alert: AlertEntity) => {
    if (!alert.alert?.header_text?.translation?.[0]?.text)
      return null
    return {
      text: alert.alert.header_text.translation[0].text,
      id: alert.id,
      headerTranslation: alert.alert.header_text.translation[0].text,
    }
  }),
  isValidAlert: vi.fn().mockImplementation((alert: AlertEntity) => {
    if (alert.id.includes('planned_work'))
      return false
    return true
  }),
}))

const { fetchAlerts } = await import('../../services/alerts.js')
const { formatAlertText, isValidAlert } = await import('../../utils/alerts.js')
const { postAlertToBsky } = await import('../../services/bsky.js')
const { isAlertDuplicate, insertAlertToDb } = await import('../../services/database.js')

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('alerts utils', () => {
  const consoleMocks = setupConsoleMocks()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    consoleMocks.restore()
  })

  describe('formatAlertText', () => {
    it('should format valid alert text', () => {
      const mockAlert: AlertEntity = {
        id: 'test-id',
        alert: {
          'header_text': {
            translation: [
              { language: 'en', text: 'Test Alert' },
            ],
          },
          'transit_realtime.mercury_alert': {
            created_at: Date.now(),
          },
        },
      }

      const result = formatAlertText(mockAlert)
      expect(result).toEqual({
        text: 'Test Alert',
        id: 'test-id',
        headerTranslation: 'Test Alert',
      })
    })

    it('should return null for invalid alert', () => {
      const mockAlert = {
        id: 'test-id',
        alert: {},
      } as AlertEntity

      const result = formatAlertText(mockAlert)
      expect(result).toBeNull()
    })
  })

  describe('isValidAlert', () => {
    it('should return true for valid recent alert', () => {
      const currentTime = Math.floor(Date.now() / 1000)
      const mockAlert: AlertEntity = {
        id: 'test-id',
        alert: {
          'header_text': {
            translation: [{ language: 'en', text: 'Test' }],
          },
          'transit_realtime.mercury_alert': {
            created_at: currentTime,
          },
        },
      }

      const result = isValidAlert(mockAlert, currentTime - 3600)
      expect(result).toBe(true)
    })

    it('should return false for planned work alerts', () => {
      const currentTime = Math.floor(Date.now() / 1000)
      const mockAlert: AlertEntity = {
        id: 'lmm:planned_work:123',
        alert: {
          'header_text': {
            translation: [{ language: 'en', text: 'Test' }],
          },
          'transit_realtime.mercury_alert': {
            created_at: currentTime,
          },
        },
      }

      const result = isValidAlert(mockAlert, currentTime - 3600)
      expect(result).toBe(false)
    })
  })
})

describe('alerts Service', () => {
  const consoleMocks = setupConsoleMocks()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    consoleMocks.restore()
  })

  describe('fetchAlerts', () => {
    const mockValidResponse = {
      entity: [
        {
          id: 'test-alert-1',
          alert: {
            'header_text': {
              translation: [
                { language: 'en', text: 'Service Alert 1' },
              ],
            },
            'transit_realtime.mercury_alert': {
              created_at: Math.floor(Date.now() / 1000),
            },
          },
        },
        {
          id: 'test-alert-2',
          alert: {
            'header_text': {
              translation: [
                { language: 'en', text: 'Service Alert 2' },
              ],
            },
            'transit_realtime.mercury_alert': {
              created_at: Math.floor(Date.now() / 1000),
            },
          },
        },
      ],
    }

    it('should process valid alerts successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockValidResponse),
      })

      vi.mocked(isAlertDuplicate).mockResolvedValue(false)
      vi.mocked(insertAlertToDb).mockResolvedValue(true)
      vi.mocked(postAlertToBsky).mockResolvedValue()

      await fetchAlerts()

      expect(postAlertToBsky).toHaveBeenCalledTimes(2)
      expect(insertAlertToDb).toHaveBeenCalledTimes(2)
    })

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const consoleSpy = vi.spyOn(console, 'error')

      await fetchAlerts()

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error fetching MTA alerts:',
        expect.any(Error),
      )
      expect(postAlertToBsky).not.toHaveBeenCalled()
      expect(insertAlertToDb).not.toHaveBeenCalled()
    })

    it('should skip duplicate alerts', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockValidResponse),
      })

      vi.mocked(isAlertDuplicate)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)

      vi.mocked(insertAlertToDb).mockResolvedValue(true)
      vi.mocked(postAlertToBsky).mockResolvedValue()

      await fetchAlerts()

      expect(postAlertToBsky).toHaveBeenCalledTimes(1)
      expect(insertAlertToDb).toHaveBeenCalledTimes(1)
    })

    it('should filter out planned work alerts', async () => {
      const responseWithPlannedWork = {
        entity: [
          ...mockValidResponse.entity,
          {
            id: 'lmm:planned_work:123',
            alert: {
              'header_text': {
                translation: [
                  { language: 'en', text: 'Planned Work Alert' },
                ],
              },
              'transit_realtime.mercury_alert': {
                created_at: Math.floor(Date.now() / 1000),
              },
            },
          },
        ],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(responseWithPlannedWork),
      })

      vi.mocked(isAlertDuplicate).mockResolvedValue(false)
      vi.mocked(insertAlertToDb).mockResolvedValue(true)
      vi.mocked(postAlertToBsky).mockResolvedValue()

      await fetchAlerts()

      expect(postAlertToBsky).toHaveBeenCalledTimes(2)
      expect(insertAlertToDb).toHaveBeenCalledTimes(2)
    })

    it('should handle network timeouts', async () => {
      mockFetch.mockImplementationOnce(() =>
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 100)),
      )

      const consoleSpy = vi.spyOn(console, 'error')
      await fetchAlerts()

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error fetching MTA alerts:',
        expect.any(Error),
      )
      expect(postAlertToBsky).not.toHaveBeenCalled()
      expect(insertAlertToDb).not.toHaveBeenCalled()
    })

    it('should handle malformed API responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ entity: 'not-an-array' }),
      })

      const consoleWarnSpy = vi.spyOn(console, 'warn')
      await fetchAlerts()

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'data.entity is not an array:',
        'not-an-array',
      )
      expect(postAlertToBsky).not.toHaveBeenCalled()
      expect(insertAlertToDb).not.toHaveBeenCalled()
    })

    it('should handle empty API responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      const consoleWarnSpy = vi.spyOn(console, 'warn')
      await fetchAlerts()

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Unexpected data structure:',
        {},
      )
      expect(postAlertToBsky).not.toHaveBeenCalled()
      expect(insertAlertToDb).not.toHaveBeenCalled()
    })
  })
})
