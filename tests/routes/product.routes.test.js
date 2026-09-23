'use strict'

process.env.NODE_ENV = 'test'

jest.mock('../../src/services/product.service')
jest.mock('../../src/models/apikey.model')
jest.mock('../../src/services/keyToken.service')

const crypto = require('crypto')
const request = require('supertest')
const ProductService = require('../../src/services/product.service')
const apiKeyModel = require('../../src/models/apikey.model')
const KeyTokenService = require('../../src/services/keyToken.service')
const { NotFoundError } = require('../../src/core/error.response')
const { createTokenPair, HEADER } = require('../../src/auth/authUtils')

const app = require('../../src/app')

const API_KEY = 'test-api-key'
const USER_ID = 'shop1'

beforeEach(() => {
    apiKeyModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ key: API_KEY, status: true, permissions: ['0000', '1111', '2222'] })
    })
})

// Signs a real access token and points KeyTokenService.findByUserId at its matching public
// key, so requests go through the real `authentication` middleware end-to-end.
async function withAuthHeaders(req) {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs1', format: 'pem' }
    })
    const { accessToken } = await createTokenPair({ userId: USER_ID, email: 'shop@example.com' }, publicKey, privateKey)
    KeyTokenService.findByUserId.mockResolvedValue({ publicKey })

    return req
        .set('x-api-key', API_KEY)
        .set(HEADER.CLIENT_ID, USER_ID)
        .set(HEADER.AUTHORIZATION, accessToken)
}

describe('GET /v1/api/product (public catalog)', () => {
    it('returns 401 without a valid x-api-key', async () => {
        const res = await request(app).get('/v1/api/product')
        expect(res.status).toBe(401)
    })

    it('returns 200 with the product list', async () => {
        ProductService.findAllProducts.mockResolvedValue([{ _id: 'p1', product_name: 'Shirt' }])

        const res = await request(app).get('/v1/api/product').set('x-api-key', API_KEY)

        expect(res.status).toBe(200)
        expect(res.body.metadata).toEqual([{ _id: 'p1', product_name: 'Shirt' }])
    })
})

describe('GET /v1/api/product/:productId (public detail)', () => {
    it('returns 404 when the product does not exist', async () => {
        ProductService.findProductById.mockRejectedValue(new NotFoundError('Product not found'))

        const res = await request(app).get('/v1/api/product/does-not-exist').set('x-api-key', API_KEY)

        expect(res.status).toBe(404)
    })

    it('returns 200 with the product', async () => {
        ProductService.findProductById.mockResolvedValue({ _id: 'p1', product_name: 'Shirt' })

        const res = await request(app).get('/v1/api/product/p1').set('x-api-key', API_KEY)

        expect(res.status).toBe(200)
        expect(res.body.metadata).toEqual({ _id: 'p1', product_name: 'Shirt' })
    })
})

describe('GET /v1/api/product/search/:keySearch (public)', () => {
    it('returns 200 with search results', async () => {
        ProductService.searchProducts.mockResolvedValue([{ _id: 'p1' }])

        const res = await request(app).get('/v1/api/product/search/shirt').set('x-api-key', API_KEY)

        expect(res.status).toBe(200)
        expect(ProductService.searchProducts).toHaveBeenCalledWith('shirt')
    })
})

describe('POST /v1/api/product (protected: create)', () => {
    it('returns 401 without authentication headers', async () => {
        const res = await request(app)
            .post('/v1/api/product')
            .set('x-api-key', API_KEY)
            .send({ product_name: 'Shirt', product_type: 'Clothing' })

        expect(res.status).toBe(401)
    })

    it('creates the product when authenticated, tagging it with the caller as the owning shop', async () => {
        ProductService.createProduct.mockResolvedValue({ _id: 'p1', product_name: 'Shirt' })

        const res = await withAuthHeaders(
            request(app).post('/v1/api/product').send({ product_name: 'Shirt', product_type: 'Clothing' })
        )

        expect(res.status).toBe(201)
        expect(ProductService.createProduct).toHaveBeenCalledWith(
            'Clothing',
            expect.objectContaining({ product_name: 'Shirt', product_shop: USER_ID })
        )
    })
})

describe('PATCH /v1/api/product/:productId (protected: update)', () => {
    it('returns 403 when the service reports the caller does not own the product', async () => {
        const { ForbiddenError } = require('../../src/core/error.response')
        ProductService.updateProduct.mockRejectedValue(new ForbiddenError('You do not own this product'))

        const res = await withAuthHeaders(
            request(app).patch('/v1/api/product/p1').send({ product_name: 'New name' })
        )

        expect(res.status).toBe(403)
    })
})

describe('POST /v1/api/product/publish/:productId (protected)', () => {
    it('publishes the product for the authenticated shop', async () => {
        ProductService.publishProduct.mockResolvedValue({ _id: 'p1', isPublished: true })

        const res = await withAuthHeaders(request(app).post('/v1/api/product/publish/p1'))

        expect(res.status).toBe(200)
        expect(ProductService.publishProduct).toHaveBeenCalledWith({ productId: 'p1', productShopId: USER_ID })
    })
})
