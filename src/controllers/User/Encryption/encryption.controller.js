import { asyncHandler } from "../../../utils/asyncHandler.js";
import { decryptData, encryptData } from "../../../utils/CryptoUtils.js";

const encryptionHandler = asyncHandler(async (req, res) => {
  try {
    const jsonData = req.body; // Get the entire JSON data from request body

    if (!jsonData || Object.keys(jsonData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "JSON data is required for encryption",
      });
    }

    const { encryptedData } = encryptData(jsonData); // Encrypt the entire JSON

    return res.status(200).json({
      encryptedData: encryptedData,
    });
  } catch (error) {
    console.error("Encryption Error:", error);
    return res.status(500).json({
      success: false,
      message: "Encryption failed",
    });
  }
});

const decryptionHandler = asyncHandler(async (req, res) => {
  try {
    const { encryptedData } = req.body;
    if (!encryptedData) {
      return res.status(400).json({
        success: false,
        message: "Encrypted data is required for decryption",
      });
    }

    const { decryptedData } = decryptData(encryptedData);

    return res.status(200).json({
      success: true,
      decryptedData,
    });
  } catch (error) {
    console.error("Decryption Error:", error);
    return res.status(400).json({
      success: false,
      message: "Decryption failed. Invalid data or corrupted payload.",
    });
  }
});

export { encryptionHandler, decryptionHandler };
