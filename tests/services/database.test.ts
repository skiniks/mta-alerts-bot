import type { PostgrestError } from '@supabase/postgrest-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockPostgrest } from '../utils/testHelpers.js'
import { setupConsoleMocks } from '../utils/testSetup.js'

vi.mock('../../src/utils/supabaseClient', () => ({
  postgrest: mockPostgrest,
}))

type PostgrestClientError = PostgrestError | null

const { deleteOldAlerts, insertAlertToDb, isAlertDuplicate } = await import('../../src/services/database.js')

describe('database service', () => {
  const consoleMocks = setupConsoleMocks()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    consoleMocks.restore()
  })

  describe('isAlertDuplicate', () => {
    it('should return false when no duplicates found', async () => {
      const result = await isAlertDuplicate('test-id')
      expect(result).toBe(false)
      expect(mockPostgrest.from).toHaveBeenCalledWith('mta_alerts')
    })

    it('should return true when error occurs', async () => {
      mockPostgrest.from.mockImplementationOnce(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            limit: vi.fn(() => ({
              data: [],
              error: new Error('Database error') as PostgrestClientError,
            })),
          })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            error: null as PostgrestClientError,
          })),
        })),
        delete: vi.fn(() => ({
          lt: vi.fn(() => ({
            error: null as PostgrestClientError,
          })),
        })),
      }))

      const result = await isAlertDuplicate('test-id')
      expect(result).toBe(true)
    })
  })

  describe('insertAlertToDb', () => {
    it('should successfully insert alert', async () => {
      const alert = {
        id: 'test-id',
        text: 'Test Alert',
        headerTranslation: 'Test Alert',
      }

      const result = await insertAlertToDb(alert)
      expect(result).toBe(true)
      expect(mockPostgrest.from).toHaveBeenCalledWith('mta_alerts')
    })

    it('should handle connection failures', async () => {
      mockPostgrest.from.mockImplementationOnce(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            limit: vi.fn(() => ({
              data: [],
              error: null as PostgrestClientError,
            })),
          })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            error: new Error('Connection failed') as PostgrestClientError,
          })),
        })),
        delete: vi.fn(() => ({
          lt: vi.fn(() => ({
            error: null as PostgrestClientError,
          })),
        })),
      }))

      const result = await insertAlertToDb({
        id: 'test-id',
        text: 'Test Alert',
        headerTranslation: 'Test Alert',
      })

      expect(result).toBe(false)
    })

    it('should handle concurrent operations', async () => {
      const alert = {
        id: 'test-id',
        text: 'Test Alert',
        headerTranslation: 'Test Alert',
      }

      const results = await Promise.all([
        insertAlertToDb(alert),
        insertAlertToDb(alert),
        insertAlertToDb(alert),
      ])

      expect(results.every(result => result === true)).toBe(true)
      expect(mockPostgrest.from).toHaveBeenCalledTimes(3)
    })

    it('should handle race condition with duplicate key error', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const duplicateError = {
        message: 'duplicate key value violates unique constraint',
        code: '23505',
      } as PostgrestClientError

      mockPostgrest.from.mockImplementationOnce(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            limit: vi.fn(() => ({
              data: [],
              error: null as PostgrestClientError,
            })),
          })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            error: duplicateError,
          })),
        })),
        delete: vi.fn(() => ({
          lt: vi.fn(() => ({
            error: null as PostgrestClientError,
          })),
        })),
      }))

      const result = await insertAlertToDb({
        id: 'test-id',
        text: 'Test Alert',
        headerTranslation: 'Test Alert',
      })

      expect(result).toBe(false)
      expect(logSpy).toHaveBeenCalledWith(
        'Alert test-id already exists (race condition handled)',
      )

      logSpy.mockRestore()
    })
  })

  describe('deleteOldAlerts', () => {
    it('should delete alerts older than 24 hours', async () => {
      await deleteOldAlerts()
      expect(mockPostgrest.from).toHaveBeenCalledWith('mta_alerts')
    })

    it('should handle database errors during deletion', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const expectedError = new Error('Deletion failed')
      mockPostgrest.from.mockImplementationOnce(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            limit: vi.fn(() => ({
              data: [],
              error: null as PostgrestClientError,
            })),
          })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            error: null as PostgrestClientError,
          })),
        })),
        delete: vi.fn(() => ({
          lt: vi.fn(() => ({
            error: expectedError,
          })),
        })),
      }))

      await deleteOldAlerts()

      expect(mockPostgrest.from).toHaveBeenCalledWith('mta_alerts')
      expect(errorSpy).toHaveBeenCalledWith(
        'Error deleting old alerts:',
        expectedError,
      )

      errorSpy.mockRestore()
    })
  })
})
