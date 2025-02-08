import { vi } from 'vitest'

export const mockAgent = {
  login: vi.fn().mockResolvedValue({ did: 'test-did' }),
  session: { did: 'test-did' },
  com: {
    atproto: {
      repo: {
        createRecord: vi.fn().mockResolvedValue({}),
      },
    },
  },
}

type SupabaseError = Error | null

export const mockSupabase = {
  from: vi.fn(() => ({
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
        error: null as SupabaseError,
      })),
    })),
  })),
}
