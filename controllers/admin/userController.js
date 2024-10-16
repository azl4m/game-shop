const productModel = require("../../models/productModel");
const userModel = require("../../models/userModel");
const categoryModel = require("../../models/categoryModel");
const orderModel = require("../../models/orderModel");
const couponModel = require("../../models/couponModel");



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
  
  module.exports={
    userManagementLoad,
    unblockUser,
    blockUser
  }