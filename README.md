<p align="center">
  <a href="https://github.com/driv/devkit">
    <picture>
      <source srcset="https://www.vectorlogo.zone/logos/nodejs/nodejs-icon.svg">
      <img src="https://www.vectorlogo.zone/logos/nodejs/nodejs-icon.svg" alt="Driv logo" width="120">
    </picture>
  </a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/driv"><img alt="npm version" src="https://img.shields.io/npm/v/driv?style=flat-square" /></a>
  <a href="https://www.npmjs.com/package/driv"><img alt="npm download count" src="https://img.shields.io/npm/dm/driv?style=flat-square&label=Downloads/mo" /></a>
  <a href="https://www.npmjs.com/package/driv"><img alt="npm weekly download count" src="https://img.shields.io/npm/dw/driv?style=flat-square&label=Downloads/wk" /></a>
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" /></a>
  <a href="https://nodejs.org/"><img alt="Node.js" src="https://img.shields.io/badge/Node.js-%3E%3D20-339933?style=flat-square&logo=node.js&logoColor=white" /></a>
  <a href="./README-zh.md"><img alt="中文版" src="https://img.shields.io/badge/README-中文版-red?style=flat-square" /></a>
</p>

# driv

```
██████╗ ██████╗ ██╗██╗   ██╗
██╔══██╗██╔══██╗██║██║   ██║
██║  ██║██████╔╝██║██║   ██║
██║  ██║██╔══██╗██║╚██╗ ██╔╝
██████╔╝██║  ██║██║ ╚████╔╝
╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝
```

> 中文版：[README-zh.md](README-zh.md)

**OpenSpec + Superpowers dual-star workflow** — Clarify → Design → Build → Verify → Archive.

OpenSpec handles **WHAT** (proposals, spec lifecycle, archiving).
Superpowers handles **HOW** (brainstorming, technical design, execution).

Driv chains the two into a five-phase automated pipeline with a resumable state machine, phase guard gates, a template
system, and quality review gates.

## Why Driv

OpenSpec excels at managing proposals and spec lifecycle, but lacks fine-grained technical design and stateful workflow.

Superpowers excels at brainstorming and coding, but the documents it produces lack stateful design, forcing the agent to
re-scan documents when resuming from a checkpoint, wasting tokens.

**Driv merges the strengths of both**, consolidating the flow into 5 phases and guaranteeing phase-transition reliability
through the `.driv.yaml` state file and PhaseGuard gates.

## Install

Requirements:

- Node.js 20+
- npm/npx
- Git
- A shell capable of running bash (Windows users should use Git Bash)

```bash
npm install -g driv
```

## Quick Start

```bash
cd your-project
driv init
```

`driv init` will:

1. Install the OpenSpec skill
2. Install the Superpowers skill
3. Deploy the Driv workflow skills into OpenCode
4. Create the `docs/superpowers/plans/` working directory
5. Create the `.driv/config.yaml` default configuration
6. Create the `.driv/templates/` default templates

## CLI Commands

| Command           | Description                                |
| ----------------- | ------------------------------------------ |
| `driv init`       | Initialize the Driv workflow               |
| `driv status`     | Show the current change and phase          |
| `driv doctor`     | Diagnose installation health               |
| `driv update`     | Sync commands, skills, templates and scripts |
| `driv review`     | Manage review creation, submission and status checks |
| `driv uninstall`  | Remove Driv skills and commands            |
| `driv --help`     | Show help                                  |
| `driv --version`  | Show version                               |

<details>
<summary><code>driv init [path]</code> — Initialize Driv workflow</summary>

Installs OpenSpec, Superpowers, and Driv skills for the OpenCode platform.

| Option              | Description                                                              |
| ------------------- | ------------------------------------------------------------------------ |
| `--yes`             | Non-interactive mode, auto-install missing components                    |
| `--skip-existing`   | Never overwrite existing components                                      |
| `--overwrite`       | Overwrite existing files                                                 |
| `--scope <scope>`   | Install scope: `project` or `global`                                     |
| `--json`            | Output structured JSON                                                   |

</details>

<details>
<summary><code>driv status [path]</code> — Show active changes and workflow status</summary>

Displays the active change, current phase, gates, reports, and the recommended next step.

| Option   | Description                                              |
| -------- | -------------------------------------------------------- |
| `--json` | Output structured JSON for scripting and integration     |

</details>

<details>
<summary><code>driv doctor [path]</code> — Diagnose Driv installation health</summary>

Checks working directories, installed skills, scripts, configuration files, and active change diagnostics.

| Option             | Description                                                  |
| ------------------ | ------------------------------------------------------------ |
| `--json`           | Output structured JSON                                      |
| `--scope <scope>`  | Diagnosis scope: `auto`, `global`, or `project`             |

</details>

<details>
<summary><code>driv update [path]</code> — Update Driv skill files to latest version</summary>

Syncs commands, skills, templates, and scripts to the version bundled in the installed `driv` npm package.

| Option              | Description                                                              |
| ------------------- | ------------------------------------------------------------------------ |
| `--scope <scope>`   | Install scope: `project` or `global`                                     |
| `--language <lang>` | Skill language: `en` or `zh` (skips interactive language prompt)        |
| `--overwrite`       | Overwrite existing commands                                              |
| `--skip-npm`        | Skip npm package self-update (internal)                                 |
| `--json`            | Output structured JSON                                                  |

</details>

<details>
<summary><code>driv uninstall [path]</code> — Remove Driv skills and commands</summary>

Removes Driv skills and commands from the chosen scope. Safe across macOS/Linux/Windows.

| Option             | Description                                                  |
| ------------------ | ------------------------------------------------------------ |
| `--scope <scope>`  | Uninstall scope: `project` or `global`                      |
| `--force`          | Skip confirmation prompts                                   |
| `--json`           | Output structured JSON                                      |

</details>

<details>
<summary><code>driv review</code> — Manage Driv reviews</summary>

Creates, submits, and checks requirement / technical / code reviews for an active change.

| Option            | Description                                                                   |
| ----------------- | ----------------------------------------------------------------------------- |
| `--type <type>`   | Review type: `requirement`, `technical`, or `code`                            |
| `--change <name>` | Specify the change name (auto-detected if omitted)                           |
| `--json`          | Output structured JSON                                                       |

</details>

## Workflow

```
/driv
  ↓ auto-detect active change
/driv-clarify → /driv-design → /driv-build → /driv-verify → /driv-archive
(OpenSpec)     (Superpowers)   (Superpowers)  (Both)        (OpenSpec)
```

### The Five Phases

| Phase     | Command           | Owner         | Artifacts                                                          |
| --------- | ----------------- | ------------- | ----------------------------------------------------------------- |
| 1. Clarify | `/driv-clarify`   | OpenSpec      | proposal.md, .openspec.yaml                                       |
| 2. Design  | `/driv-design`    | Superpowers   | design.md, handoff package, technical review                      |
| 3. Build   | `/driv-build`     | Superpowers   | Superpowers plan, code commits, Clean Code check, code review     |
| 4. Verify  | `/driv-verify`    | Both          | Verification report, branch handling                              |
| 5. Archive | `/driv-archive`   | OpenSpec      | Delta Spec merge, archive                                          |

### Core Principles

- **Clarify cannot be skipped** — every change must first produce a proposal and OpenSpec metadata
- **Design produces a handoff** — hash verification ensures artifact consistency
- **Keep `tasks.md` in sync** — tick off each task as it completes
- **Commit frequently** — one commit per task
- **Verify before Archive** — the verification report and gates must pass

## Skills

After `driv init`, Driv skills are installed into the `.opencode/skills/` directory:

### Driv Workflow Skills

| Skill              | Description                                                            |
| ------------------ | --------------------------------------------------------------------- |
| `/driv`            | Main entry — shows the current change, phase, and recommended next step |
| `/driv-clarify`    | Phase 1: explore and clarify (proposal, OpenSpec metadata)            |
| `/driv-design`     | Phase 2: design and plan (brainstorming, design doc, handoff)        |
| `/driv-build`      | Phase 3: build and implement (plan, coding, Clean Code)               |
| `/driv-verify`     | Phase 4: verify and test (build, test, verification report)           |
| `/driv-archive`    | Phase 5: archive (Delta Spec merge, archive)                         |
| `/driv-review`     | Review helpers (requirement review, technical review, code review)    |
| `/driv-cleancode`  | Clean Code check (six-dimension scoring)                             |

### Guard and Automation Scripts

| Script                | Purpose                                                                   |
| --------------------- | ------------------------------------------------------------------------ |
| `driv-env.sh`         | Script discovery helper — exports project root, OpenSpec dir, config dir |
| `driv-env-template.sh`| Environment variable template                                            |
| `driv-state.sh`       | Unified state management — init/set/get/check                            |
| `driv-guard.sh`       | Phase transition guard — validates exit conditions                       |
| `driv-handoff.sh`     | Design handoff — generates context package with SHA256 tracing           |
| `driv-archive.sh`     | One-command archive — validates state, copies artifacts, updates state   |
| `driv-review.sh`      | Review management — create, submit, check reviews                        |
| `driv-cleancode.sh`   | Clean Code check entry                                                   |
| `driv-validate.sh`    | Full validation suite — structure, commands, scripts, tests              |

## State Management

Driv uses a decoupled state architecture where `.driv.yaml` independently manages workflow state:

```yaml
change: feature-user-auth
workflow: full
phase: build
created_at: 2026-06-28
openspec:
  change_dir: openspec/changes/feature-user-auth
  proposal: openspec/changes/feature-user-auth/proposal.md
  design: openspec/changes/feature-user-auth/design.md
  tasks: openspec/changes/feature-user-auth/tasks.md
phases:
  clarify:
    status: completed
    artifacts:
      proposal: openspec/changes/feature-user-auth/proposal.md
  design:
    status: completed
    artifacts:
      design: openspec/changes/feature-user-auth/design.md
      tasks: openspec/changes/feature-user-auth/tasks.md
  build:
    status: in_progress
    artifacts:
      plan: docs/superpowers/plans/2026-06-28-user-auth.md
  verify:
    status: pending
  archive:
    status: pending
build_mode: subagent-driven-development
tdd_mode: tdd
isolation: branch
verify_mode: light
verify_result: pending
hw_process:
  requirement_review: pending
  technical_review: pending
  code_review: pending
context_compression: off
archived: false
```

### Phase Transition Rules

The state machine only allows strict sequential transitions:
`clarify → design → build → verify → archive`. Skipping and rollback are not supported.

## Phase Guards

Each phase has hard check rules at both entry and exit:

| Phase Exit | Check Conditions                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------ |
| Clarify    | proposal.md exists, .openspec.yaml exists                                                              |
| Design     | design.md exists, handoff is valid, technical review passed                                            |
| Build      | plan exists, mode selected, code committed, tests passed, Clean Code passed, code review passed        |
| Verify     | verification report exists, branch handling done                                                       |
| Archive    | change moved to archive, spec merged                                                                   |

## Template System

Default templates live in `.driv/templates/`:

| Type       | Templates                                                                              |
| ---------- | -------------------------------------------------------------------------------------- |
| proposals  | default, feature, bugfix, refactor, config, docs                                        |
| designs    | default, feature, architecture, interface, performance                                  |
| specs      | default, capability, api, component, service                                           |
| reviews    | requirement-review, technical-review, code-review                                       |

### 4-Layer Template Stack

Template lookup follows a 4-layer stack, from highest to lowest priority:

| Layer       | Path                                                          | Description                                                        |
| ----------- | ------------------------------------------------------------- | ------------------------------------------------------------------ |
| Override    | `.driv/templates/custom/<category>/<name>.md`                 | Project-level custom templates                                     |
| Preset      | `.driv/templates/presets/<preset_name>/<category>/<name>.md`  | Preset suites, enabled via `presets.active` in `config.yaml`       |
| Extension   | (based on frontmatter `extends:` field)                       | Automatically inherits parent template declared in frontmatter     |
| Core        | `.driv/templates/<category>/<name>.md`                        | Built-in default templates                                         |

### Placeholders

Supports `{{name}}` and `{{name:default}}` syntax for template parameter substitution.

- `{{name}}` — placeholder without default value
- `{{name:default}}` — placeholder with default value
- Allowed character set for names: `[a-z_0-9]`

### Inheritance Strategies

Supports section-level template inheritance with 8 strategies:

| Strategy  | Behavior                                                                        |
| --------- | ------------------------------------------------------------------------------- |
| `extend`  | Parent template content prepended to child (parent frontmatter preserved)        |
| `override`| Replace parent section of the same name with child's specified section           |
| `merge`   | Merge content and children of parent and child (no duplicates at same level)     |
| `add`     | Add when parent does not have the section (preserve original level)              |
| `replace` | Fully replace the parent's specified section                                     |
| `prepend` | Prepend child section content before parent's corresponding section content      |
| `append`  | Append child section content after parent's corresponding section content        |
| `wrap`    | Replace `{{CORE_TEMPLATE}}` placeholder in child with parent section content     |

### Multi-level Inheritance

Supports full multi-level inheritance chains, e.g. `default <- feature <- feature-v2`:

- Configured via `inheritance.rules` in `config.yaml`
- Or implicitly declared via the `extends:` field in child template frontmatter
- Automatic cycle detection (prevents A→B→A infinite loops)
- Merged from the topmost parent down to the child level by level

```yaml
inheritance:
  rules:
    - parent: default
      child: feature
    - parent: feature
      child: feature-v2
```

### Frontmatter Metadata

Templates support frontmatter (YAML format) declarations:

- `extends: <parent_name>` — implicit inheritance declaration
- `placeholders_required: [name1, name2]` — required placeholder declarations (checked during validation, supports `{{name:default}}` form)

```yaml
---
extends: feature
placeholders_required: [author, version]
---
```

### Custom Search Paths

`project_override.search_paths` in `config.yaml` supports flexible path configuration:

- `.driv/templates/custom` — generic custom directory
- `.driv/templates/proposals/custom/` — type-specific custom directory
- `custom/{category}` — uses `{category}` placeholder

```yaml
project_override:
  search_paths:
    - .driv/templates/custom
    - .driv/templates/proposals/custom/
    - custom/{category}
```

## Clean Code Check

Six-dimension weighted scoring:

| Dimension       | Weight | Rule                                                              |
| --------------- | -----: | ----------------------------------------------------------------- |
| Naming          | 15%   | PascalCase classes, camelCase variables/functions                  |
| Function design | 25%   | function length ≤50 lines, parameters ≤5, cyclomatic complexity ≤10 |
| Code structure  | 20%   | class length ≤500 lines, nesting depth ≤4 levels                   |
| Comments        | 15%   | public API comments, complex logic comments                       |
| Error handling  | 15%   | no empty catch, explicit error messages                            |
| Security        | 20%   | no hardcoded secrets, input validation                            |

Pass condition: total score ≥80 with no critical issues.

## Project Structure

```
your-project/
├── .driv/
│   ├── config.yaml              # Project-level global config
│   ├── scripts/                 # Guard and automation scripts
│   │   ├── driv-env.sh
│   │   ├── driv-state.sh
│   │   ├── driv-guard.sh
│   │   ├── driv-handoff.sh
│   │   ├── driv-archive.sh
│   │   ├── driv-review.sh
│   │   ├── driv-cleancode.sh
│   │   └── driv-validate.sh
│   └── templates/               # Template files
│       ├── config.yaml
│       ├── proposals/
│       ├── designs/
│       ├── specs/
│       └── reviews/
├── .opencode/
│   └── skills/
│       ├── driv/SKILL.md
│       ├── driv-clarify/SKILL.md
│       ├── driv-design/SKILL.md
│       ├── driv-build/SKILL.md
│       ├── driv-verify/SKILL.md
│       ├── driv-archive/SKILL.md
│       ├── driv-review/SKILL.md
│       ├── driv-cleancode/SKILL.md
│       ├── openspec-*/SKILL.md
│       └── brainstorming/SKILL.md
├── openspec/                    # OpenSpec — WHAT
│   ├── changes/
│   │   └── <name>/
│   │       ├── .driv.yaml           # Workflow state
│   │       ├── .driv/handoff/       # Handoff package
│   │       ├── proposal.md
│   │       ├── design.md
│   │       ├── specs/<capability>/spec.md
│   │       ├── tasks.md
│   │       └── reviews/             # Review documents
│   └── archive/                 # Archived changes
└── docs/superpowers/            # Superpowers — HOW
    └── plans/                   # Implementation plans
```

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution workflow, commit conventions, and the PR process.

## License

[MIT](LICENSE)
