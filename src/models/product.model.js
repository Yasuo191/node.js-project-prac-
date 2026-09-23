'use strict'

const { Schema, model } = require('mongoose')
const { slugify } = require('../utils')

const DOCUMENT_NAME = 'Product'
const COLLECTION_NAME = 'Products'

const productSchema = new Schema({
    product_name: { type: String, required: true },
    product_thumb: { type: String, required: true },
    product_description: { type: String },
    product_slug: { type: String },
    product_price: { type: Number, required: true },
    product_quantity: { type: Number, required: true },
    product_type: {
        type: String,
        required: true,
        enum: ['Electronics', 'Clothing', 'Furniture']
    },
    product_shop: {
        type: Schema.Types.ObjectId,
        ref: 'Shop',
        required: true
    },
    // The fields specific to each product_type live here (see the discriminators below).
    product_attributes: { type: Schema.Types.Mixed, required: true },
    product_ratingsAverage: {
        type: Number,
        default: 4.5,
        min: [1, 'Rating must be at least 1.0'],
        max: [5, 'Rating must be at most 5.0'],
        set: (val) => Math.round(val * 10) / 10
    },
    product_variations: { type: Array, default: [] },
    isDraft: { type: Boolean, default: true, index: true, select: false },
    isPublished: { type: Boolean, default: false, index: true, select: false }
}, {
    collection: COLLECTION_NAME,
    timestamps: true
})

// Powers the free-text search endpoint.
productSchema.index({ product_name: 'text', product_description: 'text' })

productSchema.pre('save', function (next) {
    this.product_slug = slugify(this.product_name)
    next()
})

const product = model(DOCUMENT_NAME, productSchema)

const clothingSchema = new Schema({
    brand: { type: String, required: true },
    size: { type: String },
    material: { type: String },
    product_shop: { type: Schema.Types.ObjectId, ref: 'Shop' }
}, {
    collection: 'clothes',
    timestamps: true
})

const electronicSchema = new Schema({
    manufacturer: { type: String, required: true },
    model: { type: String },
    color: { type: String },
    product_shop: { type: Schema.Types.ObjectId, ref: 'Shop' }
}, {
    collection: 'electronics',
    timestamps: true
})

const furnitureSchema = new Schema({
    brand: { type: String, required: true },
    material: { type: String },
    color: { type: String },
    product_shop: { type: Schema.Types.ObjectId, ref: 'Shop' }
}, {
    collection: 'furnitures',
    timestamps: true
})

module.exports = {
    product,
    clothing: product.discriminator('Clothing', clothingSchema),
    electronic: product.discriminator('Electronics', electronicSchema),
    furniture: product.discriminator('Furniture', furnitureSchema)
}
