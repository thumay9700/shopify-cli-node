import { jest } from '@jest/globals';

// Global test setup
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset environment variables to prevent test pollution
  delete process.env.SHOPIFY_CLI_DEBUG;
  delete process.env.SHOPIFY_ACCESS_TOKEN;
  delete process.env.DECODO_API_ENDPOINT;
  delete process.env.DECODO_API_KEY;
});

// Mock console methods to avoid noise in tests unless explicitly testing them
globalThis.console = {
  ...console,
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
};

// Mock process.env with base values
process.env.NODE_ENV = 'test';
