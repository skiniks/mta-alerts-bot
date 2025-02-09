import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockManager = {
  session: { did: 'test-did' },
  login: vi.fn(),
}

const mockRpc = {
  call: vi.fn(),
}

vi.mock('@atcute/client', () => {
  return {
    CredentialManager: vi.fn().mockImplementation(() => mockManager),
    XRPC: vi.fn().mockImplementation(() => mockRpc),
  }
})

const { loginToBsky, postAlertToBsky } = await import('../../services/bsky.js')

describe('bsky service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('postAlertToBsky', () => {
    beforeEach(() => {
      mockManager.session = { did: 'test-did' } as { did: string }
    })

    it('should post alert successfully', async () => {
      const alert = {
        id: 'test-id',
        text: 'Test Alert',
        headerTranslation: 'Test Alert',
      }

      await postAlertToBsky(alert)

      expect(mockRpc.call).toHaveBeenCalledWith('com.atproto.repo.createRecord', {
        data: {
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
      mockManager.session = null as unknown as { did: string }

      const alert = {
        id: 'test-id',
        text: 'Test Alert',
        headerTranslation: 'Test Alert',
      }

      await expect(postAlertToBsky(alert)).rejects.toThrow('Not logged in')
    })

    it('should handle rate limiting errors', async () => {
      mockRpc.call.mockRejectedValueOnce(
        new Error('Too many requests'),
      )

      const alert = {
        id: 'test-id',
        text: 'Test Alert',
        headerTranslation: 'Test Alert',
      }

      await expect(postAlertToBsky(alert)).rejects.toThrow('Too many requests')
    })

    it('should properly truncate long alert texts', async () => {
      const longText = 'a'.repeat(400)
      const alert = {
        id: 'test-id',
        text: longText,
        headerTranslation: 'Test Alert',
      }

      await postAlertToBsky(alert)

      const callArg = mockRpc.call.mock.calls[0][1]
      expect(callArg.data.record.text.length).toBe(300)
    })

    it('should handle authentication failures', async () => {
      mockRpc.call.mockRejectedValueOnce(
        new Error('Authentication failed'),
      )

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
      await loginToBsky()
      expect(mockManager.login).toHaveBeenCalled()
    })
  })
})
