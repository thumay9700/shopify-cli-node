---
name: Bug Report
about: Create a report to help us improve the Shopify CLI Management Tool
title: '[BUG] Brief description of the issue'
labels: ['bug', 'needs-triage']
assignees: ''
---

## 🐛 Bug Report

### Pre-submission Checklist
- [ ] I have read the [PRD (prd.md)](../../prd.md) and confirmed this is a bug
- [ ] I have searched existing issues to make sure this isn't a duplicate
- [ ] I have tested with the latest version of the CLI
- [ ] I have tried the suggested troubleshooting steps in the documentation

### Description
A clear and concise description of what the bug is.

### Expected Behavior
What you expected to happen.

### Actual Behavior
What actually happened.

### Steps to Reproduce
1. Go to '...'
2. Run command '...'
3. See error

### Command Used
```bash
# Paste the exact command that caused the issue
./bin/run.js agent --action [action] --format agent-json
```

### Error Output
```
# Paste the complete error output here
```

### Environment Information
- **OS**: [e.g. macOS 14.0, Ubuntu 22.04, Windows 11]
- **Node.js Version**: [e.g. 18.17.0]
- **CLI Version**: [e.g. 1.0.0]
- **Shell**: [e.g. zsh, bash, PowerShell]

### Shopify Store Information
- **Store Type**: [Development/Production/Partner]
- **Shopify Plan**: [Basic/Shopify/Advanced/Plus]
- **API Permissions**: [List the scopes your app has]

### Agent Integration (if applicable)
- [ ] This issue affects the agent interface (`agent` command)
- [ ] This issue affects the SDK (`ShopifyAgentSDK`)
- **Agent Type**: [Claude/Cursor/Copilot/Other]
- **Response Format Used**: [agent-json/json/table]

### Configuration
```yaml
# If relevant, paste your configuration (REMOVE ANY SECRETS)
# ~/.shopify-cli/config.yaml (sanitized)
```

### Additional Context
Add any other context about the problem here.

### Possible Solution
If you have ideas on how to fix this, please share them.

### Related Issues
Link any related issues here.
