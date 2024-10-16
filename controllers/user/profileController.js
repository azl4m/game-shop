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

  module.exports={
    editProfile,
    editProfileLoad,
    userProfileLoad
  }