import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const rendererPath = resolve('renderers/persona-lab.js');

function flush() {
  return new Promise((resolveFlush) => setTimeout(resolveFlush, 20));
}

function personaDetail() {
  return {
    document: {
      definition: {
        key: 'general',
        displayName: 'General',
        description: 'General consultant persona.',
        owner: 'consultant',
        metadataGroup: 'Consultant',
      },
      draft: {
        summary: 'General consultant persona.',
        description: '',
        agentClass: 'PersonaHarnessAgent',
        rules: [],
        modelPolicy: {
          defaultModel: 'openai/gpt-5-mini',
          fastModel: 'openai/gpt-5-mini',
          reasoningModel: 'openai/gpt-5',
          workflowModels: {},
        },
        toolPolicy: {
          reservedCoreTools: [],
          allowedBusinessTools: [],
          deniedBusinessTools: [],
          allowedConnectorKeys: [],
          allowedRuntimeToolIds: [],
        },
        workflowRefs: [],
        builtInSkills: ['proposal-review'],
        orchestration: {
          capability: 'DELEGATE',
          dispatchMode: 'REVIEW',
          maxParallelSubagents: 3,
          maxDepth: 1,
        },
        sandboxPolicy: { mode: 'disabled' },
      },
      prompt: 'You are a helpful consultant persona.',
      customSkills: [],
    },
    inspector: {},
  };
}

function suitePayload() {
  return {
    suites: [
      {
        id: 'suite_1',
        name: 'Customer-safe acceptance',
        version: 1,
        syntheticOnly: true,
        releaseNotes: 'Initial evidence pack.',
        cases: [
          {
            id: 'case_1',
            targetSkillKey: 'proposal-review',
            title: 'Synthetic recommendation',
            prompt: 'Write a customer-safe recommendation.',
            scenarioKind: 'synthetic',
            checks: [
              {
                type: 'tool_called',
                label: 'Review opened',
                toolName: 'push_review',
                minCalls: 1,
              },
              {
                type: 'rubric',
                label: 'Consultant review',
                rubric: 'Confirm it is safe for customers.',
              },
            ],
          },
        ],
        latestRun: null,
      },
    ],
    limits: {
      maxActiveCases: 20,
      maxChecksPerCase: 10,
      maxPromptLength: 4000,
      backgroundConcurrency: 4,
      syntheticOnly: true,
      distributionGate: 'warning-only',
    },
  };
}

function suiteRunPayload() {
  return {
    suiteRun: {
      id: 'suite_run_1',
      suiteId: 'suite_1',
      suiteVersion: 1,
      personaKey: 'general',
      sourceStage: 'draft',
      status: 'NEEDS_REVIEW',
      runCount: 1,
      passCount: 0,
      failCount: 0,
      needsReviewCount: 1,
      report: {
        suite: {
          name: 'Customer-safe acceptance',
          version: 1,
          syntheticOnly: true,
        },
        advisory: {
          distributionGate: 'warning-only',
        },
      },
      caseRuns: [
        {
          id: 'case_run_1',
          caseId: 'case_1',
          personaTestRunId: 'run_1',
          targetSkillKey: 'proposal-review',
          title: 'Synthetic recommendation',
          status: 'NEEDS_REVIEW',
          prompt: 'Write a customer-safe recommendation.',
          deterministicResults: [
            {
              label: 'Mentions recommendation',
              type: 'tool_called',
              status: 'PASS',
              message: 'push_review was called 1 time(s).',
            },
            {
              label: 'Consultant review',
              type: 'rubric',
              status: 'NEEDS_REVIEW',
              message: 'Consultant review required.',
            },
          ],
          evidence: {
            assistantPreview: 'Here is a customer-safe recommendation.',
            toolEvidence: [
              {
                toolName: 'push_review',
                status: 'needs_review',
                durationMs: 120,
                resultSummary: 'Waiting for approval',
              },
            ],
            snippets: ['customer-safe recommendation'],
          },
          toolEvidence: [
            {
              toolName: 'push_review',
              status: 'needs_review',
              durationMs: 120,
              resultSummary: 'Waiting for approval',
            },
          ],
          reportSnippet: 'customer-safe recommendation',
          threadId: 'thread_1',
        },
      ],
    },
  };
}

function observabilityPayload() {
  return {
    filters: {
      month: '2026-05',
      customerOrganizationId: null,
      workspaceId: null,
      personaKey: 'general',
      model: null,
    },
    summary: {
      executionCount: 12,
      failedExecutionCount: 1,
      billableCents: 2400,
      estimatedMonthlySavingsCents: 420,
      totalTokens: 48000,
      cachedTokens: 1200,
      cacheWriteTokens: 800,
      cacheHitRate: 0.03,
      failureRate: 0.08,
      p95DurationMs: 52000,
      averageDurationMs: 18000,
      toolCalls: 18,
      toolFailures: 4,
    },
    byModel: [
      {
        key: 'openai/gpt-5',
        label: 'openai/gpt-5',
        executionCount: 9,
        billableCents: 1800,
        totalTokens: 36000,
        p95DurationMs: 52000,
      },
    ],
    byCustomer: [
      {
        key: 'org_customer',
        label: 'Customer Org',
        executionCount: 12,
        billableCents: 2400,
        totalTokens: 48000,
        p95DurationMs: 52000,
      },
    ],
    byWorkspace: [
      {
        key: 'workspace_1',
        label: 'Delivery Workspace',
        executionCount: 12,
        billableCents: 2400,
        totalTokens: 48000,
        p95DurationMs: 52000,
      },
    ],
    recentExecutions: [
      {
        executionRunId: 'exec_1',
        organizationName: 'Customer Org',
        model: 'openai/gpt-5',
        billableCents: 600,
        durationMs: 52000,
        toolCalls: 6,
      },
    ],
    toolUsage: [
      {
        toolName: 'web_search',
        label: 'web search',
        calls: 18,
        failures: 4,
        durationMs: 12000,
        billableCents: 160,
      },
    ],
    bySkill: [
      {
        skillKey: 'proposal-review',
        label: 'Proposal Review',
        runCount: 3,
        passCount: 2,
        failCount: 1,
        needsReviewCount: 0,
        passRate: 0.67,
        failingChecks: [{ label: 'Review succeeded', count: 1 }],
        mostUsedTools: [{ toolName: 'push_review', count: 3 }],
        recentFailures: [],
      },
    ],
    skillContractResults: [],
    recentSkillFailures: [],
    storageUsage: [
      {
        key: 'cloudflare:CLOUDFLARE_R2_STORAGE_BYTE_HOURS:org_customer:workspace_1',
        label: 'CLOUDFLARE R2 STORAGE BYTE HOURS',
        itemType: 'CLOUDFLARE_R2_STORAGE_BYTE_HOURS',
        provider: 'cloudflare',
        organizationName: 'Customer Org',
        workspaceName: 'Delivery Workspace',
        billableCents: 80,
      },
    ],
    opportunities: [
      {
        id: 'cache-health:general',
        type: 'cache_health',
        title: 'Improve prompt cache reuse',
        description: 'This persona is spending on repeated prompt context while cache reuse is low.',
        severity: 'high',
        confidence: 0.82,
        personaKey: 'general',
        personaLabel: 'General',
        estimatedMonthlySavingsCents: 420,
        evidence: ['3% prompt cache hit rate', '12 runs this month'],
        recommendedAction: 'Add a stable prompt/cache discipline rule and run a comparison batch.',
        primaryCta: 'draft_edit',
        draftAction: {
          type: 'ADD_RULE',
          rule: 'Keep stable context ordered for prompt caching.',
        },
      },
    ],
    filterOptions: {
      customers: [{ value: 'org_customer', label: 'Customer Org' }],
      models: [{ value: 'openai/gpt-5', label: 'openai/gpt-5' }],
      workspaces: [{ value: 'workspace_1', label: 'Delivery Workspace' }],
    },
  };
}

function installRenderer(options = {}) {
  const calls = [];
  window.__TAURI__ = {
    core: {
      invoke: vi.fn(async (name, args) => {
        calls.push({ name, args });
        if (name !== 'first_party_ai_request') {
          return null;
        }
        const { method, path } = args;
        if (method === 'GET' && path === '/organizations') {
          return {
            organizations: [
              {
                id: 'org_consultant',
                name: 'Consultant Org',
                kind: 'CONSULTANT',
              },
            ],
          };
        }
        if (method === 'GET' && path === '/admin/persona-studio/personas') {
          return {
            personas: [
              {
                key: 'general',
                displayName: 'General',
                description: 'General consultant persona.',
                status: 'ACTIVE',
              },
            ],
            registries: {
              builtInSkills: [
                {
                  key: 'proposal-review',
                  label: 'Proposal Review',
                },
              ],
            },
            assetRegistry: { assets: [] },
          };
        }
        if (method === 'GET' && path === '/organizations/org_consultant/persona-studio/assets') {
          return { assets: [] };
        }
        if (method === 'GET' && path === '/admin/persona-studio/personas/general') {
          return personaDetail();
        }
        if (
          method === 'GET' &&
          path === '/admin/persona-studio/personas/general/test-suites'
        ) {
          if (options.testSuitesError) {
            throw new Error('temporary suites outage');
          }
          return suitePayload();
        }
        if (
          method === 'GET' &&
          path === '/admin/persona-studio/personas/general/observability'
        ) {
          if (options.observabilityError) {
            throw new Error('temporary observability outage');
          }
          return options.observabilityPayload || observabilityPayload();
        }
        if (
          method === 'POST' &&
          path === '/admin/persona-studio/personas/general/optimization-drafts'
        ) {
          return {
            promoted: false,
            appliedChanges: ['Added draft rule'],
            validation: { ok: true, errors: [] },
          };
        }
        if (method === 'POST' && path === '/admin/persona-studio/test-suites/suite_1/runs') {
          return suiteRunPayload();
        }
        if (method === 'POST' && path === '/admin/persona-studio/test-suites/suite_1/cases') {
          return suitePayload();
        }
        if (method === 'POST' && path === '/admin/persona-studio/test-case-runs/case_run_1/review') {
          return suiteRunPayload();
        }
        if (method === 'GET' && path === '/admin/persona-studio/test-suite-runs/suite_run_1') {
          return suiteRunPayload();
        }
        throw new Error(`Unhandled request ${method} ${path}`);
      }),
    },
  };
  window.__companionUtils = {
    getActiveSession: () => ({ sessionId: 'test-session' }),
    replaceSession: vi.fn(),
  };
  window.__tribexAiState = {
    getSnapshot: () => ({
      selectedOrganization: {
        id: 'org_consultant',
        name: 'Consultant Org',
        kind: 'CONSULTANT',
      },
    }),
  };
  delete window.__personaLabPluginState;
  window.__renderers = {};
  window.eval(readFileSync(rendererPath, 'utf8'));
  return calls;
}

describe('Persona Studio renderer test suites', () => {
  beforeEach(() => {
    document.body.innerHTML = '<main id="root"></main>';
    vi.useRealTimers();
  });

  it('renders the consultant Test Suites tab without legacy plugin naming', async () => {
    installRenderer();
    window.__renderers.persona_lab(document.getElementById('root'));
    await flush();
    await flush();

    [...document.querySelectorAll('button')]
      .find((button) => button.textContent.includes('Test Suites'))
      .click();
    await flush();
    await flush();

    expect(document.body.textContent).toContain('Synthetic scenarios only');
    expect(document.body.textContent).toContain('Customer-safe acceptance');
    expect(document.body.textContent).toContain('Target skill');
    expect(document.body.textContent).toContain('Require tool call');
    expect(document.body.textContent).not.toContain('tribe-x-ai-plugin');
  });

  it('keeps requirement intake out of the Persona Studio wizard', async () => {
    installRenderer();
    window.__renderers.persona_lab(document.getElementById('root'));
    await flush();
    await flush();

    expect([...document.querySelectorAll('button')].some((button) =>
      button.textContent.includes('Requirements')
    )).toBe(false);
    expect(document.body.textContent).not.toContain('DecidR-backed requirements');
    expect(document.body.textContent).not.toContain('persona-requirement-submit');
  });

  it('saves skill-targeted tool contract checks', async () => {
    const calls = installRenderer();
    window.__renderers.persona_lab(document.getElementById('root'));
    await flush();
    await flush();

    [...document.querySelectorAll('button')]
      .find((button) => button.textContent.includes('Test Suites'))
      .click();
    await flush();
    await flush();

    const prompt = [...document.querySelectorAll('textarea')]
      .find((input) => input.placeholder.includes('Synthetic prompt'));
    prompt.value = 'Open a review for this proposal.';
    prompt.dispatchEvent(new Event('input', { bubbles: true }));
    const skill = [...document.querySelectorAll('select')]
      .find((select) => [...select.options].some((option) => option.value === 'proposal-review'));
    skill.value = 'proposal-review';
    skill.dispatchEvent(new Event('input', { bubbles: true }));

    [...document.querySelectorAll('button')]
      .find((button) => button.textContent.includes('Add Case'))
      .click();
    await flush();
    await flush();

    const saveCall = calls.find((call) =>
      call.args?.method === 'POST' &&
      call.args?.path === '/admin/persona-studio/test-suites/suite_1/cases'
    );
    expect(saveCall.args.body).toMatchObject({
      targetSkillKey: 'proposal-review',
      checks: expect.arrayContaining([
        expect.objectContaining({ type: 'tool_called', toolName: 'push_review' }),
      ]),
    });
  });

  it('launches a background suite run and exposes manual review/report state', async () => {
    const calls = installRenderer();
    window.__renderers.persona_lab(document.getElementById('root'));
    await flush();
    await flush();

    [...document.querySelectorAll('button')]
      .find((button) => button.textContent.includes('Test Suites'))
      .click();
    await flush();
    await flush();

    vi.useFakeTimers();
    [...document.querySelectorAll('button')]
      .find((button) => button.textContent.includes('Run Suite'))
      .click();
    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(calls.some((call) =>
      call.args?.method === 'POST' &&
      call.args?.path === '/admin/persona-studio/test-suites/suite_1/runs' &&
      call.args?.body?.organizationId === 'org_consultant'
    )).toBe(true);
    expect(document.body.textContent).toContain('Run Progress');
    expect(document.body.textContent).toContain('Skill proposal-review');
    expect(document.body.textContent).toContain('Tool Evidence');
    expect(document.body.textContent).toContain('Needs Review');
    expect(document.body.textContent).toContain('Latest Customer-Safe Report');
    vi.advanceTimersByTime(3000);
    await Promise.resolve();
    await Promise.resolve();
    expect(calls.some((call) =>
      call.args?.method === 'GET' &&
      call.args?.path === '/admin/persona-studio/test-suite-runs/suite_run_1' &&
      call.args?.query?.organizationId === 'org_consultant'
    )).toBe(true);
    vi.useRealTimers();
  });

  it('renders Insights and creates reviewed optimization drafts', async () => {
    const calls = installRenderer();
    window.__renderers.persona_lab(document.getElementById('root'));
    await flush();
    await flush();

    [...document.querySelectorAll('button')]
      .find((button) => button.textContent.includes('Insights'))
      .click();
    await flush();
    await flush();
    await flush();

    expect(calls.some((call) =>
      call.args?.method === 'GET' &&
      call.args?.path === '/admin/persona-studio/personas/general/observability' &&
      call.args?.query?.organizationId === 'org_consultant'
    )).toBe(true);
    expect(document.body.textContent).toContain('Optimization Inbox');
    expect(document.body.textContent).toContain('Improve prompt cache reuse');
    expect(document.body.textContent).toContain('Skill Contracts');
    expect(document.body.textContent).toContain('Proposal Review');

    [...document.querySelectorAll('button')]
      .find((button) => button.textContent.includes('Create Draft'))
      .click();
    await flush();
    expect(document.body.textContent).toContain('Proposed change');

    [...document.querySelectorAll('button')]
      .find((button) => button.textContent.includes('Save Draft'))
      .click();
    await flush();
    await flush();

    expect(calls.some((call) =>
      call.args?.method === 'POST' &&
      call.args?.path === '/admin/persona-studio/personas/general/optimization-drafts' &&
      call.args?.body?.organizationId === 'org_consultant' &&
      call.args?.body?.action?.type === 'ADD_RULE'
    )).toBe(true);
  });

  it('falls back to skillContractResults when bySkill is empty', async () => {
    const payload = observabilityPayload();
    payload.bySkill = [];
    payload.skillContractResults = [
      {
        skillKey: 'artifact-builder',
        label: 'Artifact Builder',
        runCount: 2,
        passCount: 1,
        failCount: 1,
        needsReviewCount: 0,
        passRate: 0.5,
        failingChecks: [{ label: 'Created artifact', count: 1 }],
        mostUsedTools: [{ toolName: 'artifact_write', count: 2 }],
      },
    ];
    installRenderer({ observabilityPayload: payload });
    window.__renderers.persona_lab(document.getElementById('root'));
    await flush();
    await flush();

    [...document.querySelectorAll('button')]
      .find((button) => button.textContent.includes('Insights'))
      .click();
    await flush();
    await flush();

    expect(document.body.textContent).toContain('Artifact Builder');
  });

  it('does not immediately retry failed auto-loaded Insights requests', async () => {
    const calls = installRenderer({ observabilityError: true });
    window.__renderers.persona_lab(document.getElementById('root'));
    await flush();
    await flush();

    [...document.querySelectorAll('button')]
      .find((button) => button.textContent.includes('Insights'))
      .click();
    await flush();
    await flush();
    await flush();
    await flush();

    const insightCalls = calls.filter((call) =>
      call.args?.method === 'GET' &&
      call.args?.path === '/admin/persona-studio/personas/general/observability'
    );
    expect(insightCalls).toHaveLength(1);
    expect(document.body.textContent).toContain('temporary observability outage');
  });
});
