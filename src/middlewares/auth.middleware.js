import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
// import { Admin } from "../models/Admin/Auth/admin.model.js";
import { User } from "../models/User/Auth/user.model.js";
import { decryptData } from "../utils/CryptoUtils.js";
import { ADMIN_ROLES, USER_ROLES } from "../constant.js";
import { ENV } from "../utils/env.js";
import { decryptToken } from "../utils/TokenCrypto.js";
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
