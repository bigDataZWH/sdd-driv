## ADDED Requirements

### Requirement: Compression strategy from state
The system SHALL use the ChangeState.contextCompression value to determine compression strategy.

#### Scenario: Compression applied per config
- **WHEN** contextCompression is 'beta'
- **THEN** compressor limits to 400 char summary, 10 items per category
- **WHEN** contextCompression is 'full'
- **THEN** compressor limits to 200 char summary, 5 items per category
- **WHEN** contextCompression is 'off'
- **THEN** no truncation applied

### Requirement: Rich handoff context
The system SHALL populate handoff context with actual content from design, tasks, reviews, and spec deltas.

#### Scenario: Decisions populated
- **WHEN** design.md contains a ## Decisions section
- **THEN** its child list items are parsed into context.decisions

#### Scenario: Tasks populated
- **WHEN** tasks.md exists
- **THEN** all task descriptions are parsed into context.tasks

#### Scenario: Reviews populated
- **WHEN** reviews/ directory contains .md files with conclusion markers
- **THEN** conclusions are parsed into context.reviews
