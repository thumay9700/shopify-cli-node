# Advanced CI/CD Integration Patterns

This guide provides comprehensive automation examples for integrating the Shopify CLI into various CI/CD pipelines and deployment workflows.

## GitHub Actions Workflows

### 1. Product Synchronization Pipeline

```yaml
# .github/workflows/sync-products.yml
name: Sync Products Across Stores

on:
  push:
    paths:
      - 'products/**'
    branches: [main]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        default: 'staging'
        type: choice
        options: ['staging', 'production']

env:
  NODE_VERSION: '18'

jobs:
  sync-products:
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment || 'staging' }}
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build CLI
        run: npm run build
        
      - name: Configure Shopify accounts
        run: |
          mkdir -p ~/.shopify-cli
          cat > ~/.shopify-cli/config.yaml << EOF
          version: "1.0.0"
          lastUpdated: "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
          accounts:
            - name: "staging"
              shopUrl: "${{ secrets.STAGING_SHOP_URL }}"
              accessToken: "${{ secrets.STAGING_ACCESS_TOKEN }}"
              isDefault: true
            - name: "production"
              shopUrl: "${{ secrets.PRODUCTION_SHOP_URL }}"
              accessToken: "${{ secrets.PRODUCTION_ACCESS_TOKEN }}"
              isDefault: false
          settings:
            debug: false
            logLevel: "info"
          EOF
          
      - name: Test connection
        run: |
          ./bin/run.js config --test-connection --format json
          
      - name: Sync products from files
        run: |
          # Process product files
          for file in products/*.json; do
            if [ -f "$file" ]; then
              echo "Processing $file..."
              ./bin/run.js product bulk update \
                --account ${{ github.event.inputs.environment || 'staging' }} \
                --file "$file" \
                --format json \
                --batch-size 5 \
                --max-retries 3 \
                --output-file "sync-results-$(basename $file)"
            fi
          done
          
      - name: Generate sync report
        run: |
          # Combine all sync results
          echo "# Product Sync Report - $(date)" > sync-report.md
          echo "" >> sync-report.md
          echo "## Environment: ${{ github.event.inputs.environment || 'staging' }}" >> sync-report.md
          echo "" >> sync-report.md
          
          for result_file in sync-results-*.json; do
            if [ -f "$result_file" ]; then
              echo "### Results from $result_file" >> sync-report.md
              echo '```json' >> sync-report.md
              cat "$result_file" >> sync-report.md
              echo '```' >> sync-report.md
              echo "" >> sync-report.md
            fi
          done
          
      - name: Upload sync results
        uses: actions/upload-artifact@v4
        with:
          name: sync-results-${{ github.event.inputs.environment || 'staging' }}
          path: |
            sync-results-*.json
            sync-report.md
          retention-days: 30
          
      - name: Notify on failure
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: failure
          channel: '#deployments'
          fields: repo,message,commit,author,action,eventName,ref,workflow
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### 2. Inventory Management Automation

```yaml
# .github/workflows/inventory-management.yml
name: Automated Inventory Management

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:
    inputs:
      action:
        description: 'Inventory action'
        required: true
        type: choice
        options: ['sync', 'adjust', 'report', 'restock-alerts']

jobs:
  inventory-management:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup CLI
        uses: ./.github/actions/setup-shopify-cli
        
      - name: Inventory synchronization
        if: github.event.inputs.action == 'sync' || github.event_name == 'schedule'
        run: |
          # Get inventory levels from all stores
          ./bin/run.js product inventory levels \
            --account production \
            --format json \
            --output-file production-inventory.json
            
          ./bin/run.js product inventory levels \
            --account staging \
            --format json \
            --output-file staging-inventory.json
            
          # Compare and sync discrepancies
          node scripts/sync-inventory.js
          
      - name: Low stock alerts
        if: github.event.inputs.action == 'restock-alerts' || github.event_name == 'schedule'
        run: |
          # Check for low stock items
          ./bin/run.js product list \
            --account production \
            --format json \
            --fields id,title,variants | \
          jq '[.products[] | select(.variants[]?.inventory_quantity < 10)]' > low-stock.json
          
          # Send alerts if items found
          if [ $(cat low-stock.json | jq length) -gt 0 ]; then
            echo "Low stock items found!"
            node scripts/send-restock-alerts.js low-stock.json
          fi
          
      - name: Generate inventory report
        run: |
          node scripts/generate-inventory-report.js
          
      - name: Commit inventory updates
        if: github.event_name == 'schedule'
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add inventory-reports/
          git commit -m "Update inventory reports - $(date)" || exit 0
          git push
```

### 3. Theme Deployment Pipeline

```yaml
# .github/workflows/theme-deployment.yml
name: Theme Deployment

on:
  push:
    paths:
      - 'theme/**'
    branches: [main, develop]
  pull_request:
    paths:
      - 'theme/**'

jobs:
  theme-validation:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup CLI
        uses: ./.github/actions/setup-shopify-cli
        
      - name: Validate theme structure
        run: |
          # Check required theme files
          node scripts/validate-theme-structure.js
          
      - name: Upload preview theme
        run: |
          # Create preview theme for PR
          THEME_NAME="pr-${{ github.event.number }}-$(git rev-parse --short HEAD)"
          
          ./bin/run.js store theme upload \
            --account staging \
            --name "$THEME_NAME" \
            --source theme/ \
            --format json > theme-upload-result.json
            
          THEME_ID=$(cat theme-upload-result.json | jq -r '.theme.id')
          
          # Add comment to PR with preview link
          cat > pr-comment.md << EOF
          ## 🎨 Theme Preview Ready
          
          Your theme has been uploaded to staging for preview:
          - **Theme ID**: $THEME_ID
          - **Preview URL**: https://${{ secrets.STAGING_SHOP_URL }}?preview_theme_id=$THEME_ID
          - **Commit**: ${{ github.sha }}
          
          The preview will be available for 7 days.
          EOF
          
          gh pr comment ${{ github.event.number }} --body-file pr-comment.md
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  theme-deploy:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    needs: [theme-validation]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup CLI
        uses: ./.github/actions/setup-shopify-cli
        
      - name: Deploy to staging
        run: |
          ./bin/run.js store theme upload \
            --account staging \
            --name "main-$(date +%Y%m%d-%H%M%S)" \
            --source theme/ \
            --format json > staging-theme.json
            
          STAGING_THEME_ID=$(cat staging-theme.json | jq -r '.theme.id')
          
          ./bin/run.js store theme activate \
            --account staging \
            --theme-id $STAGING_THEME_ID \
            --backup
            
      - name: Run theme tests
        run: |
          # Run automated theme tests
          node scripts/test-theme-functionality.js staging
          
      - name: Deploy to production
        if: success()
        run: |
          ./bin/run.js store theme upload \
            --account production \
            --name "release-$(date +%Y%m%d-%H%M%S)" \
            --source theme/ \
            --format json > production-theme.json
            
          PRODUCTION_THEME_ID=$(cat production-theme.json | jq -r '.theme.id')
          
          # Activate with backup
          ./bin/run.js store theme activate \
            --account production \
            --theme-id $PRODUCTION_THEME_ID \
            --backup \
            --confirm
```

## GitLab CI/CD Pipeline

```yaml
# .gitlab-ci.yml
stages:
  - validate
  - test
  - deploy-staging
  - deploy-production

variables:
  NODE_VERSION: "18"
  
before_script:
  - apt-get update -qq && apt-get install -y -qq jq
  - npm ci
  - npm run build

validate-config:
  stage: validate
  script:
    - echo "Validating Shopify configuration..."
    - ./bin/run.js config --validate || echo "Config validation skipped - no accounts configured"
  only:
    - merge_requests
    - main

integration-tests:
  stage: test
  script:
    - echo "Running integration tests..."
    - npm run test:integration
  artifacts:
    reports:
      junit: test-results.xml
    paths:
      - test-results.xml
      - coverage/
    expire_in: 1 week
  only:
    - merge_requests
    - main

deploy-staging:
  stage: deploy-staging
  environment:
    name: staging
    url: https://$STAGING_SHOP_URL
  script:
    - echo "Deploying to staging environment..."
    - |
      cat > config.yaml << EOF
      accounts:
        - name: staging
          shopUrl: $STAGING_SHOP_URL
          accessToken: $STAGING_ACCESS_TOKEN
          isDefault: true
      settings:
        debug: false
      EOF
    - ./bin/run.js config --test-connection --account staging
    - ./bin/run.js product bulk update --file products/staging.json --dry-run
    - ./bin/run.js product bulk update --file products/staging.json --batch-size 10
  artifacts:
    paths:
      - staging-deployment-*.json
    expire_in: 1 week
  only:
    - main

deploy-production:
  stage: deploy-production
  environment:
    name: production
    url: https://$PRODUCTION_SHOP_URL
  script:
    - echo "Deploying to production environment..."
    - |
      cat > config.yaml << EOF
      accounts:
        - name: production
          shopUrl: $PRODUCTION_SHOP_URL
          accessToken: $PRODUCTION_ACCESS_TOKEN
          isDefault: true
      EOF
    - ./bin/run.js config --test-connection --account production
    - ./bin/run.js product bulk update --file products/production.json --batch-size 5
  when: manual
  only:
    - main
```

## Jenkins Pipeline

```groovy
// Jenkinsfile
pipeline {
    agent any
    
    environment {
        NODE_VERSION = '18'
        SHOPIFY_CLI_CONFIG_PATH = credentials('shopify-config-path')
    }
    
    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 1, unit: 'HOURS')
        timestamps()
    }
    
    stages {
        stage('Setup') {
            steps {
                script {
                    // Install Node.js
                    sh """
                        curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
                        sudo apt-get install -y nodejs
                        node --version
                        npm --version
                    """
                }
                
                // Install dependencies
                sh 'npm ci'
                sh 'npm run build'
            }
        }
        
        stage('Configuration') {
            steps {
                withCredentials([
                    string(credentialsId: 'staging-shop-url', variable: 'STAGING_SHOP_URL'),
                    string(credentialsId: 'staging-access-token', variable: 'STAGING_ACCESS_TOKEN'),
                    string(credentialsId: 'production-shop-url', variable: 'PRODUCTION_SHOP_URL'),
                    string(credentialsId: 'production-access-token', variable: 'PRODUCTION_ACCESS_TOKEN')
                ]) {
                    script {
                        def environment = params.ENVIRONMENT ?: 'staging'
                        
                        sh """
                            mkdir -p ~/.shopify-cli
                            cat > ~/.shopify-cli/config.yaml << EOF
version: "1.0.0"
accounts:
  - name: staging
    shopUrl: ${STAGING_SHOP_URL}
    accessToken: ${STAGING_ACCESS_TOKEN}
    isDefault: ${environment == 'staging' ? 'true' : 'false'}
  - name: production
    shopUrl: ${PRODUCTION_SHOP_URL}
    accessToken: ${PRODUCTION_ACCESS_TOKEN}
    isDefault: ${environment == 'production' ? 'true' : 'false'}
settings:
  debug: false
  logLevel: info
EOF
                        """
                        
                        // Test connection
                        sh './bin/run.js config --test-connection --format json'
                    }
                }
            }
        }
        
        stage('Data Processing') {
            parallel {
                stage('Products') {
                    when {
                        anyOf {
                            changeset "products/**"
                            expression { params.FORCE_PRODUCT_SYNC == true }
                        }
                    }
                    steps {
                        script {
                            sh """
                                echo "Processing product updates..."
                                for file in products/*.json; do
                                    if [ -f "\$file" ]; then
                                        echo "Processing \$file..."
                                        ./bin/run.js product bulk update \\
                                            --account ${params.ENVIRONMENT ?: 'staging'} \\
                                            --file "\$file" \\
                                            --format json \\
                                            --output-file "product-sync-\$(basename \$file)" \\
                                            --batch-size 10
                                    fi
                                done
                            """
                        }
                    }
                    post {
                        always {
                            archiveArtifacts artifacts: 'product-sync-*.json', allowEmptyArchive: true
                        }
                    }
                }
                
                stage('Inventory') {
                    when {
                        anyOf {
                            changeset "inventory/**"
                            expression { params.FORCE_INVENTORY_SYNC == true }
                        }
                    }
                    steps {
                        script {
                            sh """
                                echo "Processing inventory updates..."
                                ./bin/run.js product inventory levels \\
                                    --account ${params.ENVIRONMENT ?: 'staging'} \\
                                    --format json \\
                                    --output-file current-inventory.json
                                    
                                node scripts/process-inventory-updates.js
                            """
                        }
                    }
                }
                
                stage('Webhooks') {
                    when {
                        anyOf {
                            changeset "webhooks/**"
                            expression { params.FORCE_WEBHOOK_SYNC == true }
                        }
                    }
                    steps {
                        script {
                            sh """
                                echo "Setting up webhooks..."
                                ./bin/run.js store webhook list \\
                                    --account ${params.ENVIRONMENT ?: 'staging'} \\
                                    --format json > current-webhooks.json
                                    
                                node scripts/sync-webhooks.js
                            """
                        }
                    }
                }
            }
        }
        
        stage('Validation') {
            steps {
                script {
                    sh """
                        echo "Running post-deployment validation..."
                        ./bin/run.js store settings view \\
                            --account ${params.ENVIRONMENT ?: 'staging'} \\
                            --format json > store-validation.json
                            
                        node scripts/validate-deployment.js
                    """
                }
            }
        }
        
        stage('Reporting') {
            steps {
                script {
                    sh """
                        echo "Generating deployment report..."
                        node scripts/generate-deployment-report.js \\
                            --environment ${params.ENVIRONMENT ?: 'staging'} \\
                            --build-number ${BUILD_NUMBER}
                    """
                }
                
                publishHTML([
                    allowMissing: false,
                    alwaysLinkToLastBuild: true,
                    keepAll: true,
                    reportDir: 'reports',
                    reportFiles: 'deployment-report.html',
                    reportName: 'Deployment Report'
                ])
            }
        }
    }
    
    post {
        always {
            // Clean up
            sh 'rm -f ~/.shopify-cli/config.yaml'
            
            // Archive artifacts
            archiveArtifacts artifacts: '**/*-sync-*.json, reports/**', allowEmptyArchive: true
            
            // Send notifications
            script {
                def status = currentBuild.result ?: 'SUCCESS'
                def color = status == 'SUCCESS' ? 'good' : 'danger'
                def environment = params.ENVIRONMENT ?: 'staging'
                
                slackSend(
                    channel: '#deployments',
                    color: color,
                    message: """
                        Shopify CLI Deployment - ${status}
                        Environment: ${environment}
                        Build: ${BUILD_NUMBER}
                        Duration: ${currentBuild.durationString}
                        Changes: ${env.GIT_COMMIT?.take(8)} by ${env.GIT_COMMITTER_NAME}
                    """.stripIndent()
                )
            }
        }
        
        failure {
            emailext(
                to: '${DEFAULT_RECIPIENTS}',
                subject: 'Shopify CLI Deployment Failed - Build ${BUILD_NUMBER}',
                body: '''
                    The Shopify CLI deployment has failed.
                    
                    Build: ${BUILD_NUMBER}
                    Environment: ${params.ENVIRONMENT}
                    
                    Please check the console output for details:
                    ${BUILD_URL}console
                '''
            )
        }
    }
}
```

## Docker Integration

```dockerfile
# Dockerfile for Shopify CLI automation
FROM node:18-alpine

LABEL maintainer="your-team@company.com"
LABEL description="Shopify CLI automation container"

# Install required packages
RUN apk add --no-cache \
    git \
    bash \
    curl \
    jq \
    && rm -rf /var/cache/apk/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application
COPY . .

# Build the CLI
RUN npm run build

# Create shopify-cli user
RUN addgroup -g 1001 -S shopify-cli && \
    adduser -u 1001 -S shopify-cli -G shopify-cli

# Create config directory
RUN mkdir -p /home/shopify-cli/.shopify-cli && \
    chown -R shopify-cli:shopify-cli /home/shopify-cli

# Switch to shopify-cli user
USER shopify-cli

# Set default command
CMD ["./bin/run.js", "--help"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD ./bin/run.js config || exit 1
```

```yaml
# docker-compose.yml for development
version: '3.8'

services:
  shopify-cli:
    build: .
    volumes:
      - ./config:/home/shopify-cli/.shopify-cli:ro
      - ./data:/app/data
      - ./reports:/app/reports
    environment:
      - NODE_ENV=production
      - SHOPIFY_CLI_DEBUG=false
    command: tail -f /dev/null  # Keep container running
    
  scheduler:
    build: .
    volumes:
      - ./config:/home/shopify-cli/.shopify-cli:ro
      - ./scripts:/app/scripts:ro
      - ./data:/app/data
    environment:
      - NODE_ENV=production
    command: node scripts/scheduler.js
    depends_on:
      - shopify-cli
    restart: unless-stopped
```

## Kubernetes Deployment

```yaml
# k8s/shopify-cli-deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: shopify-cli-automation
  labels:
    app: shopify-cli
spec:
  replicas: 2
  selector:
    matchLabels:
      app: shopify-cli
  template:
    metadata:
      labels:
        app: shopify-cli
    spec:
      containers:
      - name: shopify-cli
        image: your-registry/shopify-cli:latest
        imagePullPolicy: Always
        env:
        - name: NODE_ENV
          value: "production"
        - name: SHOPIFY_CLI_DEBUG
          value: "false"
        volumeMounts:
        - name: config
          mountPath: /home/shopify-cli/.shopify-cli
          readOnly: true
        - name: data
          mountPath: /app/data
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          exec:
            command:
            - /app/bin/run.js
            - config
          initialDelaySeconds: 30
          periodSeconds: 60
        readinessProbe:
          exec:
            command:
            - /app/bin/run.js
            - config
            - --test-connection
          initialDelaySeconds: 10
          periodSeconds: 30
      volumes:
      - name: config
        secret:
          secretName: shopify-cli-config
      - name: data
        persistentVolumeClaim:
          claimName: shopify-cli-data

---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: shopify-sync-products
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: sync-products
            image: your-registry/shopify-cli:latest
            command:
            - /app/bin/run.js
            - product
            - bulk
            - update
            - --file
            - /app/data/products.json
            - --format
            - json
            volumeMounts:
            - name: config
              mountPath: /home/shopify-cli/.shopify-cli
              readOnly: true
            - name: data
              mountPath: /app/data
          volumes:
          - name: config
            secret:
              secretName: shopify-cli-config
          - name: data
            persistentVolumeClaim:
              claimName: shopify-cli-data
          restartPolicy: OnFailure

---
apiVersion: v1
kind: Secret
metadata:
  name: shopify-cli-config
type: Opaque
data:
  config.yaml: |
    # Base64 encoded config.yaml content
    dmVyc2lvbjogIjEuMC4wIgphY2NvdW50czoKICAtIG5hbWU6ICJwcm9kdWN0aW9uIgogICAgc2hvcFVybDogInByb2Qtc3RvcmUubXlzaG9waWZ5LmNvbSIKICAgIGFjY2Vzc1Rva2VuOiAieW91cl9hY2Nlc3NfdG9rZW5faGVyZSIKICAgIGlzRGVmYXVsdDogdHJ1ZQpzZXR0aW5nczoKICBkZWJ1ZzogZmFsc2UKICBsb2dMZXZlbDogImluZm8i
```

## Terraform Infrastructure

```hcl
# terraform/shopify-cli-infrastructure.tf
resource "kubernetes_namespace" "shopify_cli" {
  metadata {
    name = "shopify-cli"
    labels = {
      purpose = "automation"
    }
  }
}

resource "kubernetes_secret" "shopify_config" {
  metadata {
    name      = "shopify-cli-config"
    namespace = kubernetes_namespace.shopify_cli.metadata[0].name
  }

  data = {
    "config.yaml" = base64encode(templatefile("${path.module}/config.yaml.tpl", {
      staging_shop_url      = var.staging_shop_url
      staging_access_token  = var.staging_access_token
      production_shop_url   = var.production_shop_url
      production_access_token = var.production_access_token
    }))
  }

  type = "Opaque"
}

resource "kubernetes_persistent_volume_claim" "shopify_data" {
  metadata {
    name      = "shopify-cli-data"
    namespace = kubernetes_namespace.shopify_cli.metadata[0].name
  }

  spec {
    access_modes = ["ReadWriteOnce"]
    resources {
      requests = {
        storage = "10Gi"
      }
    }
    storage_class_name = "gp2"
  }
}

resource "kubernetes_deployment" "shopify_cli" {
  metadata {
    name      = "shopify-cli-automation"
    namespace = kubernetes_namespace.shopify_cli.metadata[0].name
    labels = {
      app = "shopify-cli"
    }
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        app = "shopify-cli"
      }
    }

    template {
      metadata {
        labels = {
          app = "shopify-cli"
        }
      }

      spec {
        container {
          name  = "shopify-cli"
          image = "${var.docker_registry}/shopify-cli:${var.image_tag}"
          
          env {
            name  = "NODE_ENV"
            value = "production"
          }
          
          env {
            name  = "SHOPIFY_CLI_DEBUG"
            value = "false"
          }

          volume_mount {
            name       = "config"
            mount_path = "/home/shopify-cli/.shopify-cli"
            read_only  = true
          }

          volume_mount {
            name       = "data"
            mount_path = "/app/data"
          }

          resources {
            limits = {
              cpu    = "500m"
              memory = "512Mi"
            }
            requests = {
              cpu    = "250m"
              memory = "256Mi"
            }
          }

          liveness_probe {
            exec {
              command = ["/app/bin/run.js", "config"]
            }
            initial_delay_seconds = 30
            period_seconds        = 60
          }

          readiness_probe {
            exec {
              command = ["/app/bin/run.js", "config", "--test-connection"]
            }
            initial_delay_seconds = 10
            period_seconds        = 30
          }
        }

        volume {
          name = "config"
          secret {
            secret_name = kubernetes_secret.shopify_config.metadata[0].name
          }
        }

        volume {
          name = "data"
          persistent_volume_claim {
            claim_name = kubernetes_persistent_volume_claim.shopify_data.metadata[0].name
          }
        }
      }
    }
  }
}
```

These automation examples provide comprehensive CI/CD integration patterns that can be adapted for various deployment environments and requirements.
