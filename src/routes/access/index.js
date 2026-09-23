'use strict'
const express = require('express')
const accessController = require('../../controllers/access.controller')
const { authentication } = require('../../auth/authUtils')
const { permission } = require('../../middlewares/apikey.middleware')
const router = express.Router()

router.use(permission('0000'))

// public
router.post('/shop/signup', accessController.signUp)
router.post('/shop/login', accessController.login)

// protected - applied per-route (not via router.use) so an unmatched path still falls
// through to the 404 handler instead of failing authentication first
router.post('/shop/logout', authentication, accessController.logout)
router.post('/shop/handle-refresh-token', authentication, accessController.handleRefreshToken)

module.exports = router
