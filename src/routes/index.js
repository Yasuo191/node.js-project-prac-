'use strict'
const express = require('express')
const router = express.Router()

router.use('/v1/api/product', require('./product'))
router.use('/v1/api', require('./access'))
// router.get("", (req, res, next)=>{
//     return res.status(200).json({
//         message: 'YoLo'
//     })
// })

module.exports = router 