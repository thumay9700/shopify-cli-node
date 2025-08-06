# README Update - Add to existing README.md

Add this section to the existing README.md file to ensure all users (human and AI) are aware of the required documentation:

## 📋 Important: Required Reading for Contributors

**BEFORE contributing to this project, ALL contributors (human and AI) must read:**

### 🎯 **[Product Requirements Document (PRD)](prd.md)**
- Complete project vision, goals, and technical specifications
- Feature roadmap and success criteria
- Architecture and performance requirements
- **Required reading for understanding project scope**

### 🤖 **[Claude AI Instructions](claude.md)** 
- Mandatory rules for AI agents (Claude, Cursor, GitHub Copilot, etc.)
- Safety guidelines and best practices
- Agent-specific workflow requirements
- **MUST be followed by all AI contributors**

### 📚 **[Contributing Guidelines](.github/CONTRIBUTING.md)**
- Detailed contribution process for humans and AI
- Code quality standards and testing requirements
- Pull request guidelines and review process

### 🔧 **[Agent Integration Guide](docs/AGENT_INTEGRATION.md)**
- Technical documentation for AI-friendly features
- SDK usage and structured response formats
- Examples and best practices for agent integration

## 🚨 For AI Coding Agents

If you are an AI agent (Claude, Cursor, GitHub Copilot, etc.), you **MUST**:

1. ✅ **Read `claude.md`** - Contains mandatory safety and workflow rules
2. ✅ **Read `prd.md`** - Understand the project requirements and goals  
3. ✅ **Use only the `agent` command** - `./bin/run.js agent --action <action> --format agent-json`
4. ✅ **Always use `--dry-run`** for destructive operations first
5. ✅ **Follow structured response format** - All outputs must use `agent-json` format

### Quick Agent Command Reference
```bash
# Health check (run this first)
./bin/run.js agent --action health-check --format agent-json

# Store information
./bin/run.js agent --action get-store-info --format agent-json

# List products  
./bin/run.js agent --action list-products --limit 20 --format agent-json

# Bulk operations (always preview first)
./bin/run.js agent --action bulk-update-products --file products.json --dry-run --format agent-json
```

## ⚡ Quick Start for AI Agents

```bash
# 1. Health check
./bin/run.js agent --action health-check --format agent-json

# 2. Get store info
./bin/run.js agent --action get-store-info --format agent-json  

# 3. Analyze store
./bin/run.js agent --action analyze-store --format agent-json
```

---

**⚠️ Important:** Failure to follow the documentation in `claude.md` and `prd.md` may result in rejected contributions or unsafe operations.
