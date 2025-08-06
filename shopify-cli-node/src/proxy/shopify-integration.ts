import { ProxyManager } from './proxy-manager';

/**
 * Example integration with Shopify API calls using the proxy manager
 */
export class ShopifyProxyClient {
  private axios: any;
  private proxyManager: ProxyManager;

  constructor(config?: Partial<import('./proxy-manager').ProxyConfig>) {
    this.proxyManager = new ProxyManager(config);
    this.axios = this.proxyManager.createAxiosInstance({
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ShopifyCLI/1.0.0'
      },
      timeout: 30_000
    });
  }

  /**
   * Get current proxy statistics
   */
  getProxyStats() {
    return this.proxyManager.getProxyStats();
  }

  /**
   * Make a GraphQL request to Shopify API through proxy rotation
   */
  async graphqlQuery(
    shopUrl: string, 
    accessToken: string, 
    query: string, 
    variables?: Record<string, any>
  ) {
    const url = `https://${shopUrl}/admin/api/2023-10/graphql.json`;
    
    try {
      const response = await this.axios.post(url, {
        query,
        variables
      }, {
        headers: {
          'X-Shopify-Access-Token': accessToken
        }
      });

      return response.data;
    } catch (error) {
      console.error('GraphQL query failed:', (error as Error).message);
      
      // Show proxy statistics on failure
      this.logProxyStats();
      throw error;
    }
  }

  /**
   * Log proxy statistics to console
   */
  logProxyStats() {
    const stats = this.getProxyStats();
    const healthy = stats.filter(s => s.isHealthy);
    const used = stats.filter(s => s.lastUsed > 0);
    
    console.log('\n📊 Proxy Statistics:');
    console.log(`  Total: ${stats.length} | Healthy: ${healthy.length} | Used: ${used.length}`);
    
    if (used.length > 0) {
      console.log('  Recently used ports:');
      for (const stat of used
        .sort((a, b) => b.lastUsed - a.lastUsed)
        .slice(0, 5)) {
          const ago = Date.now() - stat.lastUsed;
          console.log(`    Port ${stat.port}: ${ago}ms ago, ${stat.failureCount} failures`);
        }
    }
  }

  /**
   * Reset proxy statistics
   */
  resetProxyStats() {
    this.proxyManager.resetStats();
  }

  /**
   * Make a REST API request to Shopify through proxy rotation
   */
  async restRequest(
    shopUrl: string,
    accessToken: string,
    endpoint: string,
    method: 'DELETE' | 'GET' | 'POST' | 'PUT' = 'GET',
    data?: any
  ) {
    const url = `https://${shopUrl}/admin/api/2023-10/${endpoint}`;
    
    try {
      const response = await this.axios({
        data,
        headers: {
          'X-Shopify-Access-Token': accessToken
        },
        method,
        url
      });

      return response.data;
    } catch (error) {
      console.error('REST request failed:', (error as Error).message);
      this.logProxyStats();
      throw error;
    }
  }
}

/**
 * Example usage functions
 */
export const shopifyExamples = {
  /**
   * Example: Make multiple concurrent requests with proxy rotation
   */
  async batchRequests(client: ShopifyProxyClient, shopUrl: string, accessToken: string) {
    const requests = [
      () => this.getShopInfo(client, shopUrl, accessToken),
      () => this.getProducts(client, shopUrl, accessToken, 5),
      () => this.getThemes(client, shopUrl, accessToken),
      () => client.restRequest(shopUrl, accessToken, 'webhooks.json'),
      () => client.restRequest(shopUrl, accessToken, 'script_tags.json')
    ];

    console.log('🔄 Making batch requests with proxy rotation...');
    
    const results = await Promise.allSettled(
      requests.map(request => request())
    );

    console.log('📈 Batch request results:');
    for (const [index, result] of results.entries()) {
      if (result.status === 'fulfilled') {
        console.log(`  ✅ Request ${index + 1}: Success`);
      } else {
        console.log(`  ❌ Request ${index + 1}: Failed - ${result.reason.message}`);
      }
    }

    client.logProxyStats();
    
    return results;
  },

  /**
   * Get products using REST API
   */
  async getProducts(client: ShopifyProxyClient, shopUrl: string, accessToken: string, limit = 10) {
    return await client.restRequest(
      shopUrl,
      accessToken,
      `products.json?limit=${limit}`,
      'GET'
    );
  },

  /**
   * Get shop information
   */
  async getShopInfo(client: ShopifyProxyClient, shopUrl: string, accessToken: string) {
    const query = `
      query {
        shop {
          name
          email
          domain
          plan {
            displayName
          }
        }
      }
    `;

    return await client.graphqlQuery(shopUrl, accessToken, query);
  },

  /**
   * Get themes using REST API
   */
  async getThemes(client: ShopifyProxyClient, shopUrl: string, accessToken: string) {
    return await client.restRequest(
      shopUrl,
      accessToken,
      'themes.json',
      'GET'
    );
  }
};
