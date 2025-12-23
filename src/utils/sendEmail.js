import nodemailer from "nodemailer";
import { ApiError } from "./ApiError.js";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // APP PASSWORD
  },
});

export const sendEmail = async (mailOptions) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      ...mailOptions,
    });

    // console.log("EMAIL_SENT", {
    //   to: mailOptions.to,
    //   messageId: info.messageId,
    // });

    return info;
  } catch (error) {
    console.error("EMAIL_SEND_FAILED", error);
    throw new ApiError(500, "Email service failed. Please try again later.");
  }
};
