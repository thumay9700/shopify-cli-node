import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { SocksProxyAgent } from 'socks-proxy-agent';

import { ProxyConfig, ProxyInfo, ProxyManager } from '../../src/proxy/proxy-manager';

// Mock dependencies
jest.mock('axios');
jest.mock('socks-proxy-agent');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const MockedSocksProxyAgent = SocksProxyAgent as jest.MockedClass<typeof SocksProxyAgent>;

describe('ProxyManager', () => {
  let proxyManager: ProxyManager;
  let mockAxiosInstance: jest.Mocked<AxiosInstance>;
  let mockProxyAgent: jest.Mocked<SocksProxyAgent>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mocked axios instance
    mockAxiosInstance = {
      defaults: {
        headers: {},
      },
      interceptors: {
        request: {
          use: jest.fn(),
        },
        response: {
          use: jest.fn(),
        },
      },
    } as any;

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    
    // Setup mocked proxy agent
    mockProxyAgent = {} as any;
    MockedSocksProxyAgent.mockImplementation(() => mockProxyAgent);

    proxyManager = new ProxyManager();
  });

  describe('constructor', () => {
    test('should initialize with default configuration', () => {
      const config = proxyManager.getConfig();
      
      expect(config.host).toBe('us.decodo.com');
      expect(config.portRange.start).toBe(10_001);
      expect(config.portRange.end).toBe(10_010);
      expect(config.maxRetries).toBe(3);
      expect(config.retryDelay).toBe(1000);
    });

    test('should accept custom configuration', () => {
      const customConfig: Partial<ProxyConfig> = {
        host: 'custom.proxy.com',
        maxRetries: 5,
        portRange: { end: 8005, start: 8000 },
        retryDelay: 2000,
      };

      const customProxyManager = new ProxyManager(customConfig);
      const config = customProxyManager.getConfig();

      expect(config.host).toBe('custom.proxy.com');
      expect(config.portRange.start).toBe(8000);
      expect(config.portRange.end).toBe(8005);
      expect(config.maxRetries).toBe(5);
      expect(config.retryDelay).toBe(2000);
    });

    test('should create proxy agents for all ports in range', () => {
      const customConfig: Partial<ProxyConfig> = {
        portRange: { end: 10_003, start: 10_001 }
      };
      
      new ProxyManager(customConfig);

      // Should create 3 proxy agents (ports 10001, 10002, 10003)
      expect(MockedSocksProxyAgent).toHaveBeenCalledTimes(3);
      expect(MockedSocksProxyAgent).toHaveBeenCalledWith('socks5://us.decodo.com:10001');
      expect(MockedSocksProxyAgent).toHaveBeenCalledWith('socks5://us.decodo.com:10002');
      expect(MockedSocksProxyAgent).toHaveBeenCalledWith('socks5://us.decodo.com:10003');
    });
  });

  describe('getNextProxy', () => {
    test('should return proxy info for unused port first', () => {
      const proxy = proxyManager.getNextProxy();
      
      expect(proxy).toBeDefined();
      expect(proxy.host).toBe('us.decodo.com');
      expect(proxy.port).toBeGreaterThanOrEqual(10_001);
      expect(proxy.port).toBeLessThanOrEqual(10_010);
      expect(proxy.agent).toBe(mockProxyAgent);
      expect(proxy.lastUsed).toBeGreaterThan(0);
      expect(proxy.failureCount).toBe(0);
    });

    test('should rotate through unused ports before reusing', () => {
      const usedPorts = new Set<number>();
      const totalPorts = 10; // 10001-10010

      // Get proxies for all available ports
      for (let i = 0; i < totalPorts; i++) {
        const proxy = proxyManager.getNextProxy();
        expect(usedPorts.has(proxy.port)).toBe(false);
        usedPorts.add(proxy.port);
      }

      expect(usedPorts.size).toBe(totalPorts);
    });

    test('should reset and use least recently used proxy when all ports are used', () => {
      const totalPorts = 10;
      const firstRoundProxies: ProxyInfo[] = [];

      // Use all ports in first round
      for (let i = 0; i < totalPorts; i++) {
        const proxy = proxyManager.getNextProxy();
        firstRoundProxies.push(proxy);
      }

      // Wait a bit to ensure different timestamps
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      
      // Next proxy should be the least recently used (first one from first round)
      const nextProxy = proxyManager.getNextProxy();
      expect(nextProxy.port).toBe(firstRoundProxies[0].port);
    });

    test('should update lastUsed timestamp when proxy is selected', () => {
      const beforeTime = Date.now();
      const proxy = proxyManager.getNextProxy();
      const afterTime = Date.now();

      expect(proxy.lastUsed).toBeGreaterThanOrEqual(beforeTime);
      expect(proxy.lastUsed).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('proxy failure handling', () => {
    test('should mark proxy as failed and increment failure count', () => {
      const proxy = proxyManager.getNextProxy();
      const initialFailureCount = proxy.failureCount;

      proxyManager.markProxyAsFailed(proxy.port);

      // Get same proxy info to check failure count
      const stats = proxyManager.getProxyStats();
      const failedProxy = stats.find(p => p.port === proxy.port);
      
      expect(failedProxy?.failureCount).toBe(initialFailureCount + 1);
    });

    test('should mark proxy as successful and reset failure count', () => {
      const proxy = proxyManager.getNextProxy();
      
      // First mark as failed
      proxyManager.markProxyAsFailed(proxy.port);
      proxyManager.markProxyAsFailed(proxy.port);
      
      let stats = proxyManager.getProxyStats();
      let proxyStats = stats.find(p => p.port === proxy.port);
      expect(proxyStats?.failureCount).toBe(2);

      // Then mark as successful
      proxyManager.markProxyAsSuccessful(proxy.port);
      
      stats = proxyManager.getProxyStats();
      proxyStats = stats.find(p => p.port === proxy.port);
      expect(proxyStats?.failureCount).toBe(0);
    });

    test('should get healthy proxies (failure count < 3)', () => {
      // Mark some proxies as failed
      proxyManager.markProxyAsFailed(10_001);
      proxyManager.markProxyAsFailed(10_001);
      proxyManager.markProxyAsFailed(10_001); // 3 failures, not healthy

      proxyManager.markProxyAsFailed(10_002);
      proxyManager.markProxyAsFailed(10_002); // 2 failures, still healthy

      const healthyProxies = proxyManager.getHealthyProxies();
      const port10001Healthy = healthyProxies.some(p => p.port === 10_001);
      const port10002Healthy = healthyProxies.some(p => p.port === 10_002);

      expect(port10001Healthy).toBe(false);
      expect(port10002Healthy).toBe(true);
      expect(healthyProxies.length).toBe(9); // 10 total - 1 unhealthy
    });
  });

  describe('createAxiosInstance', () => {
    test('should create axios instance with proxy interceptors', () => {
      const baseConfig: AxiosRequestConfig = {
        headers: { 'Authorization': 'Bearer token' },
        timeout: 5000
      };

      const axiosInstance = proxyManager.createAxiosInstance(baseConfig);

      expect(mockedAxios.create).toHaveBeenCalledWith(baseConfig);
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });

    test('should add proxy agent to request config in interceptor', () => {
      proxyManager.createAxiosInstance();

      // Get the request interceptor function
      const requestInterceptorCall = (mockAxiosInstance.interceptors.request.use as jest.Mock).mock.calls[0];
      const requestInterceptor = requestInterceptorCall[0];

      const mockConfig = { url: 'https://api.example.com' };
      const modifiedConfig = (requestInterceptor as any)(mockConfig);

      expect(modifiedConfig.httpsAgent).toBe(mockProxyAgent);
      expect(modifiedConfig.httpAgent).toBe(mockProxyAgent);
      expect(modifiedConfig._proxyPort).toBeDefined();
      expect(typeof modifiedConfig._proxyPort).toBe('number');
    });

    test('should handle successful response in interceptor', () => {
      proxyManager.createAxiosInstance();

      // Get the response interceptor functions
      const responseInterceptorCall = (mockAxiosInstance.interceptors.response.use as jest.Mock).mock.calls[0];
      const successInterceptor = responseInterceptorCall[0];

      const mockResponse = {
        config: { _proxyPort: 10_001 },
        data: { success: true }
      };

      const result = (successInterceptor as any)(mockResponse);

      expect(result).toBe(mockResponse);
      // Check that proxy was marked as successful
      const stats = proxyManager.getProxyStats();
      const proxyStats = stats.find(p => p.port === 10_001);
      expect(proxyStats?.failureCount).toBe(0);
    });

    test('should handle error response and retry with different proxy', async () => {
      proxyManager.createAxiosInstance();

      // Get the response interceptor functions
      const responseInterceptorCall = (mockAxiosInstance.interceptors.response.use as jest.Mock).mock.calls[0];
      const errorInterceptor = responseInterceptorCall[1];

      const mockError = {
        config: {
          _proxyPort: 10_001,
          _retryCount: 0
        }
      };

      // Mock the axios instance call for retry
      mockAxiosInstance.mockResolvedValue({ data: 'success' });

      const result = await (errorInterceptor as any)(mockError);

      expect(mockError.config._retryCount).toBe(1);
      expect(mockAxiosInstance).toHaveBeenCalledWith(expect.objectContaining({ _proxyPort: 10_002, _retryCount: 1 }));
    });

    test('should reject after max retries exceeded', async () => {
      proxyManager.createAxiosInstance();

      const responseInterceptorCall = (mockAxiosInstance.interceptors.response.use as jest.Mock).mock.calls[0];
      const errorInterceptor = responseInterceptorCall[1];

      const mockError = {
        config: {
          _proxyPort: 10_001,
          _retryCount: 3 // Already at max retries
        }
      };

      await expect((errorInterceptor as any)(mockError)).rejects.toBe(mockError);
    });
  });

  describe('createFetchWithProxy', () => {
    let mockFetch: jest.Mock;

    beforeEach(() => {
      mockFetch = jest.fn();
      globalThis.fetch = mockFetch as any;
    });

    test('should create fetch function with proxy support', async () => {
      const fetchWithProxy = proxyManager.createFetchWithProxy();
      
      mockFetch.mockResolvedValue({
        json: async () => ({ success: true }),
        ok: true,
        status: 200
      } as any);

      const response = await fetchWithProxy('https://api.example.com');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com',
        expect.objectContaining({
          agent: mockProxyAgent
        })
      );
      expect(response.ok).toBe(true);
    });

    test('should retry with different proxy on failure', async () => {
      const fetchWithProxy = proxyManager.createFetchWithProxy();
      
      mockFetch
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValue({
          json: async () => ({ success: true }),
          ok: true,
          status: 200
        } as any);

      const response = await fetchWithProxy('https://api.example.com');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(response.ok).toBe(true);
    });

    test('should throw error after all retries exhausted', async () => {
      const fetchWithProxy = proxyManager.createFetchWithProxy();
      
      mockFetch.mockRejectedValue(new Error('Connection failed'));

      await expect(fetchWithProxy('https://api.example.com')).rejects.toThrow('Connection failed');
      
      // Should retry maxRetries + 1 times (initial + retries)
      expect(mockFetch).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });
  });

  describe('proxy statistics', () => {
    test('should return proxy statistics', () => {
      // Use some proxies and mark some as failed
      const proxy1 = proxyManager.getNextProxy();
      const proxy2 = proxyManager.getNextProxy();
      
      proxyManager.markProxyAsFailed(proxy1.port);
      proxyManager.markProxyAsFailed(proxy1.port);

      const stats = proxyManager.getProxyStats();

      expect(stats).toHaveLength(10); // Default port range 10001-10010
      expect(stats.every(stat => 'port' in stat)).toBe(true);
      expect(stats.every(stat => 'lastUsed' in stat)).toBe(true);
      expect(stats.every(stat => 'failureCount' in stat)).toBe(true);
      expect(stats.every(stat => 'isHealthy' in stat)).toBe(true);

      const proxy1Stats = stats.find(s => s.port === proxy1.port);
      const proxy2Stats = stats.find(s => s.port === proxy2.port);

      expect(proxy1Stats?.failureCount).toBe(2);
      expect(proxy1Stats?.isHealthy).toBe(true); // Still healthy (< 3 failures)
      expect(proxy2Stats?.failureCount).toBe(0);
      expect(proxy2Stats?.isHealthy).toBe(true);
    });

    test('should reset all statistics', () => {
      // Use proxies and create some failures
      const proxy = proxyManager.getNextProxy();
      proxyManager.markProxyAsFailed(proxy.port);

      let stats = proxyManager.getProxyStats();
      const failedProxyStats = stats.find(s => s.port === proxy.port);
      expect(failedProxyStats?.failureCount).toBe(1);
      expect(failedProxyStats?.lastUsed).toBeGreaterThan(0);

      // Reset stats
      proxyManager.resetStats();

      stats = proxyManager.getProxyStats();
      const resetProxyStats = stats.find(s => s.port === proxy.port);
      expect(resetProxyStats?.failureCount).toBe(0);
      expect(resetProxyStats?.lastUsed).toBe(0);
    });
  });

  describe('configuration management', () => {
    test('should return current configuration', () => {
      const config = proxyManager.getConfig();

      expect(config).toEqual({
        host: 'us.decodo.com',
        maxRetries: 3,
        portRange: { end: 10_010, start: 10_001 },
        retryDelay: 1000
      });
    });

    test('should return deep copy of configuration', () => {
      const config1 = proxyManager.getConfig();
      const config2 = proxyManager.getConfig();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Different objects
      expect(config1.portRange).not.toBe(config2.portRange); // Deep copy
    });
  });

  describe('error edge cases', () => {
    test('should handle empty port range', () => {
      expect(() => {
        new ProxyManager({ portRange: { end: 10_004, start: 10_005 } });
      }).not.toThrow();

      // Should still work with empty range (no proxies available)
      const manager = new ProxyManager({ portRange: { end: 10_004, start: 10_005 } });
      const stats = manager.getProxyStats();
      expect(stats).toHaveLength(0);
    });

    test('should handle marking non-existent proxy as failed', () => {
      expect(() => {
        proxyManager.markProxyAsFailed(99_999);
      }).not.toThrow();

      expect(() => {
        proxyManager.markProxyAsSuccessful(99_999);
      }).not.toThrow();
    });

    test('should handle single port range', () => {
      const singlePortManager = new ProxyManager({ portRange: { end: 10_001, start: 10_001 } });
      
      const proxy1 = singlePortManager.getNextProxy();
      const proxy2 = singlePortManager.getNextProxy();

      expect(proxy1.port).toBe(10_001);
      expect(proxy2.port).toBe(10_001); // Same port reused
      expect(proxy2.lastUsed).toBeGreaterThanOrEqual(proxy1.lastUsed);
    });
  });
});
