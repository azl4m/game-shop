const multer = require("multer");
const sharp = require("sharp");
const fs = require("fs");
const path = require('path')
// Set storage engine
const storage = multer.diskStorage({
  destination: "../../public/uploads/", // Set the upload destination
  filename: function (req, file, cb) {
    const name = req.body.productName;
    cb(null, name + "-" + Date.now());
  },
});

//for getting filename
const fileNames = (images) => {
  let filenames = [];
  images.forEach((image) => {
    filenames.push(path.basename(image));
  });
  return filenames;
};
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
      await sharp(file.path)
        .resize(300, 300) // Customize as needed
        .toFile(newPath);
      processedFiles.push(
        `uploads/cropped-${name}-${i}${path.extname(file.originalname)}`
      );
      // fs.unlinkSync(file.path);
    } catch (error) {
      console.error("Error processing image:", error);
    }
    i++;
  }
  return processedFiles;
};

module.exports = {
  processImages,
  checkFileType,
  fileNames,
  upload,
  storage,
};
