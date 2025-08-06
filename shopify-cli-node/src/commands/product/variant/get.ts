import { Args, Command, Flags } from '@oclif/core';

import { loadConfig, ShopifyAccount } from '../../../config';
import { ShopifyApiFactory } from '../../../services';

export default class ProductVariantGet extends Command {
  static override args = {
    id: Args.string({
      description: 'Variant ID to retrieve',
      required: true,
    }),
  };
static override description = 'Get a specific product variant by ID';
static override examples = [
    '<%= config.bin %> <%= command.id %> 987654321',
    '<%= config.bin %> <%= command.id %> 987654321 --account mystore',
    '<%= config.bin %> <%= command.id %> 987654321 --fields id,title,price,inventory_quantity',
    '<%= config.bin %> <%= command.id %> 987654321 --use-proxy --geo US',
    '<%= config.bin %> <%= command.id %> 987654321 --format json',
  ];
static override flags = {
    account: Flags.string({
      char: 'a',
      description: 'Shopify account to use (defaults to default account)',
    }),
    fields: Flags.string({
      description: 'Comma-separated list of fields to retrieve',
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
    'use-proxy': Flags.boolean({
      default: false,
      description: 'Use proxy for requests',
    }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(ProductVariantGet);

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

      // Parse fields if provided
      const fields = flags.fields ? flags.fields.split(',').map(f => f.trim()) : undefined;

      // Fetch variant
      this.log(`🔄 Fetching variant ${args.id} from ${account.name}...`);
      const startTime = Date.now();

      const response = await apiClient.variants.get(args.id, fields);
      const duration = Date.now() - startTime;

      if (!response.data || !response.data.variant) {
        this.error(`Variant ${args.id} not found`);
      }

      const {variant} = response.data;

      // Display results
      if (flags.format === 'json') {
        this.log(JSON.stringify(variant, null, 2));
        return;
      }

      // Table format (default)
      this.log(`\n✅ Variant retrieved (${duration}ms)`);
      this.log('\n🔄 Variant Details:');
      this.log('─'.repeat(50));
      
      this.log(`ID: ${variant.id}`);
      this.log(`Product ID: ${variant.product_id}`);
      this.log(`Title: ${variant.title || 'Default Title'}`);
      this.log(`SKU: ${variant.sku || 'No SKU'}`);
      this.log(`Barcode: ${variant.barcode || 'No barcode'}`);
      this.log(`Price: $${variant.price || '0.00'}`);
      
      if (variant.compare_at_price) {
        this.log(`Compare Price: $${variant.compare_at_price}`);
      }

      this.log(`Position: ${variant.position || 'N/A'}`);
      
      // Inventory details
      this.log('\n📦 Inventory:');
      this.log(`  Quantity: ${variant.inventory_quantity === null ? 'N/A' : variant.inventory_quantity}`);
      this.log(`  Management: ${variant.inventory_management || 'None'}`);
      this.log(`  Policy: ${variant.inventory_policy || 'deny'}`);
      this.log(`  Item ID: ${variant.inventory_item_id || 'N/A'}`);

      // Shipping details
      this.log('\n🚚 Shipping:');
      this.log(`  Requires Shipping: ${variant.requires_shipping ? 'Yes' : 'No'}`);
      this.log(`  Weight: ${variant.weight || 0} ${variant.weight_unit || 'kg'}`);
      this.log(`  Fulfillment Service: ${variant.fulfillment_service || 'manual'}`);

      // Tax and options
      this.log('\n💰 Other Details:');
      this.log(`  Taxable: ${variant.taxable ? 'Yes' : 'No'}`);
      this.log(`  Tax Code: ${variant.tax_code || 'None'}`);
      
      // Show variant options
      const options = [variant.option1, variant.option2, variant.option3].filter(Boolean);
      if (options.length > 0) {
        this.log(`  Options: ${options.join(' / ')}`);
      }

      // Timestamps
      this.log('\n📅 Timestamps:');
      this.log(`  Created: ${new Date(variant.created_at).toLocaleString()}`);
      this.log(`  Updated: ${new Date(variant.updated_at).toLocaleString()}`);

      // Show image if available
      if (variant.image_id) {
        this.log(`\n🖼️  Image ID: ${variant.image_id}`);
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
