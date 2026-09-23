'use strict'

const {
    ErrorResponse,
    ConflictRequestError,
    BadRequestError,
    AuthFailureError,
    ForbiddenError,
    NotFoundError
} = require('../../src/core/error.response')

describe('error.response', () => {
    it('ErrorResponse sets message and status, and is a real Error', () => {
        const err = new ErrorResponse('boom', 418)
        expect(err).toBeInstanceOf(Error)
        expect(err.message).toBe('boom')
        expect(err.status).toBe(418)
    })

    it.each([
        [ConflictRequestError, 409, 'Conflict'],
        [BadRequestError, 400, 'Bad Request'],
        [AuthFailureError, 401, 'Unauthorized'],
        [ForbiddenError, 403, 'Forbidden'],
        [NotFoundError, 404, 'Not Found']
    ])('%p defaults to status %i and message %p', (ErrorClass, expectedStatus, expectedMessage) => {
        const err = new ErrorClass()
        expect(err.status).toBe(expectedStatus)
        expect(err.message).toBe(expectedMessage)
        expect(err).toBeInstanceOf(ErrorResponse)
    })

    it('allows overriding the default message on a subclass', () => {
        const err = new ConflictRequestError('Shop already registered')
        expect(err.message).toBe('Shop already registered')
        expect(err.status).toBe(409)
    })
})
