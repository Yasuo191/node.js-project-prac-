'use strict'

const _SECOND = 20000
const os = require('os')
const process = require('process')
const mongoose = require('mongoose')

// Count connect
const countConnect = () => {
    const numConnection = mongoose.connections.length
    console.log(`Number of connections: ${numConnection}`)
}

// Check overload
const checkOverload = () => {
    setInterval(() => {
        const numConnection = mongoose.connections.length
        const numCores = os.cpus().length
        const memoryUsage = process.memoryUsage().rss

        // Example maximum number of connections based on number of cores
        const maxConnections = numCores * 5

        console.log(`Active connections: ${numConnection}`)
        console.log(`Memory usage: ${(memoryUsage / 1024 / 1024).toFixed(2)} MB`)

        if (numConnection > maxConnections) {
            console.log(`Connection overload detected!`)
        }

    }, _SECOND) // Monitor every 5 seconds
}

module.exports = {
    countConnect,
    checkOverload
}