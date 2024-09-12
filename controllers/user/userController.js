const userModel = require("../../models/userModel");
const bcrypt = require("bcrypt");
const nodeMailer = require("nodemailer");
const productModel = require("../../models/productModel");
const cartModel = require("../../models/cartModel")

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
  cart.items.forEach(item => {
    const price = item.productId.price || 0;  
    const quantity = item.quantity || 0;     

    subtotal += price * quantity;  // Calculate subtotal
  });

  const tax = Math.floor(subtotal * 0.18); //  18% tax rate
  const total = Math.floor(subtotal + tax);

  return { subtotal, tax, total };
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
      const passwordHash = await securePassword(password)
      const user = new userModel({
        username:username,
        email:email,
        password:passwordHash,
        phoneNumber:phone
      })
      await user.save()
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
      const userExist = await userModel.findOne({email:user.email})
      if(userExist){
        await userExist.updateOne({$set:{isVerified:true}})
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
    const products = await productModel.find({ isListed: true ,isDeleted:false});
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
    if (req.session.user) {
      const user = await userModel.findById({ _id: req.session.user });
      return res.render("productDetails", {
        userDetails: user,
        product: product,
      });
    }
    return res.render("productDetails", { product: product });
  } catch (error) {
    console.log("error loading product details page :" + error);
    res.status(500).send("Server error");
  }
};

//add to cart
const addToCart = async(req,res)=>{
  try {
    const productId = req.query.id
    const quantity = parseInt(req.query.quantity)
    const platform = req.query.platform
    const userId = req.session.user
    let cart = await cartModel.findOne({userId:userId})
    if (cart) {
      const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
      if (itemIndex > -1) {
        cart.items[itemIndex].quantity += quantity;
      } else {
        cart.items.push({ productId, quantity ,platform});
      }
      cart.updatedAt = Date.now();
      await cart.save();
    } else {
      cart = new cartModel({ userId, items: [{ productId, quantity, platform }] });
      await cart.save();
    }
    res.redirect(`/productDetails?id=${productId}`)
   
  } catch (error) {
    console.log("error at add to cart :"+error);
    return res.status(500).json({message:error.message})
    
  }
}
//get cart
const cartLoad = async(req,res)=>{
  try {
    const userId = req.session.user;
    const user = await userModel.findOne({ _id: userId });

    if (user) {
      // Fetch the cart for the user
      const cart = await cartModel.findOne({ userId: userId }).populate({
        path: 'items.productId',
        model: 'Product',
        select: 'productName images price' // Include only necessary fields
      });

      if (cart) {
        const{subtotal,tax,total} = calculateCartTotals(cart)
        // Extract product IDs and quantity for further use
        const items = cart.items.map(item => ({
          productId: item.productId._id,
          quantity: item.quantity,
          productName: item.productId.productName,
          images: item.productId.images,
          price: item.productId.price 
        }));

        res.render('cart', {
          cart: cart,
          items: items,
          userDetails: user,
          subtotal:subtotal,
          tax:tax,
          total:total
        });
      } else {
        res.status(404).json({ message: "Cart not found" });
      }
    } else {
      res.status(400).json({ message: "User not found" });
    }
  } catch (error) {
    console.log("error loading cart :"+error);
    res.status(500).json({message:"Internal server error"})
    
  }
}
//remove from cart
const removeFromCart = async(req, res) => {
  try {
    const { itemId } = req.body;
    const userId = req.session.user;
    
    const cart = await cartModel.findOne({ userId });
    
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }
    
    // Remove the item from the cart
    const filteredItems = cart.items.filter(item => item.productId.toString() !== itemId);
    cart.items = filteredItems;

    // Save the updated cart
    await cart.save();

    res.redirect("/cart");
  } catch (error) {
    console.log('Error removing item from cart:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const updateCartQuantity = async (req, res) => {
  try {
    
    const { itemId, newQuantity } = req.body;    
    const userId = req.session.user;

    const cart = await cartModel.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // Find the item in the cart and update its quantity
    const itemIndex = cart.items.findIndex(item => item.productId.toString() === itemId);
    if (itemIndex !== -1) {
      cart.items[itemIndex].quantity = newQuantity;
    }

    await cart.save();
    res.status(200).json({ message: 'Cart updated successfully' });
  } catch (error) {
    console.error('Error updating cart quantity:', error);
    res.status(500).json({ message: 'Internal server error' });
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
  updateCartQuantity
};
