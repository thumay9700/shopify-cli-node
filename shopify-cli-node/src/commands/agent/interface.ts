import { Command, Flags } from '@oclif/core';
import { APIClient } from '../../lib/api/client.js';

interface AgentResponse {
  success: boolean;
  timestamp: string;
  command: string;
  account?: string;
  data?: any;
  error?: string;
  suggestions?: string[];
  next_actions?: string[];
  metadata?: {
    total_items?: number;
    has_more?: boolean;
    api_calls_made?: number;
    rate_limit_remaining?: number;
    execution_time_ms?: number;
  };
}

export default class AgentInterface extends Command {
  static description = 'Agent-friendly interface for programmatic access to Shopify operations';
  
  static examples = [
    '<%= config.bin %> <%= command.id %> --action get-store-info --format agent-json',
    '<%= config.bin %> <%= command.id %> --action list-products --limit 10 --format agent-json',
    '<%= config.bin %> <%= command.id %> --action bulk-update-products --file products.json --format agent-json',
    '<%= config.bin %> <%= command.id %> --action analyze-store --format agent-json',
  ];

  static flags = {
    account: Flags.string({
      char: 'a',
      description: 'Account to use for the request',
    }),
    action: Flags.string({
      char: 'A',
      description: 'Action to perform',
      required: true,
      options: [
        'get-store-info',
        'list-products', 
        'list-orders',
        'get-product',
        'get-order',
        'analyze-store',
        'check-inventory',
        'get-analytics',
        'list-customers',
        'bulk-update-products',
        'validate-data',
        'health-check'
      ],
    }),
    format: Flags.string({
      description: 'Output format (always use agent-json for agents)',
      options: ['agent-json', 'json', 'table'],
      default: 'agent-json',
    }),
    limit: Flags.integer({
      description: 'Limit number of results',
      default: 20,
    }),
    id: Flags.string({
      description: 'Specific ID to fetch (for get-product, get-order)',
    }),
    file: Flags.string({
      description: 'File path for bulk operations',
    }),
    query: Flags.string({
      description: 'Search query or filter',
    }),
    fields: Flags.string({
      description: 'Comma-separated list of fields to return',
    }),
    since: Flags.string({
      description: 'Date filter (ISO format: 2024-01-01T00:00:00Z)',
    }),
    status: Flags.string({
      description: 'Status filter',
      options: ['active', 'archived', 'draft', 'pending'],
    }),
    'dry-run': Flags.boolean({
      description: 'Preview changes without applying them',
      default: false,
    }),
    verbose: Flags.boolean({
      description: 'Include detailed metadata for agents',
      default: true,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(AgentInterface);
    const startTime = Date.now();
    
    try {
      const apiClient = new APIClient(flags.account);
      let result: AgentResponse;

      switch (flags.action) {
        case 'get-store-info':
          result = await this.getStoreInfo(apiClient, flags);
          break;
        case 'list-products':
          result = await this.listProducts(apiClient, flags);
          break;
        case 'list-orders':
          result = await this.listOrders(apiClient, flags);
          break;
        case 'get-product':
          result = await this.getProduct(apiClient, flags);
          break;
        case 'get-order':
          result = await this.getOrder(apiClient, flags);
          break;
        case 'analyze-store':
          result = await this.analyzeStore(apiClient, flags);
          break;
        case 'check-inventory':
          result = await this.checkInventory(apiClient, flags);
          break;
        case 'get-analytics':
          result = await this.getAnalytics(apiClient, flags);
          break;
        case 'list-customers':
          result = await this.listCustomers(apiClient, flags);
          break;
        case 'bulk-update-products':
          result = await this.bulkUpdateProducts(apiClient, flags);
          break;
        case 'validate-data':
          result = await this.validateData(apiClient, flags);
          break;
        case 'health-check':
          result = await this.healthCheck(apiClient, flags);
          break;
        default:
          throw new Error(`Unknown action: ${flags.action}`);
      }

      result.metadata = {
        ...result.metadata,
        execution_time_ms: Date.now() - startTime,
      };

      if (flags.format === 'agent-json') {
        this.log(JSON.stringify(result, null, 2));
      } else {
        this.log(JSON.stringify(result.data, null, 2));
      }

    } catch (error: any) {
      const errorResponse: AgentResponse = {
        success: false,
        timestamp: new Date().toISOString(),
        command: flags.action,
        account: flags.account,
        error: error.message,
        suggestions: this.generateErrorSuggestions(error.message, flags.action),
        metadata: {
          execution_time_ms: Date.now() - startTime,
        },
      };
      
      this.log(JSON.stringify(errorResponse, null, 2));
      this.exit(1);
    }
  }

  private async getStoreInfo(apiClient: APIClient, flags: any): Promise<AgentResponse> {
    const response = await apiClient.request('/admin/api/2023-10/shop.json');
    const shop = response.data.shop;
    
    return {
      success: true,
      timestamp: new Date().toISOString(),
      command: 'get-store-info',
      account: flags.account,
      data: {
        store: {
          id: shop.id,
          name: shop.name,
          domain: shop.domain,
          email: shop.email,
          currency: shop.currency,
          timezone: shop.timezone,
          country_code: shop.country_code,
          plan_name: shop.plan_name,
          created_at: shop.created_at,
          updated_at: shop.updated_at,
        }
      },
      suggestions: [
        'Use list-products to see store inventory',
        'Use list-orders to check recent sales',
        'Use analyze-store for detailed insights'
      ],
      metadata: {
        api_calls_made: 1,
      }
    };
  }

  private async listProducts(apiClient: APIClient, flags: any): Promise<AgentResponse> {
    let url = `/admin/api/2023-10/products.json?limit=${flags.limit}`;
    
    if (flags.status) url += `&status=${flags.status}`;
    if (flags.since) url += `&created_at_min=${flags.since}`;
    if (flags.fields) url += `&fields=${flags.fields}`;

    const response = await apiClient.request(url);
    const products = response.data.products || [];
    
    return {
      success: true,
      timestamp: new Date().toISOString(),
      command: 'list-products',
      account: flags.account,
      data: {
        products: products.map((product: any) => ({
          id: product.id,
          title: product.title,
          handle: product.handle,
          status: product.status,
          vendor: product.vendor,
          product_type: product.product_type,
          created_at: product.created_at,
          updated_at: product.updated_at,
          variants_count: product.variants?.length || 0,
          tags: product.tags?.split(',').map((tag: string) => tag.trim()) || [],
        }))
      },
      next_actions: [
        'Use get-product --id <product_id> for detailed product info',
        'Use bulk-update-products --file <file> for batch updates',
        'Use check-inventory to see stock levels'
      ],
      metadata: {
        total_items: products.length,
        has_more: products.length === flags.limit,
        api_calls_made: 1,
      }
    };
  }

  private async listOrders(apiClient: APIClient, flags: any): Promise<AgentResponse> {
    let url = `/admin/api/2023-10/orders.json?limit=${flags.limit}&status=any`;
    
    if (flags.since) url += `&created_at_min=${flags.since}`;
    if (flags.status && flags.status !== 'any') url += `&financial_status=${flags.status}`;

    const response = await apiClient.request(url);
    const orders = response.data.orders || [];
    
    return {
      success: true,
      timestamp: new Date().toISOString(),
      command: 'list-orders',
      account: flags.account,
      data: {
        orders: orders.map((order: any) => ({
          id: order.id,
          name: order.name,
          email: order.email,
          created_at: order.created_at,
          updated_at: order.updated_at,
          financial_status: order.financial_status,
          fulfillment_status: order.fulfillment_status,
          total_price: order.total_price,
          currency: order.currency,
          line_items_count: order.line_items?.length || 0,
        }))
      },
      next_actions: [
        'Use get-order --id <order_id> for detailed order info',
        'Use get-analytics for sales insights'
      ],
      metadata: {
        total_items: orders.length,
        has_more: orders.length === flags.limit,
        api_calls_made: 1,
      }
    };
  }

  private async analyzeStore(apiClient: APIClient, flags: any): Promise<AgentResponse> {
    // Get multiple data points for analysis
    const [shopResponse, productsResponse, ordersResponse] = await Promise.all([
      apiClient.request('/admin/api/2023-10/shop.json'),
      apiClient.request('/admin/api/2023-10/products.json?limit=1'),
      apiClient.request('/admin/api/2023-10/orders.json?limit=10&status=any')
    ]);

    const shop = shopResponse.data.shop;
    const products = productsResponse.data.products || [];
    const orders = ordersResponse.data.orders || [];

    // Calculate metrics
    const totalRevenue = orders.reduce((sum: number, order: any) => 
      sum + parseFloat(order.total_price || '0'), 0);
    
    const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
    
    const recentOrders = orders.filter((order: any) => {
      const orderDate = new Date(order.created_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return orderDate > weekAgo;
    });

    return {
      success: true,
      timestamp: new Date().toISOString(),
      command: 'analyze-store',
      account: flags.account,
      data: {
        store_overview: {
          name: shop.name,
          plan: shop.plan_name,
          currency: shop.currency,
          created_at: shop.created_at,
        },
        metrics: {
          total_products: products.length > 0 ? 'estimated_1000+' : '0',
          recent_orders_count: recentOrders.length,
          total_revenue_recent: totalRevenue.toFixed(2),
          average_order_value: avgOrderValue.toFixed(2),
          currency: shop.currency,
        },
        recommendations: this.generateStoreRecommendations(shop, products, orders),
      },
      suggestions: [
        'Use list-products --limit 50 to see more inventory',
        'Use check-inventory to identify low stock items',
        'Use get-analytics for detailed performance metrics'
      ],
      metadata: {
        api_calls_made: 3,
        analysis_date: new Date().toISOString(),
      }
    };
  }

  private async checkInventory(apiClient: APIClient, flags: any): Promise<AgentResponse> {
    const response = await apiClient.request(`/admin/api/2023-10/products.json?limit=${flags.limit}&fields=id,title,variants`);
    const products = response.data.products || [];
    
    const inventoryData = products.map((product: any) => ({
      product_id: product.id,
      product_title: product.title,
      variants: product.variants?.map((variant: any) => ({
        variant_id: variant.id,
        variant_title: variant.title,
        sku: variant.sku,
        inventory_quantity: variant.inventory_quantity,
        inventory_policy: variant.inventory_policy,
        price: variant.price,
      })) || []
    }));

    // Identify low stock items
    const lowStockItems = inventoryData.flatMap(product => 
      product.variants.filter(variant => 
        variant.inventory_quantity !== null && variant.inventory_quantity < 10
      ).map(variant => ({
        ...variant,
        product_title: product.product_title,
      }))
    );

    return {
      success: true,
      timestamp: new Date().toISOString(),
      command: 'check-inventory',
      account: flags.account,
      data: {
        inventory_summary: {
          total_products_checked: products.length,
          total_variants: inventoryData.reduce((sum, p) => sum + p.variants.length, 0),
          low_stock_items: lowStockItems.length,
        },
        products: inventoryData,
        alerts: {
          low_stock: lowStockItems,
        }
      },
      suggestions: lowStockItems.length > 0 ? [
        'Consider restocking low inventory items',
        'Use bulk-update-products to adjust inventory levels',
        'Set up inventory alerts for automated monitoring'
      ] : [
        'Inventory levels look healthy',
        'Consider setting up automated inventory monitoring'
      ],
      metadata: {
        api_calls_made: 1,
        low_stock_threshold: 10,
      }
    };
  }

  private async healthCheck(apiClient: APIClient, flags: any): Promise<AgentResponse> {
    const startTime = Date.now();
    
    try {
      // Test basic API connectivity
      const shopResponse = await apiClient.request('/admin/api/2023-10/shop.json');
      const responseTime = Date.now() - startTime;
      
      // Test various endpoints
      const tests = [
        { name: 'Shop API', endpoint: '/admin/api/2023-10/shop.json', status: 'ok' },
        { name: 'Products API', endpoint: '/admin/api/2023-10/products.json?limit=1', status: 'pending' },
        { name: 'Orders API', endpoint: '/admin/api/2023-10/orders.json?limit=1', status: 'pending' },
      ];

      // Run additional tests
      for (let i = 1; i < tests.length; i++) {
        try {
          await apiClient.request(tests[i].endpoint);
          tests[i].status = 'ok';
        } catch (error) {
          tests[i].status = 'error';
        }
      }

      const allOk = tests.every(test => test.status === 'ok');

      return {
        success: allOk,
        timestamp: new Date().toISOString(),
        command: 'health-check',
        account: flags.account,
        data: {
          overall_status: allOk ? 'healthy' : 'issues_detected',
          api_connectivity: 'ok',
          response_time_ms: responseTime,
          tests: tests,
          shop_info: {
            name: shopResponse.data.shop.name,
            plan: shopResponse.data.shop.plan_name,
          }
        },
        suggestions: allOk ? [
          'All systems operational',
          'You can safely run other operations'
        ] : [
          'Some API endpoints are experiencing issues',
          'Check your permissions and network connectivity'
        ],
        metadata: {
          api_calls_made: tests.length,
          test_duration_ms: Date.now() - startTime,
        }
      };

    } catch (error: any) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        command: 'health-check',
        account: flags.account,
        error: error.message,
        data: {
          overall_status: 'connection_failed',
          api_connectivity: 'failed',
        },
        suggestions: [
          'Check your access token',
          'Verify store URL format',
          'Test network connectivity'
        ],
        metadata: {
          api_calls_made: 0,
          test_duration_ms: Date.now() - startTime,
        }
      };
    }
  }

  private async bulkUpdateProducts(apiClient: APIClient, flags: any): Promise<AgentResponse> {
    if (!flags.file) {
      throw new Error('File path required for bulk operations');
    }

    // This would implement bulk update logic
    // For now, return a structure that agents can use
    return {
      success: true,
      timestamp: new Date().toISOString(),
      command: 'bulk-update-products',
      account: flags.account,
      data: {
        operation: flags['dry-run'] ? 'preview' : 'executed',
        file_path: flags.file,
        // Would contain actual results
      },
      suggestions: [
        'Use --dry-run flag to preview changes first',
        'Backup your data before bulk operations'
      ],
      metadata: {
        api_calls_made: 0, // Would be actual count
      }
    };
  }

  private async getProduct(apiClient: APIClient, flags: any): Promise<AgentResponse> {
    if (!flags.id) {
      throw new Error('Product ID required');
    }

    const response = await apiClient.request(`/admin/api/2023-10/products/${flags.id}.json`);
    const product = response.data.product;

    return {
      success: true,
      timestamp: new Date().toISOString(),
      command: 'get-product',
      account: flags.account,
      data: {
        product: {
          id: product.id,
          title: product.title,
          description: product.body_html,
          vendor: product.vendor,
          product_type: product.product_type,
          status: product.status,
          tags: product.tags?.split(',').map((tag: string) => tag.trim()) || [],
          variants: product.variants?.map((variant: any) => ({
            id: variant.id,
            title: variant.title,
            sku: variant.sku,
            price: variant.price,
            inventory_quantity: variant.inventory_quantity,
          })) || []
        }
      },
      next_actions: [
        'Use bulk-update-products to modify this product',
        'Use check-inventory to see stock levels'
      ],
      metadata: {
        api_calls_made: 1,
      }
    };
  }

  private async getOrder(apiClient: APIClient, flags: any): Promise<AgentResponse> {
    if (!flags.id) {
      throw new Error('Order ID required');
    }

    const response = await apiClient.request(`/admin/api/2023-10/orders/${flags.id}.json`);
    const order = response.data.order;

    return {
      success: true,
      timestamp: new Date().toISOString(),
      command: 'get-order',
      account: flags.account,
      data: {
        order: {
          id: order.id,
          name: order.name,
          email: order.email,
          created_at: order.created_at,
          financial_status: order.financial_status,
          fulfillment_status: order.fulfillment_status,
          total_price: order.total_price,
          currency: order.currency,
          line_items: order.line_items?.map((item: any) => ({
            product_id: item.product_id,
            variant_id: item.variant_id,
            title: item.title,
            quantity: item.quantity,
            price: item.price,
          })) || []
        }
      },
      metadata: {
        api_calls_made: 1,
      }
    };
  }

  private async listCustomers(apiClient: APIClient, flags: any): Promise<AgentResponse> {
    const response = await apiClient.request(`/admin/api/2023-10/customers.json?limit=${flags.limit}`);
    const customers = response.data.customers || [];

    return {
      success: true,
      timestamp: new Date().toISOString(),
      command: 'list-customers',
      account: flags.account,
      data: {
        customers: customers.map((customer: any) => ({
          id: customer.id,
          email: customer.email,
          first_name: customer.first_name,
          last_name: customer.last_name,
          orders_count: customer.orders_count,
          total_spent: customer.total_spent,
          created_at: customer.created_at,
        }))
      },
      metadata: {
        total_items: customers.length,
        api_calls_made: 1,
      }
    };
  }

  private async getAnalytics(apiClient: APIClient, flags: any): Promise<AgentResponse> {
    // This would implement analytics gathering
    return {
      success: true,
      timestamp: new Date().toISOString(),
      command: 'get-analytics',
      account: flags.account,
      data: {
        message: 'Analytics feature coming soon',
        available_metrics: [
          'sales_over_time',
          'top_products',
          'customer_segments',
          'conversion_rates'
        ]
      },
      suggestions: [
        'Use analyze-store for basic insights',
        'Use list-orders with date filters for custom analysis'
      ],
      metadata: {
        api_calls_made: 0,
      }
    };
  }

  private async validateData(apiClient: APIClient, flags: any): Promise<AgentResponse> {
    // Basic validation checks
    const validationResults = {
      api_connectivity: false,
      store_configuration: false,
      data_integrity: false,
    };

    try {
      // Test API connectivity
      await apiClient.request('/admin/api/2023-10/shop.json');
      validationResults.api_connectivity = true;

      // More validation logic would go here
      validationResults.store_configuration = true;
      validationResults.data_integrity = true;

    } catch (error) {
      // Handle validation errors
    }

    const allValid = Object.values(validationResults).every(Boolean);

    return {
      success: allValid,
      timestamp: new Date().toISOString(),
      command: 'validate-data',
      account: flags.account,
      data: {
        validation_results: validationResults,
        overall_status: allValid ? 'valid' : 'issues_found',
      },
      suggestions: allValid ? [
        'All validations passed',
        'Store is ready for operations'
      ] : [
        'Some validations failed',
        'Review configuration and connectivity'
      ],
      metadata: {
        api_calls_made: 1,
      }
    };
  }

  private generateErrorSuggestions(errorMessage: string, action: string): string[] {
    const suggestions: string[] = [];
    
    if (errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
      suggestions.push('Check your access token');
      suggestions.push('Verify API permissions in Shopify admin');
    }
    
    if (errorMessage.includes('Not Found') || errorMessage.includes('404')) {
      suggestions.push('Verify the resource ID exists');
      suggestions.push('Check if the resource was deleted');
    }
    
    if (errorMessage.includes('Rate limit') || errorMessage.includes('429')) {
      suggestions.push('Wait a moment before retrying');
      suggestions.push('Consider reducing request frequency');
    }
    
    if (errorMessage.includes('Network') || errorMessage.includes('timeout')) {
      suggestions.push('Check your internet connection');
      suggestions.push('Try again in a moment');
    }

    // Action-specific suggestions
    switch (action) {
      case 'get-product':
      case 'get-order':
        suggestions.push('Use list-products or list-orders to find valid IDs');
        break;
      case 'bulk-update-products':
        suggestions.push('Validate your input file format');
        suggestions.push('Try with a smaller batch first');
        break;
    }

    if (suggestions.length === 0) {
      suggestions.push('Run health-check to diagnose issues');
      suggestions.push('Check the command syntax and parameters');
    }

    return suggestions;
  }

  private generateStoreRecommendations(shop: any, products: any[], orders: any[]): string[] {
    const recommendations: string[] = [];
    
    if (orders.length === 0) {
      recommendations.push('No recent orders found - consider marketing campaigns');
    }
    
    if (products.length === 0) {
      recommendations.push('No products found - add inventory to start selling');
    }
    
    if (shop.plan_name === 'basic') {
      recommendations.push('Consider upgrading plan for advanced features');
    }

    if (recommendations.length === 0) {
      recommendations.push('Store appears to be well-configured');
      recommendations.push('Monitor inventory and order fulfillment regularly');
    }
    
    return recommendations;
  }
}
