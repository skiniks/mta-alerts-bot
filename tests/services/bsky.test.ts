import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockSession = {
  session: { did: 'test-did' } as { did: string } | null,
}

const mockRpc = {
  post: vi.fn().mockResolvedValue({ ok: true, data: {} }),
}

const mockLogin = vi.fn().mockResolvedValue(mockSession)

vi.mock('@atcute/password-session', () => {
  return {
    PasswordSession: {
      login: (...args: any[]) => mockLogin(...args),
    },
  }
})

vi.mock('@atcute/client', () => {
  class MockClient {
    post = mockRpc.post
  }
  return {
    Client: MockClient,
    ok: (promise: Promise<any>) => promise.then((r: any) => {
      if (r.ok)
        return r.data
      throw new Error(r.data?.message || 'Request failed')
    }),
  }
})

describe('bsky service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession.session = { did: 'test-did' }
    mockLogin.mockResolvedValue(mockSession)
  })

  describe('postAlertToBsky', () => {
    it('should post alert successfully', async () => {
      vi.resetModules()
      const { loginToBsky, postAlertToBsky } = await import('../../src/services/bsky.js')
      await loginToBsky()

      const alert = {
        id: 'test-id',
        text: 'Test Alert',
        headerTranslation: 'Test Alert',
      }

      await postAlertToBsky(alert)

      expect(mockRpc.post).toHaveBeenCalledWith('com.atproto.repo.createRecord', {
        input: {
          repo: 'test-did',
          collection: 'app.bsky.feed.post',
          record: {
            text: 'Test Alert',
            createdAt: expect.any(String),
          },
        },
      })
    })

    it('should throw error when not logged in', async () => {
      vi.resetModules()
      const { postAlertToBsky } = await import('../../src/services/bsky.js')

      const alert = {
        id: 'test-id',
        text: 'Test Alert',
        headerTranslation: 'Test Alert',
      }

      await expect(postAlertToBsky(alert)).rejects.toThrow('Not logged in')
    })

    it('should handle rate limiting errors', async () => {
      vi.resetModules()
      const { loginToBsky, postAlertToBsky } = await import('../../src/services/bsky.js')
      await loginToBsky()

      mockRpc.post.mockResolvedValueOnce({ ok: false, data: { error: 'RateLimited', message: 'Too many requests' } })

      const alert = {
        id: 'test-id',
        text: 'Test Alert',
        headerTranslation: 'Test Alert',
      }

      await expect(postAlertToBsky(alert)).rejects.toThrow('Too many requests')
    })

    it('should properly truncate long alert texts', async () => {
      vi.resetModules()
      const { loginToBsky, postAlertToBsky } = await import('../../src/services/bsky.js')
      await loginToBsky()

      const longText = 'a'.repeat(400)
      const alert = {
        id: 'test-id',
        text: longText,
        headerTranslation: 'Test Alert',
      }

      await postAlertToBsky(alert)

      const callArg = mockRpc.post.mock.calls[0][1]
      expect(callArg.input.record.text.length).toBe(300)
    })

    it('should handle authentication failures', async () => {
      vi.resetModules()
      const { loginToBsky, postAlertToBsky } = await import('../../src/services/bsky.js')
      await loginToBsky()

      mockRpc.post.mockResolvedValueOnce({ ok: false, data: { error: 'AuthFailed', message: 'Authentication failed' } })

      const alert = {
        id: 'test-id',
        text: 'Test Alert',
        headerTranslation: 'Test Alert',
      }

      await expect(postAlertToBsky(alert)).rejects.toThrow('Authentication failed')
    })
  })

  describe('loginToBsky', () => {
    it('should login successfully', async () => {
      vi.resetModules()
      const { loginToBsky } = await import('../../src/services/bsky.js')
      await loginToBsky()
      expect(mockLogin).toHaveBeenCalled()
    })
  })
})
