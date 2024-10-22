const userModel = require("../../models/userModel");
const cartModel = require("../../models/cartModel");
const orderModel = require("../../models/orderModel");
const couponModel = require("../../models/couponModel");
const addressModel = require("../../models/addressModel");
const razorpay = require("razorpay");
const razorpayInstance = require("../../config/razorpay");
const paymentTimeStamp = require("../../helpers/paymentTimeStamp");
const walletHelper = require("../../helpers/walletTransactions")
function isOfferValid(offer, currentDate) {
  if (!offer) return false;
  if (offer.startDate && offer.endDate) {
    return currentDate >= new Date(offer.startDate) && currentDate <= new Date(offer.endDate);
  }
  return false;
}
function calculateDiscount(offer, price) {
  let discount = 0;
  if (offer.type === 'percentage') {
    discount = (price * offer.value) / 100;
  } else if (offer.type === 'flat') {
    discount = offer.value;
  }
  return discount;
}


//cart value calculation
const calculateCartTotals = (cart, totalDiscount) => {
  let subtotal = 0;

  // Loop through the items in the cart and calculate the subtotal
  cart.items.forEach((item) => {
    const price = item.productId.price || 0;
    const quantity = item.quantity || 0;

    subtotal += price * quantity; // Calculate subtotal
  });

  // Subtract the total discount from the subtotal
  subtotal -= totalDiscount;

  const tax = Math.floor(subtotal * 0.10); // Apply tax on the discounted subtotal
  let total = Math.floor(subtotal + tax);
  let delivery = 0;

  // Add delivery charges if applicable
  if (total < 2000) {
    delivery = 150;
  }

  if (delivery) {
    total += delivery;
  }

  return { subtotal, tax, total, delivery };
};


const getCheckoutPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await userModel.findOne({ _id: userId });
    const cart = await cartModel
      .findOne({ userId: userId })
      .populate({
        path: 'items.productId',
        populate: {
          path: 'category', // Populate the category inside product schema
          model: 'Category',
        },
      });

    if (!cart) {
      return res.status(400).json({ message: "No items in cart" });
    }

    let totalDiscount = 0;  // Initialize total discount
    const currentDate = new Date();

    const products = cart.items.map((item) => {
      let productPrice = item.productId.price;
      let productDiscount = 0;
      let categoryDiscount = 0;

      // Check for product-specific offer
      if (item.productId.offer && isOfferValid(item.productId.offer, currentDate)) {
        productDiscount = calculateDiscount(item.productId.offer, productPrice);
      }

      // Check for category-level offer if no product offer is available or category offer is higher
      if (item.productId.category && isOfferValid(item.productId.category.offer, currentDate)) {
        categoryDiscount = calculateDiscount(item.productId.category.offer, productPrice);
      }

      // Apply whichever is the higher discount
      const highestDiscount = Math.max(productDiscount, categoryDiscount);
      totalDiscount += highestDiscount * item.quantity; // Accumulate discount for each item

      return {
        name: item.productId.productName,
        price: productPrice,
        quantity: item.quantity,
        platform: item.platform,
        discount: highestDiscount,  // Show applied discount
        finalPrice: productPrice - highestDiscount,  // Calculate final price after discount
      };
    });

    const addresses = await addressModel.find({ userId });
    const defaultAddress = await addressModel.findOne({ isDefault: true });

    // Now pass totalDiscount to calculateCartTotals function to adjust before tax
    const { subtotal, tax, total, delivery } = calculateCartTotals(cart, totalDiscount);

    // Fetch eligible coupons (coupons that haven't expired and meet the minCartValue requirement)
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
      total: total, // Total price after applying the discount and tax
      subtotal: subtotal,
      totalDiscount: totalDiscount,  // Pass total discount to the template
      eligibleCoupons: eligibleCoupons,
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
      select: "price name category offer",
      populate: {
        path: "category",
        select: "offer", // Get category offer details
      },
    });

    const addressid = req.body.address;
    const address = await addressModel.findOne({ _id: addressid });

    if (!address) {
      return res.status(400).json({ message: "Address not found" });
    }

    if (!cart) {
      return res.status(400).json({ message: "No cart found" });
    }

    const { fname, paymentMode, delivery } = req.body;
    let { reducedAmount, couponCode } = req.body;

    const reducedAmountFinal = reducedAmount || 0;
    const couponCodeFinal = couponCode || null;

    // Function to calculate total price with offers
    let totalPrice = 0;
    const currentDate = new Date(); // Current date to check offer validity

    const cartItems = cart.items.map((item) => {
      if (!item.productId || !item.productId.price) {
        throw new Error("Cart item missing product or price information");
      }

      let productPrice = item.productId.price;
      let productDiscount = 0;
      let categoryDiscount = 0;

      // Check product-specific offer
      if (
        item.productId.offer &&
        isOfferValid(item.productId.offer, currentDate)
      ) {
        productDiscount = calculateDiscount(item.productId.offer, productPrice);
      }

      // Check category-level offer
      if (
        item.productId.category &&
        isOfferValid(item.productId.category.offer, currentDate)
      ) {
        categoryDiscount = calculateDiscount(
          item.productId.category.offer,
          productPrice
        );
      }

      // Apply the higher discount (product or category)
      const discount = Math.max(productDiscount, categoryDiscount);
      const finalProductPrice = productPrice - discount;
      totalPrice += finalProductPrice * item.quantity;
      totalPrice += finalProductPrice *0.1* item.quantity

      return {
        product: item.productId._id,
        price: finalProductPrice, // Price after applying offer
        quantity: item.quantity,
        platform: item.platform,
        offerApplied: discount, // Record the discount applied
      };
    });
    console.log(totalPrice);
   
    // Subtract any coupon-based discount from the total price
    totalPrice -= reducedAmountFinal;
    if(totalPrice<2000){
      totalPrice+=150 
    }
    totalPrice = parseInt(totalPrice)
    if(req.session.wallet){
      totalPrice -= req.session.wallet
    }
    const walletUsed = req.session.wallet || 0 ;
    // Function to generate unique order number
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

    const orderNumber = generateUniqueOrder();

    // Handling COD payment method
    if (paymentMode === "cod") {
      await walletHelper.addWalletTransaction(userId,walletUsed,"debit",`Wallet amount debited for order :${orderNumber} `)
      const order = new orderModel({
        user: userId,
        orderStatus: "Processing",
        orderNumber: orderNumber,
        cartItems: cartItems,
        totalPrice: totalPrice+walletUsed,
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
        deliveryCharge: delivery,
        walletDeduction:walletUsed
      });

      const saveOrder = await order.save();
      await paymentTimeStamp.statusTime(saveOrder.orderStatus, saveOrder._id);
      await paymentTimeStamp.paymentStatusTime(
        saveOrder.paymentStatus,
        saveOrder._id
      );
      await cartModel.findOneAndDelete({ userId });

      return res.status(200).json({ message: "Checkout successful",orderId:order._id });
    }

    // Handling Razorpay payment method
    if (paymentMode === "razorpay") {
      const razorpayOrder = await razorpayInstance.orders.create({
        amount: totalPrice * 100, // Razorpay accepts amount in paise
        currency: "INR",
        receipt: orderNumber,
        payment_capture: 1,
      });

      const order = new orderModel({
        user: userId,
        orderNumber: orderNumber,
        cartItems: cartItems,
        totalPrice: totalPrice+walletUsed,
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
        deliveryCharge: delivery,
        walletDeduction:walletUsed
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
        amount: totalPrice * 100, // Send the final amount
        orderId: order._id,
        name: fname,
      });
    }

    return res.status(400).json({ message: "Invalid Payment Method" });
  } catch (error) {
    console.log("Error at checkout load:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const applyCoupon = async (req, res) => {
  try {
    const userId = req.session.user;
    const couponId = req.body.couponId; // Get coupon ID from the form
    if(!couponId){
      return res.redirect("/checkout")
    }
    const cart = await cartModel
      .findOne({ userId })
      .populate({
        path: 'items.productId',
        populate: {
          path: 'category', // Populate the category inside the product schema
          model: 'Category',
        },
      });

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

    // Calculate product and category offers
    let totalDiscount = 0; // Initialize total discount from offers
    const currentDate = new Date();

    const products = cart.items.map((item) => {
      let productPrice = item.productId.price;
      let productDiscount = 0;
      let categoryDiscount = 0;

      // Check for product-specific offer
      if (item.productId.offer && isOfferValid(item.productId.offer, currentDate)) {
        productDiscount = calculateDiscount(item.productId.offer, productPrice);
      }

      // Check for category-level offer if no product offer is available or category offer is higher
      if (item.productId.category && isOfferValid(item.productId.category.offer, currentDate)) {
        categoryDiscount = calculateDiscount(item.productId.category.offer, productPrice);
      }

      // Apply whichever is the higher discount
      const highestDiscount = Math.max(productDiscount, categoryDiscount);
      totalDiscount += highestDiscount * item.quantity; // Accumulate discount for each item

      return {
        name: item.productId.productName,
        price: productPrice,
        quantity: item.quantity,
        platform: item.platform,
        discount: highestDiscount,  // Show applied discount
        finalPrice: productPrice - highestDiscount,  // Calculate final price after discount
      };
    });

    // Calculate the cart totals after applying offers
    let { subtotal, tax, delivery, total } = calculateCartTotals(cart, totalDiscount);

    // Calculate the new total based on the coupon type
    let tempTotal = total; // Store the total before applying the coupon
    let reducedAmount = 0; // Initialize reducedAmount

    if (coupon.discountType === "fixed") {
      total -= coupon.discountValue; // Subtract fixed discount
      reducedAmount = coupon.discountValue;
    } else if (coupon.discountType === "percentage") {
      reducedAmount = (total * coupon.discountValue) / 100;
      total -= reducedAmount; // Apply percentage discount
    }

    // Ensure total doesn't go below zero
    if (total < 0) total = 0;

    // Render the checkout page again with the new total after applying offers and coupon
    res.render("checkout1", {
      addresses: await addressModel.find({ userId }),
      userDetails: await userModel.findOne({ _id: userId }),
      defaultAddress: await addressModel.findOne({ userId, isDefault: true }),
      products: products, // Pass updated products with applied discounts
      delivery,
      tax,
      total, // Total price after applying offers and coupon
      subtotal,
      totalDiscount,  // Total discount from product and category offers
      eligibleCoupons: await couponModel.find({
        isActive: true,
        expiresAt: { $gte: new Date() },
        minCartValue: { $lte: subtotal },
      }),
      reducedAmount, // Coupon discount applied
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
      .populate({
        path: 'items.productId',
        populate: {
          path: 'category', // Populate the category inside the product schema
          model: 'Category',
        },
      });

    if (!cart) {
      return res.status(400).json({ message: "No items in cart" });
    }

    // Calculate product and category offers
    let totalDiscount = 0; // Initialize total discount from offers
    const currentDate = new Date();

    const products = cart.items.map((item) => {
      let productPrice = item.productId.price;
      let productDiscount = 0;
      let categoryDiscount = 0;

      // Check for product-specific offer
      if (item.productId.offer && isOfferValid(item.productId.offer, currentDate)) {
        productDiscount = calculateDiscount(item.productId.offer, productPrice);
      }

      // Check for category-level offer if no product offer is available or category offer is higher
      if (item.productId.category && isOfferValid(item.productId.category.offer, currentDate)) {
        categoryDiscount = calculateDiscount(item.productId.category.offer, productPrice);
      }

      // Apply whichever is the higher discount
      const highestDiscount = Math.max(productDiscount, categoryDiscount);
      totalDiscount += highestDiscount * item.quantity; // Accumulate discount for each item

      return {
        name: item.productId.productName,
        price: productPrice,
        quantity: item.quantity,
        platform: item.platform,
        discount: highestDiscount, // Show applied discount
        finalPrice: productPrice - highestDiscount, // Calculate final price after discount
      };
    });

    // Recalculate the cart totals after removing the coupon and applying offers
    let { subtotal, tax, delivery, total } = calculateCartTotals(cart, totalDiscount);

    // Render the checkout page again with the updated total (without the coupon)
    res.render("checkout1", {
      addresses: await addressModel.find({ userId }),
      userDetails: await userModel.findOne({ _id: userId }),
      defaultAddress: await addressModel.findOne({ userId, isDefault: true }),
      products: products, // Pass updated products with applied discounts
      delivery,
      tax,
      total, // Total price after removing the coupon and applying only offers
      subtotal,
      totalDiscount, // Total discount from product and category offers
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

 const applyWalletBalance = async (req, res) => {
  try {
    const userId = req.session.user;
    const { reducedAmount,totalPrice } = req.body;
    req.session.wallet = reducedAmount
    // Fetch the user's wallet balance and cart
    const user = await userModel.findOne({ _id: userId });
    const cart = await cartModel.findOne({ userId });

    if (!user || !cart) {
      return res.status(400).json({ success: false, message: "User or cart not found." });
    }

    const walletBalance = user.wallet.balance;

    // Check if the wallet has enough balance
    if (walletBalance < reducedAmount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient wallet balance.",
      });
    }

    // Calculate the new total price after applying the wallet deduction
    const updatedTotal = totalPrice - reducedAmount;

    // // Deduct the amount from the user's wallet
    // user.wallet.balance -= reducedAmount;
    // await user.save();

    // Respond with the updated total price
    res.status(200).json({
      success: true,
      updatedTotal: updatedTotal,
    });
  } catch (error) {
    console.error("Error applying wallet balance:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

module.exports = { applyWalletBalance,getCheckoutPage, checkoutLoad, applyCoupon, removeCoupon };
