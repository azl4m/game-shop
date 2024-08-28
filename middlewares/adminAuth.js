


const isLogin = async(req,res,next)=>{
    try {
        if(req.session.admin){
            

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
        if(req.session.admin){
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