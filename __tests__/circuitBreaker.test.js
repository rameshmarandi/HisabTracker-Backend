import express from "express";
import request from 'supertest';

import { mockFailureController, mockSuccessController } from '../__mocks__/mockController.js';
import circuitBreakerMiddleware from "../src/middlewares/circuitBreakerMiddleware.js";

const app = express();

app.get('/test-success', circuitBreakerMiddleware(mockSuccessController));
app.get('/test-failure', circuitBreakerMiddleware(mockFailureController));

jest.setTimeout(10000); // Increase global timeout for all tests

describe('Circuit Breaker Middleware', () => {
  test('✅ Should return success response when service works', async () => {
    const response = await request(app).get('/test-success');
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Success!');
  });

  test('❌ Should return failure response on service failure', async () => {
    const response = await request(app).get('/test-failure');
    expect(response.status).toBe(500);
    expect(response.body.message).toContain('unavailable');
  });

  test('🚨 Circuit Breaker should OPEN after multiple failures', async () => {
    // Trip the breaker with consecutive failures
    await request(app).get('/test-failure');
    await request(app).get('/test-failure');
    const response = await request(app).get('/test-failure');
    
    expect(response.status).toBe(500);
    expect(response.body.message).toContain('unavailable');
  });

  test('🔄 Circuit Breaker recovers after reset timeout', async () => {
    // Trip the breaker again to ensure test isolation
    await request(app).get('/test-failure');
    await request(app).get('/test-failure');
    await request(app).get('/test-failure');

    // Wait for reset timeout (5s) plus buffer
    await new Promise(resolve => setTimeout(resolve, 6000));

    // Verify circuit has closed and allows requests
    const response = await request(app).get('/test-success');
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Success!');
  });
});