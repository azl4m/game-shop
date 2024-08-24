
const express=require('express')
const admin = express.Router()
const adminController=require("../controllers/admin/adminController")


admin.get("/pageNotFound",adminController.pageNotFound)
admin.get("/",adminController.dashboardLoad)
admin.get('/addProduct',adminController.addProductLoad);
admin.post('/addProduct',adminController.addProduct);

module.exports = admin