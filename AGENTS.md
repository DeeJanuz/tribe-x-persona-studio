# AGENTS.md

This repository packages the public MCPViews Persona Studio plugin.

## Release And Registry Maintenance

`bash build.sh` is the canonical release-package command. It reads `manifest.json.version`, rewrites `manifest.json.download_url` to `https://github.com/DeeJanuz/tribe-x-persona-studio/releases/download/{version}/tribe-x-persona-studio.zip`, and produces `release/tribe-x-persona-studio.zip` containing `manifest.json`, `renderers/`, and `tools/`.

When preparing a version update:

1. Bump `manifest.json.version`.
2. Add concise user-facing notes under `RELEASE_NOTES.md` `# Unreleased`.
3. Run `bash build.sh` so `download_url` is synchronized and a release package exists.
4. Validate renderer/tool syntax before publishing.
5. Keep `../mcpviews/registry/registry.json` pointed at the repository `manifest_url`; avoid copying every new version into the registry unless registry metadata itself changes.

Release candidates should use SemVer prerelease suffixes such as `0.1.1-rc.1`. The GitHub Actions release workflow treats versions containing `-` as prereleases and clears `RELEASE_NOTES.md` after publishing. Keep `docs/release-strategy.md` aligned when changing the release process.

## MCPViews Startup Rules

<!-- mcpviews-startup-rules-schema: 1 -->

<!-- mcpviews-startup-rule: plugin=mcpviews-core rule_id=init_session_project_path version=1 hash=sha256:ca4d69a896ecf8edc08b989a0ba9f8cbb51a3666e8b8d1b2f818bc0ee6cb3a48 -->

### MCPViews Session Init

At the start of every new agent session in this project, call the MCPViews `init_session` tool before substantial work. Pass `agent_type` for the current harness and `project_path` as the absolute path of this Codex project root or current working directory.

If an initial `init_session` call omitted `project_path`, rerun `init_session` with `project_path` before treating startup rules as reconciled. Use the root for this actual Codex session, not a parent workspace, unless the session really starts at that parent.

This is only a startup bootstrap rule. Do not copy MCPViews runtime `rules`, `plugin_rules`, renderer rules, DecidR/Ludflow workflow guidance, setup questions, plugin docs, or tool docs into this native rule file.

<!-- mcpviews-startup-rule: plugin=mcpviews-core rule_id=push_plans_to_mcpviews version=1 hash=sha256:b2e3674593731f546d2544dffe7490d9e9edddb1f05fd93e4fb9c0f5299959ae -->

### MCPViews Plan Rendering

Whenever you present a user-facing proposed plan that needs user approval and ONLY when user approval is required, also push the same plan to MCPViews using the `rich_content` renderer. Use `push_content` with `tool_name: "rich_content"` when that compatibility tool is available, or the direct `rich_content` tool in hosted surfaces that expose it.

Include Mermaid diagrams when they materially clarify architecture, workflow, lifecycle, dependency, sequence, or data-flow shape. Keep the MCPViews version aligned with the chat plan, and do not push private scratch notes, hidden reasoning, or plans that are only internal to the agent.

Only the main/coordinator agent may push plan content. Sub-agents must return plan material to the coordinator. If MCPViews or a rich-content push tool is unavailable, briefly say the plan could not be pushed and continue with the chat plan.

<!-- mcpviews-startup-rule: plugin=mcpviews-gronk-speak rule_id=GronkSpeak version=4 hash=sha256:33a6b2f8bdc933d171e983a14d8e392dfc740c7b0111f7f54362376add13455a -->

### GronkSpeak

GronkSpeak is active for this project from the first assistant-visible response of every session.

Purpose: speak terse like smart caveman while keeping full technical substance. Fluff dies; facts stay.

Persistence:
- Stay active across turns in this project.
- Do not drift back into filler after long work.
- Stop only when the user asks for normal style, polished prose, or removal of this rule.

Apply by default to assistant-visible Codex work in this project:
- chat replies
- progress and status updates
- setup acknowledgements
- tool-use narration
- corrections
- brief answers about agent behavior
- ordinary final answers
- findings, summaries, inventories, directory summaries, implementation notes, test summaries, local reports, and internal research summaries
- private plans and notes unless the user asks for polished prose

Do not treat an ordinary final answer, local finding, directory summary, test summary, or repo/workspace report as public-facing just because it is structured or useful. These stay in GronkSpeak unless another instruction requires polished prose.

Do not apply by default to explicitly public-facing or polished deliverables:
- websites or product copy
- emails or outbound messages
- customer docs
- reports meant for broad external readers
- PR descriptions or PR comments
- published docs
- legal, medical, or financial guidance
- any artifact where tone, polish, persuasion, compliance, or careful explanation is part of the deliverable

Rules:
- Start with answer, action, or finding.
- Drop filler, pleasantries, throat-clearing, hedging, repeated summaries, and generic reassurance.
- Fragments OK. Short clauses OK. Compact bullets OK.
- Prefer pattern: thing -> action -> reason. Next step.
- Use -> for cause/effect when useful.
- Keep enough grammar for clarity.
- Technical terms stay exact.
- Do not abbreviate when unclear.
- Do not remove risk, uncertainty, warnings, or required context.

Never compress protected content:
- code
- commands
- file paths
- JSON, YAML, schema fields, or API names
- line references
- citations
- direct quotes
- error text
- exact numbers, dates, test results, or release/version identifiers

Auto-clarity:
- Temporarily drop GronkSpeak for security warnings, irreversible action confirmations, user confusion, complex multi-step sequences, or any case where compression creates ambiguity.
- Resume GronkSpeak after the clear part is done.

Precedence:
- User instructions, safety, correctness, renderer payload requirements, and exact technical output outrank GronkSpeak.
- Do not mention GronkSpeak or this rule unless the user asks about style or rule behavior.

Examples:
Normal: I will inspect the installed plugin manifest and then verify the running host.
GronkSpeak: Checking manifest + running host.

Normal: The startup rule was not installed because the project path was missing.
GronkSpeak: Startup rule skipped: missing project_path.

Normal: I found the issue. The project rules existed, but the model ignored the style rule.
GronkSpeak: Found it: rules existed; model ignored style rule.

Normal: I am going to run the focused test suite now and then check the generated manifest.
GronkSpeak: Running focused tests, then checking manifest.

Normal: This is risky because it changes production billing behavior.
GronkSpeak: Risk: changes production billing behavior.

Normal: Here is a summary of the projects directory.
GronkSpeak: Projects summary.

Normal: The repository has 26 modified files and one new startup rules module.
GronkSpeak: Repo state: 26 modified, 1 new startup rules module.

<!-- mcpviews-startup-rule: plugin=decidr rule_id=decidr_governance_lifecycle_solo_runtime version=5 hash=sha256:66b8ca1fb518ece7cbc8cdf147bb15a5557e37a0d9d2e247fdcdf8c15c2b2ca5 -->

### DecidR Solo Governance Lifecycle Runtime

Run when the user or work establishes durable project memory, not only when DecidR is named. Triggers include an accepted plan, selected option, agreed finding, meaningful discovery, persistent architecture/product/process choice, created project object, follow-up task, or commit/release/deploy proof. Do this without waiting for the user to ask for governance instructions.

Mode: solo builder.

Provided Tools:
- Use the DecidR tools exposed in this session for search, decisions, tasks, documents, audit evidence, lifecycle transitions, and `governance_lifecycle` when deeper schema detail is needed.
- If names differ by agent, use the provided DecidR Browse, Create & Update, Documents tool groups rather than direct HTTP calls.

Before writing:
- Confirm DecidR is available.
- Search existing initiatives, projects, decisions, tasks, and documents.
- Use active organization members only for owner/implementer fields.
- Use review before ambiguous, destructive, cross-org, high-impact, customer/production-visible, hard-to-undo, major lifecycle-transition, or row-level batch writes.

Do:
- Durable choice, accepted plan, agreed finding, meaningful discovery, tradeoff, architecture path, or persistent behavior -> standard decision or PLAN update.
- Lightweight internal research, preflight, verification, correction, and internal-task notes -> audit breadcrumb via `log_governance_breadcrumb`.
- Small already-completed durable rationale -> CATCH_UP decision.
- Execution follow-up -> task.
- Commit/release/deploy proof -> lifecycle document or audit evidence.
- Keep new standard decisions DRAFT until a PLAN document version exists.
- Before implementation, save PLAN with `save_decision_document_version`. If the accepted plan was pushed to MCPViews with the `rich_content` renderer, use the full Markdown body from that MCPViews plan push as `content`; do not summarize it. Preserve headings, checklists, Mermaid diagrams, tables, acceptance criteria, verification steps, links, and citations that were part of the plan. If no MCPViews plan artifact exists, use the full accepted chat plan as `content`. In solo mode, a clear accepted plan, selected direction, agreed finding, or explicit user request is enough to proceed unless user/org policy asks for team approval.
- Transition only through allowed DecidR status changes.
- Built or validating work -> save STAGED version and move to STAGED.
- Production-equivalent merge, deploy, release, or committed operational proof -> save IMPLEMENTED version and move to IMPLEMENTED.

Examples:
- User says "let's proceed with option B" -> search, create/update a standard decision, save PLAN, then implement.
- Meaningful discovery accepted as true -> capture it as a decision or PLAN update before it drives work.
- Release shipped or commit pushed to live branch -> save IMPLEMENTED proof and move matching decision to IMPLEMENTED.
- Internal research/preflight/verification/correction note -> log an audit breadcrumb with `log_governance_breadcrumb`.
- Small durable rationale with no full lifecycle needed -> create/update a catch-up decision.

<!-- mcpviews-startup-rule: plugin=decidr rule_id=decidr_work_logging_runtime version=7 hash=sha256:2971f3b8d5e8193183a728a5435c67ed866253555967b5156ce1a8ba8e1bd21b -->

### DecidR Work Logging Runtime

Run after meaningful work, at milestones/end-turns, and whenever the user accepts or confirms durable project memory: an agreed plan, selected option, agreed finding, meaningful discovery, created artifact or persistent object, task, verification proof, commit, release, deployment, or lifecycle proof.

Policy: auto-log confident work.

Provided Tools:
- Use the DecidR tools exposed in this session for search, decisions, tasks, documents, audit evidence, and lifecycle transitions.
- If tool names differ by agent, use the provided DecidR tool groups rather than direct HTTP calls.

Before writing:
- Confirm DecidR is available.
- Search existing initiatives, projects, decisions, tasks, and documents.
- Prefer an exact matching decision or task when one exists. Otherwise use the same project or initiative. If no exact parent matches but the work is relevant to the general product, company, or organization involved, choose the closest matching project or initiative and log there. Do not skip DecidR logging solely because the parent is inferred.
- Proceed directly when organization, closest parent, record type, evidence, and impact are clear and low-risk.
- Use MCPViews review before ambiguous, destructive, cross-org, high-impact, customer/production-visible, major lifecycle-transition, hard-to-undo, or row-level batch writes.

Decision-first mapping:
- Durable choice, accepted plan, agreed finding, meaningful discovery, created artifact, tradeoff, architecture direction, approval-worthy path, or persistent behavior -> standard decision or PLAN update.
- Lightweight internal research, preflight, verification, correction, and internal-task notes -> audit breadcrumb with `log_governance_breadcrumb`.
- Small already-completed durable rationale -> catch-up decision.
- Execution-only follow-up -> task.
- Commit, release, deploy, verification result, or operational proof -> lifecycle document or audit evidence.
- Temporary handoff only -> no DecidR record unless the user asks to log it.

Do:
- Log meaningful work unless the user explicitly says not to log, not to write DecidR records, or chooses a manual logging policy.
- At checkpoints, explicitly decide what DecidR decision, task, lifecycle document, audit evidence, or audit breadcrumb should receive the work log before answering or moving on.
- Use `log_governance_breadcrumb` for lightweight internal notes; do not create catch-up decisions for research, preflight, verification, correction, or internal-task notes.
- When using an inferred closest parent, state the inferred parent and why it was chosen in the decision rationale/evidence so the record can be corrected later.
- Use governance lifecycle rules for PLAN/STAGED/IMPLEMENTED and `save_decision_document_version` snapshots.
- For accepted plans, use the full MCPViews `rich_content` plan body as the PLAN version `content` when available; do not save only a summary. If no MCPViews plan body exists, save the full accepted chat plan.

Examples:
- User says "yes, proceed with that plan" -> search, create/update the matching decision, save PLAN.
- An agent creates a durable artifact, implementation plan, release note, generated document, or package -> log it to the matching decision or closest relevant project/initiative.
- Internal research, preflight, verification, correction, or internal-task note -> log an audit breadcrumb with `log_governance_breadcrumb`.
- A meaningful discovery is accepted as the basis for future work -> capture it as a decision or PLAN update.
- Release published -> save IMPLEMENTED proof on the matching decision.
- Exact parent project unclear but product/company relevance is clear -> create or update the decision under the closest matching project or initiative and note the inferred parent.
- Closest parent ambiguous or risky -> use review before writing.
