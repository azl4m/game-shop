const path = require("path");
const productModel = require("../../models/productModel");
const userModel = require("../../models/userModel");
const categoryModel = require("../../models/categoryModel");
const orderModel = require("../../models/orderModel");
const multer = require("multer");
const sharp = require("sharp");
const fs = require("fs");

//for handling photo upload

// Set storage engine
const storage = multer.diskStorage({
  destination: "../../public/uploads/", // Set the upload destination
  filename: function (req, file, cb) {
    const name = req.body.productName;
    cb(null, name + "-" + Date.now());
  },
});

//for getting filename
const fileNames = (images)=>{
  let filenames = []
  images.forEach(image=>{
    filenames.push(path.basename(image))
  })
  return filenames;
}
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

const processImages = async (files, name) => {
  const processedFiles = [];
  let i = 0;
  for (const file of files) {
    const newPath = `public/uploads/cropped-${name}-${i}${path.extname(
      file.originalname
    )}`;
    try {
      await sharp(file.path)        .resize(300, 300) // Customize as needed
        .toFile(newPath);
      processedFiles.push(
        `uploads/cropped-${name}-${i}${path.extname(file.originalname)}`
      );
      fs.unlinkSync(file.path);
    } catch (error) {
      console.error("Error processing image:", error);
    }
    i++;
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
    const category = await categoryModel.find({ isListed: true });
    res.render("addProduct", { category: category });
  } catch (error) {
    console.log("error in loading product management page :" + error.message);
    res.redirect("/pageNotFound");
  }
};

// ADD PRODUCT TO DB

const addProduct = async (req, res) => {
  upload(req, res, async function (err) {
    if (err) {
      console.log("error :" + err);

      return res.status(400).send({ message: err.message });
    }

    try {
      const { productName, description, price, version, stock,platforms } = req.body;


      // const admin = await userModel.findById({_id:req.session.user}
      console.log("Files received:", req.files);
      const images = await processImages(req.files, req.body.productName);
      const categoryId = await categoryModel.findOne({
        categoryName: req.body.category,
      });
      const newProduct = new productModel({
        productName: productName,
        description: description,
        price: price,
        images: images,
        category: categoryId._id,
        variant: [{ version, platforms, stock }],
        // createdBy:admin.username
      });
      const save = await newProduct.save();
      if (save) {
        return res.redirect("/admin");
      }
      res.status(400).json({ message: "Product creation failed" });
    } catch (error) {
      console.log("error at add product :" + error);

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
    const limit = 3;

    // Query to fetch products with pagination and search
    const productData = await productModel
      .find({
        isDeleted: false,
        productName: { $regex: ".*" + search + ".*", $options: "i" }, // Case-insensitive search
      })
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    // Query to count the total number of matching products
    const count = await productModel
      .find({
        isDeleted: false,
        productName: { $regex: ".*" + search + ".*", $options: "i" }, // Case-insensitive search
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
const editProductLoad = async (req, res) => {
  try {
    const productId = req.query.id;
    const product = await productModel.findById({ _id: productId });
    const category = await categoryModel.find({});
    const images = fileNames(product.images)
    res.render("editProduct", {
      product: product,
      category: category,
      images
    });
  } catch (error) {
    console.log("error loadin edit product :" + error);
    res.status(500).json({ error: "server error" });
  }
};

//edit product

const editProduct = async (req, res) => {
  upload(req, res, async function (err) {
    if (err) {
      console.log("error: " + err);
      return res.status(400).send({ message: err.message });
    }

    try {
      const productId = req.body.productId;
      console.log(productId);

      const product = await productModel.findById(productId);

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Destructure form data from the request body
      const { productName, description, price, version, stock } = req.body;
      const platforms = req.body.platforms || []; // Multiple selected platforms

      // Process any new images uploaded
      let newImages = [];
      if (req.files && req.files.length > 0) {
        newImages = await processImages(req.files, req.body.productName);
      }

      // Append new images to the existing ones
      const updatedImages = [...product.images, ...newImages];

      // Find the category by name to get its ID
      const category = await categoryModel.findOne({
        categoryName: req.body.category,
      });
      if (!category) {
        return res.status(400).json({ message: "Category not found" });
      }

      // Update the product with new data
      product.productName = productName;
      product.description = description;
      product.price = price;
      product.variant = [{ version, stock, platforms }]; // Assuming only one variant
      product.images = updatedImages;
      product.category = category._id; // Assign the category ID

      // Save the updated product to the database
      await product.save();

      res.redirect("/productManagement");
    } catch (error) {
      console.log("Error at updating product: " + error);
      res.status(500).json({ message: error.message });
    }
  });
};
//deleteImage
const deleteSingleImage = async (req, res) => {
  try {
    const { imageid, productid } = req.query;
    const product = await productModel.findOne({_id:productid})
    if(product.images.length<=3){
      return res.json({status:false,message:"A product should have minimum of 3 images"})
    }
    const imagePath = path.join(__dirname, '../public/uploads/', imageid);
    fs.unlink(imagePath, (err) => {
      if (err) {
        return res.status(500).json({ status: false, message: 'Failed to delete image' });
      }
    });
    product.images = product.images.filter(image => image !== imageNameToServer);
  
    // Save the updated product
    await product.save();
  
    // Send a success response to the client
    return res.redirect("/editProduct?id="+productid)
  } catch (error) {
    console.log("error deleting image :"+error);
    res.status(400).json({message:"Internal Server Error"})
    
  }
};

//unlist and restore product
const unlistProduct = async (req, res) => {
  try {
    const product = await productModel.findById({ _id: req.query.id });
    const deleteProduct = await product.updateOne({
      $set: { isListed: false },
    });
    if (deleteProduct) {
      return res.redirect("/admin/productManagement");
    }
    return res.status(500).json({ error: "Server error" });
  } catch (error) {
    console.log("error deleting product :" + error);
    return res.status(500).json({ error: "Server error" });
  }
};
const restoreProduct = async (req, res) => {
  try {
    const product = await productModel.findById({ _id: req.query.id });
    const deleteProduct = await product.updateOne({ $set: { isListed: true } });
    if (deleteProduct) {
      return res.redirect("/admin/productManagement");
    }
    return res.status(500).json({ error: "Server error" });
  } catch (error) {
    console.log("error deleting product :" + error);
    return res.status(500).json({ error: "Server error" });
  }
};
//deleteProduct
const deleteProduct = async (req, res) => {
  try {
    const id = req.query.id;
    const product = await productModel.findById({ _id: id });
    const deleteProduct = await product.updateOne({
      $set: { isDeleted: true },
    });
    if (deleteProduct) {
      return res.redirect("/admin/productManagement");
    } else {
      res.status(400).json({ error: "Error deleting product" });
    }
  } catch (error) {
    console.log("error deleting product :" + error);
    res.status(500).json({ error: "Internal server error" });
  }
};

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
    const category = await categoryModel.findById({ _id: categoryId });
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
    const existingCat = await categoryModel.findOne({
      categoryName: categoryName,
    });
    if (existingCat) {
      return res.status(400).json({
        error: "Category name already exists please choose another one",
      });
    }
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
const unlistCategory = async (req, res) => {
  try {
    const category = await categoryModel.findById({ _id: req.query.id });
    const unlist = await category.updateOne({ $set: { isListed: false } });
    if (unlist) {
      return res.redirect("/admin/categoryManagement");
    }
    return res.status(500).json({ error: "internal server error" });
  } catch (error) {
    console.log("error unlisting category :" + error);
    res.status(500).json({ error: "internal server error" });
  }
};
const listCategory = async (req, res) => {
  try {
    const category = await categoryModel.findById({ _id: req.query.id });
    const list = await category.updateOne({ $set: { isListed: true } });
    if (list) {
      return res.redirect("/admin/categoryManagement");
    }
    return res.status(500).json({ error: "internal server error" });
  } catch (error) {
    console.log("error listing category :" + error);
    return res.status(500).json({ error: "internal server error" });
  }
};
//delete category
const deleteCategory = async (req, res) => {
  try {
    const id = req.query.id;
    const category = await categoryModel.findById({ _id: id });
    const deleteCat = await category.updateOne({
      $set: { isDeleted: true, isListed: false },
    });
    if (deleteCat) {
      return res.redirect("/admin/categoryManagement");
    }
  } catch (error) {
    console.log("error deleting category :" + error);
    res.status(500).json({ error: "Internal server error" });
  }
};
//order management
const orderManagementLoad = async (req, res) => {
  try {
    const search = req.query.search || ""; // Get search query
    const page = parseInt(req.query.page) || 1; // Default page is 1
    const limit = 10; // Limit per page
    const skip = (page - 1) * limit;

    const orders = await orderModel
      .find({})
      .populate({ path: "user", select: "username email" })
      .sort({ orderDate: -1 })
      .skip(skip)
      .limit(limit);
    const totalOrders = await orderModel.countDocuments({});
    const totalPages = Math.ceil(totalOrders / limit);
    res.render("orderManagement", {
      data: orders,
      totalPages: totalPages,
      currentPage: page,
      totalOrders: totalOrders,
      searchQuery: search,
    });
  } catch (error) {
    console.log("error loading order management :" + error);
    return res.status(500).json({ message: "internal server error" });
  }
};
const orderDetails = async(req,res)=>{
  const search = req.query.search || ""; // Get search query
  const orderid = req.query.id
  const order = await orderModel.findOne({_id:orderid})
  .populate({
    path:"cartItems.product",
    select:"productName"
  })
  
  res.render('orderDetailsAdmin',{data:order,searchQuery:search})
}

const orderStatus = async (req,res) => {
  try {
    const orderid = req.query.id
    const orderStatus = req.query.status
    await orderModel.updateOne({_id:orderid},{$set:{orderStatus:orderStatus}})
    return res.redirect("/admin/orderManagement")
  } catch (error) {
    console.log("error changing delivery status :"+error);
    
  }
}

const acceptReturn = async (req, res) => {
  try {
    const orderId = req.query.orderid; // ID of the order
    const cartItemIndex = parseInt(req.query.cartItem); // Index of the cart item in the array

    // Update the specific cart item using the index in the cartItems array
    const update = await orderModel.updateOne(
      { _id: orderId },
      { $set: { [`cartItems.${cartItemIndex}.returnAccepted`]: "ACCEPTED" } } // Dynamically setting the field using the index
    );

    if (update.matchedCount === 0) {
      res.status(404).json({ message: "Order not found." });
    } else if (update.modifiedCount === 0) {
      // This case is when the order was found, but no change was made (e.g., status was already "ACCEPTED")
      res.status(200).json({ message: "No changes made, status was already 'ACCEPTED'." });
    } else {
      res.status(200).json({ message: "Return accepted for the cart item." });
    }
  } catch (error) {
    console.log("Error at accept return: " + error);
    res.status(500).json({ message: "An error occurred while processing the return." });
  }
};

const rejectReturn = async(req,res)=>{
  try {
    const orderId = req.query.orderid; // ID of the order
    const cartItemIndex = parseInt(req.query.cartItem); // Index of the cart item in the array

    // Update the specific cart item using the index in the cartItems array
    const update = await orderModel.updateOne(
      { _id: orderId },
      { $set: { [`cartItems.${cartItemIndex}.returnAccepted`]: "REJECTED" } } // Dynamically setting the field using the index
    );

    if (update.matchedCount === 0) {
      res.status(404).json({ message: "Order not found." });
    } else if (update.modifiedCount === 0) {
      // This case is when the order was found, but no change was made (e.g., status was already "ACCEPTED")
      res.status(200).json({ message: "No changes made, status was already 'REJECTED'." });
    } else {
      res.status(200).json({ message: "Return rejected for the cart item." });
    }
  } catch (error) {
    console.log("Error at accept return: " + error);
    res.status(500).json({ message: "An error occurred while processing the return." });
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
  unlistProduct,
  orderManagementLoad,
  orderStatus,
  deleteSingleImage,
  orderDetails,
  rejectReturn,
  acceptReturn
};
