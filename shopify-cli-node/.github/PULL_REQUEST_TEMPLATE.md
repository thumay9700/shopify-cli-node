# Pull Request

## 📋 Pre-Submission Checklist (MANDATORY)

**Before submitting this PR, you MUST check all applicable boxes:**

### For All Contributors
- [ ] I have read the **[Product Requirements Document (PRD)](../prd.md)** and understand the project goals
- [ ] I have reviewed the **[Contributing Guidelines](.github/CONTRIBUTING.md)**
- [ ] I have tested my changes using `./bin/run.js agent --action health-check --format agent-json`
- [ ] I have verified that my changes align with the project architecture outlined in the PRD

### For AI Agents (REQUIRED if you are an AI agent)
- [ ] I have read and followed the **[Claude AI Instructions](../claude.md)**
- [ ] I have used only the `agent` command interface for programmatic access
- [ ] I have used `--format agent-json` for all agent-related outputs
- [ ] I have used `--dry-run` for any potentially destructive operations
- [ ] I have structured my outputs according to the agent response schema

### Code Quality
- [ ] All tests pass locally (`npm test`)
- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] Linting passes (`npm run lint`)
- [ ] Code coverage meets the 90% requirement
- [ ] I have added appropriate error handling with actionable suggestions

## 🎯 Description

### What does this PR do?
<!-- Provide a clear, concise description of the changes -->

### Why is this change needed?
<!-- Explain the problem this PR solves or the feature it adds -->

### How does it work?
<!-- Brief technical explanation of your approach -->

## 🔄 Type of Change

Select the type that best describes your changes:

- [ ] 🐛 **Bug fix** (non-breaking change which fixes an issue)
- [ ] ✨ **New feature** (non-breaking change which adds functionality)
- [ ] 💥 **Breaking change** (fix or feature that would cause existing functionality to change)
- [ ] 📚 **Documentation update**
- [ ] 🔧 **Refactoring** (code change that neither fixes a bug nor adds a feature)
- [ ] ⚡ **Performance improvement**
- [ ] 🧪 **Test improvement**

## 🚀 Changes Made

### New Features Added
<!-- List any new features or functionality -->
- 

### Bug Fixes
<!-- List any bugs fixed -->
- 

### Documentation Updates
<!-- List any documentation changes -->
- 

### Breaking Changes
<!-- List any breaking changes and migration path -->
- 

## 🧪 Testing

### Manual Testing Done
<!-- Describe how you tested your changes -->
- [ ] Tested with real Shopify store connection
- [ ] Verified agent interface compatibility
- [ ] Tested error scenarios and recovery paths
- [ ] Performance testing for bulk operations (if applicable)

### Test Commands Run
<!-- List the specific commands you used to test -->
```bash
# Example commands used for testing
./bin/run.js agent --action health-check --format agent-json
./bin/run.js agent --action get-store-info --format agent-json
# Add your specific test commands here
```

### Test Results
<!-- Paste any relevant test output or screenshots -->

## 📊 Performance Impact

<!-- If applicable, describe performance implications -->
- [ ] No performance impact
- [ ] Performance improvement (describe how)
- [ ] Potential performance concern (describe and justify)

**Response Time Testing:**
<!-- If you added/modified API operations, include timing results -->
- Store info retrieval: X ms
- Product listing: X ms  
- Bulk operations: X ms per item

## 🔒 Security Considerations

<!-- Address any security implications -->
- [ ] No security implications
- [ ] Security improvement (describe)
- [ ] New security considerations (describe how they're addressed)

**Security Checklist:**
- [ ] No hardcoded credentials or secrets
- [ ] Input validation implemented
- [ ] Safe defaults for destructive operations
- [ ] Appropriate API scope requirements

## 📚 Documentation Updates

### Files Updated
<!-- List documentation files you've updated -->
- [ ] `README.md`
- [ ] `docs/AGENT_INTEGRATION.md`
- [ ] `examples/agent-examples.js`
- [ ] `prd.md` (for significant new features)
- [ ] Other: ________________

### Documentation Review
- [ ] All new features are documented
- [ ] Code examples are provided and tested
- [ ] Error scenarios and troubleshooting are covered
- [ ] Agent-specific usage is documented (if applicable)

## 🤖 Agent Compatibility

<!-- If your changes affect the agent interface -->
- [ ] New agent actions added to `src/commands/agent/interface.ts`
- [ ] Corresponding SDK methods added to `src/lib/agent-sdk.ts`
- [ ] Agent response format follows the schema
- [ ] Error handling provides actionable suggestions
- [ ] Examples added to `examples/agent-examples.js`

### Agent Testing Results
<!-- Test with different agent formats if applicable -->
- [ ] Claude format: `ShopifyAgentSDK.formatForAgent(response, 'claude')`
- [ ] Cursor format: `ShopifyAgentSDK.formatForAgent(response, 'cursor')`
- [ ] Copilot format: `ShopifyAgentSDK.formatForAgent(response, 'copilot')`

## 📝 Additional Notes

### Dependencies
<!-- List any new dependencies and justify why they're needed -->
- No new dependencies
- New dependencies added: ________________

### Backward Compatibility
<!-- Describe backward compatibility considerations -->
- [ ] Fully backward compatible
- [ ] Minor breaking changes (documented in CHANGELOG)
- [ ] Major breaking changes (migration guide provided)

### Follow-up Work
<!-- Any related work that needs to be done later -->
- 

### Questions for Reviewers
<!-- Any specific areas you'd like reviewers to focus on -->
- 

## 📸 Screenshots / Output Examples

<!-- Add screenshots or example outputs, especially for CLI changes -->

### Before
```
<!-- Previous output/behavior -->
```

### After  
```
<!-- New output/behavior -->
```

---

## 📋 Reviewer Checklist

**For maintainers reviewing this PR:**

### Code Review
- [ ] Code follows project conventions and standards
- [ ] Changes align with PRD requirements
- [ ] Error handling is comprehensive and helpful
- [ ] Performance is acceptable for the use case
- [ ] Security considerations are properly addressed

### Testing
- [ ] All automated tests pass
- [ ] Manual testing confirms functionality
- [ ] Agent interface works correctly (if applicable)
- [ ] Performance benchmarks are met
- [ ] Edge cases are handled appropriately

### Documentation  
- [ ] All necessary documentation is updated
- [ ] Examples are provided and work correctly
- [ ] Breaking changes are clearly documented
- [ ] Migration paths are provided (if needed)

### Final Approval
- [ ] Changes are ready for production use
- [ ] No additional work is required before merge
- [ ] Version bump is appropriate (if needed)

---

**By submitting this PR, I confirm that I have read and followed all required documentation and guidelines.**
