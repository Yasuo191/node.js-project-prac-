'use strict'
const{db:{host,name,port}}=require('../config/config.mongodb')
const connectString = `mongodb://${host}:${port}/${name}`
const mongoose = require('mongoose')
const { countConnect } = require('../helpers/check.connect')

console.log(`connectString:`,connectString)
class Database {
    constructor() {
        this.connect()
    }

    // connect
    connect(type = 'mongodb') {
        if (1 === 1) {
            mongoose.set('debug', true)
            mongoose.set('debug', { color: true })
        }

        mongoose.connect(connectString)
            .then(_ => {
                console.log(`Connected Mongodb Success advanced`)
                countConnect()
            })
            .catch(err => console.log(`Error log!`, err))
    }

    // Create only one database instance
    static getInstance() {
        if (!Database.instance) {
            Database.instance = new Database()
        }

        return Database.instance
    }
}

const instanceMongodb = Database.getInstance()

module.exports = instanceMongodb