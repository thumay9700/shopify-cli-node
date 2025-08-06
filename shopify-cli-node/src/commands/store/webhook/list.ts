import { Command, Flags } from '@oclif/core';

import { loadConfig, ShopifyAccount } from '../../../config';
import { ShopifyApiFactory } from '../../../services';

export default class WebhookList extends Command {
  static override description = 'List all store webhooks';
static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --account mystore',
    '<%= config.bin %> <%= command.id %> --topic orders/create',
    '<%= config.bin %> <%= command.id %> --format json',
    '<%= config.bin %> <%= command.id %> --show-details',
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
    help: Flags.help({ char: 'h' }),
    limit: Flags.integer({
      char: 'l',
      default: 50,
      description: 'Limit number of webhooks to retrieve',
    }),
    'show-details': Flags.boolean({
      default: false,
      description: 'Show detailed webhook information',
    }),
    topic: Flags.string({
      char: 't',
      description: 'Filter webhooks by topic',
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(WebhookList);

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

      // Prepare API parameters
      const params: any = { limit: flags.limit };
      if (flags.topic) {
        params.topic = flags.topic;
      }

      // Fetch webhooks
      this.log(`🔗 Fetching webhooks from ${account.name}...`);
      const startTime = Date.now();

      const response = await apiClient.webhooks.list(params);
      const duration = Date.now() - startTime;

      if (!response.data || !response.data.webhooks) {
        this.error('Failed to fetch webhooks');
      }

      const {webhooks} = response.data;

      // Display results
      if (flags.format === 'json') {
        this.log(JSON.stringify(webhooks, null, 2));
        return;
      }

      // Table format (default)
      this.log(`\n✅ Retrieved ${webhooks.length} webhook(s) (${duration}ms)`);
      
      if (webhooks.length === 0) {
        this.log('\n❌ No webhooks found');
        if (flags.topic) {
          this.log(`   No webhooks found for topic: ${flags.topic}`);
        }

        return;
      }

      this.log('\n🔗 Webhooks:');
      this.log('─'.repeat(100));

      if (flags['show-details']) {
        // Detailed view
        for (const webhook of webhooks) {
          const statusIcon = this.getStatusIcon(webhook);
          this.log(`${statusIcon} ${webhook.topic} (ID: ${webhook.id})`);
          this.log(`   Address: ${webhook.address}`);
          this.log(`   Format: ${webhook.format || 'json'}`);
          
          if (webhook.fields && webhook.fields.length > 0) {
            this.log(`   Fields: ${webhook.fields.join(', ')}`);
          }
          
          if (webhook.metafield_namespaces && webhook.metafield_namespaces.length > 0) {
            this.log(`   Metafield Namespaces: ${webhook.metafield_namespaces.join(', ')}`);
          }
          
          this.log(`   API Version: ${webhook.api_version || 'default'}`);
          this.log(`   Created: ${new Date(webhook.created_at).toLocaleString()}`);
          this.log(`   Updated: ${new Date(webhook.updated_at).toLocaleString()}`);
          this.log('');
        }
      } else {
        // Simple table view
        this.log('ID'.padEnd(12) + 'Topic'.padEnd(25) + 'Address'.padEnd(40) + 'Format'.padEnd(8) + 'Status');
        this.log('─'.repeat(90));

        for (const webhook of webhooks) {
          const id = String(webhook.id).padEnd(12);
          const topic = webhook.topic.slice(0, 23).padEnd(25);
          const address = this.truncateUrl(webhook.address, 38).padEnd(40);
          const format = (webhook.format || 'json').padEnd(8);
          const statusIcon = this.getStatusIcon(webhook);
          
          this.log(`${id}${topic}${address}${format}${statusIcon}`);
        }
      }

      // Show summary by topic
      const topicCounts = webhooks.reduce((acc: any, webhook: any) => {
        const topic = webhook.topic.split('/')[0]; // Group by main topic (e.g., orders, products)
        acc[topic] = (acc[topic] || 0) + 1;
        return acc;
      }, {});

      if (Object.keys(topicCounts).length > 1) {
        this.log('\n📊 Summary by Category:');
        this.log('─'.repeat(30));
        for (const [topic, count] of Object.entries(topicCounts)
          .sort(([, a], [, b]) => (b as number) - (a as number))) {
            this.log(`${topic}: ${count} webhook(s)`);
          }
      }

      // Show helpful information
      this.log('\n💡 Helpful commands:');
      this.log('   • Create webhook: shopify-cli store webhook create');
      this.log('   • Delete webhook: shopify-cli store webhook delete <id>');
      this.log('   • Test webhook: Use webhook testing tools or check your endpoint logs');

      // Show common topics if no webhooks exist or few webhooks
      if (webhooks.length < 5) {
        this.log('\n🔗 Common webhook topics:');
        const commonTopics = [
          'orders/create', 'orders/updated', 'orders/paid', 'orders/cancelled',
          'products/create', 'products/update', 'products/delete',
          'customers/create', 'customers/update', 'customers/delete',
          'checkouts/create', 'checkouts/update'
        ];
        
        this.log(`   ${commonTopics.join(', ')}`);
      }

    } catch (error: any) {
      this.error(`Error: ${error.message}`);
    }
  }

  private getStatusIcon(webhook: any): string {
    // This is a simplified status check - in reality you'd want to validate the webhook
    if (!webhook.address) {
      return '❌';
    }
    
    if (webhook.address.startsWith('https://')) {
      return '🟢';
    }

 if (webhook.address.startsWith('http://')) {
      return '🟡';
    }
    
    return '🔵';
  }

  private truncateUrl(url: string, maxLength: number): string {
    if (url.length <= maxLength) {
      return url;
    }
    
    // Try to show the domain and path meaningfully
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      const path = urlObj.pathname;
      
      if (domain.length + path.length <= maxLength - 3) {
        return `${domain}${path}`;
      }

 if (domain.length <= maxLength - 3) {
        const availablePathLength = maxLength - domain.length - 3;
        return `${domain}${path.slice(0, Math.max(0, availablePathLength))}...`;
      }
 
        return `${domain.slice(0, Math.max(0, maxLength - 3))}...`;
      
    } catch {
      return `${url.slice(0, Math.max(0, maxLength - 3))}...`;
    }
  }
}
