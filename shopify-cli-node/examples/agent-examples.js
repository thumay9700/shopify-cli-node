/**
 * Shopify CLI Agent Examples
 * Practical examples showing how AI agents can use the Shopify CLI
 */

import { ShopifyAgentSDK } from '../src/lib/agent-sdk.js';

// Initialize the SDK
const shopify = new ShopifyAgentSDK({
  cliPath: './bin/run.js',
  account: 'production', // or 'staging'
  debug: true
});

/**
 * Example 1: Store Health Monitoring Agent
 */
class StoreHealthAgent {
  constructor(sdk) {
    this.shopify = sdk;
  }

  async runHealthCheck() {
    console.log('🏥 Running comprehensive store health check...\n');

    // Step 1: Basic connectivity
    const health = await this.shopify.healthCheck();
    console.log('1. Health Check:', health.success ? '✅' : '❌');
    
    if (!health.success) {
      console.log('   Error:', health.error);
      console.log('   Suggestions:', health.suggestions.join('\n   - '));
      return health;
    }

    // Step 2: Store analysis
    const analysis = await this.shopify.analyzeStore();
    console.log('2. Store Analysis:', analysis.success ? '✅' : '❌');
    
    if (analysis.success) {
      console.log(`   Store: ${analysis.data.store_overview.name}`);
      console.log(`   Plan: ${analysis.data.store_overview.plan}`);
      console.log(`   Recent Orders: ${analysis.data.metrics.recent_orders_count}`);
      console.log(`   Revenue: ${analysis.data.metrics.currency} ${analysis.data.metrics.total_revenue_recent}`);
    }

    // Step 3: Inventory check
    const inventory = await this.shopify.checkInventory({ limit: 100 });
    console.log('3. Inventory Check:', inventory.success ? '✅' : '❌');
    
    if (inventory.success) {
      const lowStock = inventory.data.alerts.low_stock.length;
      console.log(`   Low Stock Items: ${lowStock}`);
      
      if (lowStock > 0) {
        console.log('   ⚠️  Items needing attention:');
        inventory.data.alerts.low_stock.slice(0, 3).forEach(item => {
          console.log(`      - ${item.product_title}: ${item.current_stock} remaining`);
        });
      }
    }

    // Step 4: Data validation
    const validation = await this.shopify.validateData();
    console.log('4. Data Validation:', validation.success ? '✅' : '❌');

    // Summary report
    return {
      timestamp: new Date().toISOString(),
      overall_health: health.success && analysis.success && inventory.success && validation.success,
      issues_found: [
        ...(!health.success ? ['API connectivity issues'] : []),
        ...(!analysis.success ? ['Store analysis failed'] : []),
        ...(inventory.data?.alerts?.low_stock?.length > 0 ? [`${inventory.data.alerts.low_stock.length} low stock items`] : []),
        ...(!validation.success ? ['Data validation failed'] : [])
      ],
      recommendations: [
        ...(health.suggestions || []),
        ...(analysis.suggestions || []),
        ...(inventory.suggestions || []),
        ...(validation.suggestions || [])
      ]
    };
  }
}

/**
 * Example 2: Smart Inventory Management Agent
 */
class InventoryAgent {
  constructor(sdk) {
    this.shopify = sdk;
  }

  async manageInventory(options = { restockThreshold: 10, restockAmount: 50 }) {
    console.log('📦 Running intelligent inventory management...\n');

    // Get current inventory status
    const inventory = await this.shopify.checkInventory({ limit: 200 });
    
    if (!inventory.success) {
      console.log('❌ Failed to check inventory:', inventory.error);
      return inventory;
    }

    const lowStockItems = inventory.data.alerts.low_stock;
    console.log(`Found ${lowStockItems.length} items below threshold (${options.restockThreshold})`);

    if (lowStockItems.length === 0) {
      console.log('✅ All inventory levels are healthy!');
      return { success: true, action: 'no_action_needed', items_processed: 0 };
    }

    // Analyze which items need restocking
    const restockList = lowStockItems.map(item => ({
      id: item.variant_id,
      product_title: item.product_title,
      current_stock: item.current_stock,
      suggested_restock: Math.max(options.restockAmount, item.current_stock * 5), // Smart restock amount
      inventory_quantity: options.restockAmount
    }));

    console.log('\n📋 Proposed restock plan:');
    restockList.slice(0, 10).forEach(item => {
      console.log(`   ${item.product_title}: ${item.current_stock} → ${item.suggested_restock}`);
    });

    // Create restock file
    const restockFile = await this.shopify.createProductUpdateFile(
      restockList.map(item => ({
        id: item.id,
        inventory_quantity: item.suggested_restock
      }))
    );

    console.log(`\n📄 Created restock file: ${restockFile}`);

    // Preview the changes first
    const preview = await this.shopify.bulkUpdateProducts(restockFile, { dryRun: true });
    
    if (preview.success) {
      console.log('✅ Restock plan validated successfully');
      console.log('   Use the following command to execute:');
      console.log(`   ./bin/run.js agent --action bulk-update-products --file ${restockFile}`);
    }

    return {
      success: true,
      action: 'restock_plan_created',
      items_to_restock: restockList.length,
      restock_file: restockFile,
      preview_result: preview
    };
  }

  async identifyTrendingProducts() {
    console.log('📈 Analyzing product trends...\n');

    // Get recent orders to identify trending products
    const orders = await this.shopify.listOrders({ 
      limit: 100, 
      since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // Last 30 days
    });

    if (!orders.success) {
      console.log('❌ Failed to fetch orders:', orders.error);
      return orders;
    }

    // Analyze product performance (this would be more complex with full order details)
    const productSales = new Map();
    
    orders.data.orders.forEach(order => {
      // In a real scenario, you'd get line items from individual orders
      console.log(`Order ${order.name}: ${order.total_price} ${order.currency}`);
    });

    console.log(`✅ Analyzed ${orders.data.orders.length} orders from last 30 days`);

    return {
      success: true,
      orders_analyzed: orders.data.orders.length,
      trending_products: [], // Would contain actual trending analysis
      recommendations: [
        'Consider increasing inventory for trending products',
        'Monitor conversion rates for top performers',
        'Review pricing strategy for high-volume items'
      ]
    };
  }
}

/**
 * Example 3: Sales Analysis Agent
 */
class SalesAnalyticsAgent {
  constructor(sdk) {
    this.shopify = sdk;
  }

  async generateSalesReport(days = 30) {
    console.log(`📊 Generating sales report for last ${days} days...\n`);

    // Get store info
    const storeInfo = await this.shopify.getStoreInfo();
    if (!storeInfo.success) return storeInfo;

    // Get recent orders
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const orders = await this.shopify.listOrders({ limit: 100, since });
    
    if (!orders.success) return orders;

    // Calculate metrics
    const metrics = this.calculateSalesMetrics(orders.data.orders);

    // Get top products (would need individual order details for accuracy)
    const products = await this.shopify.listProducts({ limit: 50, status: 'active' });

    // Generate report
    const report = {
      store_name: storeInfo.data.store.name,
      currency: storeInfo.data.store.currency,
      report_period: `${days} days`,
      generated_at: new Date().toISOString(),
      metrics,
      product_count: products.success ? products.data.products.length : 'N/A',
      recommendations: this.generateSalesRecommendations(metrics, days)
    };

    console.log('📈 Sales Report Generated:');
    console.log(`   Store: ${report.store_name}`);
    console.log(`   Period: Last ${days} days`);
    console.log(`   Total Orders: ${metrics.total_orders}`);
    console.log(`   Total Revenue: ${report.currency} ${metrics.total_revenue.toFixed(2)}`);
    console.log(`   Average Order Value: ${report.currency} ${metrics.average_order_value.toFixed(2)}`);
    console.log(`   Orders per Day: ${metrics.orders_per_day.toFixed(1)}`);

    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach(rec => console.log(`   - ${rec}`));
    }

    return { success: true, report };
  }

  calculateSalesMetrics(orders) {
    const totalRevenue = orders.reduce((sum, order) => 
      sum + parseFloat(order.total_price || 0), 0
    );

    return {
      total_orders: orders.length,
      total_revenue: totalRevenue,
      average_order_value: orders.length > 0 ? totalRevenue / orders.length : 0,
      orders_per_day: orders.length > 0 ? orders.length / 30 : 0, // Assuming 30 day period
      highest_order: Math.max(...orders.map(o => parseFloat(o.total_price || 0))),
      payment_methods: [...new Set(orders.map(o => o.financial_status))],
    };
  }

  generateSalesRecommendations(metrics, days) {
    const recommendations = [];

    if (metrics.total_orders === 0) {
      recommendations.push('No orders in the analysis period - focus on marketing and customer acquisition');
    }

    if (metrics.average_order_value < 50) {
      recommendations.push('Consider implementing upselling strategies to increase average order value');
    }

    if (metrics.orders_per_day < 1) {
      recommendations.push('Low daily order volume - review marketing campaigns and website conversion');
    }

    if (metrics.total_orders > 0 && metrics.orders_per_day > 5) {
      recommendations.push('Good order volume - focus on customer retention and repeat purchases');
    }

    return recommendations;
  }
}

/**
 * Example 4: Customer Service Agent
 */
class CustomerServiceAgent {
  constructor(sdk) {
    this.shopify = sdk;
  }

  async handleCustomerInquiry(customerId, inquiryType = 'order_status') {
    console.log(`🎧 Handling customer inquiry: ${inquiryType} for customer ${customerId}\n`);

    try {
      // Get customer information
      const customers = await this.shopify.listCustomers({ limit: 50 });
      
      if (!customers.success) {
        return { success: false, error: 'Unable to fetch customer data' };
      }

      const customer = customers.data.customers.find(c => c.id.toString() === customerId.toString());
      
      if (!customer) {
        return { success: false, error: 'Customer not found' };
      }

      console.log(`Customer: ${customer.first_name} ${customer.last_name} (${customer.email})`);
      console.log(`Total Orders: ${customer.orders_count}`);
      console.log(`Total Spent: $${customer.total_spent}`);

      // Get customer's recent orders
      const orders = await this.shopify.listOrders({ limit: 10 });
      const customerOrders = orders.success ? 
        orders.data.orders.filter(o => o.email === customer.email) : [];

      console.log(`\nRecent Orders (${customerOrders.length}):`);
      customerOrders.slice(0, 3).forEach(order => {
        console.log(`   Order ${order.name}: ${order.financial_status} - $${order.total_price}`);
      });

      // Generate response based on inquiry type
      const response = this.generateCustomerResponse(customer, customerOrders, inquiryType);

      return {
        success: true,
        customer,
        recent_orders: customerOrders,
        response,
        suggested_actions: this.getSuggestedActions(customer, customerOrders, inquiryType)
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  generateCustomerResponse(customer, orders, inquiryType) {
    switch (inquiryType) {
      case 'order_status':
        if (orders.length === 0) {
          return 'This customer has no recent orders in our system.';
        }
        const latestOrder = orders[0];
        return `Customer's most recent order ${latestOrder.name} is ${latestOrder.financial_status} and ${latestOrder.fulfillment_status || 'pending fulfillment'}.`;

      case 'refund_request':
        return `Customer ${customer.first_name} has spent $${customer.total_spent} across ${customer.orders_count} orders. Review recent order for refund eligibility.`;

      case 'product_inquiry':
        return `Long-time customer with ${customer.orders_count} orders. Provide detailed product information and consider offering loyalty discount.`;

      default:
        return `Customer information retrieved. ${customer.orders_count} total orders, last order ${orders[0]?.created_at || 'N/A'}.`;
    }
  }

  getSuggestedActions(customer, orders, inquiryType) {
    const actions = [];

    if (parseFloat(customer.total_spent) > 500) {
      actions.push('Consider offering VIP customer benefits');
    }

    if (orders.length > 0 && orders[0].financial_status !== 'paid') {
      actions.push('Follow up on payment status for recent order');
    }

    if (customer.orders_count === 1) {
      actions.push('First-time customer - provide excellent service to encourage return');
    }

    return actions;
  }
}

/**
 * Example 5: Automated Store Maintenance Agent
 */
class MaintenanceAgent {
  constructor(sdk) {
    this.shopify = sdk;
  }

  async runDailyMaintenance() {
    console.log('🔧 Running daily store maintenance tasks...\n');

    const tasks = [];

    try {
      // Task 1: Health check
      console.log('1. 🏥 Running health check...');
      const health = await this.shopify.healthCheck();
      tasks.push({ task: 'health_check', success: health.success, details: health.data });

      // Task 2: Inventory audit
      console.log('2. 📦 Auditing inventory...');
      const inventory = await this.shopify.checkInventory({ limit: 500 });
      const lowStockCount = inventory.success ? inventory.data.alerts.low_stock.length : 0;
      tasks.push({ task: 'inventory_audit', success: inventory.success, low_stock_items: lowStockCount });

      // Task 3: Data validation
      console.log('3. 🔍 Validating data integrity...');
      const validation = await this.shopify.validateData();
      tasks.push({ task: 'data_validation', success: validation.success, details: validation.data });

      // Task 4: Performance analysis
      console.log('4. 📊 Analyzing store performance...');
      const analysis = await this.shopify.analyzeStore();
      tasks.push({ task: 'performance_analysis', success: analysis.success, 
        metrics: analysis.success ? analysis.data.metrics : null });

      // Generate maintenance report
      const report = {
        date: new Date().toISOString().split('T')[0],
        tasks_completed: tasks.length,
        tasks_successful: tasks.filter(t => t.success).length,
        issues_found: tasks.filter(t => !t.success),
        summary: {
          overall_health: tasks.every(t => t.success),
          low_stock_alerts: lowStockCount,
          recommendations: this.generateMaintenanceRecommendations(tasks)
        }
      };

      console.log('\n📋 Daily Maintenance Report:');
      console.log(`   Date: ${report.date}`);
      console.log(`   Tasks Completed: ${report.tasks_completed}/${report.tasks_completed}`);
      console.log(`   Overall Health: ${report.summary.overall_health ? '✅ Good' : '⚠️ Issues Found'}`);
      console.log(`   Low Stock Alerts: ${report.summary.low_stock_alerts}`);

      if (report.summary.recommendations.length > 0) {
        console.log('\n🎯 Recommended Actions:');
        report.summary.recommendations.forEach(rec => console.log(`   - ${rec}`));
      }

      return { success: true, report };

    } catch (error) {
      console.log(`❌ Maintenance failed: ${error.message}`);
      return { success: false, error: error.message, completed_tasks: tasks };
    }
  }

  generateMaintenanceRecommendations(tasks) {
    const recommendations = [];

    const failedTasks = tasks.filter(t => !t.success);
    if (failedTasks.length > 0) {
      recommendations.push(`${failedTasks.length} maintenance tasks failed - investigate immediately`);
    }

    const inventoryTask = tasks.find(t => t.task === 'inventory_audit');
    if (inventoryTask && inventoryTask.low_stock_items > 10) {
      recommendations.push('High number of low stock items - schedule inventory replenishment');
    }

    if (recommendations.length === 0) {
      recommendations.push('All maintenance tasks completed successfully');
    }

    return recommendations;
  }
}

// Example usage functions
async function runExamples() {
  console.log('🤖 Shopify CLI Agent Examples\n');
  console.log('=' .repeat(50));

  try {
    // Example 1: Store Health Check
    console.log('\n🔹 Example 1: Store Health Monitoring');
    const healthAgent = new StoreHealthAgent(shopify);
    const healthReport = await healthAgent.runHealthCheck();
    console.log('Health Report Generated:', healthReport.overall_health ? '✅' : '⚠️');

    // Example 2: Inventory Management
    console.log('\n🔹 Example 2: Smart Inventory Management');
    const inventoryAgent = new InventoryAgent(shopify);
    const inventoryResult = await inventoryAgent.manageInventory();
    console.log('Inventory Management Result:', inventoryResult.success ? '✅' : '❌');

    // Example 3: Sales Analytics
    console.log('\n🔹 Example 3: Sales Analytics');
    const analyticsAgent = new SalesAnalyticsAgent(shopify);
    const salesReport = await analyticsAgent.generateSalesReport(30);
    console.log('Sales Report Generated:', salesReport.success ? '✅' : '❌');

    // Example 4: Customer Service
    console.log('\n🔹 Example 4: Customer Service');
    const customerAgent = new CustomerServiceAgent(shopify);
    // Note: This would need a real customer ID
    // const customerResult = await customerAgent.handleCustomerInquiry('123456', 'order_status');

    // Example 5: Daily Maintenance
    console.log('\n🔹 Example 5: Automated Maintenance');
    const maintenanceAgent = new MaintenanceAgent(shopify);
    const maintenanceResult = await maintenanceAgent.runDailyMaintenance();
    console.log('Maintenance Completed:', maintenanceResult.success ? '✅' : '❌');

  } catch (error) {
    console.error('Example execution failed:', error);
  }
}

// Export for use in other modules
export {
  StoreHealthAgent,
  InventoryAgent,
  SalesAnalyticsAgent,
  CustomerServiceAgent,
  MaintenanceAgent,
  runExamples
};

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExamples();
}
