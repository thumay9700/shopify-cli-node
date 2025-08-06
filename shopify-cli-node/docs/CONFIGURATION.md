# Configuration Management

The Shopify CLI provides a comprehensive configuration management system that supports multiple accounts, Decodo API credentials, proxy settings, and environment variable overrides.

## Overview

The configuration system:
- **Validates schema** using Joi validation
- **Supports environment overrides** via `.env` files and environment variables
- **Persists updates** atomically to prevent corruption
- **Manages multiple Shopify accounts** with default selection
- **Handles Decodo API credentials** securely
- **Configures proxy settings** for corporate environments
- **Supports both YAML and JSON formats**

## Configuration Location

By default, configuration files are stored in:
- **Config File**: `~/.shopify-cli/config.yaml`
- **Environment File**: `~/.shopify-cli/.env`

You can override the configuration directory using the `SHOPIFY_CLI_CONFIG_PATH` environment variable.

## Configuration Structure

### YAML Format (config.yaml)

```yaml
version: "1.0.0"

# Multiple Shopify accounts
accounts:
  - name: "development"
    shopUrl: "https://your-dev-store.myshopify.com"
    accessToken: "your-access-token"
    apiKey: "your-api-key"
    apiSecret: "your-api-secret"
    isDefault: true

  - name: "staging"
    shopUrl: "https://staging-store.myshopify.com"
    accessToken: "staging-token"
    isDefault: false

# Decodo API integration
decodoApi:
  endpoint: "https://us.decodo.com:10001"
  apiKey: "your-decodo-api-key"
  timeout: 30000

# Proxy configuration
proxy:
  enabled: true
  host: "proxy.company.com"
  port: 8080
  username: "proxy-user"
  password: "proxy-pass"
  protocol: "http"

# Global settings
settings:
  debug: false
  logLevel: "info"
  theme: "default"
  autoUpdate: true

lastUpdated: "2024-01-15T10:30:00.000Z"
```

### JSON Format

The same structure is supported in JSON format if you prefer `config.json`.

## Environment Variable Overrides

Environment variables take precedence over configuration file values. Create a `.env` file in the config directory or set system environment variables:

```bash
# Global settings
SHOPIFY_CLI_DEBUG=true
SHOPIFY_CLI_LOG_LEVEL=debug

# Shopify account (creates 'env-override' account)
SHOPIFY_SHOP_URL=https://your-shop.myshopify.com
SHOPIFY_ACCESS_TOKEN=your-access-token
SHOPIFY_API_KEY=your-api-key
SHOPIFY_API_SECRET=your-api-secret

# Decodo API
DECODO_API_ENDPOINT=https://us.decodo.com:10002
DECODO_API_KEY=your-decodo-api-key
DECODO_API_TIMEOUT=60000

# Proxy settings
PROXY_ENABLED=true
PROXY_HOST=proxy.example.com
PROXY_PORT=8080
PROXY_USERNAME=your-username
PROXY_PASSWORD=your-password
PROXY_PROTOCOL=http
```

## Using the Configuration API

### Basic Usage

```typescript
import { configLoader } from './src/config';

// Load configuration
const config = await configLoader.load();

// Get default account
const defaultAccount = await configLoader.getDefaultAccount();

// Add a new account
await configLoader.addAccount({
  name: 'production',
  shopUrl: 'https://prod.myshopify.com',
  accessToken: 'prod-token',
  isDefault: false,
});

// Update Decodo API credentials
await configLoader.updateDecodoApi({
  endpoint: 'https://us.decodo.com:10001',
  apiKey: 'new-api-key',
  timeout: 30000,
});

// Update settings
await configLoader.updateSettings({
  debug: true,
  logLevel: 'debug',
});
```

### Advanced Usage

```typescript
import { ConfigLoader, validateConfig } from './src/config';

// Create custom config loader
const customLoader = new ConfigLoader('/custom/path');

// Validate configuration with requirements
const { error, value } = validateConfig(configData, {
  requireDecodoApi: true,
  requireAccounts: true,
});

if (error) {
  console.error('Validation failed:', error.message);
}
```

## CLI Commands

### View Configuration

```bash
# Show current configuration in table format
shopify-cli config show

# Show in JSON format
shopify-cli config show --format json

# Show configuration file paths
shopify-cli config paths
```

### Initialize Configuration

```bash
# Create default configuration
shopify-cli config init

# Reset to defaults
shopify-cli config reset
```

### Account Management

```bash
# Add a new account interactively
shopify-cli config accounts:add

# List all accounts
shopify-cli config accounts:list

# Remove an account
shopify-cli config accounts:remove

# Set default account
shopify-cli config accounts:default
```

### Decodo API Management

```bash
# Configure Decodo API credentials
shopify-cli config decodo:set

# Show current Decodo API settings
shopify-cli config decodo:show
```

### Proxy Configuration

```bash
# Configure proxy settings
shopify-cli config proxy:set

# Show current proxy settings
shopify-cli config proxy:show
```

### Global Settings

```bash
# Update global settings
shopify-cli config settings:set
```

## Schema Validation

The configuration system uses Joi for comprehensive schema validation:

### Account Validation
- `name`: Required string (1-100 characters)
- `shopUrl`: Required valid HTTP/HTTPS URL
- `accessToken`: Optional string
- `apiKey`: Optional string  
- `apiSecret`: Optional string
- `isDefault`: Optional boolean (only one account can be default)

### Decodo API Validation
- `endpoint`: Required valid HTTP/HTTPS URL
- `apiKey`: Required string
- `timeout`: Optional integer (1000-300000ms, default: 30000)

### Proxy Validation
- `enabled`: Required boolean
- `host`: Required when enabled
- `port`: Required integer (1-65535) when enabled
- `username`: Optional string
- `password`: Optional string
- `protocol`: Optional enum (http, https, socks4, socks5, default: http)

### Settings Validation
- `debug`: Optional boolean (default: false)
- `logLevel`: Optional enum (error, warn, info, debug, default: info)
- `theme`: Optional enum (default, dark, light, default: default)
- `autoUpdate`: Optional boolean (default: true)

## Error Handling

The configuration system provides detailed error information:

```typescript
import { ConfigurationError } from './src/config';

try {
  await configLoader.load();
} catch (error) {
  if (error instanceof ConfigurationError) {
    console.error(`Configuration error (${error.code}): ${error.message}`);
    console.error('Details:', error.details);
  }
}
```

### Error Codes
- `VALIDATION_ERROR`: Schema validation failed
- `LOAD_ERROR`: Failed to load configuration file
- `SAVE_ERROR`: Failed to save configuration file
- `PARSE_ERROR`: Failed to parse YAML/JSON content

## Security Considerations

1. **File Permissions**: Configuration files are created with `0o600` (read/write for owner only)
2. **Sensitive Data**: API keys and secrets are never logged or displayed in plain text
3. **Environment Variables**: Credentials in environment variables take precedence over file values
4. **Validation**: All input is validated before saving to prevent injection attacks

## Best Practices

1. **Environment-Specific Configs**: Use different accounts for dev/staging/production
2. **Environment Variables**: Use env vars for CI/CD pipelines and containerized deployments
3. **Default Account**: Set a sensible default account for your primary development environment
4. **Regular Backups**: The configuration directory can be backed up safely (excluding sensitive credentials)
5. **Proxy Configuration**: Configure proxy settings if working in a corporate environment

## Migration and Versioning

The configuration system includes versioning support for future migrations:

- Current version: `1.0.0`
- Version validation ensures compatibility
- Future versions will include automatic migration logic

## Troubleshooting

### Common Issues

1. **Configuration Not Found**
   ```bash
   shopify-cli config init
   ```

2. **Invalid Schema**
   ```bash
   shopify-cli config show
   # Check validation errors
   ```

3. **Permission Errors**
   ```bash
   chmod 755 ~/.shopify-cli
   chmod 600 ~/.shopify-cli/config.yaml
   ```

4. **Environment Override Not Working**
   ```bash
   # Check environment variables are set
   env | grep SHOPIFY_
   env | grep DECODO_
   env | grep PROXY_
   ```

### Debug Mode

Enable debug mode for detailed logging:

```bash
export SHOPIFY_CLI_DEBUG=true
# or
shopify-cli config settings:set
```

## Development

### Running Tests

```bash
npm test test/config/
```

### Adding New Configuration Fields

1. Update types in `src/config/types.ts`
2. Update schema in `src/config/schema.ts`
3. Update loader methods in `src/config/loader.ts`
4. Add validation tests
5. Update documentation

This configuration system provides a robust, secure, and flexible foundation for managing all Shopify CLI settings and credentials.
