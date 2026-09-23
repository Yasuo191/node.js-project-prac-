'use strict'

jest.mock('../../src/services/keyToken.service')

const crypto = require('crypto')
const KeyTokenService = require('../../src/services/keyToken.service')
const { authentication, HEADER, createTokenPair } = require('../../src/auth/authUtils')

function generateKeys() {
    return crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs1', format: 'pem' }
    })
}

describe('authentication middleware', () => {
    it('rejects when x-client-id is missing', async () => {
        const req = { headers: {} }
        const next = jest.fn()

        await authentication(req, {}, next)

        expect(next.mock.calls[0][0].status).toBe(401)
    })

    it('rejects when no keyStore exists for that user', async () => {
        KeyTokenService.findByUserId.mockResolvedValue(null)
        const req = { headers: { [HEADER.CLIENT_ID]: 'user1' } }
        const next = jest.fn()

        await authentication(req, {}, next)

        expect(next.mock.calls[0][0].status).toBe(404)
    })

    it('rejects when the access token header is missing', async () => {
        KeyTokenService.findByUserId.mockResolvedValue({ publicKey: 'x' })
        const req = { headers: { [HEADER.CLIENT_ID]: 'user1' } }
        const next = jest.fn()

        await authentication(req, {}, next)

        expect(next.mock.calls[0][0].status).toBe(401)
    })

    it('accepts a valid access token and attaches req.user/req.keyStore', async () => {
        const { privateKey, publicKey } = generateKeys()
        const { accessToken } = await createTokenPair({ userId: 'user1', email: 'a@a.com' }, publicKey, privateKey)
        KeyTokenService.findByUserId.mockResolvedValue({ publicKey })

        const req = {
            headers: {
                [HEADER.CLIENT_ID]: 'user1',
                [HEADER.AUTHORIZATION]: accessToken
            }
        }
        const next = jest.fn()

        await authentication(req, {}, next)

        expect(next).toHaveBeenCalledWith() // no error
        expect(req.user.userId).toBe('user1')
        expect(req.keyStore.publicKey).toBe(publicKey)
    })

    it('rejects when the access token was signed for a different userId', async () => {
        const { privateKey, publicKey } = generateKeys()
        const { accessToken } = await createTokenPair({ userId: 'someone-else', email: 'a@a.com' }, publicKey, privateKey)
        KeyTokenService.findByUserId.mockResolvedValue({ publicKey })

        const req = {
            headers: {
                [HEADER.CLIENT_ID]: 'user1',
                [HEADER.AUTHORIZATION]: accessToken
            }
        }
        const next = jest.fn()

        await authentication(req, {}, next)

        expect(next.mock.calls[0][0].status).toBe(401)
    })

    it('rejects a tampered/invalid access token', async () => {
        KeyTokenService.findByUserId.mockResolvedValue({ publicKey: 'not-a-real-key' })
        const req = {
            headers: {
                [HEADER.CLIENT_ID]: 'user1',
                [HEADER.AUTHORIZATION]: 'not.a.jwt'
            }
        }
        const next = jest.fn()

        await authentication(req, {}, next)

        expect(next.mock.calls[0][0].status).toBe(401)
        expect(next.mock.calls[0][0].message).toBe('Invalid Token')
    })

    it('uses the refresh token header instead when present, and attaches req.refreshToken', async () => {
        const { privateKey, publicKey } = generateKeys()
        const { refreshToken } = await createTokenPair({ userId: 'user1', email: 'a@a.com' }, publicKey, privateKey)
        KeyTokenService.findByUserId.mockResolvedValue({ publicKey })

        const req = {
            headers: {
                [HEADER.CLIENT_ID]: 'user1',
                [HEADER.REFRESHTOKEN]: refreshToken
            }
        }
        const next = jest.fn()

        await authentication(req, {}, next)

        expect(next).toHaveBeenCalledWith()
        expect(req.refreshToken).toBe(refreshToken)
        expect(req.user.userId).toBe('user1')
    })
})
