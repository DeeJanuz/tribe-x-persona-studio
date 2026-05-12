<!-- mcpviews-rules-version: 5 -->

# AGENTS.md

This project inherits the global Codex rules from `/Users/daenonjanis/AGENTS.md` and `/Users/daenonjanis/projects/AGENTS.md`.

## MCPViews Session Startup

IMPORTANT: At the start of every conversation, chat session, interaction, project, folder, or task, call the `init_session` MCP tool with `agent_type: "codex"` before choosing other MCP, app, plugin, or skill workflows.

This is a global Codex rule. It applies across every workspace, including DecidR, Ludflow, Notion, Stripe, and local coding tasks. Initialize MCPViews first so the current renderer definitions, plugin rules, auth status, org tokens, and available tools are loaded before interpreting the user's request.

## Ludflow Decision Graph Planning Lifecycle

Whenever an agent writes a plan for implementing a new feature, refactoring existing code, fixing a bug, updating documentation, or doing any other substantial work in this codebase, it must create a new relevant Ludflow document or update the existing relevant Ludflow document in the Tribe-X DecidR organization.

The Ludflow document should be linked to the relevant DecidR project or decision so the decision graph stays current. Prefer updating an existing document when one already captures the same project, decision, or workstream; create a new document only when no relevant document exists.

Plan documents should capture the intent, scope, affected systems, important decisions, implementation steps, validation approach, and current status. If the work changes direction, update the same document rather than letting the decision graph drift.

When the planned work is complete, update the Ludflow document with a new version that records what was implemented, final decisions, validation results, and any follow-up work. Mark or publish the document as implemented and published so the Tribe-X DecidR project or decision reflects the completed state.

## Release And Registry Maintenance

`bash build.sh` is the canonical release-package command. It reads `manifest.json.version`, rewrites `manifest.json.download_url` to `https://github.com/deejanus/tribe-x-ai-plugin/releases/download/{version}/tribe-x-ai-plugin.zip`, and produces `release/tribe-x-ai-plugin.zip` containing `manifest.json`, `renderers/`, and `tools/`.

When preparing a version update:

1. Bump `manifest.json.version`.
2. Add concise user-facing notes under `RELEASE_NOTES.md` `# Unreleased`.
3. Run `bash build.sh` so `download_url` is synchronized and a release package exists.
4. Validate renderer/tool syntax before publishing.
5. Keep `../mcpviews/registry/registry.json` pointed at the repository `manifest_url`; avoid copying every new version into the registry unless registry metadata itself changes.

Release candidates should use SemVer prerelease suffixes such as `0.1.17-rc.1`. The GitHub Actions release workflow treats versions containing `-` as prereleases and clears `RELEASE_NOTES.md` after publishing. Keep `docs/release-strategy.md` aligned when changing the release process.
