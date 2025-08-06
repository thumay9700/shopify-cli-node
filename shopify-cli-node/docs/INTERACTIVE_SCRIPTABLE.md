# Interactive and Scriptable Modes

The Shopify CLI now supports both **Interactive** and **Scriptable** modes to provide flexibility for different use cases.

## Overview

- **Interactive Mode**: Provides guided prompts for missing values, making commands user-friendly for manual operation
- **Scriptable Mode**: Ensures commands accept all inputs via flags/JSON and output structured data for CI/CD automation

## Interactive Mode

Interactive mode automatically detects when you're running in a terminal and prompts for missing required values.

### Features

- ✨ **Smart Prompts**: Only prompts for missing required values
- 🧙‍♂️ **Guided Wizards**: Step-by-step workflows for complex operations
- 🎯 **Context-Aware**: Different prompts based on command context
- ✅ **Validation**: Input validation with helpful error messages
- 🔄 **Account Selection**: Interactive account picker when multiple accounts are configured

### Usage

Interactive mode is enabled by default when:
- Running in a TTY terminal
- Not in a CI/CD environment
- Not using `--no-interactive` flag

```bash
# Interactive mode examples
shopify-cli product create
# → Prompts for: title, description, price, etc.

shopify-cli product list
# → Prompts for: filters, account selection

shopify-cli product wizard
# → Full guided wizard experience
```

### Disabling Interactive Mode

```bash
# Disable interactive prompts
shopify-cli product create --no-interactive --title "Product" --price 19.99

# Or set environment variable
export CI=true
shopify-cli product create --title "Product" --price 19.99
```

## Scriptable Mode

Scriptable mode is designed for automation, CI/CD pipelines, and programmatic usage.

### Features

- 🤖 **Fully Automated**: No interactive prompts, all inputs via flags
- 📊 **Structured Output**: JSON, CSV, or table formats with consistent schema
- 🔍 **Error Handling**: Standardized error codes and messages
- 📈 **Metadata**: Execution time, timestamps, and context information
- 🔧 **Field Selection**: Choose specific fields to include in output

### Usage

Scriptable mode is automatically enabled when:
- Running in CI/CD environments (CI, GITHUB_ACTIONS, etc.)
- Output is piped or redirected
- Using `--format json` flag
- Using `--no-interactive` flag

```bash
# Scriptable mode examples
shopify-cli product create --title "T-Shirt" --price 29.99 --format json

shopify-cli product list --status active --format csv --fields id,title,price

# CI/CD usage
shopify-cli product list --account prod --format json | jq '.data.products[].id'
```

## Output Formats

### JSON Format
Structured output with metadata for programmatic consumption:

```json
{
  "success": true,
  "data": {
    "id": 123456789,
    "title": "T-Shirt",
    "status": "active",
    "price": "29.99"
  },
  "metadata": {
    "timestamp": "2024-01-01T12:00:00.000Z",
    "executionTime": 1250,
    "version": "1.0.0",
    "account": "my-store",
    "command": "product:create"
  }
}
```

### CSV Format
Perfect for spreadsheet imports and data processing:

```csv
id,title,status,price
123456789,T-Shirt,active,29.99
123456790,Hoodie,draft,49.99
```

### Table Format
Human-readable format for terminal use:

```
✅ Found 2 products

📋 Products:
ID          Title                         Status    Type           Vendor         Created
─────────────────────────────────────────────────────────────────────────────────────────
123456789   T-Shirt                       active    Apparel        Nike           1/1/2024
123456790   Hoodie                        draft     Apparel        Adidas         1/2/2024
```

## Command Examples

### Product Creation

#### Interactive Mode
```bash
shopify-cli product create
# → Prompts for title, price, description, etc.
```

#### Scriptable Mode
```bash
# All required values via flags
shopify-cli product create \
  --title "Awesome T-Shirt" \
  --price 29.99 \
  --description "A really awesome t-shirt" \
  --status active \
  --format json

# Using JSON input
shopify-cli product create \
  --json '{"title":"T-Shirt","price":"29.99","status":"active"}' \
  --format json
```

### Product Listing

#### Interactive Mode
```bash
shopify-cli product list
# → Prompts for status filter, limit, account selection
```

#### Scriptable Mode
```bash
# All filters via flags
shopify-cli product list \
  --status active \
  --limit 100 \
  --vendor Nike \
  --format csv \
  --fields id,title,status,price

# CI/CD pipeline usage
shopify-cli product list --format json --no-interactive | \
  jq '.data.products[] | select(.status == "active") | .id'
```

### Product Wizard

#### Interactive Mode
```bash
shopify-cli product wizard
# → Full guided wizard with multiple steps
```

#### Scriptable Mode
```bash
shopify-cli product wizard \
  --no-interactive \
  --title "Product" \
  --price 19.99 \
  --format json
```

## Environment Detection

The CLI automatically detects the execution environment:

### Interactive Environment
- TTY terminal
- No CI environment variables
- Interactive flag not disabled

### Scriptable Environment
- CI/CD environments (CI, GITHUB_ACTIONS, GITLAB_CI, etc.)
- Non-TTY terminals (piped output)
- Explicit flags (`--no-interactive`, `--format json`)

## Error Handling

### Interactive Mode Errors
```
Error: Product title is required
Use --title flag or run in interactive mode for prompts.
```

### Scriptable Mode Errors
```json
{
  "success": false,
  "error": {
    "code": "MISSING_REQUIRED_FIELDS",
    "message": "Product title is required",
    "details": {
      "required": ["title"],
      "provided": ["price"]
    }
  },
  "metadata": {
    "timestamp": "2024-01-01T12:00:00.000Z",
    "executionTime": 50,
    "command": "product:create"
  }
}
```

## Best Practices

### For Interactive Use
- Let the CLI prompt for values when exploring
- Use wizards for complex workflows
- Check help text for available options

### For Automation
- Always use `--no-interactive` in scripts
- Specify `--format json` for programmatic parsing
- Handle both success and error responses
- Use field selection to reduce payload size
- Set timeouts for long-running operations

### CI/CD Integration
```yaml
# GitHub Actions example
- name: Create Product
  run: |
    shopify-cli product create \
      --title "${{ env.PRODUCT_TITLE }}" \
      --price "${{ env.PRODUCT_PRICE }}" \
      --format json \
      --no-interactive > product.json
    
- name: Parse Product ID
  run: |
    PRODUCT_ID=$(cat product.json | jq -r '.data.id')
    echo "PRODUCT_ID=$PRODUCT_ID" >> $GITHUB_ENV
```

## Configuration

### Global Settings
```bash
# Always disable interactive mode
export SHOPIFY_CLI_NO_INTERACTIVE=true

# Default output format
export SHOPIFY_CLI_FORMAT=json

# Pretty print JSON (default: true)
export SHOPIFY_CLI_PRETTY=false
```

### Command-Specific Settings
```bash
# Per-command flags
shopify-cli product list --interactive=false --format=csv
shopify-cli product create --pretty=false --fields=id,title
```

## Migration Guide

### From Manual Commands
Before:
```bash
shopify-cli product create --title "T-Shirt" --price 29.99 --status active --vendor Nike --type Apparel
```

After (Interactive):
```bash
shopify-cli product create
# → Interactive prompts for all values
```

After (Scriptable):
```bash
shopify-cli product create --title "T-Shirt" --price 29.99 --format json
# → Structured JSON output for automation
```

## Troubleshooting

### Interactive Mode Not Working
- Check if running in TTY: `test -t 0 && echo "Interactive" || echo "Non-interactive"`
- Verify no CI environment variables are set
- Ensure `--no-interactive` flag is not used

### Scriptable Mode Issues
- Provide all required flags explicitly
- Use `--format json` for consistent output
- Handle error exit codes in scripts (non-zero on failure)
- Check stdout vs stderr for error messages

### Common Issues
```bash
# Issue: Command hangs waiting for input
# Solution: Use --no-interactive in scripts

# Issue: Inconsistent output format
# Solution: Always specify --format flag in scripts

# Issue: Missing required fields
# Solution: Check command help for required flags
shopify-cli product create --help
```
