# Examples

## Claude Code

```bash
claude mcp add --transport http frameon https://api.frameonlab.com/api/v1/mcp
```

With a Personal Access Token instead of the browser flow:

```bash
claude mcp add --transport http frameon https://api.frameonlab.com/api/v1/mcp \
  --header "Authorization: Bearer \$FRAMEON_PAT"
```

## Claude Desktop

[`claude-desktop.json`](claude-desktop.json) — merge into
`claude_desktop_config.json`.

## Cursor

[`cursor.json`](cursor.json) — merge into `.cursor/mcp.json`.

## Anything else

Any client that speaks `streamable-http` works. Point it at
`https://api.frameonlab.com/api/v1/mcp` and let it run the OAuth flow.

## First call

```
tools/call  list_projects    → the projects this credential reaches
resources/read  frameon://guide  → how to use the rest without guessing
```

Omitting `project_id` on any project-scoped tool returns an error that lists
the reachable projects. That is on purpose: it is cheaper than a round-trip.
