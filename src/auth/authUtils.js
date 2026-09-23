'use strict'

const JWT = require('jsonwebtoken')
const { asyncHandler } = require('../utils')
const { AuthFailureError, NotFoundError } = require('../core/error.response')
const KeyTokenService = require('../services/keyToken.service')

const HEADER = {
    API_KEY: 'x-api-key',
    CLIENT_ID: 'x-client-id',
    AUTHORIZATION: 'authorization',
    REFRESHTOKEN: 'x-rtoken-id'
}

const createTokenPair = async (payload, publicKey, privateKey) => {
    const accessToken = JWT.sign(payload, privateKey, {
        algorithm: 'RS256',
        expiresIn: '2 days'
    })

    const refreshToken = JWT.sign(payload, privateKey, {
        algorithm: 'RS256',
        expiresIn: '7 days'
    })

    // Sanity-check the token we just signed verifies against the matching public key.
    // If this fails, something is wrong with the generated key pair - fail loudly instead
    // of silently returning a token pair that can never be verified later.
    JWT.verify(accessToken, publicKey, (err) => {
        if (err) {
            console.error(`error verify accessToken::`, err)
        }
    })

    return {
        accessToken,
        refreshToken
    }
}

// Protects a route: requires x-client-id + a valid access token (in `authorization`), or
// a valid refresh token (in `x-rtoken-id`) for the refresh-token endpoint specifically.
// On success, attaches req.keyStore (the shop's key document) and req.user (the decoded payload).
const authentication = asyncHandler(async (req, res, next) => {
    const userId = req.headers[HEADER.CLIENT_ID]
    if (!userId) {
        throw new AuthFailureError('Invalid Request')
    }

    const keyStore = await KeyTokenService.findByUserId(userId)
    if (!keyStore) {
        throw new NotFoundError('Not found keyStore for this shop')
    }

    // refresh-token flow: verify against the refresh token header instead of the access token
    if (req.headers[HEADER.REFRESHTOKEN]) {
        const refreshToken = req.headers[HEADER.REFRESHTOKEN]
        const decodeUser = verifyJWT(refreshToken, keyStore.publicKey)

        if (userId !== decodeUser.userId) {
            throw new AuthFailureError('Invalid UserId')
        }

        req.keyStore = keyStore
        req.user = decodeUser
        req.refreshToken = refreshToken
        return next()
    }

    const accessToken = req.headers[HEADER.AUTHORIZATION]
    if (!accessToken) {
        throw new AuthFailureError('Invalid Request')
    }

    const decodeUser = verifyJWT(accessToken, keyStore.publicKey)
    if (userId !== decodeUser.userId) {
        throw new AuthFailureError('Invalid UserId')
    }

    req.keyStore = keyStore
    req.user = decodeUser
    return next()
})

// Wraps JWT.verify so both "malformed/invalid token" and "expired token" become a
// clean AuthFailureError instead of leaking raw jsonwebtoken error internals.
function verifyJWT(token, publicKey) {
    try {
        return JWT.verify(token, publicKey)
    } catch (error) {
        throw new AuthFailureError('Invalid Token')
    }
}

module.exports = {
    HEADER,
    createTokenPair,
    authentication,
    verifyJWT
}
