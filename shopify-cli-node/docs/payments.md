# Payment Management with Shopify CLI

This document outlines payment-related functionality available through the Shopify CLI and explains what's possible versus what requires the Shopify admin interface.

## Overview

The Shopify CLI provides **read-only access** to payment information and configuration data. For security and compliance reasons, **actual payment setup and configuration must be done through the Shopify admin interface**.

## What's Available in CLI

### ✅ Information and Status
- View configured payment gateways
- Check Shopify Payments availability and status  
- Display transaction fee structures
- List supported countries/regions
- Show payment-related shop configuration
- View payment method information from orders

### ❌ Not Available (Security/Compliance Restricted)
- Configure Shopify Payments credentials
- Add/remove payment gateways
- Modify payment gateway settings
- Update payment provider credentials
- Change payment method priorities

## Commands

### Check Payment Gateway Status
```bash
# List all configured payment gateways
shopify store payments --list-gateways

# Check Shopify Payments setup status
shopify store payments --shopify-payments-status

# View payment-related shop information
shopify store payments --shop-info
```

### View Fee Information
```bash
# Display current transaction fee structure
shopify store payments --transaction-fees

# List supported countries for Shopify Payments
shopify store payments --supported-countries
```

### Output Formats
```bash
# Table format (default)
shopify store payments --list-gateways

# JSON format for scripting
shopify store payments --list-gateways --format json
```

## Examples

### 1. Check Gateway Configuration
```bash
$ shopify store payments --list-gateways

🔍 Fetching available payment gateways...

💳 Payment Gateways:
────────────────────────────────────────────────────────────────────────────────
Name                     Type                Enabled    Supported Cards          
────────────────────────────────────────────────────────────────────────────────
Shopify Payments        credit_card         ✅         visa, mastercard, amex   
PayPal Express          wallet              ✅         N/A                     
Manual Payment          manual              ❌         N/A                     

📋 Shopify Payments Details:
  Service Name: shopify_payments
  Processing Method: direct
  Accepted Cards: visa, mastercard, american_express, discover
  Supported Currencies: USD, CAD, GBP, EUR, AUD
```

### 2. Check Shopify Payments Status
```bash
$ shopify store payments --shopify-payments-status

🔍 Checking Shopify Payments status...

💳 Shopify Payments Status:
──────────────────────────────────────────────────────
Shop Country: US (United States)
Shop Currency: USD
Shopify Payments Available: ✅ Yes
Shopify Payments Enabled: ✅ Yes
Setup Required: ✅ No
Checkout API Supported: ✅ Yes

💳 Shopify Payments Gateway Details:
  Service Name: shopify_payments
  Supported Cards: visa, mastercard, american_express, discover
```

### 3. View Transaction Fees
```bash
$ shopify store payments --transaction-fees

💲 Fetching transaction fee information...

💳 Transaction Fee Structure:
────────────────────────────────────────────────────────────
Plan: Shopify
Currency: USD

🟢 Shopify Payments Fees:
  Online Credit Card: 2.6% + 30¢
  In-person Credit Card: 2.5%

🟡 External Payment Gateway Fees:
  PayPal: 1.0%
  Other gateways: 1.0%

📝 Notes:
  • Fees may vary by region and payment method
  • Rates shown are standard rates and may not reflect your specific agreement
  • Contact Shopify support for exact fee information
```

### 4. Check Country Support
```bash
$ shopify store payments --supported-countries

🌍 Fetching Shopify Payments supported countries...

🌍 Shopify Payments Supported Countries:
──────────────────────────────────────────────────
Country              Code     Currency    
──────────────────────────────────────────────────
United States        US       USD         
Canada              CA       CAD         
United Kingdom      GB       GBP         
Australia           AU       AUD         
Germany             DE       EUR         
France              FR       EUR         
...

📝 Notes:
  • Shopify Payments availability may change
  • Some features may be limited in certain regions
  • Check the Shopify admin for current availability in your region
```

## Setting Up Shopify Payments

Since payment setup cannot be done via CLI, here's the process:

### 1. Through Shopify Admin
1. **Log into your Shopify admin**
2. **Go to Settings → Payments**
3. **Find Shopify Payments section**
4. **Click "Complete account setup"**
5. **Follow the verification process:**
   - Provide business information
   - Verify bank account details
   - Submit identity verification documents
   - Wait for approval (usually 1-3 business days)

### 2. CLI Verification
After setup, verify using CLI:
```bash
# Check if setup was successful
shopify store payments --shopify-payments-status

# Verify gateway is enabled
shopify store payments --list-gateways
```

## Alternative Payment Gateways

If Shopify Payments isn't available in your region:

### Popular Alternatives
- **PayPal** - Available worldwide
- **Stripe** - Available in 46 countries
- **Authorize.Net** - US, Canada, UK, Europe
- **2Checkout** - Global coverage
- **Square** - US, Canada, UK, Australia

### Setup Process
1. **Create account with payment provider**
2. **Get API credentials from provider**
3. **Add gateway in Shopify admin:**
   - Settings → Payments
   - Find your provider in "Third-party providers"
   - Click "Choose provider"
   - Enter your credentials
4. **Test the integration**
5. **Verify with CLI:**
   ```bash
   shopify store payments --list-gateways
   ```

## Payment-Related Order Information

While you can't configure payments via CLI, you can access payment data from orders:

```bash
# View order with payment details
shopify order view 1234567890 --format json

# Process refunds (payment gateway dependent)
shopify order cancel 1234567890 --refund --amount 50.00
```

## Troubleshooting

### Common Issues

#### 1. "Payment gateway information requires a paid Shopify plan"
**Solution:** Upgrade your Shopify plan to access advanced payment features.

#### 2. "Shopify Payments not available in your region"
**Solution:** Use alternative payment gateways like PayPal or Stripe.

#### 3. "Setup Required: Yes" in status check
**Solution:** Complete store setup in Shopify admin (Settings → General).

#### 4. Gateway showing as disabled
**Solution:** 
- Check gateway configuration in Shopify admin
- Verify API credentials are correct
- Contact payment provider support

### CLI Debug Commands
```bash
# Test API connectivity
shopify config --test-connection

# View detailed shop information
shopify store settings view --format json

# Check API permissions
shopify auth info
```

## Security Considerations

### Why Payment Setup Requires Admin Interface

1. **PCI Compliance**: Payment credentials must be handled securely
2. **Identity Verification**: Payment providers require KYC (Know Your Customer) verification
3. **Legal Agreements**: Payment processing requires accepting terms of service
4. **Regulatory Requirements**: Different regions have specific compliance requirements

### Best Practices

- **Never store payment credentials** in scripts or configuration files
- **Use environment variables** for any payment-related API keys
- **Regularly review** payment gateway configurations
- **Monitor transaction logs** for suspicious activity
- **Keep payment provider contacts** for support issues

## Integration with Automation

### CI/CD Pipeline Integration
```yaml
# GitHub Actions example
- name: Check Payment Status
  run: |
    # Verify payment gateways are properly configured
    shopify store payments --list-gateways --format json > payment-status.json
    
    # Check for critical payment issues
    if ! shopify store payments --shopify-payments-status | grep "Enabled: ✅"; then
      echo "❌ Payment gateway configuration issue detected"
      exit 1
    fi
```

### Monitoring Scripts
```bash
#!/bin/bash
# payment-health-check.sh

# Check payment gateway status
if shopify store payments --list-gateways --format json | jq '.payment_gateways | length' | grep -q "^0$"; then
  echo "❌ No payment gateways configured!"
  # Send alert to monitoring system
fi

# Check Shopify Payments status
if ! shopify store payments --shopify-payments-status --format json | jq -r '.shopify_payments_enabled' | grep -q "true"; then
  echo "⚠️ Shopify Payments not enabled"
fi
```

## API Reference

### Available Endpoints (Read-Only)
- `GET /admin/api/2023-10/payment_gateways.json` - List payment gateways
- `GET /admin/api/2023-10/shop.json` - Shop payment configuration
- `GET /admin/api/2023-10/orders/{id}/transactions.json` - Order transactions

### Not Available via API
- Payment gateway configuration
- Shopify Payments setup
- Payment method management
- Gateway credential updates

## Support and Resources

### Getting Help
- **Shopify Help Center**: payment setup guides
- **Payment Provider Support**: for gateway-specific issues  
- **Shopify Community**: for best practice discussions
- **CLI Documentation**: for command reference

### Useful Links
- [Shopify Payments Setup Guide](https://help.shopify.com/en/manual/payments/shopify-payments)
- [Payment Gateway Comparison](https://help.shopify.com/en/manual/payments/payment-gateways)
- [PCI Compliance Information](https://help.shopify.com/en/manual/your-account/security/pci-compliance)

---

**Remember**: While the CLI provides excellent visibility into payment configurations, actual payment setup should always be done through the secure Shopify admin interface to ensure compliance and security.
