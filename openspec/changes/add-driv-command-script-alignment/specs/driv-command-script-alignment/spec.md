## ADDED Requirements

### Requirement: Driv slash command entrypoints
The system SHALL provide Driv OpenCode slash commands as the primary user entrypoints for the enterprise five-phase workflow.

#### Scenario: Clarify command starts requirements phase
- **WHEN** the user runs `/driv-clarify` with a change description
- **THEN** the system creates or updates OpenSpec change artifacts, initializes `.driv.yaml`, and prepares requirement review evidence without creating a separate Superpowers design document

#### Scenario: Design command uses OpenSpec design
- **WHEN** the user runs `/driv-design` after requirement review passes
- **THEN** the system generates handoff context, invokes brainstorming as process guidance, updates `openspec/changes/<name>/design.md`, and prepares technical review evidence

#### Scenario: Main status command shows next step
- **WHEN** the user runs `/driv`
- **THEN** the system displays the current change, current phase, blocking gates, relevant report paths, and the next recommended Driv command

### Requirement: Driv CLI maintenance commands
The system SHALL provide CLI commands for initialization, status, diagnostics, updates, and review automation.

#### Scenario: Doctor detects missing assets
- **WHEN** the user runs `driv doctor`
- **THEN** the system checks Node.js, Git, Bash, OpenSpec, Superpowers, OpenCode directories, Driv config, Driv scripts, command assets, and template assets, then reports actionable failures

#### Scenario: Update synchronizes assets safely
- **WHEN** the user runs `driv update`
- **THEN** the system synchronizes Driv commands, skills, templates, and scripts without overwriting user-modified files unless explicit overwrite is requested

#### Scenario: Status works outside OpenCode
- **WHEN** the user runs `driv status` in a project with active changes
- **THEN** the system prints the same phase, gate, report, and next-step information used by `/driv`

### Requirement: Command naming compatibility
The system SHALL use `driv-*` as the primary Driv workflow command prefix while preserving existing `opsx-*` commands as OpenSpec compatibility entrypoints.

#### Scenario: Init generates Driv commands
- **WHEN** `driv init` installs or synchronizes OpenCode assets
- **THEN** it creates or verifies `/driv-clarify`, `/driv-design`, `/driv-build`, `/driv-verify`, `/driv-archive`, `/driv-review`, and `/driv` command files or equivalent skill entries

#### Scenario: Existing opsx commands remain available
- **WHEN** existing `opsx-*` commands are present
- **THEN** the system preserves them and labels them as OpenSpec-compatible commands rather than Driv five-phase workflow commands

#### Scenario: Driv workflow cannot rely only on opsx state
- **WHEN** a user invokes an `opsx-*` command directly
- **THEN** the system MUST NOT assume Driv phase state, review gates, or Clean Code evidence are satisfied unless a Driv synchronization step verifies them

### Requirement: Driv script assets
The system SHALL provide script assets for reusable environment setup, state, guard, handoff, archive, review, Clean Code, and validation operations.

#### Scenario: Script assets are installed
- **WHEN** Driv initializes script support
- **THEN** it creates or verifies `driv-env.sh`, `driv-state.sh`, `driv-guard.sh`, `driv-handoff.sh`, `driv-archive.sh`, `driv-review.sh`, `driv-cleancode.sh`, and `driv-validate.sh`

#### Scenario: Scripts resolve paths through env
- **WHEN** a Driv script needs project paths
- **THEN** it sources `driv-env.sh` and uses quoted paths for project root, OpenSpec directories, change directories, config directories, and report directories

#### Scenario: Validation aggregates checks
- **WHEN** `driv-validate.sh` runs for a change
- **THEN** it aggregates configured build, lint, typecheck, test, OpenSpec status, PhaseGuard, and report existence checks

### Requirement: Subagent dispatch contract
The system SHALL define a Build-phase subagent dispatch contract without prescribing internal subagent implementation.

#### Scenario: Dispatch records parallel tasks
- **WHEN** Build runs with `subagent-driven-development`
- **THEN** the system records task id, dependencies, input artifact paths, expected output, assigned subagent type, and verification command for each dispatched task

#### Scenario: Dispatch summary blocks failed Build
- **WHEN** any dispatched task fails or lacks verification evidence
- **THEN** the system records the failure in a dispatch report and MUST NOT allow Build to transition to Verify

#### Scenario: Dispatch evidence is preserved
- **WHEN** all dispatched tasks complete
- **THEN** the system writes a dispatch summary to the OpenSpec change reports directory or `.driv.yaml.phases.build.subagents` for archive evidence
