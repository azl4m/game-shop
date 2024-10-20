const path = require("path");
const productModel = require("../../models/productModel");
const userModel = require("../../models/userModel");
const categoryModel = require("../../models/categoryModel");
const orderModel = require("../../models/orderModel");
const couponModel = require("../../models/couponModel");
const multer = require("multer");
const sharp = require("sharp");
const fs = require("fs");
const paymentStatusTime = require("../../helpers/paymentTimeStamp");
const walletTransactions = require("../../helpers/walletTransactions");
const fileUploadHelper = require("../../helpers/fileUpload");

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
  fileUploadHelper.upload(req, res, async function (err) {
    if (err) {
      console.log("error :" + err);
      return res.status(400).send({ message: err.message });
    }
    try {
      const { productName, description, price, variant } = req.body;
      const parsedVariants = JSON.parse(variant); // Make sure it's parsed correctly
      const images = await fileUploadHelper.processImages(req.files, req.body.productName);
      const categoryId = await categoryModel.findOne({
        categoryName: req.body.category,
      });
      const newProduct = new productModel({
        productName: productName,
        description: description,
        price: price,
        images: images,
        category: categoryId._id,
        variant: parsedVariants,
        // createdBy:admin.username
      });
      const save = await newProduct.save();
      if (save) {
        return res.status(200).json({
          message: "Product added successfully",
          redirectUrl: "/admin",
        });
        // return res.redirect("/admin");
      }
      return res.status(400).json({ message: "Product creation failed" });
    } catch (error) {
      console.log("error at add product :" + error);

      return res.status(500).json({ message: error.message });
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
    const images = fileUploadHelper.fileNames(product.images);
    res.render("editProduct", {
      product: product,
      category: category,
      images,
    });
  } catch (error) {
    console.log("error loadin edit product :" + error);
    res.status(500).json({ error: "server error" });
  }
};

//edit product
const editProduct = async (req, res) => {
  fileUploadHelper.upload(req, res, async function (err) {
    if (err) {
      console.log("Error during file upload: " + err);
      return res.status(400).json({ message: err.message });
    }

    try {
      // Convert req.body to a plain JavaScript object
      const plainBody = Object.assign({}, req.body);

      const productId = plainBody.productId;

      const product = await productModel.findById(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Parse variants if necessary
      let variants = plainBody.variant;
      if (typeof variants === 'string') {
        variants = JSON.parse(variants);  // Convert stringified array back to array
      }
      if (Array.isArray(variants)) {
        variants = variants.filter(variant => typeof variant === 'object' && variant !== null);
    }

     
      // Process any new images uploaded
      let newImages = [];
      if (req.files && req.files.length > 0) {
        newImages = await fileUploadHelper.processImages(req.files, plainBody.productName);
      }

      // Append new images to the existing ones
      const updatedImages = [...product.images, ...newImages];

      // Find the category by name to get its ID
      const category = await categoryModel.findOne({
        categoryName: plainBody.category,
      });
      if (!category) {
        return res.status(400).json({ message: "Category not found" });
      }

      // Update the product with new data
      product.productName = plainBody.productName;
      product.description = plainBody.description;
      product.price = plainBody.price;
      product.variant = variants;  // Update all variants
      product.images = updatedImages;
      product.category = category._id;

      // Save the updated product to the database
      await product.save();

      return res.status(200).json({ message: "Product updated successfully",success:true });
    } catch (error) {
      console.log("Error during product update: " + error);
      res.status(500).json({ message: error.message });
    }
  });
};


//deleteImage
const deleteSingleImage = async (req, res) => {
  try {
    const { imageid, productid } = req.query;
    const product = await productModel.findOne({ _id: productid });
    if (product.images.length <= 3) {
      return res.json({
        status: false,
        message: "A product should have minimum of 3 images",
      });
    }
    const imagePath = path.join(__dirname, "../public/uploads/", imageid);
    fs.unlink(imagePath, (err) => {
      if (err) {
        return res
          .status(500)
          .json({ status: false, message: "Failed to delete image" });
      }
    });
    product.images = product.images.filter(
      (image) => image !== imageNameToServer
    );

    // Save the updated product
    await product.save();

    // Send a success response to the client
    return res.redirect("/editProduct?id=" + productid);
  } catch (error) {
    console.log("error deleting image :" + error);
    res.status(400).json({ message: "Internal Server Error" });
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

module.exports = {
  productManagementLoad,
  editProductLoad,
  editProduct,
  deleteProduct,
  deleteSingleImage,
  restoreProduct,
  unlistProduct,
  addProduct,
  addProductLoad
};
