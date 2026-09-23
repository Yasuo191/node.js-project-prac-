'use strict'

const shopModel = require('../models/shop.model')
const bcrypt = require('bcrypt')
const crypto = require('crypto')

const KeyTokenService = require('./keyToken.service')
const { createTokenPair } = require('../auth/authUtils')
const { getInfoData } = require('../utils')
const { BadRequestError, ConflictRequestError, AuthFailureError, ForbiddenError } = require('../core/error.response')

const RoleShop = {
    SHOP: 'SHOP',
    WRITER: 'WRITER',
    EDITOR: 'EDITOR',
    ADMIN: 'ADMIN'
}

// Generates a fresh RSA key pair as PEM strings.
// NOTE: encoding must be specified, otherwise generateKeyPairSync returns KeyObject
// instances whose .toString() is "[object KeyObject]" (not the PEM string) - a real bug
// this codebase used to have.
function generateRsaKeyPair() {
    return crypto.generateKeyPairSync('rsa', {
        modulusLength: 4096,
        publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs1', format: 'pem' }
    })
}

const shopPublicFields = ['_id', 'name', 'email']

class AccessService {

    static signUp = async ({ name, email, password }) => {
        // check email exists
        const holderShop = await shopModel.findOne({ email }).lean()

        if (holderShop) {
            throw new ConflictRequestError('Shop already registered')
        }

        // hash password
        const passwordHash = await bcrypt.hash(password, 10)

        // create shop
        const newShop = await shopModel.create({
            name,
            email,
            password: passwordHash,
            roles: [RoleShop.SHOP]
        })

        if (!newShop) {
            throw new BadRequestError('Failed to create shop')
        }

        // Generate a key pair, sign the token pair with it, then persist only the public
        // key + refreshToken (the private key is never stored - see the note on login()).
        const { privateKey, publicKey } = generateRsaKeyPair()
        const tokens = await createTokenPair({ userId: newShop._id, email }, publicKey, privateKey)

        const keyStore = await KeyTokenService.createKeyToken({
            userId: newShop._id,
            publicKey,
            refreshToken: tokens.refreshToken
        })

        if (!keyStore) {
            throw new BadRequestError('publicKeyString error')
        }

        return {
            shop: getInfoData({ fields: shopPublicFields, object: newShop }),
            tokens
        }
    }

    static login = async ({ email, password }) => {
        const foundShop = await shopModel.findOne({ email }).lean()
        if (!foundShop) {
            throw new BadRequestError('Shop not registered')
        }

        const isMatch = await bcrypt.compare(password, foundShop.password)
        if (!isMatch) {
            throw new AuthFailureError('Authentication error')
        }

        // NOTE: this codebase never persists the RSA private key - a fresh key pair is
        // (re)generated on every signup/login/refresh, the new tokens are signed with it
        // immediately, and only the public key + latest refreshToken are stored for later
        // verification. createKeyToken() upserts so this works whether or not the shop
        // already had a key document (e.g. logging back in after a logout).
        const { privateKey, publicKey } = generateRsaKeyPair()
        const tokens = await createTokenPair({ userId: foundShop._id, email }, publicKey, privateKey)

        await KeyTokenService.createKeyToken({
            userId: foundShop._id,
            publicKey,
            refreshToken: tokens.refreshToken
        })

        return {
            shop: getInfoData({ fields: shopPublicFields, object: foundShop }),
            tokens
        }
    }

    static logout = async (keyStore) => {
        return await KeyTokenService.removeKeyById(keyStore._id)
    }

    // Rotates the refresh token. If a refreshToken that was already rotated out is presented
    // again, that's a strong signal of token theft/replay - every session for that shop is
    // revoked and the caller must log in again.
    static handleRefreshToken = async ({ keyStore, user, refreshToken }) => {
        const { userId, email } = user

        if (keyStore.refreshTokensUsed.includes(refreshToken)) {
            await KeyTokenService.deleteKeyByUserId(userId)
            throw new ForbiddenError('Something went wrong, please login again')
        }

        if (keyStore.refreshToken !== refreshToken) {
            throw new AuthFailureError('Shop not registered')
        }

        const foundShop = await shopModel.findOne({ _id: userId }).lean()
        if (!foundShop) {
            throw new AuthFailureError('Shop not registered')
        }

        const { privateKey, publicKey } = generateRsaKeyPair()
        const tokens = await createTokenPair({ userId, email }, publicKey, privateKey)

        await KeyTokenService.updateRefreshTokenUsed({
            id: keyStore._id,
            newRefreshToken: tokens.refreshToken,
            oldRefreshToken: refreshToken,
            publicKey
        })

        return {
            shop: getInfoData({ fields: shopPublicFields, object: foundShop }),
            tokens
        }
    }
}

module.exports = AccessService
