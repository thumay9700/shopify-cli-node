# CI/CD Integration Guide

This guide explains how to integrate the Shopify CLI into your CI/CD pipelines for automated testing, deployment, and monitoring.

## 🎯 Overview

The Shopify CLI provides robust scriptable mode support with:

- **Environment Detection**: Automatic CI/CD environment detection
- **Structured Output**: JSON and CSV formats for programmatic parsing
- **Error Handling**: Standardized exit codes and error messages
- **Authentication**: Environment variable and secret management
- **Performance**: Efficient batch operations and caching

## 🚀 Quick Setup

### GitHub Actions

```yaml
# .github/workflows/shopify-deploy.yml
name: Shopify Deployment

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install Shopify CLI
      run: npm install -g shopify-cli-node
      
    - name: Configure Shopify CLI
      env:
        SHOPIFY_SHOP_URL: ${{ secrets.SHOPIFY_SHOP_URL }}
        SHOPIFY_ACCESS_TOKEN: ${{ secrets.SHOPIFY_ACCESS_TOKEN }}
        SHOPIFY_API_KEY: ${{ secrets.SHOPIFY_API_KEY }}
        SHOPIFY_API_SECRET: ${{ secrets.SHOPIFY_API_SECRET }}
      run: |
        shopify-cli config --format json
        
    - name: Deploy Products
      run: |
        shopify-cli product list --format json --no-interactive > products.json
        echo "Found $(jq '.data.products | length' products.json) products"
        
    - name: Upload Theme
      if: github.ref == 'refs/heads/main'
      run: |
        shopify-cli store theme upload ./theme \
          --name "Deployed-$(date +%Y%m%d-%H%M%S)" \
          --format json \
          --no-interactive
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - test
  - deploy

variables:
  NODE_VERSION: "18"

before_script:
  - npm install -g shopify-cli-node

test:
  stage: test
  image: node:${NODE_VERSION}
  script:
    - shopify-cli config --format json
    - shopify-cli product list --limit 1 --format json --no-interactive
  only:
    - merge_requests
    - main

deploy_staging:
  stage: deploy
  image: node:${NODE_VERSION}
  environment:
    name: staging
    url: https://staging-store.myshopify.com
  variables:
    SHOPIFY_SHOP_URL: $STAGING_SHOP_URL
    SHOPIFY_ACCESS_TOKEN: $STAGING_ACCESS_TOKEN
  script:
    - shopify-cli store theme upload ./theme --format json --no-interactive
  only:
    - develop

deploy_production:
  stage: deploy
  image: node:${NODE_VERSION}
  environment:
    name: production
    url: https://prod-store.myshopify.com
  variables:
    SHOPIFY_SHOP_URL: $PRODUCTION_SHOP_URL
    SHOPIFY_ACCESS_TOKEN: $PRODUCTION_ACCESS_TOKEN
  script:
    - shopify-cli store theme upload ./theme --format json --no-interactive
  only:
    - main
```

### Jenkins Pipeline

```groovy
// Jenkinsfile
pipeline {
    agent any
    
    environment {
        NODE_VERSION = '18'
        SHOPIFY_CLI_NO_INTERACTIVE = 'true'
        SHOPIFY_CLI_FORMAT = 'json'
    }
    
    stages {
        stage('Setup') {
            steps {
                sh 'nvm use ${NODE_VERSION}'
                sh 'npm install -g shopify-cli-node'
            }
        }
        
        stage('Configure') {
            steps {
                withCredentials([
                    string(credentialsId: 'shopify-shop-url', variable: 'SHOPIFY_SHOP_URL'),
                    string(credentialsId: 'shopify-access-token', variable: 'SHOPIFY_ACCESS_TOKEN')
                ]) {
                    sh 'shopify-cli config --format json'
                }
            }
        }
        
        stage('Test') {
            steps {
                sh 'shopify-cli product list --limit 1 --format json'
            }
        }
        
        stage('Deploy') {
            when { 
                branch 'main' 
            }
            steps {
                sh '''
                    shopify-cli store theme upload ./theme \\
                        --name "Jenkins-Build-${BUILD_NUMBER}" \\
                        --format json
                '''
            }
        }
    }
    
    post {
        always {
            sh 'shopify-cli config --format json > config-info.json'
            archiveArtifacts artifacts: 'config-info.json', allowEmptyArchive: true
        }
    }
}
```

## 🔐 Environment Configuration

### Required Environment Variables

```bash
# Shopify Authentication (Required)
SHOPIFY_SHOP_URL=https://your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=your-access-token

# Optional but recommended
SHOPIFY_API_KEY=your-api-key
SHOPIFY_API_SECRET=your-api-secret

# CLI Behavior
CI=true                          # Forces scriptable mode
SHOPIFY_CLI_NO_INTERACTIVE=true  # Disable prompts
SHOPIFY_CLI_FORMAT=json          # Default output format
SHOPIFY_CLI_DEBUG=false          # Debug mode

# Proxy (if needed)
PROXY_ENABLED=true
PROXY_HOST=proxy.company.com
PROXY_PORT=8080
```

### Secret Management

#### GitHub Actions Secrets

1. Go to your repository → Settings → Secrets and variables → Actions
2. Add the following secrets:
   - `SHOPIFY_SHOP_URL`
   - `SHOPIFY_ACCESS_TOKEN`
   - `SHOPIFY_API_KEY`
   - `SHOPIFY_API_SECRET`

#### GitLab CI Variables

1. Go to your project → Settings → CI/CD → Variables
2. Add variables with appropriate protection settings
3. Use different variables for different environments

#### Docker/Kubernetes Secrets

```yaml
# kubernetes-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: shopify-credentials
type: Opaque
stringData:
  SHOPIFY_SHOP_URL: "https://your-store.myshopify.com"
  SHOPIFY_ACCESS_TOKEN: "your-access-token"
```

## 📊 Common CI/CD Workflows

### Product Deployment

```bash
#!/bin/bash
# deploy-products.sh

set -e

echo "🚀 Starting product deployment..."

# Export products from source
shopify-cli product list \
    --account source \
    --format json \
    --no-interactive > source-products.json

echo "✅ Exported $(jq '.data.products | length' source-products.json) products"

# Process and deploy to target
jq '.data.products[]' source-products.json | while read -r product; do
    echo "Deploying product: $(echo "$product" | jq -r '.title')"
    
    shopify-cli product create \
        --account target \
        --json "$product" \
        --format json \
        --no-interactive
done

echo "🎉 Product deployment completed!"
```

### Theme Deployment

```bash
#!/bin/bash
# deploy-theme.sh

set -e

ENVIRONMENT=${1:-staging}
THEME_NAME="Deploy-$(date +%Y%m%d-%H%M%S)"

echo "🎨 Deploying theme to $ENVIRONMENT..."

# Upload theme
RESULT=$(shopify-cli store theme upload ./theme \
    --account "$ENVIRONMENT" \
    --name "$THEME_NAME" \
    --format json \
    --no-interactive)

THEME_ID=$(echo "$RESULT" | jq -r '.data.theme.id')
echo "✅ Theme uploaded with ID: $THEME_ID"

# Activate if production
if [ "$ENVIRONMENT" = "production" ]; then
    echo "🚀 Activating theme in production..."
    
    shopify-cli store theme activate "$THEME_ID" \
        --account production \
        --backup \
        --format json \
        --no-interactive
        
    echo "🎉 Theme activated in production!"
fi
```

### Data Synchronization

```bash
#!/bin/bash
# sync-data.sh

set -e

SOURCE_ACCOUNT="production"
TARGET_ACCOUNT="staging"

echo "🔄 Synchronizing data from $SOURCE_ACCOUNT to $TARGET_ACCOUNT..."

# Sync products
echo "Syncing products..."
shopify-cli product list \
    --account "$SOURCE_ACCOUNT" \
    --status active \
    --format json \
    --no-interactive | \
jq '.data.products[]' | \
while IFS= read -r product; do
    shopify-cli product create \
        --account "$TARGET_ACCOUNT" \
        --json "$product" \
        --format json \
        --no-interactive || echo "Warning: Failed to sync product"
done

# Sync webhooks
echo "Syncing webhooks..."
shopify-cli store webhook list \
    --account "$SOURCE_ACCOUNT" \
    --format json \
    --no-interactive | \
jq '.data.webhooks[]' | \
while IFS= read -r webhook; do
    TOPIC=$(echo "$webhook" | jq -r '.topic')
    ADDRESS=$(echo "$webhook" | jq -r '.address')
    
    shopify-cli store webhook create \
        --account "$TARGET_ACCOUNT" \
        --topic "$TOPIC" \
        --address "$ADDRESS" \
        --format json \
        --no-interactive || echo "Warning: Failed to sync webhook"
done

echo "🎉 Data synchronization completed!"
```

### Health Checks

```bash
#!/bin/bash
# health-check.sh

set -e

ACCOUNT=${1:-production}
FAILED=0

echo "🏥 Running health checks for $ACCOUNT..."

# Check configuration
echo "Checking configuration..."
if ! shopify-cli config --format json >/dev/null 2>&1; then
    echo "❌ Configuration check failed"
    FAILED=1
fi

# Check API connectivity
echo "Checking API connectivity..."
if ! shopify-cli product list --account "$ACCOUNT" --limit 1 --format json >/dev/null 2>&1; then
    echo "❌ API connectivity check failed"
    FAILED=1
fi

# Check theme status
echo "Checking active theme..."
ACTIVE_THEMES=$(shopify-cli store theme list \
    --account "$ACCOUNT" \
    --role main \
    --format json \
    --no-interactive | \
    jq '.data.themes | length')

if [ "$ACTIVE_THEMES" -ne 1 ]; then
    echo "❌ Theme check failed: Expected 1 active theme, found $ACTIVE_THEMES"
    FAILED=1
fi

# Check webhook status
echo "Checking webhooks..."
WEBHOOK_COUNT=$(shopify-cli store webhook list \
    --account "$ACCOUNT" \
    --format json \
    --no-interactive | \
    jq '.data.webhooks | length')

echo "ℹ️  Found $WEBHOOK_COUNT webhooks"

if [ $FAILED -eq 0 ]; then
    echo "✅ All health checks passed!"
    exit 0
else
    echo "❌ Some health checks failed!"
    exit 1
fi
```

## 🛠️ Error Handling

### Exit Codes

The CLI uses standard exit codes:

- `0`: Success
- `1`: General error
- `2`: Misuse of command
- `126`: Command invoked cannot execute
- `127`: Command not found
- `130`: Script terminated by Control-C

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Product title is required",
    "details": {
      "field": "title",
      "provided": null,
      "expected": "string"
    }
  },
  "metadata": {
    "timestamp": "2024-01-01T12:00:00.000Z",
    "executionTime": 150,
    "command": "product:create"
  }
}
```

### Error Handling in Scripts

```bash
#!/bin/bash
# robust-deployment.sh

set -e  # Exit on any error

# Function to handle errors
handle_error() {
    echo "❌ Error occurred in deployment at line $1"
    echo "Cleaning up..."
    # Add cleanup logic here
    exit 1
}

# Set error trap
trap 'handle_error $LINENO' ERR

# Deployment with error handling
deploy_with_retry() {
    local max_retries=3
    local retry_count=0
    
    while [ $retry_count -lt $max_retries ]; do
        if shopify-cli product create --json "$1" --format json --no-interactive; then
            echo "✅ Deployment successful"
            return 0
        else
            retry_count=$((retry_count + 1))
            echo "⚠️  Retry $retry_count/$max_retries"
            sleep 5
        fi
    done
    
    echo "❌ Deployment failed after $max_retries retries"
    return 1
}

# Usage
PRODUCT_JSON='{"title":"Test Product","price":"19.99"}'
deploy_with_retry "$PRODUCT_JSON"
```

## 📈 Monitoring and Logging

### Structured Logging

```bash
#!/bin/bash
# logged-deployment.sh

LOG_LEVEL=${LOG_LEVEL:-info}
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

log() {
    local level=$1
    shift
    echo "{\"timestamp\":\"$TIMESTAMP\",\"level\":\"$level\",\"message\":\"$*\"}"
}

log "info" "Starting deployment process"

# Run command with structured output
RESULT=$(shopify-cli product create \
    --title "Monitored Product" \
    --price 19.99 \
    --format json \
    --no-interactive 2>&1)

if [ $? -eq 0 ]; then
    log "info" "Product created successfully"
    echo "$RESULT" | jq '.data.id' | xargs -I {} log "info" "Product ID: {}"
else
    log "error" "Product creation failed: $RESULT"
    exit 1
fi
```

### Performance Monitoring

```bash
#!/bin/bash
# performance-monitoring.sh

START_TIME=$(date +%s)

# Run command with timing
TIME_OUTPUT=$(time shopify-cli product list \
    --format json \
    --no-interactive 2>&1)

END_TIME=$(date +%s)
EXECUTION_TIME=$((END_TIME - START_TIME))

echo "Performance metrics:"
echo "- Execution time: ${EXECUTION_TIME}s"
echo "- Memory usage: $(ps -o rss= -p $$) KB"

# Parse CLI response for additional metrics
echo "$TIME_OUTPUT" | jq '.metadata.executionTime' | \
    xargs -I {} echo "- CLI execution time: {}ms"
```

## 🔧 Advanced Configurations

### Docker Integration

```dockerfile
# Dockerfile
FROM node:18-alpine

RUN npm install -g shopify-cli-node

# Copy configuration
COPY config.yaml /app/config.yaml
ENV SHOPIFY_CLI_CONFIG_PATH=/app

WORKDIR /app
COPY scripts/ ./scripts/

ENTRYPOINT ["./scripts/deploy.sh"]
```

### Kubernetes CronJob

```yaml
# kubernetes-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: shopify-sync
spec:
  schedule: "0 */6 * * *"  # Every 6 hours
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: shopify-cli
            image: node:18-alpine
            command:
            - /bin/sh
            - -c
            - |
              npm install -g shopify-cli-node
              shopify-cli product list --format json --no-interactive
            env:
            - name: SHOPIFY_SHOP_URL
              valueFrom:
                secretKeyRef:
                  name: shopify-credentials
                  key: SHOPIFY_SHOP_URL
            - name: SHOPIFY_ACCESS_TOKEN
              valueFrom:
                secretKeyRef:
                  name: shopify-credentials
                  key: SHOPIFY_ACCESS_TOKEN
          restartPolicy: OnFailure
```

### Terraform Integration

```hcl
# terraform/main.tf
resource "null_resource" "shopify_deploy" {
  provisioner "local-exec" {
    command = <<-EOT
      npm install -g shopify-cli-node
      shopify-cli store theme upload ${path.module}/../theme \
        --name "Terraform-${timestamp()}" \
        --format json \
        --no-interactive
    EOT
    
    environment = {
      SHOPIFY_SHOP_URL = var.shopify_shop_url
      SHOPIFY_ACCESS_TOKEN = var.shopify_access_token
    }
  }
  
  triggers = {
    theme_hash = filemd5("${path.module}/../theme/templates/index.liquid")
  }
}
```

## 🎯 Best Practices

1. **Environment Separation**: Use different credentials for each environment
2. **Error Handling**: Always handle errors gracefully with retries
3. **Logging**: Use structured logging for better monitoring
4. **Security**: Never log sensitive information like API tokens
5. **Performance**: Use caching and batch operations where possible
6. **Testing**: Test deployments in staging before production
7. **Rollback**: Always have a rollback strategy
8. **Monitoring**: Monitor deployment success and performance
9. **Documentation**: Document your CI/CD processes
10. **Version Control**: Version your deployment scripts

This guide provides a solid foundation for integrating the Shopify CLI into your CI/CD workflows. Adapt the examples to your specific needs and infrastructure.
