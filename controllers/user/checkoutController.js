const userModel = require('../../models/userModel')
const cartModel = require('../../models/cartModel')
const orderModel = require('../../models/orderModel')
const couponModel = require('../../models/couponModel')


const getCheckoutPage = async (req, res) => {
    try {
      const userId = req.session.user;
      const user = await userModel.findOne({ _id: userId });
      const cart = await cartModel
        .findOne({ userId: userId })
        .populate("items.productId");
      if (!cart) {
        return res.status(400).json({ message: "No items in cart" });
      }
      const products = cart.items.map((item) => ({
        name: item.productId.productName,
        price: item.productId.price,
        quantity: item.quantity,
        platform: item.platform,
      }));
  
      const addresses = await addressModel.find({ userId });
      const defaultAddress = await addressModel.findOne({ isDefault: true });
      const { subtotal, tax, total, delivery } = calculateCartTotals(cart);
  
      // Fetch eligible coupons (coupons that haven't expired and meet the minCartValue requirement)
      const currentDate = new Date();
      const eligibleCoupons = await couponModel.find({
        isActive: true,
        expiresAt: { $gte: currentDate }, // Coupon hasn't expired
        minCartValue: { $lte: subtotal }, // Cart meets the minimum value for coupon
      });
  
      res.render("checkout1", {
        addresses: addresses,
        userDetails: user,
        defaultAddress: defaultAddress,
        products: products,
        delivery: delivery,
        tax: tax,
        total: total,
        eligibleCoupons: eligibleCoupons,
        subtotal,
      });
    } catch (error) {
      console.log("Error fetching checkout page:", error);
      res.status(500).json({ message: "Server error" });
    }
  };

  const checkoutLoad = async (req, res) => {
    try {
      const userId = req.session.user;
      const user = await userModel.findOne({ _id: userId });
      const cart = await cartModel.findOne({ userId }).populate({
        path: "items.productId",
        select: "price name",
      });
  
      const addressid = req.body.address;
      const address = await addressModel.findOne({ _id: addressid });
  
      if (!address) {
        return res.status(400).json({ message: "Address not found" });
      }
  
      if (!cart) {
        return res.status(400).json({ message: "No cart found" });
      }
  
      const { fname, paymentMode, totalPrice } = req.body;
      let { reducedAmount, couponCode } = req.body;
      const reducedAmountFinal = reducedAmount || 0;
      const couponCodeFinal = couponCode || null;
      function generateUniqueOrder() {
        let prefix = "ORD";
        let middle = Date.now();
        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let suffix = "";
  
        for (let i = 0; i < 4; i++) {
          const randomIndex = Math.floor(Math.random() * characters.length);
          suffix += characters[randomIndex];
        }
        return `${prefix}-${middle}-${suffix}`;
      }
      const cartItems = cart.items.map((item) => {
        if (!item.productId || !item.productId._id || !item.productId.price) {
          throw new Error("Cart item missing product or price information");
        }
        const itemTotal = item.productId.price * item.quantity;
        return {
          product: item.productId._id,
          price: item.productId.price,
          quantity: item.quantity,
          platform: item.platform,
        };
      });
      const orderNumber = generateUniqueOrder();
      if (paymentMode === "cod") {
        const order = new orderModel({
          user: userId,
          orderStatus: "Processing",
          orderNumber: orderNumber,
          cartItems: cartItems,
          totalPrice: totalPrice,
          paymentMethod: "COD",
          shippingAddress: {
            name: fname,
            street: address.street,
            city: address.city,
            phoneNumber: address.phoneNumber,
            state: address.state,
            postalCode: address.postalCode,
            country: address.country,
          },
          couponUsed: couponCodeFinal,
          discount: reducedAmountFinal,
        });
  
        const saveOrder = await order.save();
        await paymentTimeStamp.statusTime(saveOrder.orderStatus, saveOrder._id);
        await paymentTimeStamp.paymentStatusTime(
          saveOrder.paymentStatus,
          saveOrder._id
        );
        await cartModel.findOneAndDelete({ userId });
  
        return res.status(200).json({ message: "Checkout successful" });
      }
      if (paymentMode === "razorpay") {
        const razorpayOrder = await razorpayInstance.orders.create({
          amount: totalPrice * 100,
          currency: "INR",
          receipt: orderNumber,
          payment_capture: 1,
        });
  
        const order = new orderModel({
          user: userId,
          orderNumber: orderNumber,
          cartItems: cartItems,
          totalPrice: totalPrice,
          paymentMethod: "Razorpay",
          shippingAddress: {
            name: fname,
            street: address.street,
            city: address.city,
            phoneNumber: address.phoneNumber,
            state: address.state,
            postalCode: address.postalCode,
            country: address.country,
          },
          orderStatus: "Pending", // Update status after successful payment
          paymentId: razorpayOrder.id,
          couponUsed: couponCodeFinal,
          discount: reducedAmountFinal,
          
        });
        const saveOrder = await order.save();
        await paymentTimeStamp.statusTime(saveOrder.orderStatus, saveOrder._id);
        await paymentTimeStamp.paymentStatusTime(
          saveOrder.paymentStatus,
          saveOrder._id
        );
        return res.status(200).json({
          message: "Proceed with Razorpay payment",
          razorpayOrderId: razorpayOrder.id,
          razorpayKeyId: process.env.RAZORPAY_KEY_ID,
          amount: totalPrice * 100,
          orderId: order._id,
          name: fname,
        });
      }
      return res.status(400).json({ message: "Invalid Payment Method" });
    } catch (error) {
      console.log("error at checkout load");
  
      console.log(error.message);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  };

  const applyCoupon = async (req, res) => {
    try {
      const userId = req.session.user;
      const couponId = req.body.couponId; // Get coupon ID from the form
      const cart = await cartModel
        .findOne({ userId })
        .populate("items.productId");
  
      if (!cart) {
        return res.status(400).json({ message: "No items in cart" });
      }
  
      // Fetch the selected coupon
      const coupon = await couponModel.findById(couponId);
  
      // Validate coupon (if it's expired, inactive, or doesn't meet cart value)
      if (
        !coupon ||
        !coupon.isActive ||
        coupon.expiresAt < new Date() ||
        cart.subtotal < coupon.minCartValue
      ) {
        return res.status(400).json({ message: "Invalid or ineligible coupon." });
      }
  
      // Calculate the new total based on the coupon type
      let { subtotal, tax, delivery, total } = calculateCartTotals(cart);
      let temp = total;
      if (coupon.discountType === "fixed") {
        total -= coupon.discountValue; // Subtract fixed discount
      } else if (coupon.discountType === "percentage") {
        total -= (total * coupon.discountValue) / 100; // Apply percentage discount
      }
      const reducedAmount = temp - total;
      // Ensure total doesn't go below zero
      if (total < 0) total = 0;
  
      // Render the checkout page again with the new total
      res.render("checkout1", {
        addresses: await addressModel.find({ userId }),
        userDetails: await userModel.findOne({ _id: userId }),
        defaultAddress: await addressModel.findOne({ userId, isDefault: true }),
        products: cart.items.map((item) => ({
          name: item.productId.productName,
          price: item.productId.price,
          quantity: item.quantity,
          platform: item.platform,
        })),
        delivery,
        tax,
        total,
        subtotal,
        eligibleCoupons: await couponModel.find({
          isActive: true,
          expiresAt: { $gte: new Date() },
          minCartValue: { $lte: subtotal },
        }),
        reducedAmount,
        appliedCoupon: coupon, // Pass the applied coupon for display purposes
      });
    } catch (error) {
      console.error("Error applying coupon:", error);
      res.status(500).json({ message: "Server error" });
    }
  };

  const removeCoupon = async (req, res) => {
    try {
      const userId = req.session.user;
      const cart = await cartModel
        .findOne({ userId })
        .populate("items.productId");
  
      if (!cart) {
        return res.status(400).json({ message: "No items in cart" });
      }
  
      // Reset the total and other fields as needed
      const { subtotal, tax, delivery } = calculateCartTotals(cart);
  
      // Assuming you want to reset the applied coupon
      // Clear the applied coupon
  
      // Render the checkout page again with the updated total (without the coupon)
      res.render("checkout1", {
        addresses: await addressModel.find({ userId }),
        userDetails: await userModel.findOne({ _id: userId }),
        defaultAddress: await addressModel.findOne({ userId, isDefault: true }),
        products: cart.items.map((item) => ({
          name: item.productId.productName,
          price: item.productId.price,
          quantity: item.quantity,
          platform: item.platform,
        })),
        delivery,
        tax,
        total: subtotal + delivery + tax, // Reset total to subtotal
        subtotal,
        eligibleCoupons: await couponModel.find({
          isActive: true,
          expiresAt: { $gte: new Date() },
          minCartValue: { $lte: subtotal },
        }),
      });
    } catch (error) {
      console.error("Error removing coupon:", error);
      res.status(500).json({ message: "Server error" });
    }
  };

  module.exports={getCheckoutPage,
    checkoutLoad,
    applyCoupon,
    removeCoupon

  }