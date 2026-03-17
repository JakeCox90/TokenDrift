# Project — Claude Code Agent Instructions

## Project Overview
You are part of a multi-agent AI system building **TokenDrift** — a Figma plugin that detects design token drift across theme files.
Quality, security, and correctness are non-negotiable.

## Tooling
- **GitHub**: All code, PRs, issues, ADRs
- **Linear**: ALL tasks must exist in Linear before work begins (team key: `TOK`)
- **Markdown docs**: Status updates, decision log, gate documents — all in `docs/`

## Agent Instructions
Each agent has its own CLAUDE.md in agents/{role}/. Read yours before starting work.
- Orchestrator: agents/orchestrator/CLAUDE.md + CLAUDE-orchestrator.md (opus)
- PM: agents/pm/CLAUDE-pm.md (sonnet)
- Architect: agents/architect/CLAUDE-architect.md (opus)
- Plugin Dev: agents/plugin-dev/CLAUDE-plugin-dev.md (sonnet)
- QA: agents/qa/CLAUDE-qa.md (sonnet)
- Refactor: agents/refactor/CLAUDE-refactor.md (sonnet)

## Key Docs
- Agent operating principles: docs/agent-operating-principles.md
- Golden principles: docs/golden-principles.md
- ADRs: docs/adr/
- PRDs: docs/prd/
- Active plans: docs/plans/active/
- Decision log: docs/decisions/
- Status updates: docs/status/

## Non-Negotiable Rules

### Before Starting ANY Task
1. Find the Linear task — if it doesn't exist, create it
2. Move Linear task to "In Progress"
3. Read `docs/agent-coordination.md` — check for conflicts with other active agents
4. Update `docs/agent-coordination.md` with your ticket, branch, and key files
5. Create a feature branch: `feature/TOK-{id}-{short-description}`
6. Read relevant PRD before writing any code

### Completing Work
1. All code changes go via Pull Request — NEVER push directly to main
2. PR template must be filled out completely
3. CI must pass before requesting review
4. Move Linear task to "In Review" when PR is raised
5. **NEVER move a task to "Done"** — only the human owner marks tasks Done after review. Agents move tasks to "In Review" only.

### Gate Decisions
If you encounter a decision marked GATE:
- STOP — do not make the decision yourself
- Write a markdown file in `docs/gates/`: `GATE-{N}-{title}.md`
- Create a Linear task assigned to the human owner
- Continue with other unblocked work while waiting

### Escalation Triggers (always escalate)
- Any decision with cost implications
- Legal or compliance questions
- Changes to core business rules or domain logic
- Any security concern
- Figma Community submission decisions

## Architecture Principles
- Correctness over speed — diff engine logic must be bulletproof
- Pure functions where possible — diff engine has no Figma dependencies
- Hybrid API approach — Plugin API for current file, REST API for external files
- No secrets in source code — PAT stored in Figma `clientStorage` only

## Branch Strategy
- main — production, protected, requires 1 approval
- feature/* — all feature work
- fix/* — bug fixes
- chore/* — non-feature changes

## Current Phase
Read `docs/plans/active/` for current execution plans and phase status.

## Behaviour Rules
- Never ask for yes/no confirmation — proceed with the most conservative, reversible option
- Never ask "should I proceed?" — proceed
- Never present options and wait — pick the safest option, document the decision, move on
- When in doubt, choose the option that is easiest to undo
- Only stop for: missing credentials, GATE decisions, irreversible financial or legal actions
