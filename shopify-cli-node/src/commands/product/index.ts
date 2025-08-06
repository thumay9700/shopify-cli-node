import { Command, Flags } from '@oclif/core';

export default class Product extends Command {
  static override description = 'Manage Shopify products';
static override examples = [
    '<%= config.bin %> <%= command.id %> list',
    '<%= config.bin %> <%= command.id %> get 123',
    '<%= config.bin %> <%= command.id %> create --title "New Product"',
    '<%= config.bin %> <%= command.id %> update 123 --title "Updated Product"',
    '<%= config.bin %> <%= command.id %> delete 123',
  ];
static override flags = {
    help: Flags.help({ char: 'h' }),
  };

  public async run(): Promise<void> {
    this.log('📦 Shopify Product Management');
    this.log('');
    this.log('Available commands:');
    this.log('  list     - List all products');
    this.log('  get      - Get a specific product');
    this.log('  create   - Create a new product');
    this.log('  update   - Update an existing product');
    this.log('  delete   - Delete a product');
    this.log('');
    this.log('For more information on a command, run:');
    this.log('  <%= config.bin %> product [command] --help');
  }
}
