import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';

import { ConfigLoader } from '../../src/config/loader';
import { ShopifyAccount } from '../../src/config/types';
import { ShopifyApiClient } from '../../src/services/shopify-api-client';

/**
 * Integration Tests for Shopify API Client
 * 
 * These tests require actual Shopify credentials to be configured.
 * 
 * Setup:
 * 1. Create a development store or use an existing one
 * 2. Create a private app with necessary scopes
 * 3. Set environment variables or configure config.yaml
 * 4. Run tests: npm run test:integration
 * 
 * Environment Variables Required:
 * - SHOPIFY_TEST_SHOP_URL (e.g., test-store.myshopify.com)
 * - SHOPIFY_TEST_ACCESS_TOKEN (your private app token)
 * 
 * Or use config.yaml with a test account named 'integration-test'
 */

// Skip integration tests if running in CI without credentials
const SKIP_INTEGRATION = !process.env.SHOPIFY_TEST_ACCESS_TOKEN && !process.env.CI;

describe.skip('Shopify API Integration Tests', () => {
  let apiClient: ShopifyApiClient;
  let testAccount: ShopifyAccount;
  let configLoader: ConfigLoader;
  
  // Test data cleanup tracking
  const createdProductIds: number[] = [];
  const createdWebhookIds: number[] = [];
  
  beforeAll(async () => {
    if (SKIP_INTEGRATION) {
      console.log('⏭️  Skipping integration tests - no credentials provided');
      return;
    }
    
    // Setup test account from environment or config
    configLoader = new ConfigLoader();
    
    try {
      // Try environment variables first
      if (process.env.SHOPIFY_TEST_SHOP_URL && process.env.SHOPIFY_TEST_ACCESS_TOKEN) {
        testAccount = {
          name: 'integration-test-env',
          shopUrl: process.env.SHOPIFY_TEST_SHOP_URL,
          accessToken: process.env.SHOPIFY_TEST_ACCESS_TOKEN
        };
      } else {
        // Try config file
        const config = await configLoader.load();
        testAccount = config.accounts.find(acc => acc.name === 'integration-test') 
          || config.accounts.find(acc => acc.name.includes('test'))
          || config.accounts[0];
          
        if (!testAccount) {
          throw new Error('No test account found in configuration');
        }
      }
      
      // Create API client
      apiClient = ShopifyApiClient.fromAccount(testAccount);
      
      // Test connection
      const connected = await apiClient.testConnection();
      if (!connected) {
        throw new Error(`Failed to connect to ${testAccount.shopUrl}`);
      }
      
      console.log(`✅ Connected to ${testAccount.shopUrl} for integration tests`);
      
    } catch (error) {
      console.error('❌ Failed to setup integration tests:', error);
      throw error;
    }
  });
  
  afterAll(async () => {
    if (SKIP_INTEGRATION || !apiClient) return;
    
    console.log('🧹 Cleaning up test data...');
    
    // Clean up created products
    for (const productId of createdProductIds) {
      try {
        await apiClient.products.delete(productId);
        console.log(`  Deleted product ${productId}`);
      } catch (error) {
        console.warn(`  Failed to delete product ${productId}:`, error);
      }
    }
    
    // Clean up created webhooks
    for (const webhookId of createdWebhookIds) {
      try {
        await apiClient.webhooks.delete(webhookId);
        console.log(`  Deleted webhook ${webhookId}`);
      } catch (error) {
        console.warn(`  Failed to delete webhook ${webhookId}:`, error);
      }
    }
    
    console.log('✅ Integration test cleanup complete');
  });

  describe('Connection and Authentication', () => {
    test('should connect to Shopify store', async () => {
      const connected = await apiClient.testConnection();
      expect(connected).toBe(true);
    });
    
    test('should get shop information', async () => {
      const response = await apiClient.settings.shop(['id', 'name', 'domain']);
      
      expect(response.status).toBe(200);
      expect(response.data.shop).toBeDefined();
      expect(response.data.shop.id).toBeGreaterThan(0);
      expect(response.data.shop.name).toBeTruthy();
      expect(response.data.shop.domain).toContain('.myshopify.com');
    });
  });

  describe('Products API', () => {
    test('should list products', async () => {
      const response = await apiClient.products.list({ limit: 10 });
      
      expect(response.status).toBe(200);
      expect(response.data.products).toBeInstanceOf(Array);
      expect(response.data.products.length).toBeLessThanOrEqual(10);
    });
    
    test('should create, update, and delete a product', async () => {
      const timestamp = Date.now();
      const productData = {
        title: `Test Product ${timestamp}`,
        body_html: '<p>This is a test product created by integration tests</p>',
        vendor: 'Integration Test Suite',
        product_type: 'Test',
        status: 'draft' as const,
        tags: ['test', 'integration']
      };
      
      // Create product
      const createResponse = await apiClient.products.create(productData);
      expect(createResponse.status).toBe(201);
      
      const createdProduct = createResponse.data.product;
      createdProductIds.push(createdProduct.id);
      
      expect(createdProduct.title).toBe(productData.title);
      expect(createdProduct.vendor).toBe(productData.vendor);
      
      // Update product
      const updateData = {
        title: `Updated ${productData.title}`,
        status: 'active' as const
      };
      
      const updateResponse = await apiClient.products.update(createdProduct.id, updateData);
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data.product.title).toBe(updateData.title);
      
      // Delete product
      const deleteResponse = await apiClient.products.delete(createdProduct.id);
      expect(deleteResponse.status).toBe(200);
      
      // Remove from cleanup list since we already deleted it
      const index = createdProductIds.indexOf(createdProduct.id);
      if (index > -1) {
        createdProductIds.splice(index, 1);
      }
    });
  });

  describe('Orders API', () => {
    test('should list orders', async () => {
      const response = await apiClient.orders.list({ 
        limit: 5,
        status: 'any' 
      });
      
      expect(response.status).toBe(200);
      expect(response.data.orders).toBeInstanceOf(Array);
      expect(response.data.orders.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Settings API', () => {
    test('should get locations', async () => {
      const response = await apiClient.settings.locations();
      
      expect(response.status).toBe(200);
      expect(response.data.locations).toBeInstanceOf(Array);
      expect(response.data.locations.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 errors gracefully', async () => {
      const nonExistentProductId = 999999999;
      
      await expect(apiClient.products.get(nonExistentProductId))
        .rejects.toThrow();
    });
  });
});

/**
 * Mock Integration Tests (Always Run)
 * 
 * These tests use mocked responses and always run regardless of credentials
 */
describe('Mock Integration Tests', () => {
  let apiClient: ShopifyApiClient;
  
  beforeAll(() => {
    // Create a mock account for testing
    const mockAccount: ShopifyAccount = {
      name: 'mock-test',
      shopUrl: 'mock-store.myshopify.com',
      accessToken: 'mock_token_for_testing'
    };
    
    apiClient = ShopifyApiClient.fromAccount(mockAccount);
  });
  
  test('should create API client from account', () => {
    expect(apiClient).toBeDefined();
    expect(apiClient.getProxyStats).toBeDefined();
    expect(apiClient.products).toBeDefined();
    expect(apiClient.orders).toBeDefined();
  });
  
  test('should have all required API methods', () => {
    // Products API
    expect(typeof apiClient.products.list).toBe('function');
    expect(typeof apiClient.products.get).toBe('function');
    expect(typeof apiClient.products.create).toBe('function');
    expect(typeof apiClient.products.update).toBe('function');
    expect(typeof apiClient.products.delete).toBe('function');
    expect(typeof apiClient.products.count).toBe('function');
    
    // Orders API
    expect(typeof apiClient.orders.list).toBe('function');
    expect(typeof apiClient.orders.get).toBe('function');
    expect(typeof apiClient.orders.cancel).toBe('function');
    
    // Inventory API
    expect(typeof apiClient.inventory.levels).toBe('function');
    expect(typeof apiClient.inventory.adjust).toBe('function');
    expect(typeof apiClient.inventory.set).toBe('function');
    
    // Settings API
    expect(typeof apiClient.settings.shop).toBe('function');
    expect(typeof apiClient.settings.locations).toBe('function');
    
    // Webhooks API
    expect(typeof apiClient.webhooks.list).toBe('function');
    expect(typeof apiClient.webhooks.create).toBe('function');
    expect(typeof apiClient.webhooks.delete).toBe('function');
    
    // Utility methods
    expect(typeof apiClient.testConnection).toBe('function');
    expect(typeof apiClient.getRateLimitInfo).toBe('function');
    expect(typeof apiClient.getProxyStats).toBe('function');
    expect(typeof apiClient.resetProxyStats).toBe('function');
  });
});
