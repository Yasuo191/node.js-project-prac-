'use strict'

// Picks only the given fields out of an object (e.g. a Mongoose document)
// so we never accidentally leak sensitive fields like password hashes in API responses.
const getInfoData = ({ fields = [], object = {} }) => {
    return fields.reduce((result, field) => {
        if (object[field] !== undefined) {
            result[field] = object[field]
        }
        return result
    }, {})
}

// Wraps an async Express handler/middleware so any rejected promise is forwarded to
// next(error) automatically, instead of every controller/middleware needing its own try/catch.
const asyncHandler = (fn) => {
    return (req, res, next) => {
        // returning the promise lets callers (and tests) await it; Express itself ignores the return value
        return fn(req, res, next).catch(next)
    }
}

// Small dependency-free slugifier: lowercases, strips accents/diacritics, replaces
// anything that isn't a letter/number with a single hyphen.
const slugify = (text = '') => {
    return text
        .toString()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents (e.g. "Áo" -> "Ao")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

module.exports = {
    getInfoData,
    asyncHandler,
    slugify
}
