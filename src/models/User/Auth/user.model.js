import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { ApiError } from "../../../utils/ApiError.js";
import { ENV } from "../../../utils/env.js";

// -------------------------------------------------------------
// Device Schema
// -------------------------------------------------------------
// const deviceSchema = new mongoose.Schema({
//   deviceId: { type: String },
//   deviceName: { type: String },
//   lastActive: { type: Number, default: Date.now() },
//   lastSyncedAt: { type: Number, default: null },
// });
const deviceSchema = new mongoose.Schema({
  deviceId: { type: String, required: true },
  deviceName: { type: String, default: "Unknown Device" },
  refreshToken: { type: String, default: null }, // <---- PER DEVICE TOKEN
  lastActive: { type: Number, default: Date.now() },
  lastSyncedAt: { type: Number, default: null },
});

// -------------------------------------------------------------
// Wallet Schema
// -------------------------------------------------------------
const walletSchema = new mongoose.Schema({
  referralPoints: { type: Number, default: 0 },
  totalEarnedPoints: { type: Number, default: 0 },
  totalUsedPoints: { type: Number, default: 0 },
});

// -------------------------------------------------------------
// MAIN USER SCHEMA (HISABTRACKER FINAL)
// -------------------------------------------------------------
const UserSchema = new mongoose.Schema(
  {
    // ---------------- AUTH ----------------
    username: { type: String, required: true, minlength: 3, maxlength: 50 },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },

    refreshToken: { type: String },

    // ---------------- SUBSCRIPTION ----------------
    isPremium: { type: Boolean, default: false },

    premiumPlanKey: { type: String, default: null }, // month_1, month_3, month_6, year_1
    premiumStartedAt: { type: Number, default: null },
    premiumExpiresAt: { type: Number, default: null },

    featureAccess: {
      type: Object,
      default: {
        cloudSync: false,
        multiDevice: false,
        premiumThemes: false,
        advancedPdf: false,
      },
    },

    maxDevicesAllowed: { type: Number, default: 1 }, // Free = 1, Premium = 3

    devices: {
      type: [deviceSchema],
      default: [],
    },

    // ---------------- REFERRAL SYSTEM ----------------
    referralCode: { type: String, unique: true },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    wallet: {
      type: walletSchema,
      default: () => ({}),
    },

    // ---------------- SYNC SYSTEM ----------------
    lastFullSyncAt: { type: Number, default: null },
    lastPartialSyncAt: { type: Number, default: null },
    lastSyncVersion: { type: Number, default: 0 },
    syncToken: { type: String, default: null },

    // ---------------- ACCOUNT ----------------
    status: {
      type: String,
      enum: ["active", "blocked", "deleted"],
      default: "active",
    },

    // ---------------- FCM TOKEN (For Push Notifications) ----------------
    firebaseToken: { type: String }, // <—— VERY IMPORTANT
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// -------------------------------------------------------------
// Hide Sensitive Fields
// -------------------------------------------------------------
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  delete obj.refreshToken;
  return obj;
};

// -------------------------------------------------------------
// Password Encryption
// -------------------------------------------------------------
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// -------------------------------------------------------------
// Compare Password
// -------------------------------------------------------------
UserSchema.methods.comparePassword = async function (plainPassword) {
  return await bcrypt.compare(plainPassword, this.password);
};

// -------------------------------------------------------------
// Referral Code Generation
// -------------------------------------------------------------
UserSchema.pre("save", function (next) {
  if (!this.referralCode) {
    this.referralCode =
      "HT" + Math.random().toString(36).substr(2, 6).toUpperCase();
  }
  next();
});

// -------------------------------------------------------------
// Generate Access Token
// -------------------------------------------------------------
UserSchema.methods.generateAccessToken = function () {
  try {
    return jwt.sign(
      {
        _id: this._id,
        email: this.email,
      },
      ENV.ACCESS_TOKEN_SECRET,
      { expiresIn: ENV.ACCESS_TOKEN_EXPIRY }
    );
  } catch (error) {
    throw new ApiError(500, "Error generating access token");
  }
};

// -------------------------------------------------------------
// Generate Refresh Token
// -------------------------------------------------------------
UserSchema.methods.generateRefreshToken = function () {
  try {
    return jwt.sign({ _id: this._id }, ENV.REFRESH_TOKEN_SECRET, {
      expiresIn: ENV.REFRESH_TOKEN_EXPIRY,
    });
  } catch (error) {
    throw new ApiError(500, "Error generating refresh token");
  }
};

export const User = mongoose.model("User", UserSchema);
