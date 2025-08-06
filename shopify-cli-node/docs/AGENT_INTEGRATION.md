# Agent Integration Guide

This guide shows how AI agents like Claude, Cursor, GitHub Copilot, and other agentic coding tools can effectively use your Shopify CLI Management Tool.

## Overview

The Shopify CLI has been enhanced with agent-friendly features:

- **Structured JSON responses** with consistent schema
- **Error handling with suggestions** for recovery
- **Programmatic SDK** for easy integration
- **Agent-specific formatting** for different AI tools
- **Batch operations** with rate limiting
- **Metadata** for performance tracking

## Quick Start for Agents

### Method 1: Direct CLI Usage (Recommended)

```bash
# Agent-friendly interface with structured responses
./bin/run.js agent --action get-store-info --format agent-json

# List products with metadata
./bin/run.js agent --action list-products --limit 10 --format agent-json

# Analyze store performance  
./bin/run.js agent --action analyze-store --format agent-json

# Check inventory issues
./bin/run.js agent --action check-inventory --format agent-json
```

### Method 2: SDK Integration

```javascript
import { ShopifyAgentSDK } from './src/lib/agent-sdk.js';

const shopify = new ShopifyAgentSDK({
  cliPath: '/path/to/cli',
  account: 'production',
  debug: true
});

// Get store information
const storeInfo = await shopify.getStoreInfo();

// List products with filters
const products = await shopify.listProducts({
  limit: 20,
  status: 'active',
  fields: ['id', 'title', 'status']
});

// Analyze store
const analysis = await shopify.analyzeStore();
```

## Response Schema

All agent responses follow this structured format:

```json
{
  "success": boolean,
  "timestamp": "2024-01-15T10:30:00Z",
  "command": "action-name",
  "account": "account-name",
  "data": {
    // Action-specific data
  },
  "error": "error message if failed",
  "suggestions": [
    "Human-readable suggestions for next steps"
  ],
  "next_actions": [
    "Specific CLI commands to run next"
  ],
  "metadata": {
    "total_items": 10,
    "has_more": true,
    "api_calls_made": 1,
    "execution_time_ms": 1250
  }
}
```

## Available Actions for Agents

### 1. Store Information
```bash
./bin/run.js agent --action get-store-info
```
Returns: Store details, plan info, currency, timezone

### 2. Product Management
```bash
# List products
./bin/run.js agent --action list-products --limit 20 --status active

# Get specific product
./bin/run.js agent --action get-product --id 123456789

# Check inventory
./bin/run.js agent --action check-inventory --limit 50
```

### 3. Order Management
```bash
# List orders
./bin/run.js agent --action list-orders --limit 10 --since "2024-01-01T00:00:00Z"

# Get specific order
./bin/run.js agent --action get-order --id 987654321
```

### 4. Analytics & Insights
```bash
# Store analysis
./bin/run.js agent --action analyze-store

# Validate data integrity
./bin/run.js agent --action validate-data

# System health check
./bin/run.js agent --action health-check
```

### 5. Customer Data
```bash
# List customers
./bin/run.js agent --action list-customers --limit 25
```

### 6. Bulk Operations
```bash
# Bulk update products (with dry-run)
./bin/run.js agent --action bulk-update-products --file products.json --dry-run
```

## Agent-Specific Examples

### For Claude (Anthropic)

Claude works best with the structured markdown format:

```javascript
import { ShopifyAgentSDK } from './src/lib/agent-sdk.js';

const shopify = new ShopifyAgentSDK({ account: 'production' });
const response = await shopify.analyzeStore();

// Format for Claude
const claudeFormat = ShopifyAgentSDK.formatForAgent(response, 'claude');
console.log(claudeFormat);
```

Output for Claude:
```markdown
# Shopify CLI Response

**Command:** analyze-store
**Status:** ✅ Success
**Timestamp:** 2024-01-15T10:30:00Z

## Data
```json
{
  "store_overview": {
    "name": "My Store",
    "plan": "shopify",
    "currency": "USD"
  },
  "metrics": {
    "total_products": "estimated_1000+",
    "recent_orders_count": 15,
    "total_revenue_recent": "1250.00",
    "average_order_value": "83.33"
  }
}
```

## Suggestions
- Use list-products --limit 50 to see more inventory
- Use check-inventory to identify low stock items
- Use get-analytics for detailed performance metrics
```

### For Cursor

Cursor prefers concise summaries with full data:

```javascript
const response = await shopify.listProducts({ limit: 10 });
const cursorFormat = ShopifyAgentSDK.formatForAgent(response, 'cursor');
```

Output for Cursor:
```javascript
// Shopify CLI Response Summary
{
  "success": true,
  "command": "list-products",
  "timestamp": "2024-01-15T10:30:00Z",
  "data_keys": ["products"],
  "suggestions": 3,
  "error": null
}

// Full Response
{...full response data...}
```

### For GitHub Copilot

Copilot works well with commented code examples:

```javascript
const response = await shopify.getStoreInfo();
const copilotFormat = ShopifyAgentSDK.formatForAgent(response, 'copilot');
```

Output for GitHub Copilot:
```javascript
/*
Shopify CLI Response
====================
Command: get-store-info
Success: true
Timestamp: 2024-01-15T10:30:00Z

Usage in code:
// Use list-products to see store inventory
// Use list-orders to check recent sales
// Use analyze-store for detailed insights
*/

{...response data...}
```

## Common Agent Tasks

### 1. Store Health Check

```javascript
// Check if store is operational
const health = await shopify.healthCheck();

if (health.success && health.data.overall_status === 'healthy') {
  console.log('Store is operational');
  
  // Get basic metrics
  const analysis = await shopify.analyzeStore();
  console.log(`Recent orders: ${analysis.data.metrics.recent_orders_count}`);
} else {
  console.log('Store has issues:', health.error);
}
```

### 2. Inventory Management

```javascript
// Find low stock products
const inventory = await shopify.checkInventory({ limit: 100 });

if (inventory.data.alerts.low_stock.length > 0) {
  console.log(`Found ${inventory.data.alerts.low_stock.length} low stock items`);
  
  // Create restock file for bulk update
  const restockUpdates = inventory.data.alerts.low_stock.map(item => ({
    id: item.variant_id,
    inventory_quantity: 50 // Restock to 50 units
  }));
  
  const updateFile = await shopify.createProductUpdateFile(restockUpdates);
  console.log(`Created restock file: ${updateFile}`);
  
  // Preview the changes
  const preview = await shopify.bulkUpdateProducts(updateFile, { dryRun: true });
  console.log('Restock preview:', preview.data);
}
```

### 3. Sales Analysis

```javascript
// Get recent order data
const orders = await shopify.listOrders({
  limit: 50,
  since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // Last 7 days
});

// Calculate metrics
const totalRevenue = orders.data.orders.reduce((sum, order) => 
  sum + parseFloat(order.total_price), 0
);

const avgOrderValue = totalRevenue / orders.data.orders.length;

console.log(`Last 7 days: ${orders.data.orders.length} orders, $${totalRevenue.toFixed(2)} revenue`);
console.log(`Average order value: $${avgOrderValue.toFixed(2)}`);
```

### 4. Product Search and Update

```javascript
// Search for specific products
const searchResults = await shopify.searchProducts('t-shirt', { limit: 20 });

// Filter products that need price updates
const productsToUpdate = searchResults.data.products
  .filter(product => product.status === 'active')
  .map(product => ({
    id: product.id,
    title: product.title + ' - Updated',
    tags: [...product.tags, 'updated']
  }));

if (productsToUpdate.length > 0) {
  // Create update file
  const updateFile = await shopify.createProductUpdateFile(productsToUpdate);
  
  // Preview changes first
  await shopify.bulkUpdateProducts(updateFile, { dryRun: true });
}
```

### 5. Batch Operations with Rate Limiting

```javascript
// Process multiple operations safely
const productIds = ['123', '456', '789', '012'];

const products = await shopify.batchOperation(
  productIds.map(id => () => shopify.getProduct(id)),
  {
    concurrency: 2, // Max 2 concurrent requests
    delay: 1000     // 1 second delay between batches
  }
);

console.log(`Retrieved ${products.length} products`);
```

## Error Handling for Agents

```javascript
try {
  const response = await shopify.getProduct('invalid-id');
} catch (error) {
  // Error responses are structured too
  const errorResponse = JSON.parse(error.message);
  
  console.log('Error:', errorResponse.error);
  console.log('Suggestions:', errorResponse.suggestions);
  
  // Follow suggestions
  if (errorResponse.suggestions.includes('Use list-products to find valid IDs')) {
    const products = await shopify.listProducts({ limit: 5 });
    const validId = products.data.products[0].id;
    const retryResponse = await shopify.getProduct(validId);
  }
}
```

## Advanced Agent Patterns

### 1. Smart Retry with Exponential Backoff

```javascript
async function retryWithBackoff(operation, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      const errorData = JSON.parse(error.message);
      
      if (errorData.error?.includes('Rate limit')) {
        const delay = Math.pow(2, i) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
  
  throw new Error('Max retries exceeded');
}

// Usage
const products = await retryWithBackoff(() => 
  shopify.listProducts({ limit: 100 })
);
```

### 2. Data Pipeline for Analysis

```javascript
class ShopifyAnalyticsPipeline {
  constructor(sdk) {
    this.shopify = sdk;
  }
  
  async generateReport() {
    // Gather data
    const [store, products, orders, inventory] = await Promise.all([
      this.shopify.getStoreInfo(),
      this.shopify.listProducts({ limit: 100 }),
      this.shopify.listOrders({ limit: 50 }),
      this.shopify.checkInventory({ limit: 100 })
    ]);
    
    // Process data
    const report = {
      store_info: store.data.store,
      product_count: products.data.products.length,
      recent_orders: orders.data.orders.length,
      low_stock_alerts: inventory.data.alerts.low_stock.length,
      recommendations: this.generateRecommendations(products, orders, inventory)
    };
    
    return report;
  }
  
  generateRecommendations(products, orders, inventory) {
    const recommendations = [];
    
    if (inventory.data.alerts.low_stock.length > 5) {
      recommendations.push('High number of low stock items - review inventory management');
    }
    
    if (orders.data.orders.length === 0) {
      recommendations.push('No recent orders - consider marketing campaigns');
    }
    
    return recommendations;
  }
}

// Usage
const pipeline = new ShopifyAnalyticsPipeline(shopify);
const report = await pipeline.generateReport();
```

### 3. Automated Store Maintenance

```javascript
class StoreMaintenanceAgent {
  constructor(sdk) {
    this.shopify = sdk;
  }
  
  async runMaintenance() {
    console.log('🔍 Running store maintenance...');
    
    // Health check first
    const health = await this.shopify.healthCheck();
    if (!health.success) {
      throw new Error(`Store unhealthy: ${health.error}`);
    }
    
    // Check inventory issues
    const inventory = await this.shopify.checkInventory();
    if (inventory.data.alerts.low_stock.length > 0) {
      console.log(`⚠️  Found ${inventory.data.alerts.low_stock.length} low stock items`);
      // Could automatically create restock orders
    }
    
    // Validate data integrity
    const validation = await this.shopify.validateData();
    if (!validation.success) {
      console.log('❌ Data validation failed:', validation.data);
    }
    
    // Generate maintenance report
    return {
      timestamp: new Date().toISOString(),
      health_status: health.data.overall_status,
      low_stock_count: inventory.data.alerts.low_stock.length,
      validation_passed: validation.success,
      recommendations: [
        ...health.suggestions || [],
        ...inventory.suggestions || [],
        ...validation.suggestions || []
      ]
    };
  }
}
```

## Best Practices for Agents

### 1. **Always Check Health First**
```javascript
const health = await shopify.healthCheck();
if (!health.success) {
  // Handle connectivity issues before proceeding
}
```

### 2. **Use Structured Error Handling**
```javascript
// Errors include actionable suggestions
if (!response.success) {
  console.log('Suggestions:', response.suggestions);
  // Follow the suggestions programmatically
}
```

### 3. **Respect Rate Limits**
```javascript
// Use batch operations for multiple requests
const results = await shopify.batchOperation(operations, {
  concurrency: 2,
  delay: 1000
});
```

### 4. **Filter Data for Efficiency**
```javascript
// Request only needed fields
const products = await shopify.listProducts({
  fields: ['id', 'title', 'status'],
  limit: 50
});

// Or filter after receiving
const filtered = ShopifyAgentSDK.filterResponseData(response, ['id', 'title']);
```

### 5. **Use Dry-Run for Testing**
```javascript
// Always test bulk operations first
const preview = await shopify.bulkUpdateProducts(file, { dryRun: true });
if (preview.success) {
  // Proceed with actual update
  const update = await shopify.bulkUpdateProducts(file, { dryRun: false });
}
```

## Integration Examples

### Cursor Integration

Create a `.cursorrules` file in your project:

```yaml
# Shopify CLI Agent Integration
shopify_cli_path: "./bin/run.js"

# Quick commands for Cursor
commands:
  - name: "Check Store Health"
    cmd: "node ./bin/run.js agent --action health-check --format agent-json"
  
  - name: "List Recent Products"
    cmd: "node ./bin/run.js agent --action list-products --limit 10 --format agent-json"
  
  - name: "Analyze Store"
    cmd: "node ./bin/run.js agent --action analyze-store --format agent-json"

# Code completion helpers
snippets:
  shopify_sdk: |
    import { ShopifyAgentSDK } from './src/lib/agent-sdk.js';
    const shopify = new ShopifyAgentSDK({ account: 'production' });
```

### VS Code Integration

Create `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Shopify: Health Check",
      "type": "shell",
      "command": "./bin/run.js",
      "args": ["agent", "--action", "health-check", "--format", "agent-json"],
      "group": "test",
      "presentation": {
        "reveal": "always",
        "panel": "new"
      }
    },
    {
      "label": "Shopify: Analyze Store", 
      "type": "shell",
      "command": "./bin/run.js",
      "args": ["agent", "--action", "analyze-store", "--format", "agent-json"],
      "group": "test"
    }
  ]
}
```

## Conclusion

This agent-friendly design makes your Shopify CLI tool easily accessible to AI coding agents, enabling:

- **Automated store monitoring and maintenance**
- **Intelligent inventory management**
- **Data-driven business insights**
- **Bulk operations with safety checks**
- **Integration into existing AI workflows**

The structured responses, error handling, and SDK make it simple for agents to understand the context, handle errors gracefully, and take appropriate next actions.
