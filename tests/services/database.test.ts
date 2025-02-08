import type { PostgrestError } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockSupabase } from '../utils/testHelpers'
import { setupConsoleMocks } from '../utils/testSetup'

vi.mock('../../utils/supabaseClient', () => ({
  supabase: mockSupabase,
}))

type SupabaseError = PostgrestError | null

const { deleteOldAlerts, insertAlertToDb, isAlertDuplicate } = await import('../../services/database')

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
      const result = await isAlertDuplicate('test-id', 'Test Alert')
      expect(result).toBe(false)
      expect(mockSupabase.from).toHaveBeenCalledWith('mta_alerts')
    })

    it('should return true when error occurs', async () => {
      mockSupabase.from.mockImplementationOnce(() => ({
        select: vi.fn(() => ({
          or: vi.fn(() => ({
            data: [],
            error: new Error('Database error') as SupabaseError,
          })),
        })),
        insert: vi.fn(() => ({
          error: null as SupabaseError,
        })),
        delete: vi.fn(() => ({
          lt: vi.fn(() => ({
            error: null as SupabaseError,
          })),
        })),
      }))

      const result = await isAlertDuplicate('test-id', 'Test Alert')
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
      expect(mockSupabase.from).toHaveBeenCalledWith('mta_alerts')
    })

    it('should handle connection failures', async () => {
      mockSupabase.from.mockImplementationOnce(() => ({
        select: vi.fn(() => ({
          or: vi.fn(() => ({
            data: [],
            error: null as SupabaseError,
          })),
        })),
        insert: vi.fn(() => ({
          error: new Error('Connection failed') as SupabaseError,
        })),
        delete: vi.fn(() => ({
          lt: vi.fn(() => ({
            error: null as SupabaseError,
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
      expect(mockSupabase.from).toHaveBeenCalledTimes(3)
    })
  })

  describe('deleteOldAlerts', () => {
    it('should delete alerts older than 24 hours', async () => {
      await deleteOldAlerts()
      expect(mockSupabase.from).toHaveBeenCalledWith('mta_alerts')
    })

    it('should handle database errors during deletion', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const expectedError = new Error('Deletion failed')
      mockSupabase.from.mockImplementationOnce(() => ({
        select: vi.fn(() => ({
          or: vi.fn(() => ({
            data: [],
            error: null as SupabaseError,
          })),
        })),
        insert: vi.fn(() => ({
          error: null as SupabaseError,
        })),
        delete: vi.fn(() => ({
          lt: vi.fn(() => ({
            error: expectedError,
          })),
        })),
      }))

      await deleteOldAlerts()

      expect(mockSupabase.from).toHaveBeenCalledWith('mta_alerts')
      expect(errorSpy).toHaveBeenCalledWith(
        'Error deleting old alerts:',
        expectedError,
      )

      errorSpy.mockRestore()
    })
  })
})
