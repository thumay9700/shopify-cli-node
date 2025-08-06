/**
 * Configuration types for the Shopify CLI
 */

export interface ShopifyAccount {
  accessToken?: string;
  apiKey?: string;
  apiSecret?: string;
  isDefault?: boolean;
  name: string;
  shopUrl: string;
}

export interface DecodoApiCredentials {
  apiKey: string;
  endpoint: string;
  timeout?: number;
}

export interface ProxySettings {
  enabled: boolean;
  host?: string;
  password?: string;
  port?: number;
  protocol?: 'http' | 'https' | 'socks4' | 'socks5';
  username?: string;
}

export interface GlobalSettings {
  autoUpdate?: boolean;
  debug?: boolean;
  logLevel?: 'debug' | 'error' | 'info' | 'warn';
  theme?: 'dark' | 'default' | 'light';
}

export interface ShopifyCliConfig {
  accounts: ShopifyAccount[];
  decodoApi?: DecodoApiCredentials;
  lastUpdated: string;
  proxy?: ProxySettings;
  settings: GlobalSettings;
  version: string;
}

export interface ConfigValidationOptions {
  allowPartial?: boolean;
  requireAccounts?: boolean;
  requireDecodoApi?: boolean;
}

export interface EnvironmentOverrides {
  DECODO_API_ENDPOINT?: string;
  DECODO_API_KEY?: string;
  DECODO_API_TIMEOUT?: string;
  PROXY_ENABLED?: string;
  PROXY_HOST?: string;
  PROXY_PASSWORD?: string;
  PROXY_PORT?: string;
  PROXY_PROTOCOL?: string;
  PROXY_USERNAME?: string;
  SHOPIFY_ACCESS_TOKEN?: string;
  SHOPIFY_API_KEY?: string;
  SHOPIFY_API_SECRET?: string;
  SHOPIFY_CLI_CONFIG_PATH?: string;
  SHOPIFY_CLI_DEBUG?: string;
  SHOPIFY_CLI_LOG_LEVEL?: string;
  SHOPIFY_SHOP_URL?: string;
}

export const DEFAULT_CONFIG_FILENAME = 'config.yaml';
export const DEFAULT_CONFIG_DIR = '.shopify-cli';
export const DEFAULT_ENV_FILENAME = '.env';
