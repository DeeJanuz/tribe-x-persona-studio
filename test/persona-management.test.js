import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const rendererPath = resolve('renderers/persona-management.js');

function flush() {
  return new Promise((resolveFlush) => setTimeout(resolveFlush, 20));
}

function installRenderer() {
  const calls = [];
  window.__companionUtils = {
    getActiveSession: () => ({ sessionId: 'persona-management-test' }),
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
  window.__personaManagementToolCall = vi.fn(async (name, args) => {
    calls.push({ name, args });
    if (name.endsWith('persona-requirements-list')) {
      return {
        decisions: [
          {
            id: 'dec_1',
            title: 'Agent request: Send customer emails',
            description: 'Purpose:\nSend approved customer emails on my behalf.',
            status: 'PROPOSED',
            createdAt: '2026-06-26T12:00:00.000Z',
            updatedAt: '2026-06-26T13:00:00.000Z',
            tags: [
              { name: 'persona-studio' },
              { name: 'persona-management' },
              { name: 'request:agent' },
              { name: 'priority:high' },
              { name: 'customer:org_customer' },
            ],
          },
        ],
        bugTasks: [],
      };
    }
    if (name.endsWith('persona-requirement-submit')) {
      return {
        recordType: 'decision',
        decision: { id: 'dec_new' },
        lifecycle: {
          planDocument: { id: 'doc_1' },
          transition: { success: true },
        },
      };
    }
    if (name.endsWith('persona-requirement-detail')) {
      return {
        recordType: 'decision',
        record: { id: 'dec_1' },
        timeline: [
          {
            id: 'time_1',
            action: 'COMMENTED',
            description: 'Builder accepted the intake.',
            occurredAt: '2026-06-26T14:00:00.000Z',
          },
        ],
      };
    }
    if (name.endsWith('persona-requirement-comment')) {
      return { success: true };
    }
    throw new Error(`Unhandled tool ${name}`);
  });
  delete window.__personaManagementPluginState;
  window.__renderers = {};
  window.eval(readFileSync(rendererPath, 'utf8'));
  return calls;
}

describe('Persona Management renderer', () => {
  beforeEach(() => {
    document.body.innerHTML = '<main id="root"></main>';
    delete window.__personaManagementToolCall;
  });

  it('renders the DecidR-backed request dashboard and loads tagged requests', async () => {
    const calls = installRenderer();
    window.__renderers.persona_management(document.getElementById('root'));
    await flush();
    await flush();

    expect(document.body.textContent).toContain('Persona Management');
    expect(document.body.textContent).toContain('Request new agent');
    expect(document.body.textContent).toContain('Agent request: Send customer emails');
    expect(document.body.textContent).toContain('Ready for builder');
    expect(calls[0]).toMatchObject({
      name: 'tribe_x_persona_studio__persona-requirements-list',
      args: {
        organizationId: 'org_consultant',
        includeBugTasks: true,
      },
    });
  });

  it('submits the request wizard as an agent request payload', async () => {
    const calls = installRenderer();
    window.__renderers.persona_management(document.getElementById('root'));
    await flush();
    await flush();

    [...document.querySelectorAll('button')]
      .find((button) => button.textContent.includes('Request new agent'))
      .click();
    await flush();

    const purpose = [...document.querySelectorAll('textarea')]
      .find((input) => input.placeholder.includes('Agent goal'));
    purpose.value = 'Send approved customer emails on my behalf.';
    purpose.dispatchEvent(new Event('input', { bubbles: true }));

    for (let index = 0; index < 4; index += 1) {
      [...document.querySelectorAll('button')]
        .find((button) => button.textContent.includes('Next:'))
        .click();
      await flush();
    }

    [...document.querySelectorAll('button')]
      .find((button) => button.textContent.includes('Submit request'))
      .click();
    await flush();
    await flush();

    const submitCall = calls.find((call) =>
      call.name === 'tribe_x_persona_studio__persona-requirement-submit'
    );
    expect(submitCall.args).toMatchObject({
      organizationId: 'org_consultant',
      requesterOrganizationId: 'org_consultant',
      requestType: 'agent',
      priority: 'medium',
      purpose: 'Send approved customer emails on my behalf.',
    });
  });

  it('loads request detail and posts timeline comments', async () => {
    const calls = installRenderer();
    window.__renderers.persona_management(document.getElementById('root'));
    await flush();
    await flush();

    [...document.querySelectorAll('button')]
      .find((button) => button.textContent.includes('Agent request: Send customer emails'))
      .click();
    await flush();
    await flush();

    expect(document.body.textContent).toContain('Builder accepted the intake.');
    const comment = [...document.querySelectorAll('textarea')]
      .find((input) => input.placeholder.includes('Add a comment'));
    comment.value = 'Please include approval before send.';
    comment.dispatchEvent(new Event('input', { bubbles: true }));

    [...document.querySelectorAll('button')]
      .find((button) => button.textContent.includes('Post comment'))
      .click();
    await flush();
    await flush();

    const commentCall = calls.find((call) =>
      call.name === 'tribe_x_persona_studio__persona-requirement-comment'
    );
    expect(commentCall.args).toMatchObject({
      organizationId: 'org_consultant',
      recordType: 'decision',
      id: 'dec_1',
      comment: 'Please include approval before send.',
      customerOrganizationId: 'org_customer',
      requestType: 'agent',
    });
  });
});
