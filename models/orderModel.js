const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    cartItems: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
        platform: {
          type: String,
          required: true,
          enum: ["PC", "PS6", "Steam", "Xbox"],
        },
        isReturned: {
          type: Boolean,
          default: false,
        },
        returnAccepted: {
          type: String,
          default: "PENDING",
          enum: ["PENDING", "ACCEPTED", "REJECTED"],
        },
        returnTimeStamp: {
          pendingAt: { type: Date },
          acceptedAt: { type: Date },
          rejectedAt: { type: Date },
        },
        orderStatus: {
          type: String,
          enum: [
            "Pending",
            "Processing",
            "Shipped",
            "outForDelivery",
            "Delivered",
            "Cancelled",
            "Returned",
          ],
          default: "Pending",
        },
        statusTimestamps: {
          pendingAt: { type: Date },
          processingAt: { type: Date },
          shippedAt: { type: Date },
          outForDeliveryAt: { type: Date },
          deliveredAt: { type: Date },
          cancelledAt: { type: Date },
          returnedAt: { type: Date },
        },
        walletDeduction: {
          type: Number,
          default: 0,
        },
        tax:{
          type:Number,
          default:0
        },
        isCancelled:{
          type:Boolean,
          default:false
        },
        cancelAccepted: {
          type: String,
          default: "PENDING",
          enum: ["PENDING", "ACCEPTED", "REJECTED"],
        },
        cancelTimeStamp: {
          pendingAt: { type: Date },
          acceptedAt: { type: Date },
          rejectedAt: { type: Date },
        },
        tax:{
          type:Number,
          default:0
        },
        finalPrice:{
          type:Number,
        },
        offerDiscount:{
          type:Number,
          default:0
        },
        couponDiscount:{
          type:Number,
          default:0
        },
        offerPrice:{
          type:Number
        }
      },
    ],
    orderNumber: {
      type: String,
      unique: true,
      required: true,
    },
    shippingAddress: {
      name: { type: String, required: true },
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
      phoneNumber: { type: String, required: true },
    },
    paymentMethod: {
      type: String,
      enum: ["COD", "Razorpay"],
      default: "COD",
      required: true,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    orderStatus: {
      type: String,
      enum: [
        "Pending",
        "Processing",
        "Shipped",
        "outForDelivery",
        "Delivered",
        "Cancelled",
        "Returned",
      ],
      default: "Pending",
    },
    statusTimestamps: {
      pendingAt: { type: Date },
      processingAt: { type: Date },
      shippedAt: { type: Date },
      outForDeliveryAt: { type: Date },
      deliveredAt: { type: Date },
      cancelledAt: { type: Date },
      returnedAt: { type: Date },
    },
    orderDate: {
      type: Date,
      default: Date.now,
    },
    paymentStatus: {
      type: String,
      enum: ["Success", "Failed", "Pending"],
      default: "Pending",
    },
    paymentTimestamps: {
      successAt: { type: Date },
      failedAt: { type: Date },
      pendingAt: { type: Date },
    },
    paymentId: {
      type: String,
      required: false, // Optional, only needed for Razorpay
    },
    paymentDate: {
      type: Date,
      required: false, // Optional, only needed for Razorpay
    },
    isCancelled: {
      type: Boolean,
      default: false,
    },
    cancelAccepted: {
      type: Boolean,
      default: false,
    },
    couponUsed: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    discount: {
      type: Number,
      default: 0,
    },
    deliveryCharge: {
      type: Number,
      default: 0,
    },
    tax:{
      type:Number,
      default:0
    },
    walletDeduction: {
      type: Number,
      default: 0,
    },
    finalPrice:{
      type:Number,
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
