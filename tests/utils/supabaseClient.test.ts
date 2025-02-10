import { createClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockSupabaseClient = {
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

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}))

vi.resetModules()

describe('supabase Client', () => {
  let supabase: any

  beforeEach(async () => {
    vi.clearAllMocks()
    supabase = (await import('../../src/utils/supabaseClient.js')).supabase
  })

  it('should create and export a Supabase client', () => {
    expect(createClient).toHaveBeenCalled()
    expect(supabase).toBe(mockSupabaseClient)
  })

  it('should have required methods', () => {
    expect(supabase.from).toBeDefined()
    expect(typeof supabase.from).toBe('function')
    expect(typeof supabase.from('test').select).toBe('function')
    expect(typeof supabase.from('test').insert).toBe('function')
    expect(typeof supabase.from('test').delete).toBe('function')
  })

  it('should handle database operations', () => {
    const testTable = supabase.from('test')
    expect(testTable.select).toBeDefined()
    expect(testTable.insert).toBeDefined()
    expect(testTable.delete).toBeDefined()
  })
})
