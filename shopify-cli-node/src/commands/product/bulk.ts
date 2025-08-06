import { Command, Flags, Args } from '@oclif/core';
import * as fs from 'fs-extra';
import * as path from 'path';

import { loadConfig, ShopifyAccount } from '../../config';
import { ShopifyApiFactory } from '../../services';
import { 
  InteractivePromptManager, 
  isInteractiveEnvironment,
  isScriptableMode,
  ScriptableOutputManager 
} from '../../utils';

interface BulkProductOperation {
  id: number;
  operation: 'update' | 'delete' | 'activate' | 'archive';
  data?: Record<string, any>;
}

export default class ProductBulk extends Command {
  static override description = 'Perform bulk operations on products';
  
  static override examples = [
    '<%= config.bin %> <%= command.id %> update --file products.json',
    '<%= config.bin %> <%= command.id %> delete --ids "123,456,789"',
    '<%= config.bin %> <%= command.id %> activate --vendor "Nike"',
    '<%= config.bin %> <%= command.id %> archive --tag "discontinued"',
    '<%= config.bin %> <%= command.id %> update --status active --vendor "Nike" --set-tags "sale,active"',
  ];

  static override args = {
    operation: Args.string({
      description: 'Bulk operation to perform',
      options: ['update', 'delete', 'activate', 'archive'],
      required: true,
    }),
  };

  static override flags = {
    account: Flags.string({
      char: 'a',
      description: 'Shopify account to use (defaults to default account)',
    }),
    'batch-size': Flags.integer({
      default: 10,
      description: 'Number of products to process in each batch',
    }),
    'dry-run': Flags.boolean({
      description: 'Show what would be done without making changes',
    }),
    file: Flags.string({
      description: 'JSON file containing bulk operations',
    }),
    format: Flags.string({
      char: 'f',
      default: 'table',
      description: 'Output format',
      options: ['json', 'table', 'csv'],
    }),
    help: Flags.help({ char: 'h' }),
    ids: Flags.string({
      description: 'Comma-separated list of product IDs',
    }),
    interactive: Flags.boolean({
      default: isInteractiveEnvironment(),
      description: 'Enable interactive prompts',
    }),
    'max-retries': Flags.integer({
      default: 3,
      description: 'Maximum number of retries for failed operations',
    }),
    'no-interactive': Flags.boolean({
      default: false,
      description: 'Disable interactive prompts',
    }),
    'output-file': Flags.string({
      description: 'Save results to file',
    }),
    pretty: Flags.boolean({
      default: true,
      description: 'Pretty print JSON output',
    }),
    'product-type': Flags.string({
      description: 'Filter by product type',
    }),
    'set-tags': Flags.string({
      description: 'Set tags (comma-separated) for update operations',
    }),
    'set-vendor': Flags.string({
      description: 'Set vendor for update operations',
    }),
    status: Flags.string({
      description: 'Filter by product status',
      options: ['active', 'archived', 'draft'],
    }),
    tag: Flags.string({
      description: 'Filter by product tag',
    }),
    vendor: Flags.string({
      description: 'Filter by vendor name',
    }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(ProductBulk);
    
    const isInteractive = flags.interactive && !flags['no-interactive'] && !isScriptableMode();
    const outputManager = new ScriptableOutputManager('product:bulk');

    try {
      // Load configuration
      const config = await loadConfig();
      
      // Get account
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

      outputManager.setAccount(account.name);
      
      // Create API client
      const apiClient = ShopifyApiFactory.create(account);

      // Determine what products to operate on
      let productIds: number[] = [];
      let operations: BulkProductOperation[] = [];

      if (flags.file) {
        // Load operations from file
        if (!await fs.pathExists(flags.file)) {
          this.error(`File not found: ${flags.file}`);
        }
        
        const fileContent = await fs.readFile(flags.file, 'utf8');
        const data = JSON.parse(fileContent);
        
        if (Array.isArray(data)) {
          operations = data;
        } else {
          this.error('File must contain an array of operations');
        }
      } else if (flags.ids) {
        // Use specified IDs
        productIds = flags.ids.split(',').map(id => parseInt(id.trim(), 10));
        operations = productIds.map(id => ({
          id,
          operation: args.operation as any,
          data: this.buildUpdateData(flags),
        }));
      } else {
        // Find products by filters
        const filters: Record<string, any> = {};
        if (flags.status) filters.status = flags.status;
        if (flags.vendor) filters.vendor = flags.vendor;
        if (flags['product-type']) filters.product_type = flags['product-type'];
        
        // Get products matching filters
        const response = await apiClient.products.list({ ...filters, limit: 250 });
        const matchingProducts = response.data.products;
        
        if (flags.tag) {
          // Filter by tag if specified
          const taggedProducts = matchingProducts.filter(product => 
            product.tags && product.tags.includes(flags.tag!)
          );
          productIds = taggedProducts.map(p => p.id);
        } else {
          productIds = matchingProducts.map(p => p.id);
        }

        operations = productIds.map(id => ({
          id,
          operation: args.operation as any,
          data: this.buildUpdateData(flags),
        }));
      }

      if (operations.length === 0) {
        this.log('No products found matching the specified criteria.');
        return;
      }

      // Show preview in dry-run mode
      if (flags['dry-run']) {
        this.log(`\n🔍 Dry Run Mode - ${operations.length} products would be affected:\n`);
        
        const preview = operations.slice(0, 10).map(op => ({
          id: op.id,
          operation: op.operation,
          changes: op.data || 'N/A',
        }));

        if (flags.format === 'json') {
          this.log(JSON.stringify(preview, null, flags.pretty ? 2 : 0));
        } else {
          console.table(preview);
        }

        if (operations.length > 10) {
          this.log(`... and ${operations.length - 10} more products`);
        }

        this.log('\nAdd --no-dry-run to execute these operations.');
        return;
      }

      // Confirm operation in interactive mode
      if (isInteractive) {
        const promptManager = new InteractivePromptManager(true);
        await promptManager.initialize();

        const confirmed = await promptManager.confirm(
          `Are you sure you want to ${args.operation} ${operations.length} products?`,
          false
        );

        if (!confirmed) {
          this.log('Operation cancelled.');
          return;
        }
      }

      // Execute bulk operations
      this.log(`\n🚀 Starting bulk ${args.operation} operation on ${operations.length} products...\n`);
      
      const results = await this.executeBulkOperations(apiClient, operations, flags);

      // Display results
      const summary = {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        errors: results.filter(r => !r.success).map(r => ({
          id: r.id,
          error: r.error,
        })),
      };

      if (flags.format === 'json') {
        const output = outputManager.success('BULK_OPERATION_COMPLETE', 'Bulk operation completed', {
          summary,
          results: flags.pretty ? results : results.map(r => ({ id: r.id, success: r.success })),
        });
        this.log(outputManager.output(output, { format: 'json', pretty: flags.pretty }));
      } else {
        this.log(`\n✅ Bulk operation completed!`);
        this.log(`   Successful: ${summary.successful}`);
        this.log(`   Failed: ${summary.failed}`);
        
        if (summary.failed > 0) {
          this.log(`\n❌ Failed operations:`);
          summary.errors.forEach(error => {
            this.log(`   Product ${error.id}: ${error.error}`);
          });
        }
      }

      // Save results to file if requested
      if (flags['output-file']) {
        await fs.writeFile(
          flags['output-file'], 
          JSON.stringify({ summary, results }, null, 2)
        );
        this.log(`\n💾 Results saved to: ${flags['output-file']}`);
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorResponse = outputManager.error('BULK_OPERATION_FAILED', errorMessage);
      
      if (isScriptableMode() || flags.format === 'json') {
        this.log(outputManager.output(errorResponse, { format: flags.format as any, pretty: flags.pretty }));
      } else {
        this.error(`Bulk operation failed: ${errorMessage}`);
      }
    }
  }

  private buildUpdateData(flags: any): Record<string, any> | undefined {
    const data: Record<string, any> = {};
    
    if (flags['set-tags']) {
      data.tags = flags['set-tags'].split(',').map((tag: string) => tag.trim());
    }
    
    if (flags['set-vendor']) {
      data.vendor = flags['set-vendor'];
    }

    return Object.keys(data).length > 0 ? data : undefined;
  }

  private async executeBulkOperations(
    apiClient: any, 
    operations: BulkProductOperation[], 
    flags: any
  ): Promise<Array<{ id: number; success: boolean; error?: string; data?: any }>> {
    const results: Array<{ id: number; success: boolean; error?: string; data?: any }> = [];
    const batchSize = flags['batch-size'] || 10;
    
    // Process in batches to avoid rate limiting
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      
      this.log(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(operations.length / batchSize)} (${batch.length} products)...`);
      
      const batchPromises = batch.map(async (operation) => {
        let retries = 0;
        const maxRetries = flags['max-retries'] || 3;
        
        while (retries <= maxRetries) {
          try {
            let result;
            
            switch (operation.operation) {
              case 'update':
                if (operation.data) {
                  result = await apiClient.products.update(operation.id, operation.data);
                } else {
                  throw new Error('No update data provided');
                }
                break;
                
              case 'delete':
                result = await apiClient.products.delete(operation.id);
                break;
                
              case 'activate':
                result = await apiClient.products.update(operation.id, { status: 'active' });
                break;
                
              case 'archive':
                result = await apiClient.products.update(operation.id, { status: 'archived' });
                break;
                
              default:
                throw new Error(`Unknown operation: ${operation.operation}`);
            }
            
            return {
              id: operation.id,
              success: true,
              data: result.data,
            };
            
          } catch (error: unknown) {
            retries++;
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            if (retries <= maxRetries) {
              // Wait before retry
              await new Promise(resolve => setTimeout(resolve, 1000 * retries));
              continue;
            }
            
            return {
              id: operation.id,
              success: false,
              error: errorMessage,
            };
          }
        }
        
        return {
          id: operation.id,
          success: false,
          error: 'Max retries exceeded',
        };
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Rate limiting pause between batches
      if (i + batchSize < operations.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return results;
  }
}
