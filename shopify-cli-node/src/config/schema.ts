import Joi from 'joi';

import { DecodoApiCredentials, GlobalSettings, ProxySettings, ShopifyAccount, ShopifyCliConfig } from './types';

/**
 * Joi schema for Shopify account validation
 */
const shopifyAccountSchema = Joi.object<ShopifyAccount>({
  accessToken: Joi.string().optional().min(1).description('Shopify access token'),
  apiKey: Joi.string().optional().min(1).description('Shopify API key'),
  apiSecret: Joi.string().optional().min(1).description('Shopify API secret'),
  isDefault: Joi.boolean().optional().default(false).description('Whether this is the default account'),
  name: Joi.string().required().min(1).max(100).description('Account name'),
  shopUrl: Joi.string().required().uri({ scheme: ['https', 'http'] }).description('Shopify shop URL'),
});

/**
 * Joi schema for Decodo API credentials validation
 */
const decodoApiCredentialsSchema = Joi.object<DecodoApiCredentials>({
  apiKey: Joi.string().required().min(1).description('Decodo API key'),
  endpoint: Joi.string().required().uri({ scheme: ['https', 'http'] }).description('Decodo API endpoint'),
  timeout: Joi.number().optional().integer().min(1000).max(300_000).default(30_000).description('API timeout in milliseconds'),
});

/**
 * Joi schema for proxy settings validation
 */
const proxySettingsSchema = Joi.object<ProxySettings>({
  enabled: Joi.boolean().required().description('Whether proxy is enabled'),
  host: Joi.string().when('enabled', {
    is: true,
    otherwise: Joi.optional(),
    then: Joi.required(),
  }).description('Proxy host'),
  password: Joi.string().optional().description('Proxy password'),
  port: Joi.number().when('enabled', {
    is: true,
    otherwise: Joi.optional(),
    then: Joi.number().required().min(1).max(65_535),
  }).description('Proxy port'),
  protocol: Joi.string().optional().valid('http', 'https', 'socks4', 'socks5').default('http').description('Proxy protocol'),
  username: Joi.string().optional().description('Proxy username'),
});

/**
 * Joi schema for global settings validation
 */
const globalSettingsSchema = Joi.object<GlobalSettings>({
  autoUpdate: Joi.boolean().optional().default(true).description('Enable automatic updates'),
  debug: Joi.boolean().optional().default(false).description('Enable debug mode'),
  logLevel: Joi.string().optional().valid('error', 'warn', 'info', 'debug').default('info').description('Log level'),
  theme: Joi.string().optional().valid('default', 'dark', 'light').default('default').description('CLI theme'),
});

/**
 * Main configuration schema
 */
export const configSchema = Joi.object<ShopifyCliConfig>({
  accounts: Joi.array().items(shopifyAccountSchema).min(0).required()
    .custom((value, helpers) => {
      // Ensure only one default account
      const defaultAccounts = value.filter((account: ShopifyAccount) => account.isDefault);
      if (defaultAccounts.length > 1) {
        return helpers.error('array.defaultAccount');
      }
      
      // Ensure unique account names
      const names = value.map((account: ShopifyAccount) => account.name.toLowerCase());
      const uniqueNames = new Set(names);
      if (names.length !== uniqueNames.size) {
        return helpers.error('array.uniqueNames');
      }
      
      return value;
    })
    .messages({
      'array.defaultAccount': 'Only one account can be marked as default',
      'array.uniqueNames': 'Account names must be unique (case-insensitive)',
    })
    .description('Shopify accounts'),
  decodoApi: decodoApiCredentialsSchema.optional().description('Decodo API credentials'),
    
  lastUpdated: Joi.string().required().isoDate().description('Last configuration update timestamp'),
  
  proxy: proxySettingsSchema.optional().description('Proxy settings'),
  
  settings: globalSettingsSchema.required().description('Global CLI settings'),
  
  version: Joi.string().required().pattern(/^\d+\.\d+\.\d+$/).description('Configuration version'),
});

/**
 * Validation options schema
 */
export const validationOptionsSchema = Joi.object({
  allowPartial: Joi.boolean().optional().default(false),
  requireAccounts: Joi.boolean().optional().default(false),
  requireDecodoApi: Joi.boolean().optional().default(false),
});

/**
 * Validates configuration data against the schema
 */
export function validateConfig(
  data: unknown, 
  options: { allowPartial?: boolean; requireAccounts?: boolean; requireDecodoApi?: boolean; } = {}
): { error?: Joi.ValidationError; value?: ShopifyCliConfig } {
  let schema = configSchema;
  
  // Apply conditional validation based on options
  if (options.requireDecodoApi) {
    schema = schema.keys({
      decodoApi: decodoApiCredentialsSchema.required(),
    });
  }
  
  if (options.requireAccounts) {
    schema = schema.keys({
      accounts: Joi.array().items(shopifyAccountSchema).min(1).required(),
    });
  }
  
  const validationOptions: Joi.ValidationOptions = {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true,
  };
  
  if (options.allowPartial) {
    validationOptions.presence = 'optional';
  }
  
  const result = schema.validate(data, validationOptions);
  
  return {
    error: result.error,
    value: result.value as ShopifyCliConfig,
  };
}

/**
 * Creates a default configuration structure
 */
export function createDefaultConfig(): ShopifyCliConfig {
  return {
    accounts: [],
    lastUpdated: new Date().toISOString(),
    settings: {
      autoUpdate: true,
      debug: false,
      logLevel: 'info',
      theme: 'default',
    },
    version: '1.0.0',
  };
}
