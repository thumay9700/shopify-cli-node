import { Command, Flags } from '@oclif/core';

import { loadConfig, ShopifyAccount } from '../../../config';
import { ShopifyApiFactory } from '../../../services';

export default class ProductInventoryLevels extends Command {
  static override description = 'Get inventory levels for products';
static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --account mystore',
    '<%= config.bin %> <%= command.id %> --inventory-item-ids 123,456,789',
    '<%= config.bin %> <%= command.id %> --location-ids 100,200',
    '<%= config.bin %> <%= command.id %> --limit 100',
    '<%= config.bin %> <%= command.id %> --use-proxy --geo US',
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
      options: ['json', 'table'],
    }),
    geo: Flags.string({
      description: 'Geo filter (country code)',
    }),
    help: Flags.help({ char: 'h' }),
    'inventory-item-ids': Flags.string({
      description: 'Comma-separated list of inventory item IDs',
    }),
    limit: Flags.integer({
      char: 'l',
      default: 50,
      description: 'Number of inventory levels to retrieve',
    }),
    'location-ids': Flags.string({
      description: 'Comma-separated list of location IDs',
    }),
    'page-info': Flags.string({
      description: 'Page info for pagination',
    }),
    'use-proxy': Flags.boolean({
      default: false,
      description: 'Use proxy for requests',
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(ProductInventoryLevels);

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

      // Build query parameters
      const params: any = {
        limit: flags.limit,
      };

      if (flags['inventory-item-ids']) params.inventory_item_ids = flags['inventory-item-ids'];
      if (flags['location-ids']) params.location_ids = flags['location-ids'];
      if (flags['page-info']) params.page_info = flags['page-info'];

      // Fetch inventory levels
      this.log(`📦 Fetching inventory levels from ${account.name}...`);
      const startTime = Date.now();

      const response = await apiClient.inventory.levels(params);
      const duration = Date.now() - startTime;

      if (!response.data || !response.data.inventory_levels) {
        this.error('Failed to fetch inventory levels');
      }

      const inventoryLevels = response.data.inventory_levels;

      // Display results
      if (flags.format === 'json') {
        this.log(JSON.stringify(inventoryLevels, null, 2));
        return;
      }

      // Table format (default)
      this.log(`\n✅ Found ${inventoryLevels.length} inventory levels (${duration}ms)`);
      
      if (inventoryLevels.length === 0) {
        this.log('No inventory levels found matching the criteria.');
        return;
      }

      this.log('\n📦 Inventory Levels:');
      this.log('Inventory Item ID'.padEnd(18) + 'Location ID'.padEnd(12) + 'Available'.padEnd(12) + 'Updated');
      this.log('─'.repeat(60));

      for (const level of inventoryLevels) {
        const itemId = String(level.inventory_item_id || '').padEnd(18);
        const locationId = String(level.location_id || '').padEnd(12);
        const available = String(level.available || 0).padEnd(12);
        const updated = level.updated_at ? new Date(level.updated_at).toLocaleDateString() : 'N/A';

        this.log(`${itemId}${locationId}${available}${updated}`);
      }

      // Show summary statistics
      const totalItems = inventoryLevels.length;
      const totalAvailable = inventoryLevels.reduce((sum: number, level: any) => sum + (level.available || 0), 0);
      const uniqueLocations = new Set(inventoryLevels.map((level: any) => level.location_id)).size;
      const uniqueItems = new Set(inventoryLevels.map((level: any) => level.inventory_item_id)).size;

      this.log('\n📊 Summary:');
      this.log(`  Total Inventory Records: ${totalItems}`);
      this.log(`  Total Available Units: ${totalAvailable}`);
      this.log(`  Unique Locations: ${uniqueLocations}`);
      this.log(`  Unique Inventory Items: ${uniqueItems}`);

      // Show items with low stock (less than 10 units)
      const lowStockItems = inventoryLevels.filter((level: any) => (level.available || 0) < 10 && (level.available || 0) > 0);
      if (lowStockItems.length > 0) {
        this.log(`\n⚠️  Low Stock Alert (< 10 units): ${lowStockItems.length} items`);
        for (const item of lowStockItems.slice(0, 5)) {
          this.log(`  • Item ${item.inventory_item_id}: ${item.available} units at location ${item.location_id}`);
        }

        if (lowStockItems.length > 5) {
          this.log(`  ... and ${lowStockItems.length - 5} more items`);
        }
      }

      // Show out of stock items
      const outOfStockItems = inventoryLevels.filter((level: any) => (level.available || 0) === 0);
      if (outOfStockItems.length > 0) {
        this.log(`\n❌ Out of Stock: ${outOfStockItems.length} items`);
        for (const item of outOfStockItems.slice(0, 5)) {
          this.log(`  • Item ${item.inventory_item_id} at location ${item.location_id}`);
        }

        if (outOfStockItems.length > 5) {
          this.log(`  ... and ${outOfStockItems.length - 5} more items`);
        }
      }

      // Show pagination info if available
      if (response.headers && (response.headers.link || response.headers.Link)) {
        this.log('\n📄 Pagination available - use --page-info flag for next page');
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
