import speakeasy from "speakeasy";
// import cache from "../cache/index.js";
import { ApiError } from "../utils/ApiError.js";
import  {cache}  from "../cache/index.js";

const OTP_EXPIRY = 60; // OTP valid for 60 seconds
const OTP_COOLDOWN = 30; // Cooldown of 30 seconds before resending
const MAX_ATTEMPTS = 3;
const OTP_DIGITS = 4


const generateAndSendOTP = async (mobileNumber) => {
  const cooldown = await cache.get(`otp_cooldown_${mobileNumber}`);
  if (cooldown) {
    throw new ApiError(
      429,
      `Please wait ${OTP_COOLDOWN} seconds before requesting another OTP.`
    );
  }

  let attempts = await cache.get(`otp_attempts_${mobileNumber}`);
  attempts = attempts ? parseInt(attempts) : 0;

  if (attempts >= MAX_ATTEMPTS) {
    throw new ApiError(
      429,
      "Maximum OTP attempts reached. Try again after some time."
    );
  }

  // ✅ Generate OTP using speakeasy
  const OTP_SECRET = speakeasy.generateSecret({ length: 20 }).base32;
  const generatedOTP = speakeasy.totp({
    secret: OTP_SECRET,
    encoding: "base32",

    step: OTP_EXPIRY,
    digits: OTP_DIGITS,
    window : 10
  });

  // ✅ Save OTP and secret in the same cache object
  await cache.set(
    `otp_${mobileNumber}`,
    JSON.stringify({ generatedOTP, OTP_SECRET }),
    OTP_EXPIRY
  );



  // ✅ Track attempts
  await cache.set(`otp_attempts_${mobileNumber}`, attempts + 1, OTP_EXPIRY);

  // ✅ Set cooldown period
  await cache.set(`otp_cooldown_${mobileNumber}`, true, OTP_COOLDOWN);

  return generatedOTP;
};


const verifyOTP = async (mobileNumber, otp) => {


  // ✅ Read OTP and secret from cache
  const storedData = await cache.get(`otp_${mobileNumber}`);
  if (!storedData) {

    throw new ApiError(400, "OTP expired or invalid.");
  }

  const { generatedOTP, OTP_SECRET } = JSON.parse(storedData);



  // ✅ Verify OTP using speakeasy
  const isMatch = speakeasy.totp.verify({
    secret: OTP_SECRET,
    encoding: "base32",
    token: otp,
    step: OTP_EXPIRY,
    digits: OTP_DIGITS,
   window : 10
  });

  if (!isMatch) {
    console.warn(`Invalid OTP attempt for ${mobileNumber}`);
    throw new ApiError(401, "Invalid OTP");
  }

  // ✅ Clear OTP after successful verification
  await cache.del(`otp_${mobileNumber}`);


  return true;
};



const resendOTP = async (mobileNumber) => {
  return await generateAndSendOTP(mobileNumber);
};

export { generateAndSendOTP, verifyOTP, resendOTP };
