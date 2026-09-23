'use strict'
const express = require('express')
const productController = require('../../controllers/product.controller')
const { authentication } = require('../../auth/authUtils')
const router = express.Router()

// public - anyone with a valid api key can browse the catalog
router.get('/search/:keySearch', productController.searchProducts)
router.get('/drafts/all', authentication, productController.getDrafts)
router.get('/published/all', authentication, productController.getPublished)
router.get('/', productController.getAllProducts)
router.get('/:productId', productController.getProductDetail)

// protected - shop-owner-only actions (authentication applied per-route rather than via
// router.use() so a genuinely unmatched path/method still falls through to the 404 handler
// instead of failing authentication first - see the same fix made for the access routes)
router.post('/', authentication, productController.createProduct)
router.patch('/:productId', authentication, productController.updateProduct)
router.delete('/:productId', authentication, productController.deleteProduct)
router.post('/publish/:productId', authentication, productController.publishProduct)
router.post('/unpublish/:productId', authentication, productController.unPublishProduct)

module.exports = router
