'use strict'

const apiKeyModel = require('../models/apikey.model')
const { AuthFailureError, ForbiddenError } = require('../core/error.response')
const { asyncHandler } = require('../utils')

const HEADER = {
    API_KEY: 'x-api-key'
}

// Every request must present a valid, active API key before it's allowed anywhere near
// the actual route handlers.
const apiKey = asyncHandler(async (req, res, next) => {
    const key = req.headers[HEADER.API_KEY]
    if (!key || typeof key !== 'string') {
        throw new AuthFailureError('Forbidden Error')
    }

    const objKey = await apiKeyModel.findOne({ key, status: true }).lean()
    if (!objKey) {
        throw new AuthFailureError('Forbidden Error')
    }

    req.objKey = objKey
    return next()
})

// Requires the API key resolved by apiKey() above to include a given permission code.
const permission = (requiredPermission) => {
    return (req, res, next) => {
        if (!req.objKey) {
            throw new ForbiddenError('permission denied')
        }

        if (!req.objKey.permissions.includes(requiredPermission)) {
            throw new ForbiddenError('permission denied')
        }

        return next()
    }
}

module.exports = {
    HEADER,
    apiKey,
    permission
}
