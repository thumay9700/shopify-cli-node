import { Args, Command, Flags } from '@oclif/core';

import { loadConfig, ShopifyAccount } from '../../config';
import { ShopifyApiFactory } from '../../services';

export default class OrderFulfill extends Command {
  static override args = {
    id: Args.string({
      description: 'Order ID to fulfill',
      required: true,
    }),
  };
static override description = 'Fulfill an order or manage fulfillments';
static override examples = [
    '<%= config.bin %> <%= command.id %> 123456789',
    '<%= config.bin %> <%= command.id %> 123456789 --location 123 --notify-customer',
    '<%= config.bin %> <%= command.id %> 123456789 --line-items 456,789 --tracking-number ABC123',
    '<%= config.bin %> <%= command.id %> 123456789 --tracking-company "FedEx" --tracking-number "1234567890"',
    '<%= config.bin %> <%= command.id %> 123456789 --account mystore --use-proxy',
    '<%= config.bin %> <%= command.id %> 123456789 --list-fulfillments',
    '<%= config.bin %> <%= command.id %> 123456789 --complete-fulfillment 999',
  ];
static override flags = {
    account: Flags.string({
      char: 'a',
      description: 'Shopify account to use (defaults to default account)',
    }),
    'cancel-fulfillment': Flags.integer({
      description: 'Cancel an existing fulfillment by ID',
    }),
    'complete-fulfillment': Flags.integer({
      description: 'Complete an existing fulfillment by ID',
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
    'get-fulfillment': Flags.integer({
      description: 'Get details of a specific fulfillment by ID',
    }),
    help: Flags.help({ char: 'h' }),
    'line-items': Flags.string({
      description: 'Comma-separated list of line item IDs to fulfill (if not provided, fulfills all)',
    }),
    // Actions
    'list-fulfillments': Flags.boolean({
      default: false,
      description: 'List existing fulfillments for this order instead of creating new one',
    }),
    'location-id': Flags.integer({
      description: 'Location ID for the fulfillment',
    }),
    'notify-customer': Flags.boolean({
      default: false,
      description: 'Send notification email to customer',
    }),
    'tracking-company': Flags.string({
      description: 'Tracking company/carrier name',
    }),
    'tracking-number': Flags.string({
      description: 'Tracking number for the fulfillment',
    }),
    'tracking-url': Flags.string({
      description: 'Tracking URL for the shipment',
    }),
    'use-proxy': Flags.boolean({
      default: false,
      description: 'Use proxy for requests',
    }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(OrderFulfill);

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

      // Handle different actions
      if (flags['list-fulfillments']) {
        await this.listFulfillments(apiClient, args.id, flags);
        return;
      }

      if (flags['complete-fulfillment']) {
        await this.completeFulfillment(apiClient, args.id, flags['complete-fulfillment'], flags);
        return;
      }

      if (flags['cancel-fulfillment']) {
        await this.cancelFulfillment(apiClient, args.id, flags['cancel-fulfillment'], flags);
        return;
      }

      if (flags['get-fulfillment']) {
        await this.getFulfillment(apiClient, args.id, flags['get-fulfillment'], flags);
        return;
      }

      // Default action: Create a new fulfillment
      await this.createFulfillment(apiClient, args.id, flags);

    } catch (error: any) {
      this.error(`Error: ${error.message}`);
    }
  }

  private async cancelFulfillment(apiClient: any, orderId: string, fulfillmentId: number, flags: any): Promise<void> {
    this.log(`❌ Cancelling fulfillment ${fulfillmentId} for order ${orderId}...`);
    const startTime = Date.now();

    const response = await apiClient.fulfillments.cancel(orderId, fulfillmentId);
    const duration = Date.now() - startTime;

    if (!response.data || !response.data.fulfillment) {
      this.error('Failed to cancel fulfillment');
    }

    const {fulfillment} = response.data;

    this.log(`\n❌ Fulfillment cancelled successfully (${duration}ms)`);
    this.log(`Status: ${fulfillment.status}`);
    this.log(`Updated: ${new Date(fulfillment.updated_at).toLocaleString()}`);
  }

  private async completeFulfillment(apiClient: any, orderId: string, fulfillmentId: number, flags: any): Promise<void> {
    this.log(`✅ Completing fulfillment ${fulfillmentId} for order ${orderId}...`);
    const startTime = Date.now();

    const response = await apiClient.fulfillments.complete(orderId, fulfillmentId);
    const duration = Date.now() - startTime;

    if (!response.data || !response.data.fulfillment) {
      this.error('Failed to complete fulfillment');
    }

    const {fulfillment} = response.data;

    this.log(`\n✅ Fulfillment completed successfully (${duration}ms)`);
    this.log(`Status: ${fulfillment.status}`);
    this.log(`Updated: ${new Date(fulfillment.updated_at).toLocaleString()}`);
  }

  private async createFulfillment(apiClient: any, orderId: string, flags: any): Promise<void> {
    this.log(`🚚 Creating fulfillment for order ${orderId}...`);

    // First, get the order to understand its line items
    const orderResponse = await apiClient.orders.get(orderId);
    if (!orderResponse.data || !orderResponse.data.order) {
      this.error(`Order ${orderId} not found`);
    }

    const {order} = orderResponse.data;
    let lineItemsToFulfill = order.line_items;

    // Filter line items if specified
    if (flags['line-items']) {
      const specifiedIds = new Set(flags['line-items'].split(',').map((id: string) => Number.parseInt(id.trim())));
      lineItemsToFulfill = order.line_items.filter((item: any) => 
        specifiedIds.has(item.id)
      );

      if (lineItemsToFulfill.length === 0) {
        this.error('No matching line items found for the specified IDs');
      }
    }

    // Build fulfillment object
    const fulfillment: any = {
      line_items: lineItemsToFulfill.map((item: any) => ({
        id: item.id,
        quantity: item.quantity,
      })),
      notify_customer: flags['notify-customer'],
    };

    // Add location if specified
    if (flags['location-id']) {
      fulfillment.location_id = flags['location-id'];
    }

    // Add tracking information if provided
    if (flags['tracking-number'] || flags['tracking-company'] || flags['tracking-url']) {
      fulfillment.tracking_number = flags['tracking-number'] || null;
      fulfillment.tracking_company = flags['tracking-company'] || null;
      fulfillment.tracking_url = flags['tracking-url'] || null;
    }

    const startTime = Date.now();
    const response = await apiClient.fulfillments.create(orderId, fulfillment);
    const duration = Date.now() - startTime;

    if (!response.data || !response.data.fulfillment) {
      this.error('Failed to create fulfillment');
    }

    const createdFulfillment = response.data.fulfillment;

    // Display results
    if (flags.format === 'json') {
      this.log(JSON.stringify(createdFulfillment, null, 2));
      return;
    }

    // Table format (default)
    this.log(`\n✅ Fulfillment created successfully (${duration}ms)`);
    this.log('\n🚚 Fulfillment Details:');
    this.log('─'.repeat(50));
    
    this.log(`ID: ${createdFulfillment.id}`);
    this.log(`Status: ${createdFulfillment.status || 'N/A'}`);
    this.log(`Tracking Company: ${createdFulfillment.tracking_company || 'N/A'}`);
    this.log(`Tracking Number: ${createdFulfillment.tracking_number || 'N/A'}`);
    if (createdFulfillment.tracking_url) {
      this.log(`Tracking URL: ${createdFulfillment.tracking_url}`);
    }

    this.log(`Created: ${new Date(createdFulfillment.created_at).toLocaleString()}`);
    this.log(`Customer Notified: ${fulfillment.notify_customer ? 'Yes' : 'No'}`);

    // Show fulfilled line items
    if (createdFulfillment.line_items && createdFulfillment.line_items.length > 0) {
      this.log('\n📦 Fulfilled Items:');
      this.log('ID'.padEnd(12) + 'Title'.padEnd(30) + 'SKU'.padEnd(15) + 'Quantity');
      this.log('─'.repeat(62));

      for (const item of createdFulfillment.line_items) {
        const id = String(item.id).padEnd(12);
        const title = (item.title || 'N/A').slice(0, 28).padEnd(30);
        const sku = (item.sku || '').slice(0, 13).padEnd(15);
        const quantity = String(item.quantity || 0);

        this.log(`${id}${title}${sku}${quantity}`);
      }
    }

    // Show proxy info if used
    if (flags['use-proxy']) {
      this.log(`\n🌐 Request made through proxy${flags.geo ? ` with geo filter: ${flags.geo}` : ''}`);
    }
  }

  private async getFulfillment(apiClient: any, orderId: string, fulfillmentId: number, flags: any): Promise<void> {
    this.log(`🔍 Fetching fulfillment ${fulfillmentId} for order ${orderId}...`);
    const startTime = Date.now();

    const response = await apiClient.fulfillments.get(orderId, fulfillmentId);
    const duration = Date.now() - startTime;

    if (!response.data || !response.data.fulfillment) {
      this.error(`Fulfillment ${fulfillmentId} not found`);
    }

    const {fulfillment} = response.data;

    // Display results
    if (flags.format === 'json') {
      this.log(JSON.stringify(fulfillment, null, 2));
      return;
    }

    // Table format (default)
    this.log(`\n✅ Fulfillment retrieved (${duration}ms)`);
    this.log('\n🚚 Fulfillment Details:');
    this.log('─'.repeat(50));
    
    this.log(`ID: ${fulfillment.id}`);
    this.log(`Status: ${fulfillment.status || 'N/A'}`);
    this.log(`Tracking Company: ${fulfillment.tracking_company || 'N/A'}`);
    this.log(`Tracking Number: ${fulfillment.tracking_number || 'N/A'}`);
    if (fulfillment.tracking_url) {
      this.log(`Tracking URL: ${fulfillment.tracking_url}`);
    }

    this.log(`Created: ${new Date(fulfillment.created_at).toLocaleString()}`);
    this.log(`Updated: ${new Date(fulfillment.updated_at).toLocaleString()}`);

    // Show line items
    if (fulfillment.line_items && fulfillment.line_items.length > 0) {
      this.log('\n📦 Line Items:');
      this.log('ID'.padEnd(12) + 'Title'.padEnd(30) + 'SKU'.padEnd(15) + 'Quantity');
      this.log('─'.repeat(62));

      for (const item of fulfillment.line_items) {
        const id = String(item.id).padEnd(12);
        const title = (item.title || 'N/A').slice(0, 28).padEnd(30);
        const sku = (item.sku || '').slice(0, 13).padEnd(15);
        const quantity = String(item.quantity || 0);

        this.log(`${id}${title}${sku}${quantity}`);
      }
    }
  }

  private async listFulfillments(apiClient: any, orderId: string, flags: any): Promise<void> {
    this.log(`📋 Fetching fulfillments for order ${orderId}...`);
    const startTime = Date.now();

    const response = await apiClient.fulfillments.list(orderId);
    const duration = Date.now() - startTime;

    if (!response.data || !response.data.fulfillments) {
      this.error('Failed to fetch fulfillments');
    }

    const {fulfillments} = response.data;

    // Display results
    if (flags.format === 'json') {
      this.log(JSON.stringify(fulfillments, null, 2));
      return;
    }

    // Table format (default)
    this.log(`\n✅ Found ${fulfillments.length} fulfillments (${duration}ms)`);
    
    if (fulfillments.length === 0) {
      this.log('No fulfillments found for this order.');
      return;
    }

    this.log('\n🚚 Fulfillments:');
    this.log('ID'.padEnd(12) + 'Status'.padEnd(15) + 'Tracking Company'.padEnd(20) + 'Tracking Number'.padEnd(20) + 'Created');
    this.log('─'.repeat(82));

    for (const fulfillment of fulfillments) {
      const id = String(fulfillment.id).padEnd(12);
      const status = (fulfillment.status || 'N/A').padEnd(15);
      const trackingCompany = (fulfillment.tracking_company || 'N/A').slice(0, 18).padEnd(20);
      const trackingNumber = (fulfillment.tracking_number || 'N/A').slice(0, 18).padEnd(20);
      const created = new Date(fulfillment.created_at).toLocaleDateString();

      this.log(`${id}${status}${trackingCompany}${trackingNumber}${created}`);
    }
  }
}
