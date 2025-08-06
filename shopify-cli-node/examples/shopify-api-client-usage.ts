import { ShopifyApiClient, ShopifyApiFactory } from '../src/services';

/**
 * Example usage of the Shopify API Client Core
 */

async function basicUsageExample() {
  console.log('🔧 Basic Shopify API Client Usage Example');
  
  try {
    // Option 1: Create client directly from environment variables
    const client = ShopifyApiFactory.createFromEnv();
    
    // Option 2: Create client from configuration
    // const client = await ShopifyApiFactory.getDefaultClient();
    
    // Test connection
    const connectionTest = await client.testConnection();
    console.log(`✅ Connection test: ${connectionTest ? 'Success' : 'Failed'}`);
    
    if (connectionTest) {
      // Get shop information
      const shopInfo = await client.settings.shop(['name', 'domain', 'email']);
      console.log('🏪 Shop Info:', shopInfo.data);
      
      // Get products
      const products = await client.products.list({ limit: 5 });
      console.log(`📦 Found ${products.data.products?.length || 0} products`);
      
      // Get themes
      const themes = await client.themes.list();
      console.log(`🎨 Found ${themes.data.themes?.length || 0} themes`);
      
      // Get proxy stats
      console.log('📊 Proxy Stats:', client.getProxyStats());
    }
    
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
  }
}

async function graphqlExample() {
  console.log('\n🔧 GraphQL Query Example');
  
  try {
    const client = ShopifyApiFactory.createFromEnv();
    
    // GraphQL query to get shop and products
    const query = `
      query ShopAndProducts($first: Int!) {
        shop {
          name
          email
          domain
          plan {
            displayName
          }
        }
        products(first: $first) {
          edges {
            node {
              id
              title
              handle
              status
              createdAt
              variants(first: 1) {
                edges {
                  node {
                    id
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
    
    const result = await client.graphql(query, { first: 3 });
    
    if (result.errors) {
      console.error('❌ GraphQL Errors:', result.errors);
    } else {
      console.log('🏪 Shop:', result.data.shop);
      console.log('📦 Products:', result.data.products.edges.map((edge: any) => ({
        price: edge.node.variants.edges[0]?.node.price,
        status: edge.node.status,
        title: edge.node.title
      })));
    }
    
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
  }
}

async function multiAccountExample() {
  console.log('\n🔧 Multi-Account Management Example');
  
  try {
    // Get all account names
    const accountNames = await ShopifyApiFactory.getAccountNames();
    console.log('👥 Available accounts:', accountNames);
    
    // Test connections for all accounts
    const connectionResults = await ShopifyApiFactory.testAllConnections();
    console.log('🔗 Connection results:');
    for (const [account, result] of connectionResults) {
      console.log(`  ${account}: ${result.success ? '✅' : '❌'} ${result.error || ''}`);
    }
    
    // Batch operation across multiple accounts
    const results = await ShopifyApiFactory.batchOperation(
      async (client, accountName) => {
        const shop = await client.settings.shop(['name', 'domain']);
        return {
          domain: shop.data.shop.domain,
          name: shop.data.shop.name
        };
      }
    );
    
    console.log('🏪 Shop information for all accounts:');
    for (const [account, result] of results) {
      if (result.success) {
        console.log(`  ${account}: ${result.data?.name} (${result.data?.domain})`);
      } else {
        console.log(`  ${account}: ❌ ${result.error}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
  }
}

async function inventoryManagementExample() {
  console.log('\n🔧 Inventory Management Example');
  
  try {
    const client = await ShopifyApiFactory.getDefaultClient();
    
    // Get locations
    const locations = await client.settings.locations();
    console.log(`📍 Found ${locations.data.locations?.length || 0} locations`);
    
    if (locations.data.locations && locations.data.locations.length > 0) {
      const locationId = locations.data.locations[0].id;
      
      // Get inventory levels for this location
      const inventoryLevels = await client.inventory.levels({
        limit: 10,
        location_ids: locationId.toString()
      });
      
      console.log(`📦 Found ${inventoryLevels.data.inventory_levels?.length || 0} inventory levels`);
      
      // Example: Adjust inventory (commented out to avoid actual changes)
      // const inventoryItemId = inventoryLevels.data.inventory_levels?.[0]?.inventory_item_id;
      // if (inventoryItemId) {
      //   const adjustment = await client.inventory.adjust(locationId, inventoryItemId, 5);
      //   console.log('📈 Inventory adjusted:', adjustment.data);
      // }
    }
    
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
  }
}

async function webhookManagementExample() {
  console.log('\n🔧 Webhook Management Example');
  
  try {
    const client = await ShopifyApiFactory.getDefaultClient();
    
    // List existing webhooks
    const webhooks = await client.webhooks.list();
    console.log(`🔔 Found ${webhooks.data.webhooks?.length || 0} webhooks`);
    
    if (webhooks.data.webhooks) {
      webhooks.data.webhooks.forEach((webhook: any, index: number) => {
        console.log(`  ${index + 1}. ${webhook.topic} -> ${webhook.address}`);
      });
    }
    
    // Example: Create a webhook (commented out to avoid actual changes)
    // const newWebhook = await client.webhooks.create({
    //   topic: 'orders/create',
    //   address: 'https://your-app.com/webhooks/orders/create',
    //   format: 'json'
    // });
    // console.log('✨ Created webhook:', newWebhook.data);
    
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
  }
}

async function themeManagementExample() {
  console.log('\n🔧 Theme Management Example');
  
  try {
    const client = await ShopifyApiFactory.getDefaultClient();
    
    // Get all themes
    const themes = await client.themes.list();
    console.log(`🎨 Found ${themes.data.themes?.length || 0} themes`);
    
    if (themes.data.themes) {
      const mainTheme = themes.data.themes.find((theme: any) => theme.role === 'main');
      if (mainTheme) {
        console.log(`🎯 Main theme: ${mainTheme.name} (ID: ${mainTheme.id})`);
        
        // Get theme assets
        const assets = await client.themes.assets.list(mainTheme.id, { fields: 'key,size,content_type' });
        console.log(`📁 Found ${assets.data.assets?.length || 0} theme assets`);
        
        if (assets.data.assets) {
          // Show first few assets
          assets.data.assets.slice(0, 5).forEach((asset: any, index: number) => {
            console.log(`  ${index + 1}. ${asset.key} (${asset.size} bytes, ${asset.content_type})`);
          });
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
  }
}

async function proxyStatsExample() {
  console.log('\n🔧 Proxy Statistics Example');
  
  try {
    // Get factory-level proxy stats for all clients
    const allStats = ShopifyApiFactory.getAllProxyStats();
    console.log('📊 Proxy Statistics for All Clients:');
    
    for (const [accountName, stats] of allStats) {
      const healthy = stats.filter(s => s.isHealthy);
      const used = stats.filter(s => s.lastUsed > 0);
      
      console.log(`\n  Account: ${accountName}`);
      console.log(`    Total: ${stats.length} | Healthy: ${healthy.length} | Used: ${used.length}`);
      
      if (used.length > 0) {
        console.log('    Recently used ports:');
        for (const stat of used
          .sort((a, b) => b.lastUsed - a.lastUsed)
          .slice(0, 3)) {
            const ago = Date.now() - stat.lastUsed;
            console.log(`      Port ${stat.port}: ${Math.round(ago/1000)}s ago, ${stat.failureCount} failures`);
          }
      }
    }
    
    // Reset all proxy stats
    console.log('\n🔄 Resetting all proxy statistics...');
    ShopifyApiFactory.resetAllProxyStats();
    
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
  }
}

// Run examples
async function runExamples() {
  console.log('🚀 Shopify API Client Examples\n');
  
  await basicUsageExample();
  await graphqlExample();
  await multiAccountExample();
  await inventoryManagementExample();
  await webhookManagementExample();
  await themeManagementExample();
  await proxyStatsExample();
  
  console.log('\n✅ All examples completed!');
}

// Export for external usage
export {
  basicUsageExample,
  graphqlExample,
  inventoryManagementExample,
  multiAccountExample,
  proxyStatsExample,
  runExamples,
  themeManagementExample,
  webhookManagementExample
};

// Run examples if called directly
if (require.main === module) {
  runExamples().catch(console.error);
}
