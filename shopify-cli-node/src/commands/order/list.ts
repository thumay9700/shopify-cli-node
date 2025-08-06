import { Command, Flags } from '@oclif/core';

import { loadConfig, ShopifyAccount } from '../../config';
import { ShopifyApiFactory } from '../../services';

export default class OrderList extends Command {
  static override description = 'List all orders';
static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --account mystore',
    '<%= config.bin %> <%= command.id %> --status open --limit 50',
    '<%= config.bin %> <%= command.id %> --financial-status paid --fulfillment-status shipped',
    '<%= config.bin %> <%= command.id %> --created-at-min 2024-01-01 --created-at-max 2024-12-31',
    '<%= config.bin %> <%= command.id %> --processed-at-min 2024-01-01',
    '<%= config.bin %> <%= command.id %> --use-proxy --geo US',
  ];
static override flags = {
    account: Flags.string({
      char: 'a',
      description: 'Shopify account to use (defaults to default account)',
    }),
    'created-at-max': Flags.string({
      description: 'Show orders created before date (ISO 8601 format)',
    }),
    'created-at-min': Flags.string({
      description: 'Show orders created after date (ISO 8601 format)',
    }),
    'financial-status': Flags.string({
      description: 'Financial status filter',
      options: ['pending', 'authorized', 'partially_paid', 'paid', 'partially_refunded', 'refunded', 'voided', 'any'],
    }),
    format: Flags.string({
      char: 'f',
      default: 'table',
      description: 'Output format',
      options: ['json', 'table'],
    }),
    'fulfillment-status': Flags.string({
      description: 'Fulfillment status filter',
      options: ['shipped', 'partial', 'unshipped', 'any', 'unfulfilled'],
    }),
    geo: Flags.string({
      description: 'Geo filter (country code)',
    }),
    help: Flags.help({ char: 'h' }),
    limit: Flags.integer({
      char: 'l',
      default: 50,
      description: 'Number of orders to retrieve',
    }),
    'page-info': Flags.string({
      description: 'Page info for pagination',
    }),
    'processed-at-max': Flags.string({
      description: 'Show orders processed before date (ISO 8601 format)',
    }),
    'processed-at-min': Flags.string({
      description: 'Show orders processed after date (ISO 8601 format)',
    }),
    'since-id': Flags.integer({
      description: 'Restrict results to orders created after the specified ID',
    }),
    status: Flags.string({
      description: 'Order status filter',
      options: ['open', 'closed', 'cancelled', 'any'],
    }),
    'updated-at-max': Flags.string({
      description: 'Show orders last updated before date (ISO 8601 format)',
    }),
    'updated-at-min': Flags.string({
      description: 'Show orders last updated after date (ISO 8601 format)',
    }),
    'use-proxy': Flags.boolean({
      default: false,
      description: 'Use proxy for requests',
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(OrderList);

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

      if (flags['page-info']) params.page_info = flags['page-info'];
      if (flags['since-id']) params.since_id = flags['since-id'];
      if (flags['created-at-min']) params.created_at_min = flags['created-at-min'];
      if (flags['created-at-max']) params.created_at_max = flags['created-at-max'];
      if (flags['updated-at-min']) params.updated_at_min = flags['updated-at-min'];
      if (flags['updated-at-max']) params.updated_at_max = flags['updated-at-max'];
      if (flags['processed-at-min']) params.processed_at_min = flags['processed-at-min'];
      if (flags['processed-at-max']) params.processed_at_max = flags['processed-at-max'];
      if (flags.status) params.status = flags.status;
      if (flags['financial-status']) params.financial_status = flags['financial-status'];
      if (flags['fulfillment-status']) params.fulfillment_status = flags['fulfillment-status'];

      // Fetch orders
      this.log(`🛒 Fetching orders from ${account.name}...`);
      const startTime = Date.now();

      const response = await apiClient.orders.list(params);
      const duration = Date.now() - startTime;

      if (!response.data || !response.data.orders) {
        this.error('Failed to fetch orders');
      }

      const {orders} = response.data;

      // Display results
      if (flags.format === 'json') {
        this.log(JSON.stringify(orders, null, 2));
        return;
      }

      // Table format (default)
      this.log(`\n✅ Found ${orders.length} orders (${duration}ms)`);
      
      if (orders.length === 0) {
        this.log('No orders found matching the criteria.');
        return;
      }

      this.log('\n📋 Orders:');
      this.log('ID'.padEnd(12) + 'Name'.padEnd(15) + 'Customer'.padEnd(25) + 'Status'.padEnd(12) + 'Financial'.padEnd(12) + 'Fulfillment'.padEnd(12) + 'Total'.padEnd(10) + 'Created');
      this.log('─'.repeat(118));

      for (const order of orders) {
        const id = String(order.id).padEnd(12);
        const name = (order.name || '').slice(0, 13).padEnd(15);
        const customer = order.customer ? 
          `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim().slice(0, 23).padEnd(25) : 
          'N/A'.padEnd(25);
        const status = (order.status || '').padEnd(12);
        const financialStatus = (order.financial_status || '').padEnd(12);
        const fulfillmentStatus = (order.fulfillment_status || 'unfulfilled').padEnd(12);
        const total = `$${order.total_price || '0.00'}`.padEnd(10);
        const created = new Date(order.created_at).toLocaleDateString();

        this.log(`${id}${name}${customer}${status}${financialStatus}${fulfillmentStatus}${total}${created}`);
      }

      // Show pagination info if available
      if (response.headers && (response.headers.link || response.headers.Link)) {
        this.log('\n📄 Pagination available - use --page-info flag for next page');
      }

      // Show proxy info if used
      if (flags['use-proxy']) {
        this.log(`\n🌐 Request made through proxy${flags.geo ? ` with geo filter: ${flags.geo}` : ''}`);
      }

      // Show summary statistics
      const totalValue = orders.reduce((sum: number, order: any) => sum + Number.parseFloat(order.total_price || '0'), 0);
      const statusCounts = orders.reduce((counts: Record<string, number>, order: any) => {
        const status = order.status || 'unknown';
        counts[status] = (counts[status] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);

      this.log('\n📊 Summary:');
      this.log(`Total Value: $${totalValue.toFixed(2)}`);
      this.log(`Status Breakdown: ${Object.entries(statusCounts).map(([status, count]) => `${status}: ${count}`).join(', ')}`);

    } catch (error: any) {
      this.error(`Error: ${error.message}`);
    }
  }
}
