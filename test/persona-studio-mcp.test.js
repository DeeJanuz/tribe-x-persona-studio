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
    expect(names).toContain("persona-requirement-submit");
    expect(names).toContain("persona-requirements-list");
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

  it("submits persona proposals as tagged DecidR decisions", async () => {
    const tags = [];
    const fetchMock = vi.fn(async (url, options = {}) => {
      const parsedUrl = new URL(url);
      if (options.method === "POST" && parsedUrl.pathname === "/api/decisions") {
        return new Response(JSON.stringify({ data: { id: "dec_1" } }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (options.method === "GET" && parsedUrl.pathname === "/api/tags") {
        return new Response(JSON.stringify({ data: tags }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (options.method === "POST" && parsedUrl.pathname === "/api/tags") {
        const body = JSON.parse(options.body);
        const tag = { id: `tag_${tags.length + 1}`, name: body.name };
        tags.push(tag);
        return new Response(JSON.stringify({ data: tag }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (options.method === "POST" && parsedUrl.pathname === "/api/decisions/dec_1/tags") {
        return new Response(JSON.stringify({ success: true }), {
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
        decidrAuthorization: "Bearer decidr-token",
      }),
    );

    expect(result.recordType).toBe("decision");
    expect(result.mapping).toBe("persona-decision");
    expect(tags.map((tag) => tag.name)).toEqual([
      "persona-studio",
      "request:persona",
      "priority:high",
      "persona:qa-coach",
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://app.decidrmcp.com/api/decisions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer decidr-token",
        }),
        body: expect.stringContaining("Acceptance review"),
      }),
    );
  });

  it("submits plain bug reports as DecidR tasks", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { id: "task_1" } }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
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
    expect(result.mapping).toBe("bug-task");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://app.decidrmcp.com/api/tasks",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("request:bug"),
      }),
    );
  });

  it("captures conversation summaries as compact DecidR audit events", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { id: "audit_1" } }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await handleToolCall("persona-requirement-capture-conversation", {
      organizationId: "org_consultant",
      decidrProjectId: "proj_1",
      decisionId: "dec_1",
      personaKey: "qa-coach",
      requestType: "feature",
      summary: "User asked the persona to include compliance escalation steps.",
      compactSourceRefs: [{ label: "AI thread", threadId: "thread_1" }],
      externalReferenceId: "thread_1:feature",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://app.decidrmcp.com/api/audit-events",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("compact-summary-no-raw-transcript"),
      }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.decisionIds).toEqual(["dec_1"]);
    expect(body.payload.compactSourceRefs).toEqual([
      { label: "AI thread", threadId: "thread_1" },
    ]);
  });
});
