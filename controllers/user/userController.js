const path  = require('path')
const userModel = require(path.join(__dirname,"..","..","models","userModel"))

//Loading signup page

const signupLoad = async(req,res)=>{
    try {
        res.render("signup")
    } catch (error) {
        console.log("error loading login page :"+error);
        res.redirect("/pageNotFound")
        
    }
}

//register new user
const registerUser = async(req,res)=>{
    try {
        const user = new userModel({
            username:req.body.username,
            email:req.body.email,
            password:req.body.password
        })
        const userData = await user.save()
        if(userData){
            res.redirect("/login")
        }else{
            console.log("signup failed");
            res.render("signup",{message:"signup failed"})
        }
    } catch (error) {
        console.log("error registering new user :"+error);
        res.render("signup",{message:"signup failed"})
    }
}

//load login page
const loginLoad = async(req,res)=>{
    try {
        res.render("login")
    } catch (error) {
        console.log("error loading login page :"+error);
        
    }
}

const pageNotFound = async(req,res)=>{
    try {
        res.render("page-404")
    } catch (error) {
        console.log("error in page not found :"+error.message);
        res.redirect("/pageNotFound")
        
    }
}

const loadHomePage = async(req,res)=>{
    try {
        return res.render("home")
    } catch (error) {
        console.log("homepage loading error :"+error.message);
        res.status(500).send("Server Error")
    }
}


module.exports ={
    loadHomePage,
    pageNotFound,
    signupLoad,
    registerUser,
    loginLoad
}