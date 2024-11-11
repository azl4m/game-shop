const passport = require("passport");
const googleStrategy = require("passport-google-oauth20").Strategy;
const userModel = require("../models/userModel");
const { name } = require("ejs");
const { generateReferralCode } = require("../helpers/referralHelper");
const env = require("dotenv").config();

passport.use(
  new googleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "https://thegameshop.shop/auth/google/callback",
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        let user = await userModel.findOne({ googleId: profile.id });

        if (user && !user.isActive) {
          return req.res.redirect("/login?message=blocked");
        }

        if (user && user.role === "admin") {
          req.session.admin = user._id;
          return req.res.redirect("/admin/");
        }

        // If no user found with googleId, try finding by email
        if (!user) {
          user = await userModel.findOne({ email: profile.emails[0].value });

          // If a user exists with the email but not Google ID, update the Google ID
          if (user) {
            user.googleId = profile.id;
            await user.save();
          } else {
            // If no user found with either googleId or email, create a new user
            user = new userModel({
              username: profile.displayName,
              email: profile.emails[0].value,
              googleId: profile.id,
              referralCode: generateReferralCode(profile.displayName),
            });
            await user.save();
          }
        }

        return done(null, user);

      } catch (error) {
        console.log("error in google auth: " + error);
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
  try {
    const user = await userModel.findById(id);
    done(null, user);
  } catch (error) {
    console.log("error deserializing user :" + error);
    done(error, null);
  }
});

module.exports = passport;
