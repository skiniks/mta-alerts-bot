import type { AlertEntity } from '../../types/index.js'
import { describe, expect, it } from 'vitest'
import { formatAlertText, isValidAlert } from '../../utils/alerts.js'

describe('alerts utils', () => {
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

    it('should return null for missing header text', () => {
      const mockAlert = {
        id: 'test-id',
        alert: {
          'transit_realtime.mercury_alert': {
            created_at: Date.now(),
          },
        },
      } as AlertEntity

      const result = formatAlertText(mockAlert)
      expect(result).toBeNull()
    })

    it('should return null for missing translation', () => {
      const mockAlert = {
        id: 'test-id',
        alert: {
          'header_text': {},
          'transit_realtime.mercury_alert': {
            created_at: Date.now(),
          },
        },
      } as AlertEntity

      const result = formatAlertText(mockAlert)
      expect(result).toBeNull()
    })

    it('should return null for empty translations array', () => {
      const mockAlert = {
        id: 'test-id',
        alert: {
          'header_text': {
            translation: [],
          },
          'transit_realtime.mercury_alert': {
            created_at: Date.now(),
          },
        },
      } as AlertEntity

      const result = formatAlertText(mockAlert)
      expect(result).toBeNull()
    })
  })

  describe('isValidAlert', () => {
    const currentTime = Math.floor(Date.now() / 1000)
    const bufferTime = currentTime - 3600

    it('should return true for valid recent alert', () => {
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

      expect(isValidAlert(mockAlert, bufferTime)).toBe(true)
    })

    it('should return false for old alerts', () => {
      const mockAlert: AlertEntity = {
        id: 'test-id',
        alert: {
          'header_text': {
            translation: [{ language: 'en', text: 'Test' }],
          },
          'transit_realtime.mercury_alert': {
            created_at: bufferTime - 3600,
          },
        },
      }

      expect(isValidAlert(mockAlert, bufferTime)).toBe(false)
    })

    it('should return false for missing created_at', () => {
      const mockAlert = {
        id: 'test-id',
        alert: {
          header_text: {
            translation: [{ language: 'en', text: 'Test' }],
          },
        },
      } as AlertEntity

      expect(isValidAlert(mockAlert, bufferTime)).toBe(false)
    })

    it('should return false for missing alert data', () => {
      const mockAlert = {
        id: 'test-id',
      } as AlertEntity

      expect(isValidAlert(mockAlert, bufferTime)).toBe(false)
    })

    it('should return false for planned work alerts', () => {
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

      expect(isValidAlert(mockAlert, bufferTime)).toBe(false)
    })
  })
})
