import { ApiError } from "../utils/ApiError.js";
import { encryptData, decryptData } from "../utils/CryptoUtils.js";

// Strategy base
class EncryptionStrategy {
  encrypt(data) {
    throw new Error("encrypt() must be implemented");
  }

  decrypt(data) {
    throw new Error("decrypt() must be implemented");
  }
}

// Default strategy implementation
class DefaultEncryptionStrategy extends EncryptionStrategy {
  encrypt(data) {
    return encryptData(data);
  }

  decrypt(encryptedData) {
    const { decryptedData } = decryptData(encryptedData);
    return decryptedData;
  }
}

// ✅ Normalize request path for matching
const normalizePath = (path) =>
  path
    .replace(/\/{2,}/g, "/") // replace double slashes
    .replace(/\/+$/, "") // remove trailing slash
    .split("?")[0]; // ignore query params

// Singleton service
class PayloadCrypto {
  constructor() {
    this.ENABLED = process.env.ENABLE_ENCRYPTION === "true";
    this.strategy = new DefaultEncryptionStrategy();

    // ✅ Skipped routes by METHOD + PATH
    this.skipRoutes = [
      { method: "POST", path: "/api/v1/decrypt" },
      { method: "POST", path: "/api/v1/encrypt" },
      { method: "POST", path: "/api/v1/user/register" },
      { method: "GET", path: "/api/v1/user/getSkills" },

      { method: "POST", path: "/api/v1/user/findNearbySkilledUsers" },
    ];
  }

  shouldSkipMiddleware(req) {
    const reqPath = normalizePath(req.originalUrl || req.url);
    return this.skipRoutes.some(
      (route) =>
        route.method === req.method && normalizePath(route.path) === reqPath
    );
  }

  extractPayload(req) {
    if (!this.ENABLED) return req.body;

    const encryptedData = req.body?.encryptedData;
    if (!encryptedData) {
      throw new ApiError(400, "Encrypted payload is required");
    }

    return this.strategy.decrypt(encryptedData);
  }

  formatResponse(data) {
    if (!this.ENABLED) return data;
    return this.strategy.encrypt(data);
  }

  // ✅ Middleware to decrypt incoming request body
  decryptRequestMiddleware() {
    return (req, res, next) => {
      if (this.shouldSkipMiddleware(req)) {
        // console.log(`[SKIPPED] Decryption: ${req.method} ${req.originalUrl}`);
        return next();
      }

      try {
        if (this.ENABLED && req.body?.encryptedData) {
          req.body = this.strategy.decrypt(req.body.encryptedData);
          //   console.log(`[DECRYPTED] Request: ${req.method} ${req.originalUrl}`);
        }
        next();
      } catch (err) {
        next(err);
      }
    };
  }

  // ✅ Middleware to encrypt outgoing response
  encryptResponseMiddleware() {
    return (req, res, next) => {
      if (this.shouldSkipMiddleware(req)) {
        // console.log(`[SKIPPED] Encryption: ${req.method} ${req.originalUrl}`);
        return next();
      }

      const originalJson = res.json.bind(res);
      res.json = (data) => {
        const encrypted = this.ENABLED ? this.strategy.encrypt(data) : data;
        // console.log(`[ENCRYPTED] Response: ${req.method} ${req.originalUrl}`);
        return originalJson(encrypted);
      };

      next();
    };
  }
}

const payloadCrypto = new PayloadCrypto();
export default payloadCrypto;
