import { ApiResponse } from "../utils/ApiResponse.js";

/**
 * Joi Validation Middleware
 * - validates body using provided schema
 * - cleans Joi error message (removes quotes)
 * - capitalizes first letter
 * - returns standardized ApiResponse
 */
export const validateRequest = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);

  if (error) {
    // Clean Joi error message
    let msg = error.details[0].message
      .replace(/"/g, "") // remove quotes
      .replace(/^\w/, (c) => c.toUpperCase()); // capitalize first letter

    return res.status(400).json(new ApiResponse(400, {}, msg));
  }

  next();
};
