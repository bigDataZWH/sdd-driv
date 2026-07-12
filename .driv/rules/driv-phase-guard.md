# Driv Phase Guard

## Purpose
Enforce the five-phase workflow: Clarify → Design → Build → Verify → Archive

## Rules

### Clarify Phase
- Must have a complete proposal.md with:
  - Problem statement
  - Success criteria
  - Scope definition
- Must have tasks.md with at least one task
- Must have specs/ directory with at least one spec file

### Design Phase
- Must have a complete design.md with:
  - Architecture overview
  - Technical decisions
  - Implementation plan
- Must pass technical review before moving to Build

### Build Phase
- Must have a plan.md with:
  - Implementation steps
  - Test plan
  - Timeline
- Must follow TDD methodology if enabled

### Verify Phase
- Must have verify.md with:
  - Test results
  - Code review comments
  - Quality metrics
- Clean code checker must pass

### Archive Phase
- Must have archive.md with:
  - Summary of changes
  - Lessons learned
  - Future improvements

## Violation Actions
- If any phase requirement is not met, block the workflow transition
- Provide clear error message explaining what is missing
- Suggest next steps to complete the phase