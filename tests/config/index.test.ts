import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('config', () => {
  const ENV = process.env

  beforeEach(() => {
    process.env = { ...ENV }
    vi.resetModules()
  })

  afterEach(() => {
    process.env = ENV
  })

  it('should handle missing environment variables', async () => {
    delete process.env.MTA_API_KEY
    delete process.env.MTA_API_URL
    delete process.env.BSKY_USERNAME
    delete process.env.BSKY_PASSWORD
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_KEY

    const { API_KEY, ALERT_FEED_URL, BSKY_USERNAME, BSKY_PASSWORD, SUPABASE_URL, SUPABASE_KEY } = await import('../../config')

    expect(API_KEY).toBeUndefined()
    expect(ALERT_FEED_URL).toBeUndefined()
    expect(BSKY_USERNAME).toBeUndefined()
    expect(BSKY_PASSWORD).toBeUndefined()
    expect(SUPABASE_URL).toBeUndefined()
    expect(SUPABASE_KEY).toBeUndefined()
  })

  it('should load environment variables when present', async () => {
    process.env.MTA_API_KEY = 'test-api-key'
    process.env.MTA_API_URL = 'https://api.mta.info'
    process.env.BSKY_USERNAME = 'test-user'
    process.env.BSKY_PASSWORD = 'test-pass'
    process.env.SUPABASE_URL = 'https://supabase.com'
    process.env.SUPABASE_KEY = 'test-key'

    const config = await import('../../config')

    expect(config.API_KEY).toBe('test-api-key')
    expect(config.ALERT_FEED_URL).toBe('https://api.mta.info')
    expect(config.BSKY_USERNAME).toBe('test-user')
    expect(config.BSKY_PASSWORD).toBe('test-pass')
    expect(config.SUPABASE_URL).toBe('https://supabase.com')
    expect(config.SUPABASE_KEY).toBe('test-key')
  })
})
