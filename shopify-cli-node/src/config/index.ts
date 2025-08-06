/**
 * Configuration Management Module for Shopify CLI
 * 
 * This module provides comprehensive configuration management with:
 * - Schema validation using Joi
 * - Environment variable overrides
 * - Support for both YAML and JSON formats
 * - Multiple Shopify accounts management
 * - Decodo API credentials management
 * - Proxy settings configuration
 * - Persistent storage with atomic updates
 */

// Export loader and error classes
export { ConfigLoader, configLoader, ConfigurationError } from './loader';

// Export schema validation
export { configSchema, createDefaultConfig, validateConfig } from './schema';

// Export types
export * from './types';

// Convenience function for loading configuration
export const loadConfig = async () => {
  const { ConfigLoader } = await import('./loader');
  const loader = new ConfigLoader();
  return loader.load();
};
