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
const borderForPdf = require("../../helpers/borderForPdf");
const referralModel = require("../../models/referralModel")
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
    const { startDate, endDate, range, download } = req.query; // Range: 'daily', 'weekly', 'monthly', 'custom'
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

    const orders = await orderModel.find(filter).populate({
      path: "cartItems.product", // Path to populate
      select: "productName", // Fields to select from the Product model
    });

    // Calculate overall stats
    let totalSales = 0;
    let totalDiscount = 0;
    let totalOrders = orders.length;

    orders.forEach((order) => {
      totalSales += order.totalPrice; // Assuming totalAmount contains the final price
      totalDiscount += order.discount; // Assuming discount field exists in order
    });
    // If the `download` query parameter is true, generate a PDF
    if (download) {
      // Generate the PDF report


      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const filePath = path.join(__dirname, "sales_report.pdf");
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);
 
      borderForPdf.addPageBorder(doc);

      // Add Header with Logo
      const logoPath = path.join(
        __dirname,
        "..",
        "..",
        "public",
        "images",
        "game-logo.png"
      );
      console.log(logoPath);

      doc.image(logoPath, { width: 100, align: "center" });
      doc
        .fontSize(20)
        .fillColor("#000080")
        .text("Sales Report", { align: "center" });
      doc.moveDown();
      doc
        .fontSize(12)
        .fillColor("gray")
        .text(`Generated on: ${new Date().toLocaleDateString()}`, {
          align: "right",
        });
      doc.moveDown();

      // Add Report Summary with Borders
      doc
        .fontSize(12)
        .fillColor("#333")
        .text("Report Summary", { underline: true,align:"center" });
      doc.rect(doc.x, doc.y, 500, 100).stroke(); // Add a border box around summary
      doc.moveDown();
      doc.fontSize(12).text(`Total Orders: ${totalOrders}`,{align:"center"}).te;
      doc.text(`Total Sales: Rs.${totalSales.toFixed(2)}`,{align:"center"});
      doc.text(`Total Discount: Rs.${totalDiscount.toFixed(2)}`,{align:"center"});
      doc.moveDown();

      // Add Order Details with Styling
      doc
        .fontSize(14)
        .fillColor("#000080")
        .text("Order Details", { underline: true ,align:"center"});
      // Pagination settings
      const ordersPerPage = 4; // Define how many orders per page
      let currentOrder = 0;
      orders.forEach((order, index) => {
        if(currentOrder===3){
          doc.addPage();
          borderForPdf.addPageBorder(doc); // Add border to the new page
          doc.text("Order Details:", { underline: true,align:"center" });
        }
        
        // Check if we need to add a new page
        else if (currentOrder > 0 && currentOrder % ordersPerPage === 0 && currentOrder!==4) {
          doc.addPage();
          borderForPdf.addPageBorder(doc); // Add border to the new page
          doc.text("Order Details:", { underline: true,align:"center" });
        }
        doc.moveDown();
        doc
          .fontSize(12)
          .fillColor("black")
          .text(`Order #${index + 1}`, { bold: true });
        doc
          .fontSize(9)
          .text(
            `Order Date: ${new Date(order.orderDate).toLocaleDateString()}`
          );
        doc.text(
          `Shipping Address: ${order.shippingAddress.name}, ${order.shippingAddress.street}, ${order.shippingAddress.city}, ${order.shippingAddress.state}`
        );
        doc.text(`Order Status: Rs.${order.orderStatus}`);
        doc.text(`Total Price: Rs.${order.totalPrice}`);
        doc.text(`Discount: Rs.${order.discount}`);
        doc.text(`Payment Method: Rs.${order.paymentMethod}`);
        doc.text(`Payment Status: ${order.paymentStatus}`);
        if (order.isCancelled && order.cancelAccepted) {
          doc.text(`Product has been cancelled and money refunded`);
        }

        // Add Cart Items
        doc.moveDown().fillColor("#666").fontSize(10).text("Cart Items:");
        order.cartItems.forEach((item, idx) => {
          doc.text(
            `  - ${item.product.productName} (${item.platform}), Quantity: ${item.quantity}, Price: Rs.${item.price}`
          );
        });
        currentOrder++;
      });

      // Add Footer
      doc
        .fontSize(10)
        .fillColor("gray")
        .text("End Of Report", { align: "center", lineGap: 5 });
      doc.text("", { align: "center" });

      // Finalize and Download the PDF
      doc.end();
      stream.on("finish", () => {
        res.download(filePath, "sales_report.pdf", (err) => {
          if (err) {
            res.status(500).send("Error generating the report");
          }
          fs.unlinkSync(filePath); // Optional: Delete the file after download
        });
      });
    } else {
      // If not downloading, send the sales report as JSON
      res.status(200).json({
        totalOrders,
        totalSales,
        totalDiscount,
        orders, // For detailed information
      });
    }
  } catch (error) {
    console.error("Error fetching sales report:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const referralLoad = async(req,res)=>{
  try {
    const referral = await referralModel.findOne()
    return res.render("referralOffer",{referral})
  } catch (error) {
    console.log("error loading referral :"+error.message);
    return res.status(500).json({message:"Internal Server Error"})
    
  }
}
const referralPost = async(req,res)=>{
  try {
    const{amount,isActive} = req.body
    const referral = new referralModel({
      referralAmount:amount,
      isActive:isActive==="true"?true:false
    })
    await referral.save()
    res.redirect("/admin/referralOffer")
  } catch (error) {
    console.log("error at referralpost :"+error.message);
    return res.status(500).json({message:"Internal Server Error"})
    
  }
}
module.exports = {
  pageNotFound,
  dashboardLoad,
  getSalesReport,
  salesReport,
  referralLoad,
  referralPost
};
