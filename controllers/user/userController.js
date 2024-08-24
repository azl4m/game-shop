const userModel = require("../../models/userModel");
const bcrypt = require("bcrypt");
const nodeMailer = require('nodemailer')

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
  return Math.floor(100000 + Math.random()*900000).toString()
}
//for sending verification email

const sendVerifyEmail = async(email,otp)=>{
  try {
    const transporter = nodeMailer.createTransport({
      service:'gmail',
      port:587,
      secure:false,
      requireTLS:true,
      auth:{
        user:process.env.NODE_MAILER_EMAIL,
        pass:process.env.NODE_MAILER_PASSWORD
      }
    })
    const info = await transporter.sendMail({
      from:process.env.NODE_MAILER_EMAIL,
      to:email,
      subject:"Verify your email",
      text:`Your OTP is ${otp}`,
      html:`<b> Your OTP :${otp} </b>`
    })
    return info.accepted.length > 0
  } catch (error) {
    console.log("error sending mail :"+error);
    return false
  }
}

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
    const {username,email,password,cPassword,phone} = req.body
    const findUser = await userModel.findOne({email:email});
    if(findUser){
      return res.render('signup',{message:"Email already in use"})
    }
    const otp = generateOTP()
    const emaiSent = await sendVerifyEmail(email,otp)
    if(!emaiSent){
      return res.json("email error")
    }
    req.session.userOTP = otp
    req.session.userData = {username,email,password,phone}
    res.redirect("/verifyOtp")

    
  } catch (error) {
    console.log("error registering new user :" + error);
    res.render("signup", { message: "signup failed" });
  }
};

//for loading ot verification page
const verifyOtpLoad = async(req,res)=>{
  res.render("verify-otp")
}

//for verifying otp
const verifyOtp = async(req,res)=>{
  const otp = req.body.otp
  if(otp===req.session.userOTP){
    const sPassword = await securePassword(req.session.userData.password);
    const user = new userModel({
      username:req.session.userData.username,
      email:req.session.userData.email,
      password:sPassword,
      phoneNumber:req.session.userData.phone
    })
    const userData = await user.save();
    if (userData) {
      res.render("login",{message:"signup successful"});
    } else {
      console.log("signup failed");
      res.render("signup", { message: "signup failed" });
    }
  }else{
    res.render("verify-otp",{message:"otp verification failed"})
  }
}


//load login page
const loginLoad = async (req, res) => {
  try {
    res.render("login");
  } catch (error) {
    console.log("error loading login page :" + error);
  }
};

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
    console.log("inside userlogin");
    const username = req.body.username;

    const password = req.body.password;

    const userData = await userModel.findOne({
      username: username,
      isActice: true,
    });
    if (userData) {
      const passwordMatch = await bcrypt.compare(password, userData.password);
      if (passwordMatch) {
        if (userData.role === "admin") {
          return res.render("login", { message: "admin login succesful" });
        }
        res.render("login",{message:"user login succesfull"})
      } else {
        res.render("login", { message: "password incorrect" });
      }
    } else {
      res.render("login", { message: "username incorrect" });
    }
  } catch (error) {
    console.log("error logging in :" + error);
    res.render("login", { message: "login failed" });
  }
};

const loadHomePage = async (req, res) => {
  try {
    return res.render("home");
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
  verifyOtpLoad
};
