# Decodo Geolocation Service

The Geolocation Service provides a robust interface to Decodo's geolocation API with built-in proxy rotation, caching, and error handling capabilities.

## Features

- **Proxy Rotation**: Automatically rotates through available Decodo proxy ports (10001-10010)
- **Per-Account Caching**: Caches responses separately for each Shopify account to avoid excessive API calls
- **Batch Processing**: Support for processing multiple geolocation requests efficiently
- **Error Handling**: Graceful error handling with retry logic
- **Health Monitoring**: Built-in health check functionality
- **Flexible Configuration**: Configurable cache expiration, size limits, and proxy settings

## Quick Start

### Basic Usage

```typescript
import { GeolocationServiceFactory } from 'shopify-cli-node';
import { loadConfig } from 'shopify-cli-node';

// Load your Shopify CLI configuration
const config = await loadConfig();

// Create a geolocation service instance
const geolocationService = GeolocationServiceFactory.create(config, {
  cacheExpirationMs: 24 * 60 * 60 * 1000, // 24 hours
  maxCacheSize: 1000,
  enableCache: true
});

// Get the default account
const account = config.accounts.find(acc => acc.isDefault) || config.accounts[0];

// Perform a geolocation lookup
const result = await geolocationService.getGeolocation(account, {
  ip: '8.8.8.8'
});

console.log(`Location: ${result.city}, ${result.country}`);
```

### Environment Configuration

```typescript
import { GeolocationServiceFactory } from 'shopify-cli-node';

// Set environment variables
process.env.DECODO_API_ENDPOINT = 'https://us.decodo.com:10001';
process.env.DECODO_API_KEY = 'your-api-key';
process.env.DECODO_API_TIMEOUT = '30000';

// Create service from environment
const service = GeolocationServiceFactory.createFromEnv({
  enableCache: true,
  cacheExpirationMs: 12 * 60 * 60 * 1000 // 12 hours
});
```

## API Reference

### GeolocationService

#### Constructor

```typescript
constructor(config: GeolocationServiceConfig)
```

- `config.decodoApi`: Decodo API credentials and configuration
- `config.proxyManager`: ProxyManager instance for handling proxy rotation
- `config.cacheExpirationMs`: Cache expiration time in milliseconds (default: 24 hours)
- `config.maxCacheSize`: Maximum cache entries per account (default: 1000)
- `config.enableCache`: Whether to enable caching (default: true)

#### Methods

##### getGeolocation(account, request)

Performs a single geolocation lookup with caching.

```typescript
async getGeolocation(
  account: ShopifyAccount,
  request: GeolocationRequest
): Promise<GeolocationResponse>
```

**Parameters:**
- `account`: Shopify account configuration
- `request`: Geolocation request object

**Request Types:**
- IP-based: `{ ip: '8.8.8.8' }`
- Domain-based: `{ domain: 'google.com' }`
- Coordinate-based: `{ latitude: 37.7749, longitude: -122.4194 }`

##### getBatchGeolocation(account, requests)

Processes multiple geolocation requests efficiently.

```typescript
async getBatchGeolocation(
  account: ShopifyAccount,
  requests: GeolocationRequest[]
): Promise<GeolocationResponse[]>
```

##### healthCheck()

Performs a health check on the service.

```typescript
async healthCheck(): Promise<{
  healthy: boolean;
  latency?: number;
  error?: string;
}>
```

##### getCacheStats()

Returns cache statistics by account.

```typescript
getCacheStats(): Record<string, {
  totalEntries: number;
  oldestEntry: number | null;
  newestEntry: number | null;
}>
```

##### clearAccountCache(accountName)

Clears cache for a specific account.

```typescript
clearAccountCache(accountName: string): void
```

##### clearAllCache()

Clears all cached data.

```typescript
clearAllCache(): void
```

##### cleanupExpiredCache()

Removes expired cache entries and returns the count of cleaned entries.

```typescript
cleanupExpiredCache(): number
```

### GeolocationServiceFactory

Static factory class for creating and managing service instances.

#### Methods

##### create(config, options)

Creates a new GeolocationService instance.

```typescript
static create(
  config: ShopifyCliConfig,
  options?: GeolocationFactoryOptions
): GeolocationService
```

##### getInstance(config, options)

Returns a singleton GeolocationService instance.

```typescript
static getInstance(
  config: ShopifyCliConfig,
  options?: GeolocationFactoryOptions
): GeolocationService
```

##### createFromEnv(options)

Creates a service instance from environment variables.

```typescript
static createFromEnv(
  options?: GeolocationFactoryOptions
): GeolocationService
```

Required environment variables:
- `DECODO_API_ENDPOINT`
- `DECODO_API_KEY`
- `DECODO_API_TIMEOUT` (optional)

##### createPool(config, poolSize, options)

Creates multiple service instances for load balancing.

```typescript
static createPool(
  config: ShopifyCliConfig,
  poolSize: number = 3,
  options?: GeolocationFactoryOptions
): GeolocationService[]
```

##### getRecommendedCacheSettings(expectedDailyRequests)

Returns recommended cache settings based on expected usage.

```typescript
static getRecommendedCacheSettings(
  expectedDailyRequests: number
): Pick<GeolocationFactoryOptions, 'cacheExpirationMs' | 'maxCacheSize'>
```

## Configuration

### Decodo API Configuration

Add the following to your `config.yaml`:

```yaml
decodoApi:
  endpoint: "https://us.decodo.com:10001"
  apiKey: "your-decodo-api-key"
  timeout: 30000  # milliseconds
```

Or use environment variables:

```bash
export DECODO_API_ENDPOINT="https://us.decodo.com:10001"
export DECODO_API_KEY="your-decodo-api-key"
export DECODO_API_TIMEOUT="30000"
```

### Cache Settings Recommendations

| Daily Requests | Cache Expiration | Max Cache Size | Description |
|----------------|------------------|----------------|-------------|
| < 1,000        | 24 hours        | 1,000          | Low volume usage |
| 1,000-10,000   | 12 hours        | 2,000          | Medium volume usage |
| > 10,000       | 6 hours         | 5,000          | High volume usage |

## Examples

### Single IP Lookup

```typescript
const result = await geolocationService.getGeolocation(account, {
  ip: '8.8.8.8'
});

if (result.success) {
  console.log(`IP ${result.ip} is located in ${result.city}, ${result.country}`);
  console.log(`Coordinates: ${result.latitude}, ${result.longitude}`);
  console.log(`ISP: ${result.isp}`);
  console.log(`Cached: ${result.cached}`);
} else {
  console.error('Geolocation lookup failed');
}
```

### Domain Lookup

```typescript
const result = await geolocationService.getGeolocation(account, {
  domain: 'github.com'
});
```

### Coordinate Reverse Lookup

```typescript
const result = await geolocationService.getGeolocation(account, {
  latitude: 40.7128,
  longitude: -74.0060  // New York City
});
```

### Batch Processing

```typescript
const requests = [
  { ip: '8.8.8.8' },
  { ip: '1.1.1.1' },
  { domain: 'github.com' },
  { latitude: 37.7749, longitude: -122.4194 }
];

const results = await geolocationService.getBatchGeolocation(account, requests);

results.forEach((result, index) => {
  console.log(`Request ${index + 1}: ${result.success ? 'Success' : 'Failed'}`);
  if (result.success) {
    console.log(`  Location: ${result.city}, ${result.country}`);
    console.log(`  Cached: ${result.cached}`);
  }
});
```

### Service Pool for High Availability

```typescript
const servicePool = GeolocationServiceFactory.createPool(config, 3);

// Distribute requests across the pool
const distributeRequest = (request: GeolocationRequest, index: number) => {
  const serviceIndex = index % servicePool.length;
  return servicePool[serviceIndex].getGeolocation(account, request);
};

const results = await Promise.all([
  distributeRequest({ ip: '8.8.8.8' }, 0),
  distributeRequest({ ip: '1.1.1.1' }, 1),
  distributeRequest({ domain: 'google.com' }, 2)
]);
```

## Error Handling

The service implements comprehensive error handling:

1. **Network Errors**: Automatic retry with different proxy endpoints
2. **API Errors**: Graceful degradation with error responses
3. **Cache Errors**: Fallback to API calls if cache operations fail
4. **Configuration Errors**: Clear error messages for invalid configurations

### Error Response Format

```typescript
{
  ip: string;
  country: '';
  country_code: '';
  region: '';
  region_code: '';
  city: '';
  zip: '';
  latitude: 0;
  longitude: 0;
  timezone: '';
  isp: '';
  organization: '';
  accuracy_radius: 0;
  success: false;
  cached: false;
}
```

## Monitoring and Debugging

### Health Check

```typescript
const health = await geolocationService.healthCheck();
console.log(`Service healthy: ${health.healthy}`);
if (health.healthy) {
  console.log(`Latency: ${health.latency}ms`);
} else {
  console.error(`Error: ${health.error}`);
}
```

### Cache Statistics

```typescript
const stats = geolocationService.getCacheStats();
for (const [accountName, stat] of Object.entries(stats)) {
  console.log(`Account: ${accountName}`);
  console.log(`  Cached entries: ${stat.totalEntries}`);
  console.log(`  Oldest entry: ${new Date(stat.oldestEntry).toISOString()}`);
  console.log(`  Newest entry: ${new Date(stat.newestEntry).toISOString()}`);
}
```

### Proxy Statistics

```typescript
const proxyManager = GeolocationServiceFactory.getProxyManager();
if (proxyManager) {
  const proxyStats = proxyManager.getProxyStats();
  console.log('Proxy Statistics:', proxyStats);
}
```

## Best Practices

1. **Use Caching**: Enable caching to reduce API calls and improve performance
2. **Monitor Cache Hit Rate**: Regularly check cache statistics to optimize settings
3. **Handle Errors Gracefully**: Always check the `success` field in responses
4. **Use Batch Operations**: Process multiple requests efficiently with `getBatchGeolocation`
5. **Health Monitoring**: Implement regular health checks in production
6. **Service Pools**: Use service pools for high-availability applications
7. **Environment Configuration**: Use environment variables for sensitive API keys

## Troubleshooting

### Common Issues

1. **Connection Errors**: Check if Decodo API endpoint is accessible
2. **Authentication Errors**: Verify API key is correct and active
3. **Cache Performance**: Adjust cache settings based on usage patterns
4. **Proxy Issues**: Check if proxy ports (10001-10010) are accessible

### Debug Logging

Enable debug logging in your configuration:

```yaml
settings:
  debug: true
  logLevel: "debug"
```

This will provide detailed information about proxy rotation, cache operations, and API calls.

## License

This service is part of the Shopify CLI Node.js package and follows the same MIT license terms.
