const userModel = require("../../models/userModel");
const orderModel = require("../../models/orderModel");
const moment = require("moment");
const fs = require("fs");
const PDFDocument = require("pdfkit");
const borderForPdf = require("../../helpers/borderForPdf");
const path = require("path");



//orders
const ordersLoad = async (req, res) => {
  try {
    const userid = req.session.user;
    const user = await userModel.findOne({ _id: userid });
    const orders = await orderModel.find({ user: userid });
    if (orders) {
      res.render("orderslisting", {
        userDetails: user,
        orders: orders,
        empty: false,
        moment,
      });
    }
  } catch (error) {
    console.log("Error at orders loading :" + error);
  }
};

const orderDetails = async (req, res) => {
  try {
    const orderid = req.query.id;
    const userid = req.session.user;
    const user = await userModel.findById(userid);
    const order = await orderModel.findById( orderid ).populate({
      path: "cartItems.product",
      select: "productName images",
    });

    res.render("orderDetails", { userDetails: user, order: order, moment });
  } catch (error) {
    console.log("error loading order details :" + error);
    res.status(400).json({ message: "Internal Server Error" });
  }
};
//reuqest
const requestReturn = async (req, res) => {
  try {
    const platform = req.query.platform
    const orderid = req.query.orderid;
    const product = req.query.product;
    // Update the `isReturned` field of the specific cart item in the order
    const update = await orderModel.updateOne(
      { _id: orderid, "cartItems.product": product,
        "cartItems.platform": platform
       }, // Match the order and the cart item by product ID
      { $set: { "cartItems.$.isReturned": true } } // Use the positional operator to update the specific item
    );
    return res.redirect(`/orderDetails?id=${orderid}`);
  } catch (error) {
    console.log("error requesting return  :" + error);
  }
};
//cancel
const requestCancel = async (req, res) => {
  try {
    const orderid = req.query.id;
    const order = await orderModel.findByIdAndUpdate(orderid, {
      $set: { isCancelled: true },
    });
    return res.redirect("/orderDetails?id=" + orderid);
  } catch (error) {
    console.log("error at requestcancel :" + error.message);
  }
};

//order success
const orderSuccessLoad = async (req, res) => {
  try {
    const{orderId} = req.query
    const order = await orderModel.findById(orderId)
    const user = await userModel.findById(req.session.user);
    return res.render("orderSuccess", { userDetails: user,order:order });
  } catch (error) {
    console.log("error at success page");
    console.log(error);
  }
};

const downloadInvoice = async (req, res) => {
  try {
    const { orderId, productId, platform } = req.query;

    // Fetch the order and related product details
    const order = await orderModel.findById(orderId)
      .populate({ path: 'cartItems.product', select: 'productName price' });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Find the specific product from cartItems by comparing both productId and platform
    const productItem = order.cartItems.find(item => 
      item.product._id.toString() === productId && item.platform === platform
    );

    if (!productItem) {
      return res.status(404).json({ message: "Product not found in the order with the specified platform" });
    }

    // Create a new PDF document
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    // Set headers for PDF download
    res.setHeader('Content-Disposition', `attachment; filename=invoice_${productId}.pdf`);
    res.setHeader('Content-Type', 'application/pdf');

    // Pipe the PDF output to the response
    doc.pipe(res);

    // Add logo
    doc.image(path.join(__dirname,'..','..','public','images','game-logo.png'), 50, 45, { width: 90 });

    // Company Details
    doc.fontSize(10).text('The Game Shop', 230, 65, { align: 'right' });
    doc.text('Hilite Buisiness Park Kozhikode', { align: 'right' });
    doc.text('support@gameshop.com | +91-8111-905-805', { align: 'right' });

    // Horizontal line
    doc.moveTo(50, 120).lineTo(550, 120).stroke();

    // Title
    doc.fontSize(20).text('INVOICE', 50, 140, { align: 'center' });

    // Invoice Info
    doc.fontSize(10).text(`Invoice Number: ${order.orderNumber}`, 50, 180);
    doc.text(`Order Date: ${new Date(order.orderDate).toLocaleDateString()}`, 50, 195);
    doc.text(`Payment Method: ${order.paymentMethod}`, 50, 210);

    // Billing and Shipping Address
    doc.fontSize(10).text('Billing & Shipping Address:', 300, 180);
    const { name, street, city, state, postalCode, country, phoneNumber } = order.shippingAddress;
    doc.text(`${name}\n${street}\n${city}, ${state}, ${postalCode}\n${country}\nPhone: ${phoneNumber}`, 300, 195);

    // Increase the gap before the table (moved down by 30 units)
    const tableStartY = 280;

    // Product Table Header
    doc.rect(50, tableStartY, 500, 20).fill('#f0f0f0');
    doc.fillColor('black').fontSize(10)
      .text('Product Name', 60, tableStartY + 5)
      .text('Platform', 220, tableStartY + 5)
      .text('Quantity', 300, tableStartY + 5)
      .text('Price', 370, tableStartY + 5)
      .text('Discount', 440, tableStartY + 5)
      .text('Total', 510, tableStartY + 5);

    // Product Data
    const productDataY = tableStartY + 30;
    const total = (productItem.quantity * productItem.price).toFixed(2);
    const discountedTotal = (total - (order.discount || 0)).toFixed(2);

    doc.text(productItem.product.productName, 60, productDataY).fontSize(8)
      .text(productItem.platform, 220, productDataY)
      .text(productItem.quantity.toString(), 300, productDataY)
      .text(`Rs.${productItem.price.toFixed(2)}`, 370, productDataY)
      .text(`Rs.${order.discount || 0}`, 440, productDataY)
      .text(`Rs.${discountedTotal}`, 510, productDataY);

    // Invoice Summary (adjusted position)
    const summaryStartY = productDataY + 50;
    doc.rect(350, summaryStartY, 200, 100).fillAndStroke('#f0f0f0', '#000000');
    doc.fillColor('black').text('Summary:', 360, summaryStartY + 10);
    doc.text(`Subtotal:`, 360, summaryStartY + 30);
    doc.text(`Discount:`, 360, summaryStartY + 50);
    doc.text(`Total:`, 360, summaryStartY + 70);
    doc.text(`Payment Status:`, 360, summaryStartY + 90);

    doc.text(`Rs.${total}`, 480, summaryStartY + 30, { align: 'right' });
    doc.text(`Rs.${order.discount || 0}`, 480, summaryStartY + 50, { align: 'right' });
    doc.text(`Rs.${discountedTotal}`, 480, summaryStartY + 70, { align: 'right' });
    doc.text(`${order.paymentStatus}`, 480, summaryStartY + 90, { align: 'right' });

    // Footer (adjusted position)
    doc.fontSize(10).text('Thank you for shopping with us!', 50, 720, { align: 'center' });
    doc.text('If you have any questions, feel free to contact us.', { align: 'center' });

    // Finalize the PDF document
    doc.end();

  } catch (error) {
    console.error("Error generating invoice: " + error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};



module.exports = {
  orderDetails,
  orderSuccessLoad,
  requestCancel,
  requestReturn,
  ordersLoad,
  downloadInvoice

};
