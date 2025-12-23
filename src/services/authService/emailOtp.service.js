import bcrypt from "bcrypt";
import crypto from "crypto";
import { ApiError } from "../../utils/ApiError.js";
import { EmailOTP } from "../../models/User/Auth/emailOtp.model.js";
import { sendEmailTemplate } from "../../utils/sendEmailTemplate.js";

const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

export const sendEmailOTP = async ({ email, purpose, userName }) => {
  // Invalidate old OTPs
  await EmailOTP.updateMany(
    { email, purpose, consumedAt: null },
    { consumedAt: new Date() }
  );

  const otp = generateOTP();
  const otpHash = await bcrypt.hash(otp, 10);

  await EmailOTP.create({
    email,
    otpHash,
    purpose,
    expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
  });

  //   await sendEmailTemplate({
  //     email,
  //     subject:
  //       purpose === "EMAIL_VERIFY" ? "Verify your email" : "Reset your password",
  //     title: purpose === "EMAIL_VERIFY" ? "Verify your Email" : "Reset Password",
  //     otp,
  //     userName,
  //   });

  //   await sendEmailTemplate({
  //     email: email,
  //     subject: purpose === "FORGOT_PASSWORD" ? " " : "Verify your email",
  //     title: "Verify your email address",
  //     message:
  //       "Use the code below to verify your email and continue using Hisab Tracker.",
  //     otp,
  //     userName: userName,
  //   });

  const isForgot = purpose === "FORGOT_PASSWORD";

  await sendEmailTemplate({
    email,
    subject: isForgot ? "Reset your password" : "Verify your email",
    title: isForgot ? "Reset your password" : "Verify your email address",
    message: isForgot
      ? "Use the code below to reset your password."
      : "Use the code below to verify your email and continue using Hisab Tracker App.",
    otp,
    userName,
  });

  return true;
};

export const verifyEmailOTP = async ({ email, otp, purpose }) => {
  const record = await EmailOTP.findOne({
    email,
    purpose,
    consumedAt: null,
  }).sort({ createdAt: -1 });

  if (!record) throw new ApiError(400, "OTP expired or invalid");

  if (record.expiresAt < new Date()) throw new ApiError(400, "OTP expired");

  if (record.attemptCount >= MAX_ATTEMPTS)
    throw new ApiError(429, "Too many attempts");

  const isValid = await bcrypt.compare(otp, record.otpHash);
  if (!isValid) {
    record.attemptCount += 1;
    await record.save();
    throw new ApiError(401, "Invalid OTP");
  }

  record.consumedAt = new Date();
  await record.save();

  return true;
};
