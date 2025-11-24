import CryptoJS from "crypto-js";
import dotenv from "dotenv";

dotenv.config();

const AES_SECRET_KEY = process.env.AES_SECRET_KEY;

export const encryptData = (data) => {
  try {
    const iv = CryptoJS.lib.WordArray.random(16);
    const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(data), CryptoJS.enc.Utf8.parse(AES_SECRET_KEY), {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }).toString();

    const encryptedString = `${CryptoJS.enc.Base64.stringify(iv)}:${ciphertext}`;

    return { encryptedData: encryptedString }; // ✅ Standardized response
  } catch (error) {
    console.error("Encryption Failed:", error.message);
    throw new Error("Encryption error: Failed to process data");
  }
};

export const decryptData = (ciphertext) => {
  try {
    const decodedCiphertext = decodeURIComponent(ciphertext);
    const [ivBase64, encryptedText] = decodedCiphertext.split(":");

    if (!ivBase64 || !encryptedText) {
      throw new Error("Invalid encrypted format");
    }

    const iv = CryptoJS.enc.Base64.parse(ivBase64);
    const bytes = CryptoJS.AES.decrypt(encryptedText, CryptoJS.enc.Utf8.parse(AES_SECRET_KEY), {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    return { decryptedData: JSON.parse(bytes.toString(CryptoJS.enc.Utf8)) }; // ✅ Standardized response
  } catch (error) {
    console.error("Decryption Failed:", error.message);
    throw new Error("Decryption error: Invalid data");
  }
};
