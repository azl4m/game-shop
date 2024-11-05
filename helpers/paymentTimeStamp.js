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

const statusTimeIndex = async (status, id, index) => {
  try {
    let updateQuery = {};

    // Determine the correct field based on the status
    switch (status) {
      case "Pending":
        updateQuery[`cartItems.${index}.statusTimestamps.pendingAt`] = new Date();
        break;
      case "Processing":
        updateQuery[`cartItems.${index}.statusTimestamps.processingAt`] = new Date();
        break;
      case "Shipped":
        updateQuery[`cartItems.${index}.statusTimestamps.shippedAt`] = new Date();
        break;
      case "outForDelivery":
        updateQuery[`cartItems.${index}.statusTimestamps.outForDeliveryAt`] = new Date();
        break;
      case "Delivered":
        updateQuery[`cartItems.${index}.statusTimestamps.deliveredAt`] = new Date();
        break;
      case "Cancelled":
        updateQuery[`cartItems.${index}.statusTimestamps.cancelledAt`] = new Date();
        break;
      case "Returned":
        updateQuery[`cartItems.${index}.statusTimestamps.returnedAt`] = new Date();
        break;
      default:
        console.log("No status matched");
        return;
    }

    // Update the specific cart item at the given index in the cartItems array
    await Order.findByIdAndUpdate(id, {
      $set: updateQuery,
    });
  } catch (error) {
    console.log("Error in status time update: " + error.message);
  }
};
const statusAndTimeStamp = async (status, id) => {
  try {
    switch (status) {
      case "Pending":
        await Order.findByIdAndUpdate(
          id,
          { $set: { "cartItems.$[].statusTimestamps.pendingAt": new Date() } },
          { upsert: true }
        );
        break;
      case "Processing":
        await Order.findByIdAndUpdate(
          id,
          {
            $set: {
              "cartItems.$[].orderStatus": "Processing",
              "cartItems.$[].statusTimestamps.processingAt": new Date(),
            },
          },
          { upsert: true }
        );
        break;
      case "Shipped":
        await Order.findByIdAndUpdate(
          id,
          {
            $set: {
              "cartItems.$[].orderStatus": "Shipped",
              "cartItems.$[].statusTimestamps.shippedAt": new Date(),
            },
          },

          { upsert: true }
        );
        break;
      case "outForDelivery":
        await Order.findByIdAndUpdate(
          id,
          {
            $set: {
              "cartItems.$[].orderStatus": "OutForDelivery",
              "cartItems.$[].statusTimestamps.outForDeliveryAt": new Date(),
            },
          },
          { upsert: true }
        );
        break;
      case "Delivered":
        await Order.findByIdAndUpdate(
          id,
          {
            $set: {
              "cartItems.$[].orderStatus": "Delivered",
              "cartItems.$[].statusTimestamps.deliveredAt": new Date(),
            },
          },

          { upsert: true }
        );
        break;
      case "Cancelled":
        await Order.findByIdAndUpdate(
          id,
          {
            $set: {
              "cartItems.$[].orderStatus": "Cancelled",
              "cartItems.$[].statusTimestamps.cancelledAt": new Date(),
            },
          },

          { upsert: true }
        );
        break;
      case "Returned":
        await Order.findByIdAndUpdate(
          id,
          {
            $set: {
              "cartItems.$[].orderStatus": "Returned",
              "cartItems.$[].statusTimestamps.returnedAt": new Date(),
            },
          },

          { upsert: true }
        );
        break;
      default:
        console.log("no status matched");
    }
  } catch (error) {
    console.log("error in statuse time stamp " + error.message);
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
        updateQuery[`cartItems.${index}.returnTimeStamp.pendingAt`] =
          new Date();
        updateQuery[`cartItems.${index}.returnAccepted`] = "PENDING";
        break;

      case "ACCEPTED":
        // Update the accepted timestamp for the specific cart item
        updateQuery[`cartItems.${index}.returnTimeStamp.acceptedAt`] =
          new Date();
        updateQuery[`cartItems.${index}.returnAccepted`] = "ACCEPTED";
        break;

      case "REJECTED":
        // Update the rejected timestamp for the specific cart item
        updateQuery[`cartItems.${index}.returnTimeStamp.rejectedAt`] =
          new Date();
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
const cacnelStatusTime = async (status, id, index) => {
  try {
    let updateQuery = {};

    switch (status) {
      case "PENDING":
        // Update the pending timestamp for the specific cart item
        updateQuery[`cartItems.${index}.cancelTimeStamp.pendingAt`] =
          new Date();
        updateQuery[`cartItems.${index}.cancelAccepted`] = "PENDING";
        break;

      case "ACCEPTED":
        // Update the accepted timestamp for the specific cart item
        updateQuery[`cartItems.${index}.cancelTimeStamp.acceptedAt`] =
          new Date();
        updateQuery[`cartItems.${index}.cancelAccepted`] = "ACCEPTED";
        break;

      case "REJECTED":
        // Update the rejected timestamp for the specific cart item
        updateQuery[`cartItems.${index}.cancelTimeStamp.rejectedAt`] =
          new Date();
        updateQuery[`cartItems.${index}.cancelAccepted`] = "REJECTED";
        break;

      default:
        throw new Error("Invalid cancel status");
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
  returnStatusTime,
  statusAndTimeStamp,
  cacnelStatusTime,
  statusTimeIndex
};
