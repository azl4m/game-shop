const path = require("path");
const productModel = require(path.join(
  __dirname,
  "..",
  "..",
  "models",
  "productModel"
));
const multer = require("multer");
const sharp = require('sharp')
const fs = require('fs')


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
}).array('productImages', 5);

// Check file type
function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
  
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb('Error: Images Only!');
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
    upload(req, res, async function (err) {
      if (err) {
        return res.status(400).send({ message: err.message });
      }
  
      try {
        const { productName, description, price, variant } = req.body;
        const images = await processImages(req.files);
  
        const newProduct = new productModel({
          productName,
          description,
          price,
          images,
          variant,
          createdBy: req.user._id, // Assuming you have user authentication
          updatedBy: req.user._id
        });
  
        await newProduct.save();
        res.status(201).json({ message: 'Product created successfully', product: newProduct });
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });
  };

module.exports = {
  pageNotFound,
  addProduct,
  addProductLoad,
  dashboardLoad,
};
