const express = require('express')
const user = express()
const userController = require("../controllers/user/userController")
const path =require('path')
const bodyParser = require('body-parser')
const nocache = require('nocache')


user.set('view engine','ejs')
user.set('views',path.join(__dirname, '..', 'views/user'));
user.use(express.static(path.join(__dirname,"..","public")))
user.use(bodyParser.json());
user.use(bodyParser.urlencoded({
    extended:true
}))
user.use(nocache());


//for signup
user.get("/signup",userController.signupLoad)
user.post("/signup",userController.registerUser)
//for login
user.get("/login",userController.loginLoad)
user.post("/login",userController.loginUser)
//for page not found
user.get("/pageNotFound",userController.pageNotFound)
user.get('/',userController.loadHomePage);

module.exports = user