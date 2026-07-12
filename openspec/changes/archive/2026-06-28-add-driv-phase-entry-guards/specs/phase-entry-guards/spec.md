## ADDED Requirements

### Requirement: Design entry guard
The system SHALL validate prerequisites before entering the design phase.

#### Scenario: Design entry passes
- **WHEN** phase is 'design', clarify is 'completed', proposal exists, requirement review is 'passed'
- **THEN** checkEntry returns passed: true

#### Scenario: Design entry blocked
- **WHEN** clarify is not 'completed' or proposal is missing
- **THEN** checkEntry returns passed: false with appropriate failures

### Requirement: Build entry guard
The system SHALL validate prerequisites before entering the build phase.

#### Scenario: Build entry passes
- **WHEN** phase is 'build', design is 'completed', technical review is 'passed', handoff hash is valid
- **THEN** checkEntry returns passed: true

#### Scenario: Handoff hash drift
- **WHEN** handoff sources have changed since generation
- **THEN** checkEntry produces a warning and reports drifted files

### Requirement: Unified artifact values
Artifact values SHALL use only string types.

#### Scenario: String-only values
- **WHEN** reading or writing artifact values
- **THEN** all values are strings: 'true', 'passed', a file path, or '' for absent
