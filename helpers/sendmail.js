
const dotenv = require("dotenv").config();
const nodeMailer = require("nodemailer");

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

  module.exports={sendVerifyEmail}