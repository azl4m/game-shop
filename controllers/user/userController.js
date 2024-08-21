const userModel = require("../../models/userModel");
const bcrypt = require("bcrypt");

//for hashing password

const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.log("error hashing password :" + error);
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
    const sPassword = await securePassword(req.body.password);
    const user = new userModel({
      username: req.body.username,
      email: req.body.email,
      password: sPassword,
      phoneNumber: req.body.mobile,
    });
    const userData = await user.save();
    if (userData) {
      res.redirect("/login");
    } else {
      console.log("signup failed");
      res.render("signup", { message: "signup failed" });
    }
  } catch (error) {
    console.log("error registering new user :" + error);
    res.render("signup", { message: "signup failed" });
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
    const email = req.body.email;

    const password = req.body.password;

    const userData = await userModel.findOne({
      email: email,
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
};
