'use strict'

const { SuccessResponse, OK, CREATED } = require('../../src/core/success.response')

function mockRes() {
    const res = {}
    res.status = jest.fn().mockReturnValue(res)
    res.set = jest.fn().mockReturnValue(res)
    res.json = jest.fn().mockReturnValue(res)
    return res
}

describe('success.response', () => {
    it('SuccessResponse defaults to 200/OK', () => {
        const r = new SuccessResponse({ metadata: { a: 1 } })
        expect(r.status).toBe(200)
        expect(r.message).toBe('OK')
        expect(r.metadata).toEqual({ a: 1 })
    })

    it('send() writes status code and JSON body onto the response', () => {
        const res = mockRes()
        const r = new OK({ message: 'hi', metadata: { foo: 'bar' } })

        r.send(res)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'hi', status: 200, metadata: { foo: 'bar' } })
        )
    })

    it('CREATED defaults to 201 and carries options', () => {
        const r = new CREATED({ message: 'Registered OK!', metadata: { id: 1 }, options: { extra: true } })
        expect(r.status).toBe(201)
        expect(r.options).toEqual({ extra: true })
    })
})
