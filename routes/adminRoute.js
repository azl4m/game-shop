
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
module.exports = admin