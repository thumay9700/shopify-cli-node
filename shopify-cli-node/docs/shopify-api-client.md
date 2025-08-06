# Shopify API Client Core

A comprehensive Node.js/TypeScript client for the Shopify Admin API that wraps both REST and GraphQL endpoints with built-in proxy support, authentication, and connection management.

## Features

- ✅ **Complete REST API Coverage** - Products, Variants, Inventory, Collections, Themes, Webhooks, Orders, and Settings
- ✅ **GraphQL Support** - Full GraphQL query execution with variables
- ✅ **Proxy Integration** - Built-in SOCKS5 proxy rotation using `us.decodo.com:10001-10010`
- ✅ **Authentication** - Automatic Shopify access token headers
- ✅ **Multi-Account Management** - Factory pattern for managing multiple Shopify stores
- ✅ **Error Handling & Retry Logic** - Automatic retries with exponential backoff
- ✅ **Rate Limit Monitoring** - Track API call limits and remaining calls
- ✅ **TypeScript Support** - Full type definitions and intellisense
- ✅ **Connection Testing** - Built-in connection validation
- ✅ **Caching** - Client instance caching for performance
- ✅ **Debug Support** - Comprehensive logging and statistics

## Installation

The Shopify API Client is part of the `shopify-cli-node` package and uses these dependencies:

- `axios` - HTTP client with proxy support
- `socks-proxy-agent` - SOCKS5 proxy agent

## Quick Start

### 1. Environment Variables Setup

```bash
export SHOPIFY_SHOP_URL="your-shop.myshopify.com"
export SHOPIFY_ACCESS_TOKEN="your-access-token"
export SHOPIFY_CLI_DEBUG="true"  # Optional: Enable debug logging
```

### 2. Basic Usage

```typescript
import { ShopifyApiFactory } from '../src/services';

// Create client from environment variables
const client = ShopifyApiFactory.createFromEnv();

// Test connection
const isConnected = await client.testConnection();
console.log(`Connected: ${isConnected}`);

// Get shop information
const shop = await client.settings.shop(['name', 'domain', 'email']);
console.log('Shop:', shop.data);

// List products
const products = await client.products.list({ limit: 10 });
console.log(`Found ${products.data.products.length} products`);
```

### 3. Configuration-Based Usage

```typescript
import { ShopifyApiFactory } from '../src/services';

// Use default account from configuration
const client = await ShopifyApiFactory.getDefaultClient();

// Or specify account by name
const client = await ShopifyApiFactory.getClient('my-store');
```

## Core API Methods

### GraphQL Queries

```typescript
const query = `
  query GetProducts($first: Int!) {
    products(first: $first) {
      edges {
        node {
          id
          title
          handle
          status
          variants(first: 1) {
            edges {
              node {
                price
                inventoryQuantity
              }
            }
          }
        }
      }
    }
  }
`;

const result = await client.graphql(query, { first: 5 });
if (result.errors) {
  console.error('GraphQL Errors:', result.errors);
} else {
  console.log('Products:', result.data.products);
}
```

### REST API Endpoints

#### Products

```typescript
// List products with filters
const products = await client.products.list({
  limit: 50,
  status: 'active',
  vendor: 'Acme Corp',
  created_at_min: '2024-01-01T00:00:00Z'
});

// Get specific product
const product = await client.products.get(123456789);

// Create product
const newProduct = await client.products.create({
  title: 'New Product',
  body_html: 'Product description',
  vendor: 'My Company',
  product_type: 'Widget'
});

// Update product
const updatedProduct = await client.products.update(123456789, {
  title: 'Updated Product Title'
});

// Delete product
await client.products.delete(123456789);

// Get product count
const count = await client.products.count({ status: 'active' });
```

#### Product Variants

```typescript
// List variants for a product
const variants = await client.variants.list(123456789);

// Get specific variant
const variant = await client.variants.get(987654321);

// Create variant
const newVariant = await client.variants.create(123456789, {
  option1: 'Small',
  price: '19.99',
  inventory_quantity: 100
});

// Update variant
await client.variants.update(987654321, {
  price: '24.99',
  inventory_quantity: 150
});
```

#### Inventory Management

```typescript
// Get inventory levels
const levels = await client.inventory.levels({
  location_ids: '123456',
  limit: 50
});

// Adjust inventory
await client.inventory.adjust(locationId, inventoryItemId, 10);

// Set inventory level
await client.inventory.set(locationId, inventoryItemId, 100);

// Connect inventory to location
await client.inventory.connect(locationId, inventoryItemId);
```

#### Collections

```typescript
// Custom collections
const customCollections = await client.collections.custom.list();
const collection = await client.collections.custom.get(123456);

// Smart collections
const smartCollections = await client.collections.smart.list();

// Collection products
const products = await client.collections.products.list(123456);
await client.collections.products.add(collectionId, productId);
```

#### Themes

```typescript
// List themes
const themes = await client.themes.list();

// Get main theme
const mainTheme = themes.data.themes.find(t => t.role === 'main');

// Theme assets
const assets = await client.themes.assets.list(themeId);
const asset = await client.themes.assets.get(themeId, 'templates/index.liquid');

// Update asset
await client.themes.assets.update(themeId, {
  key: 'templates/index.liquid',
  value: '<html>...</html>'
});
```

#### Webhooks

```typescript
// List webhooks
const webhooks = await client.webhooks.list();

// Create webhook
const webhook = await client.webhooks.create({
  topic: 'orders/create',
  address: 'https://your-app.com/webhooks/orders',
  format: 'json'
});

// Update webhook
await client.webhooks.update(webhookId, {
  address: 'https://new-endpoint.com/webhooks/orders'
});

// Delete webhook
await client.webhooks.delete(webhookId);
```

#### Orders

```typescript
// List orders with filters
const orders = await client.orders.list({
  status: 'open',
  financial_status: 'paid',
  fulfillment_status: 'unfulfilled',
  limit: 25
});

// Get specific order
const order = await client.orders.get(123456789);

// Order actions
await client.orders.close(orderId);
await client.orders.cancel(orderId, { reason: 'customer' });
```

#### Settings & Shop Information

```typescript
// Get shop information
const shop = await client.settings.shop(['name', 'email', 'domain', 'currency']);

// Get locations
const locations = await client.settings.locations();

// Get policies
const policies = await client.settings.policies();

// Get shipping zones
const shippingZones = await client.settings.shippingZones();
```

## Multi-Account Management

### Factory Methods

```typescript
// Get all configured accounts
const accountNames = await ShopifyApiFactory.getAccountNames();
console.log('Available accounts:', accountNames);

// Test all connections
const results = await ShopifyApiFactory.testAllConnections();
for (const [account, result] of results) {
  console.log(`${account}: ${result.success ? '✅' : '❌'} ${result.error || ''}`);
}

// Create clients for all accounts
const allClients = await ShopifyApiFactory.createAllClients();

// Batch operations across accounts
const shopInfo = await ShopifyApiFactory.batchOperation(
  async (client, accountName) => {
    const shop = await client.settings.shop(['name', 'domain']);
    return { name: shop.data.shop.name, domain: shop.data.shop.domain };
  }
);
```

### Account Configuration

Add accounts to your `config.yaml`:

```yaml
version: "1.0"
accounts:
  - name: "main-store"
    shopUrl: "main-store.myshopify.com"
    accessToken: "your-access-token"
    isDefault: true
  - name: "test-store"
    shopUrl: "test-store.myshopify.com"
    accessToken: "test-access-token"
settings:
  debug: true
  logLevel: "info"
```

## Proxy Configuration

The client automatically uses the configured proxy settings from `us.decodo.com:10001-10010`:

```typescript
// Custom proxy configuration
const client = new ShopifyApiClient({
  shopUrl: 'shop.myshopify.com',
  accessToken: 'token',
  proxyConfig: {
    host: 'custom-proxy.com',
    portRange: { start: 8001, end: 8010 },
    maxRetries: 5,
    retryDelay: 2000
  }
});

// Get proxy statistics
const stats = client.getProxyStats();
console.log('Proxy Stats:', stats);

// Reset proxy statistics
client.resetProxyStats();
```

## Error Handling

```typescript
try {
  const products = await client.products.list();
  console.log('Success:', products.data);
} catch (error) {
  console.error('API Error:', error.message);
  
  // Check proxy statistics for debugging
  const stats = client.getProxyStats();
  const failedProxies = stats.filter(s => !s.isHealthy);
  console.log('Failed proxies:', failedProxies.length);
}
```

## Rate Limit Monitoring

```typescript
// Make API call
const products = await client.products.list({ limit: 10 });

// Check rate limits
const rateLimits = client.getRateLimitInfo();
console.log('API Calls Made:', rateLimits.callsMade);
console.log('API Calls Remaining:', rateLimits.callsRemaining);
console.log('Call Limit:', rateLimits.callLimit);
```

## Debug Mode

Enable debug mode for detailed logging:

```bash
export SHOPIFY_CLI_DEBUG="true"
```

This will log:
- 🔗 API Request details (method, URL)
- ✅ Successful API responses (status, URL)
- ❌ API errors
- 📊 Proxy usage statistics

## Factory Status

Get comprehensive status information:

```typescript
const status = await ShopifyApiFactory.getStatus();
console.log('Status:', {
  configLoaded: status.configLoaded,
  totalAccounts: status.totalAccounts,
  accountsWithTokens: status.accountsWithTokens,
  defaultAccount: status.defaultAccount,
  cachedClients: status.cachedClients
});
```

## TypeScript Support

The client is fully typed with TypeScript interfaces:

```typescript
import { 
  ShopifyApiClient, 
  ShopifyApiClientConfig,
  GraphQLResponse,
  RestResponse 
} from '../src/services';

const config: ShopifyApiClientConfig = {
  shopUrl: 'shop.myshopify.com',
  accessToken: 'token',
  apiVersion: '2024-01',
  timeout: 30000,
  proxyConfig: {
    host: 'proxy.example.com',
    portRange: { start: 10001, end: 10010 }
  }
};

// GraphQL response typing
interface ProductQuery {
  products: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        handle: string;
      };
    }>;
  };
}

const result: GraphQLResponse<ProductQuery> = await client.graphql(query);
```

## Testing

Run the test suite:

```bash
npm test
```

Test specific components:

```bash
npm test -- --grep "ShopifyApiClient"
npm test -- --grep "ShopifyApiFactory"
```

## Examples

See comprehensive examples in:
- `examples/shopify-api-client-usage.ts` - Complete usage examples
- `test/services/shopify-api-client.test.ts` - Test cases and patterns

Run examples:

```bash
npm run build
node dist/examples/shopify-api-client-usage.js
```

## Advanced Usage

### Custom HTTP Configuration

```typescript
const client = new ShopifyApiClient({
  shopUrl: 'shop.myshopify.com',
  accessToken: 'token',
  timeout: 60000,
  retries: 5,
  retryDelay: 2000,
  proxyConfig: {
    host: 'custom.proxy.com',
    portRange: { start: 9000, end: 9010 },
    maxRetries: 3
  }
});
```

### Connection Pooling

```typescript
// Cache clients for reuse
const client1 = await ShopifyApiFactory.getClient('store1');
const client2 = await ShopifyApiFactory.getClient('store2');

// Same clients returned from cache
const cachedClient1 = await ShopifyApiFactory.getClient('store1');
console.log(client1 === cachedClient1); // true

// Clear cache when needed
ShopifyApiFactory.clearCache();
```

### Batch Processing

```typescript
// Process multiple accounts concurrently
const results = await ShopifyApiFactory.batchOperation(
  async (client, accountName) => {
    const products = await client.products.count();
    const orders = await client.orders.count();
    return { products: products.data.count, orders: orders.data.count };
  },
  ['store1', 'store2', 'store3'] // Optional: specific accounts
);

for (const [account, result] of results) {
  if (result.success) {
    console.log(`${account}: ${result.data.products} products, ${result.data.orders} orders`);
  }
}
```

## API Reference

For complete API documentation, see the TypeScript interfaces in:
- `src/services/shopify-api-client.ts`
- `src/services/shopify-api-factory.ts`

## Contributing

1. Add new API endpoints to the appropriate sections in `ShopifyApiClient`
2. Update tests in `test/services/shopify-api-client.test.ts`
3. Add usage examples to `examples/shopify-api-client-usage.ts`
4. Update this documentation

## License

MIT License - See the main project LICENSE file.
