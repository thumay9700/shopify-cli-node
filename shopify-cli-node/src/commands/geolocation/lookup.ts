import {Args, Command, Flags} from '@oclif/core';

import {loadConfig, ShopifyAccount} from '../../config';
import {GeolocationServiceFactory} from '../../services';

export default class GeolocationLookup extends Command {
  static override args = {
    target: Args.string({
      description: 'IP address, domain, or coordinates (lat,lng) to geolocate',
      required: true,
    }),
  };
static override description = 'Perform geolocation lookup using Decodo API';
static override examples = [
    '$ shopify-cli geolocation:lookup 8.8.8.8',
    '$ shopify-cli geolocation:lookup google.com',
    '$ shopify-cli geolocation:lookup 37.7749,-122.4194',
  ];
static override flags = {
    account: Flags.string({
      char: 'a',
      description: 'Shopify account to use (defaults to default account)',
    }),
    'cache-stats': Flags.boolean({
      description: 'Show cache statistics after lookup',
    }),
    'health-check': Flags.boolean({
      description: 'Perform health check before lookup',
    }),
    'no-cache': Flags.boolean({
      description: 'Disable caching for this request',
    }),
  };

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(GeolocationLookup);

    try {
      // Load configuration
      const config = await loadConfig();
      
      if (!config.decodoApi) {
        this.error('Decodo API configuration not found. Please configure your API credentials.');
      }

      // Get account to use
      let account: ShopifyAccount;
      if (flags.account) {
        const foundAccount = config.accounts.find((acc: ShopifyAccount) => acc.name === flags.account);
        if (!foundAccount) {
          this.error(`Account '${flags.account}' not found.`);
        }

        account = foundAccount;
      } else {
        const defaultAccount = config.accounts.find((acc: ShopifyAccount) => acc.isDefault) || config.accounts[0];
        if (!defaultAccount) {
          this.error('No Shopify accounts configured.');
        }

        account = defaultAccount;
      }

      if (!account) {
        this.error('No Shopify accounts configured.');
      }

      // Create geolocation service
      const geolocationService = GeolocationServiceFactory.create(config, {
        cacheExpirationMs: 24 * 60 * 60 * 1000, // 24 hours
        enableCache: !flags['no-cache'],
        maxCacheSize: 1000,
      });

      // Perform health check if requested
      if (flags['health-check']) {
        this.log('Performing health check...');
        const health = await geolocationService.healthCheck();
        if (health.healthy) {
          this.log(`✓ Service healthy (latency: ${health.latency}ms)`);
        } else {
          this.warn(`✗ Service health check failed: ${health.error}`);
        }

        this.log('');
      }

      // Parse target and create geolocation request
      const {target} = args;
      let request;

      // Check if it's coordinates (lat,lng)
      if (target.includes(',')) {
        const [lat, lng] = target.split(',').map(s => Number.parseFloat(s.trim()));
        if (isNaN(lat) || isNaN(lng)) {
          this.error('Invalid coordinates format. Use: lat,lng (e.g., 37.7749,-122.4194)');
        }

        request = { latitude: lat, longitude: lng };
      }
      // Check if it's an IP address
      else if (/^\d+\.\d+\.\d+\.\d+$/.test(target)) {
        request = { ip: target };
      }
      // Assume it's a domain
      else {
        request = { domain: target };
      }

      // Perform geolocation lookup
      this.log(`Looking up location for: ${target}`);
      const startTime = Date.now();
      
      const result = await geolocationService.getGeolocation(account, request);
      const duration = Date.now() - startTime;

      // Display results
      this.log('');
      if (result.success) {
        this.log('📍 Geolocation Result:');
        this.log(`   IP: ${result.ip}`);
        this.log(`   Location: ${result.city}, ${result.region}, ${result.country}`);
        this.log(`   Country Code: ${result.country_code}`);
        this.log(`   Coordinates: ${result.latitude}, ${result.longitude}`);
        this.log(`   Timezone: ${result.timezone}`);
        this.log(`   ISP: ${result.isp}`);
        if (result.organization && result.organization !== result.isp) {
          this.log(`   Organization: ${result.organization}`);
        }

        this.log(`   Accuracy Radius: ${result.accuracy_radius}km`);
        this.log('');
        this.log(`⚡ Request completed in ${duration}ms`);
        if (result.cached) {
          this.log(`📦 Result served from cache (cached at: ${new Date(result.cache_timestamp || 0).toISOString()})`);
        } else {
          this.log('🌐 Fresh result from API');
        }
      } else {
        this.error(`❌ Geolocation lookup failed for: ${target}`);
      }

      // Show cache statistics if requested
      if (flags['cache-stats']) {
        this.log('');
        this.log('📊 Cache Statistics:');
        const stats = geolocationService.getCacheStats();
        
        if (Object.keys(stats).length === 0) {
          this.log('   No cached entries');
        } else {
          for (const [accountName, stat] of Object.entries(stats)) {
            this.log(`   Account: ${accountName}`);
            this.log(`     Cached entries: ${stat.totalEntries}`);
            if (stat.oldestEntry) {
              this.log(`     Oldest entry: ${new Date(stat.oldestEntry).toISOString()}`);
            }

            if (stat.newestEntry) {
              this.log(`     Newest entry: ${new Date(stat.newestEntry).toISOString()}`);
            }
          }
        }
      }

    } catch (error: any) {
      this.error(`Error: ${error.message}`);
    }
  }
}
