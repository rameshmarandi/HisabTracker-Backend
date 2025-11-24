import nodemailer from "nodemailer";

import { ApiError } from "./ApiError.js";

// Helper function to send OTP via email
const sendEmail = async (email, mailOptions) => {
  // OTP Secret Key

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.HOST_NAME,

      port: process.env.MAIL_PORT,
      secure: process.env.IS_SECURE,
      requireTLS: process.env.REQUIRETLS,
      auth: {
        user: process.env.EMAIL_USER, // Your email credentials
        pass: process.env.EMAIL_PASS,
      },
    });

    const res = await transporter.sendMail(mailOptions);

    return res;
  } catch (error) {
    throw new ApiError(
      500,
      error.message || "Something went wrong while sending OTP via email"
    );
  }
};



export { sendEmail };
