import createCircuitBreaker from "../utils/createCircuitBreaker.js";

const circuitBreakerMiddleware = (fn, options) => {
  // ✅ Ensure the function returns a promise
  const asyncFn = async (...args) => Promise.resolve(fn(...args));

  const breaker = createCircuitBreaker(asyncFn, options);

  return async (req, res, next) => {
    try {
      await breaker.fire(req, res, next);
    } catch (error) {
      console.error('❌ Circuit breaker error:', error.message);
      res.status(500).json({
        success: false,
        message:
          error.message || 'Service temporarily unavailable. Please try again later.',
      });
    }
  };
};

export default circuitBreakerMiddleware;
