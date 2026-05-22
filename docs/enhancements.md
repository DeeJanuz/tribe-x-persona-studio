# Technical Debt & Enhancement Log

## Purpose
This document tracks technical debt items identified by the solid-reviewer agent. It maintains a persistent registry of issues to prioritize refactoring efforts.

## How to Use This Log
- **Review regularly** to plan refactoring efforts
- **Prioritize by severity** (Critical > High > Medium > Low)
- Items marked RESOLVED should be moved to the Resolved section
- The "Latest Session Summary" section is replaced after each solid-reviewer run

---

## Latest Session Summary

**Last Review:** 2026-05-12 — `db15993` (`Fix Add variable scroll anchoring in Persona Studio`)

No material findings were identified. The change keeps the custom-skill authoring behavior inside the existing Persona Studio renderer, with focused helpers for display names, serialization, validation, variable insertion, and scroll anchoring. Residual risk is UI-level only because the plugin repo still has no automated browser coverage for the inline custom-skill composer.

---

## Open Items

### Critical
_(none)_

### High
_(none)_

### Medium
_(none)_

### Low
_(none)_

---

## Resolved Items

### MED-001: Required model fallback is not marked dirty before save-first launches
**Status:** Resolved
**Found:** 2026-04-22 in `bb03f58`
**Resolved:** 2026-04-22
**File:** `renderers/persona-lab.js`

`ensureRequiredModelDefaults` now calls `updateDirtyState` after auto-filling `draft.modelPolicy.defaultModel`, so save-first test launches persist the displayed default model before creating runs.
