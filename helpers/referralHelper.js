const generateReferralCode = (userId) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const length = 6; // Length of the random part of the referral code
    let randomString = '';
  
    // Generate a random string
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      randomString += characters[randomIndex];
    }
  
    // Create a unique referral code by combining user ID and random string
    const referralCode = `${userId}-${randomString}`;
    return referralCode;
  };
  
module.exports={
    generateReferralCode
}