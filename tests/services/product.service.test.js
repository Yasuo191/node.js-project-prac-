'use strict'

jest.mock('../../src/models/product.model', () => ({
    product: {
        find: jest.fn(),
        findOne: jest.fn(),
        findById: jest.fn(),
        deleteOne: jest.fn(),
        create: jest.fn()
    },
    clothing: { create: jest.fn() },
    electronic: { create: jest.fn() },
    furniture: { create: jest.fn() }
}))

const { product, clothing, electronic, furniture } = require('../../src/models/product.model')
const ProductService = require('../../src/services/product.service')
const { BadRequestError, ForbiddenError, NotFoundError } = require('../../src/core/error.response')

describe('ProductService.createProduct', () => {
    it('throws BadRequestError for an unknown product_type', async () => {
        await expect(ProductService.createProduct('NotAType', {})).rejects.toThrow(BadRequestError)
    })

    it('routes Clothing payloads to the clothing discriminator model', async () => {
        clothing.create.mockResolvedValue({ _id: 'p1', product_type: 'Clothing' })

        const result = await ProductService.createProduct('Clothing', { product_name: 'Shirt' })

        expect(clothing.create).toHaveBeenCalledWith(
            expect.objectContaining({ product_name: 'Shirt', product_type: 'Clothing' })
        )
        expect(result).toEqual({ _id: 'p1', product_type: 'Clothing' })
    })

    it('throws BadRequestError when creation returns nothing', async () => {
        electronic.create.mockResolvedValue(null)
        await expect(ProductService.createProduct('Electronics', {})).rejects.toThrow(BadRequestError)
    })
})

describe('ProductService.updateProduct', () => {
    it('throws NotFoundError when the product does not exist', async () => {
        product.findById.mockResolvedValue(null)
        await expect(
            ProductService.updateProduct({ productId: 'p1', productShopId: 'shop1', payload: {} })
        ).rejects.toThrow(NotFoundError)
    })

    it('throws ForbiddenError when the caller does not own the product', async () => {
        product.findById.mockResolvedValue({ product_shop: 'shop-other', save: jest.fn() })
        await expect(
            ProductService.updateProduct({ productId: 'p1', productShopId: 'shop1', payload: {} })
        ).rejects.toThrow(ForbiddenError)
    })

    it('applies the payload and saves when the shop owns the product', async () => {
        const save = jest.fn().mockResolvedValue({ product_name: 'New name' })
        const foundProduct = { product_shop: 'shop1', product_name: 'Old name', save }
        product.findById.mockResolvedValue(foundProduct)

        const result = await ProductService.updateProduct({
            productId: 'p1',
            productShopId: 'shop1',
            payload: { product_name: 'New name' }
        })

        expect(foundProduct.product_name).toBe('New name')
        expect(save).toHaveBeenCalled()
        expect(result).toEqual({ product_name: 'New name' })
    })
})

describe('ProductService.deleteProduct', () => {
    it('throws ForbiddenError when the caller does not own the product', async () => {
        product.findById.mockResolvedValue({ product_shop: 'shop-other' })
        await expect(
            ProductService.deleteProduct({ productId: 'p1', productShopId: 'shop1' })
        ).rejects.toThrow(ForbiddenError)
        expect(product.deleteOne).not.toHaveBeenCalled()
    })

    it('deletes the product when the shop owns it', async () => {
        product.findById.mockResolvedValue({ product_shop: 'shop1' })
        product.deleteOne.mockResolvedValue({ deletedCount: 1 })

        const result = await ProductService.deleteProduct({ productId: 'p1', productShopId: 'shop1' })

        expect(product.deleteOne).toHaveBeenCalledWith({ _id: 'p1' })
        expect(result).toEqual({ deletedCount: 1 })
    })
})

describe('ProductService.publishProduct / unPublishProduct', () => {
    it('publishProduct flips isDraft/isPublished and saves', async () => {
        const save = jest.fn().mockResolvedValue(true)
        const foundProduct = { isDraft: true, isPublished: false, save }
        product.findOne.mockResolvedValue(foundProduct)

        await ProductService.publishProduct({ productId: 'p1', productShopId: 'shop1' })

        expect(foundProduct.isDraft).toBe(false)
        expect(foundProduct.isPublished).toBe(true)
        expect(save).toHaveBeenCalled()
    })

    it('unPublishProduct flips isDraft/isPublished and saves', async () => {
        const save = jest.fn().mockResolvedValue(true)
        const foundProduct = { isDraft: false, isPublished: true, save }
        product.findOne.mockResolvedValue(foundProduct)

        await ProductService.unPublishProduct({ productId: 'p1', productShopId: 'shop1' })

        expect(foundProduct.isDraft).toBe(true)
        expect(foundProduct.isPublished).toBe(false)
    })

    it('throws NotFoundError when trying to publish a product the shop does not own', async () => {
        product.findOne.mockResolvedValue(null)
        await expect(
            ProductService.publishProduct({ productId: 'p1', productShopId: 'shop1' })
        ).rejects.toThrow(NotFoundError)
    })
})

describe('ProductService.findProductById', () => {
    it('throws NotFoundError when no published product matches', async () => {
        product.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) })
        await expect(ProductService.findProductById('p1')).rejects.toThrow(NotFoundError)
    })

    it('returns the product when found', async () => {
        product.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'p1' }) })
        const result = await ProductService.findProductById('p1')
        expect(result).toEqual({ _id: 'p1' })
    })
})

describe('ProductService.searchProducts', () => {
    it('throws BadRequestError when keySearch is missing', async () => {
        await expect(ProductService.searchProducts()).rejects.toThrow(BadRequestError)
    })

    it('runs a text search restricted to published products', async () => {
        const chain = {
            sort: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue([{ _id: 'p1' }])
        }
        product.find.mockReturnValue(chain)

        const result = await ProductService.searchProducts('shirt')

        expect(product.find).toHaveBeenCalledWith(
            expect.objectContaining({ isPublished: true, $text: { $search: 'shirt' } }),
            expect.any(Object)
        )
        expect(result).toEqual([{ _id: 'p1' }])
    })
})
