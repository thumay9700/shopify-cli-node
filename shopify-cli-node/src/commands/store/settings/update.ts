import { Command, Flags } from '@oclif/core';

import { configLoader } from '../../../config';

export default class SettingsUpdate extends Command {
  static override description = 'Update local CLI settings and store configuration';
static override examples = [
    '<%= config.bin %> <%= command.id %> --theme dark',
    '<%= config.bin %> <%= command.id %> --debug --log-level debug',
    '<%= config.bin %> <%= command.id %> --auto-update true',
    '<%= config.bin %> <%= command.id %> --theme light --auto-update false',
  ];
static override flags = {
    'auto-update': Flags.boolean({
      allowNo: true,
      description: 'Enable auto-updates',
    }),
    debug: Flags.boolean({
      allowNo: true,
      description: 'Enable debug mode',
    }),
    format: Flags.string({
      char: 'f',
      default: 'table',
      description: 'Output format',
      options: ['json', 'table'],
    }),
    help: Flags.help({ char: 'h' }),
    'log-level': Flags.string({
      description: 'Set log level',
      options: ['error', 'warn', 'info', 'debug'],
    }),
    theme: Flags.string({
      description: 'Set CLI theme',
      options: ['default', 'light', 'dark'],
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(SettingsUpdate);

    try {
      // Load current configuration
      const config = await configLoader.load();
      
      let hasChanges = false;
      const changes: string[] = [];

      // Update theme if provided
      if (flags.theme && flags.theme !== config.settings.theme) {
        config.settings.theme = flags.theme as 'dark' | 'default' | 'light';
        changes.push(`Theme: ${flags.theme}`);
        hasChanges = true;
      }

      // Update debug flag if provided
      if (flags.debug !== undefined && flags.debug !== config.settings.debug) {
        config.settings.debug = flags.debug;
        changes.push(`Debug: ${flags.debug ? 'enabled' : 'disabled'}`);
        hasChanges = true;
      }

      // Update log level if provided
      if (flags['log-level'] && flags['log-level'] !== config.settings.logLevel) {
        config.settings.logLevel = flags['log-level'] as 'debug' | 'error' | 'info' | 'warn';
        changes.push(`Log Level: ${flags['log-level']}`);
        hasChanges = true;
      }

      // Update auto-update if provided
      if (flags['auto-update'] !== undefined && flags['auto-update'] !== config.settings.autoUpdate) {
        config.settings.autoUpdate = flags['auto-update'];
        changes.push(`Auto-update: ${flags['auto-update'] ? 'enabled' : 'disabled'}`);
        hasChanges = true;
      }

      if (!hasChanges) {
        this.log('⚠️  No changes specified. Use --help to see available options.');
        return;
      }

      // Update last modified timestamp
      config.lastUpdated = new Date().toISOString();

      // Save configuration
      await configLoader.save(config);

      // Display results
      if (flags.format === 'json') {
        this.log(JSON.stringify({
          changes,
          settings: config.settings,
          status: 'updated'
        }, null, 2));
        return;
      }

      // Table format (default)
      this.log('✅ Settings updated successfully');
      this.log('');
      this.log('📝 Changes made:');
      this.log('─'.repeat(30));
      
      for (const change of changes) {
        this.log(`  • ${change}`);
      }

      this.log('');
      this.log('⚙️ Current Settings:');
      this.log('─'.repeat(25));
      this.log(`Theme: ${config.settings.theme}`);
      this.log(`Debug: ${config.settings.debug ? '✅ Enabled' : '❌ Disabled'}`);
      this.log(`Log Level: ${config.settings.logLevel}`);
      this.log(`Auto-update: ${config.settings.autoUpdate ? '✅ Enabled' : '❌ Disabled'}`);
      this.log(`Last Updated: ${new Date(config.lastUpdated).toLocaleString()}`);

      // Show helpful tips
      if (changes.some(c => c.includes('Debug: enabled'))) {
        this.log('');
        this.log('💡 Debug mode enabled. You will see detailed API request/response information.');
      }

      if (changes.some(c => c.includes('Theme:'))) {
        this.log('');
        this.log('💡 Theme changes may require restarting your terminal for full effect.');
      }

    } catch (error: any) {
      this.error(`Error updating settings: ${error.message}`);
    }
  }
}
