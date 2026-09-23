'use strict'

jest.mock('../../src/models/apikey.model')

const apiKeyModel = require('../../src/models/apikey.model')
const { apiKey, permission } = require('../../src/middlewares/apikey.middleware')

function mockReqRes(headers = {}) {
    return {
        req: { headers },
        res: {},
        next: jest.fn()
    }
}

describe('apiKey middleware', () => {
    it('calls next(error) with AuthFailureError when no x-api-key header is present', async () => {
        const { req, res, next } = mockReqRes({})

        await apiKey(req, res, next)

        expect(next).toHaveBeenCalledTimes(1)
        expect(next.mock.calls[0][0].status).toBe(401)
    })

    it('calls next(error) when the key is not found or inactive', async () => {
        apiKeyModel.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) })
        const { req, res, next } = mockReqRes({ 'x-api-key': 'bad-key' })

        await apiKey(req, res, next)

        expect(next.mock.calls[0][0].status).toBe(401)
    })

    it('attaches req.objKey and calls next() when the key is valid', async () => {
        const objKey = { key: 'good-key', permissions: ['0000'] }
        apiKeyModel.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(objKey) })
        const { req, res, next } = mockReqRes({ 'x-api-key': 'good-key' })

        await apiKey(req, res, next)

        expect(req.objKey).toEqual(objKey)
        expect(next).toHaveBeenCalledWith() // called with no error
    })
})

describe('permission middleware', () => {
    it('throws ForbiddenError when req.objKey is missing', () => {
        const middleware = permission('0000')
        expect(() => middleware({}, {}, jest.fn())).toThrow('permission denied')
    })

    it('throws ForbiddenError when the key lacks the required permission', () => {
        const middleware = permission('2222')
        const req = { objKey: { permissions: ['0000'] } }
        expect(() => middleware(req, {}, jest.fn())).toThrow('permission denied')
    })

    it('calls next() when the key has the required permission', () => {
        const middleware = permission('0000')
        const req = { objKey: { permissions: ['0000', '1111'] } }
        const next = jest.fn()

        middleware(req, {}, next)

        expect(next).toHaveBeenCalledTimes(1)
    })
})
