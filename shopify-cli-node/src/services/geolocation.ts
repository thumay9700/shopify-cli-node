import { AxiosInstance, AxiosResponse } from 'axios';

import { DecodoApiCredentials, ShopifyAccount } from '../config/types';
import { ProxyManager } from '../proxy/proxy-manager';

export interface GeolocationRequest {
  domain?: string;
  ip?: string;
  latitude?: number;
  longitude?: number;
}

export interface GeolocationResponse {
  accuracy_radius: number;
  cache_timestamp?: number;
  cached?: boolean;
  city: string;
  country: string;
  country_code: string;
  ip: string;
  isp: string;
  latitude: number;
  longitude: number;
  organization: string;
  region: string;
  region_code: string;
  success: boolean;
  timezone: string;
  zip: string;
}

export interface GeolocationCacheEntry {
  accountName: string;
  response: GeolocationResponse;
  timestamp: number;
}

export interface GeolocationServiceConfig {
  cacheExpirationMs?: number; // Default: 24 hours
  decodoApi: DecodoApiCredentials;
  enableCache?: boolean; // Default: true
  maxCacheSize?: number; // Default: 1000 entries per account
  proxyManager: ProxyManager;
}

export class GeolocationService {
  private axiosInstance: AxiosInstance;
  private cache: Map<string, Map<string, GeolocationCacheEntry>> = new Map(); // accountName -> requestKey -> cacheEntry
  private cacheExpirationMs: number;
  private config: GeolocationServiceConfig;
  private enableCache: boolean;
  private maxCacheSize: number;

  constructor(config: GeolocationServiceConfig) {
    this.config = config;
    this.cacheExpirationMs = config.cacheExpirationMs || 24 * 60 * 60 * 1000; // 24 hours
    this.maxCacheSize = config.maxCacheSize || 1000;
    this.enableCache = config.enableCache !== false;

    // Create axios instance with proxy rotation
    this.axiosInstance = config.proxyManager.createAxiosInstance({
      baseURL: config.decodoApi.endpoint,
      headers: {
        'Authorization': `Bearer ${config.decodoApi.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Shopify-CLI-Node/1.0.0'
      },
      timeout: config.decodoApi.timeout || 30_000
    });
  }

  /**
   * Cleanup expired cache entries across all accounts
   */
  public cleanupExpiredCache(): number {
    let cleanedCount = 0;
    const now = Date.now();

    for (const [accountName, accountCache] of this.cache.entries()) {
      const expiredKeys: string[] = [];

      for (const [key, entry] of accountCache.entries()) {
        if (now - entry.timestamp > this.cacheExpirationMs) {
          expiredKeys.push(key);
        }
      }

      for (const key of expiredKeys) {
        accountCache.delete(key);
        cleanedCount++;
      }

      // Remove empty account caches
      if (accountCache.size === 0) {
        this.cache.delete(accountName);
      }
    }

    return cleanedCount;
  }

  /**
   * Clear cache for a specific account
   */
  public clearAccountCache(accountName: string): void {
    this.cache.delete(accountName);
  }

  /**
   * Clear all cache
   */
  public clearAllCache(): void {
    this.cache.clear();
  }

  /**
   * Batch geolocation lookup for multiple requests
   */
  public async getBatchGeolocation(
    account: ShopifyAccount,
    requests: GeolocationRequest[]
  ): Promise<GeolocationResponse[]> {
    const results: GeolocationResponse[] = [];
    
    // Process requests in parallel with rate limiting
    const batchSize = 5; // Limit concurrent requests to avoid overwhelming the API
    
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchPromises = batch.map(request => this.getGeolocation(account, request));
      
      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      } catch (error) {
        console.error(`Batch geolocation error for account ${account.name}:`, error);
        // Add failed responses for the failed batch
        for (const request of batch) {
          results.push({
            accuracy_radius: 0,
            cached: false,
            city: '',
            country: '',
            country_code: '',
            ip: request.ip || '',
            isp: '',
            latitude: request.latitude || 0,
            longitude: request.longitude || 0,
            organization: '',
            region: '',
            region_code: '',
            success: false,
            timezone: '',
            zip: ''
          });
        }
      }
    }

    return results;
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): Record<string, {
    newestEntry: null | number;
    oldestEntry: null | number;
    totalEntries: number;
  }> {
    const stats: Record<string, any> = {};

    for (const [accountName, accountCache] of this.cache.entries()) {
      const entries = [...accountCache.values()];
      const timestamps = entries.map(entry => entry.timestamp);

      stats[accountName] = {
        newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : null,
        oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : null,
        totalEntries: entries.length
      };
    }

    return stats;
  }

  /**
   * Get service configuration
   */
  public getConfig(): GeolocationServiceConfig {
    return { ...this.config };
  }

  /**
   * Get geolocation data for an account with caching
   */
  public async getGeolocation(
    account: ShopifyAccount,
    request: GeolocationRequest
  ): Promise<GeolocationResponse> {
    const requestKey = this.generateCacheKey(request);
    
    // Check cache first if enabled
    if (this.enableCache) {
      const cachedResult = this.getCachedResult(account.name, requestKey);
      if (cachedResult) {
        return {
          ...cachedResult,
          cache_timestamp: this.getCacheEntry(account.name, requestKey)?.timestamp,
          cached: true
        };
      }
    }

    try {
      // Make API call through rotating proxy
      const response = await this.makeGeolocationRequest(request);
      const geolocationData: GeolocationResponse = {
        ...response.data,
        cached: false,
        success: true
      };

      // Cache the result if enabled
      if (this.enableCache && geolocationData.success) {
        this.setCachedResult(account.name, requestKey, geolocationData);
      }

      return geolocationData;

    } catch (error: any) {
      console.error(`Geolocation API error for account ${account.name}:`, error.message);
      
      // Return error response
      return {
        accuracy_radius: 0,
        cached: false,
        city: '',
        country: '',
        country_code: '',
        ip: request.ip || '',
        isp: '',
        latitude: request.latitude || 0,
        longitude: request.longitude || 0,
        organization: '',
        region: '',
        region_code: '',
        success: false,
        timezone: '',
        zip: ''
      };
    }
  }

  /**
   * Health check - test if the service is working
   */
  public async healthCheck(): Promise<{ error?: string; healthy: boolean; latency?: number; }> {
    const startTime = Date.now();
    
    try {
      // Test with a simple IP geolocation request
      const testRequest: GeolocationRequest = { ip: '8.8.8.8' };
      
      // Temporarily disable caching for health check
      const originalCacheEnabled = this.enableCache;
      this.enableCache = false;
      
      const response = await this.axiosInstance.post('/api/v1/geolocation', testRequest);
      
      // Restore cache setting
      this.enableCache = originalCacheEnabled;
      
      const latency = Date.now() - startTime;
      
      return {
        healthy: response.status >= 200 && response.status < 300,
        latency
      };
    } catch (error: any) {
      return {
        error: error.message,
        healthy: false
      };
    }
  }

  /**
   * Update service configuration
   */
  public updateConfig(newConfig: Partial<GeolocationServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.cacheExpirationMs) {
      this.cacheExpirationMs = newConfig.cacheExpirationMs;
    }
    
    if (newConfig.maxCacheSize) {
      this.maxCacheSize = newConfig.maxCacheSize;
    }
    
    if (newConfig.enableCache !== undefined) {
      this.enableCache = newConfig.enableCache;
      if (!this.enableCache) {
        this.clearAllCache();
      }
    }

    // Recreate axios instance if API config changed
    if (newConfig.decodoApi || newConfig.proxyManager) {
      this.axiosInstance = this.config.proxyManager.createAxiosInstance({
        baseURL: this.config.decodoApi.endpoint,
        headers: {
          'Authorization': `Bearer ${this.config.decodoApi.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Shopify-CLI-Node/1.0.0'
        },
        timeout: this.config.decodoApi.timeout || 30_000
      });
    }
  }

  /**
   * Evict oldest cache entries when cache is full
   */
  private evictOldestCacheEntries(accountCache: Map<string, GeolocationCacheEntry>, count: number): void {
    const entries = [...accountCache.entries()];
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const entriesToEvict = entries.slice(0, count);
    for (const [key] of entriesToEvict) accountCache.delete(key);
  }

  /**
   * Generate a cache key for a geolocation request
   */
  private generateCacheKey(request: GeolocationRequest): string {
    const keyParts: string[] = [];
    
    if (request.ip) keyParts.push(`ip:${request.ip}`);
    if (request.domain) keyParts.push(`domain:${request.domain}`);
    if (request.latitude !== undefined && request.longitude !== undefined) {
      keyParts.push(`lat:${request.latitude},lng:${request.longitude}`);
    }
    
    return keyParts.join('|') || 'empty-request';
  }

  /**
   * Get cached result for an account and request
   */
  private getCachedResult(accountName: string, requestKey: string): GeolocationResponse | null {
    const accountCache = this.cache.get(accountName);
    if (!accountCache) return null;

    const cacheEntry = accountCache.get(requestKey);
    if (!cacheEntry) return null;

    // Check if cache entry is expired
    const now = Date.now();
    if (now - cacheEntry.timestamp > this.cacheExpirationMs) {
      accountCache.delete(requestKey);
      return null;
    }

    return cacheEntry.response;
  }

  /**
   * Get cache entry (for timestamp access)
   */
  private getCacheEntry(accountName: string, requestKey: string): GeolocationCacheEntry | null {
    const accountCache = this.cache.get(accountName);
    if (!accountCache) return null;
    return accountCache.get(requestKey) || null;
  }

  /**
   * Make the actual API request to Decodo's geolocation endpoint
   */
  private async makeGeolocationRequest(request: GeolocationRequest): Promise<AxiosResponse> {
    const endpoint = '/api/v1/geolocation';
    return await this.axiosInstance.post(endpoint, request);
  }

  /**
   * Set cached result for an account and request
   */
  private setCachedResult(accountName: string, requestKey: string, response: GeolocationResponse): void {
    // Initialize account cache if it doesn't exist
    if (!this.cache.has(accountName)) {
      this.cache.set(accountName, new Map());
    }

    const accountCache = this.cache.get(accountName)!;

    // Check if we need to evict old entries to make room
    if (accountCache.size >= this.maxCacheSize) {
      this.evictOldestCacheEntries(accountCache, Math.floor(this.maxCacheSize * 0.1)); // Evict 10% of entries
    }

    // Add new cache entry
    const cacheEntry: GeolocationCacheEntry = {
      accountName,
      response,
      timestamp: Date.now()
    };

    accountCache.set(requestKey, cacheEntry);
  }
}
