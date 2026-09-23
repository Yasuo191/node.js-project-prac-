'use strict'

process.env.NODE_ENV = 'test'

jest.mock('../../src/services/access.service')
jest.mock('../../src/models/apikey.model')
jest.mock('../../src/services/keyToken.service')

const request = require('supertest')
const AccessService = require('../../src/services/access.service')
const apiKeyModel = require('../../src/models/apikey.model')
const KeyTokenService = require('../../src/services/keyToken.service')
const { ConflictRequestError, AuthFailureError } = require('../../src/core/error.response')

// Imported after NODE_ENV=test is set, so app.js skips the real Mongo connection/monitoring.
const app = require('../../src/app')

const API_KEY = 'test-api-key'

beforeEach(() => {
    // Every request goes through the apiKey middleware first - give it a valid, fully
    // permissioned key so the tests below can focus on the access-controller behaviour.
    apiKeyModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ key: API_KEY, status: true, permissions: ['0000', '1111', '2222'] })
    })
})

describe('POST /v1/api/shop/signup', () => {
    const body = { name: 'My Shop', email: 'shop@example.com', password: 'secret123' }

    it('returns 401 when no x-api-key header is sent', async () => {
        const res = await request(app).post('/v1/api/shop/signup').send(body)
        expect(res.status).toBe(401)
    })

    it('returns 201 with the standardized success shape on success', async () => {
        AccessService.signUp.mockResolvedValue({
            shop: { _id: '1', name: body.name, email: body.email },
            tokens: { accessToken: 'acc', refreshToken: 'ref' }
        })

        const res = await request(app).post('/v1/api/shop/signup').set('x-api-key', API_KEY).send(body)

        expect(res.status).toBe(201)
        expect(res.body).toEqual(
            expect.objectContaining({
                message: 'Registered OK!',
                status: 201,
                metadata: {
                    shop: { _id: '1', name: body.name, email: body.email },
                    tokens: { accessToken: 'acc', refreshToken: 'ref' }
                }
            })
        )
    })

    it('returns 409 (via the error middleware) when the service throws ConflictRequestError', async () => {
        AccessService.signUp.mockRejectedValue(new ConflictRequestError('Shop already registered'))

        const res = await request(app).post('/v1/api/shop/signup').set('x-api-key', API_KEY).send(body)

        expect(res.status).toBe(409)
        expect(res.body).toEqual(
            expect.objectContaining({ status: 'error', code: 409, message: 'Shop already registered' })
        )
    })

    it('returns 404 with the not-found shape for an unknown route', async () => {
        const res = await request(app).get('/v1/api/does-not-exist').set('x-api-key', API_KEY)

        expect(res.status).toBe(404)
        expect(res.body.status).toBe('error')
    })
})

describe('POST /v1/api/shop/login', () => {
    it('returns 200 with shop + tokens on success', async () => {
        AccessService.login.mockResolvedValue({
            shop: { _id: '1', name: 'My Shop', email: 'shop@example.com' },
            tokens: { accessToken: 'acc', refreshToken: 'ref' }
        })

        const res = await request(app)
            .post('/v1/api/shop/login')
            .set('x-api-key', API_KEY)
            .send({ email: 'shop@example.com', password: 'secret123' })

        expect(res.status).toBe(200)
        expect(res.body.message).toBe('Login OK!')
    })

    it('returns 401 when the service throws AuthFailureError', async () => {
        AccessService.login.mockRejectedValue(new AuthFailureError('Authentication error'))

        const res = await request(app)
            .post('/v1/api/shop/login')
            .set('x-api-key', API_KEY)
            .send({ email: 'shop@example.com', password: 'wrong' })

        expect(res.status).toBe(401)
    })
})

describe('POST /v1/api/shop/logout (protected route)', () => {
    it('returns 401 without a client id / access token', async () => {
        const res = await request(app).post('/v1/api/shop/logout').set('x-api-key', API_KEY)
        expect(res.status).toBe(401)
    })

    it('returns 404 when the client id has no matching keyStore', async () => {
        KeyTokenService.findByUserId.mockResolvedValue(null)

        const res = await request(app)
            .post('/v1/api/shop/logout')
            .set('x-api-key', API_KEY)
            .set('x-client-id', 'user1')
            .set('authorization', 'some.token')

        expect(res.status).toBe(404)
    })
})

describe('GET /v1/api/does-not-exist (unmatched route)', () => {
    it('falls through to the 404 handler without requiring authentication', async () => {
        const res = await request(app).get('/v1/api/does-not-exist').set('x-api-key', API_KEY)

        expect(res.status).toBe(404)
        expect(res.body.status).toBe('error')
    })
})
