import { Command, Flags } from '@oclif/core';

export default class Store extends Command {
  static override description = 'Manage Shopify store configuration';
static override examples = [
    '<%= config.bin %> <%= command.id %> settings view',
    '<%= config.bin %> <%= command.id %> settings update --theme light',
    '<%= config.bin %> <%= command.id %> theme list',
    '<%= config.bin %> <%= command.id %> theme activate 123456789',
    '<%= config.bin %> <%= command.id %> webhook list',
    '<%= config.bin %> <%= command.id %> webhook create --topic orders/create --address https://example.com/webhook',
  ];
static override flags = {
    help: Flags.help({ char: 'h' }),
  };

  public async run(): Promise<void> {
    this.log('🏪 Shopify Store Configuration');
    this.log('');
    this.log('Available commands:');
    this.log('');
    this.log('Settings:');
    this.log('  settings view    - View current store settings');
    this.log('  settings update  - Update store settings');
    this.log('');
    this.log('Themes:');
    this.log('  theme list       - List all themes');
    this.log('  theme upload     - Upload a theme');
    this.log('  theme activate   - Activate a theme');
    this.log('');
    this.log('Webhooks:');
    this.log('  webhook list     - List all webhooks');
    this.log('  webhook create   - Create a new webhook');
    this.log('  webhook delete   - Delete a webhook');
    this.log('');
    this.log('For more information on a command, run:');
    this.log('  <%= config.bin %> store [category] [command] --help');
  }
}
