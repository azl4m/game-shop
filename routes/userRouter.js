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
const admin = require('./adminRoute')


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

//for product details page
user.get('/productDetails',userController.productDetailsLoad)
user.get("/getPlatformStock", userController.getPlatformStock);
//products
user.get('/products',userController.productsLoad)

//for cart
user.get("/addToCart",addminAuth.isLogout,auth.isLogin,userController.addToCart)
user.get("/cart",addminAuth.isLogout,auth.isLogin,userController.cartLoad)
user.post('/removeFromCart',addminAuth.isLogout,auth.isLogin,userController.removeFromCart)
user.post('/updateCartQuantity',addminAuth.isLogout,auth.isLogin,userController.updateCartQuantity)

//checkout
user.get("/checkout",addminAuth.isLogout,auth.isLogin,userController.getCheckoutPage)
user.post('/checkout',addminAuth.isLogout,auth.isLogin,userController.checkoutLoad)
user.post('/applyCoupon',addminAuth.isLogout,auth.isLogin,userController.applyCoupon)
//address management
user.get('/addressManagement',addminAuth.isLogout,auth.isLogin,userController.addressManagementLoad)
user.post('/addAddress',addminAuth.isLogout,auth.isLogin,userController.addAddress)
user.get('/setDefaultAddress',addminAuth.isLogout,auth.isLogin,userController.setDefaultAdress)
user.get('/editAddress',addminAuth.isLogout,auth.isLogin,userController.editAddressLoad)
user.post('/editAddress',addminAuth.isLogout,auth.isLogin,userController.editAddress)
user.get('/deleteAddress',addminAuth.isLogout,auth.isLogin,userController.deleteAddress)

//forgot password
user.post("/forgotPassword",addminAuth.isLogout,auth.isLogout,userController.forgotPassword)
user.get("/resetPassword",addminAuth.isLogout,auth.isLogout,userController.resetPasswordLoad)
user.post('/resetPassword',addminAuth.isLogout,auth.isLogout,userController.resetPassword)

//user profile
user.get('/userProfile',addminAuth.isLogout,auth.isLogin,userController.userProfileLoad)
user.get('/editProfile',addminAuth.isLogout,auth.isLogin,userController.editPtofileLoad)
user.post('/editProfile',addminAuth.isLogout,auth.isLogin,userController.editProfile)
//orders
user.get('/ordersListing',addminAuth.isLogout,auth.isLogin,userController.ordersLoad)
user.get('/orderDetails',addminAuth.isLogout,auth.isLogin,userController.orderDetails)
user.get('/requestReturn',addminAuth.isLogout,auth.isLogin,userController.requestReturn)
user.get('/orderSuccess',addminAuth.isLogout,auth.isLogin,userController.orderSuccessLoad)
user.get('/cancelOrder',addminAuth.isLogout,auth.isLogin,userController.requestCancel)
//razorpay
user.post("/verifyPayment",addminAuth.isLogout,auth.isLogin,userController.razorpayPaymentVerification)

//wishlist
user.get('/addToWishList',userController.addToWishList)
user.get('/wishlist',addminAuth.isLogout,auth.isLogin,userController.wishlistLoad)
user.delete('/wishlistRemove',addminAuth.isLogout,auth.isLogin,userController.wishlistRemove)

//wallet
user.get("/wallet",addminAuth.isLogout,auth.isLogin,userController.loadWalletPage)
user.post("/addToWallet",addminAuth.isLogout,auth.isLogin,userController.addToWallet)
//for page not found
user.get("/pageNotFound",userController.pageNotFound)
user.get('/',addminAuth.isLogout,userController.loadHomePage);

//for google auth
user.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
user.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:"/signup"}),(req,res)=>{ 
    res.redirect("/")
})



module.exports = user