# Contributing to Shopify CLI Management Tool

Thank you for your interest in contributing to the Shopify CLI Management Tool! This document provides guidelines for both human and AI contributors.

## 📋 Before You Start

**IMPORTANT**: All contributors (human and AI) must review these documents before making any changes:

1. **📄 [Product Requirements Document (PRD)](../prd.md)** - Understand the project's goals, architecture, and requirements
2. **🤖 [Claude AI Instructions](../claude.md)** - Required reading for all AI agents working on this project
3. **📚 [Agent Integration Guide](../docs/AGENT_INTEGRATION.md)** - Technical documentation for agent-friendly features

### Quick Checklist
- [ ] I have read the PRD (`prd.md`) and understand the project goals
- [ ] If I'm an AI agent, I have reviewed the Claude instructions (`claude.md`)
- [ ] I understand the security and safety requirements
- [ ] I have tested my changes using the `agent --action health-check` command

## 🤖 For AI Agents

If you are an AI agent (Claude, Cursor, GitHub Copilot, etc.), you **MUST** follow these steps:

1. **Read `claude.md`** - This contains mandatory instructions for AI agents
2. **Check current state** - Run `./bin/run.js agent --action health-check --format agent-json` 
3. **Follow the workflow** - Use only the `agent` command for programmatic access
4. **Safety first** - Always use `--dry-run` for destructive operations
5. **Structured output** - Ensure all agent outputs use `agent-json` format

### AI Agent Command Reference
```bash
# Health check (run this first)
./bin/run.js agent --action health-check --format agent-json

# Get store information  
./bin/run.js agent --action get-store-info --format agent-json

# List products with filters
./bin/run.js agent --action list-products --limit 20 --status active --format agent-json

# Bulk operations (always test with dry-run first)
./bin/run.js agent --action bulk-update-products --file products.json --dry-run --format agent-json
```

## 👥 For Human Contributors

### Getting Started

1. **Fork the repository** and clone your fork
2. **Install dependencies**: `npm install`
3. **Build the project**: `npm run build`
4. **Run setup**: `./setup.sh`
5. **Test the CLI**: `./bin/run.js --help`

### Development Workflow

1. **Create a feature branch**: `git checkout -b feature/your-feature-name`
2. **Make your changes** following the coding standards below
3. **Test thoroughly** including unit tests and integration tests
4. **Update documentation** if you're adding new features
5. **Submit a pull request** with a clear description

### Coding Standards

#### TypeScript/JavaScript
- Use TypeScript for all new code
- Follow ESLint configuration
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Maintain 90% test coverage

#### Command Structure
- All new commands should follow OCLIF patterns
- Add new agent actions to `src/commands/agent/interface.ts`
- Update the Agent SDK in `src/lib/agent-sdk.ts`
- Include comprehensive help text and examples

#### Error Handling
- Use structured error responses with suggestions
- Provide actionable error messages
- Include recovery guidance where possible
- Test error scenarios thoroughly

## 🔧 Technical Guidelines

### Adding New Features

1. **Update PRD**: If your feature is not in the PRD, propose an update first
2. **Agent Interface**: Add new actions to the agent command where applicable
3. **SDK Integration**: Add corresponding methods to the `ShopifyAgentSDK`
4. **Documentation**: Update `docs/AGENT_INTEGRATION.md`
5. **Examples**: Add practical examples to `examples/agent-examples.js`
6. **Tests**: Write comprehensive tests for new functionality

### Code Quality

#### Required Checks
- [ ] All tests pass: `npm test`
- [ ] TypeScript compiles: `npm run build` 
- [ ] Linting passes: `npm run lint`
- [ ] Agent interface works: `./bin/run.js agent --action health-check`

#### Performance
- Response times under 2 seconds for standard operations
- Respect Shopify API rate limits
- Use batch operations for bulk processing
- Implement proper error handling and retries

### Security Requirements

- **No Hardcoded Secrets**: Use configuration system only
- **Input Validation**: Sanitize all user inputs
- **Safe Defaults**: Use `--dry-run` by default for destructive operations
- **Minimal Permissions**: Request only necessary API scopes
- **Audit Trail**: Log important operations for debugging

## 📝 Pull Request Guidelines

### PR Title Format
```
type(scope): brief description

Examples:
feat(agent): add new store analysis action
fix(product): resolve bulk update timeout issue
docs(readme): update installation instructions
```

### PR Description Template
```markdown
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality) 
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Pre-Submission Checklist
- [ ] I have read the PRD (prd.md)
- [ ] I have read the Claude instructions (claude.md) if I'm an AI agent
- [ ] I have tested my changes with the agent interface
- [ ] I have updated documentation if needed
- [ ] I have added tests for new functionality
- [ ] All tests pass locally

## Testing
Describe how you tested your changes:

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Additional Notes
Any additional information reviewers should know.
```

### Review Process

1. **Automated Checks**: PR must pass all CI/CD checks
2. **Code Review**: At least one maintainer review required
3. **Testing**: Verify functionality with real Shopify store
4. **Documentation**: Ensure docs are updated for new features
5. **AI Compatibility**: Test with agent interface if applicable

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration

# Run tests with coverage
npm run test:coverage
```

### Test Requirements
- Unit tests for all new functions
- Integration tests for API interactions
- Agent compatibility tests for new actions
- Performance tests for bulk operations

### Manual Testing Checklist
- [ ] CLI commands work as expected
- [ ] Agent interface returns proper JSON
- [ ] Error handling provides helpful suggestions
- [ ] Performance meets requirements
- [ ] Security measures are effective

## 📚 Documentation

### Required Updates
When adding new features, update these files:
- `README.md` - If adding major functionality
- `docs/AGENT_INTEGRATION.md` - For new agent actions
- `examples/agent-examples.js` - Add practical examples
- `prd.md` - For significant new features

### Documentation Standards
- Clear, concise explanations
- Code examples with expected output
- Use cases and practical scenarios
- Troubleshooting guidance
- Links to related documentation

## 🚀 Release Process

### Version Management
- Follow semantic versioning (SemVer)
- Update version in `package.json`
- Create detailed changelog entries
- Tag releases in Git

### Release Checklist
- [ ] All tests pass
- [ ] Documentation updated
- [ ] Examples tested
- [ ] Agent compatibility verified
- [ ] Performance benchmarks met
- [ ] Security review completed

## ❓ Getting Help

### Resources
- **Documentation**: Check `docs/` directory first
- **Examples**: See `examples/` for practical use cases
- **Issues**: Search existing GitHub issues
- **PRD**: Review project requirements in `prd.md`

### Contact
- **GitHub Issues**: For bugs and feature requests
- **Discussions**: For questions and general discussion
- **Security Issues**: Use private security advisories

## 🏆 Recognition

Contributors will be recognized in:
- `CONTRIBUTORS.md` file
- Release notes for significant contributions
- Project documentation for major features

Thank you for contributing to the Shopify CLI Management Tool! Your contributions help make e-commerce automation more accessible to developers and AI agents worldwide.

---

**Last Updated**: January 2024  
**Next Review**: Quarterly updates aligned with PRD reviews
