## ADDED Requirements

### Requirement: Code formatting
The system SHALL provide automated code formatting.

#### Scenario: Format check
- **WHEN** `npm run format:check` runs
- **THEN** it checks all source files for prettier formatting without modifying them

### Requirement: Linting
The system SHALL provide TypeScript linting.

#### Scenario: Lint check
- **WHEN** `npm run lint` runs
- **THEN** it reports any TypeScript/ESLint errors

### Requirement: CI pipeline
The system SHALL have a CI workflow that runs on push and PR.

#### Scenario: CI triggers
- **WHEN** code is pushed or a PR is opened
- **THEN** CI runs format:check, lint, typecheck, and test
