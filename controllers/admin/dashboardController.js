const path = require("path");
const productModel = require("../../models/productModel");
const userModel = require("../../models/userModel");
const categoryModel = require("../../models/categoryModel");
const orderModel = require("../../models/orderModel");
const couponModel = require("../../models/couponModel");
const multer = require("multer");
const sharp = require("sharp");
const fs = require("fs");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const borderForPdf = require("../../helpers/borderForPdf");
const referralModel = require("../../models/referralModel");



const graphData=async(req,res)=>{
    try {
        
        console.log("inside graph data")
        const{filter}=req.query
        let startDate;
        let endDate = new Date(); // Current date
        const data={}

        if (filter === 'today') {
            startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
        } else if (filter === 'monthly') {
            startDate = new Date();
            startDate.setDate(1); // Start of the month
        } else if (filter === 'yearly') {
            startDate = new Date();
            startDate.setMonth(0); // Start of the year
            startDate.setDate(1);
        } else {
            return res.status(400).json({ error: 'Invalid filter' });
        }

        const topProductsWithDetails = await orderModel.aggregate([
            {
                $match: {
                    orderDate: { $gte: startDate, $lt: endDate }
                }
            },
            {
                $unwind: "$cartItems"
            },
            {
                $group: {
                    _id: "$cartItems.product",
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            },
            {
                $limit: 10
            },
            {
                $lookup: {
                    from: "products",  
                    localField: "_id",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            {
                $unwind: "$productDetails"
            },
            {
                $project: {
                    _id: 1,
                    count: 1,
                    "productDetails.name": 1,  
                    "productDetails.category": 1
                }
            }
        ]);

        const topCategoryWithDetails = await orderModel.aggregate([
            {
                $match: {
                    orderDate: { $gte: startDate, $lt: endDate }
                }
            },
            {
                $unwind: "$cartItems"
            },
            {
                $group: {
                    _id: "$cartItems.product",
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            },
            {
                $limit: 10
            },
            {
                $lookup: {
                    from: "products",  
                    localField: "_id",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            {
                $unwind: "$productDetails"
            },
            {
                $project: {
                    _id: 1,
                    count: 1,
                    "productDetails.productName": 1,  
                    "productDetails.category": 1
                }
            },
            {
                $group:{
                    _id:"$productDetails.category",
                    count:{$sum:1}
                }
            },
            {
                $lookup:{
                    from:"categories",
                    localField:"_id",
                    foreignField:"_id",
                    as:"categoryDetails"
                }   
            },
            {
                $unwind:"$categoryDetails"
            },
            {
                $project:{
                    _id:1,
                    count:1,
                    "categoryDetails.categoryName":1
                }
            }
        ]);
        data.products=[]
        data.categories=[]
        for(let count of topProductsWithDetails){
            data.products.push(count.count)
        }
        for(let count of topCategoryWithDetails){
            data.categories.push(count.count)
        }
        console.log(data)
        return res.json(data); 

    } catch (error) {
        console.log("error in graph data"+error.message)
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}




module.exports = {graphData}