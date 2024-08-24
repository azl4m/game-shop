const path  = require('path')
const productModel = require(path.join(__dirname,"..","..","models","productModel"))



const pageNotFound = async(req,res)=>{
    try {
        res.render("page-404")
    } catch (error) {
        console.log("error in page not found :"+error.message);
        res.redirect("/pageNotFound")
        
    }
}
//for loading dashboard

const dashboardLoad = async(req,res)=>{
    try {
        res.render("dashboard")
        
    } catch (error) {
        
    }
}


//LOADING PRODUCT MANAGEMENT PAGE

const addProductLoad = async(req,res)=>{
    try {
        res.render("addProduct")
    } catch (error) {
        console.log("error in loading product management page :"+error.message);
        res.redirect("/pageNotFound")
    }
}

// ADD PRODUCT TO DB

const addProduct = async(req,res)=>{
    console.log("inside add product api");
    try {
    const product = new productModel({
        productName : req.body.title,
        description : req.body.description,
        variant : [req.body.platforms,req.body.version],
    })
    const productData  = await product.save();
    if(productData){
        res.send(productData)
    } else{
        res.send("failed adding product")
    }

   } catch (error) {
    console.log("error adding product :"+error.message);
    
   }
}

module.exports = {
    pageNotFound,
    addProduct,
    addProductLoad,
    dashboardLoad

}