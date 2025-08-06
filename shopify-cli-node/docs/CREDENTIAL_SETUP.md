# Shopify CLI Credential Setup Guide

This guide explains how to obtain and configure the credentials needed to connect your Shopify CLI Management Tool to actual Shopify stores.

## Required Credentials

To connect to a Shopify store, you need:

1. **Store URL** (e.g., `your-store.myshopify.com`)
2. **Access Token** (Private App or API credentials)

## Method 1: Private App Access Tokens (Recommended)

### Step 1: Create a Private App

1. **Log into your Shopify admin**
2. **Go to Apps → App and sales channel settings**
3. **Click "Develop apps for your store"**
4. **Click "Allow custom app development"** (if prompted)
5. **Click "Create an app"**

### Step 2: Configure App Permissions

1. **Name your app** (e.g., "CLI Management Tool")
2. **Click "Configure Admin API scopes"**
3. **Select required permissions:**

#### Essential Permissions:
```
✅ read_products, write_products        # Product management
✅ read_orders, write_orders           # Order management  
✅ read_customers                      # Customer data
✅ read_inventory, write_inventory     # Inventory management
✅ read_locations                      # Store locations
✅ read_shipping                       # Shipping settings
✅ read_payment_gateways              # Payment information
✅ read_shop_settings                 # Store settings
```

#### Optional Permissions (based on needs):
```
⚪ write_customers                    # Customer management
⚪ read_analytics                     # Analytics data
⚪ read_reports                       # Detailed reports
⚪ read_marketing_events              # Marketing data
⚪ read_discounts, write_discounts    # Discount management
⚪ read_themes, write_themes          # Theme management
```

### Step 3: Generate Access Token

1. **Click "Install app"**
2. **Copy the Admin API access token**
   - This is your `ACCESS_TOKEN`
   - Format: `shpat_xxxxxxxxxxxxxxxxxxxxxxxxxx`
3. **Save this token securely** - it won't be shown again!

## Method 2: Custom Apps (Alternative)

### For Shopify Plus merchants:

1. **Go to Apps → Manage private apps** (legacy interface)
2. **Click "Create new private app"**
3. **Configure app details and permissions**
4. **Generate Admin API credentials**

## Setting Up Credentials

### Option A: Environment Variables (Recommended)

Create a `.env` file in your project:

```bash
# Create .env file
touch /Users/anthonyumeh/shopify-cli-node/shopify-cli-node/.env
```

Add your credentials:
```bash
# .env file content
SHOPIFY_STORE_URL=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxxxxxxx

# For multiple stores
STAGING_STORE_URL=staging-store.myshopify.com
STAGING_ACCESS_TOKEN=shpat_yyyyyyyyyyyyyyyyyyyyyyyyyy

PRODUCTION_STORE_URL=production-store.myshopify.com  
PRODUCTION_ACCESS_TOKEN=shpat_zzzzzzzzzzzzzzzzzzzzzzzz
```

### Option B: CLI Configuration

Use the built-in config system:

```bash
# Navigate to your CLI directory
cd /Users/anthonyumeh/shopify-cli-node/shopify-cli-node

# Add your first account
./bin/run.js config --add-account \
  --name "production" \
  --shop-url "your-store.myshopify.com" \
  --access-token "shpat_xxxxxxxxxxxxxxxxxxxxxxxxxx"

# Add additional accounts  
./bin/run.js config --add-account \
  --name "staging" \
  --shop-url "staging-store.myshopify.com" \
  --access-token "shpat_yyyyyyyyyyyyyyyyyyyyyyyyyy"

# Set default account
./bin/run.js config --set-default "production"
```

### Option C: Configuration File

Create a YAML configuration:

```yaml
# ~/.shopify-cli/config.yaml
version: "1.0.0"
lastUpdated: "2024-01-15T10:30:00Z"
accounts:
  - name: "production"
    shopUrl: "your-store.myshopify.com"
    accessToken: "shpat_xxxxxxxxxxxxxxxxxxxxxxxxxx"
    isDefault: true
  - name: "staging"
    shopUrl: "staging-store.myshopify.com"
    accessToken: "shpat_yyyyyyyyyyyyyyyyyyyyyyyyyy"
    isDefault: false
  - name: "development"
    shopUrl: "dev-store.myshopify.com"
    accessToken: "shpat_zzzzzzzzzzzzzzzzzzzzzzzz"
    isDefault: false
settings:
  debug: false
  logLevel: "info"
  timeout: 30000
```

## Testing Your Setup

### 1. Test API Connection
```bash
# Test default account
./bin/run.js config --test-connection

# Test specific account  
./bin/run.js config --test-connection --account staging

# List all accounts
./bin/run.js config --list-accounts
```

### 2. Basic Store Information
```bash
# Get store info
./bin/run.js store settings view

# Check products
./bin/run.js product list --limit 5

# Check orders
./bin/run.js order list --limit 5
```

## Security Best Practices

### 1. Protect Your Credentials

```bash
# Set proper file permissions
chmod 600 ~/.shopify-cli/config.yaml
chmod 600 /Users/anthonyumeh/shopify-cli-node/shopify-cli-node/.env

# Add to .gitignore
echo ".env" >> /Users/anthonyumeh/shopify-cli-node/shopify-cli-node/.gitignore
echo "config.yaml" >> /Users/anthonyumeh/shopify-cli-node/shopify-cli-node/.gitignore
```

### 2. Environment-Specific Tokens

Use different tokens for different environments:
- **Development**: Limited permissions, test store
- **Staging**: Similar to production, separate store
- **Production**: Full permissions, live store

### 3. Token Rotation

Regularly rotate your access tokens:
```bash
# Update token for an account
./bin/run.js config --update-account production --access-token "new_token_here"
```

## Credential Types Comparison

| Method | Security | Ease of Setup | Multi-Store | Recommended For |
|--------|----------|---------------|-------------|-----------------|
| Private App | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Production use |
| Custom App | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | Shopify Plus |
| Development Store | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | Testing only |

## Troubleshooting

### Common Issues

#### 1. "Invalid Access Token"
```bash
# Check token format
echo $SHOPIFY_ACCESS_TOKEN | grep "^shpat_"

# Verify in Shopify admin
# Apps → [Your App] → API credentials
```

#### 2. "Permission Denied"
```bash
# Check app permissions in Shopify admin
# Add required scopes and reinstall app
```

#### 3. "Store Not Found"
```bash
# Verify store URL format
# Should be: store-name.myshopify.com (no https://)
```

#### 4. Connection Timeout
```bash
# Test with longer timeout
./bin/run.js store settings view --timeout 60000
```

### Debug Mode

Enable debug logging:
```bash
# Set debug environment variable
export SHOPIFY_CLI_DEBUG=true

# Or use debug flag
./bin/run.js store settings view --debug
```

## Advanced Configuration

### Multiple Store Management

```bash
# Set up multiple environments
./bin/run.js config --add-account --name "store-us" --shop-url "us-store.myshopify.com"
./bin/run.js config --add-account --name "store-eu" --shop-url "eu-store.myshopify.com"  
./bin/run.js config --add-account --name "store-ca" --shop-url "ca-store.myshopify.com"

# Use with specific account
./bin/run.js product list --account store-eu
./bin/run.js order list --account store-ca
```

### Proxy Configuration

For corporate networks:
```bash
# Set proxy in config
./bin/run.js config --set-proxy "http://proxy.company.com:8080"

# Use proxy for requests
./bin/run.js store settings view --use-proxy
```

## Webhook Setup (Optional)

For real-time updates:

### 1. Create Webhook Endpoint
```bash
# List current webhooks
./bin/run.js store webhook list

# Create webhook for order updates
./bin/run.js store webhook create \
  --topic "orders/create" \
  --address "https://your-server.com/webhooks/orders"
```

### 2. Verify Webhook
```bash
# Test webhook delivery
./bin/run.js store webhook test --id webhook_id
```

## Getting Help

### Shopify Resources
- [Admin API Documentation](https://shopify.dev/docs/api/admin)
- [App Development Guide](https://shopify.dev/apps)
- [API Permissions Reference](https://shopify.dev/docs/api/usage/access-scopes)

### CLI Help
```bash
# General help
./bin/run.js --help

# Command-specific help
./bin/run.js config --help
./bin/run.js store --help
```

## Next Steps

After setting up credentials:

1. **Test basic functionality**
2. **Set up Warp terminal integration** (workflows already created)
3. **Configure shell aliases** (source the aliases file)
4. **Set up automation scripts**
5. **Configure monitoring and alerts**

---

**Remember**: Keep your access tokens secure and never commit them to version control!
