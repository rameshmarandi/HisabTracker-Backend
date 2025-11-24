import { ApiError } from "../utils/ApiError.js";
import logger from "../utils/logger.js";

const errorHandler = (err, req, res, next) => {
  logger.error(`[Error] ${err.message} - ${req.method} ${req.originalUrl}`, {
    stack: err.stack,
    ip: req.ip,
    body: req.body,
    query: req.query,
    params: req.params,
  });
  return ApiError.handleError(err, res);
  // return res.status(500).json({
  //   success: false,
  //   statusCode: 500,
  //   error: {
  //     message: err.message || 'Internal Server Error',
  //   },
  // });
};

export default errorHandler;
