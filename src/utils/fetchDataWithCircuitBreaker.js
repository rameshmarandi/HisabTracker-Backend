

import {cache}  from '../cache/index.js';
import createCircuitBreaker from './createCircuitBreaker.js';


const fetchDataWithCircuitBreaker = createCircuitBreaker(async (key) => {
  console.log(`🔍 Attempting to read cache for key: ${key}`);

  const data = await cache.get(key);
  if (data !== undefined) {

    return data;
  }

  console.log(`❌ Cache miss for key: ${key}`);
  throw new Error(`Data not found for key: ${key}`);
});

export { fetchDataWithCircuitBreaker };
