// import { encryptData, decryptData } from "./CryptoUtils.js";

import { decryptData, encryptData } from "./CryptoUtils.js";

import { ApiError } from "./ApiError.js";

/**
 * Encrypt JWT token using the same AES layer
 */
export const encryptToken = (token) => {
  if (!token) return token;
  return encryptData(token); // returns encrypted string
};

/**
 * Only decrypt JWT token, not entire body
 */
export const decryptToken = (encryptedToken) => {
  if (!encryptedToken) return encryptedToken;

  try {
    const { decryptedData } = decryptData(encryptedToken);
    return decryptedData;
  } catch (err) {
    console.error("Token decryption failed:", err);
    throw new ApiError(401, "Invalid encrypted token");
  }
};
