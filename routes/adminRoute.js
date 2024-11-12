const express=require('express')
const admin = express.Router()
const adminController=require("../controllers/admin/adminController")
const auth = require('../middlewares/adminAuth')
const productController = require('../controllers/admin/productController')
const categoryController = require('../controllers/admin/categoryController')
const couponController = require('../controllers/admin/couponController')
const orderController = require('../controllers/admin/orderController')
const userController = require('../controllers/admin/userController')
const dashboardController = require('../controllers/admin/dashboardController')


admin.get("/pageNotFound",adminController.pageNotFound)
// load dashboard
admin.get("/",auth.isLogin,adminController.dashboardLoad)
//add products
admin.get('/addProduct',auth.isLogin,productController.addProductLoad);
admin.post('/addProduct',auth.isLogin,productController.addProduct);
admin.get('/productManagement',auth.isLogin,productController.productManagementLoad)
admin.get('/editProduct',auth.isLogin,productController.editProductLoad)
admin.post('/editProduct',auth.isLogin,productController.editProduct)
admin.get('/unlistProduct',auth.isLogin,productController.unlistProduct)
admin.get('/restoreProduct',auth.isLogin,productController.restoreProduct)
admin.get('/deleteProduct',auth.isLogin,productController.deleteProduct)
admin.get('/deleteImage',auth.isLogin,productController.deleteSingleImage)
//product offer
admin.get("/productOffer",auth.isLogin,productController.offersLoad)
admin.get("/deletProductOffer",auth.isLogin,productController.deleteOffer)
//user management
admin.get('/userManagement',auth.isLogin,userController.userManagementLoad)
admin.get('/blockUser',auth.isLogin,userController.blockUser)
admin.get('/unblockUser',auth.isLogin,userController.unblockUser)
//category management
admin.get('/categoryManagement',auth.isLogin,categoryController.categoryManagementLoad)
admin.get('/addCategory',auth.isLogin,categoryController.addCategoryLoad)
admin.post('/addCategory',auth.isLogin,categoryController.addCategory)
admin.get('/editCategory',auth.isLogin,categoryController.editCategoryLoad)
admin.post('/editCategory',auth.isLogin,categoryController.editCategory)
admin.get('/unlistCategory',auth.isLogin,categoryController.unlistCategory)
admin.get('/listCategory',auth.isLogin,categoryController.listCategory)
admin.get('/deleteCategory',auth.isLogin,categoryController.deleteCategory)
//category offer
admin.get("/categoryOffer",auth.isLogin,categoryController.offersLoad)
admin.get("/deleteCategoryOffer",auth.isLogin,categoryController.deleteOffer)
//order management
admin.get('/orderManagement',auth.isLogin,orderController.orderManagementLoad)
admin.get('/orderStatus',auth.isLogin,orderController.orderStatus)
admin.get('/orderDetails',auth.isLogin,orderController.orderDetails)
admin.get('/acceptReturn',auth.isLogin,orderController.acceptReturn)
admin.get('/rejectReturn',auth.isLogin,orderController.rejectReturn)
admin.get("/acceptCancel",auth.isLogin,orderController.acceptCancel)
admin.get("/rejectCancel",auth.isLogin,orderController.rejectCancel)
//coupons amangement
admin.get('/addCoupon',auth.isLogin,couponController.addCouponLoad)
admin.post("/addCoupon",auth.isLogin,couponController.addCoupon)
admin.get("/couponManagement",auth.isLogin,couponController.couponManagement)
admin.get("/activateCoupon",auth.isLogin,couponController.activateCoupon)
admin.get("/deactivateCoupon",auth.isLogin,couponController.deactivateCoupon)
admin.get('/deleteCoupon',auth.isLogin,couponController.deleteCoupon)
admin.get('/editCoupon',auth.isLogin,couponController.getCouponForEdit)
admin.post('/updateCoupon',auth.isLogin,couponController.updateCoupon)
//salesReport
admin.get('/salesReport',auth.isLogin,adminController.salesReport)
admin.get('/getSalesReport',auth.isLogin,adminController.getSalesReport)
admin.get("/sales/fetch-orders",auth.isLogin,adminController.fetchSales)
admin.get("/dashboard/graph",auth.isLogin,dashboardController.graphData)
//referral
admin.get("/referralOffer",auth.isLogin,adminController.referralLoad)
admin.post("/referralOffer",auth.isLogin,adminController.referralPost)
module.exports = admin