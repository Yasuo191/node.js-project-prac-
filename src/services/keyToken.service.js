'use strict'

const keyTokenModel = require("../models/keytoken.model")

class KeyTokenService {
    // Creates the keyToken document for a shop on signup, or replaces it if one already
    // exists (e.g. the shop signs up again after their old key document was removed).
    static createKeyToken = async ({ userId, publicKey, refreshToken }) => {
        const filter = { shop: userId }
        const update = {
            publicKey,
            refreshToken,
            refreshTokensUsed: []
        }
        const options = { upsert: true, new: true }

        const keyStore = await keyTokenModel.findOneAndUpdate(filter, update, options)

        return keyStore ? keyStore.publicKey : null
    }

    static findByUserId = async (userId) => {
        return await keyTokenModel.findOne({ shop: userId })
    }

    static removeKeyById = async (id) => {
        return await keyTokenModel.deleteOne({ _id: id })
    }

    static deleteKeyByUserId = async (userId) => {
        return await keyTokenModel.deleteOne({ shop: userId })
    }

    // A refresh token that shows up in refreshTokensUsed has already been rotated out once -
    // seeing it again means someone is replaying a stolen token.
    static findByRefreshTokenUsed = async (refreshToken) => {
        return await keyTokenModel.findOne({ refreshTokensUsed: refreshToken }).lean()
    }

    static findByRefreshToken = async (refreshToken) => {
        return await keyTokenModel.findOne({ refreshToken })
    }

    // Rotation: the old refresh token moves into refreshTokensUsed, the new one (and its
    // matching publicKey) becomes current.
    static updateRefreshTokenUsed = async ({ id, newRefreshToken, oldRefreshToken, publicKey }) => {
        return await keyTokenModel.updateOne(
            { _id: id },
            {
                $set: { refreshToken: newRefreshToken, publicKey },
                $addToSet: { refreshTokensUsed: oldRefreshToken }
            }
        )
    }
}

module.exports = KeyTokenService
