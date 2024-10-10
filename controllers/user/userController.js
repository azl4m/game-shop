const userModel = require("../../models/userModel");
const bcrypt = require("bcrypt");
const nodeMailer = require("nodemailer");
const productModel = require("../../models/productModel");
const cartModel = require("../../models/cartModel");
const addressModel = require("../../models/addressModel");
const categoryModel = require("../../models/categoryModel");
const orderModel = require("../../models/orderModel");
const randomString = require("randomstring");
const moment = require("moment");
const mongoose = require("mongoose");
const OTP_TIMEOUT = 30 * 1000;

//for hashing password
const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.log("error hashing password :" + error);
  }
};
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

//for otp generation
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

//for sending verification email
const sendVerifyEmail = async (email, otp) => {
  try {
    const transporter = nodeMailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODE_MAILER_EMAIL,
        pass: process.env.NODE_MAILER_PASSWORD,
      },
    });
    const info = await transporter.sendMail({
      from: process.env.NODE_MAILER_EMAIL,
      to: email,
      subject: "Verify your email",
      text: `Your OTP is ${otp}`,
      html: `<b> Your OTP :${otp} </b>`,
    });
    return info.accepted.length > 0;
  } catch (error) {
    console.log("error sending mail :" + error);
    return false;
  }
};

//Loading signup page
const signupLoad = async (req, res) => {
  try {
    res.render("signup");
  } catch (error) {
    console.log("error loading login page :" + error);
    res.redirect("/pageNotFound");
  }
};

//register new user
const registerUser = async (req, res) => {
  try {
    const { username, email, password, cPassword, phone } = req.body;

    const findUser = await userModel.findOne({ email: email });
    if (findUser) {
      return res.render("signup", { message: "Email already in use" });
    } else {
      const otp = generateOTP();
      const emailSent = await sendVerifyEmail(email, otp);
      if (!emailSent) {
        return res.json("email error");
      }
      const passwordHash = await securePassword(password);
      const user = new userModel({
        username: username,
        email: email,
        password: passwordHash,
        phoneNumber: phone,
      });
      await user.save();
      req.session.userOTP = otp;
      req.session.userData = { username, email, password, phone };
      res.redirect("/verifyOtp");
    }
  } catch (error) {
    console.log("error registering new user :" + error);
    res.render("signup", { message: "signup failed" });
  }
};

//for loading ot verification page
const verifyOtpLoad = async (req, res) => {
  const email = req.session?.userData?.email;
  res.render("otp", { email: email });
};

//for verifying otp
const verifyOtp = async (req, res) => {
  try {
    console.log(req.session.userOTP);
    const otp = req.body.otp;
    if (otp === req.session.userOTP) {
      const user = req.session.userData;
      const userExist = await userModel.findOne({ email: user.email });
      if (userExist) {
        await userExist.updateOne({ $set: { isVerified: true } });
        return res.json({
          success: true,
          redirectUrl: "/login",
        });
      }
      const sPassword = await securePassword(user.password);
      const saveUser = new userModel({
        username: user.username,
        email: user.email,
        phoneNumber: user.phone,
        password: sPassword,
        isVerified: true,
      });
      const userData = await saveUser.save();
      res.json({
        success: true,
        redirectUrl: "/login",
      });
    } else {
      res
        .status(400)
        .json({ success: false, message: "Invalid OTP, Please try again" });
    }
  } catch (error) {
    console.log("error at verifying otp :" + error);
    res
      .status(500)
      .json({ success: false, message: "An error occcured, Please try again" });
  }
};

//foor resending otp
const resendOtp = async (req, res) => {
  try {
    const { email } = req.session.userData;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email not found" });
    }
    const otp = generateOTP();
    req.session.userOTP = otp;
    const emailSent = await sendVerifyEmail(email, otp);
    if (emailSent) {
      res.status(200).json({
        success: true,
        message: "Verification OTP resent succesfully",
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to resent otp please try again",
      });
    }
  } catch (error) {
    console.log("error resending OTP :" + error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error Please try again",
    });
  }
};

//load login page
const loginLoad = async (req, res) => {
  try {
    const message = req.query.message;
    if (message === "blocked") {
      return res.render("login", { message: "You are blocked by admin" });
    }
    res.render("login");
  } catch (error) {
    console.log("error loading login page :" + error);
  }
};

//for page not found
const pageNotFound = async (req, res) => {
  try {
    res.render("page-404");
  } catch (error) {
    console.log("error in page not found :" + error.message);
    res.redirect("/pageNotFound");
  }
};

//for verify logging in

const loginUser = async (req, res) => {
  try {
    const emailReg = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const phone = req.body.phoneNumber;
    if (emailReg.test(phone)) {
      const email = phone;
      const userData = await userModel.findOne({
        email: email,
      });

      if (userData.isVerified === false) {
        const { username, email, password, phoneNumber } = userData;
        const otp = generateOTP();
        const emailSent = await sendVerifyEmail(email, otp);
        if (!emailSent) {
          return res.json("email error");
        }
        req.session.userOTP = otp;
        req.session.userData = { username, email, password, phone };
        return res.redirect("/verifyOtp");
      } else if (userData.isActive === false) {
        return res.render("login", { message: "You are blocked by admin" });
      }
      const password = req.body.password;
      if (userData) {
        const passwordMatch = await bcrypt.compare(password, userData.password);
        if (passwordMatch) {
          if (userData.role === "admin") {
            req.session.admin = userData._id;
            return res.redirect("/admin/");
          }
          req.session.user = userData._id;
          res.redirect("/");
        } else {
          res.render("login", { message: "username or password incorrect" });
        }
      } else {
        res.render("login", { message: "username or password incorrect" });
      }
    } else {
      const userData = await userModel.findOne({
        phoneNumber: phone,
      });
      if (userData.isVerified === false) {
        const { username, email, password, phoneNumber } = userData;
        const otp = generateOTP();
        const emailSent = await sendVerifyEmail(email, otp);
        if (!emailSent) {
          return res.json("email error");
        }
        req.session.userOTP = otp;
        req.session.userData = { username, email, password, phone };
        res.redirect("/verifyOtp");
      } else if (userData.isActive === false) {
        return res.render("login", { message: "You are blocked by admin" });
      }
      const password = req.body.password;
      if (userData) {
        const passwordMatch = await bcrypt.compare(password, userData.password);
        if (passwordMatch) {
          if (userData.role === "admin") {
            req.session.admin = userData.username;
            return res.redirect("/admin");
          } else {
            req.session.user = userData._id;
            res.redirect("/");
          }
        } else {
          console.log("error 3");
          res.render("login", { message: "username or password incorrect" });
        }
      } else {
        console.log("error 4");
        res.render("login", { message: "username or password incorrect" });
      }
    }
  } catch (error) {
    console.log("error logging in :" + error);
    res.render("login", { message: "login failed" });
  }
};

//for logout
const logout = async (req, res) => {
  req.session.destroy();
  res.redirect("/");
};

//for loading homepage
const loadHomePage = async (req, res) => {
  try {
    const products = await productModel.find({
      isListed: true,
      isDeleted: false,
    });
    if (req.session?.passport?.user) {
      req.session.user = req.session.passport.user;
    }
    if (req.session.user) {
      const user = await userModel.findById({ _id: req.session.user });
      return res.render("home", { userDetails: user, products: products });
    }
    res.render("home", { products: products });
  } catch (error) {
    console.log("homepage loading error :" + error.message);
    res.status(500).send("Server Error");
  }
};

//for product details page laoding
const productDetailsLoad = async (req, res) => {
  try {
    const productId = req.query.id;
    const product = await productModel.findById({ _id: productId });
    const category = categoryModel.findOne({ _id: product.category });
    const platforms = await productModel.aggregate([
      { $match: { productName: product.productName } },
      { $unwind: "$variant" },
      { $group: { _id: "$variant.platform" } },
      
    ]);
    console.log(platforms);
    let parsedPlatdforms = []
    platforms.forEach(platform=>{
      parsedPlatdforms.push(platform._id)
    })
    // console.log(parsedPlatdforms);
    
    if (req.session.user) {
      const user = await userModel.findById({ _id: req.session.user });
      return res.render("productDetails", {
        userDetails: user,
        product: product,
        category: category,
        platforms,
      });
    }
    return res.render("productDetails", {
      product: product,
      category: category,
      platforms,
    });
  } catch (error) {
    console.log("error loading product details page " + error);
    res.status(500).send("Server error");
  }
};

// API to get stock for a specific platform
const getPlatformStock = async (req, res) => {
  try {
    const { productId, platform } = req.query; // Receive productId and platform from query
    const product = await productModel.findById(productId);
    // Find the variant that matches the selected platform
    const variant = product.variant.find(v => v.platform === platform);
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
      return res.status(400).json({ message: "Selected platform not available" });
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

    res.status(200).json({ message: "Cart updated and stock adjusted successfully" });
  } catch (error) {
    console.error("Error updating cart quantity and stock:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


const addressManagementLoad = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await userModel.findOne({ _id: userId });
    const defaultAddress = await addressModel.find({
      $and: [{ userId: userId }, { isDefault: true }],
    });
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
    });
  } catch (error) {
    console.log("error in address management load :" + error);
  }
};

const addAddress = async (req, res) => {
  try {
    const { userId, street, city, state, postalCode, country, phoneNumber } =
      req.body;
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
const editPtofileLoad = async (req, res) => {
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

const sendForgotPassword = async (username, email, token) => {
  try {
    const transporter = nodeMailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODE_MAILER_EMAIL,
        pass: process.env.NODE_MAILER_PASSWORD,
      },
    });
    const info = await transporter.sendMail({
      from: process.env.NODE_MAILER_EMAIL,
      to: email,
      subject: "Reset Your Password",
      text: ``,
      html: `<h6>Hi ${username},</h6><br>
      <p>Click here to <a href="http://127.0.0.1:3000/resetPassword?token=${token}"> rest your password</p>`,
    });
    return info.accepted.length > 0;
  } catch (error) {
    console.log("error sending mail :" + error);
    return false;
  }
};

const forgotPassword = async (req, res) => {
  try {
    const email = req.body.email;
    const user = await userModel.findOne({ email: email });
    if (user) {
      const token = randomString.generate();
      const updateUser = await userModel.updateOne(
        { email: email },
        {
          $set: { token: token },
        }
      );
      const sendMail = await sendForgotPassword(user.username, email, token);
      if (sendMail) {
        return res.status(200).json({
          message: "Please Check Your Email To Reset Your Password",
          redirectUrl: "/login",
        });
      } else {
        return res.status(500).json({ message: "Error sending email" });
      }
    } else {
      return res
        .status(500)
        .json({ message: "User not found Please Check your email" });
    }
  } catch (error) {
    console.log("error at forgot password :" + error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
const resetPasswordLoad = async (req, res) => {
  try {
    const token = req.query.token;
    const user = await userModel.findOne({ token: token });
    if (user) {
      res.render("resetPassword", { user: user });
    } else {
      return res.status(500).json({ message: "No user found" });
    }
  } catch (error) {
    console.log("error loading reset password page :" + error);
  }
};
const resetPassword = async (req, res) => {
  try {
    const { userid, password } = req.body;
    const sPassword = await securePassword(password);
    const reset = await userModel.updateOne(
      { _id: userid },
      {
        $set: {
          password: sPassword,
          token: "",
        },
      }
    );
    if (reset) {
      res.status(200).json({ message: "Password reset Succesfully" });
    } else {
      res.status(400).json({ message: "Internal Server Error" });
    }
  } catch (error) {
    console.log("error resetting password :" + error);
  }
};

const checkoutLoad = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await userModel.findOne({ _id: userId });
    const cart = await cartModel.findOne({ userId }).populate({
      path: "items.productId",
      select: "price name",
    });

    if (!cart) {
      return res.status(400).json({ message: "No cart found" });
    }

    console.log(JSON.stringify(cart, null, 2));

    const {
      street,
      city,
      phone,
      state,
      pinCode,
      email,
      fullname,
      totalPrice,
      country,
    } = req.body;
    function generateUniqueOrder() {
      let prefix = "ORD";
      let middle = Date.now();
      const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let suffix = "";

      for (let i = 0; i < 4; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        suffix += characters[randomIndex];
      }
      return `${prefix}-${middle}-${suffix}`;
    }
    const cartItems = cart.items.map((item) => {
      if (!item.productId || !item.productId._id || !item.productId.price) {
        throw new Error("Cart item missing product or price information");
      }
      return {
        product: item.productId._id,
        price: item.productId.price,
        quantity: item.quantity,
        platform: item.platform,
      };
    });
    const orderNumber = generateUniqueOrder();
    const order = new orderModel({
      user: userId,
      orderNumber: orderNumber,
      cartItems: cartItems,
      totalPrice: totalPrice,
      shippingAddress: {
        name: fullname,
        street: street,
        city: city,
        phoneNumber: phone,
        state: state,
        postalCode: pinCode,
        country: country,
      },
    });

    const saveOrder = await order.save();
    await cartModel.findOneAndDelete({ userId });

    res.status(200).json({ message: "checkout successful" });
  } catch (error) {
    console.log("error at cart load :" + error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getCheckoutPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await userModel.findOne({ _id: userId });
    const cart = await cartModel
      .findOne({ userId: userId })
      .populate("items.productId");
    if (!cart) {
      return res.status(400).json({ message: "No items in cart" });
    }
    const products = cart.items.map((item) => ({
      name: item.productId.productName,
      price: item.productId.price,
      quantity: item.quantity,
      platform: item.platform,
    }));

    const addresses = await addressModel.find({ userId });
    const defaultAddress = await addressModel.findOne({ isDefault: true });
    const { subtotal, tax, total, delivery } = calculateCartTotals(cart);
    res.render("checkout", {
      addresses: addresses,
      userDetails: user,
      defaultAddress: defaultAddress,
      products: products,
      delivery: delivery,
      tax: tax,
      total: total,
    });
  } catch (error) {
    console.log("Error fetching checkout page:", error);
    res.status(500).json({ message: "Server error" });
  }
};

//all products
const productsLoad = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
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
    // Conditionally add the category filter if it is not an empty string
    if (filter && filter.trim() !== "") {
      query.$and.push({ category: filter });
      const category = await categoryModel.findOne({ _id: filter });
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
    });
  } catch (error) {
    console.log("Error loading products: " + error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

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
      select: "productName",
    });

    res.render("orderDetails", { userDetails: user, order: order, moment });
  } catch (error) {
    console.log("error loading order details :" + error);
    res.status(400).json({ message: "Internal Server Error" });
  }
};

const requestReturn = async (req, res) => {
  try {
    const orderid = req.query.orderid;
    const product = req.query.product;
    // Update the `isReturned` field of the specific cart item in the order
    const update = await orderModel.updateOne(
      { _id: orderid, "cartItems.product": product }, // Match the order and the cart item by product ID
      { $set: { "cartItems.$.isReturned": true } } // Use the positional operator to update the specific item
    );
    return res.redirect(`/orderDetails?id=${orderid}`)
  } catch (error) {
    console.log("error requesting return  :" + error);
  }
};
module.exports = {
  loadHomePage,
  pageNotFound,
  signupLoad,
  registerUser,
  loginLoad,
  loginUser,
  verifyOtp,
  verifyOtpLoad,
  resendOtp,
  logout,
  productDetailsLoad,
  addToCart,
  cartLoad,
  removeFromCart,
  updateCartQuantity,
  addressManagementLoad,
  addAddress,
  editAddress,
  editAddressLoad,
  setDefaultAdress,
  deleteAddress,
  userProfileLoad,
  forgotPassword,
  resetPasswordLoad,
  resetPassword,
  checkoutLoad,
  getCheckoutPage,
  productsLoad,
  ordersLoad,
  orderDetails,
  editProfile,
  editPtofileLoad,
  requestReturn,
  getPlatformStock
};
