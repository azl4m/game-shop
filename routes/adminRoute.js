
const express=require('express')
const admin = express.Router()
const adminController=require("../controllers/admin/adminController")
const auth = require('../middlewares/adminAuth')

admin.get("/pageNotFound",adminController.pageNotFound)
// load dashboard
admin.get("/",auth.isLogin,adminController.dashboardLoad)
//add products
admin.get('/addProduct',auth.isLogin,adminController.addProductLoad);
admin.post('/addProduct',auth.isLogin,adminController.addProduct);
admin.get('/productManagement',auth.isLogin,adminController.productManagementLoad)
admin.get('/editProduct',auth.isLogin,adminController.editProductLoad)
admin.post('/editProduct',auth.isLogin,adminController.editProduct)
admin.get('/unlistProduct',auth.isLogin,adminController.unlistProduct)
admin.get('/restoreProduct',auth.isLogin,adminController.restoreProduct)
admin.get('/deleteProduct',auth.isLogin,adminController.deleteProduct)
admin.get('/deleteImage',auth.isLogin,adminController.deleteSingleImage)
//user management
admin.get('/userManagement',auth.isLogin,adminController.userManagementLoad)
admin.get('/blockUser',auth.isLogin,adminController.blockUser)
admin.get('/unblockUser',auth.isLogin,adminController.unblockUser)
//category management
admin.get('/categoryManagement',auth.isLogin,adminController.categoryManagementLoad)
admin.get('/addCategory',auth.isLogin,adminController.addCategoryLoad)
admin.post('/addCategory',auth.isLogin,adminController.addCategory)
admin.get('/editCategory',auth.isLogin,adminController.editCategoryLoad)
admin.post('/editCategory',auth.isLogin,adminController.editCategory)
admin.get('/unlistCategory',auth.isLogin,adminController.unlistCategory)
admin.get('/listCategory',auth.isLogin,adminController.listCategory)
admin.get('/deleteCategory',auth.isLogin,adminController.deleteCategory)

//order management
admin.get('/orderManagement',auth.isLogin,adminController.orderManagementLoad)
admin.get('/orderStatus',auth.isLogin,adminController.orderStatus)
admin.get('/orderDetails',auth.isLogin,adminController.orderDetails)
admin.get('/acceptReturn',auth.isLogin,adminController.acceptReturn)
admin.get('/rejectReturn',auth.isLogin,adminController.rejectReturn)
admin.get("/acceptCancel",auth.isLogin,adminController.acceptCancel)
//coupons amangement
admin.get('/addCoupon',auth.isLogin,adminController.addCouponLoad)
admin.post("/addCoupon",auth.isLogin,adminController.addCoupon)
admin.get("/couponManagement",auth.isLogin,adminController.couponManagement)
admin.get("/activateCoupon",auth.isLogin,adminController.activateCoupon)
admin.get("/deactivateCoupon",auth.isLogin,adminController.deactivateCoupon)
admin.get('/deleteCoupon',auth.isLogin,adminController.deleteCoupon)
admin.get('/editCoupon',auth.isLogin,adminController.getCouponForEdit)
admin.post('/updateCoupon',auth.isLogin,adminController.updateCoupon)
//salesReport
admin.get('/salesReport',auth.isLogin,adminController.salesReport)
admin.get('/getSalesReport',auth.isLogin,adminController.getSalesReport)
module.exports = admin