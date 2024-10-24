const mongoose = require("mongoose");
const { Schema } = mongoose;

const variantSchema = new mongoose.Schema({
  version: {
    type: String,
    required: true,
  },
  platform: {
    type: String,
    required: true,
    enum: ["PC", "PS6", "Steam", "Xbox"], // List of allowed platforms
  },
  stock: {
    type: Number,
    required: true,
  },
});

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to the User who made the review
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5, // Ratings are typically between 1 and 5
  },
  comment: {
    type: String,
    required: true, // Comment is required for the review
  },
  createdAt: {
    type: Date,
    default: Date.now, // Timestamp when the review was created
  },
});

const productSchema = new Schema({
  productName: {
    type: String,
    required: true,
  },
  description: { 
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  images: {
    type: [String],
    validate: {
      validator: function (array) {
        return array.length >= 3;
      },
      message: "A product must have at least 3 images.",
    },
    required: true,
  },
  variant: [variantSchema],
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  isListed: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: String,
  },
  updatedBy: {
    type: String,
  },
  offer: {
    type: { type: String, enum: ['percentage', 'flat'], required: false }, // Offer type: percentage or flat
    value: { type: Number, default: 0 }, // Discount value (percentage or flat amount)
    startDate: Date,
    endDate: Date,
  },
  reviews: [reviewSchema], // Embedded reviews schema
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Product", productSchema);
