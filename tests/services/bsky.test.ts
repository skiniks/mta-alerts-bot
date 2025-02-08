import type { AtpAgent } from '@atproto/api'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockAgent } from '../utils/testHelpers.js'

vi.mock('@atproto/api', () => {
  return {
    AtpAgent: class MockAtpAgent {
      constructor() {
        return mockAgent as unknown as AtpAgent
      }
    },
  }
})

const { loginToBsky, postAlertToBsky } = await import('../../services/bsky.js')

describe('bsky service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('postAlertToBsky', () => {
    beforeEach(() => {
      mockAgent.session = { did: 'test-did' }
    })

    it('should post alert successfully', async () => {
      const alert = {
        id: 'test-id',
        text: 'Test Alert',
        headerTranslation: 'Test Alert',
      }

      await postAlertToBsky(alert)

      expect(mockAgent.com.atproto.repo.createRecord).toHaveBeenCalled()
      const callArg = mockAgent.com.atproto.repo.createRecord.mock.calls[0][0]
      expect(callArg.collection).toBe('app.bsky.feed.post')
      expect(callArg.repo).toBe('test-did')
      expect(callArg.record.text).toBe('Test Alert')
    })

    it('should throw error when not logged in', async () => {
      mockAgent.session = null as unknown as { did: string }

      const alert = {
        id: 'test-id',
        text: 'Test Alert',
        headerTranslation: 'Test Alert',
      }

      await expect(postAlertToBsky(alert)).rejects.toThrow('Not logged in')
    })

    it('should handle rate limiting errors', async () => {
      mockAgent.com.atproto.repo.createRecord.mockRejectedValueOnce(
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

      const callArg = mockAgent.com.atproto.repo.createRecord.mock.calls[0][0]
      expect(callArg.record.text.length).toBe(300)
    })

    it('should handle authentication failures', async () => {
      mockAgent.com.atproto.repo.createRecord.mockRejectedValueOnce(
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
      expect(mockAgent.login).toHaveBeenCalled()
    })
  })
})
