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
    pageNotFound
}