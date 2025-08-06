import { Args, Command, Flags } from '@oclif/core';

import { loadConfig, ShopifyAccount } from '../../config';
import { ShopifyApiFactory } from '../../services';

export default class ProductGet extends Command {
  static override args = {
    id: Args.string({
      description: 'Product ID to retrieve',
      required: true,
    }),
  };
static override description = 'Get a specific product by ID';
static override examples = [
    '<%= config.bin %> <%= command.id %> 123456789',
    '<%= config.bin %> <%= command.id %> 123456789 --account mystore',
    '<%= config.bin %> <%= command.id %> 123456789 --fields title,status,vendor',
    '<%= config.bin %> <%= command.id %> 123456789 --use-proxy --geo CA',
    '<%= config.bin %> <%= command.id %> 123456789 --format json',
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
    'show-variants': Flags.boolean({
      default: false,
      description: 'Show product variants',
    }),
    'use-proxy': Flags.boolean({
      default: false,
      description: 'Use proxy for requests',
    }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(ProductGet);

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

      // Fetch product
      this.log(`📦 Fetching product ${args.id} from ${account.name}...`);
      const startTime = Date.now();

      const response = await apiClient.products.get(args.id, fields);
      const duration = Date.now() - startTime;

      if (!response.data || !response.data.product) {
        this.error(`Product ${args.id} not found`);
      }

      const {product} = response.data;

      // Display results
      if (flags.format === 'json') {
        this.log(JSON.stringify(product, null, 2));
        return;
      }

      // Table format (default)
      this.log(`\n✅ Product retrieved (${duration}ms)`);
      this.log('\n📦 Product Details:');
      this.log('─'.repeat(50));
      
      this.log(`ID: ${product.id}`);
      this.log(`Title: ${product.title}`);
      this.log(`Handle: ${product.handle}`);
      this.log(`Status: ${product.status}`);
      this.log(`Product Type: ${product.product_type || 'N/A'}`);
      this.log(`Vendor: ${product.vendor || 'N/A'}`);
      this.log(`Tags: ${product.tags || 'None'}`);
      this.log(`Created: ${new Date(product.created_at).toLocaleString()}`);
      this.log(`Updated: ${new Date(product.updated_at).toLocaleString()}`);
      
      if (product.body_html) {
        const plainText = product.body_html.replaceAll(/<[^>]*>/g, '').slice(0, 200);
        this.log(`Description: ${plainText}${plainText.length === 200 ? '...' : ''}`);
      }

      // Show variants if requested or if there are multiple variants
      if (flags['show-variants'] || (product.variants && product.variants.length > 1)) {
        this.log('\n🔄 Variants:');
        this.log('ID'.padEnd(12) + 'Title'.padEnd(25) + 'SKU'.padEnd(20) + 'Price'.padEnd(10) + 'Inventory');
        this.log('─'.repeat(72));

        for (const variant of product.variants || []) {
          const id = String(variant.id).padEnd(12);
          const title = (variant.title || 'Default').slice(0, 23).padEnd(25);
          const sku = (variant.sku || '').slice(0, 18).padEnd(20);
          const price = `$${variant.price || '0.00'}`.padEnd(10);
          const inventory = variant.inventory_quantity === null ? 
            'N/A' : String(variant.inventory_quantity);

          this.log(`${id}${title}${sku}${price}${inventory}`);
        }
      }

      // Show images if any
      if (product.images && product.images.length > 0) {
        this.log(`\n🖼️  Images: ${product.images.length} image(s)`);
        for (let i = 0; i < Math.min(3, product.images.length); i++) {
          const image = product.images[i];
          this.log(`  ${i + 1}. ${image.src}`);
        }

        if (product.images.length > 3) {
          this.log(`  ... and ${product.images.length - 3} more`);
        }
      }

      // Show options if any
      if (product.options && product.options.length > 0) {
        this.log('\n⚙️  Options:');
        for (const option of product.options) {
          this.log(`  ${option.name}: ${option.values?.join(', ') || 'N/A'}`);
        }
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
