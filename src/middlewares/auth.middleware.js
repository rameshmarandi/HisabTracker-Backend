import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
// import { Admin } from "../models/Admin/Auth/admin.model.js";
import { User } from "../models/User/Auth/user.model.js";
import { decryptData } from "../utils/CryptoUtils.js";
import { ADMIN_ROLES, USER_ROLES } from "../constant.js";
import { ENV } from "../utils/env.js";
/**
 * Verify JWT for Users (User Model)
 */
export const verifyUserJWT = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: "Unauthorized: No access token provided",
      });
    }

    // Decrypt Token Before Verifying

    // const { decryptedData } = decryptData(token);

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, ENV.ACCESS_TOKEN_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: "Unauthorized: Invalid or expired token",
      });
    }

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: "Unauthorized: User not found",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("verifyUserJWT Error:", error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error",
    });
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
