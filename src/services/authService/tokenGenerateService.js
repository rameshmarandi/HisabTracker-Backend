// import { Admin } from "../models/Admin/Auth/admin.model.js";
// import { User } from "../models/User/Auth/user.model.js";
import { User } from "../../models/User/Auth/user.model.js";
import { ApiError } from "../../utils/ApiError.js";

const generateAccessTokenAndRefreshToken = async (userID) => {
  try {
    const user = await User.findById(userID);

    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();
    // console.log("TokenGenerated", accessToken);

    user.refreshToken = refreshToken;
    await user.save({
      validateBeforeSave: false, // Don't validate the model before saving
    });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access token and refresh token"
    );
  }
};
// const adminGenerateAccessTokenAndRefreshToken = async (userID) => {
//   try {
//     const user = await Admin.findById(userID);

//     const accessToken = await user.generateAccessToken();
//     const refreshToken = await user.generateRefreshToken();

//     user.refreshToken = refreshToken;
//     await user.save({
//       validateBeforeSave: false, // Don't validate the model before saving
//     });

//     return { accessToken, refreshToken };
//   } catch (error) {
//     throw new ApiError(
//       500,
//       "Something went wrong while generating access token and refresh token"
//     );
//   }
// };

// const adminGenerateAccessTokenAndRefreshToken = async (userID) => {
//   try {
//     const user = await Admin.findById(userID);

//     if (!user) {
//       throw new ApiError(404, "User not found");
//     }

//     const accessToken = await user.generateAccessToken();
//     const refreshToken = await user.generateRefreshToken();

//     // ✅ Use `findByIdAndUpdate()` to ensure immediate DB update
//     const updatedUser = await Admin.findByIdAndUpdate(
//       userID,
//       { refreshToken },
//       { new: true }
//     );

//     if (!updatedUser) {
//       throw new ApiError(500, "Failed to update refresh token in DB");
//     }

//     return { accessToken, refreshToken };
//   } catch (error) {
//     throw new ApiError(
//       500,
//       "Something went wrong while generating access token and refresh token"
//     );
//   }
// };

export {
  generateAccessTokenAndRefreshToken,
  // adminGenerateAccessTokenAndRefreshToken,
};
