'use strict'

jest.mock('../../src/models/keytoken.model')

const keyTokenModel = require('../../src/models/keytoken.model')
const KeyTokenService = require('../../src/services/keyToken.service')

describe('KeyTokenService.createKeyToken', () => {
    it('upserts a key token document and returns the stored publicKey', async () => {
        keyTokenModel.findOneAndUpdate.mockResolvedValue({ _id: 'kt1', publicKey: 'PEM_STRING' })

        const result = await KeyTokenService.createKeyToken({
            userId: 'user1',
            publicKey: 'PEM_STRING',
            refreshToken: 'rt1'
        })

        expect(keyTokenModel.findOneAndUpdate).toHaveBeenCalledWith(
            { shop: 'user1' },
            { publicKey: 'PEM_STRING', refreshToken: 'rt1', refreshTokensUsed: [] },
            { upsert: true, new: true }
        )
        expect(result).toBe('PEM_STRING')
    })

    it('returns null when the model does not return a document', async () => {
        keyTokenModel.findOneAndUpdate.mockResolvedValue(null)

        const result = await KeyTokenService.createKeyToken({ userId: 'user3', publicKey: 'x', refreshToken: 'rt' })

        expect(result).toBeNull()
    })

    it('propagates (does not swallow) errors from the database call', async () => {
        keyTokenModel.findOneAndUpdate.mockRejectedValue(new Error('DB down'))

        await expect(
            KeyTokenService.createKeyToken({ userId: 'user4', publicKey: 'x', refreshToken: 'rt' })
        ).rejects.toThrow('DB down')
    })
})

describe('KeyTokenService.findByUserId / removeKeyById / deleteKeyByUserId', () => {
    it('findByUserId queries by shop id', async () => {
        keyTokenModel.findOne.mockResolvedValue({ _id: 'kt1' })
        const result = await KeyTokenService.findByUserId('user1')
        expect(keyTokenModel.findOne).toHaveBeenCalledWith({ shop: 'user1' })
        expect(result).toEqual({ _id: 'kt1' })
    })

    it('removeKeyById deletes by _id', async () => {
        keyTokenModel.deleteOne.mockResolvedValue({ deletedCount: 1 })
        const result = await KeyTokenService.removeKeyById('kt1')
        expect(keyTokenModel.deleteOne).toHaveBeenCalledWith({ _id: 'kt1' })
        expect(result).toEqual({ deletedCount: 1 })
    })

    it('deleteKeyByUserId deletes by shop id', async () => {
        keyTokenModel.deleteOne.mockResolvedValue({ deletedCount: 1 })
        await KeyTokenService.deleteKeyByUserId('user1')
        expect(keyTokenModel.deleteOne).toHaveBeenCalledWith({ shop: 'user1' })
    })
})

describe('KeyTokenService refresh-token helpers', () => {
    it('findByRefreshTokenUsed looks inside refreshTokensUsed', async () => {
        const leanMock = jest.fn().mockResolvedValue({ _id: 'kt1' })
        keyTokenModel.findOne.mockReturnValue({ lean: leanMock })

        const result = await KeyTokenService.findByRefreshTokenUsed('old-token')

        expect(keyTokenModel.findOne).toHaveBeenCalledWith({ refreshTokensUsed: 'old-token' })
        expect(result).toEqual({ _id: 'kt1' })
    })

    it('findByRefreshToken looks up the current refreshToken', async () => {
        keyTokenModel.findOne.mockResolvedValue({ _id: 'kt1', refreshToken: 'current' })
        const result = await KeyTokenService.findByRefreshToken('current')
        expect(keyTokenModel.findOne).toHaveBeenCalledWith({ refreshToken: 'current' })
        expect(result).toEqual({ _id: 'kt1', refreshToken: 'current' })
    })

    it('updateRefreshTokenUsed rotates the token and records the old one as used', async () => {
        keyTokenModel.updateOne.mockResolvedValue({ acknowledged: true })

        await KeyTokenService.updateRefreshTokenUsed({
            id: 'kt1',
            newRefreshToken: 'new-token',
            oldRefreshToken: 'old-token',
            publicKey: 'NEW_PEM'
        })

        expect(keyTokenModel.updateOne).toHaveBeenCalledWith(
            { _id: 'kt1' },
            {
                $set: { refreshToken: 'new-token', publicKey: 'NEW_PEM' },
                $addToSet: { refreshTokensUsed: 'old-token' }
            }
        )
    })
})
