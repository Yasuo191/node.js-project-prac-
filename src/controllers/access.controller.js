'use strict'

const AccessService = require('../services/access.service')
const { CREATED, OK } = require('../core/success.response')

class AccessController {
    signUp = async (req, res, next) => {
        try {
            const metadata = await AccessService.signUp(req.body)

            new CREATED({
                message: 'Registered OK!',
                metadata
            }).send(res)
        } catch (error) {
            next(error)
        }
    }

    login = async (req, res, next) => {
        try {
            const metadata = await AccessService.login(req.body)

            new OK({
                message: 'Login OK!',
                metadata
            }).send(res)
        } catch (error) {
            next(error)
        }
    }

    logout = async (req, res, next) => {
        try {
            const metadata = await AccessService.logout(req.keyStore)

            new OK({
                message: 'Logout OK!',
                metadata
            }).send(res)
        } catch (error) {
            next(error)
        }
    }

    handleRefreshToken = async (req, res, next) => {
        try {
            const metadata = await AccessService.handleRefreshToken({
                keyStore: req.keyStore,
                user: req.user,
                refreshToken: req.refreshToken
            })

            new OK({
                message: 'Get token success!',
                metadata
            }).send(res)
        } catch (error) {
            next(error)
        }
    }
}

module.exports = new AccessController
