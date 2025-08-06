import { Command, Flags } from '@oclif/core';

export default class Order extends Command {
  static override description = 'Manage Shopify orders';
static override examples = [
    '<%= config.bin %> <%= command.id %> list',
    '<%= config.bin %> <%= command.id %> get 123',
    '<%= config.bin %> <%= command.id %> fulfill 123',
    '<%= config.bin %> <%= command.id %> cancel 123',
  ];
static override flags = {
    help: Flags.help({ char: 'h' }),
  };

  public async run(): Promise<void> {
    this.log('🛒 Shopify Order Management');
    this.log('');
    this.log('Available commands:');
    this.log('  list     - List all orders');
    this.log('  get      - Get a specific order');
    this.log('  fulfill  - Fulfill an order');
    this.log('  cancel   - Cancel an order');
    this.log('');
    this.log('For more information on a command, run:');
    this.log('  <%= config.bin %> order [command] --help');
  }
}
