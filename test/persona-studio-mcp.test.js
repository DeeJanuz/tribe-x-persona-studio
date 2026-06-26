import { afterEach, describe, expect, it, vi } from "vitest";
import { handleRpc, handleToolCall } from "../tools/relay-probe-server.mjs";

function parseToolText(result) {
  return JSON.parse(result.content[0].text);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Persona Studio MCP tools", () => {
  it("lists persona authoring and test-suite tools", async () => {
    const response = await handleRpc({
      jsonrpc: "2.0",
      id: "list",
      method: "tools/list",
    });

    const names = response.result.tools.map((tool) => tool.name);
    expect(names).toContain("create-persona");
    expect(names).toContain("update-persona");
    expect(names).toContain("archive-persona");
    expect(names).toContain("create-test-suite");
    expect(names).toContain("persona-management-open");
    expect(names).toContain("persona-requirement-submit");
    expect(names).toContain("persona-requirements-list");
    expect(names).toContain("persona-requirement-detail");
    expect(names).toContain("persona-requirement-comment");
    expect(names).toContain("persona-requirement-capture-conversation");
    expect(names).toContain("relay-probe");
  });

  it("creates personas through the control-plane API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ persona: { key: "qa-coach" } }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = parseToolText(
      await handleToolCall("tribe_x_persona_studio__create-persona", {
        organizationId: "org_consultant",
        key: "qa-coach",
        displayName: "QA Coach",
        description: "Reviews acceptance criteria.",
        authorization: "Bearer token",
      }),
    );

    expect(result.persona.key).toBe("qa-coach");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://dev.app.tribexai.com/admin/persona-studio/personas",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          organizationId: "org_consultant",
          key: "qa-coach",
          displayName: "QA Coach",
          description: "Reviews acceptance criteria.",
        }),
      }),
    );
  });

  it("updates personas with the complete draft document", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await handleToolCall("update-persona", {
      organizationId: "org_consultant",
      personaKey: "qa-coach",
      definition: { displayName: "QA Coach" },
      draft: { summary: "Helps QA" },
      prompt: "You are QA Coach.",
      customSkills: [{ key: "acceptance-review" }],
      cookie: "tribex.session=abc",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://dev.app.tribexai.com/admin/persona-studio/personas/qa-coach",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          Cookie: "tribex.session=abc",
        }),
        body: JSON.stringify({
          organizationId: "org_consultant",
          definition: { displayName: "QA Coach" },
          draft: { summary: "Helps QA" },
          prompt: "You are QA Coach.",
          customSkills: [{ key: "acceptance-review" }],
        }),
      }),
    );
  });

  it("archives personas through the control-plane API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ archived: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = parseToolText(
      await handleToolCall("archive-persona", {
        organizationId: "org_consultant",
        personaKey: "old-persona",
        reason: "Replaced by QA Coach",
      }),
    );

    expect(result.archived).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://dev.app.tribexai.com/admin/persona-studio/personas/old-persona/archive",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          organizationId: "org_consultant",
          reason: "Replaced by QA Coach",
        }),
      }),
    );
  });

  it("creates synthetic test suites for personas", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ suite: { id: "suite_1" } }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = parseToolText(
      await handleToolCall("create-test-suite", {
        organizationId: "org_consultant",
        personaKey: "qa-coach",
        name: "Acceptance Checks",
        cases: [
          {
            title: "Asks for missing criteria",
            prompt: "Review this incomplete ticket.",
            checks: [{ type: "contains", label: "asks", value: "acceptance criteria" }],
          },
        ],
      }),
    );

    expect(result.suite.id).toBe("suite_1");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://dev.app.tribexai.com/admin/persona-studio/personas/qa-coach/test-suites",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          organizationId: "org_consultant",
          sourceStage: "draft",
          name: "Acceptance Checks",
          cases: [
            {
              title: "Asks for missing criteria",
              prompt: "Review this incomplete ticket.",
              checks: [{ type: "contains", label: "asks", value: "acceptance criteria" }],
            },
          ],
        }),
      }),
    );
  });

  it("submits persona proposals through the Tribe-X broker", async () => {
    const fetchMock = vi.fn(async (url, options = {}) => {
      const parsedUrl = new URL(url);
      if (
        options.method === "POST" &&
        parsedUrl.pathname === "/organizations/org_consultant/persona-management/requests"
      ) {
        return new Response(JSON.stringify({
          request: { id: "pmr_1", recordType: "DECISION", decidrRecordId: "dec_1" },
          record: { id: "dec_1", title: "QA Coach", status: "PROPOSED" },
          planDocument: { id: "doc_version_1" },
        }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw new Error(`unexpected ${options.method} ${parsedUrl.pathname}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = parseToolText(
      await handleToolCall("persona-requirement-submit", {
        organizationId: "org_consultant",
        decidrProjectId: "proj_1",
        requestType: "persona",
        personaKey: "qa-coach",
        purpose: "Review acceptance criteria before engineering starts.",
        skills: ["Acceptance review"],
        guardrails: ["No customer secrets"],
        outcomes: ["Clear checklist"],
        priority: "high",
        authorization: "Bearer tribex-token",
      }),
    );

    expect(result.recordType).toBe("decision");
    expect(result.mapping).toBe("tribex-broker");
    expect(result.request.id).toBe("pmr_1");
    expect(result.decision.id).toBe("dec_1");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://dev.app.tribexai.com/organizations/org_consultant/persona-management/requests",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer tribex-token",
        }),
        body: expect.stringContaining("Acceptance review"),
      }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({
      requestType: "persona",
      personaKey: "qa-coach",
      priority: "high",
      skills: ["Acceptance review"],
    });
  });

  it("loads Persona Management request details and posts brokered comments", async () => {
    const fetchMock = vi.fn(async (url, options = {}) => {
      const parsedUrl = new URL(url);
      if (
        options.method === "GET" &&
        parsedUrl.pathname === "/organizations/org_consultant/persona-management/requests/pmr_1"
      ) {
        return new Response(JSON.stringify({
          request: { id: "pmr_1", recordType: "DECISION" },
          record: {
            id: "dec_1",
            recordType: "decision",
            title: "Agent request",
            timeline: [{ id: "time_1" }],
            documents: [],
          },
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (
        options.method === "POST" &&
        parsedUrl.pathname === "/organizations/org_consultant/persona-management/requests/pmr_1/comments"
      ) {
        return new Response(JSON.stringify({ event: { id: "time_2" } }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw new Error(`unexpected ${options.method} ${parsedUrl.pathname}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const detail = parseToolText(
      await handleToolCall("persona-requirement-detail", {
        organizationId: "org_consultant",
        recordType: "decision",
        id: "pmr_1",
      }),
    );
    expect(detail.record.id).toBe("dec_1");
    expect(detail.timeline).toEqual([{ id: "time_1" }]);

    await handleToolCall("persona-requirement-comment", {
      organizationId: "org_consultant",
      recordType: "decision",
      id: "pmr_1",
      comment: "Please require approval before sending email.",
      customerOrganizationId: "customer_1",
      personaKey: "email-agent",
      requestType: "agent",
    });

    const commentBody = JSON.parse(
      fetchMock.mock.calls.find(([url, options]) =>
        new URL(url).pathname === "/organizations/org_consultant/persona-management/requests/pmr_1/comments" &&
        options.method === "POST"
      )[1].body,
    );
    expect(commentBody).toMatchObject({
      comment: "Please require approval before sending email.",
      customerOrganizationId: "customer_1",
      personaKey: "email-agent",
      requestType: "agent",
    });
  });

  it("submits plain bug reports through the Tribe-X broker", async () => {
    const fetchMock = vi.fn(async (url, options = {}) => {
      const parsedUrl = new URL(url);
      if (
        options.method === "POST" &&
        parsedUrl.pathname === "/organizations/org_consultant/persona-management/requests"
      ) {
        return new Response(JSON.stringify({
          request: { id: "pmr_bug", recordType: "TASK", decidrRecordId: "task_1" },
          record: { id: "task_1", title: "Citation bug", status: "TODO" },
        }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw new Error(`unexpected ${options.method} ${parsedUrl.pathname}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = parseToolText(
      await handleToolCall("persona-requirement-submit", {
        organizationId: "org_consultant",
        decidrProjectId: "proj_1",
        requestType: "bug",
        personaKey: "qa-coach",
        purpose: "The persona drops required citations.",
      }),
    );

    expect(result.recordType).toBe("task");
    expect(result.mapping).toBe("tribex-broker");
    expect(result.task.id).toBe("task_1");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://dev.app.tribexai.com/organizations/org_consultant/persona-management/requests",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"requestType":"bug"'),
      }),
    );
  });

  it("captures conversation summaries as compact brokered source refs", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ event: { id: "audit_1" } }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await handleToolCall("persona-requirement-capture-conversation", {
      organizationId: "org_consultant",
      id: "pmr_1",
      personaKey: "qa-coach",
      requestType: "feature",
      summary: "User asked the persona to include compliance escalation steps.",
      compactSourceRefs: [{ label: "AI thread", threadId: "thread_1" }],
      externalReferenceId: "thread_1:feature",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://dev.app.tribexai.com/organizations/org_consultant/persona-management/requests/pmr_1/source-refs",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("compliance escalation steps"),
      }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.sourceRefs).toEqual([
      { label: "AI thread", threadId: "thread_1" },
    ]);
  });
});
