## ADDED Requirements

### Requirement: Centralized manifest
The system SHALL use a manifest.json to declare all Driv assets.

#### Scenario: Manifest loaded
- **WHEN** init or update runs
- **THEN** manifest.json is read to determine which files to copy

### Requirement: Global and project scope
The system SHALL support installing to project or global OpenCode config.

#### Scenario: Project scope
- **WHEN** scope is 'project'
- **THEN** files are installed to ${projectRoot}/.opencode/

#### Scenario: Global scope
- **WHEN** scope is 'global'
- **THEN** files are installed to ~/.config/opencode/

### Requirement: Safe uninstall
The system SHALL only remove Driv-managed files during uninstall.

#### Scenario: Uninstall removes managed files
- **WHEN** uninstall runs
- **THEN** only files listed in manifest are removed
