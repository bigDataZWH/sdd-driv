## ADDED Requirements

### Requirement: Subagent progress tracking
The system SHALL record subagent execution progress with evidence.

#### Scenario: Progress recorded per task
- **WHEN** a subagent completes a task during build
- **THEN** the system records task ID, start time, RED evidence, GREEN evidence, review status, and fix rounds

### Requirement: Build mode alignment
Build mode values SHALL match the actual Superpowers skill names.

#### Scenario: Aligned values
- **WHEN** buildMode is set
- **THEN** valid values are 'subagent-driven-development', 'executing-plans', or 'manual'

### Requirement: TDD evidence
TDD mode SHALL require RED/GREEN test evidence per task.

#### Scenario: TDD evidence required
- **WHEN** tddMode is 'tdd' or 'tdd-lite' and a task completes
- **THEN** the system requires redEvidence and greenEvidence file paths

### Requirement: Main session code restriction
In subagent mode, the main session SHALL NOT modify source code directly.

#### Scenario: Restriction enforced
- **WHEN** isolation is 'branch' or 'worktree' and buildMode is 'subagent-driven-development'
- **THEN** main session only coordinates, reviews, and marks tasks
