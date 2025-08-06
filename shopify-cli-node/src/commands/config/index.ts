import { Command, Flags } from '@oclif/core';

import { configLoader, ConfigurationError } from '../../config/index';

export default class Config extends Command {
  static override description = 'Show Shopify CLI configuration';
static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --format json',
  ];
static override flags = {
    format: Flags.string({
      char: 'f',
      default: 'table',
      description: 'output format',
      options: ['json', 'table'],
    }),
    help: Flags.help({ char: 'h' }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(Config);

    try {
      await this.showConfig(flags.format);
    } catch (error) {
      if (error instanceof ConfigurationError) {
        this.error(`Configuration error: ${error.message}`);
      } else {
        this.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  private async showConfig(format: string): Promise<void> {
    const config = await configLoader.load();
    const paths = configLoader.getConfigPaths();

    if (format === 'json') {
      this.log(JSON.stringify(config, null, 2));
      return;
    }

    // Table format (default)
    this.log('📋 Shopify CLI Configuration');
    this.log('');
    this.log(`Version: ${config.version}`);
    this.log(`Last Updated: ${new Date(config.lastUpdated).toLocaleString()}`);
    this.log(`Config Path: ${paths.configPath}`);
    this.log(`Accounts: ${config.accounts.length}`);
    this.log(`Decodo API: ${config.decodoApi ? '✅ Configured' : '❌ Not configured'}`);
    this.log(`Proxy: ${config.proxy?.enabled ? '✅ Enabled' : '❌ Disabled'}`);
    
    if (config.accounts.length > 0) {
      this.log('\n👥 Accounts:');
      for (const account of config.accounts) {
        const defaultLabel = account.isDefault ? ' (default)' : '';
        const tokenLabel = account.accessToken ? '✅' : '❌';
        const apiKeyLabel = account.apiKey ? '✅' : '❌';
        this.log(`  • ${account.name}${defaultLabel}`);
        this.log(`    URL: ${account.shopUrl}`);
        this.log(`    Token: ${tokenLabel}, API Key: ${apiKeyLabel}`);
      }
    }
    
    this.log('\n⚙️ Settings:');
    this.log(`  Debug: ${config.settings.debug ? '✅' : '❌'}`);
    this.log(`  Log Level: ${config.settings.logLevel}`);
    this.log(`  Theme: ${config.settings.theme}`);
    this.log(`  Auto Update: ${config.settings.autoUpdate ? '✅' : '❌'}`);
  }

}
