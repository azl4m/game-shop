const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const cartSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    offerPrice:{
      type:Number
    },
    quantity: {
      type: Number,
      required: true
    },
    platform:{
        type : String,
        enum:  ['PC', 'PS6', 'Steam', 'Xbox'],
        required : true
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Cart', cartSchema);
