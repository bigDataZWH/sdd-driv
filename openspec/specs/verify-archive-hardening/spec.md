## Requirements

### Requirement: Intelligent scale determination
The system SHALL determine verify scale using git diff and spec scope.

#### Scenario: Scale from diff
- **WHEN** baseRef is set and diff shows more than 10 files
- **THEN** scale is 'full'
- **WHEN** diff shows 3 or fewer files
- **THEN** scale is 'light'

### Requirement: Robust command parsing
The system SHALL parse build/test commands robustly.

#### Scenario: Quoted arguments
- **WHEN** command contains quoted arguments like `"npm run test -- --watch"`
- **THEN** arguments are parsed correctly respecting quotes

### Requirement: Clean Code report generation
The system SHALL generate Clean Code report files.

#### Scenario: Report files created
- **WHEN** verify runs with cleanCodeChecker
- **THEN** reports/clean-code-report.md and reports/clean-code-issues.json are created

### Requirement: Branch handling
The system SHALL handle development branches according to configured strategy.

#### Scenario: Branch retained
- **WHEN** verify completes successfully and isolation is 'branch'
- **THEN** branch_status is set to 'retained' or as configured
