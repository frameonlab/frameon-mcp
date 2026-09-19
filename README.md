# FrameOn MCP

**MCP server for agentic project management.** Tasks, documents, decisions and
time in one shared team context, reachable by an AI agent over the Model
Context Protocol.

This repository holds the **public surface** of that server: the protocol
types, the guide the server serves to connected clients, the skill playbooks,
and the published manifest. The server itself is hosted — you do not run it.

| | |
| --- | --- |
| **Endpoint** | `https://api.frameonlab.com/api/v1/mcp` |
| **Transport** | `streamable-http` |
| **Auth** | OAuth 2.1 — Dynamic Client Registration, PKCE (S256) required |
| **Tools** | 20 (13 read-only, 7 write) — see [docs/tools.md](docs/tools.md) |
| **Registry** | [`com.frameonlab/frameon`](https://registry.modelcontextprotocol.io/v0/servers?search=frameon) |
| **Docs** | https://app.frameonlab.com/mcp |

## Why this exists

An AI assistant asked to help with a project normally works from whatever got
pasted into the chat. It cannot see what was decided three weeks ago, which
constraint someone stated in a meeting, or who is already on the task. So it
guesses, confidently, and a human spends the afternoon correcting it.

FrameOn exposes the project itself: the task tree, the wiki where decisions
live, a separate project memory holding conventions and traps, the team, the
alerts and the time log. The agent reads the real state, writes back what it
did, and the next agent — on another machine, in another client — finds it
there.

## Connect

### Claude Code

```bash
claude mcp add --transport http frameon https://api.frameonlab.com/api/v1/mcp
```

### Claude Desktop, Cursor, and other `mcpServers` clients

```json
{
  "mcpServers": {
    "frameon": {
      "type": "http",
      "url": "https://api.frameonlab.com/api/v1/mcp"
    }
  }
}
```

### ChatGPT

Add a connector pointing at the same URL. The OAuth flow runs in the browser;
no key is pasted anywhere.

There is no API key in any of these. The first call opens an authorisation
screen, a human approves the workspace, and the client stores a token it
rotates on its own. A Personal Access Token also works, as
`Authorization: Bearer …`, for scripted use where no browser exists.

More, including a per-client walkthrough: https://app.frameonlab.com/mcp

## What the agent gets

Connect and call `frameon://guide`. The server hands back a written briefing —
what FrameOn is, which tool answers which question, the traps that cost a
round-trip, and, just as importantly, **what FrameOn has that the agent does
not**: the Gantt, the approval step on timesheets, the financial reports. A
tool that refuses to say where its edges are gets improvised around, badly.

## Scope of this repository

| Path | What it is |
| --- | --- |
| `src/mcp.types.ts` | JSON-RPC 2.0 envelope types and the protocol versions the server echoes |
| `src/mcp-guide.ts` | the text served at `frameon://guide`, plus the prompt specs |
| `src/mcp-skills.ts` | the skill playbooks behind `list_skills` / `get_skill` |
| `server.json` | the manifest published to the MCP registry |
| `docs/tools.md` | the 20 tools, with the descriptions the server advertises |
| `examples/` | client configuration, ready to paste |

The service implementation, the database and the tenant layer are not here and
are not open source. What is here is what a client talks to and what an agent
reads — enough to know exactly what you are connecting to before you connect.

## Security

The endpoint is multi-tenant and every query filters by tenant. A credential
reaches the projects its role reaches and nothing else; `tenant_id` never
appears in a tool response. Write tools are gated per call, on the scope and
the role carried by the credential — never on anything sent in the request
body.

Found something that looks wrong? `seguranca@frameonlab.com`. Please do not
open a public issue for a suspected vulnerability.

## Licence

MIT — see [LICENSE](LICENSE).
