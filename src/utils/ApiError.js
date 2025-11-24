class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.success = false;
    Error.captureStackTrace(this, this.constructor);
  }

  static handleError(error, res) {
    let statusCode = error instanceof ApiError ? error.statusCode : 500;
    let message =
      error instanceof ApiError ? error.message : "Internal Server Error";

    // ✅ Handle Mongoose validation errors
    if (error.name === "ValidationError") {
      statusCode = 400;
      const fieldErrors = Object.values(error.errors || {}).map(
        (err) => err.message
      );
      message = fieldErrors[0] || "Validation failed"; // Return only the first field error
    }

    console.error("[Error]: ", error.stack || error);

    const response = {
      success: false,
      statusCode: statusCode,
      error: {
        message: message,
      },
    };

    return res.status(statusCode).json(response);
  }
}

export { ApiError };
