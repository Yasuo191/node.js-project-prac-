'use strict'

const { getInfoData, asyncHandler, slugify } = require('../../src/utils')

describe('getInfoData', () => {
    it('picks only the requested fields', () => {
        const object = { _id: '1', name: 'Shop A', email: 'a@a.com', password: 'secret-hash' }
        const result = getInfoData({ fields: ['_id', 'name', 'email'], object })

        expect(result).toEqual({ _id: '1', name: 'Shop A', email: 'a@a.com' })
        expect(result.password).toBeUndefined()
    })

    it('skips fields that are undefined on the source object', () => {
        const result = getInfoData({ fields: ['name', 'missing'], object: { name: 'X' } })
        expect(result).toEqual({ name: 'X' })
        expect('missing' in result).toBe(false)
    })

    it('returns an empty object when given no fields', () => {
        expect(getInfoData({ fields: [], object: { a: 1 } })).toEqual({})
    })
})

describe('asyncHandler', () => {
    it('calls through to the wrapped handler and lets a caller await it', async () => {
        const handler = jest.fn().mockResolvedValue('done')
        const wrapped = asyncHandler(handler)
        const req = {}, res = {}, next = jest.fn()

        await wrapped(req, res, next)

        expect(handler).toHaveBeenCalledWith(req, res, next)
        expect(next).not.toHaveBeenCalled()
    })

    it('forwards a rejected promise to next(error) instead of throwing', async () => {
        const error = new Error('boom')
        const handler = jest.fn().mockRejectedValue(error)
        const wrapped = asyncHandler(handler)
        const next = jest.fn()

        await wrapped({}, {}, next)

        expect(next).toHaveBeenCalledWith(error)
    })
})

describe('slugify', () => {
    it('lowercases and hyphenates spaces', () => {
        expect(slugify('Nike Air Max 90')).toBe('nike-air-max-90')
    })

    it('strips accents/diacritics', () => {
        expect(slugify('Áo Sơ Mi Nam')).toBe('ao-so-mi-nam')
    })

    it('collapses repeated punctuation into a single hyphen and trims edges', () => {
        expect(slugify('  Hello,, World!!  ')).toBe('hello-world')
    })

    it('returns an empty string for empty input', () => {
        expect(slugify('')).toBe('')
    })
})
