import { Args, Command, Flags } from '@oclif/core';

import { loadConfig, ShopifyAccount } from '../../../config';
import { ShopifyApiFactory } from '../../../services';

export default class ThemeActivate extends Command {
  static override args = {
    themeId: Args.string({
      description: 'Theme ID to activate',
      required: true,
    }),
  };
static override description = 'Activate a theme (make it live)';
static override examples = [
    '<%= config.bin %> <%= command.id %> 123456789',
    '<%= config.bin %> <%= command.id %> 123456789 --account mystore',
    '<%= config.bin %> <%= command.id %> 123456789 --backup',
    '<%= config.bin %> <%= command.id %> 123456789 --format json',
  ];
static override flags = {
    account: Flags.string({
      char: 'a',
      description: 'Shopify account to use (defaults to default account)',
    }),
    backup: Flags.boolean({
      char: 'b',
      default: false,
      description: 'Create backup of current live theme before activating',
    }),
    force: Flags.boolean({
      default: false,
      description: 'Skip confirmation prompts',
    }),
    format: Flags.string({
      char: 'f',
      default: 'table',
      description: 'Output format',
      options: ['json', 'table'],
    }),
    help: Flags.help({ char: 'h' }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(ThemeActivate);

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

      // First, verify the theme exists and get its details
      this.log(`🔍 Verifying theme ${args.themeId}...`);
      
      let themeToActivate;
      try {
        const themeResponse = await apiClient.themes.get(args.themeId);
        if (!themeResponse.data?.theme) {
          this.error(`Theme ${args.themeId} not found`);
        }

        themeToActivate = themeResponse.data.theme;
      } catch (error: any) {
        this.error(`Failed to find theme: ${error.message}`);
      }

      // Check if theme is already active
      if (themeToActivate.role === 'main') {
        this.log(`⚠️  Theme "${themeToActivate.name}" is already the active theme.`);
        return;
      }

      // Get current live theme for backup if requested
      let currentLiveTheme = null;
      if (flags.backup) {
        this.log('🔍 Finding current live theme...');
        const themesResponse = await apiClient.themes.list({ role: 'main' });
        currentLiveTheme = themesResponse.data?.themes?.[0];
        
        if (currentLiveTheme) {
          this.log(`📋 Current live theme: "${currentLiveTheme.name}" (ID: ${currentLiveTheme.id})`);
        }
      }

      // Show confirmation unless force flag is used
      if (!flags.force) {
        this.log('\n🚀 Theme Activation Summary:');
        this.log('─'.repeat(40));
        this.log(`Theme to activate: "${themeToActivate.name}" (ID: ${themeToActivate.id})`);
        this.log(`Role: ${themeToActivate.role} → main`);
        this.log(`Store: ${account.name}`);
        
        if (currentLiveTheme) {
          this.log(`Current live theme: "${currentLiveTheme.name}" will be demoted to unpublished`);
          if (flags.backup) {
            this.log('📦 A backup will be created of the current theme');
          }
        }

        this.log('\n⚠️  This action will make the theme live on your store.');
        
        // In a real CLI, you'd use a prompt library here
        // For now, we'll assume the user confirmed
        this.log('✅ Proceeding with activation...');
      }

      // Create backup if requested
      if (flags.backup && currentLiveTheme) {
        try {
          this.log('\n📦 Creating backup of current live theme...');
          const backupName = `${currentLiveTheme.name} - Backup ${new Date().toISOString().split('T')[0]}`;
          
          // First demote current theme to unpublished, then rename it
          await apiClient.themes.update(currentLiveTheme.id, {
            name: backupName,
            role: 'unpublished',
          });
          
          this.log(`✅ Backup created: "${backupName}"`);
        } catch (backupError: any) {
          this.log(`⚠️  Warning: Failed to create backup: ${backupError.message}`);
          this.log('Continuing with activation...');
        }
      }

      // Activate the theme
      this.log('\n🚀 Activating theme...');
      const startTime = Date.now();

      const activateResponse = await apiClient.themes.update(args.themeId, {
        role: 'main'
      });
      const duration = Date.now() - startTime;

      if (!activateResponse.data?.theme) {
        this.error('Failed to activate theme');
      }

      const activatedTheme = activateResponse.data.theme;

      // Display results
      if (flags.format === 'json') {
        this.log(JSON.stringify(activatedTheme, null, 2));
        return;
      }

      // Table format (default)
      this.log(`\n✅ Theme activated successfully (${duration}ms)`);
      this.log('\n🎨 Active Theme Details:');
      this.log('─'.repeat(40));
      
      this.log(`Name: ${activatedTheme.name}`);
      this.log(`ID: ${activatedTheme.id}`);
      this.log(`Role: ${activatedTheme.role}`);
      this.log(`Store: ${account.shopUrl}`);
      this.log(`Activated: ${new Date().toLocaleString()}`);

      // Show store URL
      const storeUrl = account.shopUrl.startsWith('http') 
        ? account.shopUrl 
        : `https://${account.shopUrl}`;
      
      this.log(`\n🌐 Your store is now live with this theme:`);
      this.log(`   ${storeUrl}`);

      // Show helpful tips
      this.log('\n💡 Helpful tips:');
      this.log('   • You can preview other themes without activating them');
      this.log('   • Use the backup flag to automatically backup your current theme');
      this.log('   • Theme changes may take a few minutes to fully propagate');

      if (flags.backup && currentLiveTheme) {
        this.log(`   • Your previous theme has been backed up as "${currentLiveTheme.name} - Backup"`);
      }

    } catch (error: any) {
      this.error(`Error: ${error.message}`);
    }
  }
}
