'use strict'

const shopModel = require('../models/shop.model')
const bcrypt = require('bcrypt')
const crypto = require('crypto')

const KeyTokenService = require('./keyToken.service')
const { createTokenPair } = require('../auth/authUtils')

const RoleShop = {
    SHOP: 'SHOP',
    WRITER: 'WRITER',
    EDITOR: 'EDITOR',
    ADMIN: 'ADMIN'
}

class AccessService {

    static signUp = async ({ name, email, password }) => {
        try {

            // check email exists
            const holderShop = await shopModel.findOne({ email }).lean()

            if (holderShop) {
                return {
                    code: 'xxxx',
                    message: 'shop already registered'
                }
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

            if (newShop) {

                // create privateKey and publicKey
                const { privateKey, publicKey } =
                    crypto.generateKeyPairSync('rsa', {
                        modulusLength: 4096
                    })

                console.log({ privateKey, publicKey })

                // save publicKey
                const publicKeyString =
                    await KeyTokenService.createKeyToken({
                        userId: newShop._id,
                        publicKey
                    })

                if (!publicKeyString) {
                    return {
                        code: 'xxxx',
                        message: 'publicKeyString error'
                    }
                }

                // create token pair
                const tokens = await createTokenPair(
                    {
                        userId: newShop._id,
                        email
                    },
                    publicKey,
                    privateKey
                )

                console.log(`create Token success::`, tokens)

                return {
                    code: 201,
                    metadata: {
                        shop: newShop,
                        tokens
                    }
                }
            }

            return {
                code: 200,
                metadata: null
            }

        } catch (error) {

            return {
                code: 'xxx',
                message: error.message,
                status: 'error'
            }
        }
    }
}

module.exports = AccessService