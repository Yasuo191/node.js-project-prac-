'use strict'

jest.mock('../../src/models/shop.model')
jest.mock('../../src/services/keyToken.service')
jest.mock('../../src/auth/authUtils')
jest.mock('bcrypt')

const shopModel = require('../../src/models/shop.model')
const KeyTokenService = require('../../src/services/keyToken.service')
const { createTokenPair } = require('../../src/auth/authUtils')
const bcrypt = require('bcrypt')
const AccessService = require('../../src/services/access.service')
const { ConflictRequestError, BadRequestError, AuthFailureError, ForbiddenError } = require('../../src/core/error.response')

// shopModel.findOne(...).lean() is a chained call - mock the chain manually
function mockFindOneLean(returnValue) {
    shopModel.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(returnValue) })
}

describe('AccessService.signUp', () => {
    const input = { name: 'My Shop', email: 'shop@example.com', password: 'plainpassword' }

    it('throws ConflictRequestError when the email is already registered', async () => {
        mockFindOneLean({ _id: 'existing', email: input.email })

        await expect(AccessService.signUp(input)).rejects.toThrow(ConflictRequestError)
        await expect(AccessService.signUp(input)).rejects.toThrow('Shop already registered')
        expect(shopModel.create).not.toHaveBeenCalled()
    })

    it('hashes the password before saving and never stores/returns the plain password', async () => {
        mockFindOneLean(null)
        bcrypt.hash.mockResolvedValue('hashed-password')
        shopModel.create.mockResolvedValue({
            _id: 'shop1',
            name: input.name,
            email: input.email,
            password: 'hashed-password'
        })
        KeyTokenService.createKeyToken.mockResolvedValue('PEM_PUBLIC_KEY')
        createTokenPair.mockResolvedValue({ accessToken: 'acc', refreshToken: 'ref' })

        const result = await AccessService.signUp(input)

        expect(bcrypt.hash).toHaveBeenCalledWith(input.password, 10)
        expect(shopModel.create).toHaveBeenCalledWith(
            expect.objectContaining({ password: 'hashed-password', roles: ['SHOP'] })
        )
        expect(result.shop).toEqual({ _id: 'shop1', name: input.name, email: input.email })
        expect(result.shop.password).toBeUndefined()
        expect(result.tokens).toEqual({ accessToken: 'acc', refreshToken: 'ref' })
    })

    it('throws BadRequestError when key token creation fails', async () => {
        mockFindOneLean(null)
        bcrypt.hash.mockResolvedValue('hashed-password')
        shopModel.create.mockResolvedValue({ _id: 'shop1', name: input.name, email: input.email })
        KeyTokenService.createKeyToken.mockResolvedValue(null)

        await expect(AccessService.signUp(input)).rejects.toThrow(BadRequestError)
        await expect(createTokenPair).not.toHaveBeenCalled
    })

    it('propagates unexpected errors (e.g. DB failures) instead of swallowing them', async () => {
        mockFindOneLean(null)
        bcrypt.hash.mockResolvedValue('hashed-password')
        shopModel.create.mockRejectedValue(new Error('DB connection lost'))

        await expect(AccessService.signUp(input)).rejects.toThrow('DB connection lost')
    })
})

describe('AccessService.login', () => {
    const input = { email: 'shop@example.com', password: 'plainpassword' }

    it('throws BadRequestError when the shop is not registered', async () => {
        mockFindOneLean(null)

        await expect(AccessService.login(input)).rejects.toThrow(BadRequestError)
        await expect(AccessService.login(input)).rejects.toThrow('Shop not registered')
    })

    it('throws AuthFailureError when the password does not match', async () => {
        mockFindOneLean({ _id: 'shop1', email: input.email, password: 'hashed' })
        bcrypt.compare.mockResolvedValue(false)

        await expect(AccessService.login(input)).rejects.toThrow(AuthFailureError)
        await expect(AccessService.login(input)).rejects.toThrow('Authentication error')
    })

    it('returns shop info + tokens and upserts the key token on success', async () => {
        mockFindOneLean({ _id: 'shop1', name: 'My Shop', email: input.email, password: 'hashed' })
        bcrypt.compare.mockResolvedValue(true)
        createTokenPair.mockResolvedValue({ accessToken: 'acc', refreshToken: 'ref' })
        KeyTokenService.createKeyToken.mockResolvedValue('PEM_PUBLIC_KEY')

        const result = await AccessService.login(input)

        expect(bcrypt.compare).toHaveBeenCalledWith(input.password, 'hashed')
        expect(KeyTokenService.createKeyToken).toHaveBeenCalledWith(
            expect.objectContaining({ userId: 'shop1', refreshToken: 'ref' })
        )
        expect(result.shop).toEqual({ _id: 'shop1', name: 'My Shop', email: input.email })
        expect(result.tokens).toEqual({ accessToken: 'acc', refreshToken: 'ref' })
    })
})

describe('AccessService.logout', () => {
    it('removes the key token document for that shop', async () => {
        KeyTokenService.removeKeyById.mockResolvedValue({ deletedCount: 1 })

        const result = await AccessService.logout({ _id: 'kt1' })

        expect(KeyTokenService.removeKeyById).toHaveBeenCalledWith('kt1')
        expect(result).toEqual({ deletedCount: 1 })
    })
})

describe('AccessService.handleRefreshToken', () => {
    const user = { userId: 'shop1', email: 'shop@example.com' }

    it('revokes every session and throws ForbiddenError when a used refresh token is replayed', async () => {
        const keyStore = { _id: 'kt1', refreshToken: 'current', refreshTokensUsed: ['old-token'] }

        await expect(
            AccessService.handleRefreshToken({ keyStore, user, refreshToken: 'old-token' })
        ).rejects.toThrow(ForbiddenError)
        expect(KeyTokenService.deleteKeyByUserId).toHaveBeenCalledWith('shop1')
    })

    it('throws AuthFailureError when the refresh token does not match the one on file', async () => {
        const keyStore = { _id: 'kt1', refreshToken: 'current', refreshTokensUsed: [] }

        await expect(
            AccessService.handleRefreshToken({ keyStore, user, refreshToken: 'not-current' })
        ).rejects.toThrow(AuthFailureError)
    })

    it('throws AuthFailureError when the shop no longer exists', async () => {
        const keyStore = { _id: 'kt1', refreshToken: 'current', refreshTokensUsed: [] }
        mockFindOneLean(null)

        await expect(
            AccessService.handleRefreshToken({ keyStore, user, refreshToken: 'current' })
        ).rejects.toThrow('Shop not registered')
    })

    it('rotates the token and returns fresh tokens on success', async () => {
        const keyStore = { _id: 'kt1', refreshToken: 'current', refreshTokensUsed: [] }
        mockFindOneLean({ _id: 'shop1', name: 'My Shop', email: user.email })
        createTokenPair.mockResolvedValue({ accessToken: 'acc2', refreshToken: 'ref2' })
        KeyTokenService.updateRefreshTokenUsed.mockResolvedValue({ acknowledged: true })

        const result = await AccessService.handleRefreshToken({ keyStore, user, refreshToken: 'current' })

        expect(KeyTokenService.updateRefreshTokenUsed).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'kt1', newRefreshToken: 'ref2', oldRefreshToken: 'current' })
        )
        expect(result.tokens).toEqual({ accessToken: 'acc2', refreshToken: 'ref2' })
        expect(result.shop).toEqual({ _id: 'shop1', name: 'My Shop', email: user.email })
    })
})
