'use strict'

const { Schema, model } = require('mongoose');

const DOCUMENT_NAME = 'Key';
const COLLECTION_NAME = 'Keys';

// Declare the Schema of the Mongo model
const keyTokenSchema = new Schema({
    shop: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Shop'
    },

    publicKey: {
        type: String,
        required: true
    },

    // the currently-valid refresh token for this shop
    refreshToken: {
        type: String,
        default: ''
    },

    // refresh tokens that have already been rotated out - kept around so that if one of them
    // is ever presented again we know the token has been stolen/replayed and can react
    refreshTokensUsed: {
        type: Array,
        default: []
    }
}, {
    collection: COLLECTION_NAME,
    timestamps: true
});

// Export the model
module.exports = model(DOCUMENT_NAME, keyTokenSchema);
