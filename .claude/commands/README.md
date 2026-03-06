# .claude/commands — Slash Command Definitions

Each `.md` file here defines a slash command that Claude Code can invoke.

## Naming Convention

Commands exist in two forms — both invoke the same underlying logic:

| Form | Example | When to use |
|------|---------|-------------|
| `[name].md` | `orchestrator.md` | Within a ConnectSW repository context |
| `connectsw-[name]` (skill) | `connectsw-orchestrator` skill | When invoked from a global/external context |

The `connectsw-*` prefixed skills (defined in `~/.claude/skills/` or via the skills system) are global aliases for the same commands. If you see both `orchestrator` and `connectsw-orchestrator`, they do the same thing — the `connectsw-` prefix disambiguates when working outside the repo.

## Command Reference

| Command | Purpose | Agent |
|---------|---------|-------|
| `/orchestrator` | Route any CEO request | Orchestrator |
| `/speckit-specify` | Create feature spec from brief | Product Manager |
| `/speckit-clarify` | Resolve spec ambiguities | Product Manager |
| `/speckit-plan` | Create implementation plan | Architect |
| `/speckit-tasks` | Generate task list from plan | Orchestrator |
| `/speckit-analyze` | Validate spec/plan/tasks consistency | QA Engineer |
| `/audit` | Full product code audit (target: 8/10) | Code Reviewer |
| `/dashboard` | Executive dashboard | Orchestrator |
| `/status` | Quick status across products | Orchestrator |
| `/execute-task` | Execute a single task from task list | Specialist agent |
| `/code-reviewer` | Code review for a PR or file | Code Reviewer |
| `/security-scan` | Security scan for a product | Security Engineer |
| `/check-system` | System health check | Orchestrator |
| `/compliance-check` | Compliance audit | Security Engineer |
| `/i18n-check` | i18n/RTL completeness check | QA Engineer |
| `/pre-deploy` | Pre-deployment readiness check | DevOps Engineer |
| `/update-cc-data` | Update command-center data | Orchestrator |

## Adding New Commands

1. Create `[name].md` in this directory
2. The file should start with: `# [Command Name]`
3. Include: what the command does, which agent runs it, and `$ARGUMENTS` where CEO input is injected
4. If it should be available globally, create a matching skill via the skills system
