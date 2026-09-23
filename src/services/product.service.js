'use strict'

const { product, clothing, electronic, furniture } = require('../models/product.model')
const { BadRequestError, ForbiddenError, NotFoundError } = require('../core/error.response')

// Maps a product_type string to the Mongoose (discriminator) model that should handle it.
const productModelByType = {
    Clothing: clothing,
    Electronics: electronic,
    Furniture: furniture
}

class ProductService {

    static createProduct = async (productType, payload) => {
        const Model = productModelByType[productType]
        if (!Model) {
            throw new BadRequestError(`Invalid Product Type: ${productType}`)
        }

        const newProduct = await Model.create({ ...payload, product_type: productType })
        if (!newProduct) {
            throw new BadRequestError('Failed to create product')
        }

        return newProduct
    }

    static updateProduct = async ({ productId, productShopId, payload }) => {
        const foundProduct = await product.findById(productId)
        if (!foundProduct) {
            throw new NotFoundError('Product not found')
        }
        if (String(foundProduct.product_shop) !== String(productShopId)) {
            throw new ForbiddenError('You do not own this product')
        }

        Object.assign(foundProduct, payload)
        return await foundProduct.save()
    }

    static deleteProduct = async ({ productId, productShopId }) => {
        const foundProduct = await product.findById(productId)
        if (!foundProduct) {
            throw new NotFoundError('Product not found')
        }
        if (String(foundProduct.product_shop) !== String(productShopId)) {
            throw new ForbiddenError('You do not own this product')
        }

        return await product.deleteOne({ _id: productId })
    }

    static publishProduct = async ({ productId, productShopId }) => {
        const foundProduct = await product.findOne({ _id: productId, product_shop: productShopId })
        if (!foundProduct) {
            throw new NotFoundError('Product not found')
        }

        foundProduct.isDraft = false
        foundProduct.isPublished = true
        return await foundProduct.save()
    }

    static unPublishProduct = async ({ productId, productShopId }) => {
        const foundProduct = await product.findOne({ _id: productId, product_shop: productShopId })
        if (!foundProduct) {
            throw new NotFoundError('Product not found')
        }

        foundProduct.isDraft = true
        foundProduct.isPublished = false
        return await foundProduct.save()
    }

    static findAllDraftsForShop = async ({ productShopId, limit = 50, skip = 0 }) => {
        return await product
            .find({ product_shop: productShopId, isDraft: true })
            .select('product_name product_thumb product_price product_type isDraft isPublished')
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean()
    }

    static findAllPublishedForShop = async ({ productShopId, limit = 50, skip = 0 }) => {
        return await product
            .find({ product_shop: productShopId, isPublished: true })
            .select('product_name product_thumb product_price product_type isDraft isPublished')
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean()
    }

    // Public catalog listing: only ever returns published products.
    static findAllProducts = async ({ limit = 50, page = 1, sort = 'ctime', filter = {} }) => {
        const skip = (page - 1) * limit
        const sortBy = sort === 'ctime' ? { createdAt: -1 } : { updatedAt: -1 }

        return await product
            .find({ ...filter, isPublished: true })
            .sort(sortBy)
            .skip(skip)
            .limit(limit)
            .select('product_name product_thumb product_price product_type product_shop')
            .lean()
    }

    static findProductById = async (productId) => {
        const foundProduct = await product.findOne({ _id: productId, isPublished: true }).lean()
        if (!foundProduct) {
            throw new NotFoundError('Product not found')
        }
        return foundProduct
    }

    static searchProducts = async (keySearch) => {
        if (!keySearch) {
            throw new BadRequestError('keySearch is required')
        }

        return await product
            .find({ isPublished: true, $text: { $search: keySearch } }, { score: { $meta: 'textScore' } })
            .sort({ score: { $meta: 'textScore' } })
            .lean()
    }
}

module.exports = ProductService
