const mongoose = require('mongoose');

const referralOfferSchema = new mongoose.Schema({
    referralAmount: {
        type: Number,
        required: true,
        default:100 // Amount credited when a referral is successful
    },
    isActive: {
        type: Boolean,
        default: true, 
    }
},{timestamps:true});

module.exports = mongoose.model('ReferralOffer', referralOfferSchema);