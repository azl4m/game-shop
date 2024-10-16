const productModel = require('../../models/productModel')
const userModel = require('../../models/userModel')

//wishlist
const addToWishList = async (req, res) => {
    try {
      const userId = req.session.user;
      if (!userId) {
        return res
          .status(400)
          .json({ message: "User not logged in", redirectUrl: "/login" });
      }
  
      const productId = req.query.id;
      const platform = req.query.platform?.toString();
  
      const product = await productModel.findById(productId);
  
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
  
      let wishlist = await wishlistModel.findOne({ userId });
  
      if (wishlist) {
        // Check if the product already exists in the wishlist
        const productExists = wishlist.items.some(
          (item) =>
            item.productId.toString() === productId && item.platform === platform
        );
  
        if (productExists) {
          return res.status(400).json({ message: "Product already in wishlist" });
        }
  
        // If not, add the product to the wishlist
        wishlist.items.push({ productId, platform });
      } else {
        // If no wishlist exists, create a new one and add the product
        wishlist = new wishlistModel({
          userId,
          items: [{ productId, platform }],
        });
      }
  
      await wishlist.save();
      return res
        .status(200)
        .json({ message: "Product added to wishlist", redirectUrl: "/wishlist" });
    } catch (error) {
      console.log("Error at add to wishlist: " + error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  };
  
  const wishlistLoad = async (req, res) => {
    try {
      const userId = req.session.user;
  
      if (!userId) {
        return res.status(400).json({ message: "User not logged in" });
      }
  
      const user = await userModel.findOne({ _id: userId });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
  
      // Find the user's wishlist and populate product details
      const wishlist = await wishlistModel.findOne({ userId }).populate({
        path: "items.productId",
        model: "Product",
        select: "productName images price", // Select only the fields you need
      });
  
      if (!wishlist) {
        return res.render("wishlist", {
          wishlist: [],
          userDetails: user,
          message: "Your wishlist is empty",
          isEmpty: true,
        });
      }
  
      const wishlistItems = wishlist.items.map((item) => ({
        productId: item.productId._id,
        productName: item.productId.productName,
        images: item.productId.images,
        price: item.productId.price,
        platform: item.platform,
      }));
  
      if (!wishlist.items.length) {
        return res.render("wishlist", {
          items: [],
          userDetails: user,
          message: "Your wishlist is empty",
          isEmpty: true,
        });
      }
      const totalAmount = wishlistItems.reduce(
        (total, item) => total + item.price,
        0
      );
  
      // Render the wishlist with populated product details
      return res.render("wishlist", {
        items: wishlistItems,
        userDetails: user,
        message: "",
        subtotal: totalAmount,
        isEmpty: false,
      });
    } catch (error) {
      console.log("Error loading wishlist: " + error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  };
  
  const wishlistRemove = async (req, res) => {
    try {
      const userId = req.session.user;
      const productId = req.query.id; // Make sure this matches what you're passing from frontend
      const platform = req.query.platform;
      // Log the incoming request for debugging
  
      if (!userId) {
        return res.status(400).json({ message: "User not logged in" });
      }
  
      // Find the user's wishlist
      const wishlist = await wishlistModel.findOne({ userId: userId });
  
      if (wishlist) {
        // Filter out the product from wishlist
        wishlist.items = wishlist.items.filter(
          (item) =>
            !(
              item.productId.toString() === productId &&
              item.platform === platform
            )
        );
  
        // Save the updated wishlist
        await wishlist.save();
  
        // Check if wishlist is now empty
        if (wishlist.items.length === 0) {
          return res
            .status(200)
            .json({ isEmpty: true, message: "Wishlist is empty" });
        }
  
        return res.status(200).json({ isEmpty: false });
      }
  
      return res.status(404).json({ message: "Wishlist not found" });
    } catch (error) {
      // Log the error for debugging
      console.error("Error removing from wishlist:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  };
  
  module.exports={
    wishlistLoad,
    wishlistRemove,
    addToWishList
  }