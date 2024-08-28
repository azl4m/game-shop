const userModel = require("../../models/userModel");
const bcrypt = require("bcrypt");
const nodeMailer = require("nodemailer");

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
  res.render("otp");
};



//for verifying otp
const verifyOtp = async (req, res) => {
  try {
    const otp = req.body.otp;
    if (otp === req.session.userOTP) {
      const user = req.session.userData;
      const sPassword = await securePassword(user.password);
      const saveUser = new userModel({
        username: user.username,
        email: user.email,
        phoneNumber: user.phone,
        password: sPassword,
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
    const username = req.body.username;

    if (emailReg.test(username)) {
      const email = username;
      const userData = await userModel.findOne({
        email: email,
      });
      if (userData.isActive === false) {
        return res.render("login", { message: "You are blocked by admin" });
      }
      const password = req.body.password;
      if (userData) {
        const passwordMatch = await bcrypt.compare(password, userData.password);
        if (passwordMatch) {
          if (userData.role === "admin") {
            req.session.admin = userData.username;
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
        username: username,
      });
      if (userData.isActive === false) {
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
          res.render("login", { message: "username or password incorrect" });
        }
      } else {
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
    if (req.session?.passport?.user) {
      req.session.user = req.session.passport.user;
    }
    if (req.session.user) {
      const user = await userModel.findById({ _id: req.session.user });
      return res.render("home", { userDetails: user });
    }
    res.render("home");
  } catch (error) {
    console.log("homepage loading error :" + error.message);
    res.status(500).send("Server Error");
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
};
