'use strict'

const keytoKenModel = require("../models/keytoken.model")

class KeyTokenService{
    static createKeyToken = async ({userId,publicKey})=>{
        try{
            const publicKeyString= publicKey.toString()
            const tokens = await keytoKenModel.create({
                user:userId,
                publicKey: publicKeyString
            })

            return tokens ? publicKeyString : null
        }catch(error){
            return error
        }
    }
}