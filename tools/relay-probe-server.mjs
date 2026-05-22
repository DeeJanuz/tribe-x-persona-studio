#!/usr/bin/env node

import http from "node:http";

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 4877);
const SERVER_NAME = "tribe-x-persona-studio-relay-probe";
const SERVER_VERSION = "0.1.0";
const TOOL_NAME = "relay-probe";
const PREFIXED_TOOL_NAME = "tribe_x_persona_studio__relay-probe";

const toolDefinition = {
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
  return String(name || "").trim();
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

function handleRpc(payload) {
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
      tools: [toolDefinition],
    });
  }

  if (payload.method === "tools/call") {
    const params = payload.params || {};
    const toolName = normalizeToolName(params.name);
    if (toolName !== TOOL_NAME && toolName !== PREFIXED_TOOL_NAME) {
      return rpcError(id, -32602, `Unknown tool: ${toolName || "(blank)"}`);
    }

    const args =
      params.arguments && typeof params.arguments === "object" && !Array.isArray(params.arguments)
        ? params.arguments
        : {};
    if (!String(args.marker || "").trim()) {
      return rpcError(id, -32602, "marker is required.");
    }

    return rpcResult(id, buildProbeResult(args));
  }

  return rpcError(id, -32601, `Unsupported method: ${payload.method || "(blank)"}`);
}

const server = http.createServer(async (request, response) => {
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
    const result = handleRpc(payload);
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

server.listen(PORT, HOST, () => {
  console.log(`${SERVER_NAME} ${SERVER_VERSION} listening at http://${HOST}:${PORT}/mcp`);
});
