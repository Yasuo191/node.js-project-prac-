require('dotenv').config()
const express = require('express')
const morgan = require('morgan')
const { default: helmet } = require('helmet')
const compression = require('compression')
const app = express()


// init middlewares
app.use(morgan("dev"))
app.use(helmet())
app.use(compression())
app.use(express.json())
app.use(express.urlencoded({
    extended: true
}))

// init db / connection monitoring
// Skipped in the test environment so `jest` doesn't try to open a real Mongo connection
// and doesn't hang on the setInterval started by checkOverload().
if (process.env.NODE_ENV !== 'test') {
    require('./dbs/init.mongodb')
    const { checkOverload } = require('./helpers/check.connect')
    checkOverload()
}

// require a valid x-api-key on every request before it reaches any route handler
const { apiKey } = require('./middlewares/apikey.middleware')
app.use(apiKey)

// init routes
app.use('/', require('./routes'))

// handling error
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware')
app.use(notFoundHandler)
app.use(errorHandler)

module.exports = app
