## ADDED Requirements

### Requirement: Build orchestration
The system SHALL orchestrate the Build phase after technical review passes.

#### Scenario: Start Build phase
- **WHEN** a change has completed Design and passed technical review
- **THEN** `/driv-build` creates or updates a Superpowers plan under `docs/superpowers/plans/` and marks Build as in progress

#### Scenario: Technical review missing
- **WHEN** `/driv-build` runs before technical review passes
- **THEN** the system MUST block Build and report the missing technical review gate

### Requirement: Build execution modes
The system SHALL record build mode, TDD mode, and isolation mode before implementation proceeds.

#### Scenario: Recommended modes selected
- **WHEN** default Build settings are used
- **THEN** the system sets `build_mode` to `subagent-driven-development`, `tdd_mode` to `tdd`, and `isolation` to `branch`

#### Scenario: Worktree isolation selected
- **WHEN** user selects worktree isolation
- **THEN** the system records `isolation: worktree` and creates or references an isolated Git worktree for implementation

### Requirement: Verify phase checks
The system SHALL verify implementation readiness before Archive.

#### Scenario: Light verification
- **WHEN** the change has fewer than 3 tasks and fewer than 4 changed files
- **THEN** VerifyService classifies the change as `light` and runs the configured light checks

#### Scenario: Full verification
- **WHEN** the change has at least 3 tasks or at least 4 changed files
- **THEN** VerifyService classifies the change as `full` and runs the configured full checks

#### Scenario: Verification passes
- **WHEN** build, tests, Clean Code, branch handling, and report generation all pass
- **THEN** the system sets `verify_result` to `pass` and allows transition to Archive

### Requirement: Verification report
The system SHALL generate a verification report under the OpenSpec change reports directory.

#### Scenario: Generate report
- **WHEN** `/driv-verify` completes checks
- **THEN** it writes `openspec/changes/<name>/reports/verification-report.md` with build result, test result, Clean Code result, branch strategy, and final verdict

#### Scenario: Verification fails
- **WHEN** any critical verification check fails
- **THEN** the report records the failure and the system blocks Archive

### Requirement: Git branch handling
The system SHALL support merge, squash, rebase, and retain branch handling strategies.

#### Scenario: Retain branch
- **WHEN** user selects `retain`
- **THEN** the system records branch handling as complete without merging into the target branch

#### Scenario: Merge branch
- **WHEN** user selects `merge`
- **THEN** GitOps merges the source branch into the target branch and records branch status in `.driv.yaml`

### Requirement: Archive preconditions
The system SHALL verify all archive preconditions before moving or merging artifacts.

#### Scenario: Archive before verification
- **WHEN** `/driv-archive` runs before Verify passes
- **THEN** the system MUST reject archive and report `verify_completed` as failed

#### Scenario: Archive missing report
- **WHEN** verification report does not exist
- **THEN** the system MUST reject archive and preserve the change directory unchanged

### Requirement: Archive artifacts
The system SHALL archive all OpenSpec evidence and reports for a completed change.

#### Scenario: Create archive directory
- **WHEN** archive starts for a verified change
- **THEN** the system creates `openspec/archive/YYYY-MM-DD-<name>/` and copies proposal, design, tasks, specs, reviews, and reports

#### Scenario: Update state after archive
- **WHEN** archive succeeds
- **THEN** the system updates `.driv.yaml` with `archived: true`, archive path, completed timestamp, and spec merge metadata

### Requirement: Delta Spec merge
The system SHALL merge delta specs into main specs using append, update, and supersede strategies.

#### Scenario: Append new capability
- **WHEN** a delta spec defines a capability that does not exist in `openspec/specs`
- **THEN** the system creates the main spec for that capability using the delta content

#### Scenario: Merge conflict
- **WHEN** a delta spec cannot be merged safely
- **THEN** the system preserves the existing main spec, writes a conflict file, and marks archive as failed

### Requirement: Archive rollback
The system SHALL rollback file-copy failures during archive.

#### Scenario: File copy fails
- **WHEN** archive file copy fails after creating the archive directory
- **THEN** the system deletes the partially created archive directory and leaves `.driv.yaml` unchanged

#### Scenario: State update fails
- **WHEN** archive files are copied but state update fails
- **THEN** the system preserves archive files and reports manual state repair instructions
