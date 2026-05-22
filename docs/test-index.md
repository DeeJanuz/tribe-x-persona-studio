# Test Suite Documentation

> **TEMPLATE:** This is a starter template. Content will be populated by the documentation updater agent after commits.

**Maintained by:** Documentation agent (automated)

This document maps all test files to their corresponding source code and describes what each test covers. Use this index to avoid duplicate test creation and identify testing gaps.

---

## Unit Tests

_(No tests yet. Tests will be documented here as they are created.)_

---

## Integration Tests

_(No tests yet. Tests will be documented here as they are created.)_

---

## E2E Tests

### MCPViews Relay Probe

- Tool key for Persona Studio registration: `tribe-x-persona-studio.relay-probe`
- Runtime relay tool name: `tribe_x_persona_studio__relay-probe`
- Local MCP endpoint: `http://127.0.0.1:4877/mcp`
- Start command from this repository: `node tools/relay-probe-server.mjs`
- Headless relay executor for `scripts/persona-dev-run.ts`: `tools/relay-probe-executors.mjs`

The probe echoes a caller-provided `marker` and optional `message`. Use it to validate that a consultant-owned MCPViews plugin tool can be registered in Persona Studio, selected on a persona, surfaced in the session-start relay catalog, and called through the desktop relay.
