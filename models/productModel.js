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
});

module.exports = mongoose.model("Product", productSchema);
