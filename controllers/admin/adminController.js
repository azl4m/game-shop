const path = require("path");
const productModel = require("../../models/productModel");
const userModel = require("../../models/userModel");
const categoryModel = require("../../models/categoryModel");
const multer = require("multer");
const sharp = require("sharp");
const fs = require("fs");

//for handling photo upload

// Set storage engine
const storage = multer.diskStorage({
  destination: "../../public/uploads/", // Set the upload destination
  filename: function (req, file, cb) {
    const name = req.body.productName
    cb(
      null,
      name + "-" + Date.now()
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

processImages = async (files,name) => {
  const processedFiles = [];
  let i = 0;
  for (const file of files) {
    const newPath = `public/uploads/cropped-${name}-${i}${path.extname(file.originalname)}`;
    i++;
    await sharp(file.path)
      .resize(300, 300) // Customize as needed
      .toFile(newPath);
    processedFiles.push(newPath);
    // fs.unlinkSync(file.path); // Delete the original image
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
    const category = await categoryModel.find({isListed:true})
    res.render("addProduct",{category:category});
  } catch (error) {
    console.log("error in loading product management page :" + error.message);
    res.redirect("/pageNotFound");
  }
};

// ADD PRODUCT TO DB

const addProduct = async (req, res) => {
  upload(req, res, async function (err) {
    if (err) {
      console.log("error :"+err);

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

      
      const images = await processImages(req.files,req.body.productName);

      const newProduct = new productModel({
        productName: productName,
        description: description,
        price: price,
        images: images,
        variant: [{ version, platforms, stock }],
        // createdBy:admin.username
      });
      const save = await newProduct.save();
      if (save) {
       return res.redirect("/admin");
      }
      res
      .status(400)
      .json({ message: "Product creation failed" });
    } catch (error) {
      console.log("error at add product :"+error);

      res.status(500).json({ message: error.message });
    }
  });
};
// product management page load
const productManagementLoad = async (req, res) => {
  try {
    let search = "";
    if (req.query.search) {
      search = req.query.search;
    }
    let page = 1;
    if (req.query.page) {
      page = parseInt(req.query.page, 10); 
    }
    const limit = 10;
    
    // Query to fetch products with pagination and search
    const productData = await productModel
      .find({
        isDeleted: false,
        productName: { $regex: ".*" + search + ".*", $options: "i" } // Case-insensitive search
      })
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    // Query to count the total number of matching products
    const count = await productModel
      .find({
        isDeleted: false, 
        productName: { $regex: ".*" + search + ".*", $options: "i" } // Case-insensitive search
      })
      .countDocuments();
    
    // Render the product management page
    res.render("productManagement", {
      data: productData,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      searchQuery: search, 
    });
  } catch (error) {
    console.log("Error loading product management page: " + error);
    res.status(500).send("Error loading the page."); // Optional: Send an error response
  }
};
//edit product page load
const editProductLoad = async(req,res)=>{
  try {
    const productId = req.query.id;
    const product = await productModel.findById({_id:productId})
    const category = await categoryModel.find({isDeleted:false,isListed:true})
    res.render('editProduct',{
      product:product,
      category:category
    })
  } catch (error) {
    console.log("error loadin edit product :"+error);
    res.status(500).json({error:"server error"})
  }
}

//edit product

const editProduct = async (req, res) => {
  upload(req, res, async function (err) {
    if (err) {
      console.log("error");

      return res.status(400).send({ message: err.message });
    }

    try {
      
      const { productName, description, price, version, stock } = req.body;
      
      const product = await productModel.findOne({productName:productName})
      
      const platforms = req.body.platforms? [
        req.body.platforms[0],
        req.body.platforms[1],
        req.body.platforms[2],
        req.body.platforms[3],
      ]:product.variant[platform]

      // const admin = await userModel.findById({_id:req.session.user})

      const images = req.files?await processImages(req.files):product.images

      const newProduct = product.updateOne({
        $set:{
          productName: productName,
        description: description,
        price: price,
        images: images,
        variant: [{ version, platforms, stock }]
        },
        // createdBy:admin.username
      });
      
      if (newProduct) {
        return res.redirect("/admin");
      }
      res
      .status(500)
      .json({ message: "Product editing failed", product: newProduct });
    } catch (error) {
      console.log("error");

      res.status(500).json({ message: error.message });
    }
  });
};
//unlist and restore product
const unlistProduct = async(req,res)=>{
  try {
    const product = await productModel.findById({_id:req.query.id})
    const deleteProduct = await product.updateOne({$set:{isListed:false}})
    if(deleteProduct){
     return res.redirect("/admin/productManagement")
    }
    return res.status(500).json({error:"Server error"})
  } catch (error) {
    console.log("error deleting product :"+error);
    return res.status(500).json({error:"Server error"})
    
  }
}
const restoreProduct = async(req,res)=>{
  try {
    const product = await productModel.findById({_id:req.query.id})
    const deleteProduct = await product.updateOne({$set:{isListed:true}})
    if(deleteProduct){
      return res.redirect("/admin/productManagement")
    }
    return res.status(500).json({error:"Server error"})
  } catch (error) {
    console.log("error deleting product :"+error);
    return res.status(500).json({error:"Server error"})
    
  }
}
//deleteProduct
const deleteProduct = async(req,res)=>{
  try {
    const id = req.query.id
    const product = await productModel.findById({_id:id})
    const deleteProduct = await product.updateOne({$set:{isDeleted:true}})
    if(deleteProduct){
      return res.redirect("/admin/productManagement")
    }else{
      res.status(400).json({error:"Error deleting product"})
    }
  } catch (error) {
    console.log("error deleting product :"+error);
    res.status(500).json({error:"Internal server error"})
    
  }
}


// Load customer details page
const userManagementLoad = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page, 10) || 1; // Ensure 'page' is an integer
    const limit = 5;

    // Fetch user data with pagination and search
    const userData = await userModel
      .find({
        role: "user",
        $or: [
          { name: { $regex: ".*" + search + ".*", $options: "i" } }, // Case-insensitive search
          { email: { $regex: ".*" + search + ".*", $options: "i" } }, // Case-insensitive search
        ],
      })
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    // Count total documents that match the search criteria
    const count = await userModel
      .find({
        role: "user",
        $or: [
          { name: { $regex: ".*" + search + ".*", $options: "i" } }, // Case-insensitive search
          { email: { $regex: ".*" + search + ".*", $options: "i" } }, // Case-insensitive search
        ],
      })
      .countDocuments();

    // Render the user management page
    res.render("userManagement", {
      data: userData,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      searchQuery: search, // Pass the search query to retain it in the search box
    });
  } catch (error) {
    console.log("Error loading user management page: " + error);
    res.status(500).send("Error loading the page."); // Optional: Send an error response
  }
};


//for blocking user

const blockUser = async (req, res) => {
  try {
    const id = req.query.id;
    const user = await userModel.findById({ _id: id });
    const block = await user.updateOne({ $set: { isActive: false } });
    return res.redirect("/admin/userManagement");
  } catch (error) {
    console.log("error blocking user :" + error);
    return res.redirect("/admin");
  }
};

//for unblocking user
const unblockUser = async (req, res) => {
  try {
    const id = req.query.id;
    const user = await userModel.findById({ _id: id });
    const block = await user.updateOne({ $set: { isActive: true } });
    return res.redirect("/admin/userManagement");
  } catch (error) {
    console.log("error blocking user :" + error);
    return res.redirect("/admin");
  }
};

// Category management page loading
const categoryManagementLoad = async (req, res) => {
  try {
    const search = req.query.search || ""; // Get search query
    const page = parseInt(req.query.page) || 1; // Default page is 1
    const limit = 10; // Limit per page
    const skip = (page - 1) * limit;

    // Fetch categories with pagination, search, and sorting
    const categoryData = await categoryModel
      .find({
        isDeleted: false,
        categoryName: { $regex: ".*" + search + ".*", $options: "i" },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    

    const totalCategories = await categoryModel.countDocuments({
      isDeleted: false,
      categoryName: { $regex: ".*" + search + ".*", $options: "i" },
    });

    const totalPages = Math.ceil(totalCategories / limit);

    // Render the category management page
    res.render("categoryManagement", {
      data: categoryData,
      totalPages: totalPages,
      currentPage: page,
      totalCategories: totalCategories,
      searchQuery: search, // Pass search query to view
    });
  } catch (error) {
    console.log("Error loading category management page: " + error);
    return res.redirect("/admin");
  }
};

//add category form
const addCategoryLoad = async (req, res) => {
  try {
    res.render("addCategory");
  } catch (error) {
    console.log("error loading add category page :" + error);
  }
};
//add new category
const addCategory = async (req, res) => {
  try {
    const categoryName = req.body.categoryName;
    const existingCategory = await categoryModel.findOne({
      categoryName: categoryName,
    });
    if (existingCategory) {
      return res.status(400).json({ error: "Category already exists" });
    } else {
      const newCategory = new categoryModel({
        categoryName: categoryName,
      });
      const catSave = await newCategory.save();
      if (catSave) {
        res.redirect("/admin/categoryManagement");
      } else {
        console.log("error adding category");
        res.render("addCategory");
      }
    }
  } catch (error) {
    console.log("error adding new category :" + error);
  }
};

//edit category page load
const editCategoryLoad = async (req, res) => {
  try {
    const categoryId = req.query.id;
    const category = await categoryModel.findById({ _id: categoryId});
    if (category) {
      return res.render("editCategory", { category: category });
    }
  } catch (error) {
    console.log("error loading edit category page :" + error);
  }
};
//edit category
const editCategory = async (req, res) => {
  try {
    const categoryId = req.query.id;
    const categoryName = req.body.categoryName;
    const category = await categoryModel.findById({ _id: categoryId });
    const updateCategory = await category.updateOne({
      $set: { categoryName: categoryName },
    });
    if (updateCategory) {
      res.redirect("/admin/categoryManagement");
    } else {
      res.status(400).json({ error: "error editing category" });
    }
  } catch (error) {
    console.log("error editing category");
  }
};
//list and unlist category
const unlistCategory = async(req,res)=>{
  try {
    const category = await categoryModel.findById({_id:req.query.id})
    const unlist = await category.updateOne({$set:{isListed:false}})
    if(unlist){
      return res.redirect("/admin/categoryManagement")
    }return res.status(500).json({error:"internal server error"})
  } catch (error) {
    console.log("error unlisting category :"+error);
    res.status(500).json({error:"internal server error"})
  }
}
const listCategory = async(req,res)=>{
  try {
    const category = await categoryModel.findById({_id:req.query.id})
    const list = await category.updateOne({$set:{isListed:true}})
    if(list){
      return res.redirect("/admin/categoryManagement")
    }return res.status(500).json({error:"internal server error"})
  } catch (error) {
    console.log("error listing category :"+error);
    return res.status(500).json({error:"internal server error"})
  }
}
//delete category
const deleteCategory = async(req,res)=>{
  try {
    const id = req.query.id
    const category = await categoryModel.findById({_id:id});
    const deleteCat = await category.updateOne({$set:{isDeleted:true,isListed:false}})
    if(deleteCat){
      return res.redirect("/admin/categoryManagement")
    }
  } catch (error) {
    console.log("error deleting category :"+error);
    res.status(500).json({error:"Internal server error"})
    
  }
}
module.exports = {
  pageNotFound,
  addProduct,
  addProductLoad,
  dashboardLoad,
  userManagementLoad,
  blockUser,
  unblockUser,
  categoryManagementLoad,
  addCategoryLoad,
  addCategory,
  editCategoryLoad,
  editCategory,
  productManagementLoad,
  editProductLoad,
  editProduct,
  unlistCategory,
  listCategory,
  deleteProduct,
  restoreProduct,
  deleteCategory,
  unlistProduct
};
