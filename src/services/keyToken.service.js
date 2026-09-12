'use strict'

const keyTokenModel = require("../models/keytoken.model")

class KeyTokenService {
    static createKeyToken = async ({ userId, publicKey }) => {
        try {
            const publicKeyString = publicKey.toString()

            const tokens = await keyTokenModel.create({
                shop: userId,
                publicKey: publicKeyString
            })

            return tokens ? publicKeyString : null

        } catch (error) {
            return error
        }
    }
}

module.exports = KeyTokenService