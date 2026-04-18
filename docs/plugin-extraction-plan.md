# Plugin Extraction Plan

## Goal

Move the Tribe-X AI feature set out of MCPViews core and into a closed plugin without changing the installed user experience in any meaningful way.

## Working Assumptions

- MCPViews remains the open-source host platform
- The Tribe-X AI feature remains closed-source
- MCPViews can gain generic plugin host capabilities where needed
- The plugin should be discoverable through the MCPViews built-in registry flow

## Workstreams

### 1. Host Platform Updates

- Replace AI-specific chrome with generic plugin-registered header actions
- Add a plugin-owned sidebar mount for persistent workspace experiences
- Support plugin-shipped stylesheets and chrome metadata in the manifest
- Preserve generic local MCP tool bridge access for advanced plugins

### 2. Plugin Extraction

- Move AI shell, thread renderer, state, and runtime UI into this repo
- Rebuild auth and hosted backend access as plugin-owned integrations
- Package the plugin for registry install as a private distribution artifact

### 3. Migration Safety

- Keep the installed AI button, sidebar, thread flow, and artifact behavior intact
- Remove MCPViews core AI code only after the plugin reaches parity
- Migrate tests and docs alongside the extracted implementation

## Immediate Deliverables

- Repository scaffold
- DecidR project and decision
- Ludflow planning document linked to the DecidR records
- Follow-up implementation thread
