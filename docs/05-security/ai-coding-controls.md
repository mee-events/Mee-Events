# AI coding controls (Mee Events)

Company bar: **security/IP > consistency > memory > token cost**.

## Phase 1 — required org controls

Complete these in Cursor (or your chosen Enterprise agent) outside the repo:

1. Use **Cursor Teams or Enterprise** (not a personal-only plan) for Mee Event work.
2. Enable **Privacy Mode** and **enforce** it so members cannot disable it.
3. Restrict corporate devices to company team accounts (Allowed Team IDs / equivalent).
4. Prefer frontier models for product code; do not route Mee Event source through free-tier aggregators.
5. Keep MCP servers on an allowlist (below). Disable everything unused.

Alternatives with comparable enterprise posture: Claude for Enterprise, GitHub Copilot Business/Enterprise — same rules: no-training/ZDR enforceable, SSO when available.

## Repo controls (committed)

| Control | Location |
| --- | --- |
| Context exclusion | [`.cursorignore`](../../.cursorignore) |
| Agent briefing | [`AGENTS.md`](../../AGENTS.md) |
| Cursor rules | [`.cursor/rules/`](../../.cursor/rules/) |
| Secrets policy | [`secrets.md`](./secrets.md) |

## MCP allowlist

Default posture: **deny by default**.

| Status | Server / tool |
| --- | --- |
| Allowed (Phase 2) | `lean-ctx` (local context compression + PathJail) after install |
| Allowed when needed | Project-approved browser/devtools MCP for explicit UI verification only |
| Banned for company code | FreeLLMAPI, OpenRouter free routes, any public tunnel to free LLM proxies |
| Banned | Unreviewed community MCP servers that can read the full tree or exfiltrate secrets |

Project file [`.agents/mcp_config.json`](../../.agents/mcp_config.json) should stay minimal. Prefer Cursor user MCP config for `lean-ctx` (installed by `lean-ctx init --agent cursor`).

## Phase 2 — LeanCTX

Installed locally (`lean-ctx` 3.9.17 via https://leanctx.com/install.sh).
Cursor integration verified: MCP (`~/.cursor/mcp.json`), hooks, project
`.cursor/rules/lean-ctx.mdc`, and `AGENTS.md` lean-ctx block.

```sh
# Re-verify anytime
export PATH="$HOME/.local/bin:$PATH"
lean-ctx doctor integrations
lean-ctx doctor
```

**Fully restart Cursor** after install/update so MCP + hooks reload.
Prefer `ctx_read` / `ctx_search` / `ctx_shell` / `ctx_tree` (shadow mode may auto-route).

LeanCTX is local-first (PathJail, shell gating, secret redaction). It does **not** replace Enterprise Privacy Mode.

## Explicit bans

- FreeLLMAPI / stacked free-tier proxies for Mee Event repositories.
- Pasting production secrets, OTP codes, customer PII, or live payment credentials into any agent.
- Committing `.env` values or keystores.

## Token hygiene (daily)

- New chat per task; avoid mega-threads.
- `@`-mention files; avoid reflexive `@codebase`.
- Check Cursor context ring; prune unused MCP/skills.
- Keep `AGENTS.md` and always-on rules short; put detail in `docs/`.
