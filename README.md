# Tribe-X AI Plugin

Closed-source Tribe-X AI plugin extracted from MCPViews core.

## Purpose

This repository will hold the plugin-owned implementation for the Tribe-X AI experience so MCPViews can remain open-source while the installed AI workflow continues to behave the same for users.

## Current Focus

- Define the plugin boundary between MCPViews core and the closed AI feature set
- Stand up the plugin repository and planning artifacts
- Extend Persona Studio into a save-first evaluation workspace for single-run and parallel persona testing
- Keep Persona Studio aligned with ProPaasAI-provided persona tooling metadata, including orchestration controls and dynamically discovered business tools

## Initial Scope

- Plugin-owned AI shell, thread renderer, and runtime UI
- Plugin-owned auth and hosted backend integration
- Plugin-owned Persona Studio authoring and evaluation workflows, including persisted parallel test batches and dynamic persona tool controls
- Plugin-owned planning and architecture records
- Coordination artifacts linked back to DecidR and Ludflow

## Planned Companion Documents

- [Plugin Extraction Plan](./docs/plugin-extraction-plan.md)
- [Architecture Decisions](./docs/architecture-decisions.md)
- [Enhancement Log](./docs/enhancements.md)
- [Test Index](./docs/test-index.md)
