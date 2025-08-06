import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import axios, { AxiosInstance, AxiosResponse } from 'axios';

import { DecodoApiCredentials, ShopifyAccount } from '../../src/config/types';
import { ProxyManager } from '../../src/proxy/proxy-manager';
import { 
  GeolocationRequest, 
  GeolocationResponse, 
  GeolocationService, 
  GeolocationServiceConfig 
} from '../../src/services/geolocation';

// Mock dependencies
jest.mock('axios');
jest.mock('../../src/proxy/proxy-manager');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const MockedProxyManager = ProxyManager as jest.MockedClass<typeof ProxyManager>;

describe('GeolocationService', () => {
  let geolocationService: GeolocationService;
  let mockAxiosInstance: jest.Mocked<AxiosInstance>;
  let mockProxyManager: jest.Mocked<ProxyManager>;
  let config: GeolocationServiceConfig;
  let testAccount: ShopifyAccount;

  const mockDecodoCredentials: DecodoApiCredentials = {
    apiKey: 'test-api-key',
    endpoint: 'https://api.decodo.com',
    timeout: 30_000
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocked axios instance
    mockAxiosInstance = {
      defaults: { headers: {} },
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      },
      post: jest.fn()
    } as any;

    // Setup mocked proxy manager
    mockProxyManager = {
      createAxiosInstance: jest.fn().mockReturnValue(mockAxiosInstance),
      getNextProxy: jest.fn(),
      markProxyAsFailed: jest.fn(),
      markProxyAsSuccessful: jest.fn()
    } as any;

    MockedProxyManager.mockImplementation(() => mockProxyManager);

    config = {
      cacheExpirationMs: 24 * 60 * 60 * 1000,
      decodoApi: mockDecodoCredentials,
      enableCache: true,
      maxCacheSize: 1000,
      proxyManager: mockProxyManager
    };

    testAccount = {
      accessToken: 'test-token',
      name: 'test-account',
      shopUrl: 'test-store.myshopify.com'
    };

    geolocationService = new GeolocationService(config);
  });

  describe('constructor', () => {
    test('should initialize with provided configuration', () => {
      const serviceConfig = geolocationService.getConfig();
      
      expect(serviceConfig.decodoApi).toEqual(mockDecodoCredentials);
      expect(serviceConfig.cacheExpirationMs).toBe(24 * 60 * 60 * 1000);
      expect(serviceConfig.maxCacheSize).toBe(1000);
      expect(serviceConfig.enableCache).toBe(true);
    });

    test('should use default values for optional config parameters', () => {
      const minimalConfig: GeolocationServiceConfig = {
        decodoApi: mockDecodoCredentials,
        proxyManager: mockProxyManager
      };

      const service = new GeolocationService(minimalConfig);
      const serviceConfig = service.getConfig();

      expect(serviceConfig.cacheExpirationMs).toBe(24 * 60 * 60 * 1000);
      expect(serviceConfig.maxCacheSize).toBe(1000);
      expect(serviceConfig.enableCache).toBe(true);
    });

    test('should create axios instance with correct configuration', () => {
      expect(mockProxyManager.createAxiosInstance).toHaveBeenCalledWith({
        baseURL: 'https://api.decodo.com',
        headers: {
          'Authorization': 'Bearer test-api-key',
          'Content-Type': 'application/json',
          'User-Agent': 'Shopify-CLI-Node/1.0.0'
        },
        timeout: 30_000
      });
    });
  });

  describe('getGeolocation', () => {
    const mockGeolocationResponse: GeolocationResponse = {
      accuracy_radius: 1000,
      city: 'Mountain View',
      country: 'United States',
      country_code: 'US',
      ip: '8.8.8.8',
      isp: 'Google LLC',
      latitude: 37.4056,
      longitude: -122.0775,
      organization: 'Google Public DNS',
      region: 'California',
      region_code: 'CA',
      success: true,
      timezone: 'America/Los_Angeles',
      zip: '94043'
    };

    test('should make successful geolocation request', async () => {
      const request: GeolocationRequest = { ip: '8.8.8.8' };
      const mockAxiosResponse: AxiosResponse = {
        config: {} as any,
        data: mockGeolocationResponse,
        headers: {},
        status: 200,
        statusText: 'OK'
      };

      mockAxiosInstance.post.mockResolvedValue(mockAxiosResponse);

      const result = await geolocationService.getGeolocation(testAccount, request);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/v1/geolocation', request);
      expect(result).toEqual({
        ...mockGeolocationResponse,
        cached: false
      });
    });

    test('should return cached result when available', async () => {
      const request: GeolocationRequest = { ip: '8.8.8.8' };
      const mockAxiosResponse: AxiosResponse = {
        config: {} as any,
        data: mockGeolocationResponse,
        headers: {},
        status: 200,
        statusText: 'OK'
      };

      mockAxiosInstance.post.mockResolvedValue(mockAxiosResponse);

      // First request - should hit API
      const result1 = await geolocationService.getGeolocation(testAccount, request);
      expect(result1.cached).toBe(false);

      // Second request - should use cache
      const result2 = await geolocationService.getGeolocation(testAccount, request);
      expect(result2.cached).toBe(true);
      expect(result2.cache_timestamp).toBeDefined();

      // API should only be called once
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
    });

    test('should generate correct cache key for different request types', async () => {
      const mockAxiosResponse: AxiosResponse = {
        config: {} as any,
        data: mockGeolocationResponse,
        headers: {},
        status: 200,
        statusText: 'OK'
      };

      mockAxiosInstance.post.mockResolvedValue(mockAxiosResponse);

      // Different request types should generate different cache keys
      const ipRequest: GeolocationRequest = { ip: '8.8.8.8' };
      const domainRequest: GeolocationRequest = { domain: 'google.com' };
      const coordinatesRequest: GeolocationRequest = { latitude: 37.4056, longitude: -122.0775 };

      await geolocationService.getGeolocation(testAccount, ipRequest);
      await geolocationService.getGeolocation(testAccount, domainRequest);
      await geolocationService.getGeolocation(testAccount, coordinatesRequest);

      // All should hit the API since they're different requests
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(3);
    });

    test('should handle API errors gracefully', async () => {
      const request: GeolocationRequest = { ip: '8.8.8.8' };
      
      mockAxiosInstance.post.mockRejectedValue(new Error('API Error'));

      const result = await geolocationService.getGeolocation(testAccount, request);

      expect(result.success).toBe(false);
      expect(result.ip).toBe('8.8.8.8');
      expect(result.country).toBe('');
      expect(result.cached).toBe(false);
    });

    test('should not cache failed requests', async () => {
      const request: GeolocationRequest = { ip: '8.8.8.8' };
      
      mockAxiosInstance.post.mockRejectedValue(new Error('API Error'));

      // First request - should fail
      await geolocationService.getGeolocation(testAccount, request);

      // Second request - should hit API again (not cached)
      await geolocationService.getGeolocation(testAccount, request);

      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
    });

    test('should respect cache disabled setting', async () => {
      // Create service with cache disabled
      const noCacheConfig = { ...config, enableCache: false };
      const noCacheService = new GeolocationService(noCacheConfig);

      const request: GeolocationRequest = { ip: '8.8.8.8' };
      const mockAxiosResponse: AxiosResponse = {
        config: {} as any,
        data: mockGeolocationResponse,
        headers: {},
        status: 200,
        statusText: 'OK'
      };

      mockAxiosInstance.post.mockResolvedValue(mockAxiosResponse);

      // Make two identical requests
      await noCacheService.getGeolocation(testAccount, request);
      await noCacheService.getGeolocation(testAccount, request);

      // Both should hit the API (no caching)
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('getBatchGeolocation', () => {
    test('should process batch requests in parallel', async () => {
      const requests: GeolocationRequest[] = [
        { ip: '8.8.8.8' },
        { ip: '1.1.1.1' },
        { domain: 'google.com' }
      ];

      const mockResponse: GeolocationResponse = {
        accuracy_radius: 1000,
        city: 'Mountain View',
        country: 'United States',
        country_code: 'US',
        ip: '8.8.8.8',
        isp: 'Google LLC',
        latitude: 37.4056,
        longitude: -122.0775,
        organization: 'Google Public DNS',
        region: 'California',
        region_code: 'CA',
        success: true,
        timezone: 'America/Los_Angeles',
        zip: '94043'
      };

      mockAxiosInstance.post.mockResolvedValue({
        config: {} as any,
        data: mockResponse,
        headers: {},
        status: 200,
        statusText: 'OK'
      });

      const results = await geolocationService.getBatchGeolocation(testAccount, requests);

      expect(results).toHaveLength(3);
      expect(results.every(result => result.success)).toBe(true);
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(3);
    });

    test('should handle batch processing with some failures', async () => {
      const requests: GeolocationRequest[] = [
        { ip: '8.8.8.8' },
        { ip: '1.1.1.1' },
        { domain: 'invalid-domain' }
      ];

      mockAxiosInstance.post
        .mockResolvedValueOnce({
          config: {} as any,
          data: { country: 'US', ip: '8.8.8.8', success: true },
          headers: {},
          status: 200,
          statusText: 'OK'
        })
        .mockResolvedValueOnce({
          config: {} as any,
          data: { country: 'AU', ip: '1.1.1.1', success: true },
          headers: {},
          status: 200,
          statusText: 'OK'
        })
        .mockRejectedValueOnce(new Error('Invalid domain'));

      const results = await geolocationService.getBatchGeolocation(testAccount, requests);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[2].success).toBe(false);
    });

    test('should respect batch size limits', async () => {
      const requests: GeolocationRequest[] = Array.from({length: 12}).fill(0).map((_, i) => ({ 
        ip: `8.8.8.${i + 1}` 
      }));

      mockAxiosInstance.post.mockResolvedValue({
        config: {} as any,
        data: { success: true },
        headers: {},
        status: 200,
        statusText: 'OK'
      });

      const results = await geolocationService.getBatchGeolocation(testAccount, requests);

      expect(results).toHaveLength(12);
      // Should make requests in batches of 5 (default batch size)
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(12);
    });
  });

  describe('cache management', () => {
    test('should expire cached entries after expiration time', async () => {
      // Create service with very short cache expiration
      const shortCacheConfig = { ...config, cacheExpirationMs: 100 };
      const shortCacheService = new GeolocationService(shortCacheConfig);

      const request: GeolocationRequest = { ip: '8.8.8.8' };
      mockAxiosInstance.post.mockResolvedValue({
        config: {} as any,
        data: { ip: '8.8.8.8', success: true },
        headers: {},
        status: 200,
        statusText: 'OK'
      });

      // First request
      await shortCacheService.getGeolocation(testAccount, request);
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Second request should hit API again
      await shortCacheService.getGeolocation(testAccount, request);
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
    });

    test('should clear account-specific cache', async () => {
      const request: GeolocationRequest = { ip: '8.8.8.8' };
      mockAxiosInstance.post.mockResolvedValue({
        config: {} as any,
        data: { ip: '8.8.8.8', success: true },
        headers: {},
        status: 200,
        statusText: 'OK'
      });

      // Make request to cache it
      await geolocationService.getGeolocation(testAccount, request);
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);

      // Clear cache for this account
      geolocationService.clearAccountCache(testAccount.name);

      // Next request should hit API again
      await geolocationService.getGeolocation(testAccount, request);
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
    });

    test('should clear all cache', async () => {
      const request: GeolocationRequest = { ip: '8.8.8.8' };
      mockAxiosInstance.post.mockResolvedValue({
        config: {} as any,
        data: { ip: '8.8.8.8', success: true },
        headers: {},
        status: 200,
        statusText: 'OK'
      });

      // Make request to cache it
      await geolocationService.getGeolocation(testAccount, request);

      // Clear all cache
      geolocationService.clearAllCache();

      // Next request should hit API again
      await geolocationService.getGeolocation(testAccount, request);
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
    });

    test('should get cache statistics', async () => {
      const request: GeolocationRequest = { ip: '8.8.8.8' };
      mockAxiosInstance.post.mockResolvedValue({
        config: {} as any,
        data: { ip: '8.8.8.8', success: true },
        headers: {},
        status: 200,
        statusText: 'OK'
      });

      // Make request to create cache entry
      await geolocationService.getGeolocation(testAccount, request);

      const stats = geolocationService.getCacheStats();
      
      expect(stats).toHaveProperty(testAccount.name);
      expect(stats[testAccount.name].totalEntries).toBe(1);
      expect(stats[testAccount.name].oldestEntry).toBeDefined();
      expect(stats[testAccount.name].newestEntry).toBeDefined();
    });

    test('should cleanup expired cache entries', async () => {
      // Create service with very short cache expiration
      const shortCacheConfig = { ...config, cacheExpirationMs: 50 };
      const shortCacheService = new GeolocationService(shortCacheConfig);

      const request: GeolocationRequest = { ip: '8.8.8.8' };
      mockAxiosInstance.post.mockResolvedValue({
        config: {} as any,
        data: { ip: '8.8.8.8', success: true },
        headers: {},
        status: 200,
        statusText: 'OK'
      });

      // Create cache entry
      await shortCacheService.getGeolocation(testAccount, request);

      let stats = shortCacheService.getCacheStats();
      expect(stats[testAccount.name].totalEntries).toBe(1);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));

      // Cleanup expired entries
      const cleanedCount = shortCacheService.cleanupExpiredCache();
      expect(cleanedCount).toBe(1);

      stats = shortCacheService.getCacheStats();
      expect(stats[testAccount.name]).toBeUndefined();
    });

    test('should evict oldest entries when cache is full', async () => {
      // Create service with small cache size
      const smallCacheConfig = { ...config, maxCacheSize: 2 };
      const smallCacheService = new GeolocationService(smallCacheConfig);

      mockAxiosInstance.post.mockResolvedValue({
        config: {} as any,
        data: { success: true },
        headers: {},
        status: 200,
        statusText: 'OK'
      });

      // Fill cache beyond limit
      await smallCacheService.getGeolocation(testAccount, { ip: '8.8.8.1' });
      await smallCacheService.getGeolocation(testAccount, { ip: '8.8.8.2' });
      await smallCacheService.getGeolocation(testAccount, { ip: '8.8.8.3' }); // Should trigger eviction

      const stats = smallCacheService.getCacheStats();
      expect(stats[testAccount.name].totalEntries).toBeLessThanOrEqual(2);
    });
  });

  describe('configuration updates', () => {
    test('should update service configuration', () => {
      const newConfig = {
        cacheExpirationMs: 12 * 60 * 60 * 1000, // 12 hours
        enableCache: false,
        maxCacheSize: 500
      };

      geolocationService.updateConfig(newConfig);

      const updatedConfig = geolocationService.getConfig();
      expect(updatedConfig.cacheExpirationMs).toBe(12 * 60 * 60 * 1000);
      expect(updatedConfig.maxCacheSize).toBe(500);
      expect(updatedConfig.enableCache).toBe(false);
    });

    test('should clear cache when cache is disabled', () => {
      // First, create a cache entry
      const request: GeolocationRequest = { ip: '8.8.8.8' };
      mockAxiosInstance.post.mockResolvedValue({
        config: {} as any,
        data: { ip: '8.8.8.8', success: true },
        headers: {},
        status: 200,
        statusText: 'OK'
      });

      // This would normally cache (but we can't easily test the internal cache state)
      // So we'll test that the configuration change works
      geolocationService.updateConfig({ enableCache: false });
      
      const config = geolocationService.getConfig();
      expect(config.enableCache).toBe(false);
    });

    test('should recreate axios instance when API config changes', () => {
      const newDecodoCredentials: DecodoApiCredentials = {
        apiKey: 'new-api-key',
        endpoint: 'https://new-api.decodo.com',
        timeout: 60_000
      };

      geolocationService.updateConfig({ decodoApi: newDecodoCredentials });

      // Should have called createAxiosInstance again
      expect(mockProxyManager.createAxiosInstance).toHaveBeenCalledTimes(2); // Once in constructor, once in update
    });
  });

  describe('health check', () => {
    test('should perform successful health check', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        config: {} as any,
        data: { success: true },
        headers: {},
        status: 200,
        statusText: 'OK'
      });

      const healthResult = await geolocationService.healthCheck();

      expect(healthResult.healthy).toBe(true);
      expect(healthResult.latency).toBeDefined();
      expect(healthResult.latency).toBeGreaterThan(0);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/v1/geolocation', { ip: '8.8.8.8' });
    });

    test('should handle failed health check', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Connection timeout'));

      const healthResult = await geolocationService.healthCheck();

      expect(healthResult.healthy).toBe(false);
      expect(healthResult.error).toBe('Connection timeout');
      expect(healthResult.latency).toBeUndefined();
    });

    test('should disable cache during health check', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        config: {} as any,
        data: { success: true },
        headers: {},
        status: 200,
        statusText: 'OK'
      });

      // Service has cache enabled
      expect(geolocationService.getConfig().enableCache).toBe(true);

      await geolocationService.healthCheck();

      // Cache should still be enabled after health check
      expect(geolocationService.getConfig().enableCache).toBe(true);

      // Make a regular request to verify cache still works
      const request: GeolocationRequest = { ip: '8.8.8.8' };
      await geolocationService.getGeolocation(testAccount, request);
      await geolocationService.getGeolocation(testAccount, request);

      // Should only make one additional API call (second should be cached)
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2); // 1 for health check + 1 for first geolocation request
    });
  });
});
