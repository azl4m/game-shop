const productModel = require("../../models/productModel");
const userModel = require("../../models/userModel");
const categoryModel = require("../../models/categoryModel");
const orderModel = require("../../models/orderModel");
const couponModel = require("../../models/couponModel");
const paymentStatusTime = require("../../helpers/paymentTimeStamp");
const walletTransactions = require("../../helpers/walletTransactions");

//order management
const orderManagementLoad = async (req, res) => {
  try {
    const search = req.query.search || ""; // Get search query
    const page = parseInt(req.query.page) || 1; // Default page is 1
    const limit = 10; // Limit per page
    const skip = (page - 1) * limit;

    const orders = await orderModel
      .find({})
      .populate({ path: "user", select: "username email" })
      .sort({ orderDate: -1 })
      .skip(skip)
      .limit(limit);
    const totalOrders = await orderModel.countDocuments({});
    const totalPages = Math.ceil(totalOrders / limit);
    res.render("orderManagement", {
      data: orders,
      totalPages: totalPages,
      currentPage: page,
      totalOrders: totalOrders,
      searchQuery: search,
    });
  } catch (error) {
    console.log("error loading order management :" + error);
    return res.status(500).json({ message: "internal server error" });
  }
};
const orderDetails = async (req, res) => {
  try {
    const search = req.query.search || ""; // Get search query
    const orderid = req.query.id;

    const order = await orderModel.findById(orderid).populate({
      path: "cartItems.product",
      select: "productName",
    });

    return res.render("orderDetailsAdmin1", {
      data: order,
      searchQuery: search,
    });
  } catch (error) {
    console.log("error in orderdetails :" + error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const orderStatus = async (req, res) => {
  try {
    const orderid = req.query.orderid;

    const cartItemIndex = parseInt(req.query.itemid);
    const orderStatus = req.query.status;
    // Update the order status for the specific cart item in the array

    const update = await orderModel.updateOne(
      { _id: orderid },
      { $set: { [`cartItems.${cartItemIndex}.orderStatus`]: orderStatus } } // Targeting specific cart item index
    );

    await paymentStatusTime.statusTimeIndex(
      orderStatus,
      orderid,
      cartItemIndex
    );
    return res.redirect(`/admin/orderDetails?id=${orderid}`);
  } catch (error) {
    console.log("error changing delivery status :" + error);
  }
};

const acceptReturn = async (req, res) => {
  try {
    const orderId = req.query.orderid; // ID of the order
    const cartItemIndex = parseInt(req.query.cartItem); // Index of the cart item in the array

    // Find the order to access the product ID, quantity, and platform of the returned item
    const order = await orderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    const returnedItem = order.cartItems[cartItemIndex];
    const productId = returnedItem.product;
    const returnQuantity = returnedItem.quantity;
    const platform = returnedItem.platform;
    const refundAmount = returnedItem.price * returnQuantity;

    // Step 1: Update the return status to 'ACCEPTED'
    const update = await orderModel.updateOne(
      { _id: orderId },
      { $set: { [`cartItems.${cartItemIndex}.orderStatus`]: "Returned" } } // Dynamically setting the field using the index
    );
    await paymentStatusTime.statusTimeIndex("Returned",orderId,cartItemIndex)
    // Step 2: Update the timestamp for the return status
    await paymentStatusTime.returnStatusTime(
      "ACCEPTED",
      orderId,
      cartItemIndex
    );

    // Step 3: Increase the stock for the returned product and platform
    const productUpdate = await productModel.findOneAndUpdate(
      { _id: productId, "variant.platform": platform },
      { $inc: { "variant.$.stock": returnQuantity } }, // Increment the stock for the specific platform
      { new: true } // Return the updated document
    );

    const product = await productModel.findById(productId);
    await walletTransactions.addWalletTransaction(
      order.user,
      refundAmount,
      "credit",
      `Refund for return of ${product.productName}`
    );

    return res.redirect(`/admin/orderDetails?id=${orderId}`);
  } catch (error) {
    console.log("Error at accept return: " + error);
    res
      .status(500)
      .json({ message: "An error occurred while processing the return." });
  }
};

const rejectReturn = async (req, res) => {
  try {
    const orderId = req.query.orderid; // ID of the order
    const cartItemIndex = parseInt(req.query.cartItem); // Index of the cart item in the array

    // Update the specific cart item using the index in the cartItems array
    // const update = await orderModel.updateOne(
    //   { _id: orderId },
    //   { $set: { [`cartItems.${cartItemIndex}.returnAccepted`]: "REJECTED" } } // Dynamically setting the field using the index
    // );
    await paymentStatusTime.returnStatusTime(
      "REJECTED",
      orderId,
      cartItemIndex
    );

    if (update.matchedCount === 0) {
      res.status(404).json({ message: "Order not found." });
    } else if (update.modifiedCount === 0) {
      // This case is when the order was found, but no change was made (e.g., status was already "ACCEPTED")
      res
        .status(200)
        .json({ message: "No changes made, status was already 'REJECTED'." });
    } else {
      return res.redirect(`/admin/orderDetails?id=${orderId}`);
    }
  } catch (error) {
    console.log("Error at accept return: " + error);
    res
      .status(500)
      .json({ message: "An error occurred while processing the return." });
  }
};
const acceptCancel = async (req, res) => {
  try {
    const orderid = req.query.orderid;
    const cartItemIndex = parseInt(req.query.cartItem); // Index of the cart item in the array
    // Update the specific cart item using the index in the cartItems array
    const update = await orderModel.updateOne(
      { _id: orderid },
      { $set: { [`cartItems.${cartItemIndex}.cancelAccepted`]: "ACCEPTED" } } // Dynamically setting the field using the index
    );
    const updateitem = await orderModel.updateOne(
      { _id: orderid },
      { $set: { [`cartItems.${cartItemIndex}.orderStatus`]: "Cancelled" } } // Dynamically setting the field using the index
    );
    await paymentStatusTime.statusTimeIndex("Cancelled",orderid,cartItemIndex)
   // Restock the specific item by platform for the given index
    await paymentStatusTime.cacnelStatusTime(
      "ACCEPTED",
      orderid,
      cartItemIndex
    );
    // await paymentStatusTime.statusTime("Cancelled", orderid);
    const order = await orderModel.findById(orderid);
    const cartItem = order.cartItems[cartItemIndex];
    
    const { product, platform, quantity } = cartItem;
    const Product = productModel.findById(product)
    if (
      order.paymentMethod === "Razorpay" &&
      order.paymentStatus === "Success"
    ) {
      const refundAmount = cartItem.finalPrice;
      await walletTransactions.addWalletTransaction(
        order.user,
        refundAmount,
        "credit",
        `Refund for cancel of ${Product.productName}`
      );
    } else if (order.paymentMethod === "COD" && cartItem.walletDeduction) {
      const refundAmount = cartItem.walletDeduction;
      await walletTransactions.addWalletTransaction(
        order.user,
        refundAmount,
        "credit",
        `Refund for cancel of ${Product.productName}`
      );
    }
 
    await productModel.updateOne(
      { _id: product, "variant.platform": platform },
      { $inc: { "variant.$.stock": quantity } }
    );
    return res.redirect(`/admin/orderDetails?id=${orderid}`);
  } catch (error) {
    console.log("error at accept cancel :" + error.message);
  }
};
const rejectCancel = async (req, res) => {
  try {
    const orderid = req.query.orderid;
    const cartItemIndex = parseInt(req.query.cartItem); // Index of the cart item in the array
    // Update the specific cart item using the index in the cartItems array
    // const update = await orderModel.updateOne(
    //   { _id: orderid },
    //   { $set: { [`cartItems.${cartItemIndex}.cancelAccepted`]: "REJECTED" } } // Dynamically setting the field using the index
    // );
    await paymentStatusTime.cacnelStatusTime(
      "REJECTED",
      orderid,
      cartItemIndex
    );

    const order = await orderModel.findById(orderid);
    //   const cartItem = order.cartItems[cartItemIndex];
    //   if (
    //     order.paymentMethod === "Razorpay" &&
    //     order.paymentStatus === "Success"
    //   ) {
    //     const refundAmount = cartItem.finalPrice;
    //     await walletTransactions.addWalletTransaction(
    //       order.user,
    //       refundAmount,
    //       "credit",
    //       `Refund for return of ${product.productName}`
    //     );
    //   }
    //   else if(order.paymentMethod ==="COD" && cartItem.walletDeduction){
    //     const refundAmount = cartItem.walletDeduction;
    //     await walletTransactions.addWalletTransaction(
    //       order.user,
    //       refundAmount,
    //       "credit",
    //       `Refund for return of ${product.productName}`
    //     );
    //   }
    //   // Restock the specific item by platform for the given index
    // const { product, platform, quantity } = cartItem;
    // await productModel.updateOne(
    //   { _id: product, "variant.platform": platform },
    //   { $inc: { "variant.$.stock": quantity } }
    // );
    return res.redirect(`/admin/orderDetails?id=${orderid}`);
  } catch (error) {
    console.log("error at accept cancel :" + error.message);
  }
};

module.exports = {
  orderDetails,
  orderManagementLoad,
  orderStatus,
  acceptCancel,
  acceptReturn,
  rejectReturn,
  rejectCancel,
};
