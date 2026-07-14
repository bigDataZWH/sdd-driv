## ADDED Requirements

### Requirement: PRD generation in Clarify phase
The system SHALL generate a Product Requirements Document (PRD) as the sole deliverable of the Clarify phase, replacing the previous OpenSpec deliverables (proposal.md, design.md, tasks.md, specs/).

#### Scenario: PRD created from user input
- **WHEN** the Clarify phase completes requirement collection via multi-turn dialogue
- **THEN** a `prd.md` file is generated using the `.driv/templates/prd/default.md` template
- **AND** the PRD contains required sections: 需求背景, 用户故事, 功能范围, 验收标准

#### Scenario: State files initialized
- **WHEN** the PRD is generated
- **THEN** `.openspec.yaml` is created with schema and change metadata
- **AND** `.driv.yaml` is initialized with `phase: 'clarify'` and `phases.clarify.artifacts.prd` pointing to the PRD path

#### Scenario: No OpenSpec deliverables in Clarify
- **WHEN** the Clarify phase runs
- **THEN** no proposal.md, design.md, tasks.md, or specs/ files are generated
- **AND** `openspec.proposal`, `openspec.design`, `openspec.tasks`, `openspec.specs` remain unset

### Requirement: OpenSpec deliverable generation in Design phase
The system SHALL generate all OpenSpec deliverables (proposal.md, design.md, tasks.md, specs/) during the Design phase, based on the PRD and brainstorming results.

#### Scenario: Proposal generated from PRD
- **WHEN** the Design phase completes brainstorming
- **THEN** `proposal.md` is generated using the `.driv/templates/proposals/default.md` template
- **AND** the proposal includes an `## Intent` section for Intent Lock
- **AND** `openspec.proposal` and `phases.design.artifacts.proposal` are set

#### Scenario: Specs generated from design decisions
- **WHEN** the proposal is confirmed
- **THEN** `specs/<capability>/spec.md` is generated based on design decisions from brainstorming
- **AND** `openspec.specs` is populated with the spec path
- **AND** `phases.design.artifacts.specs` is set

#### Scenario: Tasks generated from design decomposition
- **WHEN** the specs are confirmed
- **THEN** `tasks.md` is generated with tasks decomposed from design decisions
- **AND** `openspec.tasks` and `phases.design.artifacts.tasks` are set

### Requirement: Clarify exit guard validates PRD
The PhaseGuard `checkClarifyExit` SHALL validate that a PRD file exists and is properly registered, without checking for OpenSpec deliverables.

#### Scenario: Clarify exit passes with PRD
- **WHEN** `state.openspec.prd` is set and `state.phases.clarify.status === 'completed'`
- **THEN** the exit guard passes with no errors

#### Scenario: Clarify exit fails without PRD
- **WHEN** `state.openspec.prd` is not set
- **THEN** the exit guard fails with error code `prd_exists`

#### Scenario: Clarify exit does not check OpenSpec deliverables
- **WHEN** `state.openspec.proposal` is not set
- **THEN** the exit guard does NOT produce a failure for missing proposal

### Requirement: Design exit guard validates OpenSpec deliverables
The PhaseGuard `checkDesignExit` SHALL validate that all OpenSpec deliverables exist before allowing transition to Build.

#### Scenario: Design exit passes with all deliverables
- **WHEN** proposal, design, specs (non-empty), tasks are set
- **AND** design-converted === 'true' and detailed-design-completed === 'true'
- **AND** handoff is generated and technicalReview === 'passed'
- **THEN** the exit guard passes with no errors

#### Scenario: Design exit fails when proposal missing
- **WHEN** `state.openspec.proposal` is not set
- **THEN** the exit guard fails with error code `proposal_exists`

#### Scenario: Design exit fails when specs empty
- **WHEN** `state.openspec.specs` is an empty array
- **THEN** the exit guard fails with error code `specs_created`

### Requirement: Decision point redistribution
Decision points DP-1 (提案确认), DP-2 (规格确认), and DP-4 (任务确认) SHALL be anchored to the Design phase instead of the Clarify phase.

#### Scenario: DP-1 in Design phase
- **WHEN** the decision point DP-1 is evaluated
- **THEN** its `phase` property is `design`

#### Scenario: DP-2 in Design phase
- **WHEN** the decision point DP-2 is evaluated
- **THEN** its `phase` property is `design`

#### Scenario: DP-4 in Design phase
- **WHEN** the decision point DP-4 is evaluated
- **THEN** its `phase` property is `design`

#### Scenario: DP-0 remains in Clarify phase
- **WHEN** the decision point DP-0 is evaluated
- **THEN** its `phase` property is `clarify`

### Requirement: State machine PRD path management
The StateMachine SHALL provide a `setPrdPath` method to register the PRD path in both `openspec.prd` and `phases.clarify.artifacts.prd`.

#### Scenario: setPrdPath updates state
- **WHEN** `setPrdPath(changeName, prdPath)` is called
- **THEN** `state.openspec.prd` is set to `prdPath`
- **AND** `state.phases.clarify.artifacts.prd` is set to `prdPath`

#### Scenario: setProposalPath updates design artifacts
- **WHEN** `setProposalPath(changeName, path)` is called
- **THEN** `state.openspec.proposal` is set to `path`
- **AND** `state.phases.design.artifacts.proposal` is set to `path`

### Requirement: Context recovery for Clarify phase
The context recovery system SHALL support recovery from the Clarify phase using the PRD path stored in `.driv.yaml`.

#### Scenario: Recovery with PRD path
- **WHEN** context recovery runs and `state.phase === 'clarify'`
- **AND** `state.openspec.prd` is set
- **THEN** the recovery result includes the PRD path for context

#### Scenario: Backward compatibility with old state
- **WHEN** context recovery runs with an old `.driv.yaml` that has no `openspec.prd` field
- **THEN** recovery does not crash and defaults to `phase: 'clarify'`
