const userModel = require("../../models/userModel");
const bcrypt = require("bcrypt");
const nodeMailer = require("nodemailer");
const productModel = require("../../models/productModel");
const randomString = require("randomstring");
const dotenv = require("dotenv").config();
const paymentTimeStamp = require("../../helpers/paymentTimeStamp");
// const { default: items } = require("razorpay/dist/types/items");
const OTP_TIMEOUT = 30 * 1000;
const spasswordandotp = require("../../helpers/spasswordandotp");
const sendMail = require("../../helpers/sendmail");
const { generateReferralCode } = require("../../helpers/referralHelper");
const referralModel = require("../../models/referralModel");
const walletHelper = require("../../helpers/walletTransactions");

//

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
    const referralCode = req.body.referralCode || "";
    const referer = await userModel.findOne({ referralCode: referralCode });
    const findUser = await userModel.findOne({ email: email });
    if (findUser) {
      return res.render("signup", { message: "Email already in use" });
    } else {
      const otp = spasswordandotp.generateOTP();
      const emailSent = await sendMail.sendVerifyEmail(email, otp);
      if (!emailSent) {
        return res.json("email error");
      }
      const passwordHash = await spasswordandotp.securePassword(password);
      const user = new userModel({
        username: username,
        email: email,
        password: passwordHash,
        phoneNumber: phone,
        referralCode: generateReferralCode(username),
      });
      if (referer) {
        user.referredBy = referer.referralCode;
      }
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

//for loading otp verification page
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
        if (userExist.referredBy) {

          const referrer = await userModel.findOne({
            referralCode: userExist.referredBy,
          });

          const referralOffer = await referralModel.findOne();
          if (referralOffer.isActive) {
            const bonus = referralOffer.referralAmount;
            await walletHelper.addWalletTransaction(
              referrer._id,
              bonus,
              "credit",
              `Referral bonus credited for referring ${userExist.username}`
            );
          }
        }
        return res.json({
          success: true,
          redirectUrl: "/login",
        });
      }
      const sPassword = await spasswordandotp.securePassword(user.password);
      const saveUser = new userModel({
        username: user.username,
        email: user.email,
        phoneNumber: user.phone,
        password: sPassword,
        isVerified: true,
      });

      await saveUser.save();
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
    const otp = spasswordandotp.generateOTP();
    req.session.userOTP = otp;
    const emailSent = await sendMail.sendVerifyEmail(email, otp);
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
        const otp = spasswordandotp.generateOTP();
        const emailSent = await sendMail.sendVerifyEmail(email, otp);
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
        const otp = spasswordandotp.generateOTP();
        const emailSent = await sendMail.sendVerifyEmail(email, otp);
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
    const featuredProducts = await productModel.find({isListed:true,isDeleted:false}).sort({"reviews.rating":-1}).limit(8)
    const latestProducts = await productModel.find({isDeleted:false,isListed:true}).sort({createdAt:-1}).limit(4)
    if (req.session?.passport?.user) {
      req.session.user = req.session.passport.user;
    }
    if (req.session.user) {
      const user = await userModel.findById({ _id: req.session.user });
      return res.render("home", { userDetails: user, products: featuredProducts,latestProducts });
    }
    res.render("home", { products: featuredProducts,latestProducts });
  } catch (error) {
    console.log("homepage loading error :" + error.message);
    res.status(500).send("Server Error");
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
    const sPassword = await spasswordandotp.securePassword(password);
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
  forgotPassword,
  resetPasswordLoad,
  resetPassword,
};
