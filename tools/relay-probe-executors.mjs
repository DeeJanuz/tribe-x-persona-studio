const DEFAULT_MCP_URL = "http://127.0.0.1:4877/mcp";
const TOOL_NAME = "relay-probe";
const PREFIXED_TOOL_NAME = "tribe_x_persona_studio__relay-probe";

function readMcpUrl() {
  return String(process.env.TRIBEX_RELAY_PROBE_MCP_URL || DEFAULT_MCP_URL).trim();
}

async function callRelayProbeTool(args) {
  const response = await fetch(readMcpUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `relay-probe-${Date.now()}`,
      method: "tools/call",
      params: {
        name: PREFIXED_TOOL_NAME,
        arguments: args,
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) {
    const message =
      payload && payload.error && payload.error.message
        ? payload.error.message
        : `Relay probe MCP call failed with HTTP ${response.status}.`;
    throw new Error(message);
  }
  return payload.result;
}

async function relayProbeExecutor(request, context) {
  const result = await callRelayProbeTool(request && request.toolArgs ? request.toolArgs : {});
  if (context && typeof context.emit === "function") {
    context.emit({
      type: "relay_probe_executor_result",
      requestId: request.requestId,
      toolName: request.toolName,
      mcpUrl: readMcpUrl(),
    });
  }
  return result;
}

export const toolExecutors = {
  [TOOL_NAME]: relayProbeExecutor,
  [PREFIXED_TOOL_NAME]: relayProbeExecutor,
  "tribe-x-persona-studio:relay-probe": relayProbeExecutor,
  "tribe-x-persona-studio.relay-probe": relayProbeExecutor,
};

export default toolExecutors;
