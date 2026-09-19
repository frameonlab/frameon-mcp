# @frameon/mcp-connect

Adds the [FrameOn MCP server](https://app.frameonlab.com/mcp) to Claude Desktop,
Cursor or Windsurf without hunting for the config file.

```bash
npx @frameon/mcp-connect
```

No API key: the server speaks OAuth 2.1 with Dynamic Client Registration, so
the client registers itself and the first call opens an approval page.

```bash
npx @frameon/mcp-connect --print            # show the config, change nothing
npx @frameon/mcp-connect --client=cursor    # one client, even if not detected
```

Using Claude Code? You do not need this:

```bash
claude mcp add --transport http frameon https://api.frameonlab.com/api/v1/mcp
```

An existing config is backed up to `<file>.bak` before it is touched, and a
client that is not installed is left alone.
