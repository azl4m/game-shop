const express = require('express')
const app = express()
const env = require('dotenv').config()
const db = require('./config/db')
const path = require('path')
const userRouter = require("./routes/userRouter")
const adminRouter = require("./routes/adminRoute")
db()
app.use(express.json());
app.use(express.urlencoded({extended:true}))
const PORT = process.env.PORT||3003

app.set("view engine","ejs")
app.set("views",[path.join(__dirname,'views/user'),path.join(__dirname,"/views/admin")])
app.use(express.static(path.join(__dirname,"public")))

app.use("/",userRouter)
app.use("/admin",adminRouter)
app.get('/*', (req, res) => {
    res.redirect("/pageNotFound")
    });
app.listen(PORT,()=>console.log("server running on :"+PORT))


module.exports = app;