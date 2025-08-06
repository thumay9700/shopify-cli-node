# Claude AI Agent Instructions

This document provides specific instructions for the Claude AI model when working on the Shopify CLI Management Tool. Adherence to these guidelines is mandatory for all contributions.

## 📜 Core Principles

1.  **Safety First**: Prioritize safe operations. Never perform destructive actions without explicit confirmation (`--confirm` flag). Use `--dry-run` by default for all write operations.
2.  **Structured Output**: All outputs for agent use must be in the `agent-json` format. This is the default for the `agent` command.
3.  **Clarity and Detail**: Provide detailed explanations for your actions. Reference the PRD (`prd.md`) to ensure your work aligns with the project goals.
4.  **Modularity**: Keep functions and commands modular and well-documented. New features should be added as new actions to the `agent` command where possible.
5.  **Backward Compatibility**: Do not introduce breaking changes to existing commands without a clear migration path and documentation.

## 📋 Workflow for AI Agents

**Before you begin any task, you must follow these steps:**

1.  **Review the PRD**: Read `prd.md` to understand the project's requirements, scope, and technical specifications.
2.  **Consult this document**: Review these instructions to ensure your approach is compliant.
3.  **Check existing functionality**: Use the `agent --action health-check` and `scli --help` commands to understand the current state of the CLI.

### When Adding New Features

1.  **Update the PRD**: If your changes introduce new functionality, you must propose an update to `prd.md`.
2.  **Add a new agent action**: If applicable, add a new action to the `agent` command in `src/commands/agent/interface.ts`.
3.  **Update the Agent SDK**: Add a corresponding method to the `ShopifyAgentSDK` in `src/lib/agent-sdk.ts`.
4.  **Document the change**: Update `docs/AGENT_INTEGRATION.md` with the new action and its usage.
5.  **Write examples**: Add a new example to `examples/agent-examples.js`.

### When Fixing Bugs

1.  **Isolate the issue**: Use the `agent` command with `agent-json` format to reproduce the bug and analyze the output.
2.  **Write a test case**: Before fixing, add a test case that demonstrates the bug.
3.  **Fix the bug**: Correct the code.
4.  **Verify the fix**: Run the test case to ensure the bug is resolved.

## ⚙️ Available Commands for Agents

Always use the `agent` command for programmatic access. Human-readable commands are for manual use only.

```bash
# Recommended command for agents
./bin/run.js agent --action <action-name> --format agent-json [options]
```

### Key Actions

| Action | Description |
| :--- | :--- |
| `health-check` | Verify API connectivity and system health. **Run this first.** |
| `get-store-info` | Fetch basic store information. |
| `list-products` | List products with filters. |
| `get-product` | Get details for a single product. |
| `list-orders` | List orders with filters. |
| `get-order` | Get details for a single order. |
| `analyze-store` | Get a high-level analysis of the store. |
| `check-inventory` | Check for low-stock items. |
| `bulk-update-products` | Perform bulk updates. **Always use `--dry-run` first.** |

## 🔒 Security and Safety Rules

-   **No Hardcoded Secrets**: Never hardcode API keys, access tokens, or other secrets. Use the provided configuration system (`scli config`).
-   **Confirm Destructive Actions**: Any action that modifies or deletes data must have a `--confirm` flag, and you must ask for user confirmation before using it.
-   **Sanitize Inputs**: When adding new commands, ensure all user inputs are sanitized to prevent injection attacks.
-   **Respect Scopes**: Do not add functionality that requires API scopes beyond what is defined in `docs/CREDENTIAL_SETUP.md` without updating the documentation.

## 💡 Best Practices

-   **Use the SDK**: For complex operations, use the `ShopifyAgentSDK` which provides a higher-level interface and handles errors gracefully.
-   **Chain Commands Safely**: Use the `next_actions` and `suggestions` from the `agent-json` response to inform your next steps.
-   **Handle Errors**: Check the `success` field in the response. If `false`, read the `error` and `suggestions` fields to attempt recovery.
-   **Be Verbose**: In your pull requests and commit messages, clearly explain what you did and why, referencing this document and the PRD.

By following these instructions, you will ensure that your contributions are safe, effective, and align with the project's goals.
