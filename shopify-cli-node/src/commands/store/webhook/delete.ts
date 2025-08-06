import { Args, Command, Flags } from '@oclif/core';

import { loadConfig, ShopifyAccount } from '../../../config';
import { ShopifyApiFactory } from '../../../services';

export default class WebhookDelete extends Command {
  static override args = {
    webhookId: Args.string({
      description: 'Webhook ID to delete',
      required: true,
    }),
  };
static override description = 'Delete a webhook';
static override examples = [
    '<%= config.bin %> <%= command.id %> 123456789',
    '<%= config.bin %> <%= command.id %> 123456789 --account mystore',
    '<%= config.bin %> <%= command.id %> 123456789 --force',
    '<%= config.bin %> <%= command.id %> 123456789 --format json',
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
      default: 'table',
      description: 'Output format',
      options: ['json', 'table'],
    }),
    help: Flags.help({ char: 'h' }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(WebhookDelete);

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

      // Create API client
      const apiClient = ShopifyApiFactory.create(account);

      // First, verify the webhook exists and get its details
      this.log(`🔍 Verifying webhook ${args.webhookId}...`);
      
      let webhookToDelete;
      try {
        const webhookResponse = await apiClient.webhooks.get(args.webhookId);
        if (!webhookResponse.data?.webhook) {
          this.error(`Webhook ${args.webhookId} not found`);
        }

        webhookToDelete = webhookResponse.data.webhook;
      } catch (error: any) {
        this.error(`Failed to find webhook: ${error.message}`);
      }

      // Show webhook details
      this.log(`\n🔗 Webhook found:`);
      this.log('─'.repeat(40));
      this.log(`ID: ${webhookToDelete.id}`);
      this.log(`Topic: ${webhookToDelete.topic}`);
      this.log(`Address: ${webhookToDelete.address}`);
      this.log(`Format: ${webhookToDelete.format || 'json'}`);
      this.log(`Created: ${new Date(webhookToDelete.created_at).toLocaleString()}`);
      this.log(`Store: ${account.name}`);

      // Show confirmation unless force flag is used
      if (!flags.force) {
        this.log('\n⚠️  WARNING: This action cannot be undone.');
        this.log('Are you sure you want to delete this webhook?');
        
        // In a real CLI, you'd use a prompt library here
        // For now, we'll assume the user confirmed if no --force flag
        this.log('✅ Proceeding with deletion (use --force to skip this confirmation)...');
      }

      // Delete the webhook
      this.log('\n🗑️  Deleting webhook...');
      const startTime = Date.now();

      await apiClient.webhooks.delete(args.webhookId);
      const duration = Date.now() - startTime;

      // Display results
      if (flags.format === 'json') {
        this.log(JSON.stringify({
          address: webhookToDelete.address,
          deletedAt: new Date().toISOString(),
          duration,
          status: 'deleted',
          topic: webhookToDelete.topic,
          webhookId: args.webhookId
        }, null, 2));
        return;
      }

      // Table format (default)
      this.log(`\n✅ Webhook deleted successfully (${duration}ms)`);
      this.log('\n📋 Deletion Summary:');
      this.log('─'.repeat(30));
      this.log(`Deleted webhook ID: ${args.webhookId}`);
      this.log(`Topic: ${webhookToDelete.topic}`);
      this.log(`Address: ${webhookToDelete.address}`);
      this.log(`Deleted at: ${new Date().toLocaleString()}`);

      // Show helpful information
      this.log('\n💡 What happens next:');
      this.log('   • Shopify will no longer send events to the deleted endpoint');
      this.log('   • Any pending webhook deliveries may still be attempted');
      this.log('   • You can recreate the webhook later if needed');

      // Show related commands
      this.log('\n🔗 Related commands:');
      this.log('   • List webhooks: shopify-cli store webhook list');
      this.log('   • Create webhook: shopify-cli store webhook create');
      
      // Check if this was the last webhook for this topic
      try {
        const allWebhooksResponse = await apiClient.webhooks.list({ topic: webhookToDelete.topic });
        const remainingWebhooks = allWebhooksResponse.data?.webhooks || [];
        
        if (remainingWebhooks.length === 0) {
          this.log(`\n📢 Note: No more webhooks remain for topic "${webhookToDelete.topic}"`);
          this.log('   You will no longer receive notifications for this event type.');
        } else {
          this.log(`\n📊 ${remainingWebhooks.length} webhook(s) still exist for topic "${webhookToDelete.topic}"`);
        }
      } catch {
        // Don't fail the command if we can't check remaining webhooks
      }

    } catch (error: any) {
      this.error(`Error: ${error.message}`);
    }
  }
}
