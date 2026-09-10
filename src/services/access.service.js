'use strict'
const shopModel= require('../models/shop.model')
const bycrypt = require('bycrypt')
const crypto = require('crypto')
const RoleShop={
    SHOP:'SHOP',
    WRITER:'WRITER',
    EDITOR:'EDITOR',
    ADMIN:'ADMIN'
}



class AccessService{
    static signUp = async ({name, email, password})=>{
        try{
            // check email exists
            const hoderlShop =   await shopModel.findOne({email}).lean()

            if(hoderlShop){
                return {
                    code:'xxxx',
                    message:'shop already registered'
                }
            }

            const passwordHash=await bycrypt.hash(password, 10)
            const newShop=await shopModel.create(
                {name,email,password:passwordHash,roles:[RoleShop.SHOP]}
            )

            if(newShop){
                // created privateKey and publicKey
                const {privateKey,publicKey}=crypto.generateKeyPairSync('rsa',{
                    moduluslength:4096
                })

            }

        }catch(error){
            return{
                code:'xxx',
                message: error.message,
                status:'error'
            }
            

        }
    }  
}
module.exports=AccessService