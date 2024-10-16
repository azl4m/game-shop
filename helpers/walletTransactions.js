
const User = require('../models/userModel')



async function addWalletTransaction(userId, amount, type, description) {
    const user = await User.findById(userId);
  
    // Create the new transaction
    const newTransaction = {
      amount,
      type, // 'credit' or 'debit'
      description,
    };
  
    // Add the new transaction
    user.wallet.transactions.push(newTransaction);
  
    // If transactions exceed 10, remove the oldest one
    if (user.wallet.transactions.length > 10) {
      user.wallet.transactions.shift(); // Remove the first (oldest) transaction
    }
  
    // Update wallet balance
    user.wallet.balance += type === 'credit' ? amount : -amount;
  
    // Save the updated user
    await user.save();
  }
  
  module.exports={addWalletTransaction}