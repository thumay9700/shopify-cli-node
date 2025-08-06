import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import axios, { AxiosInstance, AxiosResponse } from 'axios';

import { ShopifyAccount } from '../../src/config/types';
import { ProxyManager } from '../../src/proxy/proxy-manager';
import { GraphQLResponse, RestResponse, ShopifyApiClient, ShopifyApiClientConfig } from '../../src/services/shopify-api-client';

// Mock dependencies
jest.mock('axios');
jest.mock('../../src/proxy/proxy-manager');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const MockedProxyManager = ProxyManager as jest.MockedClass<typeof ProxyManager>;

describe('ShopifyApiClient', () => {
  let shopifyClient: ShopifyApiClient;
  let mockAxiosInstance: jest.Mocked<AxiosInstance>;
  let mockProxyManager: jest.Mocked<ProxyManager>;
  let clientConfig: ShopifyApiClientConfig;
  let testAccount: ShopifyAccount;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocked axios instance
    mockAxiosInstance = {
      defaults: { 
        headers: {
          'x-shopify-shop-api-call-limit': '10/40'
        }
      },
      delete: jest.fn(),
      get: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      },
      post: jest.fn(),
      put: jest.fn(),
      request: jest.fn()
    } as any;

    // Setup mocked proxy manager
    mockProxyManager = {
      createAxiosInstance: jest.fn().mockReturnValue(mockAxiosInstance),
      getProxyStats: jest.fn().mockReturnValue([]),
      resetStats: jest.fn()
    } as any;

    MockedProxyManager.mockImplementation(() => mockProxyManager);

    clientConfig = {
      accessToken: 'test-access-token',
      apiVersion: '2024-01',
      proxyConfig: {
        host: 'us.decodo.com',
        portRange: { end: 10_010, start: 10_001 }
      },
      retries: 3,
      retryDelay: 1000,
      shopUrl: 'test-store.myshopify.com',
      timeout: 30_000
    };

    testAccount = {
      accessToken: 'test-access-token',
      name: 'test-account',
      shopUrl: 'test-store.myshopify.com'
    };

    shopifyClient = new ShopifyApiClient(clientConfig);
  });

  describe('constructor', () => {
    test('should initialize with provided configuration', () => {
      expect(mockProxyManager.createAxiosInstance).toHaveBeenCalledWith({
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ShopifyCLI/1.0.0',
          'X-Shopify-Access-Token': 'test-access-token'
        },
        timeout: 30_000
      });
    });

    test('should use default values for optional parameters', () => {
      const minimalConfig: ShopifyApiClientConfig = {
        accessToken: 'test-access-token',
        shopUrl: 'test-store.myshopify.com'
      };

      new ShopifyApiClient(minimalConfig);

      expect(mockProxyManager.createAxiosInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'User-Agent': 'ShopifyCLI/1.0.0',
            'X-Shopify-Access-Token': 'test-access-token'
          }),
          timeout: 30_000
        })
      );
    });

    test('should set up request and response interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('GraphQL API', () => {
    test('should execute GraphQL query successfully', async () => {
      const mockQuery = `
        query getProducts($first: Int!) {
          products(first: $first) {
            edges {
              node {
                id
                title
                handle
              }
            }
          }
        }
      `;
      
      const mockVariables = { first: 10 };
      const mockResponse: GraphQLResponse = {
        data: {
          products: {
            edges: [
              {
                node: {
                  handle: 'test-product',
                  id: 'gid://shopify/Product/123',
                  title: 'Test Product'
                }
              }
            ]
          }
        }
      };

      mockAxiosInstance.post.mockResolvedValue({
        config: {} as any,
        data: mockResponse,
        headers: {},
        status: 200,
        statusText: 'OK'
      });

      const result = await shopifyClient.graphql(mockQuery, mockVariables);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        'https://test-store.myshopify.com/admin/api/2024-01/graphql.json',
        {
          query: mockQuery,
          variables: mockVariables
        }
      );
      expect(result).toEqual(mockResponse);
    });

    test('should handle GraphQL errors', async () => {
      const mockQuery = 'query { invalid }';
      
      mockAxiosInstance.post.mockRejectedValue(new Error('GraphQL Error'));

      await expect(shopifyClient.graphql(mockQuery))
        .rejects.toThrow('GraphQL query failed: GraphQL Error');
    });

    test('should execute GraphQL query without variables', async () => {
      const mockQuery = '{ shop { name } }';
      const mockResponse: GraphQLResponse = {
        data: { shop: { name: 'Test Shop' } }
      };

      mockAxiosInstance.post.mockResolvedValue({
        config: {} as any,
        data: mockResponse,
        headers: {},
        status: 200,
        statusText: 'OK'
      });

      const result = await shopifyClient.graphql(mockQuery);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        'https://test-store.myshopify.com/admin/api/2024-01/graphql.json',
        {
          query: mockQuery,
          variables: undefined
        }
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('REST API', () => {
    test('should execute GET request successfully', async () => {
      const mockResponseData = {
        products: [
          { handle: 'test-product', id: 123, title: 'Test Product' }
        ]
      };

      const mockAxiosResponse: AxiosResponse = {
        config: {} as any,
        data: mockResponseData,
        headers: { 'content-type': 'application/json' },
        status: 200,
        statusText: 'OK'
      };

      mockAxiosInstance.request.mockResolvedValue(mockAxiosResponse);

      const result = await shopifyClient.rest('products.json');

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        data: undefined,
        method: 'GET',
        params: undefined,
        url: 'https://test-store.myshopify.com/admin/api/2024-01/products.json'
      });

      expect(result).toEqual({
        data: mockResponseData,
        headers: { 'content-type': 'application/json' },
        status: 200
      });
    });

    test('should execute POST request successfully', async () => {
      const productData = {
        product: {
          body_html: 'Product description',
          title: 'New Product',
          vendor: 'Test Vendor'
        }
      };

      const mockResponseData = {
        product: {
          handle: 'new-product',
          id: 456,
          title: 'New Product'
        }
      };

      mockAxiosInstance.request.mockResolvedValue({
        config: {} as any,
        data: mockResponseData,
        headers: {},
        status: 201,
        statusText: 'Created'
      });

      const result = await shopifyClient.rest('products.json', 'POST', productData);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        data: productData,
        method: 'POST',
        params: undefined,
        url: 'https://test-store.myshopify.com/admin/api/2024-01/products.json'
      });

      expect(result.data).toEqual(mockResponseData);
      expect(result.status).toBe(201);
    });

    test('should execute PUT request with params', async () => {
      const productData = { product: { title: 'Updated Product' } };
      const params = { fields: 'id,title,handle' };

      mockAxiosInstance.request.mockResolvedValue({
        config: {} as any,
        data: { product: { id: 123, title: 'Updated Product' } },
        headers: {},
        status: 200,
        statusText: 'OK'
      });

      await shopifyClient.rest('products/123.json', 'PUT', productData, params);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        data: productData,
        method: 'PUT',
        params,
        url: 'https://test-store.myshopify.com/admin/api/2024-01/products/123.json'
      });
    });

    test('should handle REST API errors', async () => {
      mockAxiosInstance.request.mockRejectedValue(new Error('API Error'));

      await expect(shopifyClient.rest('products.json'))
        .rejects.toThrow('REST request failed: API Error');
    });
  });

  describe('Products API', () => {
    test('should list products', async () => {
      const mockProducts = {
        products: [
          { id: 123, title: 'Product 1' },
          { id: 456, title: 'Product 2' }
        ]
      };

      mockAxiosInstance.request.mockResolvedValue({
        config: {} as any,
        data: mockProducts,
        headers: {},
        status: 200,
        statusText: 'OK'
      });

      const result = await shopifyClient.products.list({ limit: 50, status: 'active' });

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        data: undefined,
        method: 'GET',
        params: { limit: 50, status: 'active' },
        url: 'https://test-store.myshopify.com/admin/api/2024-01/products.json'
      });

      expect(result.data).toEqual(mockProducts);
    });

    test('should get single product', async () => {
      const mockProduct = {
        product: { id: 123, title: 'Test Product' }
      };

      mockAxiosInstance.request.mockResolvedValue({
        config: {} as any,
        data: mockProduct,
        headers: {},
        status: 200,
        statusText: 'OK'
      });

      const result = await shopifyClient.products.get(123, ['id', 'title', 'handle']);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        data: undefined,
        method: 'GET',
        params: { fields: 'id,title,handle' },
        url: 'https://test-store.myshopify.com/admin/api/2024-01/products/123.json'
      });

      expect(result.data).toEqual(mockProduct);
    });

    test('should create product', async () => {
      const newProduct = {
        body_html: 'Description',
        title: 'New Product',
        vendor: 'Test Vendor'
      };

      const createdProduct = {
        product: { id: 789, ...newProduct }
      };

      mockAxiosInstance.request.mockResolvedValue({
        config: {} as any,
        data: createdProduct,
        headers: {},
        status: 201,
        statusText: 'Created'
      });

      const result = await shopifyClient.products.create(newProduct);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        data: { product: newProduct },
        method: 'POST',
        params: undefined,
        url: 'https://test-store.myshopify.com/admin/api/2024-01/products.json'
      });

      expect(result.data).toEqual(createdProduct);
    });

    test('should update product', async () => {
      const productUpdates = { title: 'Updated Product Title' };
      const updatedProduct = {
        product: { id: 123, title: 'Updated Product Title' }
      };

      mockAxiosInstance.request.mockResolvedValue({
        config: {} as any,
        data: updatedProduct,
        headers: {},
        status: 200,
        statusText: 'OK'
      });

      const result = await shopifyClient.products.update(123, productUpdates);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        data: { product: productUpdates },
        method: 'PUT',
        params: undefined,
        url: 'https://test-store.myshopify.com/admin/api/2024-01/products/123.json'
      });

      expect(result.data).toEqual(updatedProduct);
    });

    test('should delete product', async () => {
      mockAxiosInstance.request.mockResolvedValue({
        config: {} as any,
        data: {},
        headers: {},
        status: 200,
        statusText: 'OK'
      });

      const result = await shopifyClient.products.delete(123);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        data: undefined,
        method: 'DELETE',
        params: undefined,
        url: 'https://test-store.myshopify.com/admin/api/2024-01/products/123.json'
      });

      expect(result.status).toBe(200);
    });

    test('should get product count', async () => {
      const mockCount = { count: 42 };

      mockAxiosInstance.request.mockResolvedValue({
        config: {} as any,
        data: mockCount,
        headers: {},
        status: 200,
        statusText: 'OK'
      });

      const result = await shopifyClient.products.count({ vendor: 'Test Vendor' });

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        data: undefined,
        method: 'GET',
        params: { vendor: 'Test Vendor' },
        url: 'https://test-store.myshopify.com/admin/api/2024-01/products/count.json'
      });

      expect(result.data).toEqual(mockCount);
    });
  });

  describe('Orders API', () => {
    test('should list orders', async () => {
      const mockOrders = {
        orders: [
          { id: 123, name: '#1001', total_price: '100.00' },
          { id: 456, name: '#1002', total_price: '150.00' }
        ]
      };

      mockAxiosInstance.request.mockResolvedValue({
        config: {} as any,
        data: mockOrders,
        headers: {},
        status: 200,
        statusText: 'OK'
      });

      const result = await shopifyClient.orders.list({
        financial_status: 'paid',
        limit: 50,
        status: 'open'
      });

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        data: undefined,
        method: 'GET',
        params: {
          financial_status: 'paid',
          limit: 50,
          status: 'open'
        },
        url: 'https://test-store.myshopify.com/admin/api/2024-01/orders.json'
      });

      expect(result.data).toEqual(mockOrders);
    });

    test('should get single order', async () => {
      const mockOrder = {
        order: { id: 123, name: '#1001', total_price: '100.00' }
      };

      mockAxiosInstance.request.mockResolvedValue({
        config: {} as any,
        data: mockOrder,
        headers: {},
        status: 200,
        statusText: 'OK'
      });

      const result = await shopifyClient.orders.get(123, ['id', 'name', 'total_price']);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        data: undefined,
        method: 'GET',
        params: { fields: 'id,name,total_price' },
        url: 'https://test-store.myshopify.com/admin/api/2024-01/orders/123.json'
      });

      expect(result.data).toEqual(mockOrder);
    });

    test('should cancel order', async () => {
      mockAxiosInstance.request.mockResolvedValue({
        config: {} as any,
        data: { order: { cancelled_at: '2024-01-15T10:00:00Z', id: 123 } },
        headers: {},
        status: 200,
        statusText: 'OK'
      });

      const result = await shopifyClient.orders.cancel(123, {
        email: true,
        reason: 'customer',
        refund: true
      });

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        data: undefined,
        method: 'POST',
        params: {
          email: true,
          reason: 'customer',
          refund: true
        },
        url: 'https://test-store.myshopify.com/admin/api/2024-01/orders/123/cancel.json'
      });

      expect(result.status).toBe(200);
    });
  });

  describe('Inventory API', () => {
    test('should get inventory levels', async () => {
      const mockLevels = {
        inventory_levels: [
          { available: 100, inventory_item_id: 123, location_id: 456 },
          { available: 50, inventory_item_id: 789, location_id: 456 }
        ]
      };

      mockAxiosInstance.request.mockResolvedValue({
        config: {} as any,
        data: mockLevels,
        headers: {},
        status: 200,
        statusText: 'OK'
      });

      const result = await shopifyClient.inventory.levels({
        inventory_item_ids: '123,789',
        location_ids: '456'
      });

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        data: undefined,
        method: 'GET',
        params: {
          inventory_item_ids: '123,789',
          location_ids: '456'
        },
        url: 'https://test-store.myshopify.com/admin/api/2024-01/inventory_levels.json'
      });

      expect(result.data).toEqual(mockLevels);
    });

    test('should adjust inventory level', async () => {
      mockAxiosInstance.request.mockResolvedValue({
        config: {} as any,
        data: { inventory_level: { available: 110 } },
        headers: {},
        status: 200,
        statusText: 'OK'
      });

      const result = await shopifyClient.inventory.adjust(456, 123, 10);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        data: {
          available_adjustment: 10,
          inventory_item_id: 123,
          location_id: 456
        },
        method: 'POST',
        params: undefined,
        url: 'https://test-store.myshopify.com/admin/api/2024-01/inventory_levels/adjust.json'
      });

      expect(result.status).toBe(200);
    });

    test('should set inventory level', async () => {
      mockAxiosInstance.request.mockResolvedValue({
        config: {} as any,
        data: { inventory_level: { available: 200 } },
        headers: {},
        status: 200,
        statusText: 'OK'
      });

      const result = await shopifyClient.inventory.set(456, 123, 200);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        data: {
          available: 200,
          inventory_item_id: 123,
          location_id: 456
        },
        method: 'POST',
        params: undefined,
        url: 'https://test-store.myshopify.com/admin/api/2024-01/inventory_levels/set.json'
      });

      expect(result.status).toBe(200);
    });
  });

  describe('Settings API', () => {
    test('should get shop information', async () => {
      const mockShop = {
        shop: {
          domain: 'test-store.myshopify.com',
          email: 'test@example.com',
          id: 123,
          name: 'Test Shop'
        }
      };

      mockAxiosInstance.request.mockResolvedValue({
        config: {} as any,
        data: mockShop,
        headers: {},
        status: 200,
        statusText: 'OK'
      });

      const result = await shopifyClient.settings.shop(['id', 'name', 'domain']);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        data: undefined,
        method: 'GET',
        params: { fields: 'id,name,domain' },
        url: 'https://test-store.myshopify.com/admin/api/2024-01/shop.json'
      });

      expect(result.data).toEqual(mockShop);
    });

    test('should get locations', async () => {
      const mockLocations = {
        locations: [
          { address1: '123 Main St', id: 456, name: 'Main Warehouse' },
          { address1: '456 Store St', id: 789, name: 'Store Location' }
        ]
      };

      mockAxiosInstance.request.mockResolvedValue({
        config: {} as any,
        data: mockLocations,
        headers: {},
        status: 200,
        statusText: 'OK'
      });

      const result = await shopifyClient.settings.locations();

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        data: undefined,
        method: 'GET',
        params: undefined,
        url: 'https://test-store.myshopify.com/admin/api/2024-01/locations.json'
      });

      expect(result.data).toEqual(mockLocations);
    });
  });

  describe('Webhooks API', () => {
    test('should list webhooks', async () => {
      const mockWebhooks = {
        webhooks: [
          { address: 'https://example.com/webhook', id: 123, topic: 'orders/create' },
          { address: 'https://example.com/webhook2', id: 456, topic: 'orders/paid' }
        ]
      };

      mockAxiosInstance.request.mockResolvedValue({
        config: {} as any,
        data: mockWebhooks,
        headers: {},
        status: 200,
        statusText: 'OK'
      });

      const result = await shopifyClient.webhooks.list({ topic: 'orders/create' });

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        data: undefined,
        method: 'GET',
        params: { topic: 'orders/create' },
        url: 'https://test-store.myshopify.com/admin/api/2024-01/webhooks.json'
      });

      expect(result.data).toEqual(mockWebhooks);
    });

    test('should create webhook', async () => {
      const webhookData = {
        address: 'https://example.com/webhook',
        format: 'json',
        topic: 'orders/create'
      };

      const createdWebhook = {
        webhook: { id: 789, ...webhookData }
      };

      mockAxiosInstance.request.mockResolvedValue({
        config: {} as any,
        data: createdWebhook,
        headers: {},
        status: 201,
        statusText: 'Created'
      });

      const result = await shopifyClient.webhooks.create(webhookData);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        data: { webhook: webhookData },
        method: 'POST',
        params: undefined,
        url: 'https://test-store.myshopify.com/admin/api/2024-01/webhooks.json'
      });

      expect(result.data).toEqual(createdWebhook);
      expect(result.status).toBe(201);
    });

    test('should delete webhook', async () => {
      mockAxiosInstance.request.mockResolvedValue({
        config: {} as any,
        data: {},
        headers: {},
        status: 200,
        statusText: 'OK'
      });

      const result = await shopifyClient.webhooks.delete(123);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        data: undefined,
        method: 'DELETE',
        params: undefined,
        url: 'https://test-store.myshopify.com/admin/api/2024-01/webhooks/123.json'
      });

      expect(result.status).toBe(200);
    });
  });

  describe('Utility methods', () => {
    test('should test connection successfully', async () => {
      const mockShop = {
        shop: { id: 123, name: 'Test Shop' }
      };

      mockAxiosInstance.request.mockResolvedValue({
        config: {} as any,
        data: mockShop,
        headers: {},
        status: 200,
        statusText: 'OK'
      });

      const result = await shopifyClient.testConnection();

      expect(result).toBe(true);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        data: undefined,
        method: 'GET',
        params: { fields: 'id,name' },
        url: 'https://test-store.myshopify.com/admin/api/2024-01/shop.json'
      });
    });

    test('should fail connection test on error', async () => {
      mockAxiosInstance.request.mockRejectedValue(new Error('Unauthorized'));

      const result = await shopifyClient.testConnection();

      expect(result).toBe(false);
    });

    test('should get rate limit information', () => {
      // Mock rate limit header in axios defaults
      mockAxiosInstance.defaults.headers['x-shopify-shop-api-call-limit'] = '25/40';

      const rateLimitInfo = shopifyClient.getRateLimitInfo();

      expect(rateLimitInfo.callLimit).toBe('25/40');
      expect(rateLimitInfo.callsMade).toBe('25');
      expect(rateLimitInfo.callsRemaining).toBe(15);
    });

    test('should return empty rate limit info when header missing', () => {
      delete mockAxiosInstance.defaults.headers['x-shopify-shop-api-call-limit'];

      const rateLimitInfo = shopifyClient.getRateLimitInfo();

      expect(rateLimitInfo.callLimit).toBeUndefined();
      expect(rateLimitInfo.callsMade).toBeUndefined();
      expect(rateLimitInfo.callsRemaining).toBeUndefined();
    });

    test('should get proxy statistics', () => {
      const mockStats = [
        { failureCount: 0, isHealthy: true, lastUsed: Date.now(), port: 10_001 },
        { failureCount: 1, isHealthy: true, lastUsed: Date.now() - 1000, port: 10_002 }
      ];

      mockProxyManager.getProxyStats.mockReturnValue(mockStats);

      const stats = shopifyClient.getProxyStats();

      expect(stats).toEqual(mockStats);
      expect(mockProxyManager.getProxyStats).toHaveBeenCalled();
    });

    test('should reset proxy statistics', () => {
      shopifyClient.resetProxyStats();

      expect(mockProxyManager.resetStats).toHaveBeenCalled();
    });
  });

  describe('Static methods', () => {
    test('should create client from account', () => {
      const client = ShopifyApiClient.fromAccount(testAccount);

      expect(client).toBeInstanceOf(ShopifyApiClient);
      expect(mockProxyManager.createAxiosInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Shopify-Access-Token': testAccount.accessToken
          })
        })
      );
    });

    test('should throw error when creating from account without access token', () => {
      const invalidAccount = { ...testAccount, accessToken: undefined };

      expect(() => {
        ShopifyApiClient.fromAccount(invalidAccount);
      }).toThrow('Access token is required to create Shopify API client');
    });

    test('should create client from account with options', () => {
      const options = {
        apiVersion: '2023-10',
        timeout: 60_000
      };

      const client = ShopifyApiClient.fromAccount(testAccount, options);

      expect(client).toBeInstanceOf(ShopifyApiClient);
    });
  });

  describe('Configuration updates', () => {
    test('should update configuration', () => {
      const newConfig = {
        apiVersion: '2023-10',
        timeout: 60_000
      };

      shopifyClient.updateConfig(newConfig);

      // Since updateConfig recreates axios instance, it should be called again
      expect(mockProxyManager.createAxiosInstance).toHaveBeenCalledTimes(2); // Once in constructor, once in update
    });

    test('should recreate axios instance when critical settings change', () => {
      const newConfig = {
        accessToken: 'new-access-token',
        shopUrl: 'new-store.myshopify.com'
      };

      shopifyClient.updateConfig(newConfig);

      // Should recreate axios instance since shopUrl and accessToken changed
      expect(mockProxyManager.createAxiosInstance).toHaveBeenCalledTimes(2);
    });

    test('should not recreate axios instance for non-critical updates', () => {
      const newConfig = {
        retries: 5,
        retryDelay: 2000
      };

      shopifyClient.updateConfig(newConfig);

      // Should not recreate axios instance since non-critical settings changed
      expect(mockProxyManager.createAxiosInstance).toHaveBeenCalledTimes(1); // Only initial call
    });
  });

  describe('Request interceptors', () => {
    test('should add debug logging when SHOPIFY_CLI_DEBUG is enabled', () => {
      process.env.SHOPIFY_CLI_DEBUG = 'true';
      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

      // Get the request interceptor
      const requestInterceptorCall = (mockAxiosInstance.interceptors.request.use as jest.Mock).mock.calls[0];
      const requestInterceptor = requestInterceptorCall[0];

      const config = {
        method: 'GET',
        url: 'https://test-store.myshopify.com/admin/api/2024-01/products.json'
      };

      requestInterceptor(config);

      expect(consoleSpy).toHaveBeenCalledWith('🔗 API Request: GET https://test-store.myshopify.com/admin/api/2024-01/products.json');

      consoleSpy.mockRestore();
      delete process.env.SHOPIFY_CLI_DEBUG;
    });

    test('should log successful responses when debug is enabled', () => {
      process.env.SHOPIFY_CLI_DEBUG = 'true';
      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

      // Get the response success interceptor
      const responseInterceptorCall = (mockAxiosInstance.interceptors.response.use as jest.Mock).mock.calls[0];
      const successInterceptor = responseInterceptorCall[0];

      const response = {
        config: { url: 'https://test-store.myshopify.com/admin/api/2024-01/products.json' },
        status: 200
      };

      successInterceptor(response);

      expect(consoleSpy).toHaveBeenCalledWith('✅ API Response: 200 https://test-store.myshopify.com/admin/api/2024-01/products.json');

      consoleSpy.mockRestore();
      delete process.env.SHOPIFY_CLI_DEBUG;
    });

    test('should log errors when debug is enabled', () => {
      process.env.SHOPIFY_CLI_DEBUG = 'true';
      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

      // Get the response error interceptor
      const responseInterceptorCall = (mockAxiosInstance.interceptors.response.use as jest.Mock).mock.calls[0];
      const errorInterceptor = responseInterceptorCall[1];

      const error = new Error('API Error');

      expect(() => errorInterceptor(error)).rejects.toBe(error);
      expect(consoleSpy).toHaveBeenCalledWith('❌ API Error: API Error');

      consoleSpy.mockRestore();
      delete process.env.SHOPIFY_CLI_DEBUG;
    });
  });
});
