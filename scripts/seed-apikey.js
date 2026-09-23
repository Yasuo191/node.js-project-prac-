'use strict'
// Run once for local development: node scripts/seed-apikey.js
// Prints a fresh API key with full permissions and inserts it into the ApiKeys collection.

require('dotenv').config()
const crypto = require('crypto')
const mongoose = require('mongoose')
const { db: { host, name, port } } = require('../src/config/config.mongodb')
const apiKeyModel = require('../src/models/apikey.model')

async function main() {
    const connectString = `mongodb://${host}:${port}/${name}`
    await mongoose.connect(connectString)

    const key = crypto.randomBytes(32).toString('hex')
    await apiKeyModel.create({
        key,
        status: true,
        permissions: ['0000', '1111', '2222']
    })

    console.log(`Created API key with full permissions:`)
    console.log(key)

    await mongoose.disconnect()
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
