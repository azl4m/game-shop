const express = require('express')
const user = express.Router()
const userController = require("../controllers/user/userController")


user.get("/pageNotFound",userController.pageNotFound)
user.get('/',userController.loadHomePage);


module.exports = user