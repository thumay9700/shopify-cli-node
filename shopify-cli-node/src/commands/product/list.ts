import { Command, Flags } from '@oclif/core';

import { loadConfig, ShopifyAccount } from '../../config';
import { ShopifyApiFactory } from '../../services';
import { 
  InteractivePromptManager, 
  isInteractiveEnvironment,
  isScriptableMode,
  ScriptableOutputManager 
} from '../../utils';

export default class ProductList extends Command {
  static override description = 'List all products';
static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --account mystore',
    '<%= config.bin %> <%= command.id %> --status active --limit 50',
    '<%= config.bin %> <%= command.id %> --vendor "Nike" --product-type "Shoes"',
    '<%= config.bin %> <%= command.id %> --collection 123456',
    '<%= config.bin %> <%= command.id %> --use-proxy --geo US',
  ];
static override flags = {
    account: Flags.string({
      char: 'a',
      description: 'Shopify account to use (defaults to default account)',
    }),
    collection: Flags.integer({
      description: 'Filter by collection ID',
    }),
    'created-at-max': Flags.string({
      description: 'Show products created before date (ISO 8601 format)',
    }),
    'created-at-min': Flags.string({
      description: 'Show products created after date (ISO 8601 format)',
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
    limit: Flags.integer({
      char: 'l',
      default: 50,
      description: 'Number of products to retrieve',
    }),
    'no-interactive': Flags.boolean({
      default: false,
      description: 'Disable interactive prompts (scriptable mode)',
    }),
    'page-info': Flags.string({
      description: 'Page info for pagination',
    }),
    pretty: Flags.boolean({
      default: true,
      description: 'Pretty print JSON output',
    }),
    'product-type': Flags.string({
      description: 'Filter by product type',
    }),
    'since-id': Flags.integer({
      description: 'Restrict results to products created after the specified ID',
    }),
    status: Flags.string({
      description: 'Product status filter',
      options: ['active', 'archived', 'draft'],
    }),
    'updated-at-max': Flags.string({
      description: 'Show products last updated before date (ISO 8601 format)',
    }),
    'updated-at-min': Flags.string({
      description: 'Show products last updated after date (ISO 8601 format)',
    }),
    'use-proxy': Flags.boolean({
      default: false,
      description: 'Use proxy for requests',
    }),
    vendor: Flags.string({
      description: 'Filter by vendor name',
    }),
  };

  public async run(): Promise<void> {
    let { flags } = await this.parse(ProductList);

    // Determine if we're in interactive mode
    const isInteractive = flags.interactive && !flags['no-interactive'] && !isScriptableMode();
    
    // Initialize output manager for scriptable mode
    const outputManager = new ScriptableOutputManager('product:list');

    try {
      // Interactive prompting for filters
      if (isInteractive) {
        const promptManager = new InteractivePromptManager(true);
        await promptManager.initialize();

        // Prompt for account if not specified
        if (!flags.account) {
          const account = await promptManager.promptForAccount();
          flags.account = account.name;
        }

        // Define interactive prompts for common filters
        const prompts = {
          limit: {
            default: 50,
            message: 'Number of products to fetch:',
            validate(input: string) {
              const num = Number.parseInt(input, 10);
              if (isNaN(num) || num < 1 || num > 250) {
                return 'Please enter a number between 1 and 250';
              }

              return true;
            },
          },
          'product-type': {
            message: 'Filter by product type (optional):',
          },
          status: {
            choices: [
              { name: 'All products', value: '' },
              { name: 'Active products', value: 'active' },
              { name: 'Draft products', value: 'draft' },
              { name: 'Archived products', value: 'archived' },
            ],
            default: '',
            message: 'Filter by product status (optional):',
          },
          vendor: {
            message: 'Filter by vendor (optional):',
          },
        };

        // Prompt for missing values
        flags = await promptManager.promptForMissingFlags(flags, prompts);
        
        // Clean up empty values
        if (!flags.status) delete flags.status;
        if (!flags.vendor) delete flags.vendor;
        if (!flags['product-type']) delete flags['product-type'];
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

      // Build query parameters
      const params: any = {
        limit: flags.limit,
      };

      if (flags['page-info']) params.page_info = flags['page-info'];
      if (flags['since-id']) params.since_id = flags['since-id'];
      if (flags['created-at-min']) params.created_at_min = flags['created-at-min'];
      if (flags['created-at-max']) params.created_at_max = flags['created-at-max'];
      if (flags['updated-at-min']) params.updated_at_min = flags['updated-at-min'];
      if (flags['updated-at-max']) params.updated_at_max = flags['updated-at-max'];
      if (flags.status) params.status = flags.status;
      if (flags.vendor) params.vendor = flags.vendor;
      if (flags['product-type']) params.product_type = flags['product-type'];
      if (flags.collection) params.collection_id = flags.collection;

      // Fetch products
      if (!isScriptableMode()) {
        this.log(`📦 Fetching products from ${account.name}...`);
      }

      const response = await apiClient.products.list(params);

      if (!response.data || !response.data.products) {
        const errorResponse = outputManager.error('PRODUCTS_FETCH_FAILED', 'Failed to fetch products');
        if (isScriptableMode() || flags.format === 'json') {
          this.log(outputManager.output(errorResponse, { format: flags.format as any, pretty: flags.pretty }));
          return;
        }

        this.error('Failed to fetch products');
      }

      const {products} = response.data;

      // Create success response with pagination info
      const successData = {
        count: products.length,
        metadata: {
          filters: {
            limit: flags.limit,
            productType: flags['product-type'],
            status: flags.status,
            vendor: flags.vendor,
          },
          pagination: {
            hasMore: Boolean(response.headers && (response.headers.link || response.headers.Link)),
          },
        },
        products,
      };

      const successResponse = outputManager.success(successData);
      
      // Output in requested format
      if (isScriptableMode() || flags.format === 'json') {
        const output = outputManager.output(successResponse, {
          fields: flags.fields ? flags.fields.split(',') : undefined,
          format: flags.format as 'csv' | 'json' | 'table',
          pretty: flags.pretty,
        });
        this.log(output);
        return;
      }

      // Enhanced table format for interactive mode
      this.log(`\n✅ Found ${products.length} products`);
      
      if (products.length === 0) {
        this.log('\nNo products found matching the criteria.');
        if (isInteractive) {
          this.log('\nTry adjusting your filters or check if you have products in your store.');
        }

        return;
      }

      this.log('\n📋 Products:');
      this.log('ID'.padEnd(12) + 'Title'.padEnd(30) + 'Status'.padEnd(10) + 'Type'.padEnd(15) + 'Vendor'.padEnd(15) + 'Created');
      this.log('─'.repeat(97));

      for (const product of products) {
        const id = String(product.id).padEnd(12);
        const title = (product.title || '').slice(0, 28).padEnd(30);
        const status = (product.status || '').padEnd(10);
        const productType = (product.product_type || '').slice(0, 13).padEnd(15);
        const vendor = (product.vendor || '').slice(0, 13).padEnd(15);
        const created = new Date(product.created_at).toLocaleDateString();

        this.log(`${id}${title}${status}${productType}${vendor}${created}`);
      }

      // Show applied filters
      const appliedFilters = [];
      if (flags.status) appliedFilters.push(`Status: ${flags.status}`);
      if (flags.vendor) appliedFilters.push(`Vendor: ${flags.vendor}`);
      if (flags['product-type']) appliedFilters.push(`Type: ${flags['product-type']}`);
      if (appliedFilters.length > 0) {
        this.log(`\n🔍 Filters applied: ${appliedFilters.join(', ')}`);
      }

      // Show pagination info if available
      if (response.headers && (response.headers.link || response.headers.Link)) {
        this.log('\n📄 More products available - use --page-info flag for pagination');
      }

      // Show proxy info if used
      if (flags['use-proxy']) {
        this.log(`\n🌐 Request made through proxy${flags.geo ? ` with geo filter: ${flags.geo}` : ''}`);
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
