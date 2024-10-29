const productModel = require("../../models/productModel");
const categoryModel = require("../../models/categoryModel");
const userModel = require("../../models/userModel");
const { addWalletTransaction } = require("../../helpers/walletTransactions");
const orderModel = require("../../models/orderModel");

//for product details page laoding
const productDetailsLoad = async (req, res) => {
  try {
    const productId = req.query.id;
    const product = await productModel.findById({ _id: productId }).populate("reviews.user");
    const category = await categoryModel.findOne({ _id: product.category });
    const platforms = await productModel.aggregate([
      { $match: { productName: product.productName } },
      { $unwind: "$variant" },
      { $group: { _id: "$variant.platform" } },
    ]);

    let parsedPlatforms = [];
    platforms.forEach((platform) => {
      parsedPlatforms.push(platform._id);
    });

    // Step 1: Fetch product offer (if any)
    const productOfferValue = product.offer?.value || 0;
    const productOfferType = product.offer?.type || "percentage"; // 'percentage' or 'flat'

    // Step 2: Fetch category offer (if any)
    const categoryOfferValue = category.offer?.value || 0;
    const categoryOfferType = category.offer?.type || "percentage"; // 'percentage' or 'flat'

    // Step 3: Calculate discounted prices based on the type of offer
    let productDiscountedPrice = product.price,
        categoryDiscountedPrice = product.price;

    // Calculate product offer discount
    if (productOfferType === "percentage") {
      productDiscountedPrice = product.price - product.price * (productOfferValue / 100);
    } else if (productOfferType === "flat" && productOfferValue <= product.price * 0.8) {
      productDiscountedPrice = product.price - productOfferValue;
    }

    // Calculate category offer discount
    if (categoryOfferType === "percentage") {
      categoryDiscountedPrice = product.price - product.price * (categoryOfferValue / 100);
    } else if (categoryOfferType === "flat" && categoryOfferValue <= product.price * 0.8) {
      categoryDiscountedPrice = product.price - categoryOfferValue;
    }

    // Step 4: Apply the higher discount
    const finalDiscountedPrice = Math.min(productDiscountedPrice, categoryDiscountedPrice);
    const offerSelected = finalDiscountedPrice === productDiscountedPrice ? "product" : "category";

    // Ensure the price doesn’t go below zero
    const discountedPrice = Math.max(finalDiscountedPrice, 0);

    // Update the product's offer price in the database
    await productModel.findByIdAndUpdate(
      { _id: productId },
      { offerPrice: discountedPrice },
      { new: true }
    );

    if (req.session.user) {
      const user = await userModel.findById({ _id: req.session.user });
      return res.render("productDetails", {
        userDetails: user,
        product,
        category,
        discountedPrice, // Pass the discounted price to the page
        platforms,
        productOfferValue,
        categoryOfferValue,
        offerSelected,
        appliedOfferType: discountedPrice === productDiscountedPrice ? productOfferType : categoryOfferType, // Indicate which offer was applied
      });
    }

    return res.render("productDetails", {
      product,
      category,
      discountedPrice, // Pass the discounted price to the page
      platforms,
      productOfferValue,
      categoryOfferValue,
      offerSelected,
      appliedOfferType: discountedPrice === productDiscountedPrice ? productOfferType : categoryOfferType, // Indicate which offer was applied
    });
  } catch (error) {
    console.log("error loading product details page " + error);
    res.status(500).send("Server error");
  }
};


//all products
const productsLoad = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 3;
    const skip = (page - 1) * limit;
    const filter = req.query.filter || "";
    const categories = await categoryModel.find({
      $and: [{ isDeleted: false }, { isListed: true }],
    });

    // Sorting parameters from query
    const sortBy = req.query.sortBy || "createdAt"; // Default sorting by createdAt
    const sortOrder = req.query.sortOrder === "desc" ? -1 : 1; // Default is ascending

    const sortOptions = {
      price: { price: sortOrder }, // Sort by price
      date: { createdAt: sortOrder }, // Sort by date
      alphabet: { productName: sortOrder }, // Sort alphabetically
    };

    const sort = sortOptions[sortBy] || sortOptions.date;

    const query = {
      $and: [
        { isDeleted: false },
        { isListed: true },
        { productName: { $regex: ".*" + search + ".*", $options: "i" } },
      ],
    };
    let filteredCat;
    let category;
    // Conditionally add the category filter if it is not an empty string
    if (filter && filter.trim() !== "") {
      query.$and.push({ category: filter });
      category = await categoryModel.findOne({ _id: filter });
      filteredCat = category ? category.categoryName : null;
    }

    // Query to count total products matching the criteria (without pagination)
    const totalProductsCount = await productModel.countDocuments(query);
    const products = await productModel
      .find(query)
      .populate({
        path: "category",
        select: "categoryName isListed isDeleted",
      })
      .skip(skip)
      .limit(limit)
      .sort(sort);
    const filteredProducts = products.filter(
      (product) =>
        product.category &&
        product.category.isListed &&
        !product.category.isDeleted
    );

    // if (!filteredProducts.length) {
    //   return res.status(400).json({ message: "No products found" });
    // }
    const totalPages = Math.ceil(totalProductsCount / limit);

    if (req.session.user) {
      const user = await userModel.findById({ _id: req.session.user });
      return res.render("products", {
        products: filteredProducts,
        userDetails: user,
        totalPages: totalPages,
        currentPage: page,
        searchQuery: search,
        sortBy,
        sortOrder,
        categories,
        filteredCat,
        category,
      });
    }
    return res.render("products", {
      products: filteredProducts,
      totalPages: totalPages,
      currentPage: page,
      searchQuery: search,
      sortBy,
      sortOrder,
      categories,
      filteredCat,
      category,
    });
  } catch (error) {
    console.log("Error loading products: " + error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// API to get stock for a specific platform
const getPlatformStock = async (req, res) => {
  try {
    const { productId, platform } = req.query; // Receive productId and platform from query
    const product = await productModel.findById(productId);
    // Find the variant that matches the selected platform
    const variant = product.variant.find((v) => v.platform === platform);
    if (variant) {
      res.json({ stock: variant.stock });
    } else {
      res.status(404).json({ message: "Platform not found" });
    }
  } catch (error) {
    console.log("Error fetching platform stock: " + error);
    res.status(500).json({ message: "Server error" });
  }
};

const addReviewLoad = async (req, res) => {
  try {
    const { productId } = req.query;
    const product = await productModel.findById(productId);
    const userId = req.session.user;
    const user = await userModel.findById(userId);
    let existingReview = product.reviews.find(
      (review) => review.user.toString() === userId
    );
    return res.render("addReview", { userDetails: user, product:product,existingReview:existingReview||null });
  } catch (error) {
    console.error("error at addreviewload :" + error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
const submitReview = async (req, res) => {
  try {
    let { comment, rating, productId } = req.body;
    comment = comment.trimStart()
    const product = await productModel.findById(productId);
    const userId = req.session.user;

    // Check if the user has already submitted a review
    const existingReviewIndex = product.reviews.findIndex(
      (review) => review.user.toString() === userId
    );

    const review = {
      user: userId,
      rating: rating,
      comment: comment,
      createdAt: new Date(),
    };

    if (existingReviewIndex !== -1) {
      // If the review exists, update it
      product.reviews[existingReviewIndex] = review; // Update the existing review
      req.flash("success", "Your review has been updated successfully.");
    } else {
      // If it's a new review, add it
      product.reviews.push(review);
      req.flash("success", "Thank you! Your review has been submitted.");
    }

    await product.save(); // Save the product with the updated reviews
    return res.redirect(`/addReview?productId=${productId}`);
  } catch (error) {
    console.error("Error submitting review: " + error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};


const addNewReview = async(req,res)=>{
  try {
    const{productId} = req.query
    const userId = req.session.user
    if(!userId){
      return res.status(200).json({redirectUrl:"/login",message:""})
    }
    const boughtProduct = await orderModel.find({user:userId,orderStatus:"Delivered","cartItems.product":productId})
    if(boughtProduct.length>0){

      return res.status(200).json({redirectUrl:`/addReview?productId=${productId}`,message:""})

    }
    return res.status(200).json({message:"You have not bought this product yet, Please try again later"})
   
  } catch (error) {
    console.error("error adding new review :"+error.message)
  }
}
module.exports = {
  productDetailsLoad,
  addNewReview,
  productsLoad,
  getPlatformStock,
  addReviewLoad,
  submitReview,
};
