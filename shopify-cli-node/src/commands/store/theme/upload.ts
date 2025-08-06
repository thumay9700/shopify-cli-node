import { Args, Command, Flags } from '@oclif/core';
import * as fs from 'fs-extra';
import * as path from 'node:path';

import { loadConfig, ShopifyAccount } from '../../../config';
import { ShopifyApiFactory } from '../../../services';

export default class ThemeUpload extends Command {
  static override args = {
    source: Args.string({
      description: 'Path to theme ZIP file or theme directory',
      required: true,
    }),
  };
static override description = 'Upload a theme to store';
static override examples = [
    '<%= config.bin %> <%= command.id %> ./my-theme.zip',
    '<%= config.bin %> <%= command.id %> ./theme-directory --name "My Custom Theme"',
    '<%= config.bin %> <%= command.id %> ./theme.zip --account mystore --role development',
    '<%= config.bin %> <%= command.id %> ./theme.zip --name "New Theme" --src-url "https://github.com/user/theme"',
  ];
static override flags = {
    account: Flags.string({
      char: 'a',
      description: 'Shopify account to use (defaults to default account)',
    }),
    activate: Flags.boolean({
      default: false,
      description: 'Activate the theme after uploading',
    }),
    format: Flags.string({
      char: 'f',
      default: 'table',
      description: 'Output format',
      options: ['json', 'table'],
    }),
    help: Flags.help({ char: 'h' }),
    name: Flags.string({
      char: 'n',
      description: 'Name for the uploaded theme',
    }),
    role: Flags.string({
      char: 'r',
      default: 'unpublished',
      description: 'Role for the uploaded theme',
      options: ['unpublished', 'demo', 'development'],
    }),
    'src-url': Flags.string({
      description: 'Source URL for the theme (e.g., GitHub repository)',
    }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(ThemeUpload);

    try {
      // Load configuration
      const config = await loadConfig();

      // Get account to use
      let account: ShopifyAccount;
      if (flags.account) {
        const foundAccount = config.accounts.find((acc: ShopifyAccount) => acc.name === flags.account);
        if (!foundAccount) {
          this.error(`Account '${flags.account}' not found.`);
        }

        account = foundAccount;
      } else {
        const defaultAccount = config.accounts.find((acc: ShopifyAccount) => acc.isDefault) || config.accounts[0];
        if (!defaultAccount) {
          this.error('No Shopify accounts configured.');
        }

        account = defaultAccount;
      }

      // Validate source path
      const sourcePath = path.resolve(args.source);
      if (!(await fs.pathExists(sourcePath))) {
        this.error(`Source path does not exist: ${sourcePath}`);
      }

      const isZipFile = path.extname(sourcePath).toLowerCase() === '.zip';
      const isDirectory = (await fs.stat(sourcePath)).isDirectory();

      if (!isZipFile && !isDirectory) {
        this.error('Source must be a ZIP file or directory');
      }

      // Create API client
      const apiClient = ShopifyApiFactory.create(account);

      // Prepare theme data
      const themeName = flags.name || (isZipFile 
        ? path.basename(sourcePath, '.zip')
        : path.basename(sourcePath));

      this.log(`🎨 Preparing to upload theme "${themeName}" to ${account.name}...`);

      const themeData: any = {
        name: themeName,
        role: flags.role,
      };

      if (flags['src-url']) {
        themeData.src = flags['src-url'];
      }

      // Handle ZIP file upload
      if (isZipFile) {
        // Read and encode the ZIP file
        const zipBuffer = await fs.readFile(sourcePath);
        const base64Content = zipBuffer.toString('base64');
        
        themeData.src = `data:application/zip;base64,${base64Content}`;
        
        this.log(`📦 Uploading ZIP file (${(zipBuffer.length / 1024 / 1024).toFixed(2)} MB)...`);
      } else {
        // For directory upload, we need to create a ZIP file
        this.error('Directory upload not yet implemented. Please create a ZIP file of your theme first.');
      }

      // Upload theme
      const startTime = Date.now();
      const response = await apiClient.themes.create(themeData);
      const duration = Date.now() - startTime;

      if (!response.data || !response.data.theme) {
        this.error('Failed to upload theme');
      }

      const uploadedTheme = response.data.theme;

      // Display results
      if (flags.format === 'json') {
        this.log(JSON.stringify(uploadedTheme, null, 2));
        return;
      }

      // Table format (default)
      this.log(`\n✅ Theme uploaded successfully (${duration}ms)`);
      this.log('\n🎨 Theme Details:');
      this.log('─'.repeat(40));
      
      this.log(`Name: ${uploadedTheme.name}`);
      this.log(`ID: ${uploadedTheme.id}`);
      this.log(`Role: ${uploadedTheme.role}`);
      this.log(`Previewable: ${uploadedTheme.previewable ? '✅' : '❌'}`);
      this.log(`Processing: ${uploadedTheme.processing ? '⏳ Yes' : '✅ Complete'}`);
      this.log(`Created: ${new Date(uploadedTheme.created_at).toLocaleString()}`);

      if (uploadedTheme.theme_store_id) {
        this.log(`Theme Store ID: ${uploadedTheme.theme_store_id}`);
      }

      // Activate theme if requested
      if (flags.activate) {
        this.log('\n🚀 Activating theme...');
        
        try {
          const activateResponse = await apiClient.themes.update(uploadedTheme.id, {
            role: 'main'
          });
          
          if (activateResponse.data?.theme?.role === 'main') {
            this.log('✅ Theme activated successfully and is now live!');
          } else {
            this.log('⚠️  Theme upload successful but activation may have failed.');
          }
        } catch (activateError: any) {
          this.log(`⚠️  Theme uploaded but activation failed: ${activateError.message}`);
        }
      } else {
        this.log('\n💡 To activate this theme, run:');
        this.log(`   shopify-cli store theme activate ${uploadedTheme.id}`);
      }

      // Show preview URL if available
      if (uploadedTheme.previewable && !uploadedTheme.processing) {
        const previewUrl = `https://${account.shopUrl}/?preview_theme_id=${uploadedTheme.id}`;
        this.log(`\n🔍 Preview URL: ${previewUrl}`);
      } else if (uploadedTheme.processing) {
        this.log('\n⏳ Theme is still processing. Preview will be available soon.');
      }

    } catch (error: any) {
      this.error(`Error: ${error.message}`);
    }
  }
}
