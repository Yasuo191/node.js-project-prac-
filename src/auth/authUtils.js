'use strict'

const JWT = require('jsonwebtoken')

const createTokenPair = async (payload, publicKey, privateKey) => {
    try {
        const accessToken = await JWT.sign(
            payload,
            privateKey,
            {
                algorithm: 'RS256',
                expiresIn: '2 days'
            }
        )

        const refreshToken = await JWT.sign(
            payload,
            privateKey,
            {
                algorithm: 'RS256',
                expiresIn: '7 days'
            }
        )

        // Verify accessToken
        JWT.verify(accessToken, publicKey, (err, decode) => {
            if (err) {
                console.error(`error verify::`, err)
            } else {
                console.log(`decode verify::`, decode)
            }
        })

        return {
            accessToken,
            refreshToken
        }

    } catch (error) {
        console.error(`createTokenPair error::`, error)
        return null
    }
}

module.exports = {
    createTokenPair
}