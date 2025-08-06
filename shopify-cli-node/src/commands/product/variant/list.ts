import { Args, Command, Flags } from '@oclif/core';

import { loadConfig, ShopifyAccount } from '../../../config';
import { ShopifyApiFactory } from '../../../services';

export default class ProductVariantList extends Command {
  static override args = {
    productId: Args.string({
      description: 'Product ID to list variants for',
      required: true,
    }),
  };
static override description = 'List all variants for a product';
static override examples = [
    '<%= config.bin %> <%= command.id %> 123456789',
    '<%= config.bin %> <%= command.id %> 123456789 --account mystore',
    '<%= config.bin %> <%= command.id %> 123456789 --limit 25',
    '<%= config.bin %> <%= command.id %> 123456789 --use-proxy --geo CA',
    '<%= config.bin %> <%= command.id %> 123456789 --format json',
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
    geo: Flags.string({
      description: 'Geo filter (country code)',
    }),
    help: Flags.help({ char: 'h' }),
    limit: Flags.integer({
      char: 'l',
      default: 50,
      description: 'Number of variants to retrieve',
    }),
    'page-info': Flags.string({
      description: 'Page info for pagination',
    }),
    'use-proxy': Flags.boolean({
      default: false,
      description: 'Use proxy for requests',
    }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(ProductVariantList);

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

      // Create API client with proxy settings if needed
      const apiClient = ShopifyApiFactory.create(account, {
        geoFilter: flags.geo,
        useProxy: flags['use-proxy'],
      });

      // Build query parameters
      const params: any = {
        limit: flags.limit,
      };

      if (flags['page-info']) params.page_info = flags['page-info'];

      // Fetch variants
      this.log(`🔄 Fetching variants for product ${args.productId} from ${account.name}...`);
      const startTime = Date.now();

      const response = await apiClient.variants.list(args.productId, params);
      const duration = Date.now() - startTime;

      if (!response.data || !response.data.variants) {
        this.error('Failed to fetch variants');
      }

      const {variants} = response.data;

      // Display results
      if (flags.format === 'json') {
        this.log(JSON.stringify(variants, null, 2));
        return;
      }

      // Table format (default)
      this.log(`\n✅ Found ${variants.length} variants (${duration}ms)`);
      
      if (variants.length === 0) {
        this.log('No variants found for this product.');
        return;
      }

      this.log('\n🔄 Product Variants:');
      this.log('ID'.padEnd(12) + 'Title'.padEnd(25) + 'SKU'.padEnd(20) + 'Price'.padEnd(10) + 'Inventory'.padEnd(10) + 'Weight');
      this.log('─'.repeat(87));

      for (const variant of variants) {
        const id = String(variant.id).padEnd(12);
        const title = (variant.title || 'Default Title').slice(0, 23).padEnd(25);
        const sku = (variant.sku || '').slice(0, 18).padEnd(20);
        const price = `$${variant.price || '0.00'}`.padEnd(10);
        const inventory = (variant.inventory_quantity === null ? 'N/A' : String(variant.inventory_quantity)).padEnd(10);
        const weight = variant.weight ? `${variant.weight}${variant.weight_unit || ''}` : 'N/A';

        this.log(`${id}${title}${sku}${price}${inventory}${weight}`);
      }

      // Show additional details
      this.log('\n📊 Variant Details:');
      for (const variant of variants.slice(0, 5)) { // Show details for first 5 variants
        this.log(`\n• Variant ${variant.id}:`);
        this.log(`  Title: ${variant.title || 'Default Title'}`);
        this.log(`  SKU: ${variant.sku || 'No SKU'}`);
        this.log(`  Price: $${variant.price || '0.00'}`);
        if (variant.compare_at_price) {
          this.log(`  Compare Price: $${variant.compare_at_price}`);
        }

        this.log(`  Inventory: ${variant.inventory_quantity === null ? 'N/A' : variant.inventory_quantity}`);
        this.log(`  Weight: ${variant.weight || 0}${variant.weight_unit || 'kg'}`);
        this.log(`  Requires Shipping: ${variant.requires_shipping ? 'Yes' : 'No'}`);
        this.log(`  Taxable: ${variant.taxable ? 'Yes' : 'No'}`);
        
        // Show variant options
        if (variant.option1 || variant.option2 || variant.option3) {
          const options = [variant.option1, variant.option2, variant.option3].filter(Boolean);
          this.log(`  Options: ${options.join(' / ')}`);
        }
      }

      if (variants.length > 5) {
        this.log(`\n... and ${variants.length - 5} more variants. Use --format json to see all details.`);
      }

      // Show pagination info if available
      if (response.headers && (response.headers.link || response.headers.Link)) {
        this.log('\n📄 Pagination available - use --page-info flag for next page');
      }

      // Show proxy info if used
      if (flags['use-proxy']) {
        this.log(`\n🌐 Request made through proxy${flags.geo ? ` with geo filter: ${flags.geo}` : ''}`);
      }

    } catch (error: any) {
      this.error(`Error: ${error.message}`);
    }
  }
}
