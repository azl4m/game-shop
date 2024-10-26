const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema({
  username: {
    type: String,
    unique: true,
    required: true,
  },
  password: {
    type: String,
    required: false,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phoneNumber: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    default: null,
  },
  googleId: {
    type: String,
    unique: true,
    required: false,
    default: null,
    sparse: true,
  },
  firstName: {
    type: String,
    required: false,
    unique: false,
    sparse: true,
    default: null,
  },
  lastName: {
    type: String,
    required: false,
    unique: false,
    sparse: true,
    default: null,
  },
  addresses: [
    {
      type: Schema.Types.ObjectId,
      ref: "address",
    },
  ],
  isVerified: {
    type: Boolean,
    default: false,
  },

  isActive: {
    type: Boolean,
    default: true,
  },
  role: {
    type: String,
    enum: ["admin", "user"],
    required: true,
    default: "user",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  token: {
    type: String,
    default: "",
  },
  wallet: {
    balance: { type: Number, default: 0 }, // Current balance
    transactions: [
      {
        amount: Number,
        type: { type: String, enum: ["credit", "debit"] },
        date: { type: Date, default: Date.now },
        description: String,
      },
    ],
  },
  referralCode: {
    type: String,
    unique: true,
    index: true,
  },
  referredBy: {
    type: String, // This can store the referral code of the referrer
    index: true,
  },
});

const User = mongoose.model("User", userSchema);

module.exports = User;
