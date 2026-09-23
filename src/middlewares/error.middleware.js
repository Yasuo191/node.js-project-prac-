'use strict'

const { StatusCodes, ReasonPhrases } = require('../core/httpStatusCode')
const { ErrorResponse } = require('../core/error.response')

// Catches any request that didn't match a route and forwards a 404 to the error handler
const notFoundHandler = (req, res, next) => {
    const error = new ErrorResponse(`Route ${req.originalUrl} not found`, StatusCodes.NOT_FOUND)
    next(error)
}

// Must be the LAST middleware registered (4 args = Express error handler signature)
const errorHandler = (error, req, res, next) => {
    const statusCode = error.status || StatusCodes.INTERNAL_SERVER_ERROR
    const message = error.message || ReasonPhrases.INTERNAL_SERVER_ERROR

    if (statusCode === StatusCodes.INTERNAL_SERVER_ERROR) {
        // Unexpected errors get logged in full; expected ones (4xx) are just noise in prod logs
        console.error(`[Unhandled Error]::`, error)
    }

    return res.status(statusCode).json({
        status: 'error',
        code: statusCode,
        message,
        stack: process.env.NODE_ENV === 'dev' ? error.stack : undefined
    })
}

module.exports = {
    notFoundHandler,
    errorHandler
}
