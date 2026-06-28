## ADDED Requirements

### Requirement: Template directory structure
The system SHALL create a `.driv/templates` directory with default proposal, design, spec, review, and custom template locations.

#### Scenario: Initialize templates
- **WHEN** Driv initializes template support
- **THEN** it creates `.driv/templates/proposals`, `.driv/templates/designs`, `.driv/templates/specs`, `.driv/templates/reviews`, and custom subdirectories where applicable

#### Scenario: Default review templates exist
- **WHEN** template initialization completes
- **THEN** `requirement-review.md`, `technical-review.md`, and `code-review.md` exist under `.driv/templates/reviews`

### Requirement: Template selection
The system SHALL select templates using project override first, change type mapping second, and default templates last.

#### Scenario: Project custom template exists
- **WHEN** a custom template exists for a requested type and change type
- **THEN** TemplateManager selects the project custom template before any built-in template

#### Scenario: No custom template exists
- **WHEN** no custom template exists but type mapping exists
- **THEN** TemplateManager selects the mapped template for that change type

### Requirement: Template manager operations
The system SHALL provide operations to load, select, apply, list, validate, and inspect template inheritance chains.

#### Scenario: Apply template values
- **WHEN** TemplateManager applies a template with provided data
- **THEN** all matching placeholders are replaced and unresolved placeholders remain visible in the output

#### Scenario: Validate template
- **WHEN** TemplateManager validates a template
- **THEN** it reports missing required sections, unresolved required placeholders, and invalid inheritance references

### Requirement: Placeholder parser
The system SHALL parse placeholders in the format `{{name}}` and `{{name:default}}`.

#### Scenario: Parse simple placeholder
- **WHEN** PlaceholderParser parses `Hello {{user_name}}`
- **THEN** it returns a placeholder named `user_name` with no default value

#### Scenario: Replace default placeholder
- **WHEN** a placeholder has a default value and no user value is provided
- **THEN** replacement uses the default value

### Requirement: Template inheritance
The system SHALL support section-level template inheritance with extend, override, merge, and add behavior.

#### Scenario: Override section
- **WHEN** a child template overrides a section from the parent template
- **THEN** the output uses the child section content for that section

#### Scenario: Merge section
- **WHEN** a child template merges a section from the parent template
- **THEN** the output preserves parent content and appends or combines child content according to the merge strategy

### Requirement: Template configuration
The system SHALL load template configuration from `.driv/templates/config.yaml` and provide defaults when it is missing.

#### Scenario: Config missing
- **WHEN** `.driv/templates/config.yaml` does not exist
- **THEN** the system uses built-in default template mappings and inheritance settings

#### Scenario: Config present
- **WHEN** `.driv/templates/config.yaml` exists
- **THEN** the system reads default templates, type mappings, inheritance rules, placeholders, and project override search paths from it

### Requirement: Enterprise review templates
The system SHALL provide review templates with enterprise gate fields from the design documents.

#### Scenario: Requirement review template
- **WHEN** a requirement review template is generated
- **THEN** it includes basic information, checklist, linked proposal/tasks, AI review result, review opinion, final decision, and review records

#### Scenario: Technical review template
- **WHEN** a technical review template is generated
- **THEN** it includes linked design/tasks, architecture checks, decision review table, task completeness, review opinion, and final decision

#### Scenario: Code review template
- **WHEN** a code review template is generated
- **THEN** it includes code quality, unit test coverage, security, comments, AI review, manual review, and final decision sections
