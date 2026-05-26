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
});
