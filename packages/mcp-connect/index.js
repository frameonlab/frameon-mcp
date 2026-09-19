#!/usr/bin/env node
"use strict";

/**
 * Adds the FrameOn MCP server to whichever mcpServers-style client is
 * installed on this machine.
 *
 * There is no token to paste: the server speaks OAuth 2.1 with DCR, so the
 * client registers itself and opens a browser on first use. All this script
 * does is put the endpoint in the right file — which is the part people
 * actually get wrong, because every client keeps it somewhere else.
 *
 * Nothing is written without being printed first, and an existing config is
 * copied to <file>.bak before it is touched.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");

const ENDPOINT =
  process.env.FRAMEON_MCP_URL || "https://api.frameonlab.com/api/v1/mcp";
const KEY = "frameon";

const HOME = os.homedir();
const targets = [
  {
    id: "claude-desktop",
    label: "Claude Desktop",
    file:
      process.platform === "darwin"
        ? path.join(HOME, "Library/Application Support/Claude/claude_desktop_config.json")
        : process.platform === "win32"
          ? path.join(process.env.APPDATA || "", "Claude/claude_desktop_config.json")
          : path.join(HOME, ".config/Claude/claude_desktop_config.json"),
  },
  { id: "cursor", label: "Cursor", file: path.join(HOME, ".cursor/mcp.json") },
  { id: "windsurf", label: "Windsurf", file: path.join(HOME, ".codeium/windsurf/mcp_config.json") },
];

const args = process.argv.slice(2);
const has = (f) => args.includes(f);

if (has("--help") || has("-h")) {
  console.log(`
  frameon-mcp-connect — add the FrameOn MCP server to your AI client

    npx @frameon/mcp-connect              detect clients and write the config
    npx @frameon/mcp-connect --print      print the config, write nothing
    npx @frameon/mcp-connect --client=cursor

  Endpoint: ${ENDPOINT}   (override with FRAMEON_MCP_URL)
  Docs:     https://app.frameonlab.com/mcp
`);
  process.exit(0);
}

const entry = { type: "http", url: ENDPOINT };

if (has("--print")) {
  console.log(JSON.stringify({ mcpServers: { [KEY]: entry } }, null, 2));
  console.log("\nClaude Code, one line:");
  console.log(`  claude mcp add --transport http ${KEY} ${ENDPOINT}`);
  process.exit(0);
}

const only = (args.find((a) => a.startsWith("--client=")) || "").split("=")[1];
const chosen = only ? targets.filter((t) => t.id === only) : targets;

if (only && chosen.length === 0) {
  console.error(`unknown client "${only}" — known: ${targets.map((t) => t.id).join(", ")}`);
  process.exit(1);
}

let wrote = 0;
for (const t of chosen) {
  const exists = fs.existsSync(t.file);
  if (!exists && !only) continue; // do not invent config for a client that is not installed

  let cfg = {};
  if (exists) {
    try {
      cfg = JSON.parse(fs.readFileSync(t.file, "utf8") || "{}");
    } catch (err) {
      console.error(`  ! ${t.label}: ${t.file} is not valid JSON — skipped (${err.message})`);
      continue;
    }
    fs.copyFileSync(t.file, t.file + ".bak");
  }

  cfg.mcpServers = cfg.mcpServers || {};
  if (JSON.stringify(cfg.mcpServers[KEY]) === JSON.stringify(entry)) {
    console.log(`  = ${t.label}: already configured`);
    continue;
  }

  cfg.mcpServers[KEY] = entry;
  fs.mkdirSync(path.dirname(t.file), { recursive: true });
  fs.writeFileSync(t.file, JSON.stringify(cfg, null, 2) + "\n");
  console.log(`  + ${t.label}: ${t.file}${exists ? " (backup at .bak)" : ""}`);
  wrote++;
}

if (wrote === 0 && !only) {
  console.log("  No supported client config found on this machine.\n");
  console.log("  Paste this yourself:\n");
  console.log(JSON.stringify({ mcpServers: { [KEY]: entry } }, null, 2));
  console.log("\n  Or, for Claude Code:");
  console.log(`    claude mcp add --transport http ${KEY} ${ENDPOINT}\n`);
  process.exit(0);
}

console.log("\n  Restart the client. The first FrameOn call opens an approval page in your browser.");
