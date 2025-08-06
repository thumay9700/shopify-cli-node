import { DecodoApiCredentials, ShopifyCliConfig } from '../config/types';
import { ProxyManager } from '../proxy/proxy-manager';
import { GeolocationService, GeolocationServiceConfig } from './geolocation';

export interface GeolocationFactoryOptions {
  cacheExpirationMs?: number;
  enableCache?: boolean;
  maxCacheSize?: number;
  proxyConfig?: Partial<{
    host: string;
    maxRetries: number;
    portRange: { end: number; start: number; };
    retryDelay: number;
  }>;
}

/**
 * Factory class for creating and managing GeolocationService instances
 */
export class GeolocationServiceFactory {
  private static instance: GeolocationService | null = null;
  private static proxyManager: null | ProxyManager = null;

  /**
   * Create a new GeolocationService instance
   */
  public static create(
    config: ShopifyCliConfig,
    options: GeolocationFactoryOptions = {}
  ): GeolocationService {
    if (!config.decodoApi) {
      throw new Error('Decodo API configuration is required for GeolocationService');
    }

    // Create or reuse proxy manager
    if (!this.proxyManager) {
      this.proxyManager = new ProxyManager({
        host: options.proxyConfig?.host || 'us.decodo.com',
        maxRetries: options.proxyConfig?.maxRetries || 3,
        portRange: options.proxyConfig?.portRange || { end: 10_010, start: 10_001 },
        retryDelay: options.proxyConfig?.retryDelay || 1000
      });
    }

    const serviceConfig: GeolocationServiceConfig = {
      cacheExpirationMs: options.cacheExpirationMs || 24 * 60 * 60 * 1000, // 24 hours
      decodoApi: config.decodoApi,
      enableCache: options.enableCache !== false,
      maxCacheSize: options.maxCacheSize || 1000,
      proxyManager: this.proxyManager
    };

    return new GeolocationService(serviceConfig);
  }

  /**
   * Create a service instance from environment variables
   */
  public static createFromEnv(options: GeolocationFactoryOptions = {}): GeolocationService {
    const endpoint = process.env.DECODO_API_ENDPOINT;
    const apiKey = process.env.DECODO_API_KEY;
    const timeout = process.env.DECODO_API_TIMEOUT ? Number.parseInt(process.env.DECODO_API_TIMEOUT) : undefined;

    if (!endpoint || !apiKey) {
      throw new Error('DECODO_API_ENDPOINT and DECODO_API_KEY environment variables are required');
    }

    const decodoApi: DecodoApiCredentials = {
      apiKey,
      endpoint,
      timeout
    };

    // Create a minimal config object
    const config: ShopifyCliConfig = {
      accounts: [],
      decodoApi,
      lastUpdated: new Date().toISOString(),
      settings: {
        autoUpdate: true,
        debug: false,
        logLevel: 'info',
        theme: 'default'
      },
      version: '1.0.0'
    };

    return this.create(config, options);
  }

  /**
   * Create multiple service instances for load balancing
   */
  public static createPool(
    config: ShopifyCliConfig,
    poolSize: number = 3,
    options: GeolocationFactoryOptions = {}
  ): GeolocationService[] {
    if (!this.validateConfig(config)) {
      throw new Error('Invalid configuration provided');
    }

    const services: GeolocationService[] = [];
    
    for (let i = 0; i < poolSize; i++) {
      // Create separate proxy managers for each service to distribute load
      const proxyManager = new ProxyManager({
        host: options.proxyConfig?.host || 'us.decodo.com',
        maxRetries: options.proxyConfig?.maxRetries || 3,
        portRange: options.proxyConfig?.portRange || { end: 10_010, start: 10_001 },
        retryDelay: options.proxyConfig?.retryDelay || 1000
      });

      const serviceConfig: GeolocationServiceConfig = {
        cacheExpirationMs: options.cacheExpirationMs || 24 * 60 * 60 * 1000,
        decodoApi: config.decodoApi!,
        enableCache: options.enableCache !== false,
        maxCacheSize: options.maxCacheSize || 1000,
        proxyManager
      };

      services.push(new GeolocationService(serviceConfig));
    }

    return services;
  }

  /**
   * Get or create a singleton GeolocationService instance
   */
  public static getInstance(
    config: ShopifyCliConfig,
    options: GeolocationFactoryOptions = {}
  ): GeolocationService {
    if (!this.instance) {
      this.instance = this.create(config, options);
    }

    return this.instance;
  }

  /**
   * Get the current proxy manager instance
   */
  public static getProxyManager(): null | ProxyManager {
    return this.proxyManager;
  }

  /**
   * Get recommended cache settings based on usage pattern
   */
  public static getRecommendedCacheSettings(
    expectedDailyRequests: number
  ): Pick<GeolocationFactoryOptions, 'cacheExpirationMs' | 'maxCacheSize'> {
    // For high-volume usage, shorter cache time but larger cache size
    if (expectedDailyRequests > 10_000) {
      return {
        cacheExpirationMs: 6 * 60 * 60 * 1000, // 6 hours
        maxCacheSize: 5000
      };
    }
    
    // For medium usage, balanced settings
    if (expectedDailyRequests > 1000) {
      return {
        cacheExpirationMs: 12 * 60 * 60 * 1000, // 12 hours
        maxCacheSize: 2000
      };
    }
    
    // For low usage, longer cache time, smaller cache size
    return {
      cacheExpirationMs: 24 * 60 * 60 * 1000, // 24 hours
      maxCacheSize: 1000
    };
  }

  /**
   * Reset the singleton instance (useful for testing or config changes)
   */
  public static resetInstance(): void {
    this.instance = null;
  }

  /**
   * Validate that a configuration has the required Decodo API settings
   */
  public static validateConfig(config: ShopifyCliConfig): boolean {
    if (!config.decodoApi) return false;
    if (!config.decodoApi.endpoint) return false;
    if (!config.decodoApi.apiKey) return false;
    
    // Validate endpoint format
    try {
      new URL(config.decodoApi.endpoint);
    } catch {
      return false;
    }

    return true;
  }
}
