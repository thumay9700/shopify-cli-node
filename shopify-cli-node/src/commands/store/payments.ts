import { Command, Flags } from '@oclif/core';
import { APIClient } from '../../lib/api/client.js';
import { createTable } from '../../lib/formatting.js';

export default class StorePayments extends Command {
  static description = 'View and manage payment information for your Shopify store';

  static examples = [
    '<%= config.bin %> <%= command.id %> --list-gateways',
    '<%= config.bin %> <%= command.id %> --shop-info',
    '<%= config.bin %> <%= command.id %> --transaction-fees',
    '<%= config.bin %> <%= command.id %> --supported-countries',
  ];

  static flags = {
    account: Flags.string({
      char: 'a',
      description: 'Account to use for the request',
    }),
    'list-gateways': Flags.boolean({
      description: 'List all available payment gateways',
      exclusive: ['shop-info', 'transaction-fees', 'supported-countries', 'shopify-payments-status'],
    }),
    'shop-info': Flags.boolean({
      description: 'Show payment-related shop information',
      exclusive: ['list-gateways', 'transaction-fees', 'supported-countries', 'shopify-payments-status'],
    }),
    'transaction-fees': Flags.boolean({
      description: 'Display current transaction fee structure',
      exclusive: ['list-gateways', 'shop-info', 'supported-countries', 'shopify-payments-status'],
    }),
    'supported-countries': Flags.boolean({
      description: 'List countries supported by Shopify Payments',
      exclusive: ['list-gateways', 'shop-info', 'transaction-fees', 'shopify-payments-status'],
    }),
    'shopify-payments-status': Flags.boolean({
      description: 'Check Shopify Payments setup status',
      exclusive: ['list-gateways', 'shop-info', 'transaction-fees', 'supported-countries'],
    }),
    format: Flags.string({
      description: 'Output format',
      options: ['json', 'table'],
      default: 'table',
    }),
    'use-proxy': Flags.boolean({
      description: 'Use proxy for requests',
      default: false,
    }),
    geo: Flags.string({
      description: 'Geographic region for proxy',
      dependsOn: ['use-proxy'],
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(StorePayments);

    if (!flags['list-gateways'] && 
        !flags['shop-info'] && 
        !flags['transaction-fees'] && 
        !flags['supported-countries'] && 
        !flags['shopify-payments-status']) {
      this.error('Please specify an action flag. Use --help to see available options.');
    }

    try {
      const apiClient = new APIClient(flags.account);

      if (flags['use-proxy']) {
        apiClient.setProxyOptions({
          enabled: true,
          geo: flags.geo
        });
      }

      if (flags['list-gateways']) {
        await this.listPaymentGateways(apiClient, flags.format);
      }

      if (flags['shop-info']) {
        await this.showShopPaymentInfo(apiClient, flags.format);
      }

      if (flags['transaction-fees']) {
        await this.showTransactionFees(apiClient, flags.format);
      }

      if (flags['supported-countries']) {
        await this.showSupportedCountries(apiClient, flags.format);
      }

      if (flags['shopify-payments-status']) {
        await this.checkShopifyPaymentsStatus(apiClient, flags.format);
      }

    } catch (error: any) {
      this.error(`Error: ${error.message}`);
    }
  }

  private async listPaymentGateways(apiClient: APIClient, format: string): Promise<void> {
    this.log('🔍 Fetching available payment gateways...');
    
    try {
      // Get payment gateways from shop API
      const response = await apiClient.request('/admin/api/2023-10/payment_gateways.json');
      const gateways = response.data.payment_gateways || [];

      if (format === 'json') {
        this.log(JSON.stringify({ payment_gateways: gateways }, null, 2));
        return;
      }

      // Table format
      this.log('\n💳 Payment Gateways:');
      this.log('─'.repeat(80));

      if (gateways.length === 0) {
        this.log('No payment gateways found');
        return;
      }

      const table = createTable({
        head: ['Name', 'Type', 'Enabled', 'Supported Cards'],
        colWidths: [25, 20, 10, 25]
      });

      for (const gateway of gateways) {
        const supportedCards = gateway.supported_card_brands?.join(', ') || 'N/A';
        table.push([
          gateway.name || 'N/A',
          gateway.type || 'N/A',
          gateway.enabled ? '✅' : '❌',
          supportedCards
        ]);
      }

      this.log(table.toString());

      // Show gateway-specific information
      for (const gateway of gateways.filter(g => g.enabled)) {
        this.log(`\n📋 ${gateway.name} Details:`);
        this.log(`  Service Name: ${gateway.service_name || 'N/A'}`);
        this.log(`  Processing Method: ${gateway.processing_method || 'N/A'}`);
        if (gateway.credit_card_types) {
          this.log(`  Accepted Cards: ${gateway.credit_card_types.join(', ')}`);
        }
        if (gateway.currencies) {
          this.log(`  Supported Currencies: ${gateway.currencies.join(', ')}`);
        }
      }

    } catch (error: any) {
      if (error.response?.status === 402) {
        this.log('⚠️  Payment gateway information requires a paid Shopify plan');
      } else {
        throw error;
      }
    }
  }

  private async showShopPaymentInfo(apiClient: APIClient, format: string): Promise<void> {
    this.log('🏪 Fetching shop payment information...');

    try {
      const shopResponse = await apiClient.request('/admin/api/2023-10/shop.json');
      const shop = shopResponse.data.shop;

      if (format === 'json') {
        const paymentInfo = {
          currency: shop.currency,
          money_format: shop.money_format,
          money_with_currency_format: shop.money_with_currency_format,
          weight_unit: shop.weight_unit,
          taxes_included: shop.taxes_included,
          tax_shipping: shop.tax_shipping,
          county_taxes: shop.county_taxes,
          plan_name: shop.plan_name,
          plan_display_name: shop.plan_display_name,
          checkout_api_supported: shop.checkout_api_supported,
          multi_location_enabled: shop.multi_location_enabled,
          setup_required: shop.setup_required,
          pre_launch_enabled: shop.pre_launch_enabled
        };
        this.log(JSON.stringify(paymentInfo, null, 2));
        return;
      }

      // Table format
      this.log('\n💰 Shop Payment Configuration:');
      this.log('─'.repeat(50));
      this.log(`Currency: ${shop.currency}`);
      this.log(`Money Format: ${shop.money_format}`);
      this.log(`Money with Currency Format: ${shop.money_with_currency_format}`);
      this.log(`Plan: ${shop.plan_display_name} (${shop.plan_name})`);
      this.log(`Taxes Included in Prices: ${shop.taxes_included ? 'Yes' : 'No'}`);
      this.log(`Tax Shipping: ${shop.tax_shipping ? 'Yes' : 'No'}`);
      this.log(`County Taxes: ${shop.county_taxes ? 'Yes' : 'No'}`);
      this.log(`Checkout API Supported: ${shop.checkout_api_supported ? 'Yes' : 'No'}`);
      this.log(`Multi-location Enabled: ${shop.multi_location_enabled ? 'Yes' : 'No'}`);
      this.log(`Setup Required: ${shop.setup_required ? 'Yes' : 'No'}`);

      if (shop.setup_required) {
        this.log('\n⚠️  Store setup is not complete. Some payment features may be limited.');
      }

    } catch (error: any) {
      throw error;
    }
  }

  private async showTransactionFees(apiClient: APIClient, format: string): Promise<void> {
    this.log('💲 Fetching transaction fee information...');

    try {
      // Get shop info for plan details
      const shopResponse = await apiClient.request('/admin/api/2023-10/shop.json');
      const shop = shopResponse.data.shop;

      const feeInfo = this.getTransactionFeesByPlan(shop.plan_name, shop.currency);

      if (format === 'json') {
        this.log(JSON.stringify(feeInfo, null, 2));
        return;
      }

      // Table format
      this.log('\n💳 Transaction Fee Structure:');
      this.log('─'.repeat(60));
      this.log(`Plan: ${shop.plan_display_name}`);
      this.log(`Currency: ${shop.currency}`);
      
      if (feeInfo.shopify_payments) {
        this.log(`\n🟢 Shopify Payments Fees:`);
        for (const [method, fee] of Object.entries(feeInfo.shopify_payments)) {
          this.log(`  ${method}: ${fee}`);
        }
      }

      if (feeInfo.external_payments) {
        this.log(`\n🟡 External Payment Gateway Fees:`);
        for (const [method, fee] of Object.entries(feeInfo.external_payments)) {
          this.log(`  ${method}: ${fee}`);
        }
      }

      this.log(`\n📝 Notes:`);
      this.log(`  • Fees may vary by region and payment method`);
      this.log(`  • Rates shown are standard rates and may not reflect your specific agreement`);
      this.log(`  • Contact Shopify support for exact fee information`);

    } catch (error: any) {
      throw error;
    }
  }

  private async showSupportedCountries(apiClient: APIClient, format: string): Promise<void> {
    this.log('🌍 Fetching Shopify Payments supported countries...');

    // Static data - this information is relatively stable
    const supportedCountries = {
      shopify_payments_countries: [
        { code: 'US', name: 'United States', currency: 'USD' },
        { code: 'CA', name: 'Canada', currency: 'CAD' },
        { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
        { code: 'AU', name: 'Australia', currency: 'AUD' },
        { code: 'NZ', name: 'New Zealand', currency: 'NZD' },
        { code: 'IE', name: 'Ireland', currency: 'EUR' },
        { code: 'FR', name: 'France', currency: 'EUR' },
        { code: 'DE', name: 'Germany', currency: 'EUR' },
        { code: 'ES', name: 'Spain', currency: 'EUR' },
        { code: 'IT', name: 'Italy', currency: 'EUR' },
        { code: 'NL', name: 'Netherlands', currency: 'EUR' },
        { code: 'BE', name: 'Belgium', currency: 'EUR' },
        { code: 'AT', name: 'Austria', currency: 'EUR' },
        { code: 'DK', name: 'Denmark', currency: 'DKK' },
        { code: 'FI', name: 'Finland', currency: 'EUR' },
        { code: 'NO', name: 'Norway', currency: 'NOK' },
        { code: 'SE', name: 'Sweden', currency: 'SEK' },
        { code: 'SG', name: 'Singapore', currency: 'SGD' },
        { code: 'HK', name: 'Hong Kong', currency: 'HKD' },
        { code: 'JP', name: 'Japan', currency: 'JPY' }
      ]
    };

    if (format === 'json') {
      this.log(JSON.stringify(supportedCountries, null, 2));
      return;
    }

    // Table format
    this.log('\n🌍 Shopify Payments Supported Countries:');
    this.log('─'.repeat(50));

    const table = createTable({
      head: ['Country', 'Code', 'Currency'],
      colWidths: [20, 8, 12]
    });

    for (const country of supportedCountries.shopify_payments_countries) {
      table.push([country.name, country.code, country.currency]);
    }

    this.log(table.toString());

    this.log(`\n📝 Notes:`);
    this.log(`  • Shopify Payments availability may change`);
    this.log(`  • Some features may be limited in certain regions`);
    this.log(`  • Check the Shopify admin for current availability in your region`);
  }

  private async checkShopifyPaymentsStatus(apiClient: APIClient, format: string): Promise<void> {
    this.log('🔍 Checking Shopify Payments status...');

    try {
      // Get shop info and payment gateway info
      const [shopResponse, gatewayResponse] = await Promise.all([
        apiClient.request('/admin/api/2023-10/shop.json'),
        apiClient.request('/admin/api/2023-10/payment_gateways.json').catch(() => ({ data: { payment_gateways: [] } }))
      ]);

      const shop = shopResponse.data.shop;
      const gateways = gatewayResponse.data.payment_gateways || [];

      const shopifyPaymentsGateway = gateways.find(g => 
        g.name?.toLowerCase().includes('shopify') || 
        g.service_name?.toLowerCase().includes('shopify')
      );

      const status = {
        shop_country: shop.country_code,
        shop_currency: shop.currency,
        shopify_payments_available: this.isShopifyPaymentsAvailable(shop.country_code),
        shopify_payments_enabled: !!shopifyPaymentsGateway?.enabled,
        gateway_info: shopifyPaymentsGateway || null,
        setup_required: shop.setup_required,
        checkout_api_supported: shop.checkout_api_supported
      };

      if (format === 'json') {
        this.log(JSON.stringify(status, null, 2));
        return;
      }

      // Table format
      this.log('\n💳 Shopify Payments Status:');
      this.log('─'.repeat(50));
      this.log(`Shop Country: ${shop.country_code} (${shop.country_name || 'N/A'})`);
      this.log(`Shop Currency: ${shop.currency}`);
      this.log(`Shopify Payments Available: ${status.shopify_payments_available ? '✅ Yes' : '❌ No'}`);
      this.log(`Shopify Payments Enabled: ${status.shopify_payments_enabled ? '✅ Yes' : '❌ No'}`);
      this.log(`Setup Required: ${shop.setup_required ? '⚠️  Yes' : '✅ No'}`);
      this.log(`Checkout API Supported: ${shop.checkout_api_supported ? '✅ Yes' : '❌ No'}`);

      if (status.shopify_payments_available && !status.shopify_payments_enabled) {
        this.log('\n📋 Setup Instructions:');
        this.log('  1. Go to your Shopify admin');
        this.log('  2. Navigate to Settings > Payments');
        this.log('  3. Find Shopify Payments and click "Complete account setup"');
        this.log('  4. Follow the verification process');
      } else if (!status.shopify_payments_available) {
        this.log('\n⚠️  Shopify Payments is not available in your region.');
        this.log('   Consider using alternative payment gateways.');
      }

      if (shopifyPaymentsGateway && status.shopify_payments_enabled) {
        this.log('\n💳 Shopify Payments Gateway Details:');
        this.log(`  Service Name: ${shopifyPaymentsGateway.service_name || 'N/A'}`);
        if (shopifyPaymentsGateway.supported_card_brands) {
          this.log(`  Supported Cards: ${shopifyPaymentsGateway.supported_card_brands.join(', ')}`);
        }
      }

    } catch (error: any) {
      throw error;
    }
  }

  private getTransactionFeesByPlan(planName: string, currency: string): any {
    // Simplified fee structure - actual fees may vary
    const baseFees = {
      basic: {
        shopify_payments: {
          'Online Credit Card': '2.9% + 30¢',
          'In-person Credit Card': '2.7%'
        },
        external_payments: {
          'PayPal': '2.0%',
          'Other gateways': '2.0%'
        }
      },
      shopify: {
        shopify_payments: {
          'Online Credit Card': '2.6% + 30¢',
          'In-person Credit Card': '2.5%'
        },
        external_payments: {
          'PayPal': '1.0%',
          'Other gateways': '1.0%'
        }
      },
      advanced: {
        shopify_payments: {
          'Online Credit Card': '2.4% + 30¢',
          'In-person Credit Card': '2.4%'
        },
        external_payments: {
          'PayPal': '0.5%',
          'Other gateways': '0.5%'
        }
      }
    };

    return baseFees[planName as keyof typeof baseFees] || baseFees.basic;
  }

  private isShopifyPaymentsAvailable(countryCode: string): boolean {
    const supportedCountries = [
      'US', 'CA', 'GB', 'AU', 'NZ', 'IE', 'FR', 'DE', 'ES', 'IT', 
      'NL', 'BE', 'AT', 'DK', 'FI', 'NO', 'SE', 'SG', 'HK', 'JP'
    ];
    return supportedCountries.includes(countryCode);
  }
}
