import { Args, Command, Flags } from '@oclif/core';

import { loadConfig, ShopifyAccount } from '../../../config';
import { ShopifyApiFactory } from '../../../services';

export default class ProductCollectionRemove extends Command {
  static override args = {
    collectId: Args.string({
      description: 'Collect ID to remove (connects product to collection)',
      required: true,
    }),
  };
static override description = 'Remove a product from a collection';
static override examples = [
    '<%= config.bin %> <%= command.id %> 555666777',
    '<%= config.bin %> <%= command.id %> 555666777 --account mystore',
    '<%= config.bin %> <%= command.id %> 555666777 --use-proxy --geo US',
    '<%= config.bin %> <%= command.id %> 555666777 --force',
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
    const { args, flags } = await this.parse(ProductCollectionRemove);

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

      // Get collect details for confirmation (if we can retrieve it)
      let collectDetails;
      try {
        this.log(`🔍 Retrieving collect ${args.collectId} details...`);
        const collectResponse = await apiClient.rest(`collects/${args.collectId}.json`, 'GET');
        collectDetails = collectResponse.data?.collect;
      } catch (error: any) {
        this.warn(`Could not retrieve collect details: ${error.message}`);
        this.log('Proceeding with removal...');
      }

      // If we have collect details, get product and collection info for better confirmation
      let collection; let product;
      if (collectDetails) {
        try {
          const productResponse = await apiClient.products.get(collectDetails.product_id, ['id', 'title']);
          product = productResponse.data?.product;
        } catch (error: any) {
          this.warn(`Could not retrieve product details: ${error.message}`);
        }

        try {
          // Try custom collections first, then smart collections
          let collectionResponse;
          try {
            collectionResponse = await apiClient.collections.custom.get(collectDetails.collection_id, ['id', 'title']);
            collection = collectionResponse.data?.custom_collection;
          } catch {
            try {
              collectionResponse = await apiClient.collections.smart.get(collectDetails.collection_id, ['id', 'title']);
              collection = collectionResponse.data?.smart_collection;
            } catch (smartError: any) {
              this.warn(`Could not retrieve collection details: ${smartError.message}`);
            }
          }
        } catch (error: any) {
          this.warn(`Could not retrieve collection details: ${error.message}`);
        }
      }

      // Show removal details and ask for confirmation unless --force flag is used
      if (!flags.force) {
        this.log('\n🗑️  Collection Removal Details:');
        this.log('─'.repeat(50));
        this.log(`Collect ID: ${args.collectId}`);
        
        if (collectDetails) {
          this.log(`Product ID: ${collectDetails.product_id}`);
          this.log(`Collection ID: ${collectDetails.collection_id}`);
          
          if (product) {
            this.log(`Product: ${product.title}`);
          }
          
          if (collection) {
            this.log(`Collection: ${collection.title}`);
          }
        } else {
          this.log('Note: Could not retrieve collect details for preview');
        }
        
        this.log('─'.repeat(50));

        // For Node.js environment, we can use readline for confirmation
        const readline = require('node:readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        const confirmed = await new Promise<boolean>((resolve) => {
          rl.question('\n❓ Are you sure you want to remove this product from the collection? (y/N): ', (answer: string) => {
            rl.close();
            resolve(answer.toLowerCase().startsWith('y'));
          });
        });

        if (!confirmed) {
          this.log('\n❌ Collection removal cancelled');
          return;
        }
      }

      // Remove product from collection
      this.log(`\n🗑️  Removing collect ${args.collectId}...`);
      const startTime = Date.now();

      const response = await apiClient.collections.products.remove(args.collectId);
      const duration = Date.now() - startTime;

      // Check response status
      if (response.status === 200 || response.status === 204) {
        // Display results
        if (flags.format === 'json') {
          this.log(JSON.stringify({ collectId: args.collectId, status: response.status, success: true }, null, 2));
          return;
        }

        // Table format (default)
        this.log(`\n✅ Product successfully removed from collection (${duration}ms)`);
        this.log('\n📋 Removal Summary:');
        this.log('─'.repeat(50));
        this.log(`Collect ID: ${args.collectId}`);
        
        if (collectDetails) {
          this.log(`Product ID: ${collectDetails.product_id}`);
          this.log(`Collection ID: ${collectDetails.collection_id}`);
          
          if (product) {
            this.log(`Product: ${product.title}`);
          }
          
          if (collection) {
            this.log(`Collection: ${collection.title}`);
          }
        }
        
        this.log('─'.repeat(50));

        // Show proxy info if used
        if (flags['use-proxy']) {
          this.log(`\n🔗 Request made through proxy${flags.geo ? ` with geo filter: ${flags.geo}` : ''}`);
        }

        this.log('\n💡 Note: The product has been removed from the collection and will no longer appear there.');

      } else {
        this.error(`Failed to remove product from collection. Server returned status: ${response.status}`);
      }

    } catch (error: any) {
      this.error(`Error: ${error.message}`);
    }
  }
}
