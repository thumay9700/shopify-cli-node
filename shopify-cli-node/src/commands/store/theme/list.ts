import { Command, Flags } from '@oclif/core';

import { loadConfig, ShopifyAccount } from '../../../config';
import { ShopifyApiFactory } from '../../../services';

export default class ThemeList extends Command {
  static override description = 'List all store themes';
static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --account mystore',
    '<%= config.bin %> <%= command.id %> --role main',
    '<%= config.bin %> <%= command.id %> --format json',
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
    role: Flags.string({
      char: 'r',
      description: 'Filter themes by role',
      options: ['main', 'unpublished', 'demo', 'development'],
    }),
    'show-details': Flags.boolean({
      default: false,
      description: 'Show detailed theme information',
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(ThemeList);

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
      const params: any = {};
      if (flags.role) {
        params.role = flags.role;
      }

      if (flags['show-details']) {
        params.fields = 'id,name,role,theme_store_id,previewable,processing,created_at,updated_at';
      }

      // Fetch themes
      this.log(`🎨 Fetching themes from ${account.name}...`);
      const startTime = Date.now();

      const response = await apiClient.themes.list(params);
      const duration = Date.now() - startTime;

      if (!response.data || !response.data.themes) {
        this.error('Failed to fetch themes');
      }

      const {themes} = response.data;

      // Display results
      if (flags.format === 'json') {
        this.log(JSON.stringify(themes, null, 2));
        return;
      }

      // Table format (default)
      this.log(`\n✅ Retrieved ${themes.length} theme(s) (${duration}ms)`);
      
      if (themes.length === 0) {
        this.log('\n❌ No themes found');
        return;
      }

      this.log('\n🎨 Themes:');
      this.log('─'.repeat(80));

      if (flags['show-details']) {
        // Detailed view
        for (const theme of themes) {
          const roleIcon = this.getRoleIcon(theme.role);
          this.log(`${roleIcon} ${theme.name} (ID: ${theme.id})`);
          this.log(`   Role: ${theme.role}`);
          this.log(`   Previewable: ${theme.previewable ? '✅' : '❌'}`);
          this.log(`   Processing: ${theme.processing ? '⏳' : '✅'}`);
          if (theme.theme_store_id) {
            this.log(`   Theme Store ID: ${theme.theme_store_id}`);
          }

          this.log(`   Created: ${new Date(theme.created_at).toLocaleDateString()}`);
          this.log(`   Updated: ${new Date(theme.updated_at).toLocaleDateString()}`);
          this.log('');
        }
      } else {
        // Simple table view
        this.log('ID'.padEnd(12) + 'Name'.padEnd(30) + 'Role'.padEnd(15) + 'Status');
        this.log('─'.repeat(65));

        for (const theme of themes) {
          const id = String(theme.id).padEnd(12);
          const name = theme.name.slice(0, 28).padEnd(30);
          const role = theme.role.padEnd(15);
          const roleIcon = this.getRoleIcon(theme.role);
          let status = '';
          
          if (theme.processing) {
            status = '⏳ Processing';
          } else if (theme.role === 'main') {
            status = '🟢 Live';
          } else if (theme.previewable) {
            status = '🔵 Ready';
          } else {
            status = '⚪ Not Ready';
          }

          this.log(`${id}${name}${roleIcon} ${role}${status}`);
        }
      }

      // Show summary
      const roleCounts = themes.reduce((acc: any, theme: any) => {
        acc[theme.role] = (acc[theme.role] || 0) + 1;
        return acc;
      }, {});

      this.log('\n📊 Summary:');
      this.log('─'.repeat(20));
      for (const [role, count] of Object.entries(roleCounts)) {
        const icon = this.getRoleIcon(role);
        this.log(`${icon} ${role}: ${count}`);
      }

      // Show helpful information
      const mainTheme = themes.find((t: any) => t.role === 'main');
      if (mainTheme) {
        this.log(`\n🟢 Currently live theme: ${mainTheme.name} (ID: ${mainTheme.id})`);
      }

    } catch (error: any) {
      this.error(`Error: ${error.message}`);
    }
  }

  private getRoleIcon(role: string): string {
    switch (role) {
      case 'demo': {
        return '🟡';
      }

      case 'development': {
        return '🟣';
      }

      case 'main': {
        return '🟢';
      }

      case 'unpublished': {
        return '🔵';
      }

      default: {
        return '⚪';
      }
    }
  }
}
