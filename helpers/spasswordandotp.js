const bcrypt = require('bcrypt')
//for hashing password
const securePassword = async (password) => {
    try {
      const passwordHash = await bcrypt.hash(password, 10);
      return passwordHash;
    } catch (error) {
      console.log("error hashing password :" + error);
    }
  };

//for otp generation
  function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  module.exports={securePassword,generateOTP}