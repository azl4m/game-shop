const userModel = require('../../models/userModel')


//profile management
const userProfileLoad = async (req, res) => {
    try {
      const userid = req.session.user;
      const user = await userModel.findOne({ _id: userid });
      res.render("userProfile", {
        userDetails: user,
      });
    } catch (error) {
      console.log("error loading user profile :" + error);
    }
  };
  const editProfileLoad = async (req, res) => {
    try {
      const user = await userModel.findOne({ _id: req.session.user });
      if (!user) {
        return res.status(400).json({ error: "user not found" });
      }
      return res.render("editProfile", { userDetails: user });
    } catch (error) {
      console.log("error loading edit profile :" + error);
    }
  };
  const editProfile = async (req, res) => {
    try {
      const user = await userModel.findOne({ _id: req.session.user });
      const { username, phoneNumber, firstName, lastName } = req.body;
      const existingPhone = await userModel.findOne({ phoneNumber: phoneNumber });
      if (existingPhone) {
        if (existingPhone.phoneNumber !== user.phoneNumber) {
          return res.status(400).json({ message: "Phone Number alredy exists" });
        }
      }
      const updateUser = await userModel.updateOne(
        { _id: user._id },
        {
          $set: {
            username: username,
            firstName: firstName,
            lastName: lastName,
            phoneNumber: phoneNumber,
          },
        }
      );
  
      if (!updateUser) {
        return res.status(400).json({ message: "Updating failed" });
      }
      return res.status(200).json({ message: "updation succesfull" });
    } catch (error) {
      console.log("error editing profile :" + error);
    }
  };

    //wallet
  // walletController.js
  const loadWalletPage = async (req, res) => {
    try {
      const userId = req.session.user;
      const user = await userModel.findById(userId);
  
      if (!user) {
        return res.status(404).render("wallet", {
          walletBalance: 0,
          message: "User not found",
        });
      }
  
      // Render the wallet page with the user's current wallet balance
      res.render("wallet", {
        userDetails: user,
      });
    } catch (error) {
      console.log("Error loading wallet page: " + error);
      res
        .status(500)
        .render("wallet", { walletBalance: 0, message: "Internal Server Error" });
    }
  };
  
  // wallet ad
  const addToWallet = async (req, res) => {
    try {
      const userId = req.session.user;
      const { amount } = req.body;
  
      if (!userId) {
        return res.status(400).json({ message: "User not logged in" });
      }
  
      const user = await userModel.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
  
      // Validate amount
      if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }
  
      // Update wallet balance
      user.wallet = (user.wallet || 0) + Number(amount);
      await user.save();
  
      return res
        .status(200)
        .json({ message: "Money added successfully", wallet: user.wallet });
    } catch (error) {
      console.log("Error adding money to wallet: " + error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  };

  module.exports={
    editProfile,
    editProfileLoad,
    userProfileLoad,
    loadWalletPage,
    addToWallet
  }