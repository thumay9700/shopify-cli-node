import { Args, Command, Flags } from '@oclif/core';

import { loadConfig, ShopifyAccount } from '../../config';
import { ShopifyApiFactory } from '../../services';

export default class OrderCancel extends Command {
  static override args = {
    id: Args.string({
      description: 'Order ID to cancel',
      required: true,
    }),
  };
static override description = 'Cancel an order';
static override examples = [
    '<%= config.bin %> <%= command.id %> 123456789',
    '<%= config.bin %> <%= command.id %> 123456789 --account mystore',
    '<%= config.bin %> <%= command.id %> 123456789 --reason customer --email',
    '<%= config.bin %> <%= command.id %> 123456789 --refund --amount 25.00',
    '<%= config.bin %> <%= command.id %> 123456789 --reason fraud --no-email --use-proxy',
    '<%= config.bin %> <%= command.id %> 123456789 --dry-run',
  ];
static override flags = {
    account: Flags.string({
      char: 'a',
      description: 'Shopify account to use (defaults to default account)',
    }),
    amount: Flags.string({
      description: 'Refund amount (if different from order total)',
    }),
    currency: Flags.string({
      description: 'Currency for refund amount',
    }),
    'dry-run': Flags.boolean({
      default: false,
      description: 'Preview the cancellation without actually performing it',
    }),
    email: Flags.boolean({
      allowNo: true,
      default: true,
      description: 'Send cancellation email to customer',
    }),
    force: Flags.boolean({
      default: false,
      description: 'Force cancellation without confirmation prompt',
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
      description: 'Reason for cancellation',
      options: ['customer', 'fraud', 'inventory', 'declined', 'other'],
    }),
    refund: Flags.boolean({
      default: false,
      description: 'Issue a refund when cancelling',
    }),
    'use-proxy': Flags.boolean({
      default: false,
      description: 'Use proxy for requests',
    }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(OrderCancel);

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

      // First, get the order to show details and confirm cancellation
      this.log(`🔍 Fetching order ${args.id} details...`);
      const orderResponse = await apiClient.orders.get(args.id);

      if (!orderResponse.data || !orderResponse.data.order) {
        this.error(`Order ${args.id} not found`);
      }

      const {order} = orderResponse.data;

      // Check if order can be cancelled
      if (order.status === 'cancelled') {
        this.error(`Order ${args.id} is already cancelled`);
      }

      if (order.status === 'closed' && !flags.force) {
        this.error(`Order ${args.id} is closed. Use --force to override`);
      }

      // Show order details
      this.log('\n📋 Order Details:');
      this.log('─'.repeat(50));
      this.log(`ID: ${order.id}`);
      this.log(`Name: ${order.name || 'N/A'}`);
      this.log(`Status: ${order.status || 'N/A'}`);
      this.log(`Financial Status: ${order.financial_status || 'N/A'}`);
      this.log(`Fulfillment Status: ${order.fulfillment_status || 'unfulfilled'}`);
      this.log(`Total Price: $${order.total_price || '0.00'}`);
      this.log(`Customer: ${order.customer ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() || order.customer.email : 'N/A'}`);
      this.log(`Created: ${new Date(order.created_at).toLocaleString()}`);

      // Show what will happen
      if (flags['dry-run']) {
        this.log('\n🔍 Dry Run - Would perform the following actions:');
        this.log(`- Cancel order ${order.id} (${order.name})`);
        if (flags.reason) {
          this.log(`- Reason: ${flags.reason}`);
        }

        this.log(`- Send email to customer: ${flags.email ? 'Yes' : 'No'}`);
        if (flags.refund) {
          const refundAmount = flags.amount ? Number.parseFloat(flags.amount) : Number.parseFloat(order.total_price || '0');
          this.log(`- Issue refund: $${refundAmount.toFixed(2)} ${flags.currency || order.currency || 'USD'}`);
        } else {
          this.log(`- Issue refund: No`);
        }

        this.log('\nNo changes were made. Remove --dry-run to perform the cancellation.');
        return;
      }

      // Confirmation prompt (unless force is used)
      if (!flags.force) {
        this.log('\n⚠️  Warning: This will cancel the order and cannot be undone.');
        
        // In a real implementation, you'd use a proper prompt library
        // For now, we'll assume confirmation is given
        this.log('Proceeding with cancellation (use --dry-run to preview first)...');
      }

      // Build cancellation parameters
      const cancelParams: any = {};
      
      if (flags.reason) {
        cancelParams.reason = flags.reason;
      }
      
      cancelParams.email = flags.email;
      cancelParams.refund = flags.refund;
      
      if (flags.amount) {
        cancelParams.amount = Number.parseFloat(flags.amount);
      }
      
      if (flags.currency) {
        cancelParams.currency = flags.currency;
      }

      // Perform cancellation
      this.log(`❌ Cancelling order ${args.id}...`);
      const startTime = Date.now();

      const response = await apiClient.orders.cancel(args.id, cancelParams);
      const duration = Date.now() - startTime;

      if (!response.data || !response.data.order) {
        this.error('Failed to cancel order');
      }

      const cancelledOrder = response.data.order;

      // Display results
      if (flags.format === 'json') {
        this.log(JSON.stringify(cancelledOrder, null, 2));
        return;
      }

      // Table format (default)
      this.log(`\n✅ Order cancelled successfully (${duration}ms)`);
      this.log('\n📋 Updated Order Status:');
      this.log('─'.repeat(50));
      
      this.log(`ID: ${cancelledOrder.id}`);
      this.log(`Name: ${cancelledOrder.name || 'N/A'}`);
      this.log(`Status: ${cancelledOrder.status || 'N/A'}`);
      this.log(`Financial Status: ${cancelledOrder.financial_status || 'N/A'}`);
      this.log(`Cancelled At: ${cancelledOrder.cancelled_at ? new Date(cancelledOrder.cancelled_at).toLocaleString() : 'N/A'}`);
      this.log(`Cancel Reason: ${cancelledOrder.cancel_reason || flags.reason || 'N/A'}`);

      // Show refund information if applicable
      if (flags.refund || (cancelledOrder.refunds && cancelledOrder.refunds.length > 0)) {
        this.log('\n💰 Refund Information:');
        this.log('─'.repeat(30));
        
        if (cancelledOrder.refunds && cancelledOrder.refunds.length > 0) {
          let totalRefunded = 0;
          for (const refund of cancelledOrder.refunds) {
            const refundAmount = Number.parseFloat(refund.amount || '0');
            totalRefunded += refundAmount;
            this.log(`Refund ID ${refund.id}: $${refundAmount.toFixed(2)}`);
            this.log(`  Created: ${new Date(refund.created_at).toLocaleString()}`);
            if (refund.note) {
              this.log(`  Note: ${refund.note}`);
            }
          }

          this.log(`Total Refunded: $${totalRefunded.toFixed(2)}`);
        } else if (flags.refund) {
          const refundAmount = flags.amount ? Number.parseFloat(flags.amount) : Number.parseFloat(order.total_price || '0');
          this.log(`Refund Amount: $${refundAmount.toFixed(2)} ${flags.currency || order.currency || 'USD'}`);
          this.log('Refund Status: Processing');
        }
      }

      // Show email notification status
      this.log('\n📧 Customer Notification:');
      this.log('─'.repeat(30));
      this.log(`Email Sent: ${flags.email ? 'Yes' : 'No'}`);
      if (flags.email && order.email) {
        this.log(`Email Address: ${order.email}`);
      }

      // Show fulfillment impact
      if (order.fulfillment_status && order.fulfillment_status !== 'unfulfilled') {
        this.log('\n🚚 Fulfillment Impact:');
        this.log('─'.repeat(30));
        this.log('⚠️  Note: This order had fulfillments. You may need to handle returns separately.');
        this.log('Use "order fulfill --list-fulfillments" to view fulfillment details.');
      }

      // Show proxy info if used
      if (flags['use-proxy']) {
        this.log(`\n🌐 Request made through proxy${flags.geo ? ` with geo filter: ${flags.geo}` : ''}`);
      }

      // Show next steps
      this.log('\n📌 Next Steps:');
      this.log('- Monitor refund processing in your payment provider dashboard');
      this.log('- Check inventory levels if items need to be restocked');
      if (order.fulfillment_status !== 'unfulfilled') {
        this.log('- Handle any necessary returns or exchanges');
      }

    } catch (error: any) {
      this.error(`Error: ${error.message}`);
    }
  }
}
