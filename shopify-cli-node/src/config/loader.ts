import * as dotenv from 'dotenv';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';
import * as os from 'node:os';
import * as path from 'node:path';

import { createDefaultConfig, validateConfig } from './schema';
import { 
  ConfigValidationOptions, 
  DecodoApiCredentials, 
  DEFAULT_CONFIG_DIR, 
  DEFAULT_CONFIG_FILENAME, 
  DEFAULT_ENV_FILENAME,
  EnvironmentOverrides,
  GlobalSettings,
  ProxySettings,
  ShopifyAccount,
  ShopifyCliConfig,
} from './types';

export class ConfigurationError extends Error {
  constructor(message: string, public readonly code: string, public readonly details?: any) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class ConfigLoader {
  private cachedConfig: null | ShopifyCliConfig = null;
  private configPath: string;
  private envOverrides: EnvironmentOverrides = {};
  private envPath: string;

  constructor(configDir?: string) {
    // Allow override via environment variable
    const baseDir = process.env.SHOPIFY_CLI_CONFIG_PATH || 
                    configDir || 
                    path.join(os.homedir(), DEFAULT_CONFIG_DIR);
    
    this.configPath = path.join(baseDir, DEFAULT_CONFIG_FILENAME);
    this.envPath = path.join(baseDir, DEFAULT_ENV_FILENAME);
    
    this.loadEnvironmentOverrides();
  }

  /**
   * Add or update a Shopify account
   */
  async addAccount(account: ShopifyAccount): Promise<void> {
    const config = await this.load();
    
    // Find existing account index
    const existingIndex = config.accounts.findIndex(acc => acc.name.toLowerCase() === account.name.toLowerCase());
    
    if (existingIndex === -1) {
      // Add new account
      config.accounts.push(account);
    } else {
      // Update existing account
      config.accounts[existingIndex] = { ...config.accounts[existingIndex], ...account };
    }

    // If this is marked as default, unmark others
    if (account.isDefault) {
      for (const acc of config.accounts) {
        if (acc.name.toLowerCase() !== account.name.toLowerCase()) {
          acc.isDefault = false;
        }
      }
    }

    await this.save(config);
  }

  /**
   * Clear cached configuration (force reload on next access)
   */
  clearCache(): void {
    this.cachedConfig = null;
  }

  /**
   * Check if configuration file exists
   */
  async configExists(): Promise<boolean> {
    return fs.pathExists(this.configPath);
  }

  /**
   * Get a specific account by name
   */
  async getAccount(accountName: string): Promise<null | ShopifyAccount> {
    const config = await this.load();
    return config.accounts.find(acc => acc.name.toLowerCase() === accountName.toLowerCase()) || null;
  }

  /**
   * Get configuration file paths
   */
  getConfigPaths(): { configPath: string; envPath: string } {
    return {
      configPath: this.configPath,
      envPath: this.envPath,
    };
  }

  /**
   * Get the default account
   */
  async getDefaultAccount(): Promise<null | ShopifyAccount> {
    const config = await this.load();
    return config.accounts.find(acc => acc.isDefault) || config.accounts[0] || null;
  }

  /**
   * Load configuration from file
   */
  async load(options: ConfigValidationOptions = {}): Promise<ShopifyCliConfig> {
    try {
      // Return cached config if available and no validation changes
      if (this.cachedConfig && !options.requireDecodoApi && !options.requireAccounts) {
        return this.applyEnvironmentOverrides(this.cachedConfig);
      }

      let config: ShopifyCliConfig;

      // Check if config file exists
      if (await fs.pathExists(this.configPath)) {
        // Read and parse the configuration file
        const configContent = await fs.readFile(this.configPath, 'utf8');
        const parsedConfig = this.parseConfigContent(configContent);

        // Validate the configuration
        const { error, value } = validateConfig(parsedConfig, options);
        if (error) {
          throw new ConfigurationError(
            `Invalid configuration: ${error.message}`,
            'VALIDATION_ERROR',
            error.details
          );
        }

        config = value!;
      } else {
        // Create default configuration if file doesn't exist
        config = createDefaultConfig();
        await this.ensureConfigDirectory();
        await this.save(config);
      }

      // Cache the configuration
      this.cachedConfig = config;

      // Apply environment overrides
      return this.applyEnvironmentOverrides(config);

    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }
      
      throw new ConfigurationError(
        `Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`,
        'LOAD_ERROR',
        error
      );
    }
  }

  /**
   * Remove a Shopify account
   */
  async removeAccount(accountName: string): Promise<boolean> {
    const config = await this.load();
    const initialLength = config.accounts.length;
    
    config.accounts = config.accounts.filter(acc => acc.name.toLowerCase() !== accountName.toLowerCase());
    
    if (config.accounts.length < initialLength) {
      await this.save(config);
      return true;
    }
    
    return false;
  }

  /**
   * Reset configuration to defaults
   */
  async reset(): Promise<void> {
    const defaultConfig = createDefaultConfig();
    await this.save(defaultConfig);
    this.cachedConfig = null;
  }

  /**
   * Save configuration to file
   */
  async save(config: ShopifyCliConfig): Promise<void> {
    try {
      // Validate before saving
      const { error } = validateConfig(config);
      if (error) {
        throw new ConfigurationError(
          `Cannot save invalid configuration: ${error.message}`,
          'VALIDATION_ERROR',
          error.details
        );
      }

      // Update timestamp
      config.lastUpdated = new Date().toISOString();

      // Ensure config directory exists
      await this.ensureConfigDirectory();

      // Convert to YAML and save
      const yamlContent = yaml.dump(config, {
        forceQuotes: false,
        indent: 2,
        lineWidth: 120,
        noRefs: true,
        quotingType: '"',
      });

      await fs.writeFile(this.configPath, yamlContent, { encoding: 'utf8', mode: 0o600 });

      // Update cached config
      this.cachedConfig = config;

    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }
      
      throw new ConfigurationError(
        `Failed to save configuration: ${error instanceof Error ? error.message : String(error)}`,
        'SAVE_ERROR',
        error
      );
    }
  }

  /**
   * Update Decodo API credentials
   */
  async updateDecodoApi(credentials: DecodoApiCredentials): Promise<void> {
    const config = await this.load();
    config.decodoApi = credentials;
    await this.save(config);
  }

  /**
   * Update proxy settings
   */
  async updateProxySettings(proxySettings: ProxySettings): Promise<void> {
    const config = await this.load();
    config.proxy = proxySettings;
    await this.save(config);
  }

  /**
   * Update global settings
   */
  async updateSettings(settings: Partial<GlobalSettings>): Promise<void> {
    const config = await this.load();
    config.settings = { ...config.settings, ...settings };
    await this.save(config);
  }

  /**
   * Apply environment variable overrides to configuration
   */
  private applyEnvironmentOverrides(config: ShopifyCliConfig): ShopifyCliConfig {
    const overriddenConfig = JSON.parse(JSON.stringify(config)); // Deep clone

    // Apply global settings overrides
    if (this.envOverrides.SHOPIFY_CLI_DEBUG) {
      overriddenConfig.settings.debug = this.envOverrides.SHOPIFY_CLI_DEBUG.toLowerCase() === 'true';
    }
    
    if (this.envOverrides.SHOPIFY_CLI_LOG_LEVEL) {
      overriddenConfig.settings.logLevel = this.envOverrides.SHOPIFY_CLI_LOG_LEVEL as any;
    }

    // Apply Decodo API overrides
    if (this.envOverrides.DECODO_API_ENDPOINT || this.envOverrides.DECODO_API_KEY) {
      if (!overriddenConfig.decodoApi) {
        overriddenConfig.decodoApi = {} as DecodoApiCredentials;
      }
      
      if (this.envOverrides.DECODO_API_ENDPOINT) {
        overriddenConfig.decodoApi.endpoint = this.envOverrides.DECODO_API_ENDPOINT;
      }
      
      if (this.envOverrides.DECODO_API_KEY) {
        overriddenConfig.decodoApi.apiKey = this.envOverrides.DECODO_API_KEY;
      }
      
      if (this.envOverrides.DECODO_API_TIMEOUT) {
        overriddenConfig.decodoApi.timeout = Number.parseInt(this.envOverrides.DECODO_API_TIMEOUT, 10);
      }
    }

    // Apply proxy overrides
    if (this.envOverrides.PROXY_ENABLED) {
      if (!overriddenConfig.proxy) {
        overriddenConfig.proxy = {} as ProxySettings;
      }
      
      overriddenConfig.proxy.enabled = this.envOverrides.PROXY_ENABLED.toLowerCase() === 'true';
      
      if (this.envOverrides.PROXY_HOST) overriddenConfig.proxy.host = this.envOverrides.PROXY_HOST;
      if (this.envOverrides.PROXY_PORT) overriddenConfig.proxy.port = Number.parseInt(this.envOverrides.PROXY_PORT, 10);
      if (this.envOverrides.PROXY_USERNAME) overriddenConfig.proxy.username = this.envOverrides.PROXY_USERNAME;
      if (this.envOverrides.PROXY_PASSWORD) overriddenConfig.proxy.password = this.envOverrides.PROXY_PASSWORD;
      if (this.envOverrides.PROXY_PROTOCOL) overriddenConfig.proxy.protocol = this.envOverrides.PROXY_PROTOCOL as any;
    }

    // Create environment account if specified
    if (this.envOverrides.SHOPIFY_SHOP_URL) {
      const envAccount: ShopifyAccount = {
        accessToken: this.envOverrides.SHOPIFY_ACCESS_TOKEN,
        apiKey: this.envOverrides.SHOPIFY_API_KEY,
        apiSecret: this.envOverrides.SHOPIFY_API_SECRET,
        isDefault: true,
        name: 'env-override',
        shopUrl: this.envOverrides.SHOPIFY_SHOP_URL,
      };

      // Insert at the beginning to make it the priority account
      overriddenConfig.accounts = [envAccount, ...overriddenConfig.accounts.filter((acc: ShopifyAccount) => acc.name !== 'env-override')];
    }

    return overriddenConfig;
  }

  /**
   * Ensure configuration directory exists
   */
  private async ensureConfigDirectory(): Promise<void> {
    const configDir = path.dirname(this.configPath);
    await fs.ensureDir(configDir);
  }

  /**
   * Load environment variables and overrides
   */
  private loadEnvironmentOverrides(): void {
    // Load from .env file if it exists
    if (fs.existsSync(this.envPath)) {
      dotenv.config({ path: this.envPath });
    }

    // Load environment overrides
    this.envOverrides = {
      DECODO_API_ENDPOINT: process.env.DECODO_API_ENDPOINT,
      DECODO_API_KEY: process.env.DECODO_API_KEY,
      DECODO_API_TIMEOUT: process.env.DECODO_API_TIMEOUT,
      PROXY_ENABLED: process.env.PROXY_ENABLED,
      PROXY_HOST: process.env.PROXY_HOST,
      PROXY_PASSWORD: process.env.PROXY_PASSWORD,
      PROXY_PORT: process.env.PROXY_PORT,
      PROXY_PROTOCOL: process.env.PROXY_PROTOCOL,
      PROXY_USERNAME: process.env.PROXY_USERNAME,
      SHOPIFY_ACCESS_TOKEN: process.env.SHOPIFY_ACCESS_TOKEN,
      SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY,
      SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET,
      SHOPIFY_CLI_CONFIG_PATH: process.env.SHOPIFY_CLI_CONFIG_PATH,
      SHOPIFY_CLI_DEBUG: process.env.SHOPIFY_CLI_DEBUG,
      SHOPIFY_CLI_LOG_LEVEL: process.env.SHOPIFY_CLI_LOG_LEVEL,
      SHOPIFY_SHOP_URL: process.env.SHOPIFY_SHOP_URL,
    };
  }

  /**
   * Parse configuration content (supports both YAML and JSON)
   */
  private parseConfigContent(content: string): unknown {
    try {
      // Try YAML first
      return yaml.load(content, { schema: yaml.JSON_SCHEMA });
    } catch (yamlError) {
      try {
        // Fallback to JSON
        return JSON.parse(content);
      } catch (jsonError) {
        throw new ConfigurationError(
          'Configuration file must be valid YAML or JSON',
          'PARSE_ERROR',
          { jsonError, yamlError }
        );
      }
    }
  }
}

// Export a default instance
export const configLoader = new ConfigLoader();
