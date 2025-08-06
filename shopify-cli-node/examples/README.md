# Shopify CLI Examples

This directory contains practical examples of using the Shopify CLI for common tasks and workflows.

## 📁 Directory Structure

```
examples/
├── README.md                    # This file
├── basic-usage.md              # Basic command examples
├── automation/                 # CI/CD and automation scripts
│   ├── github-actions.yml     # GitHub Actions workflow
│   ├── deploy-products.sh     # Product deployment script
│   ├── sync-stores.sh         # Multi-store synchronization
│   └── health-check.sh        # Store health monitoring
├── data-migration/             # Data migration examples
│   ├── export-products.sh     # Export products to CSV/JSON
│   ├── import-products.sh     # Import products from CSV/JSON
│   └── bulk-update.js         # Bulk product updates
├── configuration/              # Configuration examples
│   ├── multi-account.yaml     # Multiple Shopify accounts setup
│   ├── proxy-setup.yaml       # Corporate proxy configuration
│   └── env-variables.sh       # Environment variable setup
└── integrations/               # Third-party integrations
    ├── webhook-handler.js      # Webhook event handler
    ├── inventory-sync.py       # Inventory synchronization
    └── reporting.js            # Custom reporting scripts
```

## 🚀 Quick Start Examples

### Basic Product Management

```bash
# List products with filters
shopify-cli product list --status active --vendor Nike --limit 10

# Create a simple product
shopify-cli product create --title "Example T-Shirt" --price 29.99 --sku "TSHIRT-001"

# Update product status
shopify-cli product update 123456789 --status active

# Get detailed product information
shopify-cli product get 123456789 --show-variants --format json
```

### Order Management

```bash
# List recent orders
shopify-cli order list --status open --limit 20

# Get order with full details
shopify-cli order get 987654321 --show-line-items --show-customer

# Fulfill an order
shopify-cli order fulfill 987654321 --notify-customer --tracking-number "1Z999AA1234567890"

# Cancel an order with refund
shopify-cli order cancel 987654321 --reason customer --refund --email
```

### Store Management

```bash
# View store configuration
shopify-cli store settings view --show-locations --show-currencies

# List themes
shopify-cli store theme list --show-details

# Upload and activate a theme
shopify-cli store theme upload ./my-theme.zip --name "New Theme" --activate

# Create a webhook
shopify-cli store webhook create --topic orders/create --address https://myapp.com/webhooks/orders
```

### Interactive Mode

```bash
# Use interactive wizards
shopify-cli product wizard          # Guided product creation
shopify-cli config init            # Interactive configuration setup
```

### Scriptable Mode for Automation

```bash
# JSON output for parsing
shopify-cli product list --format json --no-interactive | jq '.data.products[].id'

# CSV export for spreadsheets
shopify-cli product list --format csv --fields id,title,status,price,vendor

# Batch operations with error handling
shopify-cli product create --json '{"title":"Batch Product","price":"19.99"}' --format json || echo "Failed"
```

## 🔧 Configuration Examples

### Multiple Accounts Setup

```yaml
# ~/.shopify-cli/config.yaml
version: "1.0.0"
accounts:
  - name: "development"
    shopUrl: "https://dev-store.myshopify.com"
    accessToken: "dev-token"
    isDefault: true
  - name: "staging"
    shopUrl: "https://staging-store.myshopify.com"
    accessToken: "staging-token"
  - name: "production"
    shopUrl: "https://prod-store.myshopify.com"
    accessToken: "prod-token"
```

### Environment Variables

```bash
# Development environment
export SHOPIFY_SHOP_URL=https://dev-store.myshopify.com
export SHOPIFY_ACCESS_TOKEN=dev-access-token

# Switch to production
export SHOPIFY_SHOP_URL=https://prod-store.myshopify.com
export SHOPIFY_ACCESS_TOKEN=prod-access-token
```

## 🤖 Automation Examples

### GitHub Actions Workflow

```yaml
name: Shopify Deployment
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install CLI
        run: npm install -g shopify-cli-node
      - name: Deploy
        env:
          SHOPIFY_SHOP_URL: ${{ secrets.SHOPIFY_SHOP_URL }}
          SHOPIFY_ACCESS_TOKEN: ${{ secrets.SHOPIFY_ACCESS_TOKEN }}
        run: |
          shopify-cli product list --format json --no-interactive
          shopify-cli store theme upload ./theme --name "CI-Deploy-$(date +%Y%m%d%H%M%S)"
```

### Product Synchronization Script

```bash
#!/bin/bash
# Sync products between stores
SOURCE_ACCOUNT="production"
TARGET_ACCOUNT="development"

echo "Syncing products from $SOURCE_ACCOUNT to $TARGET_ACCOUNT..."

shopify-cli product list \
  --account "$SOURCE_ACCOUNT" \
  --status active \
  --format json \
  --no-interactive | \
jq '.data.products[]' | \
while IFS= read -r product; do
  echo "Syncing: $(echo "$product" | jq -r '.title')"
  shopify-cli product create \
    --account "$TARGET_ACCOUNT" \
    --json "$product" \
    --format json \
    --no-interactive
done
```

## 📊 Data Export/Import Examples

### Export Products to CSV

```bash
# Export all active products with specific fields
shopify-cli product list \
  --status active \
  --format csv \
  --fields id,title,status,price,vendor,product_type,created_at \
  --limit 250 > products.csv

# Export with filters
shopify-cli product list \
  --vendor "Nike" \
  --product-type "Shoes" \
  --format csv > nike-shoes.csv
```

### Bulk Product Updates

```bash
#!/bin/bash
# Update all products from a specific vendor

VENDOR="Old Brand"
NEW_VENDOR="New Brand"

# Get products by vendor
shopify-cli product list \
  --vendor "$VENDOR" \
  --format json \
  --no-interactive | \
jq -r '.data.products[].id' | \
while read -r product_id; do
  echo "Updating product $product_id"
  shopify-cli product update "$product_id" \
    --vendor "$NEW_VENDOR" \
    --format json \
    --no-interactive
done
```

## 🔗 Integration Examples

### Webhook Event Handler

```javascript
// webhook-handler.js
const express = require('express');
const { exec } = require('child_process');

const app = express();
app.use(express.json());

app.post('/webhooks/orders/create', (req, res) => {
  const order = req.body;
  
  console.log(`New order received: ${order.id}`);
  
  // Process order with CLI
  const command = `shopify-cli order get ${order.id} --format json --no-interactive`;
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error}`);
      return res.status(500).send('Error processing order');
    }
    
    const orderDetails = JSON.parse(stdout);
    console.log('Order processed:', orderDetails.data.name);
    res.status(200).send('OK');
  });
});

app.listen(3000, () => {
  console.log('Webhook handler listening on port 3000');
});
```

### Inventory Monitoring

```bash
#!/bin/bash
# Monitor low inventory levels

THRESHOLD=10

echo "Checking inventory levels..."

shopify-cli product inventory levels \
  --format json \
  --no-interactive | \
jq ".data.inventory_levels[] | select(.available < $THRESHOLD)" | \
while IFS= read -r level; do
  ITEM_ID=$(echo "$level" | jq -r '.inventory_item_id')
  LOCATION_ID=$(echo "$level" | jq -r '.location_id')
  AVAILABLE=$(echo "$level" | jq -r '.available')
  
  echo "⚠️  Low inventory alert:"
  echo "   Item ID: $ITEM_ID"
  echo "   Location ID: $LOCATION_ID"  
  echo "   Available: $AVAILABLE"
  echo "   Threshold: $THRESHOLD"
  echo ""
done
```

## 🚨 Error Handling Examples

### Robust Deployment Script

```bash
#!/bin/bash
# deploy-with-retries.sh

set -e

MAX_RETRIES=3
DELAY=5

deploy_product() {
  local product_json="$1"
  local retry_count=0
  
  while [ $retry_count -lt $MAX_RETRIES ]; do
    if result=$(shopify-cli product create --json "$product_json" --format json --no-interactive 2>&1); then
      echo "✅ Product deployed successfully"
      echo "$result" | jq '.data.id'
      return 0
    else
      retry_count=$((retry_count + 1))
      echo "❌ Deployment failed (attempt $retry_count/$MAX_RETRIES)"
      echo "Error: $result"
      
      if [ $retry_count -lt $MAX_RETRIES ]; then
        echo "⏳ Retrying in ${DELAY} seconds..."
        sleep $DELAY
      fi
    fi
  done
  
  echo "💥 Deployment failed after $MAX_RETRIES attempts"
  return 1
}

# Usage
PRODUCT='{"title":"Test Product","price":"19.99","status":"draft"}'
deploy_product "$PRODUCT"
```

### Health Check Script

```bash
#!/bin/bash
# health-check.sh

check_api_health() {
  local account="$1"
  
  echo "🏥 Health check for account: $account"
  
  # Test basic connectivity
  if shopify-cli product list --account "$account" --limit 1 --format json --no-interactive >/dev/null 2>&1; then
    echo "✅ API connectivity: OK"
  else
    echo "❌ API connectivity: FAILED"
    return 1
  fi
  
  # Check theme status
  local theme_count=$(shopify-cli store theme list --account "$account" --role main --format json --no-interactive | jq '.data.themes | length')
  
  if [ "$theme_count" -eq 1 ]; then
    echo "✅ Active themes: OK ($theme_count)"
  else
    echo "⚠️  Active themes: WARNING ($theme_count themes found)"
  fi
  
  # Check webhook status
  local webhook_count=$(shopify-cli store webhook list --account "$account" --format json --no-interactive | jq '.data.webhooks | length')
  echo "ℹ️  Webhooks configured: $webhook_count"
  
  echo "🎉 Health check completed"
  return 0
}

# Run health check
ACCOUNT=${1:-production}
check_api_health "$ACCOUNT"
```

## 📈 Monitoring and Reporting Examples

### Daily Sales Report

```bash
#!/bin/bash
# daily-sales-report.sh

DATE=$(date +%Y-%m-%d)
YESTERDAY=$(date -d "yesterday" +%Y-%m-%d)

echo "📊 Daily Sales Report for $DATE"
echo "=================================="

# Get yesterday's orders
shopify-cli order list \
  --created-at-min "${YESTERDAY}T00:00:00Z" \
  --created-at-max "${YESTERDAY}T23:59:59Z" \
  --financial-status paid \
  --format json \
  --no-interactive | \
jq -r '
  .data.orders |
  length as $count |
  map(.total_price | tonumber) |
  add as $total |
  "Orders: \($count)\nTotal Revenue: $\($total)\nAverage Order Value: $\($total / $count | . * 100 | floor / 100)"
'
```

### Inventory Report

```bash
#!/bin/bash
# inventory-report.sh

echo "📦 Inventory Report - $(date)"
echo "========================="

shopify-cli product inventory levels \
  --format json \
  --no-interactive | \
jq -r '
  .data.inventory_levels |
  group_by(.location_id) |
  map({
    location_id: .[0].location_id,
    total_items: length,
    total_quantity: map(.available) | add,
    low_stock: map(select(.available < 10)) | length,
    out_of_stock: map(select(.available <= 0)) | length
  }) |
  .[] |
  "Location: \(.location_id)\n  Items: \(.total_items)\n  Total Qty: \(.total_quantity)\n  Low Stock: \(.low_stock)\n  Out of Stock: \(.out_of_stock)\n"
'
```

## 🎯 Best Practices

1. **Always use `--no-interactive` in scripts** to prevent hanging
2. **Use `--format json` for programmatic parsing** 
3. **Handle errors gracefully** with proper exit codes
4. **Use environment variables** for credentials in CI/CD
5. **Implement retry logic** for API operations
6. **Log all operations** for debugging and auditing
7. **Test scripts in development** before production deployment
8. **Use specific field selection** to reduce API payload size
9. **Implement rate limiting** for bulk operations
10. **Keep credentials secure** and never log them

## 📚 Additional Resources

- [Configuration Documentation](../docs/CONFIGURATION.md)
- [Interactive vs Scriptable Guide](../docs/INTERACTIVE_SCRIPTABLE.md)
- [CI/CD Integration Guide](../docs/CI_CD_INTEGRATION.md)
- [Getting Started Guide](../docs/GETTING_STARTED.md)

These examples provide a solid foundation for using the Shopify CLI in various scenarios. Modify and extend them based on your specific requirements!
