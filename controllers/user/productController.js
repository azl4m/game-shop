const productModel = require("../../models/productModel");
const categoryModel = require("../../models/categoryModel");
const userModel = require("../../models/userModel");

//for product details page laoding
const productDetailsLoad = async (req, res) => {
  try {
    const productId = req.query.id;
    const product = await productModel.findById({ _id: productId });
    const category = await categoryModel.findOne({ _id: product.category });
    const platforms = await productModel.aggregate([
      { $match: { productName: product.productName } },
      { $unwind: "$variant" },
      { $group: { _id: "$variant.platform" } },
    ]);
    let parsedPlatdforms = [];
    platforms.forEach((platform) => {
      parsedPlatdforms.push(platform._id);
    });

    // Step 1: Fetch product offer (if any)
    const productOfferValue = product.offer?.value || 0;
    const productOfferType = product.offer?.type || "percentage"; // 'percentage' or 'flat'

    // Step 2: Fetch category offer (if any)
    const categoryOfferValue = category.offer?.value || 0;
    const categoryOfferType = category.offer?.type || "percentage"; // 'percentage' or 'flat'

    // Step 3: Calculate discounted prices based on the type of offer
    let productDiscountedPrice, categoryDiscountedPrice;

    // Calculate product offer discount
    if (productOfferType === "percentage") {
      productDiscountedPrice =
        product.price - product.price * (productOfferValue / 100);
    } else if (productOfferType === "flat") {
      productDiscountedPrice = product.price - productOfferValue;
    }

    // Calculate category offer discount
    if (categoryOfferType === "percentage") {
      categoryDiscountedPrice =
        product.price - product.price * (categoryOfferValue / 100);
    } else if (categoryOfferType === "flat") {
      categoryDiscountedPrice = product.price - categoryOfferValue;
    }

    // Step 4: Apply the higher discount
    const finalDiscountedPrice = Math.min(
      productDiscountedPrice,
      categoryDiscountedPrice
    );

    // Ensure the price doesn’t go below zero
    const discountedPrice = Math.max(finalDiscountedPrice, 0);

    if (req.session.user) {
      const user = await userModel.findById({ _id: req.session.user });
      return res.render("productDetails", {
        userDetails: user,
        product: product,
        category: category,
        discountedPrice: discountedPrice, // Pass the discounted price to the page
        platforms,
        productOfferValue,
        categoryOfferValue,
        appliedOfferType:
          discountedPrice === productDiscountedPrice
            ? productOfferType
            : categoryOfferType, // Indicate which offer was applied
      });
    }
    return res.render("productDetails", {
      product: product,
      category: category,
      discountedPrice: discountedPrice, // Pass the discounted price to the page
      platforms,
      productOfferValue,
      categoryOfferValue,
      appliedOfferType:
        discountedPrice === productDiscountedPrice
          ? productOfferType
          : categoryOfferType, // Indicate which offer was applied
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
module.exports = {
  productDetailsLoad,
  productsLoad,
  getPlatformStock,
};
