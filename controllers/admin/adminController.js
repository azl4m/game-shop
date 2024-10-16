const path = require("path");
const productModel = require("../../models/productModel");
const userModel = require("../../models/userModel");
const categoryModel = require("../../models/categoryModel");
const orderModel = require("../../models/orderModel");
const couponModel = require("../../models/couponModel");
const multer = require("multer");
const sharp = require("sharp");
const fs = require("fs");

//for handling photo upload

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

//sales report

const salesReport = async (req, res) => {
  try {
    const orderCount = await orderModel.find().countDocuments();
    return res.render("salesReport", { orderCount });
  } catch (error) {
    console.log("error loading sales report page" + error.message);
  }
};

const getSalesReport = async (req, res) => {
  try {
    console.log("hello1");

    const { startDate, endDate, range } = req.query; // Range: 'daily', 'weekly', 'monthly', 'custom'

    let filter = {};

    // Determine the date range filter based on the request
    if (range === "custom" && startDate && endDate) {
      filter.orderDate = {
        $gte: new Date(new Date(startDate).setHours(0, 0, 0)),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59)),
      };
    } else if (range === "daily") {
      const today = new Date();
      filter.orderDate = {
        $gte: new Date(today.setHours(0, 0, 0)),
        $lte: new Date(today.setHours(23, 59, 59)),
      };
    } else if (range === "weekly") {
      const today = new Date();
      const startOfWeek = today.setDate(today.getDate() - today.getDay());
      const endOfWeek = today.setDate(today.getDate() + (6 - today.getDay()));
      filter.orderDate = {
        $gte: new Date(startOfWeek),
        $lte: new Date(endOfWeek),
      };
    } else if (range === "monthly") {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      filter.orderDate = {
        $gte: new Date(startOfMonth),
        $lte: new Date(endOfMonth),
      };
    }

    // Fetch orders based on the filter
    console.log(filter);

    const orders = await orderModel.find(filter);
    console.log(orders);

    // Calculate overall stats
    let totalSales = 0;
    let totalDiscount = 0;
    let totalOrders = orders.length;

    orders.forEach((order) => {
      totalSales += order.totalPrice; // Assuming totalAmount contains the final price
      totalDiscount += order.discount; // Assuming discount field exists in order
    });

    res.status(200).json({
      totalOrders,
      totalSales,
      totalDiscount,
      orders, // For detailed information
    });
  } catch (error) {
    console.error("Error fetching sales report:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  pageNotFound,
  dashboardLoad,
  getSalesReport,
  salesReport,
};
