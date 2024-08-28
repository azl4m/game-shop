// const express = require('express')
// const user = express()
// const userController = require("../controllers/user/userController")
// const path =require('path')
// const bodyParser = require('body-parser')
// const nocache = require('nocache')


// user.set('view engine','ejs')
// user.set('views',path.join(__dirname, '..', 'views/user'));
// user.use(express.static(path.join(__dirname,"..","public")))
// user.use(bodyParser.json());
// user.use(bodyParser.urlencoded({
//     extended:true
// }))
// user.use(nocache());

const express=require('express')
const user=express.Router()
const userController=require("../controllers/user/userController")
const passport = require('passport')
const auth = require('../middlewares/auth')
const addminAuth = require('../middlewares/adminAuth')


//for signup
user.get("/signup",addminAuth.isLogout,auth.isLogout,userController.signupLoad)
user.post("/signup",userController.registerUser)

//forOTP verification
user.get("/verifyOtp",addminAuth.isLogout,auth.isLogout,userController.verifyOtpLoad)
user.post("/verifyOtp",userController.verifyOtp)
user.post("/resendOtp",userController.resendOtp)
//for login
user.get("/login",addminAuth.isLogout,auth.isLogout,userController.loginLoad)
user.post("/login",userController.loginUser)
//for logout
user.get("/logout",userController.logout)
//for page not found
user.get("/pageNotFound",userController.pageNotFound)
user.get('/',addminAuth.isLogout,userController.loadHomePage);
//for google auth
user.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
user.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:"/signup"}),(req,res)=>{ 
    res.redirect("/")
})


module.exports = user