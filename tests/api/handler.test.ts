import type { ApiRequest, ApiResponse } from '../../src/types/index.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import handler from '../../api/handler.js'

vi.mock('../../src/services/alerts', () => ({
  fetchAlerts: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../src/services/bsky', () => ({
  loginToBsky: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../src/services/database', () => ({
  deleteOldAlerts: vi.fn().mockResolvedValue(undefined),
}))

const { fetchAlerts } = await import('../../src/services/alerts.js')
const { loginToBsky } = await import('../../src/services/bsky.js')
const { deleteOldAlerts } = await import('../../src/services/database.js')

describe('aPI Handler', () => {
  let mockReq: ApiRequest
  let mockRes: ApiResponse
  let consoleErrorSpy: any

  beforeEach(() => {
    vi.clearAllMocks()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    mockReq = {} as ApiRequest
    mockRes = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    } as unknown as ApiResponse
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('should successfully process alerts', async () => {
    vi.mocked(loginToBsky).mockResolvedValueOnce()
    vi.mocked(fetchAlerts).mockResolvedValueOnce()
    vi.mocked(deleteOldAlerts).mockResolvedValueOnce()

    await handler(mockReq, mockRes)

    expect(loginToBsky).toHaveBeenCalledTimes(1)
    expect(fetchAlerts).toHaveBeenCalledTimes(1)
    expect(deleteOldAlerts).toHaveBeenCalledTimes(1)
    expect(mockRes.status).toHaveBeenCalledWith(200)
    expect(mockRes.send).toHaveBeenCalledWith('OK')
  })

  it('should handle service errors appropriately', async () => {
    vi.mocked(loginToBsky).mockRejectedValueOnce(new Error('Login failed'))

    await handler(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(500)
    expect(mockRes.send).toHaveBeenCalledWith('An error occurred while processing your request.')
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error in handler:', expect.any(Error))
  })

  it('should handle concurrent requests', async () => {
    vi.mocked(loginToBsky).mockResolvedValue()
    vi.mocked(fetchAlerts).mockResolvedValue()
    vi.mocked(deleteOldAlerts).mockResolvedValue()

    await Promise.all([
      handler(mockReq, mockRes),
      handler(mockReq, mockRes),
      handler(mockReq, mockRes),
    ])

    expect(loginToBsky).toHaveBeenCalledTimes(3)
    expect(fetchAlerts).toHaveBeenCalledTimes(3)
    expect(deleteOldAlerts).toHaveBeenCalledTimes(3)
  })
})
