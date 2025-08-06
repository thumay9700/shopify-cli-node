/**
 * Example: Using the Shopify CLI Configuration System
 * 
 * This example demonstrates how to use the configuration management system
 * to manage multiple Shopify accounts, Decodo API credentials, and settings.
 */

import { configLoader } from '../src/config/index';

async function demonstrateConfigSystem() {
  console.log('🚀 Shopify CLI Configuration System Demo\n');

  try {
    // 1. Load current configuration
    console.log('1. Loading current configuration...');
    const config = await configLoader.load();
    console.log(`   Config version: ${config.version}`);
    console.log(`   Accounts: ${config.accounts.length}`);
    console.log('   ✅ Configuration loaded successfully\n');

    // 2. Add a development account
    console.log('2. Adding a development Shopify account...');
    await configLoader.addAccount({
      accessToken: 'dev-access-token-12345',
      apiKey: 'dev-api-key',
      apiSecret: 'dev-api-secret',
      isDefault: true,
      name: 'development',
      shopUrl: 'https://dev-store.myshopify.com',
    });
    console.log('   ✅ Development account added\n');

    // 3. Add a production account
    console.log('3. Adding a production Shopify account...');
    await configLoader.addAccount({
      accessToken: 'prod-access-token-67890',
      apiKey: 'prod-api-key',
      apiSecret: 'prod-api-secret',
      isDefault: false,
      name: 'production',
      shopUrl: 'https://prod-store.myshopify.com',
    });
    console.log('   ✅ Production account added\n');

    // 4. Configure Decodo API
    console.log('4. Configuring Decodo API credentials...');
    await configLoader.updateDecodoApi({
      apiKey: 'decodo-api-key-xyz789',
      endpoint: 'https://us.decodo.com:10001',
      timeout: 30_000,
    });
    console.log('   ✅ Decodo API configured\n');

    // 5. Set up proxy configuration
    console.log('5. Setting up proxy configuration...');
    await configLoader.updateProxySettings({
      enabled: true,
      host: 'proxy.company.com',
      password: 'proxy-password',
      port: 8080,
      protocol: 'http',
      username: 'proxy-user',
    });
    console.log('   ✅ Proxy configured\n');

    // 6. Update global settings
    console.log('6. Updating global settings...');
    await configLoader.updateSettings({
      autoUpdate: false,
      debug: true,
      logLevel: 'debug',
      theme: 'dark',
    });
    console.log('   ✅ Global settings updated\n');

    // 7. Retrieve and display configuration
    console.log('7. Final configuration:');
    const finalConfig = await configLoader.load();
    
    console.log(`   Version: ${finalConfig.version}`);
    console.log(`   Accounts: ${finalConfig.accounts.length}`);
    
    console.log('\n   📋 Accounts:');
    for (const account of finalConfig.accounts) {
      const defaultLabel = account.isDefault ? ' (default)' : '';
      console.log(`      • ${account.name}${defaultLabel}`);
      console.log(`        URL: ${account.shopUrl}`);
      console.log(`        Has Token: ${account.accessToken ? '✅' : '❌'}`);
      console.log(`        Has API Key: ${account.apiKey ? '✅' : '❌'}`);
    }

    if (finalConfig.decodoApi) {
      console.log('\n   🔌 Decodo API:');
      console.log(`      Endpoint: ${finalConfig.decodoApi.endpoint}`);
      console.log(`      Timeout: ${finalConfig.decodoApi.timeout}ms`);
    }

    if (finalConfig.proxy) {
      console.log('\n   🌐 Proxy:');
      console.log(`      Enabled: ${finalConfig.proxy.enabled ? '✅' : '❌'}`);
      console.log(`      Host: ${finalConfig.proxy.host || 'N/A'}`);
      console.log(`      Port: ${finalConfig.proxy.port || 'N/A'}`);
    }

    console.log('\n   ⚙️ Settings:');
    console.log(`      Debug: ${finalConfig.settings.debug ? '✅' : '❌'}`);
    console.log(`      Log Level: ${finalConfig.settings.logLevel}`);
    console.log(`      Theme: ${finalConfig.settings.theme}`);
    console.log(`      Auto Update: ${finalConfig.settings.autoUpdate ? '✅' : '❌'}`);

    // 8. Demonstrate account retrieval
    console.log('\n8. Testing account retrieval...');
    const defaultAccount = await configLoader.getDefaultAccount();
    console.log(`   Default account: ${defaultAccount?.name || 'None'}`);
    
    const devAccount = await configLoader.getAccount('development');
    console.log(`   Development account: ${devAccount ? 'Found' : 'Not found'}`);
    console.log('   ✅ Account retrieval working\n');

    // 9. Show configuration file path
    const paths = configLoader.getConfigPaths();
    console.log('9. Configuration file locations:');
    console.log(`   Config: ${paths.configPath}`);
    console.log(`   Env: ${paths.envPath}`);
    console.log('   ✅ Demo completed successfully! 🎉\n');

  } catch (error) {
    console.error('❌ Error during demo:', error);
    process.exit(1);
  }
}

// Demonstration of environment variable overrides
async function demonstrateEnvOverrides() {
  console.log('🌍 Environment Variable Overrides Demo\n');

  try {
    // Set some environment variables
    process.env.SHOPIFY_CLI_DEBUG = 'true';
    process.env.SHOPIFY_CLI_LOG_LEVEL = 'error';
    process.env.DECODO_API_ENDPOINT = 'https://us.decodo.com:10002';

    // Create a new config loader to pick up environment changes
    const { ConfigLoader } = await import('../src/config/index');
    const tempLoader = new ConfigLoader();

    // Load configuration with overrides
    const config = await tempLoader.load();

    console.log('Environment overrides applied:');
    console.log(`   Debug (from env): ${config.settings.debug}`);
    console.log(`   Log Level (from env): ${config.settings.logLevel}`);
    
    if (config.decodoApi) {
      console.log(`   Decodo Endpoint (from env): ${config.decodoApi.endpoint}`);
    }
    
    console.log('   ✅ Environment overrides working correctly!\n');

  } catch (error) {
    console.error('❌ Error during environment demo:', error);
  }
}

// Run demonstrations
async function main() {
  await demonstrateConfigSystem();
  await demonstrateEnvOverrides();
}

if (require.main === module) {
  main().catch(console.error);
}

export { demonstrateConfigSystem, demonstrateEnvOverrides };
