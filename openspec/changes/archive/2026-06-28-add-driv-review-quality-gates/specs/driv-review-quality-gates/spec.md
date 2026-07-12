## ADDED Requirements

### Requirement: Review system operations
The system SHALL manage requirement, technical, and code reviews for each Driv change.

#### Scenario: Create review document
- **WHEN** a review is created for a change and review type
- **THEN** the system generates `openspec/changes/<name>/reviews/<type>-review.md` from the configured review template

#### Scenario: Submit passed review
- **WHEN** a review document has a final decision of passed and required approvals are satisfied
- **THEN** the system updates `.driv.yaml.hw_process.<type>_review` to `passed`

#### Scenario: Submit failed review
- **WHEN** a review document has a final decision of failed
- **THEN** the system updates `.driv.yaml.hw_process.<type>_review` to `failed` and PhaseGuard blocks the next phase

### Requirement: Requirement review gate
The system SHALL require requirement review before transitioning from Clarify to Design.

#### Scenario: Requirement review missing
- **WHEN** a change attempts to leave `clarify` without a passed requirement review
- **THEN** PhaseGuard rejects the transition and reports `requirement_review_passed` as failed

#### Scenario: Requirement review checklist
- **WHEN** requirement review checklist executes
- **THEN** it verifies requirement clarity, user story format, acceptance criteria, scope boundary, technical feasibility, risk identification, proposal existence, and tasks existence

### Requirement: Technical review gate
The system SHALL require technical review before transitioning from Design to Build.

#### Scenario: Technical review missing
- **WHEN** a change attempts to leave `design` without a passed technical review
- **THEN** PhaseGuard rejects the transition and reports `technical_review_passed` as failed

#### Scenario: Technical review checklist
- **WHEN** technical review checklist executes
- **THEN** it verifies technical feasibility, architecture reasonableness, interface completeness, performance considerations, security considerations, OpenSpec design existence, and design structure completeness

### Requirement: Code review gate
The system SHALL require code review before transitioning from Build to Verify.

#### Scenario: Code review missing
- **WHEN** a change attempts to leave `build` without a passed code review
- **THEN** PhaseGuard rejects the transition and reports `code_review_passed` as failed

#### Scenario: Code review checklist
- **WHEN** code review checklist executes
- **THEN** it verifies code style, unit test coverage, security issues, comment quality, committed code, passing unit tests, Clean Code result, and security scan result

### Requirement: Clean Code checker
The system SHALL evaluate code quality using configurable Clean Code rules and report pass/fail results.

#### Scenario: Clean Code passes
- **WHEN** the total quality score is at least 80 and no critical issues remain
- **THEN** CleanCodeChecker returns passed and PhaseGuard may satisfy `clean_code_passed`

#### Scenario: Clean Code fails
- **WHEN** the score is below 80 or critical issues remain
- **THEN** CleanCodeChecker returns failed and writes issues to `clean-code-issues.json`

### Requirement: Built-in Clean Code rules
The system SHALL include built-in rules for naming, function length, parameter count, cyclomatic complexity, class length, nesting depth, duplicate code, comments, error handling, and hardcoded secrets.

#### Scenario: Function exceeds threshold
- **WHEN** a function exceeds 50 lines or 5 parameters or complexity 10
- **THEN** CleanCodeChecker records an issue under the function design dimension

#### Scenario: Empty catch block
- **WHEN** code contains an empty catch block
- **THEN** CleanCodeChecker records an error handling issue with critical severity

#### Scenario: Hardcoded secret detected
- **WHEN** code contains likely API keys, tokens, passwords, or private keys
- **THEN** CleanCodeChecker records a security issue with critical severity

### Requirement: Clean Code reports
The system SHALL write Clean Code reports under the OpenSpec change reports directory.

#### Scenario: Generate Clean Code report
- **WHEN** CleanCodeChecker completes
- **THEN** it writes `reports/clean-code-report.md`, `reports/clean-code-issues.json`, and `reports/clean-code-fix-history.json`

#### Scenario: Preserve report for archive
- **WHEN** a change is archived
- **THEN** Clean Code reports remain available with the change artifacts for audit
