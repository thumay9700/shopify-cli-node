import { ProxyManager } from './proxy-manager';

/**
 * Example 1: Basic usage with Axios
 */
export async function basicAxiosExample() {
  const proxyManager = new ProxyManager();
  const axiosInstance = proxyManager.createAxiosInstance();

  try {
    const response = await axiosInstance.get('https://api.example.com/data');
    console.log('Success:', response.data);
  } catch (error) {
    console.error('Request failed:', (error as Error).message);
  }
}

/**
 * Example 2: Using with custom configuration
 */
export async function customConfigExample() {
  const proxyManager = new ProxyManager({
    host: 'us.decodo.com',
    maxRetries: 5,
    portRange: { end: 10_010, start: 10_001 },
    retryDelay: 2000
  });

  const axiosInstance = proxyManager.createAxiosInstance({
    headers: {
      'User-Agent': 'ShopifyCLI/1.0.0'
    },
    timeout: 10_000
  });

  try {
    const response = await axiosInstance.post('https://api.shopify.com/graphql', {
      query: `query { shop { name } }`
    });
    console.log('Shopify data:', response.data);
  } catch (error) {
    console.error('Shopify request failed:', (error as Error).message);
  }
}

/**
 * Example 3: Using with fetch API
 */
export async function fetchExample() {
  const proxyManager = new ProxyManager();
  const fetchWithProxy = proxyManager.createFetchWithProxy();

  try {
    const response = await fetchWithProxy('https://httpbin.org/ip');
    const data = await response.json();
    console.log('IP Address through proxy:', data);
  } catch (error) {
    console.error('Fetch request failed:', (error as Error).message);
  }
}

/**
 * Example 4: Monitoring proxy statistics
 */
export async function monitoringExample() {
  const proxyManager = new ProxyManager();
  const axiosInstance = proxyManager.createAxiosInstance();

  // Make multiple requests
  const requests = Array.from({length: 15}).fill(null).map(async (_, i) => {
    try {
      const response = await axiosInstance.get(`https://httpbin.org/delay/${Math.floor(Math.random() * 3)}`);
      return `Request ${i + 1}: Success`;
    } catch (error) {
      return `Request ${i + 1}: Failed - ${(error as Error).message}`;
    }
  });

  const results = await Promise.allSettled(requests);
  for (const result of results) {
    if (result.status === 'fulfilled') {
      console.log(result.value);
    }
  }

  // Check proxy statistics
  const stats = proxyManager.getProxyStats();
  console.log(String.raw`\nProxy Statistics:`);
  for (const stat of stats) {
    console.log(`Port ${stat.port}: Last used ${stat.lastUsed ? new Date(stat.lastUsed).toISOString() : 'never'}, Failures: ${stat.failureCount}, Healthy: ${stat.isHealthy}`);
  }
}

/**
 * Example 5: Handling proxy failures and recovery
 */
export async function failureRecoveryExample() {
  const proxyManager = new ProxyManager({
    maxRetries: 2,
    retryDelay: 500
  });

  const axiosInstance = proxyManager.createAxiosInstance();

  try {
    // This might fail with some proxies
    const response = await axiosInstance.get('https://httpbin.org/status/500');
    console.log('Unexpected success:', response.status);
  } catch {
    console.log('Expected failure, checking healthy proxies...');
    
    const healthyProxies = proxyManager.getHealthyProxies();
    console.log(`Healthy proxies remaining: ${healthyProxies.length}`);
    
    if (healthyProxies.length > 0) {
      try {
        const retryResponse = await axiosInstance.get('https://httpbin.org/status/200');
        console.log('Retry succeeded with different proxy:', retryResponse.status);
      } catch (retryError) {
        console.error('Retry also failed:', (retryError as Error).message);
      }
    }
  }
}
