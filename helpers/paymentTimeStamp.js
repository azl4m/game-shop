const Order = require("../models/orderModel");

const statusTime = async (status, id) => {
  try {
    switch (status) {
      case "Pending":
        await Order.findByIdAndUpdate(
          id,
          { $set: { "statusTimestamps.pendingAt": new Date() } },
          { upsert: true }
        );
        break;
      case "Processing":
        await Order.findByIdAndUpdate(
          id,
          { $set: { "statusTimestamps.processingAt": new Date() } },
          { upsert: true }
        );
        break;
      case "Shipped":
        await Order.findByIdAndUpdate(
          id,
          { $set: { "statusTimestamps.shippedAt": new Date() } },
          { upsert: true }
        );
        break;
      case "outForDelivery":
        await Order.findByIdAndUpdate(
          id,
          { $set: { "statusTimestamps.outForDeliveryAt": new Date() } },
          { upsert: true }
        );
        break;
      case "Delivered":
        await Order.findByIdAndUpdate(
          id,
          { $set: { "statusTimestamps.deliveredAt": new Date() } },
          { upsert: true }
        );
        break;
      case "Cancelled":
        await Order.findByIdAndUpdate(
          id,
          { $set: { "statusTimestamps.cancelledAt": new Date() } },
          { upsert: true }
        );
        break;
      case "Returned":
        await Order.findByIdAndUpdate(
          id,
          { $set: { "statusTimestamps.returnedAt": new Date() } },
          { upsert: true }
        );
        break;
      default:
        console.log("no status matched");
    }
  } catch (error) {
    console.log("error in statuse time stapm " + error.message);
  }
};

const paymentStatusTime = async (status, id) => {
  try {
    switch (status) {
      case "Success":
        await Order.findByIdAndUpdate(
          id,
          { $set: { "paymentTimestamps.successAt": new Date() } },
          { upsert: true }
        );
        break;
      case "Failed":
        await Order.findByIdAndUpdate(
          id,
          { $set: { "paymentTimestamps.failedAt": new Date() } },
          { upsert: true }
        );
        break;
      case "Pending":
        await Order.findByIdAndUpdate(
          id,
          { $set: { "paymentTimestamps.pendingAt": new Date() } },
          { upsert: true }
        );
        break;
      default:
        console.log("no status matched");
    }
  } catch (error) {
    console.log("error in payment status time stamp :" + error.message);
  }
};

const returnStatusTime = async (status, id, index) => {
    try {
      let updateQuery = {};
  
      switch (status) {
        case "PENDING":
          // Update the pending timestamp for the specific cart item
          updateQuery[`cartItems.${index}.returnTimeStamp.pendingAt`] = new Date();
          updateQuery[`cartItems.${index}.returnAccepted`] = "PENDING";
          break;
  
        case "ACCEPTED":
          // Update the accepted timestamp for the specific cart item
          updateQuery[`cartItems.${index}.returnTimeStamp.acceptedAt`] = new Date();
          updateQuery[`cartItems.${index}.returnAccepted`] = "ACCEPTED";
          break;
  
        case "REJECTED":
          // Update the rejected timestamp for the specific cart item
          updateQuery[`cartItems.${index}.returnTimeStamp.rejectedAt`] = new Date();
          updateQuery[`cartItems.${index}.returnAccepted`] = "REJECTED";
          break;
  
        default:
          throw new Error("Invalid return status");
      }
  
      // Update the order with the new timestamp for the specified cart item
      await Order.findByIdAndUpdate(id, {
        $set: updateQuery,
      });
  
    } catch (error) {
      console.error("Error updating return status: ", error);
    }
  };
  
module.exports = {
  statusTime,
  paymentStatusTime,
  returnStatusTime
};
