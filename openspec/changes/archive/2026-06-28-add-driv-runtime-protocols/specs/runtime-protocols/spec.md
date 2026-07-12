## ADDED Requirements

### Requirement: State recovery
The system SHALL provide context recovery from .driv.yaml, handoff, plan, tasks, and subagent-progress markers.

#### Scenario: Full recovery from available artifacts
- **WHEN** recovering state after session restart
- **THEN** the system reads .driv.yaml, validates handoff hash, counts tasks progress
- **AND** returns a RecoveryState with change name, phase, task completion ratio, and handoff validity

#### Scenario: Missing artifacts during recovery
- **WHEN** .driv.yaml or handoff is missing
- **THEN** the system returns available partial recovery data without crashing

### Requirement: Dirty worktree detection
The system SHALL detect dirty git worktree state before build/verify/archive phases.

#### Scenario: Clean worktree
- **WHEN** git status shows no modified or untracked files in the worktree
- **THEN** checkEntry returns passed for the guard

#### Scenario: Dirty worktree with unrelated changes
- **WHEN** git status shows changes outside the current change directory
- **THEN** guard produces a warning failure, listing unrelated changes separately

### Requirement: Debug gate enforcement
The system SHALL enforce systematic debugging instead of guess-fixes when tests or build fail.

#### Scenario: Build fails
- **WHEN** VerifyService detects build failure
- **THEN** the system prevents automatic retry and suggests using the investigate skill

### Requirement: User decision points
The system SHALL require explicit user confirmation at critical decision points.

#### Scenario: Build mode selection
- **WHEN** entering build phase for the first time
- **THEN** guard pauses and requires user decision on build mode, TDD mode, and isolation

### Requirement: Auto-transition
The system SHALL support automatic phase transition based on autoTransition field.

#### Scenario: Auto-transition enabled
- **WHEN** exit guard passes and autoTransition is true
- **THEN** the system automatically progresses to the next phase via stateMachine.transition
