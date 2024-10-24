const mongoose = require('mongoose');

// Define the schema for ReferralOffer
const referralOfferSchema = new mongoose.Schema({
    referralAmount: {
        type: Number,
        required: true,
        default: 100 // Amount credited when a referral is successful
    },
    isActive: {
        type: Boolean,
        default: true, 
    }
}, {
    capped: { size: 1024 }, // Small size because we only want one document
    timestamps: true
});

// Pre-save hook to remove existing document and save the new one
referralOfferSchema.pre('save', async function (next) {
    const ReferralOffer = mongoose.model('ReferralOffer');

    // Find if an existing document exists
    const existingOffer = await ReferralOffer.findOne();

    if (existingOffer) {
        // Remove the existing document
        await ReferralOffer.deleteOne({ _id: existingOffer._id });
    }

    // Proceed with saving the new document
    next();
});

module.exports = mongoose.model('ReferralOffer', referralOfferSchema);
