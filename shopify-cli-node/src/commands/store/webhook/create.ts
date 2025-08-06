import { Command, Flags } from '@oclif/core';

import { loadConfig, ShopifyAccount } from '../../../config';
import { ShopifyApiFactory } from '../../../services';

export default class WebhookCreate extends Command {
  static override description = 'Create a new webhook';
static override examples = [
    '<%= config.bin %> <%= command.id %> --topic orders/create --address https://example.com/webhooks/orders',
    '<%= config.bin %> <%= command.id %> --topic products/update --address https://api.myapp.com/shopify/products',
    '<%= config.bin %> <%= command.id %> --topic orders/paid --address https://example.com/webhook --format xml',
    '<%= config.bin %> <%= command.id %> --topic customers/create --address https://example.com/webhook --fields id,email,first_name',
  ];
static override flags = {
    account: Flags.string({
      char: 'a',
      description: 'Shopify account to use (defaults to default account)',
    }),
    address: Flags.string({
      description: 'Webhook endpoint URL',
      required: true,
    }),
    'api-version': Flags.string({
      description: 'API version to use for webhook',
    }),
    fields: Flags.string({
      description: 'Comma-separated list of fields to include (optional)',
    }),
    format: Flags.string({
      default: 'json',
      description: 'Webhook payload format',
      options: ['json', 'xml'],
    }),
    help: Flags.help({ char: 'h' }),
    'metafield-namespaces': Flags.string({
      description: 'Comma-separated list of metafield namespaces to include',
    }),
    'output-format': Flags.string({
      char: 'f',
      default: 'table',
      description: 'Output format',
      options: ['json', 'table'],
    }),
    topic: Flags.string({
      char: 't',
      description: 'Webhook topic/event to subscribe to',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(WebhookCreate);

    try {
      // Validate webhook address
      try {
        new URL(flags.address);
      } catch {
        this.error('Invalid webhook address. Must be a valid URL.');
      }

      if (!flags.address.startsWith('https://') && !flags.address.startsWith('http://')) {
        this.error('Webhook address must start with http:// or https://');
      }

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

      // Create API client
      const apiClient = ShopifyApiFactory.create(account);

      // Prepare webhook data
      const webhookData: any = {
        address: flags.address,
        format: flags.format,
        topic: flags.topic,
      };

      // Add optional fields
      if (flags.fields) {
        webhookData.fields = flags.fields.split(',').map(f => f.trim());
      }

      if (flags['metafield-namespaces']) {
        webhookData.metafield_namespaces = flags['metafield-namespaces'].split(',').map(ns => ns.trim());
      }

      if (flags['api-version']) {
        webhookData.api_version = flags['api-version'];
      }

      // Show what we're about to create
      this.log('🔗 Creating webhook with the following configuration:');
      this.log('─'.repeat(50));
      this.log(`Topic: ${webhookData.topic}`);
      this.log(`Address: ${webhookData.address}`);
      this.log(`Format: ${webhookData.format}`);
      this.log(`Account: ${account.name}`);
      
      if (webhookData.fields) {
        this.log(`Fields: ${webhookData.fields.join(', ')}`);
      }
      
      if (webhookData.metafield_namespaces) {
        this.log(`Metafield Namespaces: ${webhookData.metafield_namespaces.join(', ')}`);
      }
      
      if (webhookData.api_version) {
        this.log(`API Version: ${webhookData.api_version}`);
      }

      // Security warning for HTTP
      if (flags.address.startsWith('http://')) {
        this.log('\n⚠️  WARNING: Using HTTP (not HTTPS) for webhook endpoint.');
        this.log('   This is not recommended for production use as data will not be encrypted.');
      }

      // Create webhook
      this.log('\n🚀 Creating webhook...');
      const startTime = Date.now();

      const response = await apiClient.webhooks.create(webhookData);
      const duration = Date.now() - startTime;

      if (!response.data || !response.data.webhook) {
        this.error('Failed to create webhook');
      }

      const createdWebhook = response.data.webhook;

      // Display results
      if (flags['output-format'] === 'json') {
        this.log(JSON.stringify(createdWebhook, null, 2));
        return;
      }

      // Table format (default)
      this.log(`\n✅ Webhook created successfully (${duration}ms)`);
      this.log('\n🔗 Webhook Details:');
      this.log('─'.repeat(40));
      
      this.log(`ID: ${createdWebhook.id}`);
      this.log(`Topic: ${createdWebhook.topic}`);
      this.log(`Address: ${createdWebhook.address}`);
      this.log(`Format: ${createdWebhook.format}`);
      this.log(`API Version: ${createdWebhook.api_version || 'default'}`);
      this.log(`Created: ${new Date(createdWebhook.created_at).toLocaleString()}`);

      if (createdWebhook.fields && createdWebhook.fields.length > 0) {
        this.log(`Fields: ${createdWebhook.fields.join(', ')}`);
      }

      if (createdWebhook.metafield_namespaces && createdWebhook.metafield_namespaces.length > 0) {
        this.log(`Metafield Namespaces: ${createdWebhook.metafield_namespaces.join(', ')}`);
      }

      // Show helpful information
      this.log('\n💡 Next Steps:');
      this.log('   • Test your webhook endpoint to ensure it can receive POST requests');
      this.log('   • Verify webhook signature for security (recommended)');
      this.log('   • Monitor webhook delivery in your Shopify admin');
      this.log(`   • Use webhook ID ${createdWebhook.id} to manage this webhook`);

      // Show testing suggestions
      this.log('\n🧪 Testing Tips:');
      this.log('   • Use tools like ngrok for local development');
      this.log('   • Check webhook logs in Shopify admin for delivery status');
      this.log('   • Implement proper error handling in your endpoint');
      
      if (createdWebhook.topic.startsWith('orders/')) {
        this.log('   • Create a test order to trigger this webhook');
      } else if (createdWebhook.topic.startsWith('products/')) {
        this.log('   • Create or update a product to trigger this webhook');
      } else if (createdWebhook.topic.startsWith('customers/')) {
        this.log('   • Create a customer account to trigger this webhook');
      }

      // Show common webhook validation info
      this.log('\n🔒 Security Note:');
      this.log('   Shopify signs webhook requests with HMAC-SHA256.');
      this.log('   Verify the X-Shopify-Hmac-Sha256 header to ensure authenticity.');

    } catch (error: any) {
      this.error(`Error: ${error.message}`);
    }
  }
}
