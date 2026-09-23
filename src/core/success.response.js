'use strict'

const { StatusCodes, ReasonPhrases } = require('./httpStatusCode')

class SuccessResponse {
    constructor({ message, statusCode = StatusCodes.OK, reasonStatusCode = ReasonPhrases.OK, metadata = {} }) {
        this.message = message || reasonStatusCode
        this.status = statusCode
        this.metadata = metadata
    }

    send(res, headers = {}) {
        return res.status(this.status).set(headers).json(this)
    }
}

class OK extends SuccessResponse {
    constructor({ message, metadata }) {
        super({ message, metadata })
    }
}

class CREATED extends SuccessResponse {
    constructor({
        message,
        statusCode = StatusCodes.CREATED,
        reasonStatusCode = ReasonPhrases.CREATED,
        metadata,
        options = {}
    }) {
        super({ message, statusCode, reasonStatusCode, metadata })
        this.options = options
    }
}

module.exports = {
    SuccessResponse,
    OK,
    CREATED
}
