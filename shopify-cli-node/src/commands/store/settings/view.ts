import { Command, Flags } from '@oclif/core';

import { loadConfig, ShopifyAccount } from '../../../config';
import { ShopifyApiFactory } from '../../../services';

export default class SettingsView extends Command {
  static override description = 'View current store settings and configuration';
static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --account mystore',
    '<%= config.bin %> <%= command.id %> --format json',
    '<%= config.bin %> <%= command.id %> --show-locations',
  ];
static override flags = {
    account: Flags.string({
      char: 'a',
      description: 'Shopify account to use (defaults to default account)',
    }),
    format: Flags.string({
      char: 'f',
      default: 'table',
      description: 'Output format',
      options: ['json', 'table'],
    }),
    help: Flags.help({ char: 'h' }),
    'show-currencies': Flags.boolean({
      default: false,
      description: 'Show supported currencies',
    }),
    'show-locations': Flags.boolean({
      default: false,
      description: 'Show store locations',
    }),
    'show-policies': Flags.boolean({
      default: false,
      description: 'Show store policies',
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(SettingsView);

    try {
      // Load configuration
      const config = await loadConfig();

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

      // Create API client
      const apiClient = ShopifyApiFactory.create(account);

      // Fetch shop information
      this.log(`🏪 Fetching store settings from ${account.name}...`);
      const startTime = Date.now();

      const [shopResponse, locationsResponse] = await Promise.all([
        apiClient.settings.shop(),
        flags['show-locations'] ? apiClient.settings.locations() : Promise.resolve(null),
      ]);

      const duration = Date.now() - startTime;
      
      if (!shopResponse.data || !shopResponse.data.shop) {
        this.error('Failed to fetch shop settings');
      }

      const {shop} = shopResponse.data;

      // Fetch additional data if requested
      let policies = null;
      let currencies = null;

      if (flags['show-policies']) {
        try {
          const policiesResponse = await apiClient.settings.policies();
          policies = policiesResponse.data?.policies || [];
        } catch {
          // Policies might not be accessible, continue without them
        }
      }

      if (flags['show-currencies']) {
        try {
          const currenciesResponse = await apiClient.settings.currencies();
          currencies = currenciesResponse.data?.currencies || [];
        } catch {
          // Currencies might not be accessible, continue without them
        }
      }

      // Display results
      if (flags.format === 'json') {
        const result: any = { shop };
        if (locationsResponse) result.locations = locationsResponse.data?.locations || [];
        if (policies) result.policies = policies;
        if (currencies) result.currencies = currencies;
        this.log(JSON.stringify(result, null, 2));
        return;
      }

      // Table format (default)
      this.log(`\n✅ Store settings retrieved (${duration}ms)`);
      this.log('\n🏪 Store Information:');
      this.log('─'.repeat(60));
      
      this.log(`Store Name: ${shop.name}`);
      this.log(`Shop Owner: ${shop.shop_owner || 'N/A'}`);
      this.log(`Domain: ${shop.domain}`);
      this.log(`Myshopify Domain: ${shop.myshopify_domain}`);
      this.log(`Email: ${shop.email}`);
      this.log(`Phone: ${shop.phone || 'N/A'}`);
      this.log(`Address: ${shop.address1 || 'N/A'}`);
      this.log(`City: ${shop.city || 'N/A'}`);
      this.log(`Province: ${shop.province || 'N/A'}`);
      this.log(`Country: ${shop.country_name || shop.country || 'N/A'}`);
      this.log(`Postal Code: ${shop.zip || 'N/A'}`);
      this.log(`Timezone: ${shop.timezone || 'N/A'}`);
      this.log(`Currency: ${shop.currency || 'N/A'}`);
      this.log(`Money Format: ${shop.money_format || 'N/A'}`);
      this.log(`Weight Unit: ${shop.weight_unit || 'N/A'}`);
      this.log(`Created: ${new Date(shop.created_at).toLocaleString()}`);
      this.log(`Updated: ${new Date(shop.updated_at).toLocaleString()}`);

      // Plan information
      if (shop.plan_name || shop.plan_display_name) {
        this.log('\n💳 Plan Information:');
        this.log('─'.repeat(30));
        this.log(`Plan: ${shop.plan_display_name || shop.plan_name}`);
      }

      // Show locations if requested
      if (flags['show-locations'] && locationsResponse) {
        const locations = locationsResponse.data?.locations || [];
        this.log(`\n📍 Locations (${locations.length}):`);
        this.log('─'.repeat(50));
        
        if (locations.length === 0) {
          this.log('No locations configured');
        } else {
          this.log('ID'.padEnd(12) + 'Name'.padEnd(25) + 'City'.padEnd(15) + 'Active');
          this.log('─'.repeat(58));
          
          for (const location of locations) {
            const id = String(location.id).padEnd(12);
            const name = (location.name || 'Unnamed').slice(0, 23).padEnd(25);
            const city = (location.city || 'N/A').slice(0, 13).padEnd(15);
            const active = location.active ? '✅' : '❌';
            
            this.log(`${id}${name}${city}${active}`);
          }
        }
      }

      // Show policies if requested
      if (flags['show-policies'] && policies) {
        this.log(`\n📋 Store Policies (${policies.length}):`);
        this.log('─'.repeat(40));
        
        if (policies.length === 0) {
          this.log('No policies configured');
        } else {
          for (const policy of policies) {
            this.log(`${policy.title || 'Untitled'}: ${policy.handle}`);
            if (policy.body) {
              const preview = policy.body.replaceAll(/\<[^\>]*\>/g, '').slice(0, 100);
              this.log(`  ${preview}${preview.length === 100 ? '...' : ''}`);
            }

            this.log('');
          }
        }
      }

      // Show currencies if requested
      if (flags['show-currencies'] && currencies) {
        this.log(`\n💰 Supported Currencies (${currencies.length}):`);
        this.log('─'.repeat(35));
        
        if (currencies.length === 0) {
          this.log('Only store currency supported');
        } else {
          const currencyList = currencies.map((c: any) => c.currency || c).join(', ');
          this.log(currencyList);
        }
      }

    } catch (error: any) {
      this.error(`Error: ${error.message}`);
    }
  }
}
