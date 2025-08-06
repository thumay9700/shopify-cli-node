# Proxy Rotation Module

A comprehensive proxy manager that handles rotation through Decodo host ports (10001-10010) with automatic retries, fallbacks, and health monitoring.

## Features

- **Port Rotation**: Automatically rotates through ports 10001-10010 on us.decodo.com
- **Smart Port Selection**: Prefers unused ports, falls back to least recently used
- **Automatic Retries**: Configurable retry logic with different proxy on each attempt
- **Health Monitoring**: Tracks proxy failures and excludes unhealthy proxies
- **Axios Integration**: Creates configured Axios instances with automatic proxy rotation
- **Fetch API Support**: Provides fetch wrapper with proxy support
- **Statistics**: Detailed proxy usage and health statistics

## Installation

The module uses the following dependencies (already installed):
```bash
npm install axios socks-proxy-agent
```

## Basic Usage

### With Axios

```typescript
import { ProxyManager } from './proxy/proxy-manager';

const proxyManager = new ProxyManager();
const axiosInstance = proxyManager.createAxiosInstance();

// All requests will automatically rotate through available proxies
const response = await axiosInstance.get('https://api.example.com/data');
```

### With Fetch API

```typescript
import { ProxyManager } from './proxy/proxy-manager';

const proxyManager = new ProxyManager();
const fetchWithProxy = proxyManager.createFetchWithProxy();

const response = await fetchWithProxy('https://api.example.com/data');
const data = await response.json();
```

## Configuration

### Default Configuration

```typescript
{
  host: 'us.decodo.com',
  portRange: { start: 10001, end: 10010 },
  maxRetries: 3,
  retryDelay: 1000
}
```

### Custom Configuration

```typescript
const proxyManager = new ProxyManager({
  host: 'us.decodo.com',
  portRange: { start: 10001, end: 10010 },
  maxRetries: 5,
  retryDelay: 2000
});
```

## API Reference

### ProxyManager Class

#### Constructor
```typescript
constructor(config?: Partial<ProxyConfig>)
```

#### Methods

##### getNextProxy()
Returns the next available proxy, rotating through unused ports first.
```typescript
getNextProxy(): ProxyInfo
```

##### createAxiosInstance(baseConfig?)
Creates an Axios instance with automatic proxy rotation and retry logic.
```typescript
createAxiosInstance(baseConfig?: AxiosRequestConfig): AxiosInstance
```

##### createFetchWithProxy()
Creates a fetch function with proxy support and retry logic.
```typescript
createFetchWithProxy(): typeof fetch
```

##### getProxyStats()
Returns detailed statistics for all proxies.
```typescript
getProxyStats(): Array<{
  port: number;
  lastUsed: number;
  failureCount: number;
  isHealthy: boolean;
}>
```

##### getHealthyProxies()
Returns only the healthy proxies (low failure count).
```typescript
getHealthyProxies(): ProxyInfo[]
```

##### resetStats()
Resets all proxy statistics and failure counts.
```typescript
resetStats(): void
```

##### markProxyAsFailed(port)
Manually mark a proxy as failed.
```typescript
markProxyAsFailed(port: number): void
```

##### markProxyAsSuccessful(port)
Manually mark a proxy as successful.
```typescript
markProxyAsSuccessful(port: number): void
```

## Interfaces

### ProxyConfig
```typescript
interface ProxyConfig {
  host: string;
  portRange: {
    start: number;
    end: number;
  };
  maxRetries: number;
  retryDelay: number;
}
```

### ProxyInfo
```typescript
interface ProxyInfo {
  host: string;
  port: number;
  agent: SocksProxyAgent;
  lastUsed: number;
  failureCount: number;
}
```

## Port Rotation Logic

1. **First Priority**: Use completely unused ports
2. **Second Priority**: When all ports have been used once, reset and use least recently used proxy
3. **Health Check**: Exclude proxies with high failure counts (≥3 failures)
4. **Retry Logic**: On failure, automatically retry with a different proxy up to `maxRetries` times

## Error Handling

- Failed requests automatically trigger proxy rotation
- Proxies with repeated failures are marked as unhealthy
- Automatic retry with exponential backoff
- Comprehensive error reporting and logging

## Examples

See `src/proxy/examples.ts` for comprehensive usage examples including:
- Basic Axios usage
- Custom configuration
- Fetch API integration
- Statistics monitoring
- Failure recovery

## Best Practices

1. **Reuse Instances**: Create one ProxyManager instance and reuse the Axios/fetch instances it creates
2. **Monitor Health**: Periodically check proxy statistics with `getProxyStats()`
3. **Handle Failures**: Implement proper error handling for when all proxies fail
4. **Configure Timeouts**: Set appropriate timeouts in your Axios configuration
5. **Reset Statistics**: Periodically reset statistics with `resetStats()` for long-running applications

## Troubleshooting

### All Proxies Failing
- Check if us.decodo.com is accessible
- Verify ports 10001-10010 are available
- Check firewall/network restrictions

### High Latency
- Adjust `retryDelay` configuration
- Consider reducing `maxRetries` for faster failures
- Monitor proxy health statistics

### Memory Usage
- Call `resetStats()` periodically in long-running applications
- Monitor proxy instances if creating multiple ProxyManager instances

## Integration with Shopify CLI

The proxy manager is designed to integrate seamlessly with Shopify CLI commands that need to make HTTP requests through proxies. It automatically handles the complexity of proxy rotation while providing a simple interface for developers.

```typescript
// In a Shopify CLI command
import { ProxyManager } from '../proxy';

export class MyShopifyCommand extends Command {
  async run() {
    const proxyManager = new ProxyManager();
    const axios = proxyManager.createAxiosInstance({
      baseURL: 'https://api.shopify.com',
      headers: {
        'X-Shopify-Access-Token': this.shopifyToken
      }
    });

    // All requests will automatically use rotating proxies
    const shops = await axios.get('/admin/api/2023-10/shops.json');
  }
}
```
