'use strict'

const crypto = require('crypto')
const JWT = require('jsonwebtoken')
const { createTokenPair } = require('../../src/auth/authUtils')

describe('createTokenPair', () => {
    let publicKey, privateKey

    beforeAll(() => {
        ({ publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs1', format: 'pem' }
        }))
    })

    it('returns an accessToken and refreshToken', async () => {
        const tokens = await createTokenPair({ userId: '1', email: 'a@a.com' }, publicKey, privateKey)

        expect(typeof tokens.accessToken).toBe('string')
        expect(typeof tokens.refreshToken).toBe('string')
        expect(tokens.accessToken).not.toBe(tokens.refreshToken)
    })

    it('accessToken verifies against the matching publicKey and carries the payload', async () => {
        const payload = { userId: '42', email: 'shop@example.com' }
        const { accessToken } = await createTokenPair(payload, publicKey, privateKey)

        const decoded = JWT.verify(accessToken, publicKey)
        expect(decoded.userId).toBe(payload.userId)
        expect(decoded.email).toBe(payload.email)
    })

    it('refreshToken has a longer expiry than accessToken', async () => {
        const { accessToken, refreshToken } = await createTokenPair({ userId: '1' }, publicKey, privateKey)

        const decodedAccess = JWT.decode(accessToken)
        const decodedRefresh = JWT.decode(refreshToken)

        expect(decodedRefresh.exp).toBeGreaterThan(decodedAccess.exp)
    })

    it('rejects verification against the wrong public key', async () => {
        const { publicKey: otherPublicKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs1', format: 'pem' }
        })
        const { accessToken } = await createTokenPair({ userId: '1' }, publicKey, privateKey)

        expect(() => JWT.verify(accessToken, otherPublicKey)).toThrow()
    })
})
