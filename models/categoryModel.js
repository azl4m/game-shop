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
    }
    ,
    createdAt:{
        type : Date,
        default : Date.now
      },
      updatedAt : {
        type : Date,
        default : Date.now
      }
})

module.exports = mongoose.model('Category',categorySchema);