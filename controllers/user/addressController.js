const userModel = require('../../models/userModel')

const addressModel = require('../../models/addressModel')


const addressManagementLoad = async (req, res) => {
    try {
      const userId = req.session.user;
      const user = await userModel.findOne({ _id: userId });
      const defaultAddress = await addressModel.find({
        $and: [{ userId: userId }, { isDefault: true }],
      });
      const check = req.query.check || false;
      if (!defaultAddress.length) {
        await addressModel.updateOne(
          { userId: userId },
          { $set: { isDefault: true } }
        );
      }
      const addresses = await addressModel.find({ userId });
      res.render("addressManagement", {
        userDetails: user,
        addresses: addresses,
        check,
      });
    } catch (error) {
      console.log("error in address management load :" + error);
    }
  };
  
  const addAddress = async (req, res) => {
    try {
      const {
        userId,
        street,
        city,
        state,
        postalCode,
        country,
        phoneNumber,
        check,
      } = req.body;
      let { isDefault } = req.body;
      isDefault = isDefault === "on" ? true : false;
      if (isDefault) {
        await addressModel.updateMany({}, { $set: { isDefault: false } });
      }
      const newAddress = new addressModel({
        userId,
        street,
        city,
        state,
        postalCode,
        country,
        phoneNumber,
        isDefault: isDefault,
      });
      await newAddress.save();
      // Add address to user's addresses array
      await userModel.findByIdAndUpdate(userId, {
        $push: { addresses: newAddress._id },
      });
      if (check) {
        return res.redirect("/checkout");
      }
      res.redirect("/addressManagement");
    } catch (error) {
      console.log("error adding address :" + error);
    }
  };
  const setDefaultAdress = async (req, res) => {
    try {
      const addressid = req.query.id;
      await addressModel.updateMany({}, { $set: { isDefault: false } });
      await addressModel.findOneAndUpdate(
        { _id: addressid },
        { $set: { isDefault: true } }
      );
      res.redirect("/addressManagement");
    } catch (error) {
      console.log("error setting default address :" + error);
    }
  };
  const editAddressLoad = async (req, res) => {
    try {
      const addressid = req.query.id;
      const userid = req.session.user;
      const user = await userModel.findOne({ _id: userid });
      const address = await addressModel.findOne({ _id: addressid });
      if (address) {
        res.render("editAddress", { address: address, userDetails: user });
      }
    } catch (error) {
      console.log("error loading edit address :" + error);
    }
  };
  const editAddress = async (req, res) => {
    try {
      const { addressid, street, city, state, postalCode, country, phoneNumber } =
        req.body;
      let { isDefault } = req.body;
      isDefault = isDefault === "on" ? true : false;
      if (isDefault) {
        await addressModel.updateMany({}, { $set: { isDefault: false } });
      }
      const userid = req.session.user;
      const updateAddress = await addressModel.updateOne(
        { _id: addressid },
        {
          $set: {
            street: street,
            userId: userid,
            city: city,
            state: state,
            postalCode: postalCode,
            country: country,
            phoneNumber: phoneNumber,
            isDefault: isDefault,
          },
        }
      );
      if (updateAddress) {
        return res.redirect("/addressManagement");
      }
      return res.status(500).json({ message: "Internal server error" });
    } catch (error) {
      console.log("error editing address :" + error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
  const deleteAddress = async (req, res) => {
    try {
      const addressid = req.query.id;
      const address = await addressModel.findOne({ _id: addressid });
      if (address.isDefault) {
        await addressModel.updateOne(
          { isDefault: false },
          { $set: { isDefault: true } }
        );
      }
      const deleteAddress = await addressModel.deleteOne({ _id: addressid });
      if (deleteAddress) {
        return res.redirect("/addressManagement");
      }
      res.status(500).json({ message: "Internal Server Error" });
    } catch (error) {
      console.log("error removing address :" + error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  };

  module.exports={
    addAddress,
    addressManagementLoad,
    deleteAddress,
    editAddress,
    editAddressLoad,
    setDefaultAdress
  }