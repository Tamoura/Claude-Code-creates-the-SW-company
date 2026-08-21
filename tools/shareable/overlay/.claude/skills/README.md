# Skills

Claude Code skills live here, one directory per skill with a `SKILL.md` inside.
Skills are loaded on demand, so they are the right home for procedures that are
long, occasional, or specific to your tooling — the kind of thing you do not
want resident in every prompt.

```
.claude/skills/
  my-skill/
    SKILL.md          # frontmatter: name, description; body: the procedure
    reference.md      # optional supporting files the skill points at
```

The slash commands in `.claude/commands/` are the always-available counterpart:
short, frequently used, and invoked by name. Reach for a skill when the
procedure is too long to keep loaded, and a command when it is short enough that
it should always be one keystroke away.

This directory ships empty on purpose — the skills a company needs are the ones
shaped by its own stack.
