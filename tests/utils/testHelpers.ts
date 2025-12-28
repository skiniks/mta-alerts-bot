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

type PostgrestClientError = Error | null

export const mockPostgrest = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        limit: vi.fn(() => ({
          data: [] as any[],
          error: null as PostgrestClientError,
        })),
        gte: vi.fn(() => ({
          limit: vi.fn(() => ({
            data: [] as any[],
            error: null as PostgrestClientError,
          })),
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
  })),
}
