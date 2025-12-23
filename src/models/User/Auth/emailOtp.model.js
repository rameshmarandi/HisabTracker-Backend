import mongoose from "mongoose";

const emailOtpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, index: true },
    otpHash: { type: String, required: true },
    purpose: {
      type: String,
      enum: ["EMAIL_VERIFY", "FORGOT_PASSWORD"],
      required: true,
      index: true,
    },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null },
    attemptCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

emailOtpSchema.index({ email: 1, purpose: 1 });

export const EmailOTP = mongoose.model("EmailOTP", emailOtpSchema);
