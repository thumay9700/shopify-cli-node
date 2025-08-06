# Shopify CLI Automation Examples

This directory contains comprehensive examples and patterns for integrating the Shopify CLI into various CI/CD pipelines and automation workflows.

## 📁 Directory Structure

```
automation/
├── advanced-cicd-patterns.md    # Comprehensive CI/CD integration examples
├── scripts/
│   └── automation-helpers.js    # Supporting utilities for automation
├── config/
│   └── example-webhooks.json   # Example webhook configuration
├── .github/
│   └── actions/
│       └── setup-shopify-cli/  # Reusable GitHub Action
└── README.md                   # This file
```

## 🚀 Quick Start

### 1. GitHub Actions Integration

Use the reusable action to quickly set up the Shopify CLI in your workflows:

```yaml
- name: Setup Shopify CLI
  uses: ./.github/actions/setup-shopify-cli
  with:
    node-version: '18'
    config-accounts: |
      [
        {
          "name": "production",
          "shopUrl": "${{ secrets.PRODUCTION_SHOP_URL }}",
          "accessToken": "${{ secrets.PRODUCTION_ACCESS_TOKEN }}",
          "isDefault": true
        }
      ]

- name: Sync products
  run: |
    ./bin/run.js product bulk update \
      --file products.json \
      --format json \
      --batch-size 10
```

### 2. Using Automation Helpers

The `automation-helpers.js` script provides ready-to-use utilities:

```bash
# Validate deployment
node scripts/automation-helpers.js validate-deployment production 100 orders/create products/update

# Check for low stock items
node scripts/automation-helpers.js check-low-stock production 5

# Sync inventory between environments
node scripts/automation-helpers.js sync-inventory

# Synchronize webhooks
node scripts/automation-helpers.js sync-webhooks production config/webhooks.json
```

## 📋 Supported CI/CD Platforms

### GitHub Actions
- ✅ Product synchronization workflows
- ✅ Inventory management automation
- ✅ Theme deployment pipelines
- ✅ Webhook management
- ✅ Multi-environment deployments

### GitLab CI/CD
- ✅ Pipeline stages for validation, testing, and deployment
- ✅ Environment-specific configurations
- ✅ Artifact management
- ✅ Manual deployment gates

### Jenkins
- ✅ Declarative pipeline support
- ✅ Parallel execution
- ✅ Credential management
- ✅ Notification integrations

### Other Platforms
- ✅ Docker containerization
- ✅ Kubernetes deployments
- ✅ Terraform infrastructure
- ✅ Generic shell script examples

## 🛠 Core Automation Features

### Configuration Management
```javascript
const { ConfigManager } = require('./scripts/automation-helpers');

// Validate required environment variables
await ConfigManager.validateEnvironment(['SHOP_URL', 'ACCESS_TOKEN']);

// Create CLI configuration programmatically
const configPath = await ConfigManager.createShopifyConfig(accounts, settings);
```

### Inventory Synchronization
```javascript
const { InventorySync } = require('./scripts/automation-helpers');

const sync = new InventorySync();
const discrepancies = await sync.compareInventory(prodData, stagingData);
const results = await sync.syncInventory(discrepancies, 'staging');
```

### Webhook Management
```javascript
const { WebhookManager } = require('./scripts/automation-helpers');

const webhookManager = new WebhookManager();
const results = await webhookManager.syncWebhooks('production', './webhooks.json');
```

### Deployment Validation
```javascript
const { DeploymentValidator, ReportGenerator } = require('./scripts/automation-helpers');

const validator = new DeploymentValidator();
const results = await validator.runFullValidation('production', {
  minProducts: 100,
  requiredWebhooks: ['orders/create', 'products/update']
});

const report = await ReportGenerator.generateDeploymentReport(results);
await ReportGenerator.saveReport(report, 'html');
```

### Stock Monitoring
```javascript
const { StockAlertManager } = require('./scripts/automation-helpers');

const stockManager = new StockAlertManager();
const lowStockItems = await stockManager.findLowStockItems('production', 10);

if (lowStockItems.length > 0) {
  const { alert } = await stockManager.generateStockAlert(lowStockItems, 'production');
  await stockManager.sendSlackNotification(alert, SLACK_WEBHOOK_URL);
}
```

## 🔧 Environment Variables

### Required for All Platforms
```bash
# Shopify store credentials
STAGING_SHOP_URL=your-staging-store.myshopify.com
STAGING_ACCESS_TOKEN=shpat_staging_token_here
PRODUCTION_SHOP_URL=your-production-store.myshopify.com  
PRODUCTION_ACCESS_TOKEN=shpat_production_token_here

# Optional: Notification webhooks
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### Platform-Specific Variables

#### GitHub Actions
```yaml
secrets:
  STAGING_SHOP_URL: ${{ secrets.STAGING_SHOP_URL }}
  STAGING_ACCESS_TOKEN: ${{ secrets.STAGING_ACCESS_TOKEN }}
  PRODUCTION_SHOP_URL: ${{ secrets.PRODUCTION_SHOP_URL }}
  PRODUCTION_ACCESS_TOKEN: ${{ secrets.PRODUCTION_ACCESS_TOKEN }}
  SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

#### GitLab CI/CD
```yaml
variables:
  STAGING_SHOP_URL: $STAGING_SHOP_URL
  STAGING_ACCESS_TOKEN: $STAGING_ACCESS_TOKEN
  PRODUCTION_SHOP_URL: $PRODUCTION_SHOP_URL
  PRODUCTION_ACCESS_TOKEN: $PRODUCTION_ACCESS_TOKEN
```

#### Jenkins
Configure credentials using the Jenkins credential store and reference them in your pipeline:

```groovy
withCredentials([
  string(credentialsId: 'staging-shop-url', variable: 'STAGING_SHOP_URL'),
  string(credentialsId: 'staging-access-token', variable: 'STAGING_ACCESS_TOKEN')
]) {
  // Pipeline steps
}
```

## 📊 Monitoring and Reporting

### Deployment Reports
Automated reports are generated for each deployment with:
- ✅ Connection validation results
- ✅ Product count verification
- ✅ Webhook configuration status
- ✅ Overall deployment health
- ✅ Recommendations for issues

### Inventory Alerts
Monitor stock levels with:
- 🔔 Low stock notifications
- 📧 Email and Slack integration
- 📈 Trend analysis
- 🔄 Automated restock suggestions

### Performance Metrics
Track automation performance:
- ⏱️ Execution times
- 📊 Success/failure rates
- 🔄 Retry patterns
- 📈 Throughput metrics

## 🏗 Integration Patterns

### Blue-Green Deployments
```yaml
# Deploy to staging first
- name: Deploy to Staging
  run: ./bin/run.js product bulk update --account staging --file products.json

# Validate staging deployment
- name: Validate Staging
  run: node scripts/automation-helpers.js validate-deployment staging

# Deploy to production after validation
- name: Deploy to Production
  if: success()
  run: ./bin/run.js product bulk update --account production --file products.json
```

### Canary Releases
```yaml
# Deploy to subset of products
- name: Canary Deployment
  run: |
    ./bin/run.js product bulk update \
      --account production \
      --file products-canary.json \
      --batch-size 5

# Monitor for issues
- name: Monitor Canary
  run: node scripts/monitor-canary-deployment.js

# Full rollout if successful
- name: Full Deployment
  if: success()
  run: ./bin/run.js product bulk update --account production --file products-full.json
```

### Rollback Procedures
```yaml
- name: Backup Current State
  run: |
    ./bin/run.js product list --account production --format json > backup-$(date +%s).json

- name: Deploy Changes
  id: deploy
  run: ./bin/run.js product bulk update --account production --file products.json

- name: Rollback on Failure
  if: failure()
  run: |
    echo "Deployment failed, initiating rollback..."
    ./bin/run.js product bulk update --account production --file backup-*.json
```

## 🐳 Container Deployments

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm ci && npm run build
CMD ["./bin/run.js"]
```

### Kubernetes
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: shopify-cli-automation
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: shopify-cli
        image: your-registry/shopify-cli:latest
        env:
        - name: SHOPIFY_CLI_CONFIG_PATH
          value: /config/config.yaml
        volumeMounts:
        - name: config
          mountPath: /config
```

### Scheduled Jobs
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: inventory-sync
spec:
  schedule: "0 */6 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: inventory-sync
            image: your-registry/shopify-cli:latest
            command: ["node", "scripts/automation-helpers.js", "sync-inventory"]
```

## 🔒 Security Best Practices

### Credential Management
- 🔐 Store credentials in secure secret managers
- 🔄 Rotate access tokens regularly
- 🚫 Never commit credentials to version control
- 🔒 Use environment-specific credentials

### Access Control
- 👥 Limit API permissions to required scopes only
- 🏢 Use separate service accounts for automation
- 📋 Implement approval workflows for production
- 🔍 Enable audit logging for all operations

### Network Security
- 🌐 Use HTTPS for all API communications
- 🛡️ Validate webhook signatures
- 🔥 Configure firewall rules appropriately
- 🔐 Use VPN for sensitive operations

## 📚 Examples and Templates

### Product Synchronization
```json
{
  "products": [
    {
      "id": 123456789,
      "title": "Updated Product Title",
      "description": "Updated product description",
      "status": "active",
      "variants": [
        {
          "id": 987654321,
          "price": "29.99",
          "inventory_quantity": 100
        }
      ]
    }
  ]
}
```

### Webhook Configuration
```json
{
  "webhooks": [
    {
      "topic": "orders/create",
      "address": "https://your-app.com/webhooks/orders/created"
    },
    {
      "topic": "products/update", 
      "address": "https://your-app.com/webhooks/products/updated"
    }
  ]
}
```

### Inventory Adjustment
```bash
# Bulk inventory adjustment
./bin/run.js product inventory adjust \
  --account production \
  --file inventory-adjustments.json \
  --batch-size 50
```

## 🚨 Troubleshooting

### Common Issues

#### Rate Limiting
```bash
# Use batch processing with delays
./bin/run.js product bulk update \
  --file products.json \
  --batch-size 5 \
  --delay 2000
```

#### Authentication Errors
```bash
# Test connection
./bin/run.js config --test-connection --account production

# Validate credentials
node -e "console.log(process.env.PRODUCTION_ACCESS_TOKEN?.length)"
```

#### Memory Issues
```bash
# Process in smaller batches
split -l 100 products.json products-batch-
for file in products-batch-*; do
  ./bin/run.js product bulk update --file "$file"
done
```

### Debug Mode
```bash
# Enable debug logging
SHOPIFY_CLI_DEBUG=true ./bin/run.js product list --account staging

# Verbose output
./bin/run.js --verbose product bulk update --file products.json
```

## 📖 Additional Resources

- [Advanced CI/CD Patterns](./advanced-cicd-patterns.md) - Comprehensive platform examples
- [Automation Helpers](./scripts/automation-helpers.js) - Utility functions and classes
- [GitHub Actions](./github/actions/setup-shopify-cli/) - Reusable action for workflows
- [Configuration Examples](./config/) - Sample configuration files

## 🤝 Contributing

When contributing new automation examples:

1. 📝 Document the use case and requirements
2. 🧪 Test across multiple environments
3. 🔒 Follow security best practices
4. 📊 Include error handling and monitoring
5. 🎯 Provide clear setup instructions

## 📄 License

These automation examples are provided as-is for educational and operational purposes. Adapt them to your specific requirements and security policies.
