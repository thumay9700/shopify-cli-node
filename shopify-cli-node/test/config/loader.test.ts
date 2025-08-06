import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';
import * as os from 'node:os';
import * as path from 'node:path';

import { ConfigLoader, ConfigurationError } from '../../src/config/loader';
import { createDefaultConfig } from '../../src/config/schema';
import { DecodoApiCredentials, ShopifyAccount, ShopifyCliConfig } from '../../src/config/types';

// Mock dependencies
jest.mock('fs-extra');
jest.mock('js-yaml');
jest.mock('dotenv');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedYaml = yaml as jest.Mocked<typeof yaml>;

describe('ConfigLoader', () => {
  let configLoader: ConfigLoader;
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Clear environment variables
    delete process.env.SHOPIFY_CLI_CONFIG_PATH;
    delete process.env.SHOPIFY_CLI_DEBUG;
    delete process.env.DECODO_API_ENDPOINT;
    
    // Create temp directory
    tempDir = '/tmp/test-config';
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock fs-extra methods
    mockedFs.pathExists.mockResolvedValue(true);
    mockedFs.readFile.mockResolvedValue('{}');
    mockedFs.writeFile.mockResolvedValue();
    mockedFs.ensureDir.mockResolvedValue();
    mockedFs.existsSync.mockReturnValue(false);
    
    // Mock yaml parsing
    mockedYaml.load.mockReturnValue({});
    mockedYaml.dump.mockReturnValue('version: "1.0.0"\n');
    
    configLoader = new ConfigLoader(tempDir);
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
  });

  describe('constructor', () => {
    test('should use default config directory when none provided', () => {
      const loader = new ConfigLoader();
      const paths = loader.getConfigPaths();
      expect(paths.configPath).toContain(os.homedir());
    });

    test('should use environment variable for config path when set', () => {
      process.env.SHOPIFY_CLI_CONFIG_PATH = '/custom/path';
      const loader = new ConfigLoader();
      const paths = loader.getConfigPaths();
      expect(paths.configPath).toBe('/custom/path/.shopify-cli.yaml');
    });

    test('should use provided config directory', () => {
      const customPath = '/my/custom/path';
      const loader = new ConfigLoader(customPath);
      const paths = loader.getConfigPaths();
      expect(paths.configPath).toBe(path.join(customPath, '.shopify-cli.yaml'));
    });
  });

  describe('load', () => {
    test('should load existing config file successfully', async () => {
      const mockConfig = createDefaultConfig();
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile.mockResolvedValue('version: "1.0.0"');
      mockedYaml.load.mockReturnValue(mockConfig);

      const config = await configLoader.load();
      
      expect(config).toBeDefined();
      expect(mockedFs.pathExists).toHaveBeenCalledWith(path.join(tempDir, '.shopify-cli.yaml'));
      expect(mockedFs.readFile).toHaveBeenCalled();
    });

    test('should create default config when file does not exist', async () => {
      mockedFs.pathExists.mockResolvedValue(false);
      
      const config = await configLoader.load();
      
      expect(config).toBeDefined();
      expect(config.version).toBe('1.0.0');
      expect(mockedFs.ensureDir).toHaveBeenCalled();
      expect(mockedFs.writeFile).toHaveBeenCalled();
    });

    test('should parse YAML config file', async () => {
      const yamlContent = 'version: "1.0.0"\naccounts: []';
      const mockConfig = { accounts: [], version: '1.0.0' };
      
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile.mockResolvedValue(yamlContent);
      mockedYaml.load.mockReturnValue(mockConfig);
      
      await configLoader.load();
      
      expect(mockedYaml.load).toHaveBeenCalledWith(yamlContent, { schema: yaml.JSON_SCHEMA });
    });

    test('should fallback to JSON parsing when YAML fails', async () => {
      const jsonContent = '{"version": "1.0.0"}';
      const mockConfig = { version: '1.0.0' };
      
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile.mockResolvedValue(jsonContent);
      mockedYaml.load.mockImplementation(() => {
        throw new Error('YAML parse error');
      });
      
      // Mock JSON.parse
      const originalJSONParse = JSON.parse;
      JSON.parse = jest.fn().mockReturnValue(mockConfig);
      
      try {
        await configLoader.load();
        expect(JSON.parse).toHaveBeenCalledWith(jsonContent);
      } finally {
        JSON.parse = originalJSONParse;
      }
    });

    test('should throw ConfigurationError for invalid config content', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile.mockResolvedValue('invalid content');
      mockedYaml.load.mockImplementation(() => {
        throw new Error('YAML parse error');
      });
      
      const originalJSONParse = JSON.parse;
      JSON.parse = jest.fn().mockImplementation(() => {
        throw new Error('JSON parse error');
      });
      
      try {
        await expect(configLoader.load()).rejects.toThrow(ConfigurationError);
        await expect(configLoader.load()).rejects.toThrow('Configuration file must be valid YAML or JSON');
      } finally {
        JSON.parse = originalJSONParse;
      }
    });

    test('should apply environment overrides', async () => {
      process.env.SHOPIFY_CLI_DEBUG = 'true';
      process.env.DECODO_API_ENDPOINT = 'https://test.decodo.com';
      process.env.DECODO_API_KEY = 'test-key';
      
      // Create a new loader to pick up environment variables
      const loader = new ConfigLoader(tempDir);
      
      const mockConfig = createDefaultConfig();
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile.mockResolvedValue('{}');
      mockedYaml.load.mockReturnValue(mockConfig);
      
      const config = await loader.load();
      
      expect(config.settings.debug).toBe(true);
      expect(config.decodoApi?.endpoint).toBe('https://test.decodo.com');
      expect(config.decodoApi?.apiKey).toBe('test-key');
    });
  });

  describe('save', () => {
    test('should save config to YAML format', async () => {
      const mockConfig = createDefaultConfig();
      const yamlContent = 'version: "1.0.0"\n';
      
      mockedYaml.dump.mockReturnValue(yamlContent);
      
      await configLoader.save(mockConfig);
      
      expect(mockedFs.ensureDir).toHaveBeenCalled();
      expect(mockedYaml.dump).toHaveBeenCalledWith(
        expect.objectContaining({ version: '1.0.0' }),
        expect.objectContaining({
          forceQuotes: false,
          indent: 2,
          lineWidth: 120,
          noRefs: true,
          quotingType: '"',
        })
      );
      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        path.join(tempDir, '.shopify-cli.yaml'),
        yamlContent,
        { encoding: 'utf8', mode: 0o600 }
      );
    });

    test('should update lastUpdated timestamp when saving', async () => {
      const mockConfig = createDefaultConfig();
      const beforeSave = new Date().toISOString();
      
      await configLoader.save(mockConfig);
      
      expect(mockConfig.lastUpdated).toBeDefined();
      expect(new Date(mockConfig.lastUpdated!)).toBeInstanceOf(Date);
      expect(mockConfig.lastUpdated!).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    test('should throw error when saving invalid config', async () => {
      const invalidConfig = { invalid: 'config' } as any;
      
      await expect(configLoader.save(invalidConfig)).rejects.toThrow(ConfigurationError);
    });
  });

  describe('account management', () => {
    let mockConfig: ShopifyCliConfig;
    
    beforeEach(() => {
      mockConfig = createDefaultConfig();
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile.mockResolvedValue('{}');
      mockedYaml.load.mockReturnValue(mockConfig);
    });

    test('should add new account', async () => {
      const newAccount: ShopifyAccount = {
        accessToken: 'test-token',
        isDefault: false,
        name: 'test-store',
        shopUrl: 'test-store.myshopify.com'
      };
      
      await configLoader.addAccount(newAccount);
      
      expect(mockedFs.writeFile).toHaveBeenCalled();
    });

    test('should update existing account', async () => {
      const existingAccount: ShopifyAccount = {
        accessToken: 'old-token',
        isDefault: false,
        name: 'existing-store',
        shopUrl: 'existing.myshopify.com'
      };
      
      mockConfig.accounts = [existingAccount];
      
      const updatedAccount: ShopifyAccount = {
        ...existingAccount,
        accessToken: 'new-token'
      };
      
      await configLoader.addAccount(updatedAccount);
      
      expect(mockedFs.writeFile).toHaveBeenCalled();
    });

    test('should set account as default and unmark others', async () => {
      const account1: ShopifyAccount = {
        accessToken: 'token1',
        isDefault: true,
        name: 'store1',
        shopUrl: 'store1.myshopify.com'
      };
      
      const account2: ShopifyAccount = {
        accessToken: 'token2',
        isDefault: true,
        name: 'store2',
        shopUrl: 'store2.myshopify.com'
      };
      
      mockConfig.accounts = [account1];
      
      await configLoader.addAccount(account2);
      
      expect(mockedFs.writeFile).toHaveBeenCalled();
    });

    test('should remove account successfully', async () => {
      const account: ShopifyAccount = {
        accessToken: 'token',
        isDefault: false,
        name: 'test-store',
        shopUrl: 'test.myshopify.com'
      };
      
      mockConfig.accounts = [account];
      
      const removed = await configLoader.removeAccount('test-store');
      
      expect(removed).toBe(true);
      expect(mockedFs.writeFile).toHaveBeenCalled();
    });

    test('should return false when removing non-existent account', async () => {
      mockConfig.accounts = [];
      
      const removed = await configLoader.removeAccount('non-existent');
      
      expect(removed).toBe(false);
    });

    test('should get account by name', async () => {
      const account: ShopifyAccount = {
        accessToken: 'token',
        isDefault: false,
        name: 'test-store',
        shopUrl: 'test.myshopify.com'
      };
      
      mockConfig.accounts = [account];
      
      const foundAccount = await configLoader.getAccount('test-store');
      
      expect(foundAccount).toEqual(account);
    });

    test('should return null for non-existent account', async () => {
      mockConfig.accounts = [];
      
      const foundAccount = await configLoader.getAccount('non-existent');
      
      expect(foundAccount).toBeNull();
    });

    test('should get default account', async () => {
      const defaultAccount: ShopifyAccount = {
        accessToken: 'token',
        isDefault: true,
        name: 'default-store',
        shopUrl: 'default.myshopify.com'
      };
      
      const regularAccount: ShopifyAccount = {
        accessToken: 'token',
        isDefault: false,
        name: 'regular-store',
        shopUrl: 'regular.myshopify.com'
      };
      
      mockConfig.accounts = [regularAccount, defaultAccount];
      
      const foundAccount = await configLoader.getDefaultAccount();
      
      expect(foundAccount).toEqual(defaultAccount);
    });

    test('should return first account when no default is set', async () => {
      const firstAccount: ShopifyAccount = {
        accessToken: 'token',
        isDefault: false,
        name: 'first-store',
        shopUrl: 'first.myshopify.com'
      };
      
      mockConfig.accounts = [firstAccount];
      
      const foundAccount = await configLoader.getDefaultAccount();
      
      expect(foundAccount).toEqual(firstAccount);
    });
  });

  describe('updateDecodoApi', () => {
    test('should update Decodo API credentials', async () => {
      const mockConfig = createDefaultConfig();
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile.mockResolvedValue('{}');
      mockedYaml.load.mockReturnValue(mockConfig);
      
      const credentials: DecodoApiCredentials = {
        apiKey: 'new-key',
        endpoint: 'https://api.decodo.com',
        timeout: 5000
      };
      
      await configLoader.updateDecodoApi(credentials);
      
      expect(mockedFs.writeFile).toHaveBeenCalled();
    });
  });

  describe('cache management', () => {
    test('should return cached config when available', async () => {
      const mockConfig = createDefaultConfig();
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile.mockResolvedValue('{}');
      mockedYaml.load.mockReturnValue(mockConfig);
      
      // First load
      const config1 = await configLoader.load();
      
      // Second load should use cache
      const config2 = await configLoader.load();
      
      expect(config1).toEqual(config2);
      expect(mockedFs.readFile).toHaveBeenCalledTimes(1); // Only called once
    });

    test('should clear cache', async () => {
      const mockConfig = createDefaultConfig();
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile.mockResolvedValue('{}');
      mockedYaml.load.mockReturnValue(mockConfig);
      
      // Load config
      await configLoader.load();
      
      // Clear cache
      configLoader.clearCache();
      
      // Load again - should read from file
      await configLoader.load();
      
      expect(mockedFs.readFile).toHaveBeenCalledTimes(2);
    });
  });

  describe('utility methods', () => {
    test('should check if config exists', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      
      const exists = await configLoader.configExists();
      
      expect(exists).toBe(true);
      expect(mockedFs.pathExists).toHaveBeenCalledWith(path.join(tempDir, '.shopify-cli.yaml'));
    });

    test('should return config file paths', () => {
      const paths = configLoader.getConfigPaths();
      
      expect(paths.configPath).toBe(path.join(tempDir, '.shopify-cli.yaml'));
      expect(paths.envPath).toBe(path.join(tempDir, '.env'));
    });

    test('should reset configuration', async () => {
      await configLoader.reset();
      
      expect(mockedFs.writeFile).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('should handle file system errors', async () => {
      mockedFs.pathExists.mockRejectedValue(new Error('File system error'));
      
      await expect(configLoader.load()).rejects.toThrow(ConfigurationError);
      await expect(configLoader.load()).rejects.toThrow('Failed to load configuration');
    });

    test('should handle save errors', async () => {
      const mockConfig = createDefaultConfig();
      mockedFs.writeFile.mockRejectedValue(new Error('Write error'));
      
      await expect(configLoader.save(mockConfig)).rejects.toThrow(ConfigurationError);
      await expect(configLoader.save(mockConfig)).rejects.toThrow('Failed to save configuration');
    });
  });
});

