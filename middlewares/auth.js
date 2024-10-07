const userModel = require('../models/userModel')

const isLogin = async(req,res,next)=>{
    try {
        if(req.session.user){
            const user = await userModel.findOne({_id:req.session.user})
            if(!user.isActive){
                req.session.destroy()
                return res.redirect('/')
            }
        }
        else{
            return res.redirect('/')
        }
        next()
        
        
    } catch (error) {
        console.log(error.message)
    }
}

const isLogout = async(req,res,next)=>{
    try {
        if(req.session.user){
            return res.redirect('/');
        }
        next();
        
    } catch (error) {
        console.log(error.message)
    }
}

module.exports = {
    isLogin,
    isLogout
}