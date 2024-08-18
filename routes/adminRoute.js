const express = require('express')
const admin = express()
const path =require('path')
const bodyParser = require('body-parser')
const nocache = require('nocache')
const adminController = require("../controllers/admin/adminController")



admin.set('view engine','ejs')
admin.set('views',path.join(__dirname, '..', 'views/admin'));


admin.use(express.static(path.join(__dirname,"..","public")))
admin.use(bodyParser.json());
admin.use(bodyParser.urlencoded({
    extended:true
}))
admin.use(nocache());


admin.get("/pageNotFound",adminController.pageNotFound)
admin.get('/productManagement',adminController.productManagement);

module.exports = admin