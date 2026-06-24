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
const DEFAULT_DECIDR_BASE_URL = "https://app.decidrmcp.com";

const REQUIREMENT_REQUEST_TYPES = ["persona", "bug", "feature"];
const REQUIREMENT_PRIORITIES = ["low", "medium", "high", "urgent"];
const DECISION_STAGE_VALUES = [
  "BACKLOG",
  "DRAFT",
  "PROPOSED",
  "APPROVED",
  "REJECTED",
  "IN_PROGRESS",
  "STAGED",
  "IMPLEMENTED",
];
const TASK_STAGE_VALUES = ["BACKLOG", "TODO", "IN_PROGRESS", "DONE", "BLOCKED"];

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
  {
    name: "persona-requirements-list",
    title: "List Persona Requirements",
    description:
      "List Persona Studio requirement decisions from DecidR using stable tags and optional filters.",
    inputSchema: {
      type: "object",
      properties: {
        organizationId: { type: "string", description: "DecidR organization ID expected by the caller." },
        customerOrganizationId: { type: "string" },
        personaKey: { type: "string" },
        requestType: { type: "string", enum: REQUIREMENT_REQUEST_TYPES },
        priority: { type: "string", enum: REQUIREMENT_PRIORITIES },
        status: { type: "string", enum: DECISION_STAGE_VALUES },
        ownerId: { type: "string" },
        implementerId: { type: "string" },
        decidrProjectId: { type: "string" },
        includeBugTasks: { type: "boolean", default: false },
        limit: { type: "integer", default: 50 },
        decidrBaseUrl: { type: "string" },
        decidrAuthorization: { type: "string" },
        decidrCookie: { type: "string" },
      },
      required: ["organizationId"],
      additionalProperties: true,
    },
  },
  {
    name: "persona-requirement-submit",
    title: "Submit Persona Requirement",
    description:
      "Create a Persona Studio requirement in DecidR. Persona and feature requests become decisions; plain bugs become tasks unless requiresDurableDecision is true.",
    inputSchema: {
      type: "object",
      properties: {
        organizationId: { type: "string" },
        customerOrganizationId: { type: "string" },
        personaKey: { type: "string" },
        requestType: { type: "string", enum: REQUIREMENT_REQUEST_TYPES },
        purpose: { type: "string" },
        skills: { type: "array", items: { type: "string" }, default: [] },
        guardrails: { type: "array", items: { type: "string" }, default: [] },
        outcomes: { type: "array", items: { type: "string" }, default: [] },
        priority: { type: "string", enum: REQUIREMENT_PRIORITIES, default: "medium" },
        sourceRefs: { type: "array", items: { type: "object" }, default: [] },
        compactSourceRefs: { type: "array", items: { type: "object" }, default: [] },
        requiresDurableDecision: { type: "boolean", default: false },
        decidrProjectId: { type: "string" },
        decidrDecisionId: { type: "string" },
        decidrInitiativeId: { type: "string" },
        decidrBridgeId: { type: "string" },
        assigneeId: { type: "string" },
        ownerId: { type: "string" },
        implementerId: { type: "string" },
        decidrBaseUrl: { type: "string" },
        decidrAuthorization: { type: "string" },
        decidrCookie: { type: "string" },
      },
      required: ["organizationId", "requestType", "purpose"],
      additionalProperties: true,
    },
  },
  {
    name: "persona-requirement-update-stage",
    title: "Update Persona Requirement Stage",
    description: "Move a Persona Studio requirement decision or bug task through its DecidR lifecycle stage.",
    inputSchema: {
      type: "object",
      properties: {
        organizationId: { type: "string" },
        recordType: { type: "string", enum: ["decision", "task"], default: "decision" },
        id: { type: "string" },
        status: { type: "string" },
        decidrBaseUrl: { type: "string" },
        decidrAuthorization: { type: "string" },
        decidrCookie: { type: "string" },
      },
      required: ["organizationId", "id", "status"],
      additionalProperties: true,
    },
  },
  {
    name: "persona-requirement-capture-conversation",
    title: "Capture Persona Requirement Conversation",
    description:
      "Capture compact AI conversation-derived requirement context as a DecidR audit event. Raw transcript text is not stored by default.",
    inputSchema: {
      type: "object",
      properties: {
        organizationId: { type: "string" },
        decidrProjectId: { type: "string" },
        decisionId: { type: "string" },
        taskId: { type: "string" },
        customerOrganizationId: { type: "string" },
        personaKey: { type: "string" },
        requestType: { type: "string", enum: REQUIREMENT_REQUEST_TYPES },
        summary: { type: "string" },
        compactSourceRefs: { type: "array", items: { type: "object" }, default: [] },
        sourceRefs: { type: "array", items: { type: "object" }, default: [] },
        externalReferenceId: { type: "string" },
        decidrBaseUrl: { type: "string" },
        decidrAuthorization: { type: "string" },
        decidrCookie: { type: "string" },
      },
      required: ["organizationId", "decidrProjectId", "summary"],
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

function decidrBaseUrl(args = {}) {
  return String(
    args.decidrBaseUrl ||
      args.decidrApiBaseUrl ||
      process.env.DECIDR_API_BASE_URL ||
      DEFAULT_DECIDR_BASE_URL,
  ).replace(/\/$/, "");
}

function decidrAuthHeaders(args = {}) {
  const headers = {
    "Content-Type": "application/json",
  };
  const authorization =
    args.decidrAuthorization ||
    args.decidrBearerToken ||
    args.authorization ||
    args.bearerToken ||
    process.env.DECIDR_AUTHORIZATION;
  const cookie = args.decidrCookie || process.env.DECIDR_COOKIE;
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
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== "") {
          search.append(key, String(item));
        }
      });
    } else {
      search.set(key, String(value));
    }
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

async function callDecidr(args, method, path, body) {
  const response = await fetch(`${decidrBaseUrl(args)}${path}`, {
    method,
    headers: decidrAuthHeaders(args),
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
        : `DecidR API request failed with HTTP ${response.status}.`;
    throw new Error(`${message}`);
  }
  return payload;
}

function requireOneOf(value, allowed, key) {
  const normalized = String(value || "").trim();
  if (!allowed.includes(normalized)) {
    throw new Error(`${key} must be one of: ${allowed.join(", ")}.`);
  }
  return normalized;
}

function optionalOneOf(value, allowed, fallback, key) {
  if (value === undefined || value === null || value === "") return fallback;
  return requireOneOf(value, allowed, key);
}

function compactStringList(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function compactSourceRefs(args) {
  const refs = Array.isArray(args.compactSourceRefs)
    ? args.compactSourceRefs
    : Array.isArray(args.sourceRefs)
      ? args.sourceRefs
      : [];
  return refs.slice(0, 12).map((ref, index) => {
    if (!ref || typeof ref !== "object" || Array.isArray(ref)) {
      return { index, label: String(ref || "").slice(0, 160) };
    }
    return {
      label: String(ref.label || ref.title || ref.kind || `source-${index + 1}`).slice(0, 160),
      url: ref.url ? String(ref.url).slice(0, 320) : undefined,
      threadId: ref.threadId ? String(ref.threadId).slice(0, 120) : undefined,
      messageId: ref.messageId ? String(ref.messageId).slice(0, 120) : undefined,
      occurredAt: ref.occurredAt ? String(ref.occurredAt).slice(0, 80) : undefined,
    };
  });
}

function personaRequirementTags(args, requestType, priority) {
  const tags = ["persona-studio", `request:${requestType}`, `priority:${priority}`];
  const personaKey = String(args.personaKey || "").trim();
  const customerOrganizationId = String(args.customerOrganizationId || "").trim();
  if (personaKey) tags.push(`persona:${personaKey}`);
  if (customerOrganizationId) tags.push(`customer:${customerOrganizationId}`);
  return tags;
}

function tagColor(name) {
  if (name === "persona-studio") return "#4f46e5";
  if (name.startsWith("request:bug")) return "#dc2626";
  if (name.startsWith("request:feature")) return "#0891b2";
  if (name.startsWith("request:persona")) return "#7c3aed";
  if (name.startsWith("priority:urgent")) return "#b91c1c";
  if (name.startsWith("priority:high")) return "#ea580c";
  if (name.startsWith("priority:medium")) return "#2563eb";
  if (name.startsWith("priority:low")) return "#64748b";
  return "#6b7280";
}

async function ensureDecidrTag(args, name) {
  const list = await callDecidr(args, "GET", "/api/tags");
  const tags = Array.isArray(list && list.data) ? list.data : Array.isArray(list) ? list : [];
  const existing = tags.find((tag) => String(tag.name || "") === name);
  if (existing && existing.id) return existing;
  try {
    const created = await callDecidr(args, "POST", "/api/tags", {
      name,
      color: tagColor(name),
    });
    return created && created.data ? created.data : created;
  } catch (error) {
    const retry = await callDecidr(args, "GET", "/api/tags");
    const retryTags = Array.isArray(retry && retry.data) ? retry.data : Array.isArray(retry) ? retry : [];
    const found = retryTags.find((tag) => String(tag.name || "") === name);
    if (found && found.id) return found;
    throw error;
  }
}

async function applyRequirementTags(args, decisionId, tagNames) {
  const applied = [];
  for (const name of tagNames) {
    const tag = await ensureDecidrTag(args, name);
    const tagId = tag && tag.id ? tag.id : null;
    if (!tagId) continue;
    await callDecidr(args, "POST", `/api/decisions/${encodeURIComponent(decisionId)}/tags`, {
      tagId,
    });
    applied.push({ id: tagId, name });
  }
  return applied;
}

function parentEntityForRequirement(args) {
  if (args.decidrProjectId || process.env.DECIDR_PERSONA_STUDIO_PROJECT_ID) {
    return {
      entityType: "PROJECT",
      projectId: args.decidrProjectId || process.env.DECIDR_PERSONA_STUDIO_PROJECT_ID,
    };
  }
  if (args.decidrInitiativeId) {
    return { entityType: "INITIATIVE", initiativeId: args.decidrInitiativeId };
  }
  if (args.decidrBridgeId) {
    return { entityType: "BRIDGE", bridgeId: args.decidrBridgeId };
  }
  throw new Error("decidrProjectId, decidrInitiativeId, or decidrBridgeId is required.");
}

function requirementTitle(args, requestType) {
  const personaKey = String(args.personaKey || "").trim();
  const prefix =
    requestType === "bug"
      ? "Bug"
      : requestType === "feature"
        ? "Feature"
        : "Persona proposal";
  const subject = personaKey ? ` for ${personaKey}` : "";
  return `${prefix}${subject}: ${String(args.purpose || "").trim().slice(0, 96)}`;
}

function requirementDescription(args, requestType, priority) {
  const refs = compactSourceRefs(args);
  const blocks = [
    `Persona Studio requirement request.`,
    ``,
    `Request type: ${requestType}`,
    `Priority: ${priority}`,
    `Organization: ${String(args.organizationId || "").trim()}`,
  ];
  if (args.customerOrganizationId) blocks.push(`Customer organization: ${String(args.customerOrganizationId).trim()}`);
  if (args.personaKey) blocks.push(`Persona: ${String(args.personaKey).trim()}`);
  blocks.push("", "Purpose:", String(args.purpose || "").trim());
  const skills = compactStringList(args.skills);
  const guardrails = compactStringList(args.guardrails);
  const outcomes = compactStringList(args.outcomes);
  if (skills.length) blocks.push("", "Skills:", skills.map((item) => `- ${item}`).join("\n"));
  if (guardrails.length) blocks.push("", "Guardrails:", guardrails.map((item) => `- ${item}`).join("\n"));
  if (outcomes.length) blocks.push("", "Outcomes:", outcomes.map((item) => `- ${item}`).join("\n"));
  if (refs.length) {
    blocks.push(
      "",
      "Compact source refs:",
      refs
        .map((ref) => {
          const parts = [ref.label, ref.url, ref.threadId, ref.messageId].filter(Boolean);
          return `- ${parts.join(" | ")}`;
        })
        .join("\n"),
    );
  }
  blocks.push("", "Tags:", personaRequirementTags(args, requestType, priority).join(", "));
  return blocks.join("\n");
}

async function listPersonaRequirements(args) {
  requireString(args, "organizationId");
  const tagNames = personaRequirementTags(
    args,
    optionalOneOf(args.requestType, REQUIREMENT_REQUEST_TYPES, "persona", "requestType"),
    optionalOneOf(args.priority, REQUIREMENT_PRIORITIES, "medium", "priority"),
  ).filter((tag) => {
    if (!args.requestType && tag.startsWith("request:")) return false;
    if (!args.priority && tag.startsWith("priority:")) return false;
    return true;
  });
  const decisions = await callDecidr(
    args,
    "GET",
    `/api/decisions${queryString({
      tagNames,
      status: args.status,
      ownerId: args.ownerId,
      implementerId: args.implementerId,
      projectId: args.decidrProjectId,
      take: args.limit || 50,
    })}`,
  );
  const result = {
    decisions: decisions && decisions.data ? decisions.data : decisions,
    filters: {
      tagNames,
      status: args.status || null,
      ownerId: args.ownerId || null,
      implementerId: args.implementerId || null,
      projectId: args.decidrProjectId || null,
    },
  };
  if (args.includeBugTasks) {
    result.bugTasks = await callDecidr(
      args,
      "GET",
      `/api/tasks${queryString({
        projectId: args.decidrProjectId,
        status: args.taskStatus,
        search: "Persona Studio requirement request",
        take: args.limit || 50,
      })}`,
    );
  }
  return result;
}

async function submitPersonaRequirement(args) {
  requireString(args, "organizationId");
  const requestType = requireOneOf(args.requestType, REQUIREMENT_REQUEST_TYPES, "requestType");
  const priority = optionalOneOf(args.priority, REQUIREMENT_PRIORITIES, "medium", "priority");
  const purpose = requireString(args, "purpose");
  const description = requirementDescription({ ...args, purpose }, requestType, priority);

  if (requestType === "bug" && args.requiresDurableDecision !== true) {
    const projectId = args.decidrProjectId || process.env.DECIDR_PERSONA_STUDIO_PROJECT_ID;
    if (!projectId && !args.decidrDecisionId) {
      throw new Error("decidrProjectId or decidrDecisionId is required for bug task creation.");
    }
    const task = await callDecidr(args, "POST", "/api/tasks", {
      title: requirementTitle(args, requestType),
      description,
      projectId,
      decisionId: args.decidrDecisionId,
      assigneeId: args.assigneeId,
      status: args.status || "TODO",
    });
    return {
      recordType: "task",
      task: task && task.data ? task.data : task,
      tags: personaRequirementTags(args, requestType, priority),
      mapping: "bug-task",
    };
  }

  const parent = parentEntityForRequirement(args);
  const decisionPayload = {
    title: requirementTitle(args, requestType),
    description,
    entityType: parent.entityType,
    projectId: parent.projectId,
    initiativeId: parent.initiativeId,
    bridgeId: parent.bridgeId,
    ownerId: args.ownerId,
    implementerId: args.implementerId,
    status: args.status || "DRAFT",
  };
  const decision = await callDecidr(args, "POST", "/api/decisions", decisionPayload);
  const decisionData = decision && decision.data ? decision.data : decision;
  const decisionId = decisionData && decisionData.id ? decisionData.id : null;
  const tags = decisionId
    ? await applyRequirementTags(args, decisionId, personaRequirementTags(args, requestType, priority))
    : [];
  return {
    recordType: "decision",
    decision: decisionData,
    tags,
    mapping: requestType === "bug" ? "durable-bug-decision" : `${requestType}-decision`,
  };
}

async function updatePersonaRequirementStage(args) {
  requireString(args, "organizationId");
  const id = encodeURIComponent(requireString(args, "id"));
  const recordType = String(args.recordType || "decision").toLowerCase();
  if (recordType === "task") {
    const status = requireOneOf(args.status, TASK_STAGE_VALUES, "status");
    return callDecidr(args, "POST", `/api/tasks/${id}/transition`, { status });
  }
  if (recordType !== "decision") {
    throw new Error("recordType must be decision or task.");
  }
  const status = requireOneOf(args.status, DECISION_STAGE_VALUES, "status");
  return callDecidr(args, "POST", `/api/decisions/${id}/transition`, { status });
}

async function capturePersonaRequirementConversation(args) {
  requireString(args, "organizationId");
  const projectId = requireString(args, "decidrProjectId");
  const summary = requireString(args, "summary");
  const refs = compactSourceRefs(args);
  const decisionIds = args.decisionId ? [String(args.decisionId)] : undefined;
  const payload = {
    projectId,
    title: "Persona Studio requirement capture",
    summary,
    category: "Persona Studio Requirements",
    payload: {
      personaKey: args.personaKey || null,
      requestType: args.requestType || null,
      organizationId: args.organizationId,
      customerOrganizationId: args.customerOrganizationId || null,
      taskId: args.taskId || null,
      compactSourceRefs: refs,
    },
    sourceContext: {
      source: "persona-studio",
      storagePolicy: "compact-summary-no-raw-transcript",
    },
    links: {
      decisionId: args.decisionId || null,
      taskId: args.taskId || null,
      sourceRefs: refs,
    },
    externalReferenceId:
      args.externalReferenceId ||
      `persona-studio:${args.personaKey || "unscoped"}:${Date.now()}`,
    createdByClient: "persona-studio-requirements",
    decisionIds,
  };
  return callDecidr(args, "POST", "/api/audit-events", payload);
}

async function proxyPersonaStudioTool(toolName, args = {}) {
  if (toolName === "persona-studio-open") {
    return { renderer: "persona_lab" };
  }

  if (toolName === "persona-requirements-list") {
    return listPersonaRequirements(args);
  }

  if (toolName === "persona-requirement-submit") {
    return submitPersonaRequirement(args);
  }

  if (toolName === "persona-requirement-update-stage") {
    return updatePersonaRequirementStage(args);
  }

  if (toolName === "persona-requirement-capture-conversation") {
    return capturePersonaRequirementConversation(args);
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
