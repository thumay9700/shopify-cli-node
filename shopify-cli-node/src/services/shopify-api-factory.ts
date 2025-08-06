import { ConfigLoader } from '../config/loader';
import { ShopifyAccount, ShopifyCliConfig } from '../config/types';
import ShopifyApiClient, { ShopifyApiClientConfig } from './shopify-api-client';

/**
 * Factory for creating and managing Shopify API Client instances
 */
export class ShopifyApiFactory {
  private static clients: Map<string, ShopifyApiClient> = new Map();
  private static config: null | ShopifyCliConfig = null;

  /**
   * Batch operations across multiple accounts
   */
  static async batchOperation<T>(
    operation: (client: ShopifyApiClient, accountName: string) => Promise<T>,
    accountNames?: string[]
  ): Promise<Map<string, { data?: T; error?: string; success: boolean; }>> {
    await this.ensureConfigLoaded();

    const accounts = accountNames 
      ? accountNames 
      : this.config!.accounts.map(acc => acc.name);

    const results = new Map<string, { data?: T; error?: string; success: boolean; }>();

    // Process accounts concurrently
    const promises = accounts.map(async (accountName) => {
      try {
        const client = await this.getClient(accountName);
        const data = await operation(client, accountName);
        results.set(accountName, { data, success: true });
      } catch (error) {
        results.set(accountName, { 
          error: (error as Error).message, 
          success: false 
        });
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Clear all cached client instances
   */
  static clearCache(): void {
    this.clients.clear();
  }

  /**
   * Simple create method for compatibility with existing commands
   */
  static create(
    account: ShopifyAccount,
    options?: { geoFilter?: string; useProxy?: boolean; }
  ): ShopifyApiClient {
    const clientConfig: ShopifyApiClientConfig = {
      accessToken: account.accessToken || '',
      apiVersion: '2024-01',
      shopUrl: account.shopUrl,
      timeout: 30_000,
    };

    if (!clientConfig.accessToken) {
      throw new Error(`No access token found for account "${account.name}"`);
    }

    return new ShopifyApiClient(clientConfig);
  }

  /**
   * Create multiple client instances for all configured accounts
   */
  static async createAllClients(options?: Partial<ShopifyApiClientConfig>): Promise<Map<string, ShopifyApiClient>> {
    await this.ensureConfigLoaded();

    const clients = new Map<string, ShopifyApiClient>();

    for (const account of this.config!.accounts) {
      if (account.accessToken) {
        try {
          const client = await this.createClient(account.name, options);
          clients.set(account.name, client);
          this.clients.set(account.name, client); // Cache it
        } catch (error) {
          console.warn(`Failed to create client for account "${account.name}": ${(error as Error).message}`);
        }
      }
    }

    return clients;
  }

  /**
   * Create a new Shopify API client instance
   */
  static async createClient(
    accountName?: string,
    options?: Partial<ShopifyApiClientConfig>
  ): Promise<ShopifyApiClient> {
    await this.ensureConfigLoaded();

    let account: ShopifyAccount;

    if (accountName) {
      // Find specific account by name
      const foundAccount = this.config!.accounts.find(acc => acc.name === accountName);
      if (!foundAccount) {
        throw new Error(`Account "${accountName}" not found in configuration`);
      }

      account = foundAccount;
    } else {
      // Use default account
      const defaultAccount = this.config!.accounts.find(acc => acc.isDefault);
      if (!defaultAccount) {
        throw new Error('No default account configured');
      }

      account = defaultAccount;
    }

    const clientConfig: ShopifyApiClientConfig = {
      accessToken: account.accessToken || process.env.SHOPIFY_ACCESS_TOKEN || '',
      apiVersion: '2024-01',
      proxyConfig: {
        host: this.config!.proxy?.host || 'us.decodo.com',
        maxRetries: 3,
        portRange: { end: 10_010, start: 10_001 },
        retryDelay: 1000,
      },
      shopUrl: account.shopUrl,
      timeout: 30_000,
      ...options,
    };

    if (!clientConfig.accessToken) {
      throw new Error(`No access token found for account "${account.name}"`);
    }

    return new ShopifyApiClient(clientConfig);
  }

  /**
   * Create a client from environment variables (for quick testing)
   */
  static createFromEnv(): ShopifyApiClient {
    const shopUrl = process.env.SHOPIFY_SHOP_URL;
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

    if (!shopUrl || !accessToken) {
      throw new Error('SHOPIFY_SHOP_URL and SHOPIFY_ACCESS_TOKEN environment variables are required');
    }

    return new ShopifyApiClient({
      accessToken,
      proxyConfig: {
        host: process.env.PROXY_HOST || 'us.decodo.com',
        portRange: {
          end: Number.parseInt(process.env.PROXY_PORT_END || '10010'),
          start: Number.parseInt(process.env.PROXY_PORT_START || '10001'),
        },
      },
      shopUrl,
    });
  }

  /**
   * Get account configuration by name
   */
  static async getAccount(accountName: string): Promise<null | ShopifyAccount> {
    await this.ensureConfigLoaded();
    return this.config!.accounts.find(account => account.name === accountName) || null;
  }

  /**
   * Get all available account names
   */
  static async getAccountNames(): Promise<string[]> {
    await this.ensureConfigLoaded();
    return this.config!.accounts.map(account => account.name);
  }

  /**
   * Get proxy statistics for all cached clients
   */
  static getAllProxyStats(): Map<string, Array<{ failureCount: number; isHealthy: boolean; lastUsed: number; port: number; }>> {
    const stats = new Map();
    
    for (const [accountName, client] of this.clients) {
      stats.set(accountName, client.getProxyStats());
    }
    
    return stats;
  }

  /**
   * Get or create a cached client instance
   */
  static async getClient(
    accountName?: string,
    options?: Partial<ShopifyApiClientConfig>
  ): Promise<ShopifyApiClient> {
    const cacheKey = accountName || 'default';
    
    if (this.clients.has(cacheKey)) {
      return this.clients.get(cacheKey)!;
    }

    const client = await this.createClient(accountName, options);
    this.clients.set(cacheKey, client);
    
    return client;
  }

  /**
   * Get default account configuration
   */
  static async getDefaultAccount(): Promise<null | ShopifyAccount> {
    await this.ensureConfigLoaded();
    return this.config!.accounts.find(account => account.isDefault) || null;
  }

  /**
   * Get client for the default account
   */
  static async getDefaultClient(options?: Partial<ShopifyApiClientConfig>): Promise<ShopifyApiClient> {
    return this.getClient(undefined, options);
  }

  /**
   * Get configuration status and summary
   */
  static async getStatus(): Promise<{
    accountsWithTokens: number;
    cachedClients: number;
    configLoaded: boolean;
    defaultAccount?: string;
    totalAccounts: number;
  }> {
    await this.ensureConfigLoaded();
    
    const accountsWithTokens = this.config!.accounts.filter(acc => acc.accessToken).length;
    const defaultAccount = this.config!.accounts.find(acc => acc.isDefault)?.name;

    return {
      accountsWithTokens,
      cachedClients: this.clients.size,
      configLoaded: this.config !== null,
      defaultAccount,
      totalAccounts: this.config!.accounts.length,
    };
  }

  /**
   * Remove a cached client instance
   */
  static removeClient(accountName?: string): void {
    const cacheKey = accountName || 'default';
    this.clients.delete(cacheKey);
  }

  /**
   * Reset proxy statistics for all cached clients
   */
  static resetAllProxyStats(): void {
    for (const client of this.clients.values()) {
      client.resetProxyStats();
    }
  }

  /**
   * Test connections for all configured accounts
   */
  static async testAllConnections(): Promise<Map<string, { error?: string; success: boolean; }>> {
    await this.ensureConfigLoaded();

    const results = new Map<string, { error?: string; success: boolean; }>();

    for (const account of this.config!.accounts) {
      if (account.accessToken) {
        const result = await this.testConnection(account.name);
        results.set(account.name, result);
      } else {
        results.set(account.name, { 
          error: 'No access token configured', 
          success: false 
        });
      }
    }

    return results;
  }

  /**
   * Test connection for a specific account
   */
  static async testConnection(accountName?: string): Promise<{ error?: string; success: boolean; }> {
    try {
      const client = await this.createClient(accountName);
      const success = await client.testConnection();
      
      return { success };
    } catch (error) {
      return { 
        error: (error as Error).message, 
        success: false 
      };
    }
  }

  /**
   * Load configuration if not already loaded
   */
  private static async ensureConfigLoaded(): Promise<void> {
    if (!this.config) {
      const configLoader = new ConfigLoader();
      this.config = await configLoader.load();
    }
  }
}

export default ShopifyApiFactory;
