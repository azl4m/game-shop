
const cartModel = require("../../models/cartModel");
const orderModel = require("../../models/orderModel");
const dotenv = require("dotenv").config();
const paymentTimeStamp = require("../../helpers/paymentTimeStamp");
const userModel = require("../../models/userModel");
const razorpayInstance = require("../../config/razorpay");
const walletHelper = require("../../helpers/walletTransactions")
//razorpay payment verify place order
const razorpayPaymentVerification = async (req, res) => {
  try {
    const crypto = require("crypto");
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = req.body;

    // Verify the signature to ensure the payment is valid
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generatedSignature = hmac.digest("hex");

    if (generatedSignature === razorpay_signature) {
      // Payment is successful, update the order
      const order = await orderModel.findById(orderId);

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      //if wallet deduced save it
      if(order.walletDeduction){
        await walletHelper.addWalletTransaction(order.user,order.walletDeduction,"debit",`Wallet amount debited for order :${order.orderNumber} `)
      } 
      // Update order with successful payment details
      order.paymentStatus = "Success";
      order.orderStatus = "Processing";
      await paymentTimeStamp.statusTime(order.orderStatus, order._id);
      await paymentTimeStamp.paymentStatusTime(order.paymentStatus, order._id);
      order.paymentId = razorpay_payment_id; // Use the payment ID from Razorpay
      order.paymentDate = Date.now();

      await order.save();
      // Optionally, clear the user's cart
      await cartModel.findOneAndDelete({ userId: order.user });

      return res.status(200).json({
        message: "Payment Successful and Order Updated!",
        success: true,
      });
    } else {
      const order = await orderModel.findById(orderId);
      order.paymentStatus = "Failed";
      await paymentTimeStamp.paymentStatusTime(order.paymentStatus, order._id);
      await order.save();
      // Invalid signature, payment verification failed
      res
        .status(400)
        .json({ message: "Invalid signature, payment verification failed" });
    }
  } catch (error) {
    console.log("error at payment verify" + error.message);
  }
};

const razorpayWebhook = async (req, res) => {
  try {
    const crypto = require("crypto");
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Verify webhook signature
    const receivedSignature = req.headers["x-razorpay-signature"];
    const body = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");

    if (receivedSignature === expectedSignature) {
      const { event, payload } = req.body;

      if (event === "payment.failed") {
        const { order_id: razorpay_order_id, payment_id: razorpay_payment_id } =
          payload.payment.entity;

        // Update order status to 'Failed' in the database
        const order = await orderModel.findOne({ razorpay_order_id });
        if (order) {
          order.paymentStatus = "Failed";
          await order.save();
        }
        return res
          .status(200)
          .json({ message: "Payment failed, order updated" });
      }

      res.status(200).json({ message: "Webhook processed successfully" });
    } else {
      res.status(400).json({ message: "Invalid webhook signature" });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const paymentFailure = async (req, res) => {
  try {
    const { orderId } = req.query;
    if (!orderId) {
      return res.status(400).json({ message: "OrderId not found" });
    }
    const order = await orderModel.findById(orderId);
    if (!order) {
      return res.status(400).json({ message: "Order not found" });
    }
    order.paymentStatus = "Failed";
    await order.save();
    return res.redirect(`/orderFailed?orderId=${orderId}`);
  } catch (error) {
    console.log("error at payment failure" + error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
const orderFailed = async (req, res) => {
  try {
    const { orderId } = req.query;
    if (!orderId) {
      return res.status(400).json({ message: "OrderID not found" });
    }
    const order = await orderModel.findById(orderId);
    if (!order) {
      return res.status(400).json({ message: "Order not found" });
    }
    const user = await userModel.findById(req.session?.user);
    return res.render("orderFailed", { userDetails: user, order });
  } catch (error) {
    console.log("error at order failure :" + error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
const retryPayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    const userId = req.session.user;
    if (!orderId) {
      return res.status(400).json({ message: "orderId not found" });
    }
     // Find the existing order
     const order = await orderModel.findById(orderId);
     if (!order) {
       return res.status(400).json({ message: "Order not found" });
     }
    // Regenerate Razorpay order
    const razorpayOrder = await razorpayInstance.orders.create({
      amount: order.totalPrice * 100, // Amount in paise (totalPrice is in INR)
      currency: "INR",
      receipt: order.orderNumber,
      payment_capture: 1,
    });

    // Update the order with new Razorpay order ID and reset status
    order.paymentId = razorpayOrder.id;
    order.paymentStatus = "Pending"; // Reset status for retry
    await order.save();

    // Send Razorpay details to the frontend
    return res.status(200).json({
      message: "Proceed with Razorpay payment",
      razorpayOrderId: razorpayOrder.id,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      amount: order.totalPrice * 100,
      orderId: order._id,
      name: req.session.user.fname,
    });
  } catch (error) {
    console.log("Error during retry payment: " + error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
module.exports = {
  razorpayPaymentVerification,
  razorpayWebhook,
  paymentFailure,
  orderFailed,
  retryPayment
};
