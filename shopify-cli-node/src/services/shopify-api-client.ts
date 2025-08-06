import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

import { ShopifyAccount } from '../config/types';
import { ProxyManager } from '../proxy/proxy-manager';

/**
 * Shopify API Client Configuration
 */
export interface ShopifyApiClientConfig {
  accessToken: string;
  apiVersion?: string;
  proxyConfig?: Partial<import('../proxy/proxy-manager').ProxyConfig>;
  retries?: number;
  retryDelay?: number;
  shopUrl: string;
  timeout?: number;
}

/**
 * GraphQL Query Response
 */
export interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{
    locations?: Array<{ column: number; line: number; }>;
    message: string;
    path?: string[];
  }>;
  extensions?: Record<string, any>;
}

/**
 * REST API Response Wrapper
 */
export interface RestResponse<T = any> {
  data: T;
  headers: Record<string, string>;
  status: number;
}

/**
 * Core Shopify API Client that wraps REST and GraphQL endpoints
 * with proxy agent support and authentication headers
 */
export class ShopifyApiClient {
  /**
   * Collections API Methods
   */
  collections = {
    /**
     * Get custom collections
     */
    custom: {
      create: async (collection: any) => this.rest('custom_collections.json', 'POST', { custom_collection: collection }),
      delete: async (collectionId: number | string) => this.rest(`custom_collections/${collectionId}.json`, 'DELETE'),
      get: async (collectionId: number | string, fields?: string[]) => {
        const params = fields ? { fields: fields.join(',') } : undefined;
        return this.rest(`custom_collections/${collectionId}.json`, 'GET', undefined, params);
      },
      list: async (params?: { limit?: number; page_info?: string; since_id?: number; title?: string }) => this.rest('custom_collections.json', 'GET', undefined, params),
      update: async (collectionId: number | string, collection: any) => this.rest(`custom_collections/${collectionId}.json`, 'PUT', { custom_collection: collection }),
    },

    /**
     * Collection products (collects)
     */
    products: {
      add: async (collectionId: number | string, productId: number | string) => this.rest('collects.json', 'POST', {
          collect: {
            collection_id: collectionId,
            product_id: productId,
          },
        }),
      list: async (collectionId: number | string, params?: { limit?: number; page_info?: string }) => this.rest(`collections/${collectionId}/products.json`, 'GET', undefined, params),
      remove: async (collectId: number | string) => this.rest(`collects/${collectId}.json`, 'DELETE'),
    },

    /**
     * Get smart collections
     */
    smart: {
      create: async (collection: any) => this.rest('smart_collections.json', 'POST', { smart_collection: collection }),
      delete: async (collectionId: number | string) => this.rest(`smart_collections/${collectionId}.json`, 'DELETE'),
      get: async (collectionId: number | string, fields?: string[]) => {
        const params = fields ? { fields: fields.join(',') } : undefined;
        return this.rest(`smart_collections/${collectionId}.json`, 'GET', undefined, params);
      },
      list: async (params?: { limit?: number; page_info?: string; since_id?: number; title?: string }) => this.rest('smart_collections.json', 'GET', undefined, params),
      update: async (collectionId: number | string, collection: any) => this.rest(`smart_collections/${collectionId}.json`, 'PUT', { smart_collection: collection }),
    },
  };
  /**
   * Fulfillments API Methods
   */
  fulfillments = {
    /**
     * Cancel a fulfillment
     */
    cancel: async (orderId: number | string, fulfillmentId: number | string) => this.rest(`orders/${orderId}/fulfillments/${fulfillmentId}/cancel.json`, 'POST'),

    /**
     * Complete a fulfillment
     */
    complete: async (orderId: number | string, fulfillmentId: number | string) => this.rest(`orders/${orderId}/fulfillments/${fulfillmentId}/complete.json`, 'POST'),

    /**
     * Get fulfillment count for an order
     */
    count: async (orderId: number | string) => this.rest(`orders/${orderId}/fulfillments/count.json`, 'GET'),

    /**
     * Create a fulfillment for an order
     */
    create: async (orderId: number | string, fulfillment: any) => this.rest(`orders/${orderId}/fulfillments.json`, 'POST', { fulfillment }),

    /**
     * Get a specific fulfillment
     */
    get: async (orderId: number | string, fulfillmentId: number | string, fields?: string[]) => {
      const params = fields ? { fields: fields.join(',') } : undefined;
      return this.rest(`orders/${orderId}/fulfillments/${fulfillmentId}.json`, 'GET', undefined, params);
    },

    /**
     * Get fulfillments for an order
     */
    list: async (orderId: number | string, params?: { created_at_max?: string; created_at_min?: string; limit?: number; page_info?: string; since_id?: number; updated_at_max?: string; updated_at_min?: string; }) => this.rest(`orders/${orderId}/fulfillments.json`, 'GET', undefined, params),

    /**
     * Open a fulfillment
     */
    open: async (orderId: number | string, fulfillmentId: number | string) => this.rest(`orders/${orderId}/fulfillments/${fulfillmentId}/open.json`, 'POST'),

    /**
     * Update a fulfillment
     */
    update: async (orderId: number | string, fulfillmentId: number | string, fulfillment: any) => this.rest(`orders/${orderId}/fulfillments/${fulfillmentId}.json`, 'PUT', { fulfillment }),
  };
  /**
   * Inventory API Methods
   */
  inventory = {
    /**
     * Adjust inventory level
     */
    adjust: async (locationId: number | string, inventoryItemId: number | string, quantity: number) => this.rest('inventory_levels/adjust.json', 'POST', {
        available_adjustment: quantity,
        inventory_item_id: inventoryItemId,
        location_id: locationId,
      }),

    /**
     * Connect inventory item to location
     */
    connect: async (locationId: number | string, inventoryItemId: number | string, relocateIfNecessary = false) => this.rest('inventory_levels/connect.json', 'POST', {
        inventory_item_id: inventoryItemId,
        location_id: locationId,
        relocate_if_necessary: relocateIfNecessary,
      }),

    /**
     * Get inventory levels
     */
    levels: async (params?: {
      inventory_item_ids?: string;
      limit?: number;
      location_ids?: string;
      page_info?: string;
    }) => this.rest('inventory_levels.json', 'GET', undefined, params),

    /**
     * Set inventory level
     */
    set: async (locationId: number | string, inventoryItemId: number | string, quantity: number) => this.rest('inventory_levels/set.json', 'POST', {
        available: quantity,
        inventory_item_id: inventoryItemId,
        location_id: locationId,
      }),
  };
/**
 * Orders API Methods
 */
  orders = {
    /**
     * Cancel an order
     */
    cancel: async (orderId: number | string, params?: { amount?: number; currency?: string; email?: boolean; reason?: string; refund?: boolean }) => this.rest(`orders/${orderId}/cancel.json`, 'POST', undefined, params),

    /**
     * Close an order
     */
    close: async (orderId: number | string) => this.rest(`orders/${orderId}/close.json`, 'POST'),

    /**
     * Get order count
     */
    count: async (params?: { financial_status?: string; fulfillment_status?: string; status?: string; }) => this.rest('orders/count.json', 'GET', undefined, params),

    /**
     * Create an order
     */
    create: async (order: any) => this.rest('orders.json', 'POST', { order }),

    /**
     * Get a specific order
     */
    get: async (orderId: number | string, fields?: string[]) => {
      const params = fields ? { fields: fields.join(',') } : undefined;
      return this.rest(`orders/${orderId}.json`, 'GET', undefined, params);
    },

    /**
     * Get all orders
     */
    list: async (params?: {
      created_at_max?: string;
      created_at_min?: string;
      financial_status?: 'any' | 'authorized' | 'paid' | 'partially_paid' | 'partially_refunded' | 'pending' | 'refunded' | 'voided';
      fulfillment_status?: 'any' | 'partial' | 'shipped' | 'unfulfilled' | 'unshipped';
      limit?: number;
      page_info?: string;
      processed_at_max?: string;
      processed_at_min?: string;
      since_id?: number;
      status?: 'any' | 'cancelled' | 'closed' | 'open';
      updated_at_max?: string;
      updated_at_min?: string;
    }) => this.rest('orders.json', 'GET', undefined, params),

    /**
     * Open an order
     */
    open: async (orderId: number | string) => this.rest(`orders/${orderId}/open.json`, 'POST'),

    /**
     * Update an order
     */
    update: async (orderId: number | string, order: any) => this.rest(`orders/${orderId}.json`, 'PUT', { order }),
  };
/**
 * Products API Methods
 */
  products = {
    /**
     * Get product count
     */
    count: async (params?: { collection_id?: number; product_type?: string; vendor?: string; }) => this.rest('products/count.json', 'GET', undefined, params),

    /**
     * Create a new product
     */
    create: async (product: any) => this.rest('products.json', 'POST', { product }),

    /**
     * Delete a product
     */
    delete: async (productId: number | string) => this.rest(`products/${productId}.json`, 'DELETE'),

    /**
     * Get a specific product by ID
     */
    get: async (productId: number | string, fields?: string[]) => {
      const params = fields ? { fields: fields.join(',') } : undefined;
      return this.rest(`products/${productId}.json`, 'GET', undefined, params);
    },

    /**
     * Get all products
     */
    list: async (params?: {
      collection_id?: number;
      created_at_max?: string;
      created_at_min?: string;
      limit?: number;
      page_info?: string;
      product_type?: string;
      since_id?: number;
      status?: 'active' | 'archived' | 'draft';
      updated_at_max?: string;
      updated_at_min?: string;
      vendor?: string;
    }) => this.rest('products.json', 'GET', undefined, params),

    /**
     * Update a product
     */
    update: async (productId: number | string, product: any) => this.rest(`products/${productId}.json`, 'PUT', { product }),
  };
/**
 * Settings and Shop API Methods
 */
  settings = {
    /**
     * Get countries
     */
    countries: async () => this.rest('countries.json', 'GET'),

    /**
     * Get currencies
     */
    currencies: async () => this.rest('currencies.json', 'GET'),

    /**
     * Get a specific location
     */
    location: async (locationId: number | string) => this.rest(`locations/${locationId}.json`, 'GET'),

    /**
     * Get locations
     */
    locations: async () => this.rest('locations.json', 'GET'),

    /**
     * Get shop policies
     */
    policies: async () => this.rest('policies.json', 'GET'),

    /**
     * Get shipping zones
     */
    shippingZones: async () => this.rest('shipping_zones.json', 'GET'),

    /**
     * Get shop information
     */
    shop: async (fields?: string[]) => {
      const params = fields ? { fields: fields.join(',') } : undefined;
      return this.rest('shop.json', 'GET', undefined, params);
    },
  };
/**
 * Themes API Methods
 */
  themes = {
    /**
     * Theme assets
     */
    assets: {
      delete: async (themeId: number | string, asset: string) => this.rest(`themes/${themeId}/assets.json`, 'DELETE', undefined, { asset }),
      get: async (themeId: number | string, asset: string, fields?: string[]) => {
        const params = { asset, ...(fields && { fields: fields.join(',') }) };
        return this.rest(`themes/${themeId}/assets.json`, 'GET', undefined, params);
      },
      list: async (themeId: number | string, params?: { fields?: string }) => this.rest(`themes/${themeId}/assets.json`, 'GET', undefined, params),
      update: async (themeId: number | string, asset: any) => this.rest(`themes/${themeId}/assets.json`, 'PUT', { asset }),
    },

    /**
     * Create a theme
     */
    create: async (theme: any) => this.rest('themes.json', 'POST', { theme }),

    /**
     * Delete a theme
     */
    delete: async (themeId: number | string) => this.rest(`themes/${themeId}.json`, 'DELETE'),

    /**
     * Get a specific theme
     */
    get: async (themeId: number | string, fields?: string[]) => {
      const params = fields ? { fields: fields.join(',') } : undefined;
      return this.rest(`themes/${themeId}.json`, 'GET', undefined, params);
    },

    /**
     * Get all themes
     */
    list: async (params?: { fields?: string; role?: 'demo' | 'development' | 'main' | 'unpublished'; }) => this.rest('themes.json', 'GET', undefined, params),

    /**
     * Update a theme
     */
    update: async (themeId: number | string, theme: any) => this.rest(`themes/${themeId}.json`, 'PUT', { theme }),
  };
/**
 * Product Variants API Methods
 */
  variants = {
    /**
     * Create a variant for a product
     */
    create: async (productId: number | string, variant: any) => this.rest(`products/${productId}/variants.json`, 'POST', { variant }),

    /**
     * Delete a variant
     */
    delete: async (productId: number | string, variantId: number | string) => this.rest(`products/${productId}/variants/${variantId}.json`, 'DELETE'),

    /**
     * Get a specific variant
     */
    get: async (variantId: number | string, fields?: string[]) => {
      const params = fields ? { fields: fields.join(',') } : undefined;
      return this.rest(`variants/${variantId}.json`, 'GET', undefined, params);
    },

    /**
     * Get all variants for a product
     */
    list: async (productId: number | string, params?: { limit?: number; page_info?: string }) => this.rest(`products/${productId}/variants.json`, 'GET', undefined, params),

    /**
     * Update a variant
     */
    update: async (variantId: number | string, variant: any) => this.rest(`variants/${variantId}.json`, 'PUT', { variant }),
  };
/**
 * Webhooks API Methods
 */
  webhooks = {
    /**
     * Get webhook count
     */
    count: async (params?: { topic?: string }) => this.rest('webhooks/count.json', 'GET', undefined, params),

    /**
     * Create a webhook
     */
    create: async (webhook: any) => this.rest('webhooks.json', 'POST', { webhook }),

    /**
     * Delete a webhook
     */
    delete: async (webhookId: number | string) => this.rest(`webhooks/${webhookId}.json`, 'DELETE'),

    /**
     * Get a specific webhook
     */
    get: async (webhookId: number | string, fields?: string[]) => {
      const params = fields ? { fields: fields.join(',') } : undefined;
      return this.rest(`webhooks/${webhookId}.json`, 'GET', undefined, params);
    },

    /**
     * Get all webhooks
     */
    list: async (params?: { limit?: number; page_info?: string; since_id?: number; topic?: string }) => this.rest('webhooks.json', 'GET', undefined, params),

    /**
     * Update a webhook
     */
    update: async (webhookId: number | string, webhook: any) => this.rest(`webhooks/${webhookId}.json`, 'PUT', { webhook }),
  };
private axios: AxiosInstance;
private config: Required<ShopifyApiClientConfig>;
private proxyManager: ProxyManager;

  constructor(config: ShopifyApiClientConfig) {
    this.config = {
      apiVersion: '2024-01',
      proxyConfig: {},
      retries: 3,
      retryDelay: 1000,
      timeout: 30_000,
      ...config,
    };

    // Initialize proxy manager
    this.proxyManager = new ProxyManager(this.config.proxyConfig);

    // Create axios instance with proxy and auth headers
    this.axios = this.createAxiosInstance();
  }

  /**
   * Create a new instance from a Shopify account configuration
   */
  static fromAccount(account: ShopifyAccount, options?: Partial<ShopifyApiClientConfig>): ShopifyApiClient {
    if (!account.accessToken) {
      throw new Error('Access token is required to create Shopify API client');
    }

    return new ShopifyApiClient({
      accessToken: account.accessToken,
      shopUrl: account.shopUrl,
      ...options,
    });
  }

  /**
   * Get proxy statistics
   */
  getProxyStats() {
    return this.proxyManager.getProxyStats();
  }

  /**
   * Get API rate limit information from the last response
   */
  getRateLimitInfo(): null | { callLimit?: string; callsMade?: string; callsRemaining?: number } {
    const lastResponse = this.axios.defaults.headers;
    const rateLimitHeader = lastResponse['x-shopify-shop-api-call-limit'] as string;
    
    if (typeof rateLimitHeader === 'string' && rateLimitHeader.includes('/')) {
      const parts = rateLimitHeader.split('/');
      const callsMade = Number.parseInt(parts[0]);
      const callLimit = Number.parseInt(parts[1]);
      
      return {
        callLimit: rateLimitHeader,
        callsMade: parts[0],
        callsRemaining: callLimit - callsMade,
      };
    }
    
    return {
      callLimit: undefined,
      callsMade: undefined,
      callsRemaining: undefined,
    };
  }

  /**
   * Execute GraphQL query
   */
  async graphql<T = any>(
    query: string,
    variables?: Record<string, any>
  ): Promise<GraphQLResponse<T>> {
    const url = `https://${this.config.shopUrl}/admin/api/${this.config.apiVersion}/graphql.json`;
    
    try {
      const response = await this.axios.post(url, {
        query,
        variables,
      });

      return response.data;
    } catch (error: any) {
      throw new Error(`GraphQL query failed: ${error.message}`);
    }
  }

  /**
   * Reset proxy statistics
   */
  resetProxyStats() {
    this.proxyManager.resetStats();
  }

  /**
   * Execute REST API request
   */
  async rest<T = any>(
    endpoint: string,
    method: 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT' = 'GET',
    data?: any,
    params?: Record<string, any>
  ): Promise<RestResponse<T>> {
    const url = `https://${this.config.shopUrl}/admin/api/${this.config.apiVersion}/${endpoint.replace(/^\//, '')}`;

    try {
      const response: AxiosResponse = await this.axios({
        data,
        method,
        params,
        url,
      });

      return {
        data: response.data,
        headers: response.headers as Record<string, string>,
        status: response.status,
      };
    } catch (error: any) {
      throw new Error(`REST request failed: ${error.message}`);
    }
  }

  /**
   * Test connection to Shopify API
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.settings.shop(['id', 'name']);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ShopifyApiClientConfig>) {
    this.config = { ...this.config, ...newConfig };
    
    // Recreate axios instance if critical settings changed
    if (newConfig.shopUrl || newConfig.accessToken || newConfig.proxyConfig) {
      this.axios = this.createAxiosInstance();
    }
  }

  /**
   * Create configured axios instance with proxy agent and auth headers
   */
  private createAxiosInstance(): AxiosInstance {
    const instance = this.proxyManager.createAxiosInstance({
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ShopifyCLI/1.0.0',
        'X-Shopify-Access-Token': this.config.accessToken,
      },
      timeout: this.config.timeout,
    });

    // Add request interceptor for logging (if debug enabled)
    instance.interceptors.request.use((config) => {
      if (process.env.SHOPIFY_CLI_DEBUG === 'true') {
        console.debug(`🔗 API Request: ${config.method?.toUpperCase()} ${config.url}`);
      }

      return config;
    });

    // Add response interceptor for logging and error handling
    instance.interceptors.response.use(
      (response) => {
        if (process.env.SHOPIFY_CLI_DEBUG === 'true') {
          console.debug(`✅ API Response: ${response.status} ${response.config.url}`);
        }

        return response;
      },
      (error) => {
        if (process.env.SHOPIFY_CLI_DEBUG === 'true') {
          console.debug(`❌ API Error: ${error.message}`);
        }

        return Promise.reject(error);
      }
    );

    return instance;
  }
}

export default ShopifyApiClient;
