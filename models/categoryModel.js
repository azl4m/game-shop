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
      }
})

module.exports = mongoose.model('Category',categorySchema);