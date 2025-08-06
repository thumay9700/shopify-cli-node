#!/usr/bin/env node
/**
 * Automation Helper Scripts
 * Supporting utilities for CI/CD automation examples
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

/**
 * Configuration management utilities
 */
class ConfigManager {
  static async validateEnvironment(required = []) {
    const missing = [];
    
    for (const key of required) {
      if (!process.env[key]) {
        missing.push(key);
      }
    }
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    return true;
  }
  
  static async createShopifyConfig(accounts = [], settings = {}) {
    const config = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      accounts,
      settings: {
        debug: false,
        logLevel: 'info',
        ...settings
      }
    };
    
    const configDir = path.join(process.env.HOME || process.env.USERPROFILE, '.shopify-cli');
    await fs.mkdir(configDir, { recursive: true });
    
    const configPath = path.join(configDir, 'config.yaml');
    const yaml = require('js-yaml');
    await fs.writeFile(configPath, yaml.dump(config));
    
    return configPath;
  }
}

/**
 * Inventory synchronization helper
 */
class InventorySync {
  constructor(cliPath = './bin/run.js') {
    this.cliPath = cliPath;
  }
  
  async getInventoryLevels(account) {
    console.log(`Fetching inventory levels for ${account}...`);
    
    const cmd = `${this.cliPath} product inventory levels --account ${account} --format json`;
    const output = execSync(cmd, { encoding: 'utf8' });
    
    return JSON.parse(output);
  }
  
  async compareInventory(productionData, stagingData) {
    const discrepancies = [];
    
    for (const prodItem of productionData.inventory) {
      const stagingItem = stagingData.inventory.find(
        item => item.product_id === prodItem.product_id && 
               item.variant_id === prodItem.variant_id
      );
      
      if (!stagingItem) {
        discrepancies.push({
          type: 'missing_in_staging',
          product_id: prodItem.product_id,
          variant_id: prodItem.variant_id,
          production_quantity: prodItem.quantity
        });
      } else if (Math.abs(stagingItem.quantity - prodItem.quantity) > 5) {
        discrepancies.push({
          type: 'quantity_mismatch',
          product_id: prodItem.product_id,
          variant_id: prodItem.variant_id,
          production_quantity: prodItem.quantity,
          staging_quantity: stagingItem.quantity,
          difference: Math.abs(stagingItem.quantity - prodItem.quantity)
        });
      }
    }
    
    return discrepancies;
  }
  
  async syncInventory(discrepancies, targetAccount) {
    const results = [];
    
    for (const item of discrepancies) {
      try {
        if (item.type === 'quantity_mismatch') {
          console.log(`Syncing inventory for product ${item.product_id}, variant ${item.variant_id}`);
          
          const cmd = `${this.cliPath} product inventory adjust ` +
            `--account ${targetAccount} ` +
            `--product-id ${item.product_id} ` +
            `--variant-id ${item.variant_id} ` +
            `--quantity ${item.production_quantity} ` +
            `--format json`;
          
          const output = execSync(cmd, { encoding: 'utf8' });
          results.push({
            ...item,
            status: 'synced',
            result: JSON.parse(output)
          });
        }
      } catch (error) {
        results.push({
          ...item,
          status: 'error',
          error: error.message
        });
      }
    }
    
    return results;
  }
}

/**
 * Webhook management helper
 */
class WebhookManager {
  constructor(cliPath = './bin/run.js') {
    this.cliPath = cliPath;
  }
  
  async getCurrentWebhooks(account) {
    const cmd = `${this.cliPath} store webhook list --account ${account} --format json`;
    const output = execSync(cmd, { encoding: 'utf8' });
    return JSON.parse(output);
  }
  
  async loadDesiredWebhooks(configPath) {
    const content = await fs.readFile(configPath, 'utf8');
    return JSON.parse(content);
  }
  
  async syncWebhooks(account, configPath) {
    const current = await this.getCurrentWebhooks(account);
    const desired = await this.loadDesiredWebhooks(configPath);
    
    const results = {
      created: [],
      updated: [],
      deleted: [],
      errors: []
    };
    
    // Create or update webhooks
    for (const webhook of desired.webhooks) {
      try {
        const existing = current.webhooks.find(w => w.topic === webhook.topic);
        
        if (existing) {
          if (existing.address !== webhook.address) {
            console.log(`Updating webhook for ${webhook.topic}`);
            const cmd = `${this.cliPath} store webhook update ` +
              `--account ${account} ` +
              `--id ${existing.id} ` +
              `--address "${webhook.address}" ` +
              `--format json`;
            
            const output = execSync(cmd, { encoding: 'utf8' });
            results.updated.push(JSON.parse(output));
          }
        } else {
          console.log(`Creating webhook for ${webhook.topic}`);
          const cmd = `${this.cliPath} store webhook create ` +
            `--account ${account} ` +
            `--topic ${webhook.topic} ` +
            `--address "${webhook.address}" ` +
            `--format json`;
          
          const output = execSync(cmd, { encoding: 'utf8' });
          results.created.push(JSON.parse(output));
        }
      } catch (error) {
        results.errors.push({
          webhook: webhook.topic,
          error: error.message
        });
      }
    }
    
    // Delete webhooks not in desired state
    const desiredTopics = desired.webhooks.map(w => w.topic);
    for (const webhook of current.webhooks) {
      if (!desiredTopics.includes(webhook.topic)) {
        try {
          console.log(`Deleting webhook for ${webhook.topic}`);
          const cmd = `${this.cliPath} store webhook delete ` +
            `--account ${account} ` +
            `--id ${webhook.id} ` +
            `--format json`;
          
          const output = execSync(cmd, { encoding: 'utf8' });
          results.deleted.push(JSON.parse(output));
        } catch (error) {
          results.errors.push({
            webhook: webhook.topic,
            error: error.message
          });
        }
      }
    }
    
    return results;
  }
}

/**
 * Deployment validation helper
 */
class DeploymentValidator {
  constructor(cliPath = './bin/run.js') {
    this.cliPath = cliPath;
  }
  
  async validateStoreConnection(account) {
    try {
      const cmd = `${this.cliPath} config --test-connection --account ${account} --format json`;
      execSync(cmd, { encoding: 'utf8' });
      return { status: 'success', account };
    } catch (error) {
      return { status: 'error', account, error: error.message };
    }
  }
  
  async validateProductCount(account, expectedMin = 0) {
    try {
      const cmd = `${this.cliPath} product list --account ${account} --format json --limit 1`;
      const output = execSync(cmd, { encoding: 'utf8' });
      const data = JSON.parse(output);
      
      const totalProducts = data.pagination?.total || 0;
      
      return {
        status: totalProducts >= expectedMin ? 'success' : 'warning',
        account,
        totalProducts,
        expectedMin,
        message: totalProducts >= expectedMin 
          ? `Product count (${totalProducts}) meets minimum requirement`
          : `Product count (${totalProducts}) below expected minimum (${expectedMin})`
      };
    } catch (error) {
      return { status: 'error', account, error: error.message };
    }
  }
  
  async validateWebhookSetup(account, requiredTopics = []) {
    try {
      const webhooks = await new WebhookManager(this.cliPath).getCurrentWebhooks(account);
      const currentTopics = webhooks.webhooks.map(w => w.topic);
      const missing = requiredTopics.filter(topic => !currentTopics.includes(topic));
      
      return {
        status: missing.length === 0 ? 'success' : 'warning',
        account,
        currentTopics,
        requiredTopics,
        missing,
        message: missing.length === 0 
          ? 'All required webhooks are configured'
          : `Missing webhooks: ${missing.join(', ')}`
      };
    } catch (error) {
      return { status: 'error', account, error: error.message };
    }
  }
  
  async runFullValidation(account, options = {}) {
    console.log(`Running full validation for ${account}...`);
    
    const results = {
      account,
      timestamp: new Date().toISOString(),
      validations: {}
    };
    
    // Store connection
    results.validations.connection = await this.validateStoreConnection(account);
    
    // Product count
    if (options.minProducts) {
      results.validations.products = await this.validateProductCount(account, options.minProducts);
    }
    
    // Webhook setup
    if (options.requiredWebhooks) {
      results.validations.webhooks = await this.validateWebhookSetup(account, options.requiredWebhooks);
    }
    
    // Overall status
    const hasErrors = Object.values(results.validations).some(v => v.status === 'error');
    const hasWarnings = Object.values(results.validations).some(v => v.status === 'warning');
    
    results.overallStatus = hasErrors ? 'error' : hasWarnings ? 'warning' : 'success';
    
    return results;
  }
}

/**
 * Report generation helper
 */
class ReportGenerator {
  static async generateDeploymentReport(validationResults, deploymentData = {}) {
    const timestamp = new Date().toISOString();
    
    const report = {
      title: 'Shopify CLI Deployment Report',
      timestamp,
      environment: deploymentData.environment || 'unknown',
      buildNumber: deploymentData.buildNumber || 'N/A',
      validation: validationResults,
      summary: {
        totalValidations: Object.keys(validationResults.validations || {}).length,
        successful: 0,
        warnings: 0,
        errors: 0
      },
      recommendations: []
    };
    
    // Calculate summary
    for (const validation of Object.values(validationResults.validations || {})) {
      switch (validation.status) {
        case 'success':
          report.summary.successful++;
          break;
        case 'warning':
          report.summary.warnings++;
          break;
        case 'error':
          report.summary.errors++;
          break;
      }
    }
    
    // Generate recommendations
    if (report.summary.errors > 0) {
      report.recommendations.push('Address all error conditions before proceeding to production');
    }
    
    if (report.summary.warnings > 0) {
      report.recommendations.push('Review warning conditions and plan resolution');
    }
    
    if (report.summary.successful === report.summary.totalValidations) {
      report.recommendations.push('Deployment validation successful - ready for production');
    }
    
    return report;
  }
  
  static async saveReport(report, format = 'json') {
    const reportsDir = path.join(process.cwd(), 'reports');
    await fs.mkdir(reportsDir, { recursive: true });
    
    const filename = `deployment-report-${report.timestamp.replace(/:/g, '-').split('.')[0]}`;
    
    if (format === 'json') {
      const filePath = path.join(reportsDir, `${filename}.json`);
      await fs.writeFile(filePath, JSON.stringify(report, null, 2));
      return filePath;
    }
    
    if (format === 'html') {
      const filePath = path.join(reportsDir, `${filename}.html`);
      const html = ReportGenerator.generateHTML(report);
      await fs.writeFile(filePath, html);
      return filePath;
    }
    
    throw new Error(`Unsupported format: ${format}`);
  }
  
  static generateHTML(report) {
    const statusColor = {
      success: '#28a745',
      warning: '#ffc107',
      error: '#dc3545'
    };
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>${report.title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .status-success { color: ${statusColor.success}; }
        .status-warning { color: ${statusColor.warning}; }
        .status-error { color: ${statusColor.error}; }
        .validation-item { margin: 20px 0; padding: 15px; border-left: 4px solid #ddd; }
        .summary { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .recommendations { background: #e7f3ff; padding: 20px; border-radius: 5px; margin: 20px 0; }
        pre { background: #f4f4f4; padding: 10px; border-radius: 3px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${report.title}</h1>
        <p><strong>Environment:</strong> ${report.environment}</p>
        <p><strong>Build:</strong> ${report.buildNumber}</p>
        <p><strong>Generated:</strong> ${report.timestamp}</p>
    </div>
    
    <div class="summary">
        <h2>Summary</h2>
        <ul>
            <li><span class="status-success">Successful: ${report.summary.successful}</span></li>
            <li><span class="status-warning">Warnings: ${report.summary.warnings}</span></li>
            <li><span class="status-error">Errors: ${report.summary.errors}</span></li>
        </ul>
    </div>
    
    <h2>Validation Results</h2>
    ${Object.entries(report.validation.validations || {}).map(([key, validation]) => `
        <div class="validation-item">
            <h3>${key} <span class="status-${validation.status}">(${validation.status})</span></h3>
            <p>${validation.message || 'No message'}</p>
            ${validation.error ? `<pre>Error: ${validation.error}</pre>` : ''}
        </div>
    `).join('')}
    
    ${report.recommendations.length > 0 ? `
        <div class="recommendations">
            <h2>Recommendations</h2>
            <ul>
                ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
    ` : ''}
</body>
</html>
    `.trim();
  }
}

/**
 * Low stock alert helper
 */
class StockAlertManager {
  constructor(cliPath = './bin/run.js') {
    this.cliPath = cliPath;
  }
  
  async findLowStockItems(account, threshold = 10) {
    console.log(`Checking for low stock items (threshold: ${threshold})...`);
    
    const cmd = `${this.cliPath} product list --account ${account} --format json --fields id,title,variants`;
    const output = execSync(cmd, { encoding: 'utf8' });
    const data = JSON.parse(output);
    
    const lowStockItems = [];
    
    for (const product of data.products || []) {
      for (const variant of product.variants || []) {
        if (variant.inventory_quantity !== null && variant.inventory_quantity < threshold) {
          lowStockItems.push({
            product_id: product.id,
            product_title: product.title,
            variant_id: variant.id,
            variant_title: variant.title,
            sku: variant.sku,
            current_stock: variant.inventory_quantity,
            threshold
          });
        }
      }
    }
    
    return lowStockItems;
  }
  
  async generateStockAlert(lowStockItems, account) {
    const alert = {
      timestamp: new Date().toISOString(),
      account,
      total_low_stock_items: lowStockItems.length,
      items: lowStockItems,
      recommendations: [
        'Review reorder levels for affected products',
        'Contact suppliers for fast-moving items',
        'Consider temporary inventory adjustments if needed'
      ]
    };
    
    // Save to file
    const alertPath = path.join(process.cwd(), `low-stock-alert-${account}-${Date.now()}.json`);
    await fs.writeFile(alertPath, JSON.stringify(alert, null, 2));
    
    return { alert, alertPath };
  }
  
  async sendSlackNotification(alert, webhookUrl) {
    if (!webhookUrl) {
      console.log('No Slack webhook URL provided, skipping notification');
      return;
    }
    
    const message = {
      text: `🔔 Low Stock Alert - ${alert.account}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `Low Stock Alert - ${alert.account}`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Found *${alert.total_low_stock_items}* items below stock threshold`
          }
        },
        {
          type: 'section',
          fields: alert.items.slice(0, 5).map(item => ({
            type: 'mrkdwn',
            text: `*${item.product_title}*\nSKU: ${item.sku || 'N/A'}\nStock: ${item.current_stock}`
          }))
        }
      ]
    };
    
    if (alert.total_low_stock_items > 5) {
      message.blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `And ${alert.total_low_stock_items - 5} more items...`
          }
        ]
      });
    }
    
    try {
      const fetch = require('node-fetch');
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      console.log('Slack notification sent successfully');
    } catch (error) {
      console.error('Failed to send Slack notification:', error.message);
      throw error;
    }
  }
}

// Export classes for use in automation scripts
module.exports = {
  ConfigManager,
  InventorySync,
  WebhookManager,
  DeploymentValidator,
  ReportGenerator,
  StockAlertManager
};

// CLI interface for running individual functions
if (require.main === module) {
  const [,, command, ...args] = process.argv;
  
  async function main() {
    try {
      switch (command) {
        case 'validate-deployment':
          const account = args[0] || 'staging';
          const validator = new DeploymentValidator();
          const results = await validator.runFullValidation(account, {
            minProducts: parseInt(args[1]) || 0,
            requiredWebhooks: args.slice(2)
          });
          
          const report = await ReportGenerator.generateDeploymentReport(results, {
            environment: account,
            buildNumber: process.env.BUILD_NUMBER || 'local'
          });
          
          const reportPath = await ReportGenerator.saveReport(report, 'json');
          console.log(`Validation complete. Report saved to: ${reportPath}`);
          
          if (results.overallStatus === 'error') {
            process.exit(1);
          }
          break;
          
        case 'sync-inventory':
          const inventorySync = new InventorySync();
          const prodInventory = await inventorySync.getInventoryLevels('production');
          const stagingInventory = await inventorySync.getInventoryLevels('staging');
          const discrepancies = await inventorySync.compareInventory(prodInventory, stagingInventory);
          
          if (discrepancies.length > 0) {
            console.log(`Found ${discrepancies.length} inventory discrepancies`);
            const syncResults = await inventorySync.syncInventory(discrepancies, 'staging');
            await fs.writeFile('inventory-sync-results.json', JSON.stringify(syncResults, null, 2));
            console.log('Sync results saved to inventory-sync-results.json');
          } else {
            console.log('No inventory discrepancies found');
          }
          break;
          
        case 'check-low-stock':
          const stockManager = new StockAlertManager();
          const lowStockAccount = args[0] || 'production';
          const threshold = parseInt(args[1]) || 10;
          
          const lowStockItems = await stockManager.findLowStockItems(lowStockAccount, threshold);
          
          if (lowStockItems.length > 0) {
            const { alert, alertPath } = await stockManager.generateStockAlert(lowStockItems, lowStockAccount);
            console.log(`Found ${lowStockItems.length} low stock items. Alert saved to: ${alertPath}`);
            
            if (process.env.SLACK_WEBHOOK_URL) {
              await stockManager.sendSlackNotification(alert, process.env.SLACK_WEBHOOK_URL);
            }
          } else {
            console.log('No low stock items found');
          }
          break;
          
        case 'sync-webhooks':
          const webhookManager = new WebhookManager();
          const webhookAccount = args[0] || 'staging';
          const configPath = args[1] || './webhooks.json';
          
          const webhookResults = await webhookManager.syncWebhooks(webhookAccount, configPath);
          await fs.writeFile('webhook-sync-results.json', JSON.stringify(webhookResults, null, 2));
          console.log('Webhook sync complete. Results saved to webhook-sync-results.json');
          break;
          
        default:
          console.log(`
Usage: node automation-helpers.js <command> [options]

Commands:
  validate-deployment <account> [minProducts] [requiredWebhooks...]
    - Run full deployment validation
    
  sync-inventory
    - Sync inventory between production and staging
    
  check-low-stock <account> [threshold]
    - Check for low stock items and send alerts
    
  sync-webhooks <account> <config-path>
    - Synchronize webhooks based on configuration file
          `);
          process.exit(1);
      }
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  }
  
  main();
}
