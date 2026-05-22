# Architecture Decision Records (ADRs)

**Manually maintained by developers when making significant architectural decisions.**

This document records important architectural decisions, their context, and rationale.

---

## How to Use ADRs

When making a significant architectural decision:
1. Add a new entry below
2. Use the template format
3. Document context, decision, and consequences
4. Update status if decision is superseded

---

## ADR Template

```markdown
## ADR-XXX: [Decision Title]
**Date:** YYYY-MM-DD
**Status:** [Proposed | Accepted | Deprecated | Superseded by ADR-YYY]
**Deciders:** [Names or roles]

### Context
[What is the issue we're facing? What factors influence this decision?]

### Decision
[What did we decide? State clearly.]

### Rationale
[Why did we make this decision? What were the alternatives?]

### Consequences
**Positive:**
- [Good outcomes from this decision]

**Negative:**
- [Drawbacks or trade-offs]

**Neutral:**
- [Other changes or effects]
```

---

## Active Decisions

### ADR-005: Add a Persisted Parallel Evaluation Harness to Persona Lab
**Date:** 2026-04-17
**Status:** Proposed
**Deciders:** Tribe-X persona tooling team

#### Context
Persona Lab currently supports a save-first single test launch for file-backed personas. That is useful for validating one draft at a time, but it is too slow for the actual persona design workflow where we need to compare models, system prompts, and message prompts across multiple runs before deciding what should ship.

We need a first-phase evaluation harness that:
- launches multiple runs from one saved persona draft
- treats model comparisons and prompt A/B tests as first-class flows
- persists a batch record above individual runs so progress survives tab closure and reloads
- captures enough transcript and configuration metadata to support a later synthesis step

#### Decision
Extend Persona Lab with a persisted parallel evaluation harness.

The first phase will:
- keep the existing save-first single-run flow
- add a count-first wizard for creating parallel evaluation batches
- allow per-run overrides for model, system prompt, message prompt, and future runtime settings
- persist batch metadata, run definitions, linked run/thread identifiers, and summary scaffolding
- expose a visible but non-executable summary entry point for completed batches

#### Rationale
**Why this direction:**
- Speeds persona iteration by removing repetitive one-run-at-a-time setup
- Supports both model selection and prompt engineering as evaluation dimensions
- Creates a durable experiment record that can feed later automation and synthesis work
- Preserves the current Persona Lab mental model instead of splitting evaluation into a separate product

**Alternatives considered:**
1. Keep only single-run testing and compare results manually
2. Launch multiple runs without persisting a batch record
3. Build the full synthesis workflow immediately instead of scaffolding it first

#### Consequences
**Positive:**
- Faster comparison loops for persona designers
- Durable experiment history per persona
- Clear path toward automated summaries and evaluation tooling
- Backward-compatible single-run testing remains available

**Negative:**
- Adds UI and API complexity to Persona Lab
- Requires new backend support for batch creation, retrieval, and status tracking
- Increases the amount of run metadata that must remain consistent across systems

**Neutral:**
- Summary generation remains intentionally scaffolded in the first milestone
- Per-run configurability is designed to expand beyond model and prompt overrides later

### ADR-004: Extract Tribe-X Persona Studio into a Public MCPViews Plugin
**Date:** 2026-04-17
**Status:** Proposed
**Deciders:** Tribe-X architecture team

#### Context
The Persona Studio experience needs to be distributed independently of MCPViews core while still using MCPViews as the host shell and first-party AI bridge.

We want the installed user experience to remain functionally the same, including:
- Dedicated Persona Studio entry in MCPViews
- Consultant-scoped persona authoring
- Save-first single-run and parallel evaluation workflows

#### Decision
Extract Persona Studio into a public plugin repository and evolve MCPViews with generic plugin host capabilities instead of Persona Studio-specific core behavior.

The target split is:
- **MCPViews core:** generic plugin loading, standalone renderer mounting, local MCP bridges, and neutral session/rendering infrastructure
- **Tribe-X Persona Studio plugin:** Persona Studio UI, hosted backend integration through the first-party AI bridge, relay probe tooling, and planning/release artifacts

#### Rationale
**Why this direction:**
- Preserves the open-source boundary for MCPViews
- Makes Persona Studio installable from the public registry
- Makes the plugin model real instead of aspirational
- Lets TribeX ship Persona Studio improvements independently of MCPViews releases
- Keeps future platform improvements reusable for other plugins

**Alternatives considered:**
1. Keep Persona Studio native in MCPViews core
2. Repackage Persona Studio as a nominal plugin while retaining Studio-specific host code in core
3. Remove Persona Studio from MCPViews entirely

#### Consequences
**Positive:**
- Clear product and plugin boundary
- Cleaner MCPViews architecture
- Better long-term maintainability for both repos
- Reusable host APIs for future advanced plugins

**Negative:**
- Requires platform work in MCPViews before the plugin can reach parity
- Increases coordination overhead across two repos
- Needs migration of existing tests, docs, and runtime assumptions

**Neutral:**
- The installed UX can stay the same even if internals change
- Planning and implementation should be tracked across DecidR, Ludflow, and this repo

### ADR-001: Adopt Hexagonal Architecture (Ports & Adapters)
**Date:** 2025-09-30
**Status:** Accepted
**Deciders:** Architecture Team

#### Context
We need an architecture pattern that:
- Keeps business logic isolated from frameworks
- Makes code testable
- Allows swapping infrastructure components
- Supports SOLID principles

#### Decision
Adopt Hexagonal Architecture (Ports & Adapters) pattern with:
- **Domain Layer:** Pure business logic, no dependencies
- **Application Layer:** Use cases coordinating domain objects
- **Adapter Layer:** Infrastructure implementations (DB, APIs, etc.)
- **Dependency Inversion:** All dependencies point inward toward domain

#### Rationale
**Alternatives considered:**
1. **MVC** - Too coupled to web framework, hard to test business logic
2. **Clean Architecture** - Similar to Hexagonal but more layers, added complexity
3. **Transaction Script** - Too simple, doesn't scale as complexity grows

**Why Hexagonal:**
- Clear separation of concerns
- Domain layer is framework-agnostic
- Easy to test (mock at adapter boundaries)
- Supports DDD if needed
- Aligns with SOLID principles (especially DIP)

#### Consequences
**Positive:**
- Business logic is pure and testable
- Easy to swap databases or frameworks
- Clear architectural boundaries
- Better separation of concerns

**Negative:**
- More initial boilerplate
- Steeper learning curve for new developers
- More files and folders

**Neutral:**
- Need to document patterns clearly
- Team training required

---

### ADR-002: Use TypeScript for Type Safety
**Date:** 2025-09-30
**Status:** Accepted
**Deciders:** Development Team

#### Context
We need strong type safety to:
- Catch errors at compile time
- Improve IDE autocomplete
- Document interfaces clearly
- Reduce runtime errors

#### Decision
Use TypeScript for all application code with strict mode enabled.

#### Rationale
**Alternatives:**
1. **JavaScript with JSDoc** - Types not enforced, easy to ignore
2. **Flow** - Less ecosystem support, smaller community

**Why TypeScript:**
- Industry standard
- Excellent IDE support
- Strong type checking
- Large ecosystem
- Interfaces document contracts

#### Consequences
**Positive:**
- Catch errors at compile time
- Better refactoring confidence
- Self-documenting code
- Improved developer experience

**Negative:**
- Build step required
- Longer initial development time
- Generic/complex types can be confusing

**Neutral:**
- Team needs TypeScript training
- Need to maintain tsconfig.json

---

### ADR-003: Test-Driven Development with Layer-Based Strategy
**Date:** 2025-09-30
**Status:** Accepted
**Deciders:** Development Team

#### Context
We need a testing strategy that:
- Ensures code quality
- Provides confidence for refactoring
- Aligns with Hexagonal Architecture
- Balances speed and coverage

#### Decision
Adopt TDD with layer-based testing:
- **Domain:** Pure unit tests (50% of tests)
- **Application:** Integration tests with mocked ports (30%)
- **Adapters:** Integration tests with real systems (15%)
- **E2E:** Critical path tests (5%)

#### Rationale
**Why layer-based:**
- Aligns with architecture boundaries
- Tests what matters (business logic heavily tested)
- Fast feedback (most tests are fast unit tests)
- Mock only at boundaries (more confidence)

**Alternatives considered:**
1. **Test Pyramid** - Good, but doesn't leverage DIP advantages
2. **All E2E** - Slow, hard to debug, brittle
3. **All Unit** - Misses integration issues

#### Consequences
**Positive:**
- Fast test suite (most tests are unit)
- High confidence from integration tests
- Clear testing strategy per layer
- Regression protection

**Negative:**
- Requires discipline to maintain
- Need test helpers (fakes, builders)
- Integration tests need test infrastructure

**Neutral:**
- TDD adds upfront time but saves debugging time
- Need team training on patterns

---

## Superseded Decisions

<!-- Deprecated or superseded decisions are moved here -->

---

## Decision Status Definitions

- **Proposed:** Under discussion, not yet decided
- **Accepted:** Decision made and being implemented
- **Deprecated:** No longer relevant, but kept for historical context
- **Superseded:** Replaced by a newer decision (link to new ADR)

---

## Changelog

| Date | ADR | Change | Author |
|------|-----|--------|--------|
| 2025-09-30 | ADR-001 | Initial: Hexagonal Architecture | System |
| 2025-09-30 | ADR-002 | Initial: TypeScript adoption | System |
| 2025-09-30 | ADR-003 | Initial: TDD strategy | System |
