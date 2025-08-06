import { ProxyManager } from './proxy-manager';

/**
 * Simple demonstration of the proxy manager functionality
 */
async function demonstrateProxyManager() {
  console.log('🚀 Proxy Manager Demo');
  console.log('=====================\n');
  
  // Create proxy manager with default config
  const proxyManager = new ProxyManager();
  
  console.log('Configuration:');
  const config = proxyManager.getConfig();
  console.log(`  Host: ${config.host}`);
  console.log(`  Port Range: ${config.portRange.start}-${config.portRange.end}`);
  console.log(`  Max Retries: ${config.maxRetries}`);
  console.log(`  Retry Delay: ${config.retryDelay}ms\n`);
  
  // Demonstrate proxy rotation
  console.log('Proxy Rotation Test:');
  console.log('Getting 5 different proxies...');
  
  for (let i = 0; i < 5; i++) {
    const proxy = proxyManager.getNextProxy();
    console.log(`  ${i + 1}. Using proxy: ${proxy.host}:${proxy.port}`);
  }
  
  console.log('\nProxy Statistics:');
  const stats = proxyManager.getProxyStats();
  const usedProxies = stats.filter(stat => stat.lastUsed > 0);
  
  console.log(`  Total proxies: ${stats.length}`);
  console.log(`  Used proxies: ${usedProxies.length}`);
  console.log(`  Healthy proxies: ${stats.filter(stat => stat.isHealthy).length}`);
  
  // Create Axios instance
  console.log('\n📡 Creating Axios Instance...');
  const axiosInstance = proxyManager.createAxiosInstance({
    baseURL: 'https://httpbin.org',
    timeout: 5000
  });
  console.log('  ✓ Axios instance created with proxy rotation');
  
  // Create fetch function
  console.log('\n🔄 Creating Fetch Function...');
  const fetchWithProxy = proxyManager.createFetchWithProxy();
  console.log('  ✓ Fetch function created with proxy rotation');
  
  console.log('\n✅ Demo completed successfully!');
  console.log('\nThe proxy manager is ready to use with:');
  console.log('  • Automatic proxy rotation through ports 10001-10010');
  console.log('  • Smart port selection (prefers unused ports)');
  console.log('  • Health monitoring and retry logic');
  console.log('  • Both Axios and Fetch API support');
}

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateProxyManager().catch(console.error);
}

export { demonstrateProxyManager };
