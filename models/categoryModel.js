const mongoose = require('mongoose')
const {Schema} = mongoose

const categorySchema = new Schema({
    categoryName:{
        type:String,
        required:true,
        unique:true
    },
    isListed:{
      type:Boolean,
      default:true
    },
    isDeleted:{
      type:Boolean,
      default:false
    }
    ,
    createdAt:{
        type : Date,
        default : Date.now
      },
      updatedAt : {
        type : Date,
        default : Date.now
      },
      offer: {
        type: { type: String, enum: ['percentage', 'flat'], required: false }, // Offer type: percentage or flat
        value: { type: Number, default: 0 }, // Discount value (percentage or flat amount)
        startDate: Date,
        endDate: Date,
      },
})

module.exports = mongoose.model('Category',categorySchema);