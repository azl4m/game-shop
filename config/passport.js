const passport = require("passport");
const googleStrategy = require("passport-google-oauth20").Strategy;
const userModel = require("../models/userModel");
const { name } = require("ejs");
const env = require("dotenv").config();

passport.use(
  new googleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refereshToken, profile, done) => {
      try {
        let user = await userModel.findOne({ googleId: profile.id });
        if (user) {
          return done(null, user);
        } else {
          user = new userModel({
            username: profile.displayName,
            email: profile.emails[0].value,
            googleId: profile.id,
          });
          await user.save();
          return done(null, user);
        }
      } catch (error) {
        console.log("error in google auth :" + error);

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
