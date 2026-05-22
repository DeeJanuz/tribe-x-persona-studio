# Plugin Extraction Plan

## Goal

Package Persona Studio as a public MCPViews plugin without changing the installed authoring experience in any meaningful way.

## Working Assumptions

- MCPViews remains the open-source host platform
- Persona Studio is distributed as a public plugin repository
- MCPViews can gain generic plugin host capabilities where needed
- The plugin should be discoverable through the MCPViews built-in registry flow

## Workstreams

### 1. Host Platform Updates

- Replace AI-specific chrome with generic plugin-registered header actions
- Add a plugin-owned sidebar mount for persistent workspace experiences
- Support plugin-shipped stylesheets and chrome metadata in the manifest
- Preserve generic local MCP tool bridge access for advanced plugins

### 2. Plugin Extraction

- Keep the Persona Studio renderer in this repo
- Use MCPViews first-party AI configuration for hosted backend access
- Package the plugin for registry install as a public distribution artifact

### 3. Migration Safety

- Keep the installed AI button, sidebar, thread flow, and artifact behavior intact
- Remove MCPViews core AI code only after the plugin reaches parity
- Migrate tests and docs alongside the extracted implementation

## Immediate Deliverables

- Repository scaffold
- DecidR project and decision
- Ludflow planning document linked to the DecidR records
- Follow-up implementation thread
