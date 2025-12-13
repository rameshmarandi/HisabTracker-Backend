import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";

import { asyncHandler } from "../utils/asyncHandler.js";
// import { Admin } from "../models/Admin/Auth/admin.model.js";
import { User } from "../models/User/Auth/user.model.js";
import { decryptData } from "../utils/CryptoUtils.js";
import { ADMIN_ROLES, USER_ROLES } from "../constant.js";
import { ENV } from "../utils/env.js";
import { decryptToken } from "../utils/TokenCrypto.js";
import { ApiResponse } from "../utils/ApiResponse.js";
/**
 * Verify JWT for Users (User Model)
 */
export const verifyUserJWT = asyncHandler(async (req, res, next) => {
  try {
    // Get encrypted token from header or cookie
    const encryptedToken =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!encryptedToken) {
      throw new ApiError(401, "Unauthorized: Token missing");
    }

    // 🔓 1️⃣ Decrypt token BEFORE verifying
    let rawToken;
    try {
      rawToken = decryptToken(encryptedToken);
    } catch (err) {
      throw new ApiError(401, "Unauthorized: Invalid encrypted token");
    }

    // 2️⃣ Verify raw JWT signature + expiry
    let decoded;
    try {
      decoded = jwt.verify(rawToken, ENV.ACCESS_TOKEN_SECRET);
    } catch (error) {
      throw new ApiError(401, "Unauthorized: Token expired or invalid");
    }

    // 3️⃣ Check if user exists & active
    const user = await User.findById(decoded?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new ApiError(403, "User not found, unauthorized");
    }

    // 4️⃣ Attach user to request
    req.user = user;
    next();
  } catch (err) {
    console.error("verifyUserJWT Error:", err);
    next(err);
  }
});
export const verifyDeviceAccess = asyncHandler(async (req, res, next) => {
  const deviceId = req.header("x-device-id");
  if (!deviceId) {
    throw new ApiError(
      401,
      "Unauthorized: Device ID missing",
      "device-missing"
    );
  }

  const user = req.user;

  console.log("user_list", {
    user,
    deviceId,
  });
  const device = user.devices.find((d) => {
    console.log("Device_listed_hers", d);

    return d.deviceId == deviceId;
  });

  if (!device) {
    return res.status(403).json(
      new ApiResponse(
        403,
        {
          reason: "device-not-registered",
          devices: user.devices.map((d) => ({
            deviceId: d.deviceId,
            deviceName: d.deviceName,
            lastActive: d.lastActive,
          })),
        },
        "New device detected — Login required"
      )
    );
  }

  device.lastActive = Date.now();
  await user.save();
  next();
});

export const enforceDeviceLimit = asyncHandler(async (req, res, next) => {
  const user = req.user;
  const maxDevices = user.currentSubscription?.maxDevicesAllowed || 1;

  if (user.devices.length > maxDevices) {
    return res.status(403).json({
      statusCode: 403,
      success: false,
      reason: "device-limit-reached",
      message: "Device limit exceeded. Remove a device to continue.",
      data: {
        devices: user.devices,
        maxDevicesAllowed: maxDevices,
      },
    });
  }

  next();
});

export const checkSubscriptionStatus = asyncHandler(async (req, res, next) => {
  const { currentSubscription: sub } = req.user;

  if (sub?.isPremium && sub?.expiresAt && Date.now() > sub.expiresAt) {
    return res.status(402).json({
      statusCode: 402,
      success: false,
      reason: "subscription-expired",
      message:
        "Subscription expired. Please renew to continue using premium features.",
      data: {
        expiresAt: sub.expiresAt,
      },
    });
  }

  next();
});

// export const verifyAdminJWT = asyncHandler(async (req, res, next) => {
//   try {
//     // ✅ Extract Token from Cookies or Authorization Header
//     const token =
//       req.cookies?.accessToken ||
//       req.header("Authorization")?.replace("Bearer ", "");

//     if (!token) {
//       return res.status(401).json({
//         success: false,
//         statusCode: 401,
//         message: "Unauthorized: No access token provided",
//       });
//     }

//     // later in production use this
//     // const { decryptedData } = decryptData(token);
//     // ✅ Verify Token
//     let decodedToken;
//     try {
//       decodedToken = jwt.verify(token, ENV.ACCESS_TOKEN_SECRET);
//     } catch (error) {
//       console.error("JWT Verification Error:", error.message);
//       return res.status(401).json({
//         success: false,
//         statusCode: 401,
//         message: "Unauthorized: Invalid or Expired Token",
//       });
//     }

//     // ✅ Find Admin in DB
//     const admin = await Admin.findById(decodedToken._id).select(
//       "-password -refreshToken"
//     );

//     if (!admin) {
//       return res.status(403).json({
//         success: false,
//         statusCode: 403,
//         message: "Forbidden: Admin not found",
//       });
//     }

//     req.admin = admin;
//     next();
//   } catch (error) {
//     console.error("verifyAdminJWT Error:", error.message);
//     return res.status(500).json({
//       success: false,
//       statusCode: 500,
//       message: "Internal Server Error",
//     });
//   }
// });

// export const authSuperAdmin = asyncHandler(async (req, res, next) => {
//   if (!req.admin || req.admin.role !== ADMIN_ROLES.SUPER_ADMIN) {
//     return res.status(403).json({
//       success: false,
//       statusCode: 403,
//       message: "Access forbidden: Super Admins only",
//     });
//   }
//   next();
// });
/**
 * Allow Admin & Super Admin
 */
// export const authAdminOrSuperAdmin = asyncHandler(async (req, res, next) => {
//   if (
//     !req.admin ||
//     ![ADMIN_ROLES.ADMIN, ADMIN_ROLES.SUPER_ADMIN].includes(req.admin.role)
//   ) {
//     return res.status(403).json({
//       success: false,
//       statusCode: 403,
//       message: "Unauthorized: Admins only",
//     });
//   }
//   next();
// });
