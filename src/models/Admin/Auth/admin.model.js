// import mongoose from "mongoose";
// import jwt from "jsonwebtoken";
// import bcrypt from "bcrypt";
// import { ADMIN_ROLE_VALUES, ADMIN_ROLES } from "../../../constant.js";
// import { ENV } from "../../../utils/env.js";

// // 🔹 Permission Schema (for granular access control)
// const permissionSchema = new mongoose.Schema({
//   module: { type: String, required: true }, // e.g., "users", "transactions"
//   actions: [
//     { type: String, enum: ["create", "read", "update", "delete", "approve"] },
//   ],
// });

// // 🔹 Login History Schema
// const loginHistorySchema = new mongoose.Schema({
//   ipAddress: String,
//   location: {
//     country: String,
//     region: String,
//     city: String,
//     lat: Number,
//     lng: Number,
//   },
//   device: {
//     deviceID: String,
//     model: String,
//     manufacturer: String,
//     osVersion: String,
//     platform: { type: String, enum: ["android", "ios", "web"] },
//     appVersion: String,
//     buildNumber: String,
//     isEmulator: Boolean,
//   },
//   loginAt: { type: Date, default: Date.now },
//   success: { type: Boolean, default: true },
// });

// // 🔹 Main Admin Schema
// const adminSchema = new mongoose.Schema(
//   {
//     adminID: { type: Number, unique: true, required: true },
//     fullName: { type: String, required: true },
//     email: { type: String, required: true, unique: true, lowercase: true },
//     mobileNumber: { type: String, required: true },

//     // Authentication
//     password: { type: String, required: true },
//     mpin: { type: String },

//     // Password Management
//     passwordChangedAt: { type: Date },
//     passwordExpiry: { type: Date },
//     passwordHistory: [
//       {
//         password: { type: String },
//         changedAt: { type: Date, default: Date.now },
//       },
//     ],

//     // MPIN Security
//     mpinAttempts: { type: Number, default: 0 },
//     mpinReuseCount: { type: Number, default: 1 },
//     mpinHistory: { type: [String], select: false, default: [] },

//     // Device Management (only 1 active device allowed)
//     deviceInfo: {
//       platform: { type: String },
//       model: { type: String },
//       manufacturer: { type: String },
//       osVersion: { type: String },
//       appVersion: { type: String },
//       buildNumber: { type: String },
//       deviceID: { type: String },
//       isEmulator: { type: Boolean },
//       lastLoginAt: { type: Date },
//     },

//     // Tokens
//     refreshToken: { type: String },
//     firebaseToken: { type: String, default: null },

//     // Security Controls
//     loginAttempts: { type: Number, default: 0 },
//     isAdminIDBlocked: { type: Boolean, default: false },
//     isFirstTimeSetup: { type: Boolean, default: true },

//     // Role-based Access
//     role: {
//       type: String,
//       enum: ADMIN_ROLE_VALUES,
//       default: ADMIN_ROLES.ADMIN,
//     },
//     permissions: [permissionSchema], // optional fine-grained access

//     // Login History
//     loginHistory: [loginHistorySchema],

//     // Audit Fields
//     status: {
//       type: String,
//       enum: ["active", "inactive", "suspended"],
//       default: "active",
//     },
//     createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
//     updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
//   },
//   { timestamps: true }
// );

// // ✅ Hash Password Before Saving
// adminSchema.pre("save", async function (next) {
//   if (!this.isModified("password")) return next();
//   const salt = await bcrypt.genSalt(10);
//   this.password = await bcrypt.hash(this.password, salt);

//   // Set password expiry (1 month)
//   this.passwordChangedAt = new Date();
//   this.passwordExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

//   next();
// });

// // ✅ Access Token
// adminSchema.methods.generateAccessToken = function () {
//   return jwt.sign(
//     {
//       _id: this._id,
//       adminID: this.adminID,
//       email: this.email,
//       fullName: this.fullName,
//       role: this.role,
//     },
//     ENV.ACCESS_TOKEN_SECRET,
//     { expiresIn: ENV.ACCESS_TOKEN_EXPIRY }
//   );
// };

// // ✅ Refresh Token
// adminSchema.methods.generateRefreshToken = function () {
//   return jwt.sign(
//     {
//       _id: this._id,
//       adminID: this.adminID,
//       email: this.email,
//       fullName: this.fullName,
//       role: this.role,
//     },
//     ENV.REFRESH_TOKEN_SECRET,
//     { expiresIn: ENV.REFRESH_TOKEN_EXPIRY }
//   );
// };

// export const Admin = mongoose.model("Admin", adminSchema);
