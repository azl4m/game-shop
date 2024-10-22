const productModel = require("../../models/productModel");
const userModel = require("../../models/userModel");
const categoryModel = require("../../models/categoryModel");
const orderModel = require("../../models/orderModel");
const couponModel = require("../../models/couponModel");

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
    const {
      categoryName,
      offerType,
      offerValue,
      offerStartDate,
      offerEndDate,
    } = req.body;
    const existingCategory = await categoryModel.findOne({
      categoryName: categoryName,
    });
    if (existingCategory) {
      return res.status(400).json({ error: "Category already exists" });
    } else {
      const newCategory = new categoryModel({
        categoryName: categoryName,
      });

      if (offerValue) {
        newCategory.offer = {
          type: offerType,
          value: offerValue,
          startDate: new Date(offerStartDate),
          endDate: new Date(offerEndDate),
        };
      }
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
    const {
      categoryName,
      offerType,
      offerValue,
      offerStartDate,
      offerEndDate,
    } = req.body;
    const existingCat = await categoryModel.findOne({
      categoryName: categoryName,
      _id: { $ne: categoryId }, // Exclude current category from check
    });
    if (existingCat) {
      return res.status(400).json({
        error: "Category name already exists please choose another one",
      });
    }
    const category = await categoryModel.findById({ _id: categoryId });
    // Prepare the update object
    const updateFields = { categoryName: categoryName };

    // Only set offer details if they are provided
    if (offerValue && offerType) {
      updateFields.offer = {
        type: offerType,
        value: parseFloat(offerValue),
        startDate: offerStartDate ? new Date(offerStartDate) : null,
        endDate: offerEndDate ? new Date(offerEndDate) : null,
      };
    } else {
      // If no offer is provided, you may want to clear the offer
      updateFields.offer = null;
    }

    // Update the category
    const updateCategory = await category.updateOne({ $set: updateFields });

    if (updateCategory) {
      return res.redirect("/admin/categoryManagement");
    } else {
      return res.status(400).json({ error: "Error editing category" });
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

module.exports = {
  deleteCategory,
  listCategory,
  unlistCategory,
  editCategory,
  addCategory,
  addCategoryLoad,
  editCategoryLoad,
  categoryManagementLoad,
};
