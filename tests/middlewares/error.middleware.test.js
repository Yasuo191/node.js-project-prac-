'use strict'

const { notFoundHandler, errorHandler } = require('../../src/middlewares/error.middleware')
const { ConflictRequestError } = require('../../src/core/error.response')

function mockRes() {
    const res = {}
    res.status = jest.fn().mockReturnValue(res)
    res.json = jest.fn().mockReturnValue(res)
    return res
}

describe('notFoundHandler', () => {
    it('forwards a 404 error to next() instead of responding directly', () => {
        const req = { originalUrl: '/nope' }
        const next = jest.fn()

        notFoundHandler(req, {}, next)

        expect(next).toHaveBeenCalledTimes(1)
        const err = next.mock.calls[0][0]
        expect(err.status).toBe(404)
        expect(err.message).toContain('/nope')
    })
})

describe('errorHandler', () => {
    const originalEnv = process.env.NODE_ENV

    afterEach(() => {
        process.env.NODE_ENV = originalEnv
    })

    it('uses the error status/message when present (e.g. a ConflictRequestError)', () => {
        const res = mockRes()
        const err = new ConflictRequestError('Shop already registered')

        errorHandler(err, {}, res, jest.fn())

        expect(res.status).toHaveBeenCalledWith(409)
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'error', code: 409, message: 'Shop already registered' })
        )
    })

    it('defaults to 500 for plain errors with no status', () => {
        const res = mockRes()
        errorHandler(new Error('kaboom'), {}, res, jest.fn())

        expect(res.status).toHaveBeenCalledWith(500)
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ code: 500, message: 'kaboom' })
        )
    })

    it('includes the stack trace only in dev', () => {
        process.env.NODE_ENV = 'dev'
        const resDev = mockRes()
        errorHandler(new Error('x'), {}, resDev, jest.fn())
        expect(resDev.json.mock.calls[0][0].stack).toBeDefined()

        process.env.NODE_ENV = 'production'
        const resProd = mockRes()
        errorHandler(new Error('x'), {}, resProd, jest.fn())
        expect(resProd.json.mock.calls[0][0].stack).toBeUndefined()
    })
})
