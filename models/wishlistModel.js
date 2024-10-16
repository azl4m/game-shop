const mongoose = require('mongoose')
const wishlistSchema = new mongoose.Schema({
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        platform:{
          type:String,
          enum: ["PC", "PS6", "Steam", "Xbox"],
          required:true
        }
        ,
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  });
  
  module.exports = mongoose.model('Wishlist', wishlistSchema);
  