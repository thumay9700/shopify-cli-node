#!/usr/bin/env ts-node

/**
 * Example usage of the Decodo Geolocation Service
 * 
 * This example demonstrates how to:
 * 1. Create a GeolocationService instance
 * 2. Perform single and batch geolocation lookups
 * 3. Work with caching
 * 4. Handle different request types
 */

import { ShopifyCliConfig } from '../src/config/types';
import { 
  GeolocationRequest, 
  GeolocationResponse,
  GeolocationService,
  GeolocationServiceFactory
} from '../src/services';

// Example configuration
const exampleConfig: ShopifyCliConfig = {
  accounts: [
    {
      accessToken: 'your-access-token',
      apiKey: 'your-api-key',
      apiSecret: 'your-api-secret',
      isDefault: true,
      name: 'development',
      shopUrl: 'https://dev-store.myshopify.com'
    }
  ],
  decodoApi: {
    apiKey: 'your-decodo-api-key',
    endpoint: 'https://us.decodo.com:10001',
    timeout: 30_000
  },
  lastUpdated: new Date().toISOString(),
  settings: {
    autoUpdate: true,
    debug: false,
    logLevel: 'info',
    theme: 'default'
  },
  version: '1.0.0'
};

async function demonstrateGeolocationService() {
  console.log(String.raw`🌍 Decodo Geolocation Service Demo\n`);

  try {
    // 1. Create service instance using factory
    console.log('1. Creating GeolocationService instance...');
    const geolocationService = GeolocationServiceFactory.create(exampleConfig, {
      cacheExpirationMs: 60 * 60 * 1000, // 1 hour for demo
      enableCache: true,
      maxCacheSize: 100
    });

    const account = exampleConfig.accounts[0];
    console.log(`   ✓ Service created for account: ${account.name}\\n`);

    // 2. Perform health check
    console.log('2. Performing health check...');
    const healthCheck = await geolocationService.healthCheck();
    if (healthCheck.healthy) {
      console.log(`   ✓ Service is healthy (latency: ${healthCheck.latency}ms)\\n`);
    } else {
      console.log(`   ✗ Service health check failed: ${healthCheck.error}\\n`);
      // Continue with demo using mock responses
    }

    // 3. Single IP geolocation lookup
    console.log('3. Single IP geolocation lookup...');
    const ipRequest: GeolocationRequest = { ip: '8.8.8.8' };
    
    const ipResult = await geolocationService.getGeolocation(account, ipRequest);
    console.log('   Request:', JSON.stringify(ipRequest, null, 2));
    console.log('   Response:', {
      cached: ipResult.cached,
      city: ipResult.city,
      country: ipResult.country,
      success: ipResult.success
    });
    console.log();

    // 4. Domain geolocation lookup
    console.log('4. Domain geolocation lookup...');
    const domainRequest: GeolocationRequest = { domain: 'google.com' };
    
    const domainResult = await geolocationService.getGeolocation(account, domainRequest);
    console.log('   Request:', JSON.stringify(domainRequest, null, 2));
    console.log('   Response:', {
      cached: domainResult.cached,
      city: domainResult.city,
      country: domainResult.country,
      success: domainResult.success
    });
    console.log();

    // 5. Coordinate-based lookup
    console.log('5. Coordinate-based lookup...');
    const coordRequest: GeolocationRequest = { 
      latitude: 37.7749, 
      longitude: -122.4194 // San Francisco
    };
    
    const coordResult = await geolocationService.getGeolocation(account, coordRequest);
    console.log('   Request:', JSON.stringify(coordRequest, null, 2));
    console.log('   Response:', {
      cached: coordResult.cached,
      city: coordResult.city,
      country: coordResult.country,
      success: coordResult.success
    });
    console.log();

    // 6. Test caching by repeating the IP request
    console.log('6. Testing cache with repeated IP request...');
    const cachedIpResult = await geolocationService.getGeolocation(account, ipRequest);
    console.log('   Request:', JSON.stringify(ipRequest, null, 2));
    console.log('   Response (should be cached):', {
      cached: cachedIpResult.cached,
      cacheTimestamp: cachedIpResult.cache_timestamp,
      city: cachedIpResult.city,
      country: cachedIpResult.country,
      success: cachedIpResult.success
    });
    console.log();

    // 7. Batch geolocation lookup
    console.log('7. Batch geolocation lookup...');
    const batchRequests: GeolocationRequest[] = [
      { ip: '1.1.1.1' },
      { ip: '208.67.222.222' },
      { domain: 'github.com' },
      { domain: 'stackoverflow.com' }
    ];

    console.log(`   Processing ${batchRequests.length} requests in batch...`);
    const batchResults = await geolocationService.getBatchGeolocation(account, batchRequests);
    
    for (const [index, result] of batchResults.entries()) {
      console.log(`   Result ${index + 1}:`, {
        cached: result.cached,
        city: result.city,
        country: result.country,
        request: batchRequests[index],
        success: result.success
      });
    }

    console.log();

    // 8. Display cache statistics
    console.log('8. Cache statistics...');
    const cacheStats = geolocationService.getCacheStats();
    console.log('   Cache stats by account:');
    for (const [accountName, stats] of Object.entries(cacheStats)) {
      console.log(`   - ${accountName}:`, {
        newestEntry: stats.newestEntry ? new Date(stats.newestEntry).toISOString() : 'none',
        oldestEntry: stats.oldestEntry ? new Date(stats.oldestEntry).toISOString() : 'none',
        totalEntries: stats.totalEntries
      });
    }

    console.log();

    // 9. Cleanup expired cache entries
    console.log('9. Cache cleanup...');
    const cleanedCount = geolocationService.cleanupExpiredCache();
    console.log(`   ✓ Cleaned up ${cleanedCount} expired cache entries\\n`);

    console.log('✅ Geolocation service demo completed successfully!');

  } catch (error) {
    console.error('❌ Error during geolocation service demo:', error);
  }
}

async function demonstrateServicePool() {
  console.log(String.raw`\n🔄 Service Pool Demo\n`);

  try {
    console.log('Creating service pool with 3 instances...');
    const servicePool = GeolocationServiceFactory.createPool(exampleConfig, 3, {
      enableCache: true,
      maxCacheSize: 50
    });

    console.log(`✓ Created pool with ${servicePool.length} service instances\\n`);

    const account = exampleConfig.accounts[0];
    const testRequests: GeolocationRequest[] = [
      { ip: '8.8.8.8' },
      { ip: '1.1.1.1' },
      { domain: 'example.com' }
    ];

    // Distribute requests across the pool
    console.log('Distributing requests across service pool...');
    const poolResults = await Promise.all(
      testRequests.map((request, index) => {
        const serviceIndex = index % servicePool.length;
        console.log(`   Request ${index + 1} → Service ${serviceIndex + 1}`);
        return servicePool[serviceIndex].getGeolocation(account, request);
      })
    );

    console.log(String.raw`\nPool results:`);
    for (const [index, result] of poolResults.entries()) {
      console.log(`   Result ${index + 1}:`, {
        cached: result.cached,
        country: result.country,
        success: result.success
      });
    }

    console.log(String.raw`\n✅ Service pool demo completed successfully!`);

  } catch (error) {
    console.error('❌ Error during service pool demo:', error);
  }
}

async function demonstrateEnvironmentConfiguration() {
  console.log(String.raw`\n🔧 Environment Configuration Demo\n`);

  // Set example environment variables
  process.env.DECODO_API_ENDPOINT = 'https://us.decodo.com:10002';
  process.env.DECODO_API_KEY = 'env-api-key-example';
  process.env.DECODO_API_TIMEOUT = '45000';

  try {
    console.log('Creating service from environment variables...');
    const envService = GeolocationServiceFactory.createFromEnv({
      cacheExpirationMs: 2 * 60 * 60 * 1000, // 2 hours
      enableCache: true
    });

    const serviceConfig = envService.getConfig();
    console.log('✓ Service created with config:', {
      cacheEnabled: serviceConfig.enableCache,
      endpoint: serviceConfig.decodoApi.endpoint,
      timeout: serviceConfig.decodoApi.timeout
    });

    console.log(String.raw`\n✅ Environment configuration demo completed!`);

  } catch (error) {
    console.error('❌ Error during environment configuration demo:', error);
  }
}

// Run the demonstrations
async function main() {
  console.log(String.raw`🚀 Starting Decodo Geolocation Service Demonstrations\n`);
  console.log('=' .repeat(60));

  await demonstrateGeolocationService();
  await demonstrateServicePool();
  await demonstrateEnvironmentConfiguration();

  console.log(String.raw`\n` + '='.repeat(60));
  console.log('🎉 All demonstrations completed!');
}

// Execute if run directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  demonstrateEnvironmentConfiguration,
  demonstrateGeolocationService,
  demonstrateServicePool
};
