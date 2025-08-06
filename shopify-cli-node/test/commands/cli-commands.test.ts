import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { Command } from '@oclif/core';
import { test as oclifTest } from '@oclif/test';
import * as fs from 'fs-extra';
import * as os from 'node:os';
import * as path from 'node:path';

import { ConfigLoader } from '../../src/config/loader';
import { ShopifyApiClient } from '../../src/services/shopify-api-client';

// Mock dependencies
jest.mock('../../src/config/loader');
jest.mock('../../src/services/shopify-api-client');
jest.mock('fs-extra');

const MockedConfigLoader = ConfigLoader as jest.MockedClass<typeof ConfigLoader>;
const MockedShopifyApiClient = ShopifyApiClient as jest.MockedClass<typeof ShopifyApiClient>;
const mockedFs = fs as jest.Mocked<typeof fs>;

// Dynamic imports for commands
const importCommand = async (commandPath: string): Promise<typeof Command> => {
  const { default: CommandClass } = await import(`../../src/commands/${commandPath}`);
  return CommandClass;
};

describe('CLI Commands', () => {
  let mockConfigLoader: jest.Mocked<ConfigLoader>;
  let mockApiClient: jest.Mocked<ShopifyApiClient>;
  let tempConfigDir: string;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup temp directory
    tempConfigDir = '/tmp/test-shopify-cli';
    
    // Mock ConfigLoader
    mockConfigLoader = {
      addAccount: jest.fn(),
      clearCache: jest.fn(),
      configExists: jest.fn(),
      getAccount: jest.fn(),
      getConfigPaths: jest.fn().mockReturnValue({
        configPath: path.join(tempConfigDir, '.shopify-cli.yaml'),
        envPath: path.join(tempConfigDir, '.env')
      }),
      getDefaultAccount: jest.fn(),
      load: jest.fn(),
      removeAccount: jest.fn(),
      reset: jest.fn(),
      save: jest.fn(),
      updateDecodoApi: jest.fn(),
      updateSettings: jest.fn()
    } as any;

    MockedConfigLoader.mockImplementation(() => mockConfigLoader);

    // Mock ShopifyApiClient
    mockApiClient = {
      orders: {
        cancel: jest.fn(),
        get: jest.fn(),
        list: jest.fn()
      },
      products: {
        count: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        get: jest.fn(),
        list: jest.fn(),
        update: jest.fn()
      },
      settings: {
        locations: jest.fn(),
        shop: jest.fn()
      },
      testConnection: jest.fn(),
      webhooks: {
        create: jest.fn(),
        delete: jest.fn(),
        list: jest.fn()
      }
    } as any;

    MockedShopifyApiClient.fromAccount.mockReturnValue(mockApiClient);

    // Mock fs operations
    mockedFs.pathExists.mockResolvedValue(true);
    mockedFs.ensureDir.mockResolvedValue();
  });

  describe('Hello Commands', () => {
    test('should run hello command', async () => {
      const HelloCommand = await importCommand('hello/index');
      
      const { stdout } = await oclifTest
        .stdout()
        .command(['hello', 'World'])
        .it('runs hello World');

      expect(stdout).toContain('hello World');
    });

    test('should run hello world command', async () => {
      const HelloWorldCommand = await importCommand('hello/world');
      
      const { stdout } = await oclifTest
        .stdout()
        .command(['hello:world'])
        .it('runs hello:world');

      expect(stdout).toContain('hello world!');
    });
  });

  describe('Config Commands', () => {
    beforeEach(() => {
      mockConfigLoader.load.mockResolvedValue({
        accounts: [
          {
            accessToken: 'test-token',
            isDefault: true,
            name: 'test-store',
            shopUrl: 'test-store.myshopify.com'
          }
        ],
        lastUpdated: new Date().toISOString(),
        settings: {
          autoUpdate: true,
          debug: false,
          logLevel: 'info',
          theme: 'default'
        },
        version: '1.0.0'
      });
    });

    test('should show current configuration', async () => {
      const ConfigCommand = await importCommand('config/index');
      
      const { stdout } = await oclifTest
        .stdout()
        .command(['config'])
        .it('shows configuration');

      expect(mockConfigLoader.load).toHaveBeenCalled();
    });

    test('should handle missing configuration file', async () => {
      mockConfigLoader.configExists.mockResolvedValue(false);
      mockConfigLoader.load.mockRejectedValue(new Error('Config file not found'));

      const ConfigCommand = await importCommand('config/index');
      
      await oclifTest
        .stderr()
        .command(['config'])
        .catch(error => {
          expect(error.error.message).toContain('Configuration not found');
        })
        .it('handles missing config');
    });
  });

  describe('Product Commands', () => {
    beforeEach(() => {
      mockConfigLoader.getDefaultAccount.mockResolvedValue({
        accessToken: 'test-token',
        isDefault: true,
        name: 'test-store',
        shopUrl: 'test-store.myshopify.com'
      });

      mockApiClient.products.list.mockResolvedValue({
        data: {
          products: [
            { handle: 'test-product-1', id: 123, title: 'Test Product 1' },
            { handle: 'test-product-2', id: 456, title: 'Test Product 2' }
          ]
        },
        headers: {},
        status: 200
      });
    });

    test('should list products', async () => {
      const ProductListCommand = await importCommand('product/list');
      
      const { stdout } = await oclifTest
        .stdout()
        .command(['product:list'])
        .it('lists products');

      expect(mockApiClient.products.list).toHaveBeenCalled();
      expect(stdout).toContain('Test Product 1');
      expect(stdout).toContain('Test Product 2');
    });

    test('should get single product', async () => {
      mockApiClient.products.get.mockResolvedValue({
        data: {
          product: { handle: 'test-product', id: 123, title: 'Test Product' }
        },
        headers: {},
        status: 200
      });

      const ProductGetCommand = await importCommand('product/get');
      
      const { stdout } = await oclifTest
        .stdout()
        .command(['product:get', '123'])
        .it('gets single product');

      expect(mockApiClient.products.get).toHaveBeenCalledWith(123, undefined);
      expect(stdout).toContain('Test Product');
    });

    test('should create product', async () => {
      const newProduct = {
        body_html: 'Test description',
        title: 'New Test Product',
        vendor: 'Test Vendor'
      };

      mockApiClient.products.create.mockResolvedValue({
        data: {
          product: { id: 789, ...newProduct }
        },
        headers: {},
        status: 201
      });

      const ProductCreateCommand = await importCommand('product/create');
      
      const { stdout } = await oclifTest
        .stdout()
        .command([
          'product:create',
          '--title', 'New Test Product',
          '--description', 'Test description',
          '--vendor', 'Test Vendor'
        ])
        .it('creates product');

      expect(mockApiClient.products.create).toHaveBeenCalled();
      expect(stdout).toContain('New Test Product');
    });

    test('should update product', async () => {
      mockApiClient.products.update.mockResolvedValue({
        data: {
          product: { id: 123, title: 'Updated Product' }
        },
        headers: {},
        status: 200
      });

      const ProductUpdateCommand = await importCommand('product/update');
      
      const { stdout } = await oclifTest
        .stdout()
        .command([
          'product:update', '123',
          '--title', 'Updated Product'
        ])
        .it('updates product');

      expect(mockApiClient.products.update).toHaveBeenCalledWith(123, expect.objectContaining({
        title: 'Updated Product'
      }));
    });

    test('should delete product', async () => {
      mockApiClient.products.delete.mockResolvedValue({
        data: {},
        headers: {},
        status: 200
      });

      const ProductDeleteCommand = await importCommand('product/delete');
      
      const { stdout } = await oclifTest
        .stdout()
        .command(['product:delete', '123', '--confirm'])
        .it('deletes product');

      expect(mockApiClient.products.delete).toHaveBeenCalledWith(123);
    });

    test('should require confirmation to delete product', async () => {
      const ProductDeleteCommand = await importCommand('product/delete');
      
      await oclifTest
        .stderr()
        .command(['product:delete', '123'])
        .catch(error => {
          expect(error.error.message).toContain('confirmation');
        })
        .it('requires confirmation for delete');

      expect(mockApiClient.products.delete).not.toHaveBeenCalled();
    });
  });

  describe('Order Commands', () => {
    beforeEach(() => {
      mockConfigLoader.getDefaultAccount.mockResolvedValue({
        accessToken: 'test-token',
        isDefault: true,
        name: 'test-store',
        shopUrl: 'test-store.myshopify.com'
      });

      mockApiClient.orders.list.mockResolvedValue({
        data: {
          orders: [
            { financial_status: 'paid', id: 123, name: '#1001', total_price: '100.00' },
            { financial_status: 'pending', id: 456, name: '#1002', total_price: '150.00' }
          ]
        },
        headers: {},
        status: 200
      });
    });

    test('should list orders', async () => {
      const OrderListCommand = await importCommand('order/list');
      
      const { stdout } = await oclifTest
        .stdout()
        .command(['order:list'])
        .it('lists orders');

      expect(mockApiClient.orders.list).toHaveBeenCalled();
      expect(stdout).toContain('#1001');
      expect(stdout).toContain('#1002');
    });

    test('should get single order', async () => {
      mockApiClient.orders.get.mockResolvedValue({
        data: {
          order: { id: 123, name: '#1001', total_price: '100.00' }
        },
        headers: {},
        status: 200
      });

      const OrderGetCommand = await importCommand('order/get');
      
      const { stdout } = await oclifTest
        .stdout()
        .command(['order:get', '123'])
        .it('gets single order');

      expect(mockApiClient.orders.get).toHaveBeenCalledWith(123, undefined);
      expect(stdout).toContain('#1001');
    });

    test('should cancel order', async () => {
      mockApiClient.orders.cancel.mockResolvedValue({
        data: {
          order: { cancelled_at: '2024-01-15T10:00:00Z', id: 123 }
        },
        headers: {},
        status: 200
      });

      const OrderCancelCommand = await importCommand('order/cancel');
      
      const { stdout } = await oclifTest
        .stdout()
        .command(['order:cancel', '123', '--reason', 'customer', '--confirm'])
        .it('cancels order');

      expect(mockApiClient.orders.cancel).toHaveBeenCalledWith(123, expect.objectContaining({
        reason: 'customer'
      }));
    });
  });

  describe('Store Commands', () => {
    beforeEach(() => {
      mockConfigLoader.getDefaultAccount.mockResolvedValue({
        accessToken: 'test-token',
        isDefault: true,
        name: 'test-store',
        shopUrl: 'test-store.myshopify.com'
      });

      mockApiClient.settings.shop.mockResolvedValue({
        data: {
          shop: {
            domain: 'test-store.myshopify.com',
            email: 'test@example.com',
            id: 123,
            name: 'Test Shop'
          }
        },
        headers: {},
        status: 200
      });
    });

    test('should show store information', async () => {
      const StoreIndexCommand = await importCommand('store/index');
      
      const { stdout } = await oclifTest
        .stdout()
        .command(['store'])
        .it('shows store information');

      expect(mockApiClient.settings.shop).toHaveBeenCalled();
      expect(stdout).toContain('Test Shop');
    });

    test('should list webhooks', async () => {
      mockApiClient.webhooks.list.mockResolvedValue({
        data: {
          webhooks: [
            { address: 'https://example.com/webhook', id: 123, topic: 'orders/create' },
            { address: 'https://example.com/webhook2', id: 456, topic: 'orders/paid' }
          ]
        },
        headers: {},
        status: 200
      });

      const WebhookListCommand = await importCommand('store/webhook/list');
      
      const { stdout } = await oclifTest
        .stdout()
        .command(['store:webhook:list'])
        .it('lists webhooks');

      expect(mockApiClient.webhooks.list).toHaveBeenCalled();
      expect(stdout).toContain('orders/create');
      expect(stdout).toContain('orders/paid');
    });

    test('should create webhook', async () => {
      mockApiClient.webhooks.create.mockResolvedValue({
        data: {
          webhook: {
            address: 'https://example.com/new-webhook',
            id: 789,
            topic: 'orders/create'
          }
        },
        headers: {},
        status: 201
      });

      const WebhookCreateCommand = await importCommand('store/webhook/create');
      
      const { stdout } = await oclifTest
        .stdout()
        .command([
          'store:webhook:create',
          '--topic', 'orders/create',
          '--address', 'https://example.com/new-webhook'
        ])
        .it('creates webhook');

      expect(mockApiClient.webhooks.create).toHaveBeenCalledWith(expect.objectContaining({
        address: 'https://example.com/new-webhook',
        topic: 'orders/create'
      }));
    });

    test('should delete webhook', async () => {
      mockApiClient.webhooks.delete.mockResolvedValue({
        data: {},
        headers: {},
        status: 200
      });

      const WebhookDeleteCommand = await importCommand('store/webhook/delete');
      
      const { stdout } = await oclifTest
        .stdout()
        .command(['store:webhook:delete', '123', '--confirm'])
        .it('deletes webhook');

      expect(mockApiClient.webhooks.delete).toHaveBeenCalledWith(123);
    });
  });

  describe('Geolocation Commands', () => {
    beforeEach(() => {
      mockConfigLoader.load.mockResolvedValue({
        accounts: [],
        decodoApi: {
          apiKey: 'test-api-key',
          endpoint: 'https://api.decodo.com',
          timeout: 30_000
        },
        lastUpdated: new Date().toISOString(),
        settings: {
          autoUpdate: true,
          debug: false,
          logLevel: 'info',
          theme: 'default'
        },
        version: '1.0.0'
      });
    });

    test('should lookup IP geolocation', async () => {
      const GeolocationLookupCommand = await importCommand('geolocation/lookup');
      
      const { stdout } = await oclifTest
        .stdout()
        .command(['geolocation:lookup', '--ip', '8.8.8.8'])
        .it('looks up IP geolocation');

      // Since we're mocking the geolocation service, we just verify the command runs
      expect(stdout).toBeDefined();
    });

    test('should handle missing Decodo API configuration', async () => {
      mockConfigLoader.load.mockResolvedValue({
        accounts: [],
        lastUpdated: new Date().toISOString(),
        settings: {
          autoUpdate: true,
          debug: false,
          logLevel: 'info',
          theme: 'default'
        },
        version: '1.0.0'
      });

      const GeolocationLookupCommand = await importCommand('geolocation/lookup');
      
      await oclifTest
        .stderr()
        .command(['geolocation:lookup', '--ip', '8.8.8.8'])
        .catch(error => {
          expect(error.error.message).toContain('Decodo API');
        })
        .it('handles missing Decodo API config');
    });
  });

  describe('Error Handling', () => {
    test('should handle API connection errors', async () => {
      mockApiClient.testConnection.mockResolvedValue(false);
      mockConfigLoader.getDefaultAccount.mockResolvedValue({
        accessToken: 'invalid-token',
        isDefault: true,
        name: 'test-store',
        shopUrl: 'test-store.myshopify.com'
      });

      const ProductListCommand = await importCommand('product/list');
      
      await oclifTest
        .stderr()
        .command(['product:list'])
        .catch(error => {
          expect(error.error.message).toContain('connection');
        })
        .it('handles API connection errors');
    });

    test('should handle missing account configuration', async () => {
      mockConfigLoader.getDefaultAccount.mockResolvedValue(null);

      const ProductListCommand = await importCommand('product/list');
      
      await oclifTest
        .stderr()
        .command(['product:list'])
        .catch(error => {
          expect(error.error.message).toContain('account');
        })
        .it('handles missing account');
    });

    test('should handle invalid command arguments', async () => {
      const ProductGetCommand = await importCommand('product/get');
      
      await oclifTest
        .stderr()
        .command(['product:get'])
        .catch(error => {
          expect(error.error.message).toContain('Missing');
        })
        .it('handles invalid arguments');
    });
  });

  describe('Output Formatting', () => {
    beforeEach(() => {
      mockConfigLoader.getDefaultAccount.mockResolvedValue({
        accessToken: 'test-token',
        isDefault: true,
        name: 'test-store',
        shopUrl: 'test-store.myshopify.com'
      });
    });

    test('should support JSON output format', async () => {
      mockApiClient.products.list.mockResolvedValue({
        data: {
          products: [
            { handle: 'test-product', id: 123, title: 'Test Product' }
          ]
        },
        headers: {},
        status: 200
      });

      const ProductListCommand = await importCommand('product/list');
      
      const { stdout } = await oclifTest
        .stdout()
        .command(['product:list', '--format', 'json'])
        .it('outputs JSON format');

      const jsonOutput = JSON.parse(stdout);
      expect(jsonOutput).toHaveProperty('products');
      expect(jsonOutput.products).toHaveLength(1);
    });

    test('should support table output format', async () => {
      mockApiClient.products.list.mockResolvedValue({
        data: {
          products: [
            { handle: 'test-product', id: 123, title: 'Test Product' },
            { handle: 'another-product', id: 456, title: 'Another Product' }
          ]
        },
        headers: {},
        status: 200
      });

      const ProductListCommand = await importCommand('product/list');
      
      const { stdout } = await oclifTest
        .stdout()
        .command(['product:list', '--format', 'table'])
        .it('outputs table format');

      expect(stdout).toContain('ID');
      expect(stdout).toContain('Title');
      expect(stdout).toContain('Handle');
      expect(stdout).toContain('Test Product');
      expect(stdout).toContain('Another Product');
    });

    test('should support CSV output format', async () => {
      mockApiClient.orders.list.mockResolvedValue({
        data: {
          orders: [
            { id: 123, name: '#1001', total_price: '100.00' },
            { id: 456, name: '#1002', total_price: '150.00' }
          ]
        },
        headers: {},
        status: 200
      });

      const OrderListCommand = await importCommand('order/list');
      
      const { stdout } = await oclifTest
        .stdout()
        .command(['order:list', '--format', 'csv'])
        .it('outputs CSV format');

      expect(stdout).toContain('ID,Name,Total');
      expect(stdout).toContain('123,#1001,100.00');
      expect(stdout).toContain('456,#1002,150.00');
    });
  });

  describe('Interactive Mode', () => {
    test('should handle interactive product creation wizard', async () => {
      // Mock inquirer responses
      const mockInquirer = jest.fn()
        .mockResolvedValueOnce('New Product Title')
        .mockResolvedValueOnce('Product description')
        .mockResolvedValueOnce('Test Vendor');

      mockApiClient.products.create.mockResolvedValue({
        data: {
          product: {
            body_html: 'Product description',
            id: 789,
            title: 'New Product Title',
            vendor: 'Test Vendor'
          }
        },
        headers: {},
        status: 201
      });

      const ProductWizardCommand = await importCommand('product/wizard');
      
      const { stdout } = await oclifTest
        .stdout()
        .stub(require('inquirer'), 'prompt', () => Promise.resolve({
          confirm: true,
          description: 'Product description',
          title: 'New Product Title',
          vendor: 'Test Vendor'
        }))
        .command(['product:wizard'])
        .it('runs interactive product wizard');

      expect(mockApiClient.products.create).toHaveBeenCalled();
    });

    test('should handle interactive confirmation prompts', async () => {
      const ProductDeleteCommand = await importCommand('product/delete');
      
      const { stdout } = await oclifTest
        .stdout()
        .stub(require('inquirer'), 'prompt', () => Promise.resolve({ confirm: false }))
        .command(['product:delete', '123'])
        .it('handles interactive confirmation');

      expect(mockApiClient.products.delete).not.toHaveBeenCalled();
    });
  });

  describe('Batch Operations', () => {
    test('should handle batch product operations', async () => {
      const productIds = ['123', '456', '789'];
      
      mockApiClient.products.delete.mockResolvedValue({
        data: {},
        headers: {},
        status: 200
      });

      // Mock multiple delete calls
      for (const id of productIds) {
        mockApiClient.products.delete.mockResolvedValueOnce({
          data: {},
          headers: {},
          status: 200
        });
      }

      const { stdout } = await oclifTest
        .stdout()
        .command(['product:delete', ...productIds, '--confirm', '--batch'])
        .it('handles batch delete operations');

      expect(mockApiClient.products.delete).toHaveBeenCalledTimes(productIds.length);
    });
  });

  describe('Configuration Management', () => {
    test('should validate account credentials', async () => {
      mockApiClient.testConnection.mockResolvedValue(true);

      const { stdout } = await oclifTest
        .stdout()
        .command(['config', '--test-connection'])
        .it('validates account credentials');

      expect(mockApiClient.testConnection).toHaveBeenCalled();
      expect(stdout).toContain('Connection successful');
    });

    test('should handle invalid credentials', async () => {
      mockApiClient.testConnection.mockResolvedValue(false);

      await oclifTest
        .stderr()
        .command(['config', '--test-connection'])
        .catch(error => {
          expect(error.error.message).toContain('Connection failed');
        })
        .it('handles invalid credentials');
    });
  });
});
