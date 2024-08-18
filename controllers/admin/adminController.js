const pageNotFound = async(req,res)=>{
    try {
        res.render("page-404")
    } catch (error) {
        console.log("error in page not found :"+error.message);
        res.redirect("/pageNotFound")
        
    }
}

const productManagement = async(req,res)=>{
    try {
        res.render("productManagement")
    } catch (error) {
        console.log("error in loading product management page :"+error.message);
        res.redirect("/pageNotFound")
    }
}

module.exports = {
    pageNotFound,
    productManagement

}