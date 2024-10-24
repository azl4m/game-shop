const express = require('express')
const app = express()
const env = require('dotenv').config()
const db = require('./config/db')
const path = require('path')
const userRouter = require("./routes/userRouter")
const adminRouter = require("./routes/adminRoute")
const session = require('express-session')
const passport = require("./config/passport");
const razorpay = require('razorpay')
const cors = require('cors')
const flash = require("connect-flash")
db()
app.use(express.json());
app.use(express.urlencoded({extended:true}))
app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge:72*60*60*1000
    }
}))
app.use(cors())
const PORT = process.env.PORT||3003
app.use(flash())

app.use(passport.initialize())
app.use(passport.session())

app.set("view engine","ejs")
app.set("views",[path.join(__dirname,'views/user'),path.join(__dirname,"/views/admin")])
app.use(express.static(path.join(__dirname,"public")))
app.use((req, res, next) => {
    res.locals.messages = req.flash();
    next();
  });
  
app.use("/",userRouter)
app.use("/admin",adminRouter)
// app.get('/*', (req, res) => {
//     res.redirect("/pageNotFound")
//     });
app.listen(PORT,()=>console.log("server running on :"+PORT))

module.exports = app;