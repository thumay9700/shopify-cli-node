# Shopify Account Setup Guide

This guide explains how to configure your Shopify accounts for use with the CLI.

## Prerequisites

1. **Shopify Store**: You need access to a Shopify store (Development, Partner, or Live store)
2. **Admin Access**: You must have admin privileges to create private apps
3. **API Permissions**: Required to generate access tokens

## Step 1: Create a Private App

### Using Shopify Admin (Recommended)

1. **Navigate to Apps and Sales Channels**
   - Go to your Shopify Admin: `https://your-store.myshopify.com/admin`
   - Click "Apps and sales channels"
   - Click "Develop apps" (bottom of the page)

2. **Create Private App**
   - Click "Create an app"
   - Enter app name: `Shopify CLI` (or your preferred name)
   - Click "Create app"

3. **Configure API Access**
   - Click "Configuration" tab
   - Scroll to "Admin API access tokens"
   - Click "Configure Admin API scopes"

4. **Select Required Scopes**
   ```
   ✅ read_products, write_products
   ✅ read_orders, write_orders  
   ✅ read_inventory, write_inventory
   ✅ read_locations
   ✅ read_webhooks, write_webhooks
   ✅ read_themes, write_themes
   ✅ read_shop_data
   ✅ read_collections, write_collections
   ```

5. **Install the App**
   - Scroll down and click "Save"
   - Click "Install app" 
   - Click "Install" to confirm

6. **Get Access Token**
   - After installation, go to "API credentials" tab
   - Click "Reveal token once" under "Admin API access token"
   - **Copy and securely store this token** - you won't see it again!

## Step 2: Configure the CLI

### Method 1: Interactive Configuration

```bash
# Run the config command to set up interactively
./bin/dev.js config

# Add a new account
./bin/dev.js config add-account
```

### Method 2: Manual Configuration

1. **Edit config file** (`~/.shopify-cli/config.yaml`):

```yaml
version: "1.0.0"
lastUpdated: "2024-01-15T10:00:00.000Z"

accounts:
  - name: "my-dev-store"
    shopUrl: "my-dev-store.myshopify.com" 
    accessToken: "your_private_app_access_token_here"
    isDefault: true
  
  - name: "my-test-store"
    shopUrl: "my-test-store.myshopify.com"
    accessToken: "your_test_store_access_token_here"
    isDefault: false

settings:
  debug: false
  logLevel: "info"
  theme: "default"
  autoUpdate: true
```

### Method 3: Environment Variables

Create a `.env` file in your project root:

```bash
# Default account credentials
SHOPIFY_CLI_DEFAULT_SHOP_URL=my-dev-store.myshopify.com
SHOPIFY_CLI_DEFAULT_ACCESS_TOKEN=your_private_app_access_token_here

# Alternative account credentials
SHOPIFY_CLI_TEST_SHOP_URL=my-test-store.myshopify.com
SHOPIFY_CLI_TEST_ACCESS_TOKEN=your_test_store_access_token_here

# Debug settings
SHOPIFY_CLI_DEBUG=false
```

## Step 3: Test Your Configuration

### Basic Connection Test

```bash
# Test connection to your default account
./bin/dev.js config --test-connection

# Test specific account
./bin/dev.js config --account my-test-store --test-connection
```

### Test API Calls

```bash
# List products (should work if properly configured)
./bin/dev.js product list --limit 5

# Get store information
./bin/dev.js store settings view

# List recent orders
./bin/dev.js order list --limit 10
```

## Security Best Practices

### 1. Secure Token Storage

**❌ Never commit tokens to version control:**
```bash
# Add to .gitignore
echo ".env" >> .gitignore
echo "config.yaml" >> .gitignore
```

**✅ Use environment variables in production:**
```bash
export SHOPIFY_ACCESS_TOKEN="your_actual_access_token"
export SHOPIFY_SHOP_URL="your-store.myshopify.com"
```

### 2. Token Rotation

- Regenerate tokens periodically
- Deactivate unused apps
- Monitor API usage in Shopify Admin

### 3. Scope Management

- Only grant necessary permissions
- Review and audit app permissions regularly
- Use separate apps for development and production

## Multiple Environment Setup

### Development, Staging, Production

```yaml
# config.yaml
accounts:
  - name: "dev"
    shopUrl: "dev-store.myshopify.com"
    accessToken: "dev_environment_token"
    isDefault: true
    
  - name: "staging"
    shopUrl: "staging-store.myshopify.com" 
    accessToken: "staging_environment_token"
    
  - name: "production"
    shopUrl: "production-store.myshopify.com"
    accessToken: "production_environment_token"
```

**Usage:**
```bash
# Use development (default)
./bin/dev.js product list

# Use staging
./bin/dev.js product list --account staging

# Use production (be careful!)
./bin/dev.js product list --account production
```

## Troubleshooting

### Common Issues

1. **"Access denied" or "Unauthorized"**
   - Verify access token is correct and not expired
   - Check that required API scopes are enabled
   - Ensure the shop URL format is correct (`store.myshopify.com`)

2. **"App not found" or "App not installed"**
   - Ensure the private app is properly installed
   - Check that the app has "Admin API access" enabled
   - Verify the access token was generated after scope configuration

3. **Rate limiting errors**
   - Reduce API call frequency
   - Use built-in rate limiting features
   - Consider using GraphQL for bulk operations

### Debug Commands

```bash
# Debug API calls with verbose output
SHOPIFY_CLI_DEBUG=true ./bin/dev.js product list

# Test specific account
./bin/dev.js config --account my-store --test-connection

# Check configuration
./bin/dev.js config
```

---

Need help? Check the [main README](../README.md) or create an issue in the repository.
