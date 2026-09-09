'use strict'

const mongoose=require('mongoose')
const connectString=`mongodb://localhost:27017/shopDEV`
mongoose.connect(connectString).then(_ => console.log(`Connected Mongodb Success`))
.catch( err=>console.log(`Error log!`))

//dev

if(1===1){
    mongoose.set('debug', true)
    mongoose.set('debug',{color: true})
}
module.exports=mongoose

// Disadvantage: The database connection may be called multiple times,
// which can waste resources and make the application harder to manage.

