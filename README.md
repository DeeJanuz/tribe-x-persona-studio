# Tribe-X Persona Studio

Public MCPViews plugin for TribeX Persona Studio.

## Purpose

This repository packages the standalone Persona Studio renderer for MCPViews. It connects to the TribeX AI Cloudflare dev control plane through MCPViews first-party AI configuration and provides a consultant-scoped persona authoring workspace.

## Current Focus

- Keep Persona Studio as a consultant-only authoring surface for creating and editing consultant-owned personas
- Require the selected native AI organization to have kind `CONSULTANT`
- Launch save-first single-run and parallel persona tests in the selected consultant organization
- Keep Persona Studio aligned with TribeX AI persona tooling metadata, including orchestration controls, dynamically discovered business tools, and priced model catalog choices

## Initial Scope

- Persona Studio renderer (`persona_lab`)
- First-party AI control-plane requests through the MCPViews bridge
- Consultant-owned persona authoring and evaluation workflows
- Local deterministic relay-probe MCP tool for integration testing

## Planned Companion Documents

- [Plugin Extraction Plan](./docs/plugin-extraction-plan.md)
- [Architecture Decisions](./docs/architecture-decisions.md)
- [Enhancement Log](./docs/enhancements.md)
- [Test Index](./docs/test-index.md)
- [Release Strategy](./docs/release-strategy.md)

## Build

```bash
bash build.sh
```

The build reads `manifest.json.version`, synchronizes `manifest.json.download_url`, and writes `release/tribe-x-persona-studio.zip` for MCPViews registry installation.

## Release Notes

Keep `RELEASE_NOTES.md` current under `# Unreleased` whenever a change should appear in the GitHub release body or MCPViews update changelog. Bumping `manifest.json.version` on `master` triggers the release workflow; prerelease versions such as `0.1.1-rc.1` publish as GitHub prereleases.
