## ADDED Requirements

### Requirement: Auto-detect entry
The /driv entry skill SHALL auto-detect the current active change and phase.

#### Scenario: Single active change
- **WHEN** exactly one active change exists
- **THEN** /driv prints its phase, progress, and suggests the next /driv-* command

### Requirement: Hotfix workflow
The /driv-hotfix skill SHALL provide a fast-track workflow.

#### Scenario: Hotfix fast-track
- **WHEN** /driv-hotfix runs
- **THEN** it skips clarify and design phases, proceeds directly to build with warnings
- **AND** still requires verify and archive

### Requirement: Tweak workflow
The /driv-tweak skill SHALL provide a lightweight modification workflow.

#### Scenario: Tweak light-track
- **WHEN** /driv-tweak runs
- **THEN** it skips clarify/design and runs light verify only
- **AND** still requires archive
