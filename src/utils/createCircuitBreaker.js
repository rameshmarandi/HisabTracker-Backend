import CircuitBreaker from 'opossum';

const defaultOptions = {
  timeout: 5000, // 3 seconds
  errorThresholdPercentage: 50, // Break after 50% failure rate
  resetTimeout: 5000, // Try again after 5 seconds
};

const createCircuitBreaker = (fn, options = defaultOptions) => {
  const breaker = new CircuitBreaker(fn, options);

  // ✅ Fallback for failure
  breaker.fallback(() => {
    throw new Error('Service temporarily unavailable. Please try again later.');
  });


  breaker.on('open', () => {
    console.warn(`Circuit OPEN for ${breaker.name}`);
  });
  
  breaker.on('halfOpen', () => {
    console.info(`Circuit HALF-OPEN for ${breaker.name}`);
  });
  // ✅ Logging and debugging
  breaker.on('open', () => console.warn('🚨 Circuit breaker opened!'));
  breaker.on('close', () => console.info('✅ Circuit breaker closed.'));
  breaker.on('halfOpen', () => console.info('🔄 Circuit breaker half-open.'));
  breaker.on('failure', (error) =>
    console.error('❌ Circuit breaker failure:', error)
  );
  breaker.on('success', () => console.info('✔️ Circuit breaker success!'));

  return breaker;
};

// ✅ Middleware function
// const circuitBreakerMiddleware = (fn, options = defaultOptions) => {
//   const breaker = createCircuitBreaker(fn, options);

//   return async (req, res, next) => {
//     try {
//       await breaker.fire(req, res, next);
//     } catch (error) {
//       next(error);
//     }
//   };
// };
// ✅ Example Usage

export default createCircuitBreaker;
