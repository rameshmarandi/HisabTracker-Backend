// models/user.model.js
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { ApiError } from "../../../utils/ApiError.js";
import { ENV } from "../../../utils/env.js";

// -------------------------------------------------------------
// Device Schema
// -------------------------------------------------------------

const deviceSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true },
    deviceName: { type: String, default: "Unknown Device" },

    // New fields (from client)
    platform: { type: String, default: null },
    model: { type: String, default: null },
    osVersion: { type: String, default: null },
    manufacturer: { type: String, default: null },
    appVersion: { type: String, default: null },
    buildNumber: { type: String, default: null },
    isEmulator: { type: Boolean, default: false },

    refreshToken: { type: String, default: null },
    lastActive: { type: Number, default: Date.now() },
    lastSyncedAt: { type: Number, default: null },
  },
  { _id: false }
);

// -------------------------------------------------------------
// Wallet Schema
// -------------------------------------------------------------
const walletSchema = new mongoose.Schema({
  balance: { type: Number, default: 0 },
  totalEarnedCash: { type: Number, default: 0 },
  totalUsedCash: { type: Number, default: 0 },
});

// -------------------------------------------------------------
// Subscription Schema (New & Clean)
// -------------------------------------------------------------
const subscriptionSchema = new mongoose.Schema(
  {
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
      default: null,
    },

    planKey: { type: String, default: null }, // ex: free, month_1, year_1
    planName: { type: String, default: null }, // UI friendly display

    isPremium: { type: Boolean, default: false },

    features: { type: Object, default: {} },

    maxDevicesAllowed: { type: Number, default: 1 },

    startedAt: { type: Number, default: null },
    expiresAt: { type: Number, default: null },

    source: {
      type: String,
      enum: [
        "signup", // Free default during registration
        "trial", // Free trial premium
        "payment", // First time paid purchase
        "renewal", // Subscription renewal
        "referral", // Referral bonus upgrade
        "admin", // Admin manually applied
        "promo", // Special promotion / event upgrade
      ],
      default: "signup",
      index: true,
    },
  },
  { _id: false }
);

// -------------------------------------------------------------
// MAIN USER SCHEMA
// -------------------------------------------------------------
const UserSchema = new mongoose.Schema(
  {
    // AUTH
    username: { type: String, required: true, minlength: 3, maxlength: 50 },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minlength: 6, select: false },

    refreshToken: { type: String },

    // DEVICE ACCESS
    devices: { type: [deviceSchema], default: [] },

    // SUBSCRIPTION (Final Structure)
    currentSubscription: {
      type: subscriptionSchema,
      default: () => ({
        isPremium: false,
        maxDevicesAllowed: 1,
        features: {},
        source: "signup",
      }),
    },

    // REFERRAL SYSTEM
    referralCode: { type: String, unique: true },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // WALLET
    wallet: { type: walletSchema, default: () => ({}) },

    // SYNC SYSTEM
    lastFullSyncAt: { type: Number, default: null },
    lastPartialSyncAt: { type: Number, default: null },
    lastSyncVersion: { type: Number, default: 0 },
    syncToken: { type: String, default: null },

    // ACCOUNT
    status: {
      type: String,
      enum: ["active", "blocked", "deleted"],
      default: "active",
    },
    emailVerified: { type: Boolean, default: false },
    emailVerifiedAt: { type: Date, default: null },
    passwordResetToken: { type: String, default: null, select: false },
    passwordResetExpiresAt: { type: Number, default: null },

    firebaseToken: { type: String }, // For notifications
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    minimize: false,
  }
);

// -------------------------------------------------------------
// Sanitize JSON Response
// -------------------------------------------------------------
UserSchema.methods.toJSON = function () {
  const u = this.toObject();

  delete u.password;
  delete u.refreshToken;
  delete u.__v;
  delete u.syncToken;

  if (u.devices && Array.isArray(u.devices)) {
    u.devices = u.devices.map((d) => ({
      deviceId: d.deviceId,
      deviceName: d.deviceName,
      lastActive: d.lastActive,
      lastSyncedAt: d.lastSyncedAt,
      _id: d._id,
    }));
  }

  if (u.wallet) {
    delete u.wallet._id;
  }

  return u;
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
// Generate UNIQUE Referral Code
// -------------------------------------------------------------
UserSchema.pre("save", async function (next) {
  if (this.referralCode) return next();

  let code;
  let exists = true;

  while (exists) {
    const digits = Math.floor(100000 + Math.random() * 900000).toString();
    code = "HT" + digits;
    exists = await this.constructor.exists({ referralCode: code });
  }

  this.referralCode = code;
  next();
});

// -------------------------------------------------------------
// PASSWORD CHECK
// -------------------------------------------------------------
UserSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

// -------------------------------------------------------------
// TOKEN GENERATORS
// -------------------------------------------------------------
UserSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    { _id: this._id, email: this.email },
    ENV.ACCESS_TOKEN_SECRET,
    { expiresIn: ENV.ACCESS_TOKEN_EXPIRY }
  );
};

UserSchema.methods.generateRefreshToken = function () {
  return jwt.sign({ _id: this._id }, ENV.REFRESH_TOKEN_SECRET, {
    expiresIn: ENV.REFRESH_TOKEN_EXPIRY,
  });
};

export const User = mongoose.model("User", UserSchema);
