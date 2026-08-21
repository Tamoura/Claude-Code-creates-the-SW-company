# Contributing

Thanks for considering it. This repository is a framework other teams fork, so
the bar for changes is "does this make someone else's fork better", not "does
this suit my company".

## What is most useful

| Contribution | Why it helps |
|--------------|--------------|
| Agent definitions that produce better output | The definitions are where quality actually comes from |
| New quality gates with a script that can fail CI | Enforcement beats documentation |
| Protocol improvements backed by a before/after | Context engineering claims need evidence |
| Fixes to the demo product | It is the reference every fork copies |
| Adapters for other coding agents | Portability is a goal, not an accident |

## What is unlikely to be merged

- Company-specific rules. Fork and amend your own constitution instead.
- New agents that overlap an existing role. Sharpen the existing definition.
- Extra dependencies in the framework layer. Bash, markdown and YAML travel
  everywhere; a Node dependency in an enforcement script does not.
- Documentation without the change it documents.

## Working agreement

This repository follows its own constitution. That applies to contributions too:

1. **Spec first for anything non-trivial.** Open an issue describing the problem
   before the pull request describing the solution.
2. **Traceable commits.** `feat`, `fix`, `refactor` and `test` commits name the
   issue or requirement they serve:
   `feat(gates): add bundle-size gate [#42]`.
3. **Tests with behaviour changes.** Changes to `products/taskflow` or
   `packages/` come with tests; changes to scripts come with a demonstration of
   the failure they prevent.
4. **Diagrams over prose** where a diagram is clearer (Article IX).

## Local checks before pushing

```bash
pnpm install
git config core.hooksPath .githooks

.claude/scripts/ci-preflight.sh                  # what CI will run
cd products/taskflow && pnpm test                # demo product still green
bash tools/shareable/make-shareable.sh --verify  # only if you changed the tooling
```

## Pull requests

- One concern per pull request.
- Say what a fork inherits from the change — that is the part reviewers cannot
  infer from the diff.
- If you changed an agent definition, include a short before/after of the output
  it produces. Definitions are prompts; their effect is empirical.

## Reporting problems

Include the repository state, the command you ran, and what you expected. For
agent behaviour, include the prompt and the output — "the agent did the wrong
thing" is not reproducible without both.
