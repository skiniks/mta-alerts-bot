import { PostgrestClient } from '@supabase/postgrest-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPostgrestClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      or: vi.fn(),
    })),
    insert: vi.fn(),
    delete: vi.fn(() => ({
      lt: vi.fn(),
    })),
  })),
}

vi.mock('@supabase/postgrest-js', () => ({
  PostgrestClient: vi.fn(() => mockPostgrestClient),
}))

vi.resetModules()

describe('postgrest Client', () => {
  let postgrest: any

  beforeEach(async () => {
    vi.clearAllMocks()
    postgrest = (await import('../../src/utils/supabaseClient.js')).postgrest
  })

  it('should create and export a PostgrestClient client', () => {
    expect(PostgrestClient).toHaveBeenCalled()
    expect(postgrest).toBe(mockPostgrestClient)
  })

  it('should have required methods', () => {
    expect(postgrest.from).toBeDefined()
    expect(typeof postgrest.from).toBe('function')
    expect(typeof postgrest.from('test').select).toBe('function')
    expect(typeof postgrest.from('test').insert).toBe('function')
    expect(typeof postgrest.from('test').delete).toBe('function')
  })

  it('should handle database operations', () => {
    const testTable = postgrest.from('test')
    expect(testTable.select).toBeDefined()
    expect(testTable.insert).toBeDefined()
    expect(testTable.delete).toBeDefined()
  })
})
