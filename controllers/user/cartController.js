const productModel = require('../../models/productModel')
const userModel = require('../../models/userModel')
const cartModel = require('../../models/cartModel')
const addressModel = require('../../models/addressModel')
//cart value calculation
const calculateCartTotals = (cart) => {
  let subtotal = 0;

  // Loop through the items in the cart and calculate the subtotal
  cart.items.forEach((item) => {
    const price = item.productId.price || 0;
    const quantity = item.quantity || 0;

    subtotal += price * quantity; // Calculate subtotal
  });

  const tax = Math.floor(subtotal * 0.18); //  18% tax rate
  let total = Math.floor(subtotal + tax);
  let delivery = 0;
  if (total < 2000) {
    delivery = 150;
  }
  if (delivery) {
    total += delivery;
  }

  return { subtotal, tax, total, delivery };
};

// Add to cart
const addToCart = async (req, res) => {
    try {
      const productId = req.query.id;
      const quantity = parseInt(req.query.quantity);
      const platform = req.query.platform;
      const userId = req.session.user;
  
      // Find the product and selected platform variant
      const product = await productModel.findById(productId);
  
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
  
      // Find the specific variant for the selected platform
      const selectedVariant = product.variant.find(
        (variant) => variant.platform === platform
      );
  
      if (!selectedVariant) {
        return res
          .status(400)
          .json({ message: "Selected platform not available" });
      }
  
      // Check if the requested quantity is available in stock
      if (selectedVariant.stock < quantity) {
        return res.status(400).json({ message: "Not enough stock available" });
      }
  
      let cart = await cartModel.findOne({ userId: userId });
  
      if (cart) {
        const itemIndex = cart.items.findIndex(
          (item) =>
            item.productId.toString() === productId && item.platform === platform
        );
  
        if (itemIndex > -1) {
          // If the item already exists in the cart, increase the quantity
          const currentQuantity = cart.items[itemIndex].quantity;
  
          if (selectedVariant.stock < currentQuantity + quantity) {
            return res.status(400).json({
              message: `Only ${selectedVariant.stock} units available in stock`,
            });
          }
  
          cart.items[itemIndex].quantity += quantity;
        } else {
          // If the item is not in the cart, add it to the cart
          cart.items.push({ productId, quantity, platform });
        }
  
        cart.updatedAt = Date.now();
        await cart.save();
      } else {
        // If cart does not exist, create a new one
        cart = new cartModel({
          userId,
          items: [{ productId, quantity, platform }],
        });
        await cart.save();
      }
  
      // Deduct the quantity from the stock of the selected platform
      selectedVariant.stock -= quantity;
      await product.save();
  
      res.status(200).json({
        message: "Product added to cart",
        redirectUrl: `/productDetails?id=${productId}`,
      });
    } catch (error) {
      console.log("error at add to cart :" + error);
      return res.status(500).json({ message: error.message });
    }
  };

  //get cart
const cartLoad = async (req, res) => {
    try {
      const userId = req.session.user;
      const user = await userModel.findOne({ _id: userId });
      let cartIsEmpty = true;
      if (user) {
        // Fetch the cart for the user
        const cart = await cartModel.findOne({ userId: userId }).populate({
          path: "items.productId",
          model: "Product",
          select: "productName images price", // Include only necessary fields
        });
  
        if (cart) {
          cartIsEmpty = false;
          const { subtotal, tax, total, delivery } = calculateCartTotals(cart);
          // Extract product IDs and quantity for further use
          const items = cart.items.map((item) => ({
            productId: item.productId._id,
            quantity: item.quantity,
            productName: item.productId.productName,
            images: item.productId.images,
            price: item.productId.price,
            platform: item.platform,
          }));
  
          res.render("cart", {
            cart: cart,
            items: items,
            userDetails: user,
            subtotal: subtotal,
            tax: tax,
            total: total,
            deliveryCharge: delivery,
            empty: cartIsEmpty,
            message: "",
          });
        } else {
          res.render("cart", {
            cart: "",
            items: "",
            userDetails: "",
            subtotal: "",
            tax: "",
            total: "",
            deliveryCharge: "",
            message: "Cart is empty",
            empty: cartIsEmpty,
          });
        }
      } else {
        res.status(400).json({ message: "User not found" });
      }
    } catch (error) {
      console.log("error loading cart :" + error);
      res.status(500).json({ message: "Internal server error" });
    }
  };

  // Remove from cart
const removeFromCart = async (req, res) => {
    try {
      const { itemId, platform } = req.body;
      const userId = req.session.user;
      // Find the user's cart
      const cart = await cartModel.findOne({ userId });
      if (!cart) {
        return res.status(404).json({ message: "Cart is empty" });
      }
  
      // Find the item in the cart to get the quantity to update stock
      const itemToRemove = cart.items.find(
        (item) =>
          item.productId.toString() === itemId && item.platform === platform
      );
      if (!itemToRemove) {
        return res.status(404).json({ message: "Item not found in cart" });
      }
  
      const product = await productModel.findById(itemToRemove.productId);
  
      // Find the variant for the selected platform to increase the stock
      const selectedVariant = product.variant.find(
        (variant) => variant.platform === platform
      );
  
      if (!selectedVariant) {
        return res.status(400).json({
          message: "Platform not found for this product",
        });
      }
  
      // Increase stock by the quantity of the item being removed
      selectedVariant.stock += itemToRemove.quantity;
  
      // Update the product with the increased stock
      await product.save();
  
      // Remove the item from the cart
      cart.items = cart.items.filter(
        (item) =>
          !(item.productId.toString() === itemId && item.platform === platform)
      );
  
      // If the cart is empty after removing the item, delete the cart
      if (!cart.items.length) {
        await cartModel.deleteOne({ userId: userId });
        return res.redirect("/");
      }
  
      // Save the updated cart
      await cart.save();
      res.redirect("/cart");
    } catch (error) {
      console.log("Error removing item from cart:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };


  const updateCartQuantity = async (req, res) => {
    try {
      const { itemId, newQuantity, platform } = req.body;
      const userId = req.session.user;
  
      // Find the user's cart
      const cart = await cartModel.findOne({ userId });
      if (!cart) {
        return res.status(404).json({ message: "Cart not found" });
      }
  
      // Find the item in the cart
      const itemIndex = cart.items.findIndex(
        (item) =>
          item.productId.toString() === itemId && item.platform === platform
      );
      if (itemIndex === -1) {
        return res.status(404).json({ message: "Item not found in cart" });
      }
  
      const product = await productModel.findById(itemId);
  
      // Find the variant for the selected platform
      const selectedVariant = product.variant.find(
        (variant) => variant.platform === platform
      );
  
      if (!selectedVariant) {
        return res.status(400).json({
          message: "Platform not found for this product",
        });
      }
  
      // Calculate the difference between old quantity and new quantity
      const oldQuantity = cart.items[itemIndex].quantity;
      const quantityDifference = newQuantity - oldQuantity;
  
      // Check if the new quantity exceeds the available stock
      if (quantityDifference > 0 && quantityDifference > selectedVariant.stock) {
        return res.status(400).json({
          message: `Requested quantity exceeds available stock`,
        });
      }
  
      // Update the stock based on the quantity difference
      selectedVariant.stock -= quantityDifference; // Decrease stock dynamically
  
      // Save the updated product with the new stock
      await product.save();
  
      // Update the cart item quantity
      cart.items[itemIndex].quantity = newQuantity;
      await cart.save();
  
      res
        .status(200)
        .json({ message: "Cart updated and stock adjusted successfully" });
    } catch (error) {
      console.error("Error updating cart quantity and stock:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };

  
  module.exports={
    addToCart,
    cartLoad,
    removeFromCart,
    updateCartQuantity
  }