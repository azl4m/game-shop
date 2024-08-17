const express = require('express')
const app = express()
const env = require('dotenv').config()
const port = process.env.PORT||3000;
app.listen(process.env.PORT,()=>console.log("server running"))


module.exports = app;