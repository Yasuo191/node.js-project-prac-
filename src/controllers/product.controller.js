'use strict'

const ProductService = require('../services/product.service')
const { CREATED, OK } = require('../core/success.response')

class ProductController {
    createProduct = async (req, res, next) => {
        try {
            const metadata = await ProductService.createProduct(req.body.product_type, {
                ...req.body,
                product_shop: req.user.userId
            })

            new CREATED({ message: 'Product created!', metadata }).send(res)
        } catch (error) {
            next(error)
        }
    }

    updateProduct = async (req, res, next) => {
        try {
            const metadata = await ProductService.updateProduct({
                productId: req.params.productId,
                productShopId: req.user.userId,
                payload: req.body
            })

            new OK({ message: 'Product updated!', metadata }).send(res)
        } catch (error) {
            next(error)
        }
    }

    deleteProduct = async (req, res, next) => {
        try {
            const metadata = await ProductService.deleteProduct({
                productId: req.params.productId,
                productShopId: req.user.userId
            })

            new OK({ message: 'Product deleted!', metadata }).send(res)
        } catch (error) {
            next(error)
        }
    }

    publishProduct = async (req, res, next) => {
        try {
            const metadata = await ProductService.publishProduct({
                productId: req.params.productId,
                productShopId: req.user.userId
            })

            new OK({ message: 'Product published!', metadata }).send(res)
        } catch (error) {
            next(error)
        }
    }

    unPublishProduct = async (req, res, next) => {
        try {
            const metadata = await ProductService.unPublishProduct({
                productId: req.params.productId,
                productShopId: req.user.userId
            })

            new OK({ message: 'Product unpublished!', metadata }).send(res)
        } catch (error) {
            next(error)
        }
    }

    getDrafts = async (req, res, next) => {
        try {
            const metadata = await ProductService.findAllDraftsForShop({ productShopId: req.user.userId })
            new OK({ message: 'Get drafts success!', metadata }).send(res)
        } catch (error) {
            next(error)
        }
    }

    getPublished = async (req, res, next) => {
        try {
            const metadata = await ProductService.findAllPublishedForShop({ productShopId: req.user.userId })
            new OK({ message: 'Get published success!', metadata }).send(res)
        } catch (error) {
            next(error)
        }
    }

    // public
    getAllProducts = async (req, res, next) => {
        try {
            const { limit, page, sort } = req.query
            const metadata = await ProductService.findAllProducts({
                limit: limit ? Number(limit) : undefined,
                page: page ? Number(page) : undefined,
                sort
            })

            new OK({ message: 'Get products success!', metadata }).send(res)
        } catch (error) {
            next(error)
        }
    }

    getProductDetail = async (req, res, next) => {
        try {
            const metadata = await ProductService.findProductById(req.params.productId)
            new OK({ message: 'Get product success!', metadata }).send(res)
        } catch (error) {
            next(error)
        }
    }

    searchProducts = async (req, res, next) => {
        try {
            const metadata = await ProductService.searchProducts(req.params.keySearch)
            new OK({ message: 'Search success!', metadata }).send(res)
        } catch (error) {
            next(error)
        }
    }
}

module.exports = new ProductController
