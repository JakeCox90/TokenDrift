# TokenDrift — Agent Entry Point
> This file is a MAP. It points you to docs/. It does not repeat what docs/ contains.
> Keep this file under 120 lines. If adding content here, ask: does this belong in docs/ instead?

## What This Project Is
TokenDrift is a Figma plugin that detects design token drift across theme files. TypeScript. Preact UI. Figma Plugin API + REST API hybrid.
Human owner is the team manager and sole gate approver. Agents execute. Humans steer.

## Read Before Anything Else
| If you are...                      | Read first |
|------------------------------------|---|
| Starting any session               | `docs/plans/active/` — find your current execution plan |
| Making an architecture decision    | `docs/adr/` — check if it's already decided |
| Building any feature               | `docs/prd/` — find the PRD and acceptance criteria |
| Unsure about a pattern             | `docs/golden-principles.md` |
| Unsure about process               | `docs/agent-operating-principles.md` — this is the authority |

## The 5 Rules That Override Everything
1. **If it's not in docs/, it doesn't exist.** Context in chat or someone's head is invisible to you.
2. **Failing CI = PR does not merge.** No exceptions.
3. **GATE decisions = stop and escalate.** Never guess on decisions marked GATE.
4. **Plugin API code = test thoroughly.** Figma sandbox has no debugger — get it right.
5. **Struggling = fix the environment first.** Missing tool/doc/guardrail beats re-prompting.

## Task Flow (every task, every time)
```
Find/create Linear task → In Progress
→ Read PRD + active execution plan
→ Branch: feature/TOK-{id}-{desc}
→ Build → CI passes → PR with template
→ Move Linear to In Review
→ Agent-to-agent review (QA + specialist)
→ Human review only if required (see docs/agent-operating-principles.md §5.3)
→ Merge → Linear Done
```

## Repo Structure
```
/
├── src/
│   ├── code.ts                    # Figma plugin sandbox
│   └── ui/
│       ├── App.tsx                # Preact UI root
│       ├── components/            # UI components
│       ├── api/                   # REST API client for external files
│       ├── diff/                  # Comparison/diff engine (pure logic)
│       └── types.ts               # Shared type definitions
├── dist/
│   ├── code.js                    # Built sandbox
│   └── ui.html                    # Built UI
├── docs/
│   ├── adr/                       # Architecture decisions
│   ├── prd/                       # Feature requirements + acceptance criteria
│   ├── plans/active/              # Execution plans in flight
│   ├── plans/completed/           # Completed plans — never delete
│   ├── quality/                   # Coverage, quality scores
│   ├── status/                    # Session status updates
│   ├── decisions/                 # Decision log
│   ├── gates/                     # Gate preparation documents
│   └── golden-principles.md       # Encoded human taste — must follow
├── agents/                        # Per-agent CLAUDE.md files
├── manifest.json                  # Figma plugin manifest
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
└── CLAUDE.md                      # Root project instructions
```

## Branch Naming
- `main` — production, protected, 1 human approval
- `feature/TOK-{id}-{desc}` | `fix/TOK-{id}-{desc}` | `chore/TOK-{id}-{desc}`

## Current Phase
See `docs/plans/active/phase-1-mvp.md`
