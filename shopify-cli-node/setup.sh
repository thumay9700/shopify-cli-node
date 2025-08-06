#!/bin/bash
# Shopify CLI Management Tool Setup Script

set -e

echo "🛍️  Setting up Shopify CLI Management Tool..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
CLI_PATH="$SCRIPT_DIR"

echo -e "${BLUE}CLI Path: $CLI_PATH${NC}"

# 1. Install Node dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing Node.js dependencies...${NC}"
    npm install
fi

# 2. Build the CLI if needed
if [ ! -d "dist" ]; then
    echo -e "${YELLOW}🔨 Building CLI...${NC}"
    npm run build
fi

# 3. Make the CLI executable
chmod +x "$CLI_PATH/bin/run.js"

# 4. Create config directory
echo -e "${YELLOW}📁 Creating configuration directory...${NC}"
mkdir -p ~/.shopify-cli

# 5. Set up shell aliases (update path in the aliases file)
echo -e "${YELLOW}🔧 Setting up shell aliases...${NC}"
sed -i.bak "s|/Users/anthonyumeh/shopify-cli-node/shopify-cli-node|$CLI_PATH|g" ~/.shopify-cli-aliases

# 6. Check if aliases are already sourced in shell config
SHELL_CONFIG=""
if [ -f ~/.zshrc ]; then
    SHELL_CONFIG="$HOME/.zshrc"
elif [ -f ~/.bashrc ]; then
    SHELL_CONFIG="$HOME/.bashrc"
elif [ -f ~/.bash_profile ]; then
    SHELL_CONFIG="$HOME/.bash_profile"
fi

if [ -n "$SHELL_CONFIG" ]; then
    if ! grep -q "shopify-cli-aliases" "$SHELL_CONFIG"; then
        echo -e "${YELLOW}📝 Adding aliases to $SHELL_CONFIG...${NC}"
        echo "" >> "$SHELL_CONFIG"
        echo "# Shopify CLI Management Tool" >> "$SHELL_CONFIG"
        echo "source ~/.shopify-cli-aliases" >> "$SHELL_CONFIG"
    else
        echo -e "${GREEN}✅ Aliases already configured in $SHELL_CONFIG${NC}"
    fi
fi

# 7. Update Warp workflows with correct path
if [ -f ~/.warp/workflows/shopify-cli.yaml ]; then
    echo -e "${YELLOW}🔄 Updating Warp workflows...${NC}"
    sed -i.bak "s|/Users/anthonyumeh/shopify-cli-node/shopify-cli-node|$CLI_PATH|g" ~/.warp/workflows/shopify-cli.yaml
fi

# 8. Test the CLI
echo -e "${YELLOW}🧪 Testing CLI...${NC}"
if "$CLI_PATH/bin/run.js" --version > /dev/null 2>&1; then
    echo -e "${GREEN}✅ CLI is working correctly!${NC}"
else
    echo -e "${RED}❌ CLI test failed. Please check the installation.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Setup complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. 📖 Read the credential setup guide: $CLI_PATH/docs/CREDENTIAL_SETUP.md"
echo "2. 🔑 Set up your Shopify store credentials"
echo "3. 🔄 Restart your terminal or run: source ~/.shopify-cli-aliases"
echo "4. 🚀 Start using: shopify-help"
echo ""
echo -e "${YELLOW}Quick test commands:${NC}"
echo "  shopify-help           # Show all available commands"
echo "  scli --help           # CLI help"
echo "  scli config --help    # Configuration help"
echo ""
echo -e "${BLUE}Credential setup:${NC}"
echo "  1. Create a Private App in your Shopify admin"
echo "  2. Copy the access token"
echo "  3. Run: scli config --add-account --name production --shop-url your-store.myshopify.com --access-token shpat_xxx"
echo ""
echo -e "${GREEN}Happy Shopify managing! 🛍️${NC}"
