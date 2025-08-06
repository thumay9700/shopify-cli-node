# Shopify CLI for Node.js

> A comprehensive command-line interface for managing Shopify stores, products, orders, and integrations.

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/shopify-cli-node.svg)](https://npmjs.org/package/shopify-cli-node)
[![Downloads/week](https://img.shields.io/npm/dw/shopify-cli-node.svg)](https://npmjs.org/package/shopify-cli-node)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 🚀 Features

- **🏪 Complete Store Management** - Products, orders, themes, webhooks, and settings
- **🔐 Multi-Account Support** - Switch between development, staging, and production stores
- **🌐 Geolocation Services** - Powered by Decodo API for advanced location services
- **🔄 Interactive & Scriptable** - User-friendly prompts or full automation for CI/CD
- **🛡️ Proxy Support** - Corporate proxy support with authentication
- **📊 Multiple Output Formats** - JSON, CSV, and formatted tables
- **⚡ High Performance** - Efficient caching and batch operations
- **🎯 Type Safety** - Full TypeScript implementation with comprehensive validation

## 📋 Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Usage Examples](#usage-examples)
- [Interactive vs Scriptable Modes](#interactive-vs-scriptable-modes)
- [Available Commands](#available-commands)
- [License](#license)


## 🔧 Installation

### NPM Installation (Recommended)

```bash
# Install globally
npm install -g shopify-cli-node

# Verify installation
shopify-cli --version
```

### Requirements

- **Node.js**: Version 18.0.0 or higher
- **NPM**: Latest stable version
- **Operating System**: Windows, macOS, or Linux

### Development Installation

```bash
# Clone repository
git clone https://github.com/thumay9700/shopify-cli-node.git
cd shopify-cli-node

# Install dependencies
npm install

# Build the project
npm run build

# Link for local development
npm link
```
## ⚙️ Configuration

The Shopify CLI provides a robust configuration system supporting multiple accounts, proxies, and Decodo API integration.

### Configuration File Location

- **Default location**: `~/.shopify-cli/config.yaml`
- **Environment file**: `~/.shopify-cli/.env`
- **Custom path**: Set with `SHOPIFY_CLI_CONFIG_PATH` environment variable

### Setup Options

**Option 1: Initialize Configuration**

```bash
# Create a default config file interactively
shopify-cli config init
```

**Option 2: Manual Configuration**

Create a configuration file at `~/.shopify-cli/config.yaml`:

```yaml
version: "1.0.0"
accounts:
  - name: "development"
    shopUrl: "https://your-dev-store.myshopify.com"
    accessToken: "your-access-token-here"
    apiKey: "your-api-key-here"
    apiSecret: "your-api-secret-here"
    isDefault: true

  - name: "production"
    shopUrl: "https://your-prod-store.myshopify.com"
    accessToken: "prod-access-token"
    isDefault: false

# Decodo API integration (optional)
decodoApi:
  endpoint: "https://us.decodo.com:10001"
  apiKey: "your-decodo-api-key"
  timeout: 30000

# Proxy settings (optional)
proxy:
  enabled: false
  host: "proxy.company.com"
  port: 8080
  username: "proxy-username"  # optional
  password: "proxy-password"  # optional
  protocol: "http"  # http, https, socks4, socks5

# Global settings
settings:
  debug: false
  logLevel: "info"  # error, warn, info, debug
  theme: "default"  # default, dark, light
  autoUpdate: true
```

**Option 3: Environment Variables**

Use environment variables or create a `.env` file in the config directory:

```bash
# Shopify credentials (will create/override an account named 'env-override')
SHOPIFY_SHOP_URL=https://your-shop.myshopify.com
SHOPIFY_ACCESS_TOKEN=your-access-token
SHOPIFY_API_KEY=your-api-key
SHOPIFY_API_SECRET=your-api-secret

# Decodo API overrides
DECODO_API_ENDPOINT=https://us.decodo.com:10002
DECODO_API_KEY=your-decodo-api-key
DECODO_API_TIMEOUT=60000

# Proxy settings overrides
PROXY_ENABLED=true
PROXY_HOST=proxy.example.com
PROXY_PORT=8080
PROXY_USERNAME=your-username
PROXY_PASSWORD=your-password
PROXY_PROTOCOL=http

# Global settings
SHOPIFY_CLI_DEBUG=true
SHOPIFY_CLI_LOG_LEVEL=debug
```

### Managing Configuration

```bash
# View current configuration
shopify-cli config

# View in JSON format
shopify-cli config --format json
```

## 🚀 Usage Examples

### Product Management

```bash
# List products
shopify-cli product list
shopify-cli product list --status active --vendor "Nike"

# Get product details
shopify-cli product get 123456789
shopify-cli product get 123456789 --show-variants

# Create a product
shopify-cli product create --title "New T-Shirt" --price 29.99
shopify-cli product wizard  # Interactive creation wizard

# Update a product
shopify-cli product update 123456789 --status active --title "Updated Title"

# Delete a product
shopify-cli product delete 123456789

# Manage variants
shopify-cli product variant list 123456789
shopify-cli product variant get 987654321

# Manage inventory
shopify-cli product inventory levels
shopify-cli product inventory adjust 1001 2001 10  # Increase by 10
shopify-cli product inventory adjust 1001 2001 -5  # Decrease by 5

# Manage collections
shopify-cli product collection assign 123456789 987654321
shopify-cli product collection remove 555666777
```

### Order Management

```bash
# List orders
shopify-cli order list
shopify-cli order list --status open --financial-status paid

# Get order details
shopify-cli order get 123456789
shopify-cli order get 123456789 --show-line-items --show-customer

# Fulfill an order
shopify-cli order fulfill 123456789
shopify-cli order fulfill 123456789 --notify-customer --tracking-number "TN123456"

# Cancel an order
shopify-cli order cancel 123456789
shopify-cli order cancel 123456789 --reason customer --refund
```

### Store Management

```bash
# View store settings
shopify-cli store settings view
shopify-cli store settings view --show-locations

# Manage themes
shopify-cli store theme list
shopify-cli store theme activate 123456789
shopify-cli store theme upload ./my-theme.zip --name "Custom Theme"

# Manage webhooks
shopify-cli store webhook list
shopify-cli store webhook create --topic orders/create --address https://example.com/webhooks/orders
shopify-cli store webhook delete 123456789
```

### Geolocation Services

```bash
# Lookup IP address
shopify-cli geolocation lookup 8.8.8.8

# Lookup domain
shopify-cli geolocation lookup google.com

# Lookup coordinates
shopify-cli geolocation lookup 37.7749,-122.4194

# With account and cache options
shopify-cli geolocation lookup 8.8.8.8 --account mystore --no-cache
```

### Account Selection

```bash
# Specify account for any command
shopify-cli product list --account production
shopify-cli order get 123456789 --account development
```

### Output Formatting

```bash
# JSON output for programmatic use
shopify-cli product list --format json

# CSV output for spreadsheets
shopify-cli product list --format csv --fields id,title,status,price

# Table output (default) for human readability
shopify-cli product list --format table
```

## 🔄 Interactive vs Scriptable Modes

The Shopify CLI supports both interactive and scriptable modes to accommodate different use cases.

### Interactive Mode

Interactive mode automatically prompts for missing required values, making it ideal for exploration and manual operations.

```bash
# Interactive prompts will guide you
shopify-cli product create
shopify-cli product wizard
```

Features:
- Smart prompts for missing values
- Account selection when multiple accounts are configured
- Validation with helpful error messages
- Guided wizards for complex operations

### Scriptable Mode

Scriptable mode is designed for automation, CI/CD pipelines, and programmatic usage.

```bash
# All required values via flags
shopify-cli product create --title "T-Shirt" --price 29.99 --format json --no-interactive

# JSON output for parsing
shopify-cli product list --format json | jq '.data.products[].id'
```

Features:
- No interactive prompts, all inputs via flags
- Structured output (JSON, CSV)
- Standardized error codes and messages
- CI/CD environment detection

### Enabling Modes

Interactive mode is enabled by default when:
- Running in a TTY terminal
- Not in a CI/CD environment
- Not using `--no-interactive` flag

Scriptable mode is automatically enabled when:
- Running in CI/CD environments (CI, GITHUB_ACTIONS, etc.)
- Output is piped or redirected
- Using `--format json` flag
- Using `--no-interactive` flag

## 📚 Available Commands
* [`shopify-cli config`](#shopify-cli-config)
* [`shopify-cli geolocation lookup TARGET`](#shopify-cli-geolocation-lookup-target)
* [`shopify-cli hello PERSON`](#shopify-cli-hello-person)
* [`shopify-cli hello world`](#shopify-cli-hello-world)
* [`shopify-cli help [COMMAND]`](#shopify-cli-help-command)
* [`shopify-cli order`](#shopify-cli-order)
* [`shopify-cli order cancel ID`](#shopify-cli-order-cancel-id)
* [`shopify-cli order fulfill ID`](#shopify-cli-order-fulfill-id)
* [`shopify-cli order get ID`](#shopify-cli-order-get-id)
* [`shopify-cli order list`](#shopify-cli-order-list)
* [`shopify-cli plugins`](#shopify-cli-plugins)
* [`shopify-cli plugins add PLUGIN`](#shopify-cli-plugins-add-plugin)
* [`shopify-cli plugins:inspect PLUGIN...`](#shopify-cli-pluginsinspect-plugin)
* [`shopify-cli plugins install PLUGIN`](#shopify-cli-plugins-install-plugin)
* [`shopify-cli plugins link PATH`](#shopify-cli-plugins-link-path)
* [`shopify-cli plugins remove [PLUGIN]`](#shopify-cli-plugins-remove-plugin)
* [`shopify-cli plugins reset`](#shopify-cli-plugins-reset)
* [`shopify-cli plugins uninstall [PLUGIN]`](#shopify-cli-plugins-uninstall-plugin)
* [`shopify-cli plugins unlink [PLUGIN]`](#shopify-cli-plugins-unlink-plugin)
* [`shopify-cli plugins update`](#shopify-cli-plugins-update)
* [`shopify-cli product`](#shopify-cli-product)
* [`shopify-cli product collection assign COLLECTIONID PRODUCTID`](#shopify-cli-product-collection-assign-collectionid-productid)
* [`shopify-cli product collection remove COLLECTID`](#shopify-cli-product-collection-remove-collectid)
* [`shopify-cli product create`](#shopify-cli-product-create)
* [`shopify-cli product delete ID`](#shopify-cli-product-delete-id)
* [`shopify-cli product get ID`](#shopify-cli-product-get-id)
* [`shopify-cli product inventory adjust INVENTORYITEMID LOCATIONID QUANTITY`](#shopify-cli-product-inventory-adjust-inventoryitemid-locationid-quantity)
* [`shopify-cli product inventory levels`](#shopify-cli-product-inventory-levels)
* [`shopify-cli product list`](#shopify-cli-product-list)
* [`shopify-cli product update ID`](#shopify-cli-product-update-id)
* [`shopify-cli product variant get ID`](#shopify-cli-product-variant-get-id)
* [`shopify-cli product variant list PRODUCTID`](#shopify-cli-product-variant-list-productid)
* [`shopify-cli product wizard`](#shopify-cli-product-wizard)
* [`shopify-cli store`](#shopify-cli-store)
* [`shopify-cli store settings update`](#shopify-cli-store-settings-update)
* [`shopify-cli store settings view`](#shopify-cli-store-settings-view)
* [`shopify-cli store theme activate THEMEID`](#shopify-cli-store-theme-activate-themeid)
* [`shopify-cli store theme list`](#shopify-cli-store-theme-list)
* [`shopify-cli store theme upload SOURCE`](#shopify-cli-store-theme-upload-source)
* [`shopify-cli store webhook create`](#shopify-cli-store-webhook-create)
* [`shopify-cli store webhook delete WEBHOOKID`](#shopify-cli-store-webhook-delete-webhookid)
* [`shopify-cli store webhook list`](#shopify-cli-store-webhook-list)

## `shopify-cli config`

Show Shopify CLI configuration

```
USAGE
  $ shopify-cli config [-f json|table] [-h]

FLAGS
  -f, --format=<option>  [default: table] output format
                         <options: json|table>
  -h, --help             Show CLI help.

DESCRIPTION
  Show Shopify CLI configuration

EXAMPLES
  $ shopify-cli config

  $ shopify-cli config --format json
```

_See code: [src/commands/config/index.ts](https://github.com/thumay9700/shopify-cli-node/blob/v0.0.0/src/commands/config/index.ts)_

## `shopify-cli geolocation lookup TARGET`

Perform geolocation lookup using Decodo API

```
USAGE
  $ shopify-cli geolocation lookup TARGET [-a <value>] [--cache-stats] [--health-check] [--no-cache]

ARGUMENTS
  TARGET  IP address, domain, or coordinates (lat,lng) to geolocate

FLAGS
  -a, --account=<value>  Shopify account to use (defaults to default account)
      --cache-stats      Show cache statistics after lookup
      --health-check     Perform health check before lookup
      --no-cache         Disable caching for this request

DESCRIPTION
  Perform geolocation lookup using Decodo API

EXAMPLES
  $ shopify-cli geolocation:lookup 8.8.8.8

  $ shopify-cli geolocation:lookup google.com

  $ shopify-cli geolocation:lookup 37.7749,-122.4194
```

_See code: [src/commands/geolocation/lookup.ts](https://github.com/thumay9700/shopify-cli-node/blob/v0.0.0/src/commands/geolocation/lookup.ts)_

## `shopify-cli hello PERSON`

Say hello

```
USAGE
  $ shopify-cli hello PERSON -f <value>

ARGUMENTS
  PERSON  Person to say hello to

FLAGS
  -f, --from=<value>  (required) Who is saying hello

DESCRIPTION
  Say hello

EXAMPLES
  $ shopify-cli hello friend --from oclif
  hello friend from oclif! (./src/commands/hello/index.ts)
```

_See code: [src/commands/hello/index.ts](https://github.com/thumay9700/shopify-cli-node/blob/v0.0.0/src/commands/hello/index.ts)_

## `shopify-cli hello world`

Say hello world

```
USAGE
  $ shopify-cli hello world

DESCRIPTION
  Say hello world

EXAMPLES
  $ shopify-cli hello world
  hello world! (./src/commands/hello/world.ts)
```

_See code: [src/commands/hello/world.ts](https://github.com/thumay9700/shopify-cli-node/blob/v0.0.0/src/commands/hello/world.ts)_

## `shopify-cli help [COMMAND]`

Display help for shopify-cli.

```
USAGE
  $ shopify-cli help [COMMAND...] [-n]

ARGUMENTS
  COMMAND...  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for shopify-cli.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.32/src/commands/help.ts)_

## `shopify-cli order`

Manage Shopify orders

```
USAGE
  $ shopify-cli order [-h]

FLAGS
  -h, --help  Show CLI help.

DESCRIPTION
  Manage Shopify orders

EXAMPLES
  $ shopify-cli order list

  $ shopify-cli order get 123

  $ shopify-cli order fulfill 123

  $ shopify-cli order cancel 123
```

_See code: [src/commands/order/index.ts](https://github.com/thumay9700/shopify-cli-node/blob/v0.0.0/src/commands/order/index.ts)_

## `shopify-cli order cancel ID`

Cancel an order

```
USAGE
  $ shopify-cli order cancel ID [-a <value>] [--amount <value>] [--currency <value>] [--dry-run] [--email]
    [--force] [-f json|table] [--geo <value>] [-h] [--reason customer|fraud|inventory|declined|other] [--refund]
    [--use-proxy]

ARGUMENTS
  ID  Order ID to cancel

FLAGS
  -a, --account=<value>   Shopify account to use (defaults to default account)
  -f, --format=<option>   [default: table] Output format
                          <options: json|table>
  -h, --help              Show CLI help.
      --amount=<value>    Refund amount (if different from order total)
      --currency=<value>  Currency for refund amount
      --dry-run           Preview the cancellation without actually performing it
      --[no-]email        Send cancellation email to customer
      --force             Force cancellation without confirmation prompt
      --geo=<value>       Geo filter (country code)
      --reason=<option>   Reason for cancellation
                          <options: customer|fraud|inventory|declined|other>
      --refund            Issue a refund when cancelling
      --use-proxy         Use proxy for requests

DESCRIPTION
  Cancel an order

EXAMPLES
  $ shopify-cli order cancel 123456789

  $ shopify-cli order cancel 123456789 --account mystore

  $ shopify-cli order cancel 123456789 --reason customer --email

  $ shopify-cli order cancel 123456789 --refund --amount 25.00

  $ shopify-cli order cancel 123456789 --reason fraud --no-email --use-proxy

  $ shopify-cli order cancel 123456789 --dry-run
```

_See code: [src/commands/order/cancel.ts](https://github.com/thumay9700/shopify-cli-node/blob/v0.0.0/src/commands/order/cancel.ts)_

## `shopify-cli order fulfill ID`

Fulfill an order or manage fulfillments

```
USAGE
  $ shopify-cli order fulfill ID [-a <value>] [--cancel-fulfillment <value>] [--complete-fulfillment <value>] [-f
    json|table] [--geo <value>] [--get-fulfillment <value>] [-h] [--line-items <value>] [--list-fulfillments]
    [--location-id <value>] [--notify-customer] [--tracking-company <value>] [--tracking-number <value>] [--tracking-url
    <value>] [--use-proxy]

ARGUMENTS
  ID  Order ID to fulfill

FLAGS
  -a, --account=<value>               Shopify account to use (defaults to default account)
  -f, --format=<option>               [default: table] Output format
                                      <options: json|table>
  -h, --help                          Show CLI help.
      --cancel-fulfillment=<value>    Cancel an existing fulfillment by ID
      --complete-fulfillment=<value>  Complete an existing fulfillment by ID
      --geo=<value>                   Geo filter (country code)
      --get-fulfillment=<value>       Get details of a specific fulfillment by ID
      --line-items=<value>            Comma-separated list of line item IDs to fulfill (if not provided, fulfills all)
      --list-fulfillments             List existing fulfillments for this order instead of creating new one
      --location-id=<value>           Location ID for the fulfillment
      --notify-customer               Send notification email to customer
      --tracking-company=<value>      Tracking company/carrier name
      --tracking-number=<value>       Tracking number for the fulfillment
      --tracking-url=<value>          Tracking URL for the shipment
      --use-proxy                     Use proxy for requests

DESCRIPTION
  Fulfill an order or manage fulfillments

EXAMPLES
  $ shopify-cli order fulfill 123456789

  $ shopify-cli order fulfill 123456789 --location 123 --notify-customer

  $ shopify-cli order fulfill 123456789 --line-items 456,789 --tracking-number ABC123

  $ shopify-cli order fulfill 123456789 --tracking-company "FedEx" --tracking-number "1234567890"

  $ shopify-cli order fulfill 123456789 --account mystore --use-proxy

  $ shopify-cli order fulfill 123456789 --list-fulfillments

  $ shopify-cli order fulfill 123456789 --complete-fulfillment 999
```

_See code: [src/commands/order/fulfill.ts](https://github.com/thumay9700/shopify-cli-node/blob/v0.0.0/src/commands/order/fulfill.ts)_

## `shopify-cli order get ID`

Get a specific order by ID

```
USAGE
  $ shopify-cli order get ID [-a <value>] [--fields <value>] [-f json|table] [--geo <value>] [-h]
    [--show-customer] [--show-fulfillments] [--show-line-items] [--use-proxy]

ARGUMENTS
  ID  Order ID to retrieve

FLAGS
  -a, --account=<value>    Shopify account to use (defaults to default account)
  -f, --format=<option>    [default: table] Output format
                           <options: json|table>
  -h, --help               Show CLI help.
      --fields=<value>     Comma-separated list of fields to retrieve
      --geo=<value>        Geo filter (country code)
      --show-customer      Show customer details
      --show-fulfillments  Show order fulfillment details
      --show-line-items    Show order line items details
      --use-proxy          Use proxy for requests

DESCRIPTION
  Get a specific order by ID

EXAMPLES
  $ shopify-cli order get 123456789

  $ shopify-cli order get 123456789 --account mystore

  $ shopify-cli order get 123456789 --fields id,name,status,total_price

  $ shopify-cli order get 123456789 --use-proxy --geo CA

  $ shopify-cli order get 123456789 --format json

  $ shopify-cli order get 123456789 --show-line-items
```

_See code: [src/commands/order/get.ts](https://github.com/thumay9700/shopify-cli-node/blob/v0.0.0/src/commands/order/get.ts)_

## `shopify-cli order list`

List all orders

```
USAGE
  $ shopify-cli order list [-a <value>] [--created-at-max <value>] [--created-at-min <value>]
    [--financial-status pending|authorized|partially_paid|paid|partially_refunded|refunded|voided|any] [-f json|table]
    [--fulfillment-status shipped|partial|unshipped|any|unfulfilled] [--geo <value>] [-h] [-l <value>] [--page-info
    <value>] [--processed-at-max <value>] [--processed-at-min <value>] [--since-id <value>] [--status
    open|closed|cancelled|any] [--updated-at-max <value>] [--updated-at-min <value>] [--use-proxy]

FLAGS
  -a, --account=<value>              Shopify account to use (defaults to default account)
  -f, --format=<option>              [default: table] Output format
                                     <options: json|table>
  -h, --help                         Show CLI help.
  -l, --limit=<value>                [default: 50] Number of orders to retrieve
      --created-at-max=<value>       Show orders created before date (ISO 8601 format)
      --created-at-min=<value>       Show orders created after date (ISO 8601 format)
      --financial-status=<option>    Financial status filter
                                     <options:
                                     pending|authorized|partially_paid|paid|partially_refunded|refunded|voided|any>
      --fulfillment-status=<option>  Fulfillment status filter
                                     <options: shipped|partial|unshipped|any|unfulfilled>
      --geo=<value>                  Geo filter (country code)
      --page-info=<value>            Page info for pagination
      --processed-at-max=<value>     Show orders processed before date (ISO 8601 format)
      --processed-at-min=<value>     Show orders processed after date (ISO 8601 format)
      --since-id=<value>             Restrict results to orders created after the specified ID
      --status=<option>              Order status filter
                                     <options: open|closed|cancelled|any>
      --updated-at-max=<value>       Show orders last updated before date (ISO 8601 format)
      --updated-at-min=<value>       Show orders last updated after date (ISO 8601 format)
      --use-proxy                    Use proxy for requests

DESCRIPTION
  List all orders

EXAMPLES
  $ shopify-cli order list

  $ shopify-cli order list --account mystore

  $ shopify-cli order list --status open --limit 50

  $ shopify-cli order list --financial-status paid --fulfillment-status shipped

  $ shopify-cli order list --created-at-min 2024-01-01 --created-at-max 2024-12-31

  $ shopify-cli order list --processed-at-min 2024-01-01

  $ shopify-cli order list --use-proxy --geo US
```

_See code: [src/commands/order/list.ts](https://github.com/thumay9700/shopify-cli-node/blob/v0.0.0/src/commands/order/list.ts)_

## `shopify-cli plugins`

List installed plugins.

```
USAGE
  $ shopify-cli plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ shopify-cli plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.46/src/commands/plugins/index.ts)_

## `shopify-cli plugins add PLUGIN`

Installs a plugin into shopify-cli.

```
USAGE
  $ shopify-cli plugins add PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into shopify-cli.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the SHOPIFY_CLI_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the SHOPIFY_CLI_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ shopify-cli plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ shopify-cli plugins add myplugin

  Install a plugin from a github url.

    $ shopify-cli plugins add https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ shopify-cli plugins add someuser/someplugin
```

## `shopify-cli plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ shopify-cli plugins inspect PLUGIN...

ARGUMENTS
  PLUGIN...  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ shopify-cli plugins inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.46/src/commands/plugins/inspect.ts)_

## `shopify-cli plugins install PLUGIN`

Installs a plugin into shopify-cli.

```
USAGE
  $ shopify-cli plugins install PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into shopify-cli.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the SHOPIFY_CLI_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the SHOPIFY_CLI_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ shopify-cli plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ shopify-cli plugins install myplugin

  Install a plugin from a github url.

    $ shopify-cli plugins install https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ shopify-cli plugins install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.46/src/commands/plugins/install.ts)_

## `shopify-cli plugins link PATH`

Links a plugin into the CLI for development.

```
USAGE
  $ shopify-cli plugins link PATH [-h] [--install] [-v]

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help          Show CLI help.
  -v, --verbose
      --[no-]install  Install dependencies after linking the plugin.

DESCRIPTION
  Links a plugin into the CLI for development.

  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ shopify-cli plugins link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.46/src/commands/plugins/link.ts)_

## `shopify-cli plugins remove [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ shopify-cli plugins remove [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ shopify-cli plugins unlink
  $ shopify-cli plugins remove

EXAMPLES
  $ shopify-cli plugins remove myplugin
```

## `shopify-cli plugins reset`

Remove all user-installed and linked plugins.

```
USAGE
  $ shopify-cli plugins reset [--hard] [--reinstall]

FLAGS
  --hard       Delete node_modules and package manager related files in addition to uninstalling plugins.
  --reinstall  Reinstall all plugins after uninstalling.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.46/src/commands/plugins/reset.ts)_

## `shopify-cli plugins uninstall [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ shopify-cli plugins uninstall [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ shopify-cli plugins unlink
  $ shopify-cli plugins remove

EXAMPLES
  $ shopify-cli plugins uninstall myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.46/src/commands/plugins/uninstall.ts)_

## `shopify-cli plugins unlink [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ shopify-cli plugins unlink [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ shopify-cli plugins unlink
  $ shopify-cli plugins remove

EXAMPLES
  $ shopify-cli plugins unlink myplugin
```

## `shopify-cli plugins update`

Update installed plugins.

```
USAGE
  $ shopify-cli plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.46/src/commands/plugins/update.ts)_

## `shopify-cli product`

Manage Shopify products

```
USAGE
  $ shopify-cli product [-h]

FLAGS
  -h, --help  Show CLI help.

DESCRIPTION
  Manage Shopify products

EXAMPLES
  $ shopify-cli product list

  $ shopify-cli product get 123

  $ shopify-cli product create --title "New Product"

  $ shopify-cli product update 123 --title "Updated Product"

  $ shopify-cli product delete 123
```

_See code: [src/commands/product/index.ts](https://github.com/thumay9700/shopify-cli-node/blob/v0.0.0/src/commands/product/index.ts)_

## `shopify-cli product collection assign COLLECTIONID PRODUCTID`

Assign a product to a collection

```
USAGE
  $ shopify-cli product collection assign COLLECTIONID PRODUCTID [-a <value>] [-f] [-o json|table] [--geo <value>] [-h]
    [--use-proxy]

ARGUMENTS
  COLLECTIONID  Collection ID to assign product to
  PRODUCTID     Product ID to assign to collection

FLAGS
  -a, --account=<value>  Shopify account to use (defaults to default account)
  -f, --force            Skip confirmation prompt
  -h, --help             Show CLI help.
  -o, --format=<option>  [default: table] Output format
                         <options: json|table>
      --geo=<value>      Geo filter (country code)
      --use-proxy        Use proxy for requests

DESCRIPTION
  Assign a product to a collection

EXAMPLES
  $ shopify-cli product collection assign 123456789 987654321

  $ shopify-cli product collection assign 123456789 987654321 --account mystore

  $ shopify-cli product collection assign 123456789 987654321 --use-proxy --geo CA

  $ shopify-cli product collection assign 123456789 987654321 --force
```

_See code: [src/commands/product/collection/assign.ts](https://github.com/thumay9700/shopify-cli-node/blob/v0.0.0/src/commands/product/collection/assign.ts)_

## `shopify-cli product collection remove COLLECTID`

Remove a product from a collection

```
USAGE
  $ shopify-cli product collection remove COLLECTID [-a <value>] [-f] [-o json|table] [--geo <value>] [-h] [--use-proxy]

ARGUMENTS
  COLLECTID  Collect ID to remove (connects product to collection)

FLAGS
  -a, --account=<value>  Shopify account to use (defaults to default account)
  -f, --force            Skip confirmation prompt
  -h, --help             Show CLI help.
  -o, --format=<option>  [default: table] Output format
                         <options: json|table>
      --geo=<value>      Geo filter (country code)
      --use-proxy        Use proxy for requests

DESCRIPTION
  Remove a product from a collection

EXAMPLES
  $ shopify-cli product collection remove 555666777

  $ shopify-cli product collection remove 555666777 --account mystore

  $ shopify-cli product collection remove 555666777 --use-proxy --geo US

  $ shopify-cli product collection remove 555666777 --force
```

_See code: [src/commands/product/collection/remove.ts](https://github.com/thumay9700/shopify-cli-node/blob/v0.0.0/src/commands/product/collection/remove.ts)_

## `shopify-cli product create`

Create a new product

```
USAGE
  $ shopify-cli product create [-a <value>] [--compare-price <value>] [--continue-selling] [-d <value>] [--fields
    <value>] [-f json|table|csv] [--geo <value>] [-h] [--interactive] [--inventory <value>] [--json <value>]
    [--no-interactive] [--pretty] [--price <value>] [--requires-shipping] [--sku <value>] [--status
    active|archived|draft] [--tags <value>] [--taxable] [-t <value>] [--track-inventory] [--type <value>] [--use-proxy]
    [--vendor <value>] [--weight <value>] [--weight-unit g|kg|oz|lb]

FLAGS
  -a, --account=<value>        Shopify account to use (defaults to default account)
  -d, --description=<value>    Product description (HTML allowed)
  -f, --format=<option>        [default: table] Output format
                               <options: json|table|csv>
  -h, --help                   Show CLI help.
  -t, --title=<value>          Product title
      --compare-price=<value>  Compare at price (for default variant)
      --continue-selling       Continue selling when out of stock
      --fields=<value>         Comma-separated list of fields to include in output
      --geo=<value>            Geo filter (country code)
      --interactive            Enable interactive prompts for missing values
      --inventory=<value>      Inventory quantity (for default variant)
      --json=<value>           Raw JSON product data (overrides other flags)
      --no-interactive         Disable interactive prompts (scriptable mode)
      --pretty                 Pretty print JSON output
      --price=<value>          Product price (for default variant)
      --requires-shipping      Product requires shipping
      --sku=<value>            SKU (for default variant)
      --status=<option>        [default: draft] Product status
                               <options: active|archived|draft>
      --tags=<value>           Comma-separated list of tags
      --taxable                Product is taxable
      --track-inventory        Track inventory for default variant
      --type=<value>           Product type
      --use-proxy              Use proxy for requests
      --vendor=<value>         Product vendor
      --weight=<value>         Product weight (for default variant)
      --weight-unit=<option>   [default: kg] Weight unit
                               <options: g|kg|oz|lb>

DESCRIPTION
  Create a new product

EXAMPLES
  $ shopify-cli product create --title "New Product"

  $ shopify-cli product create --title "T-Shirt" --type "Apparel" --vendor "Nike"

  $ shopify-cli product create --title "Sneakers" --price 99.99 --sku "SNKR-001"

  $ shopify-cli product create --title "Product" --json '{"title": "Custom Product"}'

  $ shopify-cli product create --title "Product" --use-proxy --geo US
```

_See code: [src/commands/product/create.ts](https://github.com/thumay9700/shopify-cli-node/blob/v0.0.0/src/commands/product/create.ts)_

## `shopify-cli product delete ID`

Delete a product

```
USAGE
  $ shopify-cli product delete ID [-a <value>] [-f] [--geo <value>] [-h] [--use-proxy]

ARGUMENTS
  ID  Product ID to delete

FLAGS
  -a, --account=<value>  Shopify account to use (defaults to default account)
  -f, --force            Skip confirmation prompt
  -h, --help             Show CLI help.
      --geo=<value>      Geo filter (country code)
      --use-proxy        Use proxy for requests

DESCRIPTION
  Delete a product

EXAMPLES
  $ shopify-cli product delete 123456789

  $ shopify-cli product delete 123456789 --account mystore

  $ shopify-cli product delete 123456789 --force

  $ shopify-cli product delete 123456789 --use-proxy --geo US
```

_See code: [src/commands/product/delete.ts](https://github.com/thumay9700/shopify-cli-node/blob/v0.0.0/src/commands/product/delete.ts)_

## `shopify-cli product get ID`

Get a specific product by ID

```
USAGE
  $ shopify-cli product get ID [-a <value>] [--fields <value>] [-f json|table] [--geo <value>] [-h]
    [--show-variants] [--use-proxy]

ARGUMENTS
  ID  Product ID to retrieve

FLAGS
  -a, --account=<value>  Shopify account to use (defaults to default account)
  -f, --format=<option>  [default: table] Output format
                         <options: json|table>
  -h, --help             Show CLI help.
      --fields=<value>   Comma-separated list of fields to retrieve
      --geo=<value>      Geo filter (country code)
      --show-variants    Show product variants
      --use-proxy        Use proxy for requests

DESCRIPTION
  Get a specific product by ID

EXAMPLES
  $ shopify-cli product get 123456789

  $ shopify-cli product get 123456789 --account mystore

  $ shopify-cli product get 123456789 --fields title,status,vendor

  $ shopify-cli product get 123456789 --use-proxy --geo CA

  $ shopify-cli product get 123456789 --format json
```

_See code: [src/commands/product/get.ts](https://github.com/thumay9700/shopify-cli-node/blob/v0.0.0/src/commands/product/get.ts)_

## `shopify-cli product inventory adjust INVENTORYITEMID LOCATIONID QUANTITY`

Adjust inventory levels for a product variant

```
USAGE
  $ shopify-cli product inventory adjust INVENTORYITEMID LOCATIONID QUANTITY [-a <value>] [--force] [-f json|table] [--geo
    <value>] [-h] [--reason <value>] [--use-proxy]

ARGUMENTS
  INVENTORYITEMID  Inventory item ID to adjust
  LOCATIONID       Location ID where inventory is located
  QUANTITY         Quantity adjustment (positive or negative)

FLAGS
  -a, --account=<value>  Shopify account to use (defaults to default account)
  -f, --format=<option>  [default: table] Output format
                         <options: json|table>
  -h, --help             Show CLI help.
      --force            Skip confirmation prompt
      --geo=<value>      Geo filter (country code)
      --reason=<value>   Reason for inventory adjustment
      --use-proxy        Use proxy for requests

DESCRIPTION
  Adjust inventory levels for a product variant

EXAMPLES
  $ shopify-cli product inventory adjust 1001 2001 10

  $ shopify-cli product inventory adjust 1001 2001 -5 --account mystore

  $ shopify-cli product inventory adjust 1001 2001 25 --use-proxy --geo US

  $ shopify-cli product inventory adjust 1001 2001 -10 --reason "Damaged goods"
```

_See code: [src/commands/product/inventory/adjust.ts](https://github.com/thumay9700/shopify-cli-node/blob/v0.0.0/src/commands/product/inventory/adjust.ts)_

## `shopify-cli product inventory levels`

Get inventory levels for products

```
USAGE
  $ shopify-cli product inventory levels [-a <value>] [-f json|table] [--geo <value>] [-h] [--inventory-item-ids <value>] [-l
    <value>] [--location-ids <value>] [--page-info <value>] [--use-proxy]

FLAGS
  -a, --account=<value>             Shopify account to use (defaults to default account)
  -f, --format=<option>             [default: table] Output format
                                    <options: json|table>
  -h, --help                        Show CLI help.
  -l, --limit=<value>               [default: 50] Number of inventory levels to retrieve
      --geo=<value>                 Geo filter (country code)
      --inventory-item-ids=<value>  Comma-separated list of inventory item IDs
      --location-ids=<value>        Comma-separated list of location IDs
      --page-info=<value>           Page info for pagination
      --use-proxy                   Use proxy for requests

DESCRIPTION
  Get inventory levels for products

EXAMPLES
  $ shopify-cli product inventory levels

  $ shopify-cli product inventory levels --account mystore

  $ shopify-cli product inventory levels --inventory-item-ids 123,456,789

  $ shopify-cli product inventory levels --location-ids 100,200

  $ shopify-cli product inventory levels --limit 100

  $ shopify-cli product inventory levels --use-proxy --geo US
```

_See code: [src/commands/product/inventory/levels.ts](https://github.com/thumay9700/shopify-cli-node/blob/v0.0.0/src/commands/product/inventory/levels.ts)_

## `shopify-cli product list`

List all products

```
USAGE
  $ shopify-cli product list [-a <value>] [--collection <value>] [--created-at-max <value>] [--created-at-min
    <value>] [--fields <value>] [-f json|table|csv] [--geo <value>] [-h] [--interactive] [-l <value>] [--no-interactive]
    [--page-info <value>] [--pretty] [--product-type <value>] [--since-id <value>] [--status active|archived|draft]
    [--updated-at-max <value>] [--updated-at-min <value>] [--use-proxy] [--vendor <value>]

FLAGS
  -a, --account=<value>         Shopify account to use (defaults to default account)
  -f, --format=<option>         [default: table] Output format
                                <options: json|table|csv>
  -h, --help                    Show CLI help.
  -l, --limit=<value>           [default: 50] Number of products to retrieve
      --collection=<value>      Filter by collection ID
      --created-at-max=<value>  Show products created before date (ISO 8601 format)
      --created-at-min=<value>  Show products created after date (ISO 8601 format)
      --fields=<value>          Comma-separated list of fields to include in output
      --geo=<value>             Geo filter (country code)
      --interactive             Enable interactive prompts for missing values
      --no-interactive          Disable interactive prompts (scriptable mode)
      --page-info=<value>       Page info for pagination
      --pretty                  Pretty print JSON output
      --product-type=<value>    Filter by product type
      --since-id=<value>        Restrict results to products created after the specified ID
      --status=<option>         Product status filter
                                <options: active|archived|draft>
      --updated-at-max=<value>  Show products last updated before date (ISO 8601 format)
      --updated-at-min=<value>  Show products last updated after date (ISO 8601 format)
      --use-proxy               Use proxy for requests
      --vendor=<value>          Filter by vendor name

DESCRIPTION
  List all products

EXAMPLES
  $ shopify-cli product list

  $ shopify-cli product list --account mystore

  $ shopify-cli product list --status active --limit 50

  $ shopify-cli product list --vendor "Nike" --product-type "Shoes"

  $ shopify-cli product list --collection 123456

  $ shopify-cli product list --use-proxy --geo US
```

_See code: [src/commands/product/list.ts](https://github.com/thumay9700/shopify-cli-node/blob/v0.0.0/src/commands/product/list.ts)_

## `shopify-cli product update ID`

Update an existing product

```
USAGE
  $ shopify-cli product update ID [-a <value>] [-d <value>] [-f json|table] [--geo <value>] [-h] [--json <value>]
    [--seo-description <value>] [--seo-title <value>] [--status active|archived|draft] [--tags <value>] [-t <value>]
    [--type <value>] [--use-proxy] [--vendor <value>]

ARGUMENTS
  ID  Product ID to update

FLAGS
  -a, --account=<value>          Shopify account to use (defaults to default account)
  -d, --description=<value>      Product description (HTML allowed)
  -f, --format=<option>          [default: table] Output format
                                 <options: json|table>
  -h, --help                     Show CLI help.
  -t, --title=<value>            Product title
      --geo=<value>              Geo filter (country code)
      --json=<value>             Raw JSON product data (overrides other flags)
      --seo-description=<value>  SEO description
      --seo-title=<value>        SEO title
      --status=<option>          Product status
                                 <options: active|archived|draft>
      --tags=<value>             Comma-separated list of tags
      --type=<value>             Product type
      --use-proxy                Use proxy for requests
      --vendor=<value>           Product vendor

DESCRIPTION
  Update an existing product

EXAMPLES
  $ shopify-cli product update 123456789 --title "Updated Product"

  $ shopify-cli product update 123456789 --status active

  $ shopify-cli product update 123456789 --title "New Title" --vendor "Nike"

  $ shopify-cli product update 123456789 --json '{"title": "Updated via JSON"}'

  $ shopify-cli product update 123456789 --title "Product" --use-proxy --geo CA
```

_See code: [src/commands/product/update.ts](https://github.com/thumay9700/shopify-cli-node/blob/v0.0.0/src/commands/product/update.ts)_

## `shopify-cli product variant get ID`

Get a specific product variant by ID

```
USAGE
  $ shopify-cli product variant get ID [-a <value>] [--fields <value>] [-f json|table] [--geo <value>] [-h]
  [--use-proxy]

ARGUMENTS
  ID  Variant ID to retrieve

FLAGS
  -a, --account=<value>  Shopify account to use (defaults to default account)
  -f, --format=<option>  [default: table] Output format
                         <options: json|table>
  -h, --help             Show CLI help.
      --fields=<value>   Comma-separated list of fields to retrieve
      --geo=<value>      Geo filter (country code)
      --use-proxy        Use proxy for requests

DESCRIPTION
  Get a specific product variant by ID

EXAMPLES
  $ shopify-cli product variant get 987654321

  $ shopify-cli product variant get 987654321 --account mystore

  $ shopify-cli product variant get 987654321 --fields id,title,price,inventory_quantity

  $ shopify-cli product variant get 987654321 --use-proxy --geo US

  $ shopify-cli product variant get 987654321 --format json
```

_See code: [src/commands/product/variant/get.ts](https://github.com/thumay9700/shopify-cli-node/blob/v0.0.0/src/commands/product/variant/get.ts)_

## `shopify-cli product variant list PRODUCTID`

List all variants for a product

```
USAGE
  $ shopify-cli product variant list PRODUCTID [-a <value>] [-f json|table] [--geo <value>] [-h] [-l <value>] [--page-info
    <value>] [--use-proxy]

ARGUMENTS
  PRODUCTID  Product ID to list variants for

FLAGS
  -a, --account=<value>    Shopify account to use (defaults to default account)
  -f, --format=<option>    [default: table] Output format
                           <options: json|table>
  -h, --help               Show CLI help.
  -l, --limit=<value>      [default: 50] Number of variants to retrieve
      --geo=<value>        Geo filter (country code)
      --page-info=<value>  Page info for pagination
      --use-proxy          Use proxy for requests

DESCRIPTION
  List all variants for a product

EXAMPLES
  $ shopify-cli product variant list 123456789

  $ shopify-cli product variant list 123456789 --account mystore

  $ shopify-cli product variant list 123456789 --limit 25

  $ shopify-cli product variant list 123456789 --use-proxy --geo CA

  $ shopify-cli product variant list 123456789 --format json
```

_See code: [src/commands/product/variant/list.ts](https://github.com/thumay9700/shopify-cli-node/blob/v0.0.0/src/commands/product/variant/list.ts)_

## `shopify-cli product wizard`

Interactive wizard to create a product with guided prompts

```
USAGE
  $ shopify-cli product wizard [-a <value>] [-f json|table|csv] [-h] [--no-interactive] [--pretty] [--price <value>]
    [--title <value>]

FLAGS
  -a, --account=<value>  Shopify account to use (defaults to default account)
  -f, --format=<option>  [default: table] Output format
                         <options: json|table|csv>
  -h, --help             Show CLI help.
      --no-interactive   Disable interactive prompts (requires all flags)
      --pretty           Pretty print JSON output
      --price=<value>    Product price (required in non-interactive mode)
      --title=<value>    Product title (required in non-interactive mode)

DESCRIPTION
  Interactive wizard to create a product with guided prompts

EXAMPLES
  $ shopify-cli product wizard

  $ shopify-cli product wizard --account mystore

  $ shopify-cli product wizard --format json

  $ shopify-cli product wizard --no-interactive --title "Product" --price 19.99
```

_See code: [src/commands/product/wizard.ts](https://github.com/thumay9700/shopify-cli-node/blob/v0.0.0/src/commands/product/wizard.ts)_

## `shopify-cli store`

Manage Shopify store configuration

```
USAGE
  $ shopify-cli store [-h]

FLAGS
  -h, --help  Show CLI help.

DESCRIPTION
  Manage Shopify store configuration

EXAMPLES
  $ shopify-cli store settings view

  $ shopify-cli store settings update --theme light

  $ shopify-cli store theme list

  $ shopify-cli store theme activate 123456789

  $ shopify-cli store webhook list

  $ shopify-cli store webhook create --topic orders/create --address https://example.com/webhook
```

_See code: [src/commands/store/index.ts](https://github.com/thumay9700/shopify-cli-node/blob/v0.0.0/src/commands/store/index.ts)_

## `shopify-cli store settings update`

Update local CLI settings and store configuration

```
USAGE
  $ shopify-cli store settings update [--auto-update] [--debug] [-f json|table] [-h] [--log-level error|warn|info|debug]
    [--theme default|light|dark]

FLAGS
  -f, --format=<option>     [default: table] Output format
                            <options: json|table>
  -h, --help                Show CLI help.
      --[no-]auto-update    Enable auto-updates
      --[no-]debug          Enable debug mode
      --log-level=<option>  Set log level
                            <options: error|warn|info|debug>
      --theme=<option>      Set CLI theme
                            <options: default|light|dark>

DESCRIPTION
  Update local CLI settings and store configuration

EXAMPLES
  $ shopify-cli store settings update --theme dark

  $ shopify-cli store settings update --debug --log-level debug

  $ shopify-cli store settings update --auto-update true

  $ shopify-cli store settings update --theme light --auto-update false
```

_See code: [src/commands/store/settings/update.ts](https://github.com/thumay9700/shopify-cli-node/blob/v0.0.0/src/commands/store/settings/update.ts)_

## `shopify-cli store settings view`

View current store settings and configuration

```
USAGE
  $ shopify-cli store settings view [-a <value>] [-f json|table] [-h] [--show-currencies] [--show-locations]
    [--show-policies]

FLAGS
  -a, --account=<value>  Shopify account to use (defaults to default account)
  -f, --format=<option>  [default: table] Output format
                         <options: json|table>
  -h, --help             Show CLI help.
      --show-currencies  Show supported currencies
      --show-locations   Show store locations
      --show-policies    Show store policies

DESCRIPTION
  View current store settings and configuration

EXAMPLES
  $ shopify-cli store settings view

  $ shopify-cli store settings view --account mystore

  $ shopify-cli store settings view --format json

  $ shopify-cli store settings view --show-locations
```

_See code: [src/commands/store/settings/view.ts](https://github.com/thumay9700/shopify-cli-node/blob/v0.0.0/src/commands/store/settings/view.ts)_

## `shopify-cli store theme activate THEMEID`

Activate a theme (make it live)

```
USAGE
  $ shopify-cli store theme activate THEMEID [-a <value>] [-b] [--force] [-f json|table] [-h]

ARGUMENTS
  THEMEID  Theme ID to activate

FLAGS
  -a, --account=<value>  Shopify account to use (defaults to default account)
  -b, --backup           Create backup of current live theme before activating
  -f, --format=<option>  [default: table] Output format
                         <options: json|table>
  -h, --help             Show CLI help.
      --force            Skip confirmation prompts

DESCRIPTION
  Activate a theme (make it live)

EXAMPLES
  $ shopify-cli store theme activate 123456789

  $ shopify-cli store theme activate 123456789 --account mystore

  $ shopify-cli store theme activate 123456789 --backup

  $ shopify-cli store theme activate 123456789 --format json
```

_See code: [src/commands/store/theme/activate.ts](https://github.com/thumay9700/shopify-cli-node/blob/v0.0.0/src/commands/store/theme/activate.ts)_

## `shopify-cli store theme list`

List all store themes

```
USAGE
  $ shopify-cli store theme list [-a <value>] [-f json|table] [-h] [-r main|unpublished|demo|development]
    [--show-details]

FLAGS
  -a, --account=<value>  Shopify account to use (defaults to default account)
  -f, --format=<option>  [default: table] Output format
                         <options: json|table>
  -h, --help             Show CLI help.
  -r, --role=<option>    Filter themes by role
                         <options: main|unpublished|demo|development>
      --show-details     Show detailed theme information

DESCRIPTION
  List all store themes

EXAMPLES
  $ shopify-cli store theme list

  $ shopify-cli store theme list --account mystore

  $ shopify-cli store theme list --role main

  $ shopify-cli store theme list --format json
```

_See code: [src/commands/store/theme/list.ts](https://github.com/thumay9700/shopify-cli-node/blob/v0.0.0/src/commands/store/theme/list.ts)_

## `shopify-cli store theme upload SOURCE`

Upload a theme to store

```
USAGE
  $ shopify-cli store theme upload SOURCE [-a <value>] [--activate] [-f json|table] [-h] [-n <value>] [-r
    unpublished|demo|development] [--src-url <value>]

ARGUMENTS
  SOURCE  Path to theme ZIP file or theme directory

FLAGS
  -a, --account=<value>  Shopify account to use (defaults to default account)
  -f, --format=<option>  [default: table] Output format
                         <options: json|table>
  -h, --help             Show CLI help.
  -n, --name=<value>     Name for the uploaded theme
  -r, --role=<option>    [default: unpublished] Role for the uploaded theme
                         <options: unpublished|demo|development>
      --activate         Activate the theme after uploading
      --src-url=<value>  Source URL for the theme (e.g., GitHub repository)

DESCRIPTION
  Upload a theme to store

EXAMPLES
  $ shopify-cli store theme upload ./my-theme.zip

  $ shopify-cli store theme upload ./theme-directory --name "My Custom Theme"

  $ shopify-cli store theme upload ./theme.zip --account mystore --role development

  $ shopify-cli store theme upload ./theme.zip --name "New Theme" --src-url "https://github.com/user/theme"
```

_See code: [src/commands/store/theme/upload.ts](https://github.com/thumay9700/shopify-cli-node/blob/v0.0.0/src/commands/store/theme/upload.ts)_

## `shopify-cli store webhook create`

Create a new webhook

```
USAGE
  $ shopify-cli store webhook create --address <value> -t <value> [-a <value>] [--api-version <value>] [--fields <value>]
    [--format json|xml] [-h] [--metafield-namespaces <value>] [-f json|table]

FLAGS
  -a, --account=<value>               Shopify account to use (defaults to default account)
  -f, --output-format=<option>        [default: table] Output format
                                      <options: json|table>
  -h, --help                          Show CLI help.
  -t, --topic=<value>                 (required) Webhook topic/event to subscribe to
      --address=<value>               (required) Webhook endpoint URL
      --api-version=<value>           API version to use for webhook
      --fields=<value>                Comma-separated list of fields to include (optional)
      --format=<option>               [default: json] Webhook payload format
                                      <options: json|xml>
      --metafield-namespaces=<value>  Comma-separated list of metafield namespaces to include

DESCRIPTION
  Create a new webhook

EXAMPLES
  $ shopify-cli store webhook create --topic orders/create --address https://example.com/webhooks/orders

  $ shopify-cli store webhook create --topic products/update --address https://api.myapp.com/shopify/products

  $ shopify-cli store webhook create --topic orders/paid --address https://example.com/webhook --format xml

  $ shopify-cli store webhook create --topic customers/create --address https://example.com/webhook --fields id,email,first_name
```

_See code: [src/commands/store/webhook/create.ts](https://github.com/thumay9700/shopify-cli-node/blob/v0.0.0/src/commands/store/webhook/create.ts)_

## `shopify-cli store webhook delete WEBHOOKID`

Delete a webhook

```
USAGE
  $ shopify-cli store webhook delete WEBHOOKID [-a <value>] [-f] [--format json|table] [-h]

ARGUMENTS
  WEBHOOKID  Webhook ID to delete

FLAGS
  -a, --account=<value>  Shopify account to use (defaults to default account)
  -f, --force            Skip confirmation prompt
  -h, --help             Show CLI help.
      --format=<option>  [default: table] Output format
                         <options: json|table>

DESCRIPTION
  Delete a webhook

EXAMPLES
  $ shopify-cli store webhook delete 123456789

  $ shopify-cli store webhook delete 123456789 --account mystore

  $ shopify-cli store webhook delete 123456789 --force

  $ shopify-cli store webhook delete 123456789 --format json
```

_See code: [src/commands/store/webhook/delete.ts](https://github.com/thumay9700/shopify-cli-node/blob/v0.0.0/src/commands/store/webhook/delete.ts)_

## `shopify-cli store webhook list`

List all store webhooks

```
USAGE
  $ shopify-cli store webhook list [-a <value>] [-f json|table] [-h] [-l <value>] [--show-details] [-t <value>]

FLAGS
  -a, --account=<value>  Shopify account to use (defaults to default account)
  -f, --format=<option>  [default: table] Output format
                         <options: json|table>
  -h, --help             Show CLI help.
  -l, --limit=<value>    [default: 50] Limit number of webhooks to retrieve
  -t, --topic=<value>    Filter webhooks by topic
      --show-details     Show detailed webhook information

DESCRIPTION
  List all store webhooks

EXAMPLES
  $ shopify-cli store webhook list

  $ shopify-cli store webhook list --account mystore

  $ shopify-cli store webhook list --topic orders/create

  $ shopify-cli store webhook list --format json

  $ shopify-cli store webhook list --show-details
```

_See code: [src/commands/store/webhook/list.ts](https://github.com/thumay9700/shopify-cli-node/blob/v0.0.0/src/commands/store/webhook/list.ts)_
For detailed command options, use the help command:
```bash
shopify-cli help [COMMAND]
```

## 📝 License

MIT License - see the [LICENSE](LICENSE) file for details.

---

Made with ❤️ using [oclif](https://oclif.io)
