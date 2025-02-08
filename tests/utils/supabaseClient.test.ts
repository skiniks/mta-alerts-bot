import { createClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockSupabaseClient = {
  from: vi.fn(),
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}))

describe('supabase Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create and export a Supabase client', async () => {
    const { supabase } = await import('../../utils/supabaseClient.js')
    expect(createClient).toHaveBeenCalled()
    expect(supabase).toBe(mockSupabaseClient)
  })

  it('should have required methods', async () => {
    const { supabase } = await import('../../utils/supabaseClient.js')
    expect(supabase.from).toBeDefined()
  })
})
