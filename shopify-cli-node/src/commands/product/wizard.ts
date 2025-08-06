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

export default class ProductWizard extends Command {
  static override description = 'Interactive wizard to create a product with guided prompts';
static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --account mystore',
    '<%= config.bin %> <%= command.id %> --format json',
    '<%= config.bin %> <%= command.id %> --no-interactive --title "Product" --price 19.99',
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
      options: ['json', 'table', 'csv'],
    }),
    help: Flags.help({ char: 'h' }),
    'no-interactive': Flags.boolean({
      default: false,
      description: 'Disable interactive prompts (requires all flags)',
    }),
    pretty: Flags.boolean({
      default: true,
      description: 'Pretty print JSON output',
    }),
    price: Flags.string({
      description: 'Product price (required in non-interactive mode)',
    }),
    // Required for non-interactive mode
    title: Flags.string({
      description: 'Product title (required in non-interactive mode)',
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(ProductWizard);

    // Determine if we're in interactive mode
    const isInteractive = !flags['no-interactive'] && isInteractiveEnvironment() && !isScriptableMode();
    
    // Initialize output manager for scriptable mode
    const outputManager = new ScriptableOutputManager('product:wizard');

    try {
      await (isInteractive ? this.runInteractiveWizard(flags, outputManager) : this.runScriptableMode(flags, outputManager));
    } catch (error: any) {
      const errorResponse = outputManager.error('EXECUTION_ERROR', error.message, { stack: error.stack });
      
      if (isScriptableMode() || flags.format === 'json') {
        this.log(outputManager.output(errorResponse, { format: flags.format as any, pretty: flags.pretty }));
        process.exit(1);
      }
      
      this.error(`Error: ${error.message}`);
    }
  }

  private async createProduct(
    wizardResults: any, 
    account: ShopifyAccount, 
    flags: any, 
    outputManager: ScriptableOutputManager
  ): Promise<void> {
    // Create API client
    const apiClient = ShopifyApiFactory.create(account);

    // Build product data
    const productData: any = {
      status: wizardResults.basic.status,
      title: wizardResults.basic.title,
    };

    if (wizardResults.basic.description) {
      productData.body_html = wizardResults.basic.description;
    }

    if (wizardResults.details.type) {
      productData.product_type = wizardResults.details.type;
    }

    if (wizardResults.details.vendor) {
      productData.vendor = wizardResults.details.vendor;
    }

    if (wizardResults.details.tags) {
      productData.tags = wizardResults.details.tags;
    }

    // Add variant with pricing
    productData.variants = [{
      fulfillment_service: 'manual',
      inventory_management: 'shopify',
      inventory_quantity: Number.parseInt(wizardResults.pricing.inventory || '0', 10),
      price: wizardResults.pricing.price,
      requires_shipping: true,
      taxable: true,
      title: 'Default Title',
    }];

    if (wizardResults.pricing.sku) {
      productData.variants[0].sku = wizardResults.pricing.sku;
    }

    if (wizardResults.pricing.comparePrice) {
      productData.variants[0].compare_at_price = wizardResults.pricing.comparePrice;
    }

    // Create the product
    if (!isScriptableMode() && flags.format !== 'json') {
      this.log(`\n📦 Creating product "${productData.title}" on ${account.name}...`);
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
    if (isScriptableMode() || flags.format === 'json') {
      const output = outputManager.output(successResponse, {
        format: flags.format as 'csv' | 'json' | 'table',
        pretty: flags.pretty,
      });
      this.log(output);
      return;
    }

    // Enhanced output for interactive mode
    this.log(`\n✅ Product created successfully!`);
    this.log('\n🎉 Your new product is ready:');
    this.log('─'.repeat(50));
    this.log(`📦 ${product.title}`);
    this.log(`🆔 ID: ${product.id}`);
    this.log(`🔗 Handle: ${product.handle}`);
    this.log(`📊 Status: ${product.status}`);
    this.log(`💰 Price: $${product.variants[0]?.price || '0.00'}`);
    this.log(`🌐 URL: https://${account.shopUrl}/admin/products/${product.id}`);
    
    this.log('\n🚀 Next steps:');
    this.log('• Add product images');
    this.log('• Configure SEO settings');
    this.log('• Set up product collections');
    this.log(`• View in admin: https://${account.shopUrl}/admin/products/${product.id}`);
  }

  private async runInteractiveWizard(flags: any, outputManager: ScriptableOutputManager): Promise<void> {
    const promptManager = new InteractivePromptManager(true);
    await promptManager.initialize();

    this.log('🧙‍♂️ Welcome to the Shopify Product Creation Wizard!');
    this.log('This wizard will guide you through creating a new product.\n');

    // Step 1: Account Selection
    let account: ShopifyAccount;
    if (flags.account) {
      const config = await loadConfig();
      const foundAccount = config.accounts.find((acc: ShopifyAccount) => acc.name === flags.account);
      if (!foundAccount) {
        this.error(`Account '${flags.account}' not found.`);
      }

      account = foundAccount;
    } else {
      account = await promptManager.promptForAccount();
    }

    outputManager.setAccount(account.name);
    this.log(`✅ Using account: ${account.name} (${account.shopUrl})\n`);

    // Step 2: Product Wizard
    const wizardSteps = [
      {
        message: 'Step 1: Basic Product Information',
        name: 'basic',
        questions: [
          {
            message: 'Product title:',
            name: 'title',
            type: 'input',
            validate: validators.required,
          },
          {
            message: 'Product description (optional):',
            name: 'description',
            type: 'input',
          },
          {
            choices: [
              { name: 'Draft (hidden from customers)', value: 'draft' },
              { name: 'Active (visible to customers)', value: 'active' },
              { name: 'Archived (hidden and discontinued)', value: 'archived' },
            ],
            default: 'draft',
            message: 'Product status:',
            name: 'status',
            type: 'list',
          },
        ],
      },
      {
        message: 'Step 2: Product Details',
        name: 'details',
        questions: [
          {
            message: 'Product type (e.g., "T-Shirt", "Book", "Electronics"):',
            name: 'type',
            type: 'input',
          },
          {
            message: 'Vendor/Brand name:',
            name: 'vendor',
            type: 'input',
          },
          {
            message: 'Tags (comma-separated):',
            name: 'tags',
            type: 'input',
          },
        ],
      },
      {
        message: 'Step 3: Pricing & Inventory',
        name: 'pricing',
        questions: [
          {
            message: 'Price:',
            name: 'price',
            type: 'input',
            validate(input: string) {
              if (!input || input.trim() === '') return 'Price is required';
              return validators.price(input);
            },
          },
          {
            message: 'Compare at price (optional, for showing discounts):',
            name: 'comparePrice',
            type: 'input',
            validate(input: string) {
              if (!input || input.trim() === '') return true;
              return validators.price(input);
            },
          },
          {
            message: 'SKU (Stock Keeping Unit):',
            name: 'sku',
            type: 'input',
          },
          {
            default: '0',
            message: 'Initial inventory quantity:',
            name: 'inventory',
            type: 'input',
            validate(input: string) {
              if (!input || input.trim() === '') return true;
              return validators.integer(input);
            },
          },
        ],
      },
    ];

    const wizardResults = await promptManager.runWizard(wizardSteps);

    // Confirmation step
    this.log('\n📋 Product Summary:');
    this.log('─'.repeat(40));
    this.log(`Title: ${wizardResults.basic.title}`);
    this.log(`Status: ${wizardResults.basic.status}`);
    this.log(`Price: $${wizardResults.pricing.price}`);
    if (wizardResults.details.type) this.log(`Type: ${wizardResults.details.type}`);
    if (wizardResults.details.vendor) this.log(`Vendor: ${wizardResults.details.vendor}`);
    this.log('─'.repeat(40));

    const confirmed = await promptManager.confirmAction('Create this product?', true);
    if (!confirmed) {
      this.log('Product creation cancelled.');
      return;
    }

    // Create the product
    await this.createProduct(wizardResults, account, flags, outputManager);
  }

  private async runScriptableMode(flags: any, outputManager: ScriptableOutputManager): Promise<void> {
    // Validate required fields for scriptable mode
    if (!flags.title || !flags.price) {
      const errorResponse = outputManager.error(
        'MISSING_REQUIRED_FIELDS', 
        'In non-interactive mode, --title and --price are required'
      );
      this.log(outputManager.output(errorResponse, { format: flags.format as any, pretty: flags.pretty }));
      return;
    }

    const config = await loadConfig();
    let account: ShopifyAccount;
    
    if (flags.account) {
      const foundAccount = config.accounts.find((acc: ShopifyAccount) => acc.name === flags.account);
      if (!foundAccount) {
        const errorResponse = outputManager.error('ACCOUNT_NOT_FOUND', `Account '${flags.account}' not found.`);
        this.log(outputManager.output(errorResponse, { format: flags.format as any, pretty: flags.pretty }));
        return;
      }

      account = foundAccount;
    } else {
      const defaultAccount = config.accounts.find((acc: ShopifyAccount) => acc.isDefault) || config.accounts[0];
      if (!defaultAccount) {
        const errorResponse = outputManager.error('NO_ACCOUNTS', 'No Shopify accounts configured.');
        this.log(outputManager.output(errorResponse, { format: flags.format as any, pretty: flags.pretty }));
        return;
      }

      account = defaultAccount;
    }

    outputManager.setAccount(account.name);

    // Map flags to wizard format for consistency
    const wizardResults = {
      basic: {
        description: '',
        status: 'draft',
        title: flags.title,
      },
      details: {
        tags: '',
        type: '',
        vendor: '',
      },
      pricing: {
        comparePrice: '',
        inventory: '0',
        price: flags.price,
        sku: '',
      },
    };

    await this.createProduct(wizardResults, account, flags, outputManager);
  }
}
