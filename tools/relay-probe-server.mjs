#!/usr/bin/env node

import http from "node:http";

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 4877);
const SERVER_NAME = "tribe-x-persona-studio-relay-probe";
const SERVER_VERSION = "0.1.0";
const TOOL_NAME = "relay-probe";
const PREFIXED_TOOL_NAME = "tribe_x_persona_studio__relay-probe";
const TOOL_PREFIX = "tribe_x_persona_studio__";
const DEFAULT_CONTROL_PLANE_BASE_URL = "https://dev.app.tribexai.com";

const relayProbeToolDefinition = {
  name: TOOL_NAME,
  title: "TribeX Relay Probe",
  description:
    "Echoes a marker and message for end-to-end validation of Persona Studio MCPViews plugin relay grants.",
  inputSchema: {
    type: "object",
    properties: {
      marker: {
        type: "string",
        description: "Unique test marker that must be echoed back.",
      },
      message: {
        type: "string",
        description: "Optional message to echo with the marker.",
      },
      includeContext: {
        type: "boolean",
        description: "When true, include deterministic server context fields.",
        default: true,
      },
    },
    required: ["marker"],
    additionalProperties: false,
  },
};

const personaStudioToolDefinitions = [
  {
    name: "persona-studio-open",
    title: "Open Persona Studio",
    description: "Return a lightweight payload for opening the Persona Studio renderer.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: true,
    },
  },
  {
    name: "list-personas",
    title: "List Personas",
    description:
      "List consultant-owned Persona Studio personas for the selected consultant organization.",
    inputSchema: {
      type: "object",
      properties: {
        organizationId: { type: "string", description: "Consultant organization ID." },
        includeArchived: { type: "boolean", default: false },
        authorization: { type: "string", description: "Optional bearer token or Authorization header." },
        cookie: { type: "string", description: "Optional authenticated dev control-plane cookie header." },
      },
      required: ["organizationId"],
      additionalProperties: true,
    },
  },
  {
    name: "get-persona",
    title: "Get Persona",
    description: "Fetch a Persona Studio persona document before editing it.",
    inputSchema: {
      type: "object",
      properties: {
        organizationId: { type: "string" },
        personaKey: { type: "string" },
        authorization: { type: "string" },
        cookie: { type: "string" },
      },
      required: ["organizationId", "personaKey"],
      additionalProperties: true,
    },
  },
  {
    name: "create-persona",
    title: "Create Persona",
    description:
      "Create a new consultant-owned Persona Studio draft through the dev control plane.",
    inputSchema: {
      type: "object",
      properties: {
        organizationId: { type: "string" },
        key: { type: "string" },
        displayName: { type: "string" },
        description: { type: "string" },
        metadataGroup: { type: "string" },
        sourcePlatformPersonaKey: { type: "string" },
        authorization: { type: "string" },
        cookie: { type: "string" },
      },
      required: ["organizationId", "key", "displayName"],
      additionalProperties: true,
    },
  },
  {
    name: "update-persona",
    title: "Update Persona",
    description:
      "Save a Persona Studio draft. Fetch the persona first, update the document fields, then submit definition, draft, prompt, and optional customSkills.",
    inputSchema: {
      type: "object",
      properties: {
        organizationId: { type: "string" },
        personaKey: { type: "string" },
        definition: { type: "object", additionalProperties: true },
        draft: { type: "object", additionalProperties: true },
        prompt: { type: "string" },
        customSkills: { type: "array", items: { type: "object" }, default: [] },
        authorization: { type: "string" },
        cookie: { type: "string" },
      },
      required: ["organizationId", "personaKey", "definition", "draft", "prompt"],
      additionalProperties: true,
    },
  },
  {
    name: "archive-persona",
    title: "Archive Persona",
    description: "Archive a consultant-owned Persona Studio persona through the dev control plane.",
    inputSchema: {
      type: "object",
      properties: {
        organizationId: { type: "string" },
        personaKey: { type: "string" },
        reason: { type: "string" },
        authorization: { type: "string" },
        cookie: { type: "string" },
      },
      required: ["organizationId", "personaKey"],
      additionalProperties: true,
    },
  },
  {
    name: "unarchive-persona",
    title: "Unarchive Persona",
    description: "Restore an archived consultant-owned Persona Studio persona.",
    inputSchema: {
      type: "object",
      properties: {
        organizationId: { type: "string" },
        personaKey: { type: "string" },
        authorization: { type: "string" },
        cookie: { type: "string" },
      },
      required: ["organizationId", "personaKey"],
      additionalProperties: true,
    },
  },
  {
    name: "list-test-suites",
    title: "List Test Suites",
    description: "List synthetic Persona Studio test suites for a persona.",
    inputSchema: {
      type: "object",
      properties: {
        organizationId: { type: "string" },
        personaKey: { type: "string" },
        authorization: { type: "string" },
        cookie: { type: "string" },
      },
      required: ["organizationId", "personaKey"],
      additionalProperties: true,
    },
  },
  {
    name: "create-test-suite",
    title: "Create Test Suite",
    description:
      "Create a synthetic Persona Studio test suite for a consultant-owned persona.",
    inputSchema: {
      type: "object",
      properties: {
        organizationId: { type: "string" },
        personaKey: { type: "string" },
        sourceStage: { type: "string", enum: ["draft", "beta", "deployed"], default: "draft" },
        name: { type: "string" },
        description: { type: "string" },
        releaseNotes: { type: "string" },
        cases: { type: "array", items: { type: "object" }, default: [] },
        authorization: { type: "string" },
        cookie: { type: "string" },
      },
      required: ["organizationId", "personaKey", "name"],
      additionalProperties: true,
    },
  },
  {
    name: "run-test-suite",
    title: "Run Test Suite",
    description: "Launch a Persona Studio synthetic test-suite run.",
    inputSchema: {
      type: "object",
      properties: {
        organizationId: { type: "string" },
        suiteId: { type: "string" },
        authorization: { type: "string" },
        cookie: { type: "string" },
      },
      required: ["organizationId", "suiteId"],
      additionalProperties: true,
    },
  },
];

const toolDefinitions = [relayProbeToolDefinition, ...personaStudioToolDefinitions];

function jsonResponse(response, status, payload, headers = {}) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
    ...headers,
  });
  response.end(body);
}

function rpcResult(id, result) {
  return {
    jsonrpc: "2.0",
    id,
    result,
  };
}

function rpcError(id, code, message) {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
    },
  };
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Request body is too large."));
        request.destroy();
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function normalizeToolName(name) {
  const raw = String(name || "").trim();
  return raw.startsWith(TOOL_PREFIX) ? raw.slice(TOOL_PREFIX.length) : raw;
}

function buildProbeResult(args) {
  const includeContext = args.includeContext !== false;
  const result = {
    ok: true,
    tool: "tribe-x-persona-studio.relay-probe",
    relayToolName: PREFIXED_TOOL_NAME,
    marker: String(args.marker || ""),
    message: typeof args.message === "string" ? args.message : "",
    receivedArguments: args,
  };

  if (includeContext) {
    result.server = SERVER_NAME;
    result.version = SERVER_VERSION;
    result.transport = "mcpviews-local-http";
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

function toolResult(payload) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

function requireString(args, key) {
  const value = String(args[key] || "").trim();
  if (!value) {
    throw new Error(`${key} is required.`);
  }
  return value;
}

function controlPlaneBaseUrl(args = {}) {
  return String(
    args.apiBaseUrl ||
      args.controlPlaneBaseUrl ||
      process.env.TRIBEX_PERSONA_STUDIO_API_BASE_URL ||
      DEFAULT_CONTROL_PLANE_BASE_URL,
  ).replace(/\/$/, "");
}

function authHeaders(args = {}) {
  const headers = {
    "Content-Type": "application/json",
  };
  const authorization =
    args.authorization || args.bearerToken || process.env.TRIBEX_PERSONA_STUDIO_AUTHORIZATION;
  const cookie = args.cookie || process.env.TRIBEX_PERSONA_STUDIO_COOKIE;
  if (authorization) {
    headers.Authorization = String(authorization).startsWith("Bearer ")
      ? String(authorization)
      : `Bearer ${authorization}`;
  }
  if (cookie) {
    headers.Cookie = String(cookie);
  }
  return headers;
}

function queryString(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

async function callControlPlane(args, method, path, body) {
  const response = await fetch(`${controlPlaneBaseUrl(args)}${path}`, {
    method,
    headers: authHeaders(args),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let payload = {};
  if (text.trim()) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { text };
    }
  }
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && payload.error
        ? payload.error
        : `Persona Studio API request failed with HTTP ${response.status}.`;
    throw new Error(`${message}`);
  }
  return payload;
}

async function proxyPersonaStudioTool(toolName, args = {}) {
  if (toolName === "persona-studio-open") {
    return { renderer: "persona_lab" };
  }

  if (toolName === "list-personas") {
    const organizationId = requireString(args, "organizationId");
    return callControlPlane(
      args,
      "GET",
      `/admin/persona-studio/personas${queryString({
        organizationId,
        includeArchived: args.includeArchived === true ? "true" : undefined,
      })}`,
    );
  }

  if (toolName === "get-persona") {
    const organizationId = requireString(args, "organizationId");
    const personaKey = encodeURIComponent(requireString(args, "personaKey"));
    return callControlPlane(
      args,
      "GET",
      `/admin/persona-studio/personas/${personaKey}${queryString({ organizationId })}`,
    );
  }

  if (toolName === "create-persona") {
    return callControlPlane(args, "POST", "/admin/persona-studio/personas", {
      organizationId: requireString(args, "organizationId"),
      key: requireString(args, "key"),
      displayName: requireString(args, "displayName"),
      description: args.description,
      metadataGroup: args.metadataGroup,
      sourcePlatformPersonaKey: args.sourcePlatformPersonaKey,
    });
  }

  if (toolName === "update-persona") {
    const personaKey = encodeURIComponent(requireString(args, "personaKey"));
    return callControlPlane(args, "PUT", `/admin/persona-studio/personas/${personaKey}`, {
      organizationId: requireString(args, "organizationId"),
      definition: args.definition,
      draft: args.draft,
      prompt: requireString(args, "prompt"),
      customSkills: Array.isArray(args.customSkills) ? args.customSkills : [],
    });
  }

  if (toolName === "archive-persona") {
    const personaKey = encodeURIComponent(requireString(args, "personaKey"));
    return callControlPlane(args, "POST", `/admin/persona-studio/personas/${personaKey}/archive`, {
      organizationId: requireString(args, "organizationId"),
      reason: args.reason,
    });
  }

  if (toolName === "unarchive-persona") {
    const organizationId = requireString(args, "organizationId");
    const personaKey = encodeURIComponent(requireString(args, "personaKey"));
    return callControlPlane(
      args,
      "POST",
      `/admin/persona-studio/personas/${personaKey}/unarchive`,
      { organizationId },
    );
  }

  if (toolName === "list-test-suites") {
    const organizationId = requireString(args, "organizationId");
    const personaKey = encodeURIComponent(requireString(args, "personaKey"));
    return callControlPlane(
      args,
      "GET",
      `/admin/persona-studio/personas/${personaKey}/test-suites${queryString({
        organizationId,
      })}`,
    );
  }

  if (toolName === "create-test-suite") {
    const personaKey = encodeURIComponent(requireString(args, "personaKey"));
    return callControlPlane(args, "POST", `/admin/persona-studio/personas/${personaKey}/test-suites`, {
      organizationId: requireString(args, "organizationId"),
      sourceStage: args.sourceStage || "draft",
      name: requireString(args, "name"),
      description: args.description,
      releaseNotes: args.releaseNotes,
      cases: Array.isArray(args.cases) ? args.cases : [],
    });
  }

  if (toolName === "run-test-suite") {
    const suiteId = encodeURIComponent(requireString(args, "suiteId"));
    return callControlPlane(args, "POST", `/admin/persona-studio/test-suites/${suiteId}/runs`, {
      organizationId: requireString(args, "organizationId"),
    });
  }

  throw new Error(`Unknown tool: ${toolName || "(blank)"}`);
}

export async function handleToolCall(name, rawArgs = {}) {
  const toolName = normalizeToolName(name);
  const args =
    rawArgs && typeof rawArgs === "object" && !Array.isArray(rawArgs) ? rawArgs : {};
  if (toolName === TOOL_NAME) {
    if (!String(args.marker || "").trim()) {
      throw new Error("marker is required.");
    }
    return buildProbeResult(args);
  }
  return toolResult(await proxyPersonaStudioTool(toolName, args));
}

export async function handleRpc(payload) {
  const id = Object.prototype.hasOwnProperty.call(payload, "id") ? payload.id : null;

  if (payload.method === "initialize") {
    return rpcResult(id, {
      protocolVersion: "2025-11-25",
      capabilities: {
        tools: {
          listChanged: false,
        },
      },
      serverInfo: {
        name: SERVER_NAME,
        version: SERVER_VERSION,
      },
    });
  }

  if (payload.method === "notifications/initialized") {
    return null;
  }

  if (payload.method === "tools/list") {
    return rpcResult(id, {
      tools: toolDefinitions,
    });
  }

  if (payload.method === "tools/call") {
    const params = payload.params || {};
    try {
      return rpcResult(id, await handleToolCall(params.name, params.arguments || {}));
    } catch (error) {
      return rpcError(id, -32602, error instanceof Error ? error.message : String(error));
    }
  }

  return rpcError(id, -32601, `Unsupported method: ${payload.method || "(blank)"}`);
}

export function createServer() {
  return http.createServer(async (request, response) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, mcp-session-id");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method === "GET" && request.url === "/health") {
    jsonResponse(response, 200, {
      ok: true,
      server: SERVER_NAME,
      version: SERVER_VERSION,
      tool: TOOL_NAME,
    });
    return;
  }

  if (request.method !== "POST" || request.url !== "/mcp") {
    jsonResponse(response, 404, {
      error: "Not found.",
    });
    return;
  }

  try {
    const body = await readBody(request);
    const payload = body ? JSON.parse(body) : {};
    const result = await handleRpc(payload);
    if (!result) {
      response.writeHead(202, {
        "Content-Type": "application/json",
      });
      response.end("{}");
      return;
    }
    jsonResponse(response, 200, result, {
      "mcp-session-id": "tribex-relay-probe-local",
    });
  } catch (error) {
    jsonResponse(response, 400, rpcError(null, -32700, error instanceof Error ? error.message : String(error)));
  }
});
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createServer().listen(PORT, HOST, () => {
    console.log(`${SERVER_NAME} ${SERVER_VERSION} listening at http://${HOST}:${PORT}/mcp`);
  });
}
