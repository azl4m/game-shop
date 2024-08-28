const path = require("path");
const productModel = require(path.join(
  __dirname,
  "..",
  "..",
  "models",
  "productModel"
));
const userModel = require("../../models/userModel");
const multer = require("multer");
const sharp = require("sharp");
const fs = require("fs");

//for handling photo upload

// Set storage engine
const storage = multer.diskStorage({
  destination: "./uploads/", // Set the upload destination
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

// Init upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 1000000 }, // Set file size limit (1MB in this case)
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
}).array("productImage", 5);

// Check file type
function checkFileType(file, cb) {
  const filetypes = /jpeg|jpg|png|gif/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb("Error: Images Only!");
  }
}

//for sharp
const processImages = async (files) => {
  const processedFiles = [];
  for (const file of files) {
    const newPath = `uploads/cropped-${Date.now()}-${file.originalname}`;
    await sharp(file.path)
      .resize(300, 300) // Customize as needed
      .toFile(newPath);
    processedFiles.push(newPath);
    fs.unlinkSync(file.path); // Delete the original image
  }
  return processedFiles;
};

const pageNotFound = async (req, res) => {
  try {
    res.render("page-404");
  } catch (error) {
    console.log("error in page not found :" + error.message);
    res.redirect("/pageNotFound");
  }
};
//for loading dashboard

const dashboardLoad = async (req, res) => {
  try {
    res.render("dashboard");
  } catch (error) {}
};

//LOADING PRODUCT MANAGEMENT PAGE

const addProductLoad = async (req, res) => {
  try {
    res.render("addProduct");
  } catch (error) {
    console.log("error in loading product management page :" + error.message);
    res.redirect("/pageNotFound");
  }
};

// ADD PRODUCT TO DB

const addProduct = async (req, res) => {
  console.log("inside add product API");

  upload(req, res, async function (err) {
    if (err) {
      console.log("error");

      return res.status(400).send({ message: err.message });
    }
    
    try {
      const { productName, description, price, version, stock } = req.body;

      const platforms = [
        req.body.platforms[0],
        req.body.platforms[1],
        req.body.platforms[2],
        req.body.platforms[3],
      ];

      // const admin = await userModel.findById({_id:req.session.user})

      const images = await processImages(req.files);

      const newProduct = new productModel({
        productName: productName,
        description: description,
        price: price,
        images: images,
        variant: [{ version, platforms, stock }],
        // createdBy:admin.username
      });
      await newProduct.save();
      res
        .status(201)
        .json({ message: "Product created successfully", product: newProduct });
    } catch (error) {
      console.log("error");

      res.status(500).json({ message: error.message });
    }
  });
};


//load customer details page
const userManagementLoad = async(req,res)=>{
  try {
    let search = "";
    if(req.query.search){
      search = req.query.search
    }
    let page = 1;
    if(req.query.page){
      page = req.query.page
    }
    const limit = 3;
    const userData = await userModel.find({
      role : "user",
      $or:[
        {name:{$regex:".*"+search+".*"}},
        {email:{$regex:".*"+search+".*"}}
      ]
    })
    .limit(limit*1)
    .skip((page-1)*limit)
    .exec();

    const count = await userModel.find({
      role : "user",
      $or:[
        {name:{$regex:".*"+search+".*"}},
        {email:{$regex:".*"+search+".*"}}
      ]
    }).countDocuments();    
    res.render('userManagement',{
      data:userData,
      totalPages:Math.ceil(count/limit),
      currentPage:page
    })
  } catch (error) {
    console.log("error loading user management page :"+error);
    
  }
}

//for blocking user

const blockUser = async(req,res)=>{
  try {
    const id = req.query.id;
    const user = await userModel.findById({_id:id})
    const block = await user.updateOne({$set:{isActive:false}})
    return res.redirect("/admin/userManagement")
  } catch (error) {
    console.log("error blocking user :"+error);
    return res.redirect("/admin")
    
  }
}

//for unblocking user
const unblockUser = async(req,res)=>{
  try {
    const id = req.query.id;
    const user = await userModel.findById({_id:id})
    const block = await user.updateOne({$set:{isActive:true}})
    return res.redirect("/admin/userManagement")
  } catch (error) {
    console.log("error blocking user :"+error);
    return res.redirect("/admin")
    
  }
}


module.exports = {
  pageNotFound,
  addProduct,
  addProductLoad,
  dashboardLoad,
  userManagementLoad,
  blockUser,
  unblockUser
};
