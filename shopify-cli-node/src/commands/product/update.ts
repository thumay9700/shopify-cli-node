import { Args, Command, Flags } from '@oclif/core';

import { loadConfig, ShopifyAccount } from '../../config';
import { ShopifyApiFactory } from '../../services';

export default class ProductUpdate extends Command {
  static override args = {
    id: Args.string({
      description: 'Product ID to update',
      required: true,
    }),
  };
static override description = 'Update an existing product';
static override examples = [
    '<%= config.bin %> <%= command.id %> 123456789 --title "Updated Product"',
    '<%= config.bin %> <%= command.id %> 123456789 --status active',
    '<%= config.bin %> <%= command.id %> 123456789 --title "New Title" --vendor "Nike"',
    '<%= config.bin %> <%= command.id %> 123456789 --json \'{"title": "Updated via JSON"}\'',
    '<%= config.bin %> <%= command.id %> 123456789 --title "Product" --use-proxy --geo CA',
  ];
static override flags = {
    account: Flags.string({
      char: 'a',
      description: 'Shopify account to use (defaults to default account)',
    }),
    description: Flags.string({
      char: 'd',
      description: 'Product description (HTML allowed)',
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
    json: Flags.string({
      description: 'Raw JSON product data (overrides other flags)',
    }),
    'seo-description': Flags.string({
      description: 'SEO description',
    }),
    'seo-title': Flags.string({
      description: 'SEO title',
    }),
    status: Flags.string({
      description: 'Product status',
      options: ['active', 'archived', 'draft'],
    }),
    tags: Flags.string({
      description: 'Comma-separated list of tags',
    }),
    title: Flags.string({
      char: 't',
      description: 'Product title',
    }),
    type: Flags.string({
      description: 'Product type',
    }),
    'use-proxy': Flags.boolean({
      default: false,
      description: 'Use proxy for requests',
    }),
    vendor: Flags.string({
      description: 'Product vendor',
    }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(ProductUpdate);

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

      // Build update data
      let updateData: any;

      if (flags.json) {
        try {
          updateData = JSON.parse(flags.json);
        } catch {
          this.error('Invalid JSON format in --json flag');
        }
      } else {
        // Build update from flags
        updateData = {};

        if (flags.title) updateData.title = flags.title;
        if (flags.description) updateData.body_html = flags.description;
        if (flags.type) updateData.product_type = flags.type;
        if (flags.vendor) updateData.vendor = flags.vendor;
        if (flags.tags) updateData.tags = flags.tags;
        if (flags.status) updateData.status = flags.status;

        // SEO fields
        if (flags['seo-title'] || flags['seo-description']) {
          updateData.seo_title = flags['seo-title'];
          updateData.seo_description = flags['seo-description'];
        }

        // Check if any update data was provided
        if (Object.keys(updateData).length === 0) {
          this.error('No update data provided. Use flags like --title, --status, or --json to specify changes.');
        }
      }

      // Update product
      this.log(`📦 Updating product ${args.id} on ${account.name}...`);
      const startTime = Date.now();

      const response = await apiClient.products.update(args.id, updateData);
      const duration = Date.now() - startTime;

      if (!response.data || !response.data.product) {
        this.error(`Failed to update product ${args.id}`);
      }

      const {product} = response.data;

      // Display results
      if (flags.format === 'json') {
        this.log(JSON.stringify(product, null, 2));
        return;
      }

      // Table format (default)
      this.log(`\n✅ Product updated successfully (${duration}ms)`);
      this.log('\n📦 Updated Product Details:');
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

      // Show what was updated
      this.log('\n🔄 Changes Applied:');
      const changes = Object.keys(updateData);
      if (changes.length > 0) {
        for (const field of changes) {
          let displayField = field;
          let displayValue = updateData[field];

          // Format field names for display
          switch (field) {
            case 'body_html': {
              displayField = 'Description';
              displayValue = displayValue?.slice(0, 100) + (displayValue?.length > 100 ? '...' : '');
              break;
            }

            case 'product_type': {
              displayField = 'Product Type';
              break;
            }

            case 'seo_description': {
              displayField = 'SEO Description';
              break;
            }

            case 'seo_title': {
              displayField = 'SEO Title';
              break;
            }

            default: {
              displayField = field.charAt(0).toUpperCase() + field.slice(1);
            }
          }

          this.log(`  • ${displayField}: ${displayValue}`);
        }
      }

      this.log(`\n🌐 Product URL: https://${account.shopUrl}/admin/products/${product.id}`);

      // Show proxy info if used
      if (flags['use-proxy']) {
        this.log(`\n🔗 Request made through proxy${flags.geo ? ` with geo filter: ${flags.geo}` : ''}`);
      }

    } catch (error: any) {
      this.error(`Error: ${error.message}`);
    }
  }
}
