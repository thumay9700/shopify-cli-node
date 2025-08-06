import { Args, Command, Flags } from '@oclif/core';

import { loadConfig, ShopifyAccount } from '../../config';
import { ShopifyApiFactory } from '../../services';

export default class ProductDelete extends Command {
  static override args = {
    id: Args.string({
      description: 'Product ID to delete',
      required: true,
    }),
  };
static override description = 'Delete a product';
static override examples = [
    '<%= config.bin %> <%= command.id %> 123456789',
    '<%= config.bin %> <%= command.id %> 123456789 --account mystore',
    '<%= config.bin %> <%= command.id %> 123456789 --force',
    '<%= config.bin %> <%= command.id %> 123456789 --use-proxy --geo US',
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
    const { args, flags } = await this.parse(ProductDelete);

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

      // Get product details first for confirmation
      let product;
      try {
        this.log(`📦 Retrieving product ${args.id} details...`);
        const getResponse = await apiClient.products.get(args.id, ['id', 'title', 'handle', 'status']);
        product = getResponse.data?.product;
      } catch (error: any) {
        if (error.message.includes('404') || error.message.includes('not found')) {
          this.error(`Product ${args.id} not found`);
        } else {
          this.error(`Failed to retrieve product: ${error.message}`);
        }
      }

      if (!product) {
        this.error(`Product ${args.id} not found`);
      }

      // Show confirmation unless --force flag is used
      if (!flags.force) {
        this.log('\n⚠️  Product to be deleted:');
        this.log('─'.repeat(40));
        this.log(`ID: ${product.id}`);
        this.log(`Title: ${product.title}`);
        this.log(`Handle: ${product.handle}`);
        this.log(`Status: ${product.status}`);
        this.log('─'.repeat(40));
        
        // For Node.js environment, we can use readline for confirmation
        const readline = require('node:readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        const confirmed = await new Promise<boolean>((resolve) => {
          rl.question('\n🗑️  Are you sure you want to delete this product? (y/N): ', (answer: string) => {
            rl.close();
            resolve(answer.toLowerCase().startsWith('y'));
          });
        });

        if (!confirmed) {
          this.log('\n❌ Product deletion cancelled');
          return;
        }
      }

      // Delete product
      this.log(`\n🗑️  Deleting product ${args.id} from ${account.name}...`);
      const startTime = Date.now();

      const response = await apiClient.products.delete(args.id);
      const duration = Date.now() - startTime;

      // Check response status
      if (response.status === 200 || response.status === 204) {
        this.log(`\n✅ Product deleted successfully (${duration}ms)`);
        this.log('\n📋 Deleted Product Summary:');
        this.log('─'.repeat(40));
        this.log(`ID: ${product.id}`);
        this.log(`Title: ${product.title}`);
        this.log(`Handle: ${product.handle}`);
        this.log(`Status: ${product.status}`);
        this.log('─'.repeat(40));

        // Show proxy info if used
        if (flags['use-proxy']) {
          this.log(`\n🔗 Request made through proxy${flags.geo ? ` with geo filter: ${flags.geo}` : ''}`);
        }

        this.log('\n💡 Note: This action cannot be undone. The product and all its variants have been permanently removed.');
      } else {
        this.error(`Failed to delete product. Server returned status: ${response.status}`);
      }

    } catch (error: any) {
      this.error(`Error: ${error.message}`);
    }
  }
}
