import { describe, it, expect, vi } from 'vitest'
import { errorHandler } from '../src/middleware/errorHandler.js'

function mockRes() {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  }
  return res
}

describe('errorHandler', () => {
  it('responds with 500 and the error message', () => {
    const err = new Error('something broke')
    const req = {} as any
    const res = mockRes()
    const next = vi.fn()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    errorHandler(err, req, res, next)

    expect(consoleSpy).toHaveBeenCalledWith('[GBoard Error]', 'something broke')
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'something broke' })

    consoleSpy.mockRestore()
  })

  it('uses fallback message when error has no message', () => {
    const err = new Error()
    const req = {} as any
    const res = mockRes()
    const next = vi.fn()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    errorHandler(err, req, res, next)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' })

    consoleSpy.mockRestore()
  })

  it('logs the error message to console', () => {
    const err = new Error('db connection lost')
    const req = {} as any
    const res = mockRes()
    const next = vi.fn()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    errorHandler(err, req, res, next)

    expect(consoleSpy).toHaveBeenCalledWith('[GBoard Error]', 'db connection lost')

    consoleSpy.mockRestore()
  })

  it('does not call next', () => {
    const err = new Error('test')
    const req = {} as any
    const res = mockRes()
    const next = vi.fn()
    vi.spyOn(console, 'error').mockImplementation(() => {})

    errorHandler(err, req, res, next)

    expect(next).not.toHaveBeenCalled()

    vi.restoreAllMocks()
  })
})
