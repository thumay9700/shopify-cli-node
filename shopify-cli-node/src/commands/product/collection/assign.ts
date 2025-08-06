import { Args, Command, Flags } from '@oclif/core';

import { loadConfig, ShopifyAccount } from '../../../config';
import { ShopifyApiFactory } from '../../../services';

export default class ProductCollectionAssign extends Command {
  static override args = {
    collectionId: Args.string({
      description: 'Collection ID to assign product to',
      required: true,
    }),
    productId: Args.string({
      description: 'Product ID to assign to collection',
      required: true,
    }),
  };
static override description = 'Assign a product to a collection';
static override examples = [
    '<%= config.bin %> <%= command.id %> 123456789 987654321',
    '<%= config.bin %> <%= command.id %> 123456789 987654321 --account mystore',
    '<%= config.bin %> <%= command.id %> 123456789 987654321 --use-proxy --geo CA',
    '<%= config.bin %> <%= command.id %> 123456789 987654321 --force',
  ];
static override flags = {
    account: Flags.string({
      char: 'a',
      description: 'Shopify account to use (defaults to default account)',
    }),
    force: Flags.boolean({
      char: 'f',
      default: false,
      description: 'Skip confirmation prompt',
    }),
    format: Flags.string({
      char: 'o',
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
    const { args, flags } = await this.parse(ProductCollectionAssign);

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

      // Get product and collection details for confirmation
      let collection; let product;
      
      try {
        this.log(`📦 Retrieving product ${args.productId} details...`);
        const productResponse = await apiClient.products.get(args.productId, ['id', 'title', 'handle']);
        product = productResponse.data?.product;
      } catch (error: any) {
        this.error(`Failed to retrieve product ${args.productId}: ${error.message}`);
      }

      try {
        this.log(`📚 Retrieving collection ${args.collectionId} details...`);
        // Try custom collections first, then smart collections
        let collectionResponse;
        try {
          collectionResponse = await apiClient.collections.custom.get(args.collectionId, ['id', 'title', 'handle']);
          collection = collectionResponse.data?.custom_collection;
        } catch {
          // If not found in custom collections, try smart collections
          try {
            collectionResponse = await apiClient.collections.smart.get(args.collectionId, ['id', 'title', 'handle']);
            collection = collectionResponse.data?.smart_collection;
            if (collection) {
              this.warn('Note: This is a smart collection. Products are automatically added based on collection rules.');
            }
          } catch {
            this.error(`Collection ${args.collectionId} not found in custom or smart collections`);
          }
        }
      } catch (error: any) {
        this.error(`Failed to retrieve collection ${args.collectionId}: ${error.message}`);
      }

      if (!product || !collection) {
        this.error('Product or collection not found');
      }

      // Show assignment details and ask for confirmation unless --force flag is used
      if (!flags.force) {
        this.log('\n🔗 Collection Assignment Details:');
        this.log('─'.repeat(50));
        this.log(`Product: ${product.title} (ID: ${product.id})`);
        this.log(`Collection: ${collection.title} (ID: ${collection.id})`);
        this.log('─'.repeat(50));

        // For Node.js environment, we can use readline for confirmation
        const readline = require('node:readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        const confirmed = await new Promise<boolean>((resolve) => {
          rl.question('\n📋 Are you sure you want to assign this product to the collection? (y/N): ', (answer: string) => {
            rl.close();
            resolve(answer.toLowerCase().startsWith('y'));
          });
        });

        if (!confirmed) {
          this.log('\n❌ Collection assignment cancelled');
          return;
        }
      }

      // Assign product to collection
      this.log(`\n🔗 Assigning product ${args.productId} to collection ${args.collectionId}...`);
      const startTime = Date.now();

      const response = await apiClient.collections.products.add(args.collectionId, args.productId);
      const duration = Date.now() - startTime;

      if (!response.data) {
        this.error('Failed to assign product to collection');
      }

      // Display results
      if (flags.format === 'json') {
        this.log(JSON.stringify(response.data, null, 2));
        return;
      }

      // Table format (default)
      this.log(`\n✅ Product successfully assigned to collection (${duration}ms)`);
      this.log('\n📋 Assignment Summary:');
      this.log('─'.repeat(50));
      this.log(`Product: ${product.title}`);
      this.log(`Product ID: ${product.id}`);
      this.log(`Collection: ${collection.title}`);
      this.log(`Collection ID: ${collection.id}`);
      
      // Show collect ID if available in response
      if (response.data.collect && response.data.collect.id) {
        this.log(`Collect ID: ${response.data.collect.id}`);
      }
      
      this.log('─'.repeat(50));
      
      this.log(`\n🌐 View collection: https://${account.shopUrl}/admin/collections/${collection.id}`);
      this.log(`🛍️  View product: https://${account.shopUrl}/admin/products/${product.id}`);

      // Show proxy info if used
      if (flags['use-proxy']) {
        this.log(`\n🔗 Request made through proxy${flags.geo ? ` with geo filter: ${flags.geo}` : ''}`);
      }

      this.log('\n💡 Note: It may take a few moments for the product to appear in the collection on your store.');

    } catch (error: any) {
      this.error(`Error: ${error.message}`);
    }
  }
}
