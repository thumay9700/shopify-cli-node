import { Command, Flags } from '@oclif/core';

import { loadConfig, ShopifyAccount } from '../../config';
import { ShopifyApiFactory } from '../../services';
import { 
  InteractivePromptManager, 
  isInteractiveEnvironment,
  isScriptableMode,
  ScriptableOutputManager,
  validators 
} from '../../utils';

export default class ProductCreate extends Command {
  static override description = 'Create a new product';
static override examples = [
    '<%= config.bin %> <%= command.id %> --title "New Product"',
    '<%= config.bin %> <%= command.id %> --title "T-Shirt" --type "Apparel" --vendor "Nike"',
    '<%= config.bin %> <%= command.id %> --title "Sneakers" --price 99.99 --sku "SNKR-001"',
    '<%= config.bin %> <%= command.id %> --title "Product" --json \'{"title": "Custom Product"}\'',
    '<%= config.bin %> <%= command.id %> --title "Product" --use-proxy --geo US',
  ];
static override flags = {
    account: Flags.string({
      char: 'a',
      description: 'Shopify account to use (defaults to default account)',
    }),
    'compare-price': Flags.string({
      description: 'Compare at price (for default variant)',
    }),
    'continue-selling': Flags.boolean({
      default: false,
      description: 'Continue selling when out of stock',
    }),
    description: Flags.string({
      char: 'd',
      description: 'Product description (HTML allowed)',
    }),
    fields: Flags.string({
      description: 'Comma-separated list of fields to include in output',
    }),
    format: Flags.string({
      char: 'f',
      default: 'table',
      description: 'Output format',
      options: ['json', 'table', 'csv'],
    }),
    geo: Flags.string({
      description: 'Geo filter (country code)',
    }),
    help: Flags.help({ char: 'h' }),
    interactive: Flags.boolean({
      default: isInteractiveEnvironment(),
      description: 'Enable interactive prompts for missing values',
    }),
    inventory: Flags.integer({
      description: 'Inventory quantity (for default variant)',
    }),
    json: Flags.string({
      description: 'Raw JSON product data (overrides other flags)',
    }),
    'no-interactive': Flags.boolean({
      default: false,
      description: 'Disable interactive prompts (scriptable mode)',
    }),
    pretty: Flags.boolean({
      default: true,
      description: 'Pretty print JSON output',
    }),
    price: Flags.string({
      description: 'Product price (for default variant)',
    }),
    'requires-shipping': Flags.boolean({
      default: true,
      description: 'Product requires shipping',
    }),
    sku: Flags.string({
      description: 'SKU (for default variant)',
    }),
    status: Flags.string({
      default: 'draft',
      description: 'Product status',
      options: ['active', 'archived', 'draft'],
    }),
    tags: Flags.string({
      description: 'Comma-separated list of tags',
    }),
    'taxable': Flags.boolean({
      default: true,
      description: 'Product is taxable',
    }),
    title: Flags.string({
      char: 't',
      description: 'Product title',
      required: false, // Will be prompted if missing in interactive mode
    }),
    'track-inventory': Flags.boolean({
      default: true,
      description: 'Track inventory for default variant',
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
    weight: Flags.string({
      description: 'Product weight (for default variant)',
    }),
    'weight-unit': Flags.string({
      default: 'kg',
      description: 'Weight unit',
      options: ['g', 'kg', 'oz', 'lb'],
    }),
  };

  public async run(): Promise<void> {
    let { flags } = await this.parse(ProductCreate);

    // Determine if we're in interactive mode
    const isInteractive = flags.interactive && !flags['no-interactive'] && !isScriptableMode();
    
    // Initialize output manager for scriptable mode
    const outputManager = new ScriptableOutputManager('product:create');

    try {
      // Interactive prompting for missing values
      if (isInteractive) {
        const promptManager = new InteractivePromptManager(true);
        await promptManager.initialize();

        // Prompt for account if not specified
        if (!flags.account) {
          const account = await promptManager.promptForAccount();
          flags.account = account.name;
        }

        // Define interactive prompts for missing required/important fields
        const prompts = {
          description: {
            message: 'Product description (optional):',
          },
          price: {
            message: 'Product price (optional):',
            validate(input: string) {
              if (!input || input.trim() === '') return true; // Optional
              return validators.price(input);
            },
          },
          status: {
            choices: ['active', 'archived', 'draft'],
            default: 'draft',
            message: 'Product status:',
          },
          title: {
            message: 'Product title:',
            validate: validators.required,
          },
          type: {
            message: 'Product type (optional):',
          },
          vendor: {
            message: 'Product vendor (optional):',
          },
        };

        // Prompt for missing values
        flags = await promptManager.promptForMissingFlags(flags, prompts);

        // Validate required fields after prompting
        if (!flags.title) {
          this.error('Product title is required');
        }
      } else {
        // Scriptable mode: validate required fields
        if (!flags.title && !flags.json) {
          this.error('Product title is required. Use --title or --json flag.');
        }
      }

      // Load configuration
      const config = await loadConfig();

      // Get account to use
      let account: ShopifyAccount;
      if (flags.account) {
        const foundAccount = config.accounts.find((acc: ShopifyAccount) => acc.name === flags.account);
        if (!foundAccount) {
          const errorResponse = outputManager.error('ACCOUNT_NOT_FOUND', `Account '${flags.account}' not found.`);
          if (isScriptableMode() || flags.format === 'json') {
            this.log(outputManager.output(errorResponse, { format: flags.format as any, pretty: flags.pretty }));
            return;
          }

          this.error(`Account '${flags.account}' not found.`);
        }

        account = foundAccount;
      } else {
        const defaultAccount = config.accounts.find((acc: ShopifyAccount) => acc.isDefault) || config.accounts[0];
        if (!defaultAccount) {
          const errorResponse = outputManager.error('NO_ACCOUNTS', 'No Shopify accounts configured.');
          if (isScriptableMode() || flags.format === 'json') {
            this.log(outputManager.output(errorResponse, { format: flags.format as any, pretty: flags.pretty }));
            return;
          }

          this.error('No Shopify accounts configured.');
        }

        account = defaultAccount;
      }

      outputManager.setAccount(account.name);

      // Create API client with proxy settings if needed
      const apiClient = ShopifyApiFactory.create(account, {
        geoFilter: flags.geo,
        useProxy: flags['use-proxy'],
      });

      // Build product data
      let productData: any;

      if (flags.json) {
        try {
          productData = JSON.parse(flags.json);
        } catch (error: any) {
          const errorResponse = outputManager.error('INVALID_JSON', 'Invalid JSON format in --json flag', { error: error.message });
          if (isScriptableMode() || flags.format === 'json') {
            this.log(outputManager.output(errorResponse, { format: flags.format as any, pretty: flags.pretty }));
            return;
          }

          this.error('Invalid JSON format in --json flag');
        }
      } else {
        // Build product from flags
        productData = {
          status: flags.status,
          title: flags.title,
        };

        if (flags.description) productData.body_html = flags.description;
        if (flags.type) productData.product_type = flags.type;
        if (flags.vendor) productData.vendor = flags.vendor;
        if (flags.tags) productData.tags = flags.tags;

        // Add default variant if price or other variant info is provided
        if (flags.price || flags.sku || flags.inventory !== undefined || flags.weight) {
          productData.variants = [{
            fulfillment_service: 'manual',
            inventory_management: flags['track-inventory'] ? 'shopify' : null,
            inventory_policy: flags['continue-selling'] ? 'continue' : 'deny',
            inventory_quantity: flags.inventory || 0,
            price: flags.price || '0.00',
            requires_shipping: flags['requires-shipping'],
            sku: flags.sku || '',
            taxable: flags.taxable,
            title: 'Default Title',
            weight: flags.weight ? Number.parseFloat(flags.weight) : 0,
            weight_unit: flags['weight-unit'],
          }];

          if (flags['compare-price']) {
            productData.variants[0].compare_at_price = flags['compare-price'];
          }
        }
      }

      // Create product
      if (!isScriptableMode()) {
        this.log(`📦 Creating product "${productData.title || 'Untitled'}" on ${account.name}...`);
      }

      const response = await apiClient.products.create(productData);

      if (!response.data || !response.data.product) {
        const errorResponse = outputManager.error('PRODUCT_CREATE_FAILED', 'Failed to create product');
        if (isScriptableMode() || flags.format === 'json') {
          this.log(outputManager.output(errorResponse, { format: flags.format as any, pretty: flags.pretty }));
          return;
        }

        this.error('Failed to create product');
      }

      const {product} = response.data;
      
      // Create success response
      const successResponse = outputManager.success(product);
      
      // Output in requested format
      const output = outputManager.output(successResponse, {
        fields: flags.fields ? flags.fields.split(',') : undefined,
        format: flags.format as 'csv' | 'json' | 'table',
        pretty: flags.pretty,
      });

      // For scriptable mode or JSON format, output structured response
      if (isScriptableMode() || flags.format === 'json') {
        this.log(output);
        return;
      }

      // Enhanced table format for interactive mode
      this.log(`\n✅ Product created successfully`);
      this.log('\n📦 New Product Details:');
      this.log('─'.repeat(50));
      
      this.log(`ID: ${product.id}`);
      this.log(`Title: ${product.title}`);
      this.log(`Handle: ${product.handle}`);
      this.log(`Status: ${product.status}`);
      this.log(`Product Type: ${product.product_type || 'N/A'}`);
      this.log(`Vendor: ${product.vendor || 'N/A'}`);
      this.log(`Tags: ${product.tags || 'None'}`);
      this.log(`Created: ${new Date(product.created_at).toLocaleString()}`);

      // Show variants
      if (product.variants && product.variants.length > 0) {
        this.log('\n🔄 Variants:');
        this.log('ID'.padEnd(12) + 'Title'.padEnd(25) + 'SKU'.padEnd(20) + 'Price'.padEnd(10) + 'Inventory');
        this.log('─'.repeat(72));

        for (const variant of product.variants) {
          const id = String(variant.id).padEnd(12);
          const title = (variant.title || 'Default').slice(0, 23).padEnd(25);
          const sku = (variant.sku || '').slice(0, 18).padEnd(20);
          const price = `$${variant.price || '0.00'}`.padEnd(10);
          const inventory = variant.inventory_quantity === null ? 
            'N/A' : String(variant.inventory_quantity);

          this.log(`${id}${title}${sku}${price}${inventory}`);
        }
      }

      this.log(`\n🌐 Product URL: https://${account.shopUrl}/admin/products/${product.id}`);

      // Show proxy info if used
      if (flags['use-proxy']) {
        this.log(`\n🔗 Request made through proxy${flags.geo ? ` with geo filter: ${flags.geo}` : ''}`);
      }

    } catch (error: any) {
      const errorResponse = outputManager.error('EXECUTION_ERROR', error.message, { stack: error.stack });
      
      if (isScriptableMode() || flags.format === 'json') {
        this.log(outputManager.output(errorResponse, { format: flags.format as any, pretty: flags.pretty }));
        process.exit(1);
      }
      
      this.error(`Error: ${error.message}`);
    }
  }
}
