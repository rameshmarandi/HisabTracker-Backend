

import logger from "../utils/logger.js";

const requestLogger = (req, res, next) => {
  logger.info(`[Request] ${req.method} ${req.originalUrl} from ${req.ip}`, {
    headers: req.headers,
    body: req.body,
    params: req.params,
    query: req.query,
  });
  next(); // Continue to the next middleware
};

export default requestLogger;
