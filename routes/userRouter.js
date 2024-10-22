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
const productController = require('../controllers/user/productController')
const cartController = require('../controllers/user/cartController')
const checkoutController = require('../controllers/user/checkoutController')
const addressController = require('../controllers/user/addressController')
const orderController = require('../controllers/user/orderController')
const wishlistController = require('../controllers/user/wishlistController')
const profileController = require('../controllers/user/profileController')
const paymentController = require('../controllers/user/paymentController')
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
user.get('/productDetails',productController.productDetailsLoad)
user.get("/getPlatformStock",productController.getPlatformStock);
//products
user.get('/products',productController.productsLoad)

//for cart
user.get("/addToCart",addminAuth.isLogout,auth.isLogin,cartController.addToCart)
user.get("/cart",addminAuth.isLogout,auth.isLogin,cartController.cartLoad)
user.post('/removeFromCart',addminAuth.isLogout,auth.isLogin,cartController.removeFromCart)
user.post('/updateCartQuantity',addminAuth.isLogout,auth.isLogin,cartController.updateCartQuantity)

//checkout
user.get("/checkout",addminAuth.isLogout,auth.isLogin,checkoutController.getCheckoutPage)
user.post('/checkout',addminAuth.isLogout,auth.isLogin,checkoutController.checkoutLoad)
user.post('/applyCoupon',addminAuth.isLogout,auth.isLogin,checkoutController.applyCoupon)
user.post('/removeCoupon',addminAuth.isLogout,auth.isLogin,checkoutController.removeCoupon)
user.post("/applyWalletBalance",auth.isLogin,checkoutController.applyWalletBalance)
//address management
user.get('/addressManagement',addminAuth.isLogout,auth.isLogin,addressController.addressManagementLoad)
user.post('/addAddress',addminAuth.isLogout,auth.isLogin,addressController.addAddress)
user.get('/setDefaultAddress',addminAuth.isLogout,auth.isLogin,addressController.setDefaultAdress)
user.get('/editAddress',addminAuth.isLogout,auth.isLogin,addressController.editAddressLoad)
user.post('/editAddress',addminAuth.isLogout,auth.isLogin,addressController.editAddress)
user.get('/deleteAddress',addminAuth.isLogout,auth.isLogin,addressController.deleteAddress)

//forgot password
user.post("/forgotPassword",addminAuth.isLogout,auth.isLogout,userController.forgotPassword)
user.get("/resetPassword",addminAuth.isLogout,auth.isLogout,userController.resetPasswordLoad)
user.post('/resetPassword',addminAuth.isLogout,auth.isLogout,userController.resetPassword)

//user profile
user.get('/userProfile',addminAuth.isLogout,auth.isLogin,profileController.userProfileLoad)
user.get('/editProfile',addminAuth.isLogout,auth.isLogin,profileController.editProfileLoad)
user.post('/editProfile',addminAuth.isLogout,auth.isLogin,profileController.editProfile)
//orders
user.get('/ordersListing',addminAuth.isLogout,auth.isLogin,orderController.ordersLoad)
user.get('/orderDetails',addminAuth.isLogout,auth.isLogin,orderController.orderDetails)
user.get('/requestReturn',addminAuth.isLogout,auth.isLogin,orderController.requestReturn)
user.get('/orderSuccess',addminAuth.isLogout,auth.isLogin,orderController.orderSuccessLoad)
user.get('/cancelOrder',addminAuth.isLogout,auth.isLogin,orderController.requestCancel)
user.get('/downloadInvoice',addminAuth.isLogout,auth.isLogin,orderController.downloadInvoice)
//razorpay
user.post("/verifyPayment",addminAuth.isLogout,auth.isLogin,paymentController.razorpayPaymentVerification)
user.get("/paymentFailed",auth.isLogin,paymentController.paymentFailure)
user.get("/orderFailed",auth.isLogin,paymentController.orderFailed)
user.post("/retryPayment",auth.isLogin,paymentController.retryPayment)

//wishlist
user.get('/addToWishList',addminAuth.isLogout,auth.isLogin,wishlistController.addToWishList)
user.get('/wishlist',addminAuth.isLogout,auth.isLogin,wishlistController.wishlistLoad)
user.delete('/wishlistRemove',addminAuth.isLogout,auth.isLogin,wishlistController.wishlistRemove)

//wallet
user.get("/wallet",addminAuth.isLogout,auth.isLogin,profileController.loadWalletPage)
user.post("/addToWallet",addminAuth.isLogout,auth.isLogin,profileController.addToWallet)
//for page not found
user.get("/pageNotFound",userController.pageNotFound)
user.get('/',addminAuth.isLogout,userController.loadHomePage);

//for google auth
user.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
user.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:"/signup"}),(req,res)=>{ 
    res.redirect("/")
})



module.exports = user