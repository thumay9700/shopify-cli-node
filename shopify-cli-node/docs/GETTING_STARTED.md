# Getting Started with Shopify CLI

This guide will help you install, configure, and start using the Shopify CLI for Node.js.

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js**: Version 18.0.0 or higher
- **NPM**: Latest stable version
- **Shopify Store**: Access to one or more Shopify stores
- **API Credentials**: Private app or custom app credentials from your Shopify admin

## 🚀 Quick Start

### 1. Installation

```bash
# Install globally via NPM
npm install -g shopify-cli-node

# Verify installation
shopify-cli --version
```

### 2. Initial Configuration

Create your first configuration:

```bash
# Initialize configuration interactively
shopify-cli config init

# Or manually create config file
mkdir -p ~/.shopify-cli
cp config.yaml.example ~/.shopify-cli/config.yaml
```

### 3. Add Your First Account

Edit `~/.shopify-cli/config.yaml` and add your store details:

```yaml
version: "1.0.0"
accounts:
  - name: "development"
    shopUrl: "https://your-dev-store.myshopify.com"
    accessToken: "your-access-token"
    apiKey: "your-api-key"
    apiSecret: "your-api-secret"
    isDefault: true
```

### 4. Test Your Configuration

```bash
# View current configuration
shopify-cli config

# Test with a simple command
shopify-cli product list --limit 5
```

## 🔐 Getting Shopify API Credentials

### Option 1: Private App (Recommended for Development)

1. Go to your Shopify admin dashboard
2. Navigate to **Apps > App and sales channel settings**
3. Click **Develop apps** tab
4. Click **Create an app**
5. Set up app details and permissions
6. Install the app to get credentials

### Option 2: Custom App

1. Go to **Apps > App and sales channel settings**
2. Click **Develop apps for your store**
3. Create and configure your app
4. Generate API credentials

### Required Permissions

Ensure your app has the following scopes based on your needs:

```yaml
# Read permissions
read_products: true
read_orders: true
read_inventory: true
read_locations: true
read_themes: true
read_webhooks: true

# Write permissions (if needed)
write_products: true
write_orders: true
write_inventory: true
write_themes: true
write_webhooks: true
```

## ⚙️ Configuration Options

### Multiple Accounts

Configure multiple Shopify stores:

```yaml
accounts:
  - name: "development"
    shopUrl: "https://dev-store.myshopify.com"
    accessToken: "dev-token"
    isDefault: true

  - name: "staging"
    shopUrl: "https://staging-store.myshopify.com"
    accessToken: "staging-token"
    isDefault: false

  - name: "production"
    shopUrl: "https://prod-store.myshopify.com"
    accessToken: "prod-token"
    isDefault: false
```

### Environment Variables

For CI/CD or secure deployments, use environment variables:

```bash
# Copy the example file
cp .env.example ~/.shopify-cli/.env

# Edit with your values
export SHOPIFY_SHOP_URL=https://your-shop.myshopify.com
export SHOPIFY_ACCESS_TOKEN=your-access-token
```

### Decodo API (Optional)

For geolocation services, add Decodo API credentials:

```yaml
decodoApi:
  endpoint: "https://us.decodo.com:10001"
  apiKey: "your-decodo-api-key"
  timeout: 30000
```

### Proxy Configuration (Corporate Networks)

If you're behind a corporate firewall:

```yaml
proxy:
  enabled: true
  host: "proxy.company.com"
  port: 8080
  username: "proxy-user"
  password: "proxy-pass"
  protocol: "http"
```

## 🎯 Your First Commands

### Product Management

```bash
# List products
shopify-cli product list

# Get specific product
shopify-cli product get 123456789

# Create a new product
shopify-cli product create --title "Test Product" --price 19.99

# Use interactive wizard
shopify-cli product wizard
```

### Order Management

```bash
# List recent orders
shopify-cli order list --limit 10

# Get order details
shopify-cli order get 123456789

# Fulfill an order
shopify-cli order fulfill 123456789 --notify-customer
```

### Store Management

```bash
# View store settings
shopify-cli store settings view

# List themes
shopify-cli store theme list

# List webhooks
shopify-cli store webhook list
```

## 🔄 Interactive vs Scriptable Modes

### Interactive Mode (Default)

Perfect for exploration and manual tasks:

```bash
# CLI will prompt for missing values
shopify-cli product create
shopify-cli order list
```

### Scriptable Mode

Great for automation and CI/CD:

```bash
# All parameters via flags
shopify-cli product create \
  --title "Automated Product" \
  --price 29.99 \
  --format json \
  --no-interactive

# Pipe output for processing
shopify-cli product list --format json | jq '.data.products[].id'
```

## 📊 Output Formats

### JSON (Programmtic Use)

```bash
shopify-cli product list --format json
```

Output:
```json
{
  "success": true,
  "data": {
    "products": [...],
    "pagination": {...}
  },
  "metadata": {
    "timestamp": "2024-01-01T12:00:00.000Z",
    "executionTime": 1250,
    "account": "development"
  }
}
```

### CSV (Data Export)

```bash
shopify-cli product list --format csv --fields id,title,status,price
```

### Table (Human Readable)

```bash
shopify-cli product list --format table
```

## 🚨 Troubleshooting

### Common Issues

#### Configuration Not Found
```bash
# Create default config
shopify-cli config init

# Check config location
echo ~/.shopify-cli/config.yaml
```

#### Permission Denied
```bash
# Fix file permissions
chmod 600 ~/.shopify-cli/config.yaml
chmod 755 ~/.shopify-cli/
```

#### API Connection Issues
```bash
# Enable debug mode
export SHOPIFY_CLI_DEBUG=true
shopify-cli product list

# Test with simple call
curl -H "X-Shopify-Access-Token: YOUR_TOKEN" \
     "https://YOUR_SHOP.myshopify.com/admin/api/2024-01/products.json?limit=1"
```

#### Proxy Issues
```bash
# Test proxy connection
curl --proxy http://proxy.company.com:8080 https://httpbin.org/ip

# Enable proxy in config
proxy:
  enabled: true
  host: "proxy.company.com"
  port: 8080
```

### Debug Mode

Enable detailed logging:

```bash
# Via environment variable
export SHOPIFY_CLI_DEBUG=true
export SHOPIFY_CLI_LOG_LEVEL=debug

# Via config file
settings:
  debug: true
  logLevel: "debug"
```

### Getting Help

```bash
# General help
shopify-cli --help

# Command-specific help
shopify-cli product --help
shopify-cli product create --help

# List all commands
shopify-cli help
```

## 🎓 Next Steps

1. **Explore Commands**: Use `shopify-cli help` to see all available commands
2. **Read Documentation**: Check out the detailed documentation in the `docs/` folder
3. **Try Interactive Mode**: Use wizards and prompts for complex operations
4. **Set up CI/CD**: Configure scriptable mode for automation
5. **Configure Multiple Accounts**: Set up development, staging, and production environments

## 📚 Additional Resources

- **Configuration Guide**: See `docs/CONFIGURATION.md` for detailed configuration options
- **Interactive Guide**: See `docs/INTERACTIVE_SCRIPTABLE.md` for mode details
- **Command Reference**: Use `shopify-cli help [COMMAND]` for detailed command help
- **Examples**: Check the `examples/` directory for usage patterns

## 💡 Tips for Success

1. **Start Small**: Begin with simple commands like `product list` and `config`
2. **Use Interactive Mode**: Let the CLI guide you when learning
3. **Keep Credentials Safe**: Never commit API tokens to version control
4. **Use Environment Variables**: Great for CI/CD and multi-environment setups
5. **Enable Debug Mode**: Helpful for troubleshooting API issues
6. **Read Command Help**: Each command has detailed help with examples

Happy building with Shopify CLI! 🎉
