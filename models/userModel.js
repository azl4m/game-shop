const mongoose = require('mongoose')
const {Schema} = mongoose

const userSchema = new Schema({
    username:{
        unique : true,
        required : true
    },
    password:{
        type : String,
        required : true,
        unique:true
    },
    email:{
        type : String,
        required : true,
        unique : true
    },
    phoneNumber:{
        type : String,
        required : false,
        unique : true,
        sparse : true,
        default:null
    },
    googleId:{
        type : String,
        unique : true
    },
    firstName:{
        type : String,
        required : false,
        unique : false,
        sparse : true,
        default:null
    },
    lastName:{
        type : String,
        required : false,
        unique : false,
        sparse : true,
        default:null
    },
    isActice:{
        type:Boolean,
        default : true
    },
    role: {
        type: String,
        enum: ['admin', 'user'], 
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
      },
    updatedAd:{
        type : Date,
        default : Date.now
    }
})

const User = mongoose.model('User', userSchema);

module.exports = User;
