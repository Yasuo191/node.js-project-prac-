'use strict'
// lv0
// const config={
//     app: {
//         port:3000
//     },
//     db: {
//         host :'localhost',
//         port:27017,
//         name:'db',
//     }
// }

// lv 1

const dev={
    app: {
        port: process.env.DEV_APP_PORT
    },
    db: {
        host :process.env.DEV_DB_HOST,
        port:process.env.DEV_DB_PORT,
        name:process.env.DEV_DB_NAME
    }
}


const product={
    app: {
        port:process.env.PROD_APP_PORT
    },
    db: {
        host:process.env.PROD_DB_HOST,
        port:process.env.PROD_DB_PORT,
        name:process.env.PROD_DB_NAME
    }
}
const config={dev,product}
const env=process.env.NODE_ENV|| 'dev'

console.log(config[env],env)
module.exports=config[env]