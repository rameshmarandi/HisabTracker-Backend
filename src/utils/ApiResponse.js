import { encryptData } from "./CryptoUtils.js";

class ApiResponse {
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode <400
  }
}


const sendResponse = (res, statusCode = 200, data = {}, message = "Success") => {
  if (!res) {
    throw new Error("Response object is required");
  }

  // Ensure data is always an object
  const responseData =
    process.env.ENABLE_ENCRYPTION === "true" ? encryptData(data || {}) : data;

  return res.status(statusCode).json(new ApiResponse(statusCode, responseData, message));
};

export {ApiResponse , sendResponse}