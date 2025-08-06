import { Args, Command, Flags } from '@oclif/core';

import { loadConfig, ShopifyAccount } from '../../../config';
import { ShopifyApiFactory } from '../../../services';

export default class ProductInventoryAdjust extends Command {
  static override args = {
    inventoryItemId: Args.string({
      description: 'Inventory item ID to adjust',
      required: true,
    }),
    locationId: Args.string({
      description: 'Location ID where inventory is located',
      required: true,
    }),
    quantity: Args.integer({
      description: 'Quantity adjustment (positive or negative)',
      required: true,
    }),
  };
static override description = 'Adjust inventory levels for a product variant';
static override examples = [
    '<%= config.bin %> <%= command.id %> 1001 2001 10',
    '<%= config.bin %> <%= command.id %> 1001 2001 -5 --account mystore',
    '<%= config.bin %> <%= command.id %> 1001 2001 25 --use-proxy --geo US',
    '<%= config.bin %> <%= command.id %> 1001 2001 -10 --reason "Damaged goods"',
  ];
static override flags = {
    account: Flags.string({
      char: 'a',
      description: 'Shopify account to use (defaults to default account)',
    }),
    force: Flags.boolean({
      default: false,
      description: 'Skip confirmation prompt',
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
    reason: Flags.string({
      description: 'Reason for inventory adjustment',
    }),
    'use-proxy': Flags.boolean({
      default: false,
      description: 'Use proxy for requests',
    }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(ProductInventoryAdjust);

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

      // Get current inventory level first
      let currentLevel;
      try {
        this.log(`📦 Retrieving current inventory level...`);
        const levelsResponse = await apiClient.inventory.levels({
          inventory_item_ids: args.inventoryItemId,
          location_ids: args.locationId,
        });
        
        if (levelsResponse.data?.inventory_levels?.length > 0) {
          currentLevel = levelsResponse.data.inventory_levels[0];
        }
      } catch (error: any) {
        this.warn(`Could not retrieve current inventory level: ${error.message}`);
      }

      // Show adjustment details and ask for confirmation unless --force flag is used
      if (!flags.force) {
        this.log('\n📊 Inventory Adjustment Details:');
        this.log('─'.repeat(50));
        this.log(`Location ID: ${args.locationId}`);
        this.log(`Inventory Item ID: ${args.inventoryItemId}`);
        this.log(`Adjustment: ${args.quantity > 0 ? '+' : ''}${args.quantity}`);
        
        if (currentLevel) {
          this.log(`Current Level: ${currentLevel.available || 0}`);
          this.log(`New Level: ${(currentLevel.available || 0) + args.quantity}`);
        }
        
        if (flags.reason) {
          this.log(`Reason: ${flags.reason}`);
        }

        this.log('─'.repeat(50));

        // For Node.js environment, we can use readline for confirmation
        const readline = require('node:readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        const confirmed = await new Promise<boolean>((resolve) => {
          rl.question('\n📝 Are you sure you want to make this inventory adjustment? (y/N): ', (answer: string) => {
            rl.close();
            resolve(answer.toLowerCase().startsWith('y'));
          });
        });

        if (!confirmed) {
          this.log('\n❌ Inventory adjustment cancelled');
          return;
        }
      }

      // Adjust inventory
      this.log(`\n📦 Adjusting inventory for item ${args.inventoryItemId} at location ${args.locationId}...`);
      const startTime = Date.now();

      const response = await apiClient.inventory.adjust(args.locationId, args.inventoryItemId, args.quantity);
      const duration = Date.now() - startTime;

      if (!response.data) {
        this.error('Failed to adjust inventory');
      }

      // Display results
      if (flags.format === 'json') {
        this.log(JSON.stringify(response.data, null, 2));
        return;
      }

      // Table format (default)
      this.log(`\n✅ Inventory adjustment completed (${duration}ms)`);
      
      // Try to get updated inventory level
      let newLevel;
      try {
        const updatedResponse = await apiClient.inventory.levels({
          inventory_item_ids: args.inventoryItemId,
          location_ids: args.locationId,
        });
        
        if (updatedResponse.data?.inventory_levels?.length > 0) {
          newLevel = updatedResponse.data.inventory_levels[0];
        }
      } catch (error: any) {
        this.warn(`Could not retrieve updated inventory level: ${error.message}`);
      }

      this.log('\n📊 Adjustment Summary:');
      this.log('─'.repeat(40));
      this.log(`Location ID: ${args.locationId}`);
      this.log(`Inventory Item ID: ${args.inventoryItemId}`);
      this.log(`Adjustment Applied: ${args.quantity > 0 ? '+' : ''}${args.quantity}`);
      
      if (currentLevel) {
        this.log(`Previous Level: ${currentLevel.available || 0}`);
      }
      
      if (newLevel) {
        this.log(`Current Level: ${newLevel.available || 0}`);
        this.log(`Updated: ${new Date(newLevel.updated_at).toLocaleString()}`);
      }
      
      if (flags.reason) {
        this.log(`Reason: ${flags.reason}`);
      }
      
      this.log('─'.repeat(40));

      // Show warnings for negative inventory
      if (newLevel && newLevel.available < 0) {
        this.log('\n⚠️  WARNING: Inventory level is now negative!');
        this.log('   This may indicate overselling or inventory tracking issues.');
      } else if (newLevel && newLevel.available === 0) {
        this.log('\n📦 Item is now out of stock.');
      } else if (newLevel && newLevel.available > 0 && args.quantity > 0) {
        this.log(`\n✅ Inventory increased. ${newLevel.available} units now available.`);
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
