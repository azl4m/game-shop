const mongoose = require('mongoose')
const {Schema} = mongoose

const variantSchema = new mongoose.Schema({
    version: {
      type: String,
      required: true
    },
    platforms: {
      type: [String], 
      required: true,
      enum: ['PC', 'PS5', 'PS6', 'Xbox', 'Steam'] // List of allowed platforms
    }
  });

const productSchema = new Schema({
    productName : {
        type : String,
        required : true
    },
    description :{
        type : String,
        required : true,
    },
    images: {
        type: [String], 
        validate: {
          validator: function(array) {
            return array.length >= 3;
          },
          message: 'A product must have at least 3 images.'
        },
        required: true
      },
      variant: [variantSchema],
      createdAt:{
        type : Date,
        default : Date.now
      },
      updatedAt : {
        type : Date,
        default : Date.now
      },
      createdBy :{
        type : String,
      },
      updatedBy : {
        type : String
      }
})

module.exports = mongoose.model('Product', productSchema);