const userModel = require('../../models/userModel')
const orderModel = require('../../models/orderModel')


//orders
const ordersLoad = async (req, res) => {
    try {
      const userid = req.session.user;
      const user = await userModel.findOne({ _id: userid });
      const orders = await orderModel.find({ user: userid });
      if (orders) {
        res.render("orderslisting", {
          userDetails: user,
          orders: orders,
          empty: false,
          moment,
        });
      }
    } catch (error) {
      console.log("Error at orders loading :" + error);
    }
  };
  
  const orderDetails = async (req, res) => {
    try {
      const orderid = req.query.id;
      const userid = req.session.user;
      const user = await userModel.findById(userid);
      const order = await orderModel.findOne({ _id: orderid }).populate({
        path: "cartItems.product",
        select: "productName images",
      });
  
      res.render("orderDetails", { userDetails: user, order: order, moment });
    } catch (error) {
      console.log("error loading order details :" + error);
      res.status(400).json({ message: "Internal Server Error" });
    }
  };
  //reuqest
  const requestReturn = async (req, res) => {
    try {
      const orderid = req.query.orderid;
      const product = req.query.product;
      // Update the `isReturned` field of the specific cart item in the order
      const update = await orderModel.updateOne(
        { _id: orderid, "cartItems.product": product }, // Match the order and the cart item by product ID
        { $set: { "cartItems.$.isReturned": true } } // Use the positional operator to update the specific item
      );
      return res.redirect(`/orderDetails?id=${orderid}`);
    } catch (error) {
      console.log("error requesting return  :" + error);
    }
  };
  //cancel
  const requestCancel = async (req, res) => {
    try {
      const orderid = req.query.id;
      const order = await orderModel.findByIdAndUpdate(orderid, {
        $set: { isCancelled: true },
      });
      return res.redirect("/orderDetails?id=" + orderid);
    } catch (error) {
      console.log("error at requestcancel :" + error.message);
    }
  };

  //order success
const orderSuccessLoad = async (req, res) => {
    try {
      const user = await userModel.findById(req.session.user);
      return res.render("orderSuccess", { userDetails: user });
    } catch (error) {
      console.log("error at success page");
      console.log(error);
    }
  };

  module.exports={
    orderDetails,
    orderSuccessLoad,
    requestCancel,
    requestReturn,
    ordersLoad
  }