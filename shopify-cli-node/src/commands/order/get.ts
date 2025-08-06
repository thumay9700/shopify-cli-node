import { Args, Command, Flags } from '@oclif/core';

import { loadConfig, ShopifyAccount } from '../../config';
import { ShopifyApiFactory } from '../../services';

export default class OrderGet extends Command {
  static override args = {
    id: Args.string({
      description: 'Order ID to retrieve',
      required: true,
    }),
  };
static override description = 'Get a specific order by ID';
static override examples = [
    '<%= config.bin %> <%= command.id %> 123456789',
    '<%= config.bin %> <%= command.id %> 123456789 --account mystore',
    '<%= config.bin %> <%= command.id %> 123456789 --fields id,name,status,total_price',
    '<%= config.bin %> <%= command.id %> 123456789 --use-proxy --geo CA',
    '<%= config.bin %> <%= command.id %> 123456789 --format json',
    '<%= config.bin %> <%= command.id %> 123456789 --show-line-items',
  ];
static override flags = {
    account: Flags.string({
      char: 'a',
      description: 'Shopify account to use (defaults to default account)',
    }),
    fields: Flags.string({
      description: 'Comma-separated list of fields to retrieve',
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
    'show-customer': Flags.boolean({
      default: false,
      description: 'Show customer details',
    }),
    'show-fulfillments': Flags.boolean({
      default: false,
      description: 'Show order fulfillment details',
    }),
    'show-line-items': Flags.boolean({
      default: false,
      description: 'Show order line items details',
    }),
    'use-proxy': Flags.boolean({
      default: false,
      description: 'Use proxy for requests',
    }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(OrderGet);

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

      // Parse fields if provided
      const fields = flags.fields ? flags.fields.split(',').map(f => f.trim()) : undefined;

      // Fetch order
      this.log(`🛒 Fetching order ${args.id} from ${account.name}...`);
      const startTime = Date.now();

      const response = await apiClient.orders.get(args.id, fields);
      const duration = Date.now() - startTime;

      if (!response.data || !response.data.order) {
        this.error(`Order ${args.id} not found`);
      }

      const {order} = response.data;

      // Display results
      if (flags.format === 'json') {
        this.log(JSON.stringify(order, null, 2));
        return;
      }

      // Table format (default)
      this.log(`\n✅ Order retrieved (${duration}ms)`);
      this.log('\n🛒 Order Details:');
      this.log('─'.repeat(50));
      
      this.log(`ID: ${order.id}`);
      this.log(`Name: ${order.name || 'N/A'}`);
      this.log(`Status: ${order.status || 'N/A'}`);
      this.log(`Financial Status: ${order.financial_status || 'N/A'}`);
      this.log(`Fulfillment Status: ${order.fulfillment_status || 'unfulfilled'}`);
      this.log(`Total Price: $${order.total_price || '0.00'}`);
      this.log(`Currency: ${order.currency || 'N/A'}`);
      this.log(`Email: ${order.email || 'N/A'}`);
      this.log(`Order Number: ${order.order_number || 'N/A'}`);
      this.log(`Created: ${new Date(order.created_at).toLocaleString()}`);
      this.log(`Updated: ${new Date(order.updated_at).toLocaleString()}`);
      
      if (order.processed_at) {
        this.log(`Processed: ${new Date(order.processed_at).toLocaleString()}`);
      }

      // Show customer details if requested or if customer exists
      if ((flags['show-customer'] || order.customer) && order.customer) {
          this.log('\n👤 Customer Details:');
          this.log('─'.repeat(30));
          this.log(`ID: ${order.customer.id}`);
          this.log(`Name: ${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() || 'N/A');
          this.log(`Email: ${order.customer.email || 'N/A'}`);
          this.log(`Phone: ${order.customer.phone || 'N/A'}`);
          if (order.customer.orders_count !== undefined) {
            this.log(`Total Orders: ${order.customer.orders_count}`);
          }
        }

      // Show shipping address
      if (order.shipping_address) {
        this.log('\n📍 Shipping Address:');
        this.log('─'.repeat(30));
        const addr = order.shipping_address;
        this.log(`Name: ${addr.first_name || ''} ${addr.last_name || ''}`.trim() || 'N/A');
        this.log(`Company: ${addr.company || 'N/A'}`);
        this.log(`Address: ${addr.address1 || 'N/A'}`);
        if (addr.address2) this.log(`Address 2: ${addr.address2}`);
        this.log(`City: ${addr.city || 'N/A'}`);
        this.log(`Province: ${addr.province || 'N/A'}`);
        this.log(`Country: ${addr.country || 'N/A'}`);
        this.log(`ZIP: ${addr.zip || 'N/A'}`);
      }

      // Show line items if requested or if there are items
      if (flags['show-line-items'] || (order.line_items && order.line_items.length > 0)) {
        this.log('\n📦 Line Items:');
        this.log('ID'.padEnd(12) + 'Title'.padEnd(30) + 'Variant'.padEnd(15) + 'SKU'.padEnd(15) + 'Qty'.padEnd(5) + 'Price'.padEnd(10) + 'Total');
        this.log('─'.repeat(92));

        for (const item of order.line_items || []) {
          const id = String(item.id).padEnd(12);
          const title = (item.title || 'N/A').slice(0, 28).padEnd(30);
          const variant = (item.variant_title || 'Default').slice(0, 13).padEnd(15);
          const sku = (item.sku || '').slice(0, 13).padEnd(15);
          const qty = String(item.quantity || 0).padEnd(5);
          const price = `$${item.price || '0.00'}`.padEnd(10);
          const total = `$${((Number.parseFloat(item.price || '0') * (item.quantity || 0)).toFixed(2))}`;

          this.log(`${id}${title}${variant}${sku}${qty}${price}${total}`);
        }
      }

      // Show fulfillments if requested
      if (flags['show-fulfillments'] && order.fulfillments && order.fulfillments.length > 0) {
        this.log('\n🚚 Fulfillments:');
        this.log('ID'.padEnd(12) + 'Status'.padEnd(15) + 'Tracking Company'.padEnd(20) + 'Tracking Number'.padEnd(20) + 'Created');
        this.log('─'.repeat(82));

        for (const fulfillment of order.fulfillments) {
          const id = String(fulfillment.id).padEnd(12);
          const status = (fulfillment.status || 'N/A').padEnd(15);
          const trackingCompany = (fulfillment.tracking_company || 'N/A').slice(0, 18).padEnd(20);
          const trackingNumber = (fulfillment.tracking_number || 'N/A').slice(0, 18).padEnd(20);
          const created = new Date(fulfillment.created_at).toLocaleDateString();

          this.log(`${id}${status}${trackingCompany}${trackingNumber}${created}`);
        }
      }

      // Show financial details
      if (order.total_discounts && Number.parseFloat(order.total_discounts) > 0) {
        this.log('\n💰 Financial Summary:');
        this.log('─'.repeat(30));
        this.log(`Subtotal: $${order.subtotal_price || '0.00'}`);
        this.log(`Tax: $${order.total_tax || '0.00'}`);
        this.log(`Shipping: $${order.total_shipping_price_set?.shop_money?.amount || '0.00'}`);
        this.log(`Discounts: $${order.total_discounts || '0.00'}`);
        this.log(`Total: $${order.total_price || '0.00'}`);
      }

      // Show tags if any
      if (order.tags) {
        this.log(`\n🏷️  Tags: ${order.tags}`);
      }

      // Show notes if any
      if (order.note) {
        this.log(`\n📝 Note: ${order.note}`);
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
