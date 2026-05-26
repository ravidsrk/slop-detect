# Agent Skills

This directory ships [Agent Skills](https://agentskills.io) — portable, agent-agnostic capability packages — for the `slop-detect` API.

| Skill | What it does |
|---|---|
| [`slop-detect/`](./slop-detect/) | Scan any URL for the 16-rule AI-design-slop fingerprint and generate a fix prompt |

## Install

Agent Skills are an open format ([agentskills.io](https://agentskills.io)) supported by Claude Code, Cursor, Gemini CLI, OpenAI Codex, VS Code (GitHub Copilot), Roo Code, JetBrains Junie, and 20+ other agents. The skill is a single `SKILL.md` file — installation is just dropping it into your agent's skill directory.

### Claude Code

```bash
mkdir -p ~/.claude/skills
git clone --depth 1 https://github.com/ravidsrk/slop-detect /tmp/slop-detect
cp -r /tmp/slop-detect/skills/slop-detect ~/.claude/skills/
```

Restart Claude Code. Ask: *"Score https://your-site.com for AI design slop."*

### Cursor

```bash
mkdir -p .cursor/skills
git clone --depth 1 https://github.com/ravidsrk/slop-detect /tmp/slop-detect
cp -r /tmp/slop-detect/skills/slop-detect .cursor/skills/
```

### VS Code (GitHub Copilot)

```bash
mkdir -p .github/copilot/skills
git clone --depth 1 https://github.com/ravidsrk/slop-detect /tmp/slop-detect
cp -r /tmp/slop-detect/skills/slop-detect .github/copilot/skills/
```

### Generic (any spec-compliant agent)

The skill follows [agentskills.io/specification](https://agentskills.io/specification). Copy the `slop-detect/` directory anywhere your agent loads skills from.

## What activates it

Any of these in a user prompt will trigger the skill:

- "Score this landing page" / "audit this URL"
- "Is this AI-generated?" / "does this look like v0/Cursor/Lovable?"
- "Fix my landing page" / "make my hero less generic"
- "Detect design slop" / "v0 detector"
- A bare URL pasted with "what do you think?"

## License

[MIT](../LICENSE)
