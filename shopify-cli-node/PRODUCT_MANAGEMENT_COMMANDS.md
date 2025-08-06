# Product Management Commands

This document outlines the Product Management Commands implemented for the Shopify CLI.

## Overview

The product management commands are located under `src/commands/product/` and provide comprehensive functionality for managing Shopify products, variants, inventory, and collection assignments.

## Command Structure

### Main Product Commands

#### `product list`
- **Location**: `src/commands/product/list.ts`
- **Description**: List all products with filtering capabilities
- **Features**:
  - Pagination support
  - Status filtering (active, archived, draft)
  - Vendor and product type filtering
  - Collection filtering
  - Date range filtering
  - Account selection
  - Proxy and geo filtering support
  - JSON and table output formats

#### `product get <id>`
- **Location**: `src/commands/product/get.ts`
- **Description**: Get detailed information about a specific product
- **Features**:
  - Field selection
  - Variant display option
  - Rich product details including images and options
  - Account selection
  - Proxy and geo filtering support
  - JSON and table output formats

#### `product create`
- **Location**: `src/commands/product/create.ts`
- **Description**: Create new products
- **Features**:
  - Comprehensive product creation with all standard fields
  - Default variant creation
  - JSON input support for advanced creation
  - Price, SKU, inventory, and weight settings
  - SEO and shipping options
  - Account selection
  - Proxy and geo filtering support
  - JSON and table output formats

#### `product update <id>`
- **Location**: `src/commands/product/update.ts`
- **Description**: Update existing products
- **Features**:
  - Selective field updates
  - JSON input support
  - SEO field updates
  - Change tracking and display
  - Account selection
  - Proxy and geo filtering support
  - JSON and table output formats

#### `product delete <id>`
- **Location**: `src/commands/product/delete.ts`
- **Description**: Delete products with confirmation
- **Features**:
  - Product details preview before deletion
  - Confirmation prompt (bypassable with --force)
  - Account selection
  - Proxy and geo filtering support
  - Safe deletion with status checks

### Variant Sub-commands

#### `product variant list <productId>`
- **Location**: `src/commands/product/variant/list.ts`
- **Description**: List all variants for a product
- **Features**:
  - Detailed variant information
  - Pagination support
  - Rich display with inventory, pricing, and options
  - Account selection
  - Proxy and geo filtering support
  - JSON and table output formats

#### `product variant get <id>`
- **Location**: `src/commands/product/variant/get.ts`
- **Description**: Get detailed information about a specific variant
- **Features**:
  - Comprehensive variant details
  - Inventory, shipping, and tax information
  - Field selection
  - Timestamps and metadata
  - Account selection
  - Proxy and geo filtering support
  - JSON and table output formats

### Inventory Sub-commands

#### `product inventory levels`
- **Location**: `src/commands/product/inventory/levels.ts`
- **Description**: Get inventory levels for products
- **Features**:
  - Filter by inventory item IDs or location IDs
  - Pagination support
  - Summary statistics
  - Low stock and out-of-stock alerts
  - Account selection
  - Proxy and geo filtering support
  - JSON and table output formats

#### `product inventory adjust <locationId> <inventoryItemId> <quantity>`
- **Location**: `src/commands/product/inventory/adjust.ts`
- **Description**: Adjust inventory levels
- **Features**:
  - Current level retrieval and display
  - Positive or negative adjustments
  - Reason tracking
  - Confirmation prompt (bypassable with --force)
  - Updated level verification
  - Warning for negative inventory
  - Account selection
  - Proxy and geo filtering support
  - JSON and table output formats

### Collection Management Sub-commands

#### `product collection assign <productId> <collectionId>`
- **Location**: `src/commands/product/collection/assign.ts`
- **Description**: Assign products to collections
- **Features**:
  - Product and collection validation
  - Smart collection detection and warnings
  - Confirmation prompt (bypassable with --force)
  - Assignment verification
  - Account selection
  - Proxy and geo filtering support
  - JSON and table output formats

#### `product collection remove <collectId>`
- **Location**: `src/commands/product/collection/remove.ts`
- **Description**: Remove products from collections
- **Features**:
  - Collect details retrieval
  - Product and collection information display
  - Confirmation prompt (bypassable with --force)
  - Removal verification
  - Account selection
  - Proxy and geo filtering support
  - JSON and table output formats

## Common Features

All commands include:

### Account Management
- `--account` flag to specify which Shopify account to use
- Automatic default account selection
- Account validation and error handling

### Proxy and Geolocation
- `--use-proxy` flag to enable proxy usage
- `--geo` flag for geo filtering (country code)
- Integration with existing proxy infrastructure

### Output Formats
- `--format` flag with `json` and `table` options
- Rich table formatting with proper alignment
- Comprehensive JSON output for programmatic use

### Error Handling
- Detailed error messages
- Graceful failure handling
- User-friendly error reporting

### Confirmation Prompts
- Interactive confirmation for destructive operations
- `--force` flag to bypass confirmations
- Clear operation previews

## Usage Examples

```bash
# List active products
shopify-cli product list --status active

# Get product with variants
shopify-cli product get 123456 --show-variants

# Create a new product
shopify-cli product create --title "New Product" --price 29.99 --sku "NP-001"

# Update product status
shopify-cli product update 123456 --status active

# List variants for a product
shopify-cli product variant list 123456

# Get inventory levels for specific items
shopify-cli product inventory levels --inventory-item-ids "456,789"

# Adjust inventory
shopify-cli product inventory adjust 1001 2001 10 --reason "Stock replenishment"

# Assign product to collection
shopify-cli product collection assign 123456 987654

# Remove product from collection (by collect ID)
shopify-cli product collection remove 555666777

# Use with different account and proxy
shopify-cli product list --account mystore --use-proxy --geo US
```

## Architecture Notes

- All commands use the `ShopifyApiFactory.create()` method for API client creation
- Commands follow consistent patterns for argument parsing and validation
- TypeScript strict mode compliance throughout
- Integration with existing configuration and proxy systems
- Consistent error handling and user feedback patterns
