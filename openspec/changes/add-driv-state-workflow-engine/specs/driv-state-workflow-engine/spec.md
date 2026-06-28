## ADDED Requirements

### Requirement: Driv change state file
The system SHALL create and maintain a `.driv.yaml` state file inside each OpenSpec change directory.

#### Scenario: Initialize state for a new change
- **WHEN** Driv initializes a change named `<name>`
- **THEN** the system creates `openspec/changes/<name>/.driv.yaml` with workflow `full`, phase `clarify`, pending phase states, OpenSpec artifact paths, review statuses, verification state, and archive state

#### Scenario: Preserve OpenSpec as source of truth
- **WHEN** state references proposal, design, tasks, or specs
- **THEN** the paths MUST point to files under `openspec/changes/<name>/` and MUST NOT point to Superpowers design documents

### Requirement: Five-phase workflow state machine
The system SHALL model Driv changes with exactly five phases: `clarify`, `design`, `build`, `verify`, and `archive`.

#### Scenario: Valid phase transition
- **WHEN** all exit checks for the current phase pass and the target phase is the next phase
- **THEN** the system updates `.driv.yaml` to set the new phase and mark transition metadata

#### Scenario: Invalid phase transition
- **WHEN** a user attempts to skip a phase or move backward without an explicit supported operation
- **THEN** the system MUST reject the transition and report the failed transition rule

### Requirement: State machine operations
The system SHALL expose operations for initialization, reading, field updates, transition, validation, and scale assessment.

#### Scenario: Update nested state field
- **WHEN** a module calls `setField(name, "phases.design.status", "completed")`
- **THEN** the system updates only that nested field in `.driv.yaml` and preserves unrelated state fields

#### Scenario: Assess change scale
- **WHEN** the system assesses a change scale
- **THEN** it classifies the change as `light` when it has fewer than 3 tasks and fewer than 4 changed files, otherwise as `full`

### Requirement: Phase guard checks
The system SHALL enforce phase entry and exit conditions using PhaseGuard rules.

#### Scenario: Clarify exit requires proposal and requirement review
- **WHEN** a change exits `clarify`
- **THEN** the system MUST verify proposal exists, tasks exist, tasks are defined, and requirement review is passed

#### Scenario: Design exit requires OpenSpec design and handoff
- **WHEN** a change exits `design`
- **THEN** the system MUST verify `openspec/changes/<name>/design.md` exists, design content is complete, handoff is valid, and technical review is passed

#### Scenario: Build exit requires implementation evidence
- **WHEN** a change exits `build`
- **THEN** the system MUST verify plan exists, build mode is set, TDD mode is set, isolation is set, code is committed, tests passed, and code review passed

#### Scenario: Verify exit requires report and branch handling
- **WHEN** a change exits `verify`
- **THEN** the system MUST verify `verify_result` is pass, branch status is handled, and `reports/verification-report.md` exists

### Requirement: Handoff package generation
The system SHALL generate structured handoff packages inside `openspec/changes/<name>/.driv/handoff/`.

#### Scenario: Generate design handoff
- **WHEN** the system transitions from `clarify` to `design`
- **THEN** it creates `design-context.json` and `design-context.md` containing source file hashes, summary, decisions, constraints, tasks, reviews, and a total verification hash

#### Scenario: Validate handoff integrity
- **WHEN** a handoff package is loaded
- **THEN** the system recomputes source file hashes and reports invalid if any source hash no longer matches

### Requirement: Context compression strategies
The system SHALL support context compression strategies `off`, `beta`, and `full`.

#### Scenario: Compression disabled
- **WHEN** `context_compression` is `off`
- **THEN** the handoff context includes full source artifact references without summarizing away required content

#### Scenario: Structured compression
- **WHEN** `context_compression` is `beta`
- **THEN** the handoff context includes structured summary, decisions, constraints, task summaries, and review summaries with a default maximum of 4000 tokens

### Requirement: Infrastructure utilities
The system SHALL provide reusable FileSystem, YamlParser, HashUtils, Logger, ScriptExec, and PathResolver utilities.

#### Scenario: Safe file write
- **WHEN** a module writes a file through FileSystem
- **THEN** the system validates the path is within the allowed project root and creates parent directories as needed

#### Scenario: Hash object content
- **WHEN** HandoffManager computes a verification hash
- **THEN** HashUtils produces deterministic hashes for file contents and structured objects
