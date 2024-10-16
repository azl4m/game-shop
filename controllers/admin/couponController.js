const productModel = require("../../models/productModel");
const userModel = require("../../models/userModel");
const categoryModel = require("../../models/categoryModel");
const orderModel = require("../../models/orderModel");
const couponModel = require("../../models/couponModel");

//coupon
const addCouponLoad = async (req, res) => {
    try {
      return res.render("addCoupon");
    } catch (error) {
      console.log("error at add coupon load :" + error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  };
  
  // Add new coupon
  const addCoupon = async (req, res) => {
    try {
      // Validation
      const {
        couponCode,
        discountType,
        discountValue,
        minCartValue,
        expiresAt,
        isActive,
      } = req.body;
  
      // Check if all required fields are provided
      if (
        !couponCode ||
        !discountType ||
        !discountValue ||
        !minCartValue ||
        !expiresAt
      ) {
        return res.status(400).json({ message: "All fields are required." });
      }
  
      // Check if the coupon code already exists
      const existingCoupon = await couponModel.findOne({ code: couponCode });
      if (existingCoupon) {
        return res.status(400).json({ message: "Coupon code already exists." });
      }
  
      // Validate discount type
      if (!["fixed", "percentage"].includes(discountType)) {
        return res.status(400).json({ message: "Invalid discount type." });
      }
  
      // Validate discount value
      if (discountValue <= 0) {
        return res
          .status(400)
          .json({ message: "Discount value must be greater than 0." });
      }
  
      // Validate minimum cart value
      if (minCartValue <= 0) {
        return res
          .status(400)
          .json({ message: "Minimum cart value must be greater than 0." });
      }
  
      // Validate expiration date
      const expirationDate = new Date(expiresAt);
      const currentDate = new Date();
      if (expirationDate <= currentDate) {
        return res
          .status(400)
          .json({ message: "Expiration date must be in the future." });
      }
  
      // Create a new coupon
      const newCoupon = new couponModel({
        code: couponCode,
        discountType,
        discountValue,
        minCartValue,
        expiresAt: expirationDate,
        isActive,
      });
  
      // Save the coupon to the database
      await newCoupon.save();
  
      return res.redirect("/admin/couponManagement");
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Server error." });
    }
  };
  
  // Fetch coupons with pagination and search functionality
  const couponManagement = async (req, res) => {
    try {
      const { search = "", page = 1 } = req.query;
      const limit = 10;
      const skip = (page - 1) * limit;
  
      const query = search
        ? { couponCode: { $regex: search, $options: "i" } }
        : {};
  
      const totalCoupons = await couponModel.countDocuments(query);
      const totalPages = Math.ceil(totalCoupons / limit);
      const coupons = await couponModel.find(query).skip(skip).limit(limit);
  
      res.render("couponManagement", {
        data: coupons,
        totalPages,
        currentPage: parseInt(page),
        searchQuery: search,
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching coupons." });
    }
  };
  
  // Activate a coupon
  const activateCoupon = async (req, res) => {
    try {
      const { id } = req.query;
      await couponModel.findByIdAndUpdate(id, { isActive: true });
      res.redirect("/admin/coupons");
    } catch (error) {
      res.status(500).json({ message: "Error activating coupon." });
    }
  };
  
  // Deactivate a coupon
  const deactivateCoupon = async (req, res) => {
    try {
      const { id } = req.query;
      await couponModel.findByIdAndUpdate(id, { isActive: false });
      res.redirect("/admin/coupons");
    } catch (error) {
      res.status(500).json({ message: "Error deactivating coupon." });
    }
  };
  
  // Delete a coupon
  const deleteCoupon = async (req, res) => {
    try {
      const { id } = req.query;
      await couponModel.findByIdAndDelete(id);
      res.redirect("/admin/coupons");
    } catch (error) {
      res.status(500).json({ message: "Error deleting coupon." });
    }
  };
  
  // Get coupon details for editing
  const getCouponForEdit = async (req, res) => {
    try {
      const { id } = req.query;
      const coupon = await couponModel.findById(id);
      res.render("editCoupon", { coupon });
    } catch (error) {
      res.status(500).json({ message: "Error fetching coupon details." });
    }
  };
  
  // Update a coupon
  const updateCoupon = async (req, res) => {
    try {
      const {
        id,
        couponCode,
        discountType,
        discountValue,
        minCartValue,
        expiresAt,
        isActive,
      } = req.body;
  
      if (!id) {
        return res.status(400).json({ message: "Coupon ID is required." });
      }
  
      const updatedCoupon = await couponModel.findByIdAndUpdate(
        id,
        {
          code: couponCode,
          discountType,
          discountValue,
          minCartValue,
          expiresAt,
          isActive: isActive === "true",
        },
        { new: true } // Return the updated document
      );
  
      // Check if the coupon was found and updated
      if (!updatedCoupon) {
        return res.status(404).json({ message: "Coupon not found." });
      }
  
      res.redirect("/admin/couponManagement");
    } catch (error) {
      // Log the error for debugging
      console.error("Error updating coupon:", error);
      res.status(500).json({ message: "Error updating coupon." });
    }
  };

  module.exports={
    couponManagement,
    addCoupon,
    addCouponLoad,
    activateCoupon,
    deactivateCoupon,
    getCouponForEdit,
    updateCoupon,
    deleteCoupon
  }