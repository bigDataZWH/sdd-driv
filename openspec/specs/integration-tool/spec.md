## ADDED Requirements

### Requirement: Project initialization
The integration tool SHALL provide a project-level initialization flow that prepares OpenSpec, Superpowers working directories, and OpenCode command/skill entry points in the current project.

#### Scenario: Initialize a project with default options
- **WHEN** the user runs the integration tool initialization command in a project directory
- **THEN** the system creates or verifies `openspec/`, `.opencode/skills`, `.opencode/commands`, and `docs/superpowers/plans`

#### Scenario: Existing files are present
- **WHEN** initialization finds existing generated commands or skills
- **THEN** the system MUST skip existing files by default or ask before overwriting them

### Requirement: OpenSpec installation and setup
The integration tool SHALL install or detect OpenSpec CLI support and initialize OpenSpec for the OpenCode tool target without assuming global configuration paths.

#### Scenario: OpenSpec CLI is available
- **WHEN** OpenSpec CLI is already available on PATH
- **THEN** the system uses the existing CLI to initialize OpenSpec for the current project

#### Scenario: OpenSpec CLI is missing
- **WHEN** OpenSpec CLI is not available on PATH
- **THEN** the system attempts to install `@fission-ai/openspec` and reports actionable manual installation guidance if installation fails

### Requirement: Superpowers installation
The integration tool SHALL install or stage Superpowers skills for OpenCode using the Superpowers skills CLI flow.

#### Scenario: Install Superpowers for OpenCode
- **WHEN** the initialization flow enables Superpowers integration
- **THEN** the system invokes the skills installer with the OpenCode agent target and records whether installation succeeded, failed, or was skipped

#### Scenario: Superpowers installation fails
- **WHEN** the Superpowers installer exits with an error
- **THEN** the system MUST preserve existing project files and print the underlying command error details

### Requirement: OpenCode command generation
The integration tool SHALL generate OpenCode command files from corresponding skill definitions so users can invoke the OpenSpec workflow through slash commands.

#### Scenario: Generate command from skill
- **WHEN** a skill file exists at `.opencode/skills/<skill-name>/SKILL.md`
- **THEN** the system creates `.opencode/commands/<skill-name>.md` with frontmatter, `$ARGUMENTS` forwarding, and the skill workflow body

#### Scenario: Preserve opsx command names
- **WHEN** generating OpenCode commands for OpenSpec workflow skills
- **THEN** the system MUST preserve `opsx-*` command names and MUST NOT rename them to unrelated command prefixes

### Requirement: OpenSpec as single source of truth
The integration tool SHALL enforce OpenSpec change artifacts as the source of truth for proposal, design, specifications, and tasks.

#### Scenario: Design artifacts are created
- **WHEN** the workflow creates design output for a change
- **THEN** the system writes design content to `openspec/changes/<change>/design.md` and MUST NOT create a separate Superpowers design document for the same content

#### Scenario: Implementation planning uses design context
- **WHEN** implementation starts after OpenSpec artifacts are complete
- **THEN** Superpowers workflows use OpenSpec artifacts as input and may create implementation plans without duplicating the OpenSpec design document

### Requirement: Reference implementation alignment
The integration tool SHALL follow the relevant comet-master implementation patterns for installation orchestration, platform path mapping, asset copying, and tests.

#### Scenario: Implement platform path mapping
- **WHEN** resolving OpenCode project paths
- **THEN** the system uses a centralized platform definition equivalent to comet-master's platform mapping pattern

#### Scenario: Validate behavior with tests
- **WHEN** implementation is complete
- **THEN** tests cover OpenSpec invocation arguments, Superpowers installer arguments, OpenCode command generation, existing-file skip behavior, and Windows path handling
