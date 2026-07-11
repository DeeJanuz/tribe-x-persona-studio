import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  Background,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import reactFlowStyles from "@xyflow/react/dist/style.css";
import builderStyles from "./persona-test-builder.css";
import { stickyNotePositionFromPointerDelta } from "./sticky-note-position";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import {
  AlignCenter,
  ArrowLeft,
  Beaker,
  Braces,
  Check,
  ChevronDown,
  CirclePlay,
  Clipboard,
  Database,
  FileJson,
  FileText,
  FlaskConical,
  Focus,
  GitBranch,
  Grip,
  History,
  Keyboard,
  List,
  MessageSquare,
  MoreHorizontal,
  PanelBottom,
  Play,
  Plus,
  Redo2,
  Save,
  Search,
  Settings2,
  SlidersHorizontal,
  Square,
  StickyNote,
  Terminal,
  Trash2,
  Undo2,
  Variable,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

function ensureBuilderStyles() {
  if (document.querySelector("style[data-persona-test-builder]")) return;
  const style = document.createElement("style");
  style.dataset.personaTestBuilder = "true";
  style.textContent = `${reactFlowStyles}\n${builderStyles}`;
  document.head.appendChild(style);
}

type GraphNode = {
  id: string;
  type: string;
  name: string;
  prompt?: string;
  feedback?: string;
  action?: string;
  expression?: string;
  variables?: Record<string, unknown>;
  [key: string]: unknown;
};

type GraphEdge = {
  id: string;
  source: string;
  target: string;
  condition?: string;
  isDefault?: boolean;
  label?: string;
};

type Scenario = {
  id: string;
  name: string;
  mode: "contract" | "live_probe";
  datasetMode: "row" | "whole_file";
  graph: {
    startNodeId: string;
    limits?: { maxPersonaTurns: number; maxNodeVisits: number; maxElapsedMs: number };
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  assertions: Array<Record<string, unknown>>;
};

type Definition = {
  schemaVersion: "2.0";
  name: string;
  description?: string;
  persona: { key: string; sourceStage: string; revision: string };
  variables?: Record<string, unknown>;
  fixtures: { tools: unknown[]; files: unknown[]; clock?: string; uuidSeed?: string };
  scenarios: Scenario[];
  experiment: {
    repetitions?: number;
    axes: Array<Record<string, unknown>>;
    excludes?: Array<Record<string, string>>;
    overrides?: Array<Record<string, unknown>>;
  };
  thresholdProfile: {
    name: string;
    classes: Record<string, unknown>;
    overrides: unknown[];
  };
  evaluatorVersions: { deterministic: string; judge?: string; userSimulator?: string };
  metadata?: Record<string, unknown>;
};

type BuilderProps = {
  suiteId: string;
  organizationId: string;
  personaKey: string;
  sourceStage?: string;
  apiBaseUrl?: string;
  request?: (
    method: string,
    path: string,
    body: unknown,
    query: Record<string, string> | null,
  ) => Promise<any>;
  onStatus?: (message: string, kind?: "success" | "error" | "info") => void;
  onExit?: () => void;
  latestRun?: Record<string, any> | null;
};

type StudioScenarioLayout = {
  positions?: Record<string, { x: number; y: number }>;
  viewport?: { x: number; y: number; zoom: number };
  notes?: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    content: string;
    color: "yellow" | "blue" | "pink" | "green";
  }>;
};

type StudioMetadata = {
  schemaVersion: 1;
  scenarios: Record<string, StudioScenarioLayout>;
  lastSelectedScenario?: string;
};

type DraftRecord = {
  definition: Definition;
  definitionHash: string;
  revision: number;
  updatedById: string;
  updatedAt: string;
};

type DatasetUpload = {
  id: string;
  name: string;
  mode: "row" | "whole_file";
  rowCount: number;
  checksum: string;
  expiresAt: string;
  units: Array<{
    id: string;
    hash: string;
    uploadId: string;
    mode: "row" | "whole_file";
  }>;
};

const NODE_TYPES = [
  ["start", "Start"],
  ["dataset", "Dataset"],
  ["set_variables", "Set Variables"],
  ["fixture_setup", "Fixture Setup"],
  ["persona_exchange", "Persona Exchange"],
  ["review_action", "Review Action"],
  ["gateway", "Gateway / Switch"],
  ["assertion", "Assertion"],
  ["end", "End"],
] as const;

function defaultDefinition(props: BuilderProps): Definition {
  return {
    schemaVersion: "2.0",
    name: "New evaluation suite",
    persona: {
      key: props.personaKey,
      sourceStage: props.sourceStage || "draft",
      revision: `${props.sourceStage || "draft"}-current`,
    },
    variables: { type: "object", properties: {} },
    fixtures: {
      tools: [],
      files: [],
      clock: new Date().toISOString(),
      uuidSeed: props.suiteId,
    },
    scenarios: [
      {
        id: "scenario-1",
        name: "Primary contract",
        mode: "contract",
        datasetMode: "row",
        graph: {
          startNodeId: "start",
          limits: { maxPersonaTurns: 12, maxNodeVisits: 50, maxElapsedMs: 600_000 },
          nodes: [
            { id: "start", type: "start", name: "Start" },
            {
              id: "exchange",
              type: "persona_exchange",
              name: "Persona Exchange",
              prompt: "Describe the task to evaluate.",
            },
            { id: "end", type: "end", name: "End" },
          ],
          edges: [
            { id: "start-exchange", source: "start", target: "exchange" },
            { id: "exchange-end", source: "exchange", target: "end" },
          ],
        },
        assertions: [],
      },
    ],
    experiment: { repetitions: 3, axes: [], excludes: [], overrides: [] },
    thresholdProfile: { name: "Consultant acceptance", classes: {}, overrides: [] },
    evaluatorVersions: { deterministic: "persona-test-evaluator@2" },
  };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function studioMetadata(definition: Definition): StudioMetadata {
  const candidate = definition.metadata?.studio as StudioMetadata | undefined;
  if (candidate?.schemaVersion === 1 && candidate.scenarios) return candidate;
  return { schemaVersion: 1, scenarios: {} };
}

function flowNodes(scenario: Scenario, definition?: Definition): Node[] {
  const layout = definition ? studioMetadata(definition).scenarios[scenario.id] : undefined;
  return scenario.graph.nodes.map((node, index) => ({
    id: node.id,
    position: {
      x: layout?.positions?.[node.id]?.x ?? 80 + index * 260,
      y: layout?.positions?.[node.id]?.y ?? 160 + (index % 2) * 80,
    },
    data: { label: node.name, nodeType: node.type, node },
    type: "personaNode",
  }));
}

function flowEdges(scenario: Scenario): Edge[] {
  return scenario.graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label || (edge.isDefault ? "default" : edge.condition || ""),
    data: edge,
  }));
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "node";
}

const NODE_GROUPS = [
  { label: "Flow", types: ["start", "gateway", "end"] },
  { label: "Inputs & State", types: ["dataset", "set_variables", "fixture_setup"] },
  { label: "Conversation", types: ["persona_exchange", "review_action"] },
  { label: "Validation", types: ["assertion"] },
];

const NODE_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  start: CirclePlay,
  dataset: Database,
  set_variables: Variable,
  fixture_setup: FlaskConical,
  persona_exchange: MessageSquare,
  review_action: Clipboard,
  gateway: GitBranch,
  assertion: Check,
  end: Square,
};

function PersonaNodeCard({ data, selected }: NodeProps<Node<{ label: string; nodeType: string }>>) {
  const Icon = NODE_ICONS[data.nodeType] || Braces;
  return (
    <div className={`ptb-node-card type-${data.nodeType}${selected ? " is-selected" : ""}`}>
      <Handle type="target" position={Position.Left} aria-label={`Connect into ${data.label}`} />
      <span className="ptb-node-icon"><Icon size={18} /></span>
      <span className="ptb-node-copy"><strong>{data.label}</strong><small>{NODE_TYPES.find(([type]) => type === data.nodeType)?.[1] || data.nodeType}</small></span>
      <span className="ptb-node-more" aria-hidden="true"><MoreHorizontal size={16} /></span>
      <Handle type="source" position={Position.Right} aria-label={`Connect from ${data.label}`} />
    </div>
  );
}

const FLOW_NODE_TYPES = { personaNode: PersonaNodeCard };

function CanvasControls({ onTidy }: { onTidy: () => void }) {
  const flow = useReactFlow();
  return <div className="ptb-canvas-controls" aria-label="Canvas controls">
    <button aria-label="Fit graph" onClick={() => void flow.fitView({ padding: 0.24 })}><Focus size={16} /></button>
    <button aria-label="Zoom in" onClick={() => flow.zoomIn()}><ZoomIn size={16} /></button>
    <button aria-label="Zoom out" onClick={() => flow.zoomOut()}><ZoomOut size={16} /></button>
    <button aria-label="Tidy graph" onClick={onTidy}><AlignCenter size={16} /></button>
  </div>;
}

function datasetMediaType(file: File): string {
  if (file.type === "text/csv" || file.name.toLowerCase().endsWith(".csv")) return "text/csv";
  if (file.type === "application/x-ndjson" || /\.(jsonl|ndjson)$/i.test(file.name)) {
    return "application/x-ndjson";
  }
  return "application/json";
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 32_768;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function PersonaTestBuilder(props: BuilderProps) {
  const [definition, setDefinition] = useState<Definition>(() => defaultDefinition(props));
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const scenario = definition.scenarios[scenarioIndex] || definition.scenarios[0];
  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes(scenario, definition));
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges(scenario));
  const [selectedNodeId, setSelectedNodeId] = useState<string>(scenario.graph.startNodeId);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [format, setFormat] = useState<"json" | "yaml">("json");
  const [sourceText, setSourceText] = useState("");
  const [validation, setValidation] = useState<Record<string, unknown> | null>(null);
  const [versionId, setVersionId] = useState<string | null>(null);
  const [preflight, setPreflight] = useState<Record<string, any> | null>(null);
  const [suiteRun, setSuiteRun] = useState<Record<string, any> | null>(null);
  const [executions, setExecutions] = useState<Array<Record<string, any>>>([]);
  const [trace, setTrace] = useState<Record<string, any> | null>(null);
  const [datasetUploads, setDatasetUploads] = useState<DatasetUpload[]>([]);
  const [busy, setBusy] = useState("");
  const [announcement, setAnnouncement] = useState("Evaluation graph editor ready.");
  const [activeTab, setActiveTab] = useState<"editor" | "executions" | "results">("editor");
  const [detailNodeId, setDetailNodeId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<"input" | "parameters" | "output">("parameters");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSourceNodeId, setPickerSourceNodeId] = useState<string | null>(null);
  const [pickerEdgeId, setPickerEdgeId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<"resources" | "experiment" | "source" | null>(null);
  const [bottomDrawerOpen, setBottomDrawerOpen] = useState(false);
  const [bottomTab, setBottomTab] = useState<"problems" | "logs" | "trace">("problems");
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [focusMode, setFocusMode] = useState(false);
  const [draftRevision, setDraftRevision] = useState<number | null>(null);
  const [draftHash, setDraftHash] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<"loading" | "saved" | "unsaved" | "saving" | "invalid" | "conflict">("loading");
  const [draftConflictState, setDraftConflictState] = useState<Record<string, unknown> | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [styleFailure, setStyleFailure] = useState(false);
  const shellRef = useRef<HTMLElement | null>(null);
  const clipboardRef = useRef<{ nodes: GraphNode[]; edges: GraphEdge[] } | null>(null);
  const undoStack = useRef<Definition[]>([]);
  const redoStack = useRef<Definition[]>([]);
  const definitionRef = useRef(definition);
  const draftRevisionRef = useRef<number | null>(null);
  const noteDragRef = useRef<{
    noteId: string;
    pointerId: number;
    pointerStart: { x: number; y: number };
    noteStart: { x: number; y: number };
    current: { x: number; y: number };
    element: HTMLElement;
  } | null>(null);

  useEffect(() => { definitionRef.current = definition; }, [definition]);
  useEffect(() => { draftRevisionRef.current = draftRevision; }, [draftRevision]);

  const api = useCallback(
    async (path: string, options: RequestInit = {}) => {
      if (props.request) {
        const url = new URL(path, "https://persona-studio.local");
        const query = Object.fromEntries(url.searchParams.entries());
        const body = typeof options.body === "string" ? JSON.parse(options.body) : options.body || null;
        try {
          const payload = await props.request(options.method || "GET", url.pathname, body, query);
          return { payload, response: { headers: new Headers() } as Pick<Response, "headers"> };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const status = Number(message.match(/HTTP (\d{3})/)?.[1] || 0) || undefined;
          const jsonStart = message.indexOf('{"error"');
          let payload: Record<string, any> = {};
          if (jsonStart >= 0) {
            try { payload = JSON.parse(message.slice(jsonStart)); } catch { /* use bridge message */ }
          }
          throw Object.assign(new Error(payload.error || message), { status, payload });
        }
      }
      const response = await fetch(`${props.apiBaseUrl || ""}${path}`, {
        credentials: "include",
        ...options,
        headers: { "content-type": "application/json", ...(options.headers || {}) },
      });
      const text = await response.text();
      let payload: any = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        payload = { text };
      }
      if (!response.ok) {
        throw Object.assign(
          new Error(payload.error || payload.message || `Request failed (${response.status}).`),
          { status: response.status, payload },
        );
      }
      return { payload, response };
    },
    [props.apiBaseUrl, props.request],
  );

  const report = useCallback(
    (message: string, kind: "success" | "error" | "info" = "info") => {
      setAnnouncement(message);
      props.onStatus?.(message, kind);
    },
    [props.onStatus],
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const topbar = shellRef.current?.querySelector<HTMLElement>("[data-style-probe='topbar']");
      const styles = topbar ? window.getComputedStyle(topbar) : null;
      const ready = Boolean(document.querySelector("style[data-persona-test-builder]") && styles?.display === "grid");
      setStyleFailure(!ready);
      if (!ready) report("Persona Test Builder styles failed readiness validation.", "error");
    });
    return () => window.cancelAnimationFrame(frame);
  }, [report]);

  const installDefinition = useCallback((next: Definition, remember = true) => {
    if (remember) {
      undoStack.current.push(clone(definition));
      if (undoStack.current.length > 50) undoStack.current.shift();
      redoStack.current = [];
    }
    setDefinition(next);
    const nextScenario = next.scenarios[Math.min(scenarioIndex, next.scenarios.length - 1)] || next.scenarios[0];
    setNodes(flowNodes(nextScenario, next));
    setEdges(flowEdges(nextScenario));
    setSelectedNodeId(nextScenario.graph.startNodeId);
    setPreflight(null);
    setVersionId(null);
    setDraftStatus((current) => current === "loading" ? current : "unsaved");
  }, [definition, scenarioIndex, setEdges, setNodes]);

  useEffect(() => {
    let cancelled = false;
    if (props.latestRun?.id) {
      setSuiteRun(props.latestRun);
    }
    api(
      `/admin/persona-studio/test-suites/${encodeURIComponent(props.suiteId)}/draft?organizationId=${encodeURIComponent(props.organizationId)}`,
    )
      .then(({ payload }) => {
        if (cancelled) return;
        const draft = payload as DraftRecord;
        const next = draft.definition;
        const preferred = studioMetadata(next).lastSelectedScenario;
        const nextIndex = Math.max(0, next.scenarios.findIndex((item) => item.id === preferred));
        setDefinition(next);
        definitionRef.current = next;
        setScenarioIndex(nextIndex);
        setNodes(flowNodes(next.scenarios[nextIndex], next));
        setEdges(flowEdges(next.scenarios[nextIndex]));
        setSelectedNodeId(next.scenarios[nextIndex].graph.startNodeId);
        setDraftRevision(draft.revision);
        draftRevisionRef.current = draft.revision;
        setDraftHash(draft.definitionHash);
        setDraftStatus("saved");
        setLoaded(true);
        report("Loaded editable suite draft.");
      })
      .catch((error) => {
        setDraftStatus("unsaved");
        setLoaded(true);
        report(error instanceof Error ? error.message : "Draft failed to load.", "error");
      });
    return () => {
      cancelled = true;
    };
  }, [api, props.organizationId, props.suiteId, report, setEdges, setNodes]);

  useEffect(() => {
    let cancelled = false;
    if (props.latestRun?.id) return () => { cancelled = true; };
    api(
      `/admin/persona-studio/test-suites/${encodeURIComponent(props.suiteId)}?organizationId=${encodeURIComponent(props.organizationId)}`,
    ).then(async ({ payload }) => {
      const latestRun = payload?.suite?.latestRun;
      if (!latestRun?.id || cancelled) return;
      const { payload: runPayload } = await api(
        `/admin/persona-studio/test-suite-runs/${encodeURIComponent(latestRun.id)}`,
      );
      if (!cancelled && runPayload?.suiteRun) setSuiteRun(runPayload.suiteRun);
    }).catch((error) => report(error instanceof Error ? error.message : "Latest suite run failed to load.", "error"));
    return () => { cancelled = true; };
  }, [api, props.latestRun, props.organizationId, props.suiteId, report]);

  const persistDraft = useCallback(async (force = false) => {
    if (!loaded || draftStatus === "saving" || draftStatus === "invalid" || (draftStatus === "conflict" && !force)) return null;
    const baseRevision = draftRevisionRef.current;
    if (baseRevision == null) return null;
    setDraftStatus("saving");
    try {
      const { payload } = await api(
        `/admin/persona-studio/test-suites/${encodeURIComponent(props.suiteId)}/draft`,
        {
          method: "PUT",
          body: JSON.stringify({
            organizationId: props.organizationId,
            baseRevision,
            definition: definitionRef.current,
            ...(force ? { force: true } : {}),
          }),
        },
      );
      setDraftRevision(payload.revision);
      draftRevisionRef.current = payload.revision;
      setDraftHash(payload.definitionHash);
      setDraftConflictState(null);
      setDraftStatus("saved");
      return payload as DraftRecord;
    } catch (error) {
      const requestError = error as Error & { status?: number; payload?: Record<string, any> };
      if (requestError.status === 409 && requestError.payload?.code === "DRAFT_REVISION_CONFLICT") {
        setDraftConflictState(requestError.payload.details || {});
        setDraftStatus("conflict");
        report("Draft changed elsewhere. Resolve the conflict before saving.", "error");
        return null;
      }
      if (requestError.payload?.details?.validation) {
        setValidation(requestError.payload.details.validation);
        setBottomTab("problems");
        setBottomDrawerOpen(true);
      }
      setDraftStatus("invalid");
      report(requestError.message, "error");
      return null;
    }
  }, [api, draftStatus, loaded, props.organizationId, props.suiteId, report]);

  useEffect(() => {
    if (!loaded || draftStatus !== "unsaved") return;
    const timer = window.setTimeout(() => { void persistDraft(); }, 750);
    return () => window.clearTimeout(timer);
  }, [definition, draftStatus, loaded, persistDraft]);

  useEffect(() => {
    setSourceText(
      format === "json" ? JSON.stringify(definition, null, 2) : stringifyYaml(definition, { lineWidth: 0 }),
    );
  }, [definition, format]);

  const commitGraph = useCallback(
    (nextNodes: Node[], nextEdges: Edge[]) => {
      const next = clone(definition);
      const target = next.scenarios[scenarioIndex];
      if (!target) return;
      target.graph.nodes = nextNodes.map((flowNode) => {
        const existing = scenario.graph.nodes.find((node) => node.id === flowNode.id)!;
        return { ...existing, name: String(flowNode.data.label || existing.name) };
      });
      target.graph.edges = nextEdges.map((flowEdge) => ({
        id: flowEdge.id,
        source: flowEdge.source,
        target: flowEdge.target,
        ...(flowEdge.data || {}),
      })) as GraphEdge[];
      const metadata = studioMetadata(next);
      metadata.scenarios[target.id] = {
        ...metadata.scenarios[target.id],
        positions: Object.fromEntries(
          nextNodes.map((flowNode) => [flowNode.id, { x: flowNode.position.x, y: flowNode.position.y }]),
        ),
      };
      metadata.lastSelectedScenario = target.id;
      next.metadata = { ...(next.metadata || {}), studio: metadata };
      installDefinition(next);
    },
    [definition, installDefinition, scenario.graph.nodes, scenarioIndex],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const edge: Edge = {
        ...connection,
        id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
        data: {},
      } as Edge;
      const nextEdges = addEdge(edge, edges);
      setEdges(nextEdges);
      commitGraph(nodes, nextEdges);
    },
    [commitGraph, edges, nodes, setEdges],
  );

  const addNode = (type: string, label: string) => {
    const next = clone(definition);
    const target = next.scenarios[scenarioIndex];
    const base = slug(label);
    let id = base;
    let suffix = 2;
    while (target.graph.nodes.some((node) => node.id === id)) id = `${base}-${suffix++}`;
    const graphNode: GraphNode = {
      id,
      type,
      name: label,
      ...(type === "persona_exchange" ? { prompt: "" } : {}),
      ...(type === "review_action" ? { action: "reject", feedback: "" } : {}),
      ...(type === "gateway" ? { expression: "" } : {}),
      ...(type === "set_variables" ? { variables: {} } : {}),
    };
    target.graph.nodes.push(graphNode);
    if (pickerEdgeId) {
      const replaced = target.graph.edges.find((edge) => edge.id === pickerEdgeId);
      if (replaced) {
        target.graph.edges = target.graph.edges.filter((edge) => edge.id !== pickerEdgeId);
        target.graph.edges.push(
          { ...replaced, id: `${replaced.id}-in`, target: id },
          { id: `${replaced.id}-out`, source: id, target: replaced.target },
        );
      }
    } else if (pickerSourceNodeId) {
      target.graph.edges.push({
        id: `edge-${pickerSourceNodeId}-${id}-${Date.now()}`,
        source: pickerSourceNodeId,
        target: id,
      });
    }
    installDefinition(next);
    setSelectedNodeId(id);
    setPickerOpen(false);
    setPickerSourceNodeId(null);
    setPickerEdgeId(null);
    report(`Added ${label}.`);
  };

  const updateSelectedNode = (patch: Partial<GraphNode>) => {
    const next = clone(definition);
    const target = next.scenarios[scenarioIndex];
    const index = target.graph.nodes.findIndex((node) => node.id === selectedNodeId);
    if (index < 0) return;
    target.graph.nodes[index] = { ...target.graph.nodes[index], ...patch };
    installDefinition(next);
    setSelectedNodeId(target.graph.nodes[index].id);
  };

  const deleteNode = (nodeId: string) => {
    const next = clone(definition);
    const target = next.scenarios[scenarioIndex];
    const node = target.graph.nodes.find((candidate) => candidate.id === nodeId);
    if (!node || node.type === "start" || node.type === "end") return;
    target.graph.nodes = target.graph.nodes.filter((candidate) => candidate.id !== nodeId);
    target.graph.edges = target.graph.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);
    installDefinition(next);
    report(`Deleted ${node.name}.`);
  };

  const updateStudioNote = (noteId: string, patch: Record<string, unknown>) => {
    const next = clone(definition);
    const metadata = studioMetadata(next);
    const layout = metadata.scenarios[scenario.id] || {};
    layout.notes = (layout.notes || []).map((note) => note.id === noteId ? { ...note, ...patch } as typeof note : note);
    metadata.scenarios[scenario.id] = layout;
    next.metadata = { ...(next.metadata || {}), studio: metadata };
    installDefinition(next);
  };

  const beginStudioNoteDrag = (
    event: React.PointerEvent<HTMLElement>,
    note: NonNullable<StudioScenarioLayout["notes"]>[number],
  ) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest("button, textarea")) return;
    const element = event.currentTarget.closest<HTMLElement>(".ptb-sticky-note");
    if (!element) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    element.classList.add("is-dragging");
    noteDragRef.current = {
      noteId: note.id,
      pointerId: event.pointerId,
      pointerStart: { x: event.clientX, y: event.clientY },
      noteStart: { x: note.x, y: note.y },
      current: { x: note.x, y: note.y },
      element,
    };
  };

  const moveStudioNote = (event: React.PointerEvent<HTMLElement>) => {
    const drag = noteDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const current = stickyNotePositionFromPointerDelta(
      drag.noteStart,
      drag.pointerStart,
      { x: event.clientX, y: event.clientY },
    );
    drag.current = current;
    drag.element.style.left = `${current.x}px`;
    drag.element.style.top = `${current.y}px`;
  };

  const endStudioNoteDrag = (event: React.PointerEvent<HTMLElement>) => {
    const drag = noteDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    drag.element.classList.remove("is-dragging");
    noteDragRef.current = null;
    updateStudioNote(drag.noteId, drag.current);
  };

  const moveStudioNoteWithKeyboard = (
    event: React.KeyboardEvent<HTMLElement>,
    note: NonNullable<StudioScenarioLayout["notes"]>[number],
  ) => {
    const delta = event.shiftKey ? 50 : 10;
    const offsets: Record<string, { x: number; y: number }> = {
      ArrowLeft: { x: -delta, y: 0 },
      ArrowRight: { x: delta, y: 0 },
      ArrowUp: { x: 0, y: -delta },
      ArrowDown: { x: 0, y: delta },
    };
    const offset = offsets[event.key];
    if (!offset) return;
    event.preventDefault();
    event.stopPropagation();
    updateStudioNote(note.id, {
      x: Math.max(12, note.x + offset.x),
      y: Math.max(52, note.y + offset.y),
    });
  };

  const addStudioNote = () => {
    const next = clone(definition);
    const metadata = studioMetadata(next);
    const layout = metadata.scenarios[scenario.id] || {};
    layout.notes = [...(layout.notes || []), {
      id: `note-${Date.now()}`,
      x: 120 + (layout.notes?.length || 0) * 24,
      y: 100 + (layout.notes?.length || 0) * 24,
      width: 220,
      height: 140,
      content: "Add context for this part of the test…",
      color: "yellow",
    }];
    metadata.scenarios[scenario.id] = layout;
    next.metadata = { ...(next.metadata || {}), studio: metadata };
    installDefinition(next);
    report("Added sticky note.");
  };

  const deleteStudioNote = (noteId: string) => {
    const next = clone(definition);
    const metadata = studioMetadata(next);
    const layout = metadata.scenarios[scenario.id] || {};
    layout.notes = (layout.notes || []).filter((note) => note.id !== noteId);
    metadata.scenarios[scenario.id] = layout;
    next.metadata = { ...(next.metadata || {}), studio: metadata };
    installDefinition(next);
  };

  const autoLayout = () => {
    const layout = nodes.map((node, index) => ({
      ...node,
      position: { x: 80 + index * 260, y: 160 + (index % 2) * 80 },
    }));
    setNodes(layout);
    commitGraph(layout, edges);
    report("Tidied graph layout.");
  };

  const copySelection = () => {
    const selectedIds = new Set(nodes.filter((node) => node.selected).map((node) => node.id));
    if (!selectedIds.size && selectedNodeId) selectedIds.add(selectedNodeId);
    clipboardRef.current = {
      nodes: scenario.graph.nodes.filter((node) => selectedIds.has(node.id)).map(clone),
      edges: scenario.graph.edges.filter((edge) => selectedIds.has(edge.source) && selectedIds.has(edge.target)).map(clone),
    };
    report(`Copied ${clipboardRef.current.nodes.length} node(s).`);
  };

  const pasteSelection = () => {
    const copied = clipboardRef.current;
    if (!copied?.nodes.length) return;
    const next = clone(definition);
    const target = next.scenarios[scenarioIndex];
    const ids = new Map<string, string>();
    copied.nodes.forEach((node) => {
      const id = `${node.id}-copy-${Math.random().toString(36).slice(2, 7)}`;
      ids.set(node.id, id);
      target.graph.nodes.push({ ...clone(node), id, name: `${node.name} copy` });
    });
    copied.edges.forEach((edge) => target.graph.edges.push({
      ...clone(edge),
      id: `${edge.id}-copy-${Math.random().toString(36).slice(2, 7)}`,
      source: ids.get(edge.source)!,
      target: ids.get(edge.target)!,
    }));
    installDefinition(next);
    report(`Pasted ${copied.nodes.length} node(s).`);
  };

  const undo = () => {
    const previous = undoStack.current.pop();
    if (!previous) return;
    redoStack.current.push(clone(definition));
    installDefinition(previous, false);
    report("Undid graph change.");
  };

  const redo = () => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push(clone(definition));
    installDefinition(next, false);
    report("Redid graph change.");
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editing = target?.matches("input, textarea, select, [contenteditable='true']");
      const command = event.metaKey || event.ctrlKey;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        event.shiftKey ? redo() : undo();
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      } else if (command && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      } else if (command && event.key.toLowerCase() === "c" && !editing) {
        event.preventDefault();
        copySelection();
      } else if (command && event.key.toLowerCase() === "v" && !editing) {
        event.preventDefault();
        pasteSelection();
      } else if (command && event.key.toLowerCase() === "a" && !editing) {
        event.preventDefault();
        setNodes((current) => current.map((node) => ({ ...node, selected: true })));
      } else if (!editing && event.key.toLowerCase() === "n") {
        event.preventDefault();
        setPickerOpen(true);
      } else if (!editing && event.shiftKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        addStudioNote();
      } else if (!editing && (event.key === "Delete" || event.key === "Backspace")) {
        const selected = nodes.filter((node) => node.selected).map((node) => node.id);
        selected.forEach(deleteNode);
      } else if (event.key === "Escape") {
        setCommandOpen(false);
        setPickerOpen(false);
      } else if (command && event.key === "Enter") {
        event.preventDefault();
        void preflightLaunch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const applySource = () => {
    try {
      const parsed = (format === "json" ? JSON.parse(sourceText) : parseYaml(sourceText)) as Definition;
      if (parsed.schemaVersion !== "2.0") throw new Error('schemaVersion must be "2.0".');
      installDefinition(parsed);
      report(`Applied ${format.toUpperCase()} source.`, "success");
    } catch (error) {
      report(error instanceof Error ? error.message : "Invalid source.", "error");
    }
  };

  const validate = async () => {
    setBusy("validate");
    try {
      const { payload } = await api("/admin/persona-studio/test-suites/validate", {
        method: "POST",
        body: JSON.stringify({ organizationId: props.organizationId, definition }),
      });
      setValidation(payload);
      report(payload.valid ? "Definition is valid." : `${payload.errors?.length || 0} validation errors.`, payload.valid ? "success" : "error");
      return payload;
    } finally {
      setBusy("");
    }
  };

  const save = async () => {
    setBusy("save");
    try {
      if (draftStatus === "conflict") throw new Error("Resolve the draft conflict before saving a version.");
      if (draftStatus === "invalid") throw new Error("Resolve draft validation problems before saving a version.");
      if (draftStatus === "unsaved") {
        const persisted = await persistDraft();
        if (!persisted) throw new Error("Draft could not be saved.");
      }
      const exactRevision = draftRevisionRef.current;
      if (exactRevision == null) throw new Error("Draft revision is unavailable.");
      const { payload } = await api(
        `/admin/persona-studio/test-suites/${encodeURIComponent(props.suiteId)}/definition`,
        {
          method: "PUT",
          body: JSON.stringify({ organizationId: props.organizationId, draftRevision: exactRevision }),
        },
      );
      setVersionId(payload.id);
      setValidation(payload.validation);
      report(`Saved immutable suite version ${payload.version}.`, "success");
      return payload;
    } catch (error) {
      report(error instanceof Error ? error.message : "Suite version save failed.", "error");
      return null;
    } finally {
      setBusy("");
    }
  };

  const uploadDataset = async (file: File | null) => {
    if (!file) return;
    setBusy("upload");
    try {
      const mode = scenario.datasetMode;
      const { payload: initialized } = await api(
        `/admin/persona-studio/test-suites/${encodeURIComponent(props.suiteId)}/uploads/init`,
        {
          method: "POST",
          body: JSON.stringify({
            organizationId: props.organizationId,
            mediaType: datasetMediaType(file),
            mode,
          }),
        },
      );
      const contentBase64 = bytesToBase64(new Uint8Array(await file.arrayBuffer()));
      const { payload: finalized } = await api(
        `/admin/persona-studio/test-uploads/${encodeURIComponent(initialized.id)}/finalize`,
        {
          method: "POST",
          body: JSON.stringify({ organizationId: props.organizationId, contentBase64 }),
        },
      );
      const upload: DatasetUpload = {
        id: finalized.id,
        name: file.name,
        mode,
        rowCount: finalized.rowCount,
        checksum: finalized.checksum,
        expiresAt: finalized.expiresAt,
        units: (finalized.units || []).map((unit: { id: string; hash: string }) => ({
          ...unit,
          uploadId: finalized.id,
          mode,
        })),
      };
      setDatasetUploads((current) => [...current.filter((entry) => entry.id !== upload.id), upload]);
      setPreflight(null);
      report(`Uploaded ${file.name}: ${upload.rowCount} ${mode === "row" ? "row(s)" : "file"}.`, "success");
    } catch (error) {
      report(error instanceof Error ? error.message : "Dataset upload failed.", "error");
    } finally {
      setBusy("");
    }
  };

  const deleteDataset = async (uploadId: string) => {
    setBusy("delete-upload");
    try {
      await api(
        `/admin/persona-studio/test-uploads/${encodeURIComponent(uploadId)}?organizationId=${encodeURIComponent(props.organizationId)}`,
        { method: "DELETE" },
      );
      setDatasetUploads((current) => current.filter((entry) => entry.id !== uploadId));
      setPreflight(null);
      report("Purged dataset upload.", "success");
    } finally {
      setBusy("");
    }
  };

  const preflightLaunch = async () => {
    const saved = versionId ? null : await save();
    const selectedVersionId = versionId || saved?.id;
    setBusy("preflight");
    try {
      const { payload } = await api(
        `/admin/persona-studio/test-suites/${encodeURIComponent(props.suiteId)}/launch-plan`,
        {
          method: "POST",
          body: JSON.stringify({
            organizationId: props.organizationId,
            suiteVersionId: selectedVersionId,
            repetitions: definition.experiment.repetitions || 3,
            datasetUploadIds: datasetUploads.map((upload) => upload.id),
            datasetUnits: datasetUploads.flatMap((upload) => upload.units),
          }),
        },
      );
      setPreflight(payload);
      report(`Preflight expanded ${payload.executionCount} executions.`);
    } finally {
      setBusy("");
    }
  };

  const confirmLaunch = async () => {
    if (!preflight?.confirmationToken || !preflight?.suiteVersionId) return;
    setBusy("launch");
    try {
      const { payload } = await api(
        `/admin/persona-studio/test-suites/${encodeURIComponent(props.suiteId)}/runs`,
        {
          method: "POST",
          body: JSON.stringify({
            organizationId: props.organizationId,
            suiteVersionId: preflight.suiteVersionId,
            confirmationToken: preflight.confirmationToken,
            repetitions: definition.experiment.repetitions || 3,
            datasetUploadIds: datasetUploads.map((upload) => upload.id),
            datasetUnits: datasetUploads.flatMap((upload) => upload.units),
          }),
        },
      );
      setSuiteRun(payload.suiteRun);
      setPreflight(null);
      report(`Launched ${payload.suiteRun.executionCount} executions.`, "success");
    } finally {
      setBusy("");
    }
  };

  const refreshResults = useCallback(async () => {
    if (!suiteRun?.id) return;
    const { payload } = await api(
      `/admin/persona-studio/test-suite-runs/${encodeURIComponent(suiteRun.id)}/executions?limit=100`,
    );
    setExecutions(payload.items || []);
  }, [api, suiteRun?.id]);

  const cancelRun = async () => {
    if (!suiteRun?.id) return;
    setBusy("cancel");
    try {
      const { payload } = await api(
        `/admin/persona-studio/test-suite-runs/${encodeURIComponent(suiteRun.id)}/cancel`,
        { method: "POST", body: JSON.stringify({ organizationId: props.organizationId }) },
      );
      setSuiteRun((current) => current ? { ...current, ...payload, status: "CANCELED" } : current);
      await refreshResults();
      report("Canceled pending and running executions.", "success");
    } finally {
      setBusy("");
    }
  };

  useEffect(() => {
    if (!suiteRun?.id) return;
    refreshResults().catch((error) => report(String(error), "error"));
    const timer = window.setInterval(() => refreshResults().catch(() => {}), 4000);
    return () => window.clearInterval(timer);
  }, [refreshResults, report, suiteRun?.id]);

  useEffect(() => {
    if (trace) {
      setBottomTab("trace");
      setBottomDrawerOpen(true);
    }
  }, [trace]);

  const selectedNode = scenario.graph.nodes.find((node) => node.id === selectedNodeId);
  const palette = NODE_TYPES.filter((entry) => entry[1].toLowerCase().includes(paletteQuery.toLowerCase()));
  const failureCount = executions.filter((execution) => execution.status === "FAILED").length;

  return (
    <section ref={shellRef} className={`ptb-shell${focusMode ? " is-focus" : ""}`} aria-label="Semi-deterministic evaluation builder">
      <header className="ptb-topbar" data-style-probe="topbar">
        <div className="ptb-title-cluster">
          <button className="ptb-icon-button" aria-label="Back to test suites" onClick={() => { void persistDraft(); props.onExit?.(); }}><ArrowLeft size={17} /></button>
          <div className="ptb-breadcrumb"><span>Test suites</span><span aria-hidden="true">/</span><input aria-label="Suite title" value={definition.name} onChange={(event) => installDefinition({ ...definition, name: event.target.value })} /></div>
          <span className={`ptb-save-state state-${draftStatus}`} aria-live="polite">{draftStatus === "saved" ? "Saved" : draftStatus === "saving" ? "Saving…" : draftStatus === "loading" ? "Loading…" : draftStatus === "conflict" ? "Conflict" : draftStatus === "invalid" ? "Needs attention" : "Unsaved"}</span>
        </div>
        <nav className="ptb-main-tabs" aria-label="Suite views">
          {(["editor", "executions", "results"] as const).map((tab) => <button key={tab} aria-current={activeTab === tab ? "page" : undefined} onClick={() => { void persistDraft(); setActiveTab(tab); }}>{tab[0].toUpperCase() + tab.slice(1)}</button>)}
        </nav>
        <div className="ptb-top-actions">
          <button className="ptb-secondary" onClick={() => void save()} disabled={Boolean(busy) || draftStatus === "conflict" || draftStatus === "invalid"}><Save size={15} /> Save version</button>
          <button className="ptb-primary" onClick={() => void preflightLaunch()} disabled={Boolean(busy)}><Play size={15} /> Review launch</button>
          <button className="ptb-icon-button" aria-label="More suite actions" onClick={() => setCommandOpen(true)}><MoreHorizontal size={18} /></button>
        </div>
      </header>

      {draftStatus === "conflict" && <div className="ptb-conflict" role="alert"><div><strong>Draft conflict</strong><span>Server revision {String(draftConflictState?.serverRevision || "changed")} must be reconciled.</span></div><button onClick={() => { const blob = new Blob([JSON.stringify(definition, null, 2)], { type: "application/json" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${slug(definition.name)}-local.json`; link.click(); URL.revokeObjectURL(link.href); }}>Download local JSON</button><button onClick={() => window.location.reload()}>Reload server</button><button className="danger" onClick={() => void persistDraft(true)}>Overwrite server</button></div>}
      {styleFailure && <div className="ptb-style-failure" role="alert">Builder styling failed to load. Reinstall the Persona Studio package before editing.</div>}

      {activeTab === "editor" && drawer === "experiment" && <aside className="ptb-aux-drawer" aria-label="Experiment settings"><div className="ptb-drawer-head"><h3>Experiment</h3><button className="ptb-icon-button" aria-label="Close experiment drawer" onClick={() => setDrawer(null)}><X size={18} /></button></div>
      <div className="ptb-scenario-bar">
        <label>
          Scenario
          <select
            value={scenarioIndex}
            onChange={(event) => {
              const index = Number(event.target.value);
              setScenarioIndex(index);
              setNodes(flowNodes(definition.scenarios[index], definition));
              setEdges(flowEdges(definition.scenarios[index]));
            }}
          >
            {definition.scenarios.map((item, index) => <option key={item.id} value={index}>{item.name}</option>)}
          </select>
        </label>
        <label>
          Mode
          <select value={scenario.mode} onChange={(event) => {
            const next = clone(definition);
            next.scenarios[scenarioIndex].mode = event.target.value as Scenario["mode"];
            installDefinition(next);
          }}>
            <option value="contract">Contract</option>
            <option value="live_probe">Live Probe</option>
          </select>
        </label>
        <label>
          Dataset
          <select value={scenario.datasetMode} onChange={(event) => {
            const next = clone(definition);
            next.scenarios[scenarioIndex].datasetMode = event.target.value as Scenario["datasetMode"];
            installDefinition(next);
          }}>
            <option value="row">Row</option>
            <option value="whole_file">Whole file</option>
          </select>
        </label>
        <label>
          Repetitions
          <input type="number" min="1" max="30" value={definition.experiment.repetitions || 3} onChange={(event) => {
            const next = clone(definition);
            next.experiment.repetitions = Number(event.target.value);
            installDefinition(next);
          }} />
        </label>
      </div></aside>}

      {activeTab === "editor" && drawer === "resources" && <aside className="ptb-aux-drawer" aria-labelledby="ptb-datasets-title"><div className="ptb-drawer-head"><h3>Resources</h3><button className="ptb-icon-button" aria-label="Close resources drawer" onClick={() => setDrawer(null)}><X size={18} /></button></div><section className="ptb-datasets">
        <div>
          <h4 id="ptb-datasets-title">Ephemeral datasets</h4>
          <p>CSV, JSON, or JSONL. Raw inputs and derived evidence expire 24 hours after the run.</p>
        </div>
        <label className="ptb-file-button">
          {busy === "upload" ? "Uploading…" : `Add ${scenario.datasetMode === "row" ? "row" : "whole-file"} dataset`}
          <input
            type="file"
            accept=".csv,.json,.jsonl,.ndjson,text/csv,application/json,application/x-ndjson"
            disabled={Boolean(busy)}
            onChange={(event) => {
              void uploadDataset(event.target.files?.[0] || null);
              event.currentTarget.value = "";
            }}
          />
        </label>
        {datasetUploads.length > 0 && (
          <ul>
            {datasetUploads.map((upload) => (
              <li key={upload.id}>
                <span><strong>{upload.name}</strong> · {upload.mode} · {upload.rowCount} unit(s)</span>
                <button disabled={Boolean(busy)} onClick={() => void deleteDataset(upload.id)}>Purge</button>
              </li>
            ))}
          </ul>
        )}
      </section></aside>}

      {activeTab === "editor" && <main className="ptb-workspace">
        {detailNodeId && selectedNode ? <section className="ptb-node-workspace" aria-label={`${selectedNode.name} node details`}>
          <header className="ptb-detail-head"><button className="ptb-secondary" onClick={() => setDetailNodeId(null)}><ArrowLeft size={16} /> Back to canvas</button><div><span className="ptb-eyebrow">{NODE_TYPES.find(([type]) => type === selectedNode.type)?.[1]}</span><h2>{selectedNode.name}</h2></div><button className="ptb-icon-button danger" aria-label="Delete node" disabled={["start", "end"].includes(selectedNode.type)} onClick={() => { deleteNode(selectedNode.id); setDetailNodeId(null); }}><Trash2 size={17} /></button></header>
          <div className="ptb-detail-tabs" role="tablist">{(["input", "parameters", "output"] as const).map((tab) => <button role="tab" aria-selected={detailTab === tab} key={tab} onClick={() => setDetailTab(tab)}>{tab[0].toUpperCase() + tab.slice(1)}</button>)}</div>
          <div className="ptb-detail-body">
            {detailTab === "input" && <div className="ptb-detail-grid"><section><h3>Inbound nodes</h3>{scenario.graph.edges.filter((edge) => edge.target === selectedNode.id).map((edge) => <button className="ptb-resource-row" key={edge.id} onClick={() => { setSelectedNodeId(edge.source); setDetailNodeId(edge.source); }}>{scenario.graph.nodes.find((node) => node.id === edge.source)?.name || edge.source}</button>)}{!scenario.graph.edges.some((edge) => edge.target === selectedNode.id) && <p className="ptb-empty-copy">No inbound connection.</p>}</section><section><h3>Available data</h3><div className="ptb-code-card"><strong>Variables</strong><pre>{JSON.stringify(definition.variables || {}, null, 2)}</pre></div><div className="ptb-code-card"><strong>Fixtures</strong><pre>{JSON.stringify(definition.fixtures, null, 2)}</pre></div></section></div>}
            {detailTab === "parameters" && <div className="ptb-parameter-panel"><label>Name<input value={selectedNode.name} onBlur={() => void persistDraft()} onChange={(event) => updateSelectedNode({ name: event.target.value })} /></label><label>Stable ID<input value={selectedNode.id} disabled /></label>
              {selectedNode.type === "start" && <label>Scenario input schema<textarea value={JSON.stringify(definition.variables || {}, null, 2)} onChange={(event) => { try { installDefinition({ ...definition, variables: JSON.parse(event.target.value) }); } catch { /* preserve draft while typing */ } }} /></label>}
              {selectedNode.type === "dataset" && <><label>Dataset mode<select value={scenario.datasetMode} onChange={(event) => { const next = clone(definition); next.scenarios[scenarioIndex].datasetMode = event.target.value as Scenario["datasetMode"]; installDefinition(next); }}><option value="row">Row</option><option value="whole_file">Whole file</option></select></label><label>Field mapping (JSON)<textarea value={JSON.stringify(selectedNode.mapping || {}, null, 2)} onChange={(event) => { try { updateSelectedNode({ mapping: JSON.parse(event.target.value) }); } catch { /* wait */ } }} /></label></>}
              {selectedNode.type === "set_variables" && <label>Variables (JSON)<textarea value={JSON.stringify(selectedNode.variables || {}, null, 2)} onChange={(event) => { try { updateSelectedNode({ variables: JSON.parse(event.target.value) }); } catch { /* wait */ } }} /></label>}
              {selectedNode.type === "fixture_setup" && <label>Fixture IDs<textarea value={JSON.stringify(selectedNode.fixtureIds || [], null, 2)} onChange={(event) => { try { updateSelectedNode({ fixtureIds: JSON.parse(event.target.value) }); } catch { /* wait */ } }} /></label>}
              {selectedNode.type === "persona_exchange" && <><label>Persona prompt<textarea value={selectedNode.prompt || ""} onChange={(event) => updateSelectedNode({ prompt: event.target.value })} /></label><label>Reply strategy<select value={String(selectedNode.replyMode || "scripted")} onChange={(event) => updateSelectedNode({ replyMode: event.target.value })}><option value="scripted">Scripted reply</option><option value="pinned_simulator">Pinned user simulator</option></select></label><label>Scripted reply<textarea value={String(selectedNode.scriptedReply || "")} onChange={(event) => updateSelectedNode({ scriptedReply: event.target.value })} /></label></>}
              {selectedNode.type === "review_action" && <><label>Action<select value={selectedNode.action || "reject"} onChange={(event) => updateSelectedNode({ action: event.target.value })}><option value="reject">Reject / revise</option><option value="approve">Approve / finalize</option></select></label><label>Feedback<textarea value={selectedNode.feedback || ""} onChange={(event) => updateSelectedNode({ feedback: event.target.value })} /></label></>}
              {selectedNode.type === "gateway" && <><label>Expression<input value={selectedNode.expression || ""} onChange={(event) => updateSelectedNode({ expression: event.target.value })} /></label><div className="ptb-code-card"><strong>Routes</strong><pre>{JSON.stringify(scenario.graph.edges.filter((edge) => edge.source === selectedNode.id), null, 2)}</pre></div></>}
              {selectedNode.type === "assertion" && <><label>Assertion type<input value={String(selectedNode.assertionType || "structured_output")} onChange={(event) => updateSelectedNode({ assertionType: event.target.value })} /></label><label>Assertion config (JSON)<textarea value={JSON.stringify(selectedNode.assertion || {}, null, 2)} onChange={(event) => { try { updateSelectedNode({ assertion: JSON.parse(event.target.value) }); } catch { /* wait */ } }} /></label></>}
              {selectedNode.type === "end" && <label>Terminal output expression<textarea value={String(selectedNode.output || "")} onChange={(event) => updateSelectedNode({ output: event.target.value })} /></label>}
            </div>}
            {detailTab === "output" && <div className="ptb-detail-grid"><section><h3>Configuration preview</h3><pre className="ptb-output-preview">{JSON.stringify(selectedNode, null, 2)}</pre></section><section><h3>Execution evidence</h3>{trace ? <pre className="ptb-output-preview">{JSON.stringify((trace.events || []).filter((event: any) => event.nodeId === selectedNode.id), null, 2)}</pre> : <p className="ptb-empty-copy">Select an execution trace to inspect this node's events, tool calls, and artifacts.</p>}</section></div>}
          </div>
        </section> : <div className="ptb-canvas" role="application" aria-label="Scenario graph canvas" data-style-probe="canvas">
          <ReactFlowProvider><ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={FLOW_NODE_TYPES}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={() => commitGraph(nodes, edges)}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onNodeDoubleClick={(_, node) => { setSelectedNodeId(node.id); setDetailNodeId(node.id); }}
            onConnectEnd={(_, state) => { if (!state.isValid && state.fromNode?.id) { setPickerSourceNodeId(state.fromNode.id); setPickerOpen(true); } }}
            onEdgeDoubleClick={(_, edge) => { setPickerEdgeId(edge.id); setPickerOpen(true); }}
            selectionOnDrag
            panOnDrag={[1, 2]}
            panActivationKeyCode="Space"
            multiSelectionKeyCode={["Meta", "Control", "Shift"]}
            deleteKeyCode={null}
            fitView
            minZoom={0.2}
            maxZoom={1.8}
          ><Background gap={20} size={1} /><CanvasControls onTidy={autoLayout} /></ReactFlow></ReactFlowProvider>
          {scenario.graph.nodes.length === 0 && <button className="ptb-empty-add" onClick={() => setPickerOpen(true)}><Plus size={18} /> Add first step</button>}
          {(studioMetadata(definition).scenarios[scenario.id]?.notes || []).map((note) => <aside key={note.id} className={`ptb-sticky-note color-${note.color}`} style={{ left: note.x, top: note.y, width: note.width, height: note.height }}><header aria-label="Move sticky note" tabIndex={0} onPointerDown={(event) => beginStudioNoteDrag(event, note)} onPointerMove={moveStudioNote} onPointerUp={endStudioNoteDrag} onPointerCancel={endStudioNoteDrag} onKeyDown={(event) => moveStudioNoteWithKeyboard(event, note)}><Grip size={14} /><span>Note</span><button aria-label="Delete sticky note" onClick={() => deleteStudioNote(note.id)}><X size={14} /></button></header><textarea aria-label="Sticky note content" value={note.content} onChange={(event) => updateStudioNote(note.id, { content: event.target.value })} /></aside>)}
          <div className="ptb-canvas-rail" aria-label="Authoring tools"><button aria-label="Add node" onClick={() => setPickerOpen(true)}><Plus size={18} /></button><button aria-label="Add sticky note" onClick={addStudioNote}><StickyNote size={18} /></button><button aria-label="Resources" onClick={() => setDrawer("resources")}><Database size={18} /></button><button aria-label="Experiment" onClick={() => setDrawer("experiment")}><SlidersHorizontal size={18} /></button><button aria-label="Source JSON or YAML" onClick={() => setDrawer("source")}><Braces size={18} /></button><button aria-label="Toggle focus mode" onClick={() => setFocusMode((value) => !value)}><Focus size={18} /></button></div>
          <button className="ptb-scenario-pill" onClick={() => setDrawer("experiment")}><GitBranch size={14} /> {scenario.name}<ChevronDown size={14} /></button>
        </div>}

        {pickerOpen && <aside className="ptb-node-picker" aria-label="Node picker"><div className="ptb-drawer-head"><div><span className="ptb-eyebrow">Add to graph</span><h3>{pickerEdgeId ? "Insert a node" : pickerSourceNodeId ? "What happens next?" : "Choose a node"}</h3></div><button className="ptb-icon-button" aria-label="Close node picker" onClick={() => { setPickerOpen(false); setPickerSourceNodeId(null); setPickerEdgeId(null); }}><X size={18} /></button></div><label className="ptb-search"><Search size={16} /><input autoFocus id="ptb-palette-search" type="search" placeholder="Search nodes…" value={paletteQuery} onChange={(event) => setPaletteQuery(event.target.value)} /></label><div className="ptb-palette-list">{NODE_GROUPS.map((group) => { const items = palette.filter(([type]) => group.types.includes(type)); return items.length ? <section key={group.label}><h4>{group.label}</h4>{items.map(([type, label]) => { const Icon = NODE_ICONS[type]; return <button key={type} onClick={() => addNode(type, label)}><span className={`ptb-picker-icon type-${type}`}><Icon size={18} /></span><span><strong>{label}</strong><small>{type === "persona_exchange" ? "Send a message through the persona" : type === "gateway" ? "Branch on a deterministic expression" : type === "assertion" ? "Evaluate a contract or rubric" : `Add ${label.toLowerCase()} step`}</small></span><Plus size={15} /></button>; })}</section> : null; })}</div></aside>}
      </main>}

      {activeTab === "editor" && drawer === "source" && <aside className="ptb-aux-drawer ptb-source-drawer" aria-label="Source editor"><div className="ptb-drawer-head"><div><span className="ptb-eyebrow">Portable definition</span><h3>JSON / YAML source</h3></div><button className="ptb-icon-button" aria-label="Close source drawer" onClick={() => setDrawer(null)}><X size={18} /></button></div><div className="ptb-detail-tabs" role="tablist"><button role="tab" aria-selected={format === "json"} onClick={() => setFormat("json")}>JSON</button><button role="tab" aria-selected={format === "yaml"} onClick={() => setFormat("yaml")}>YAML</button></div><textarea aria-label={`${format.toUpperCase()} suite definition`} value={sourceText} onChange={(event) => setSourceText(event.target.value)} /><div className="ptb-drawer-actions"><button className="ptb-secondary" onClick={() => { const blob = new Blob([sourceText], { type: "text/plain" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${slug(definition.name)}.${format}`; link.click(); URL.revokeObjectURL(link.href); }}>Download</button><button className="ptb-primary" onClick={applySource}>Apply source</button></div></aside>}

      {activeTab === "executions" && !suiteRun && <section className="ptb-empty-view"><History size={28} /><h2>No executions yet</h2><p>Review the launch plan, confirm cost and thresholds, then start a manual run.</p><button className="ptb-primary" onClick={() => void preflightLaunch()}><Play size={16} /> Review launch</button></section>}
      {activeTab === "results" && !suiteRun && <section className="ptb-empty-view"><Beaker size={28} /><h2>No results yet</h2><p>Contract and Live Probe aggregates appear here after a run.</p></section>}

      <details className="ptb-list-editor">
        <summary>Keyboard list editor ({scenario.graph.nodes.length} nodes)</summary>
        <table>
          <thead><tr><th>Order</th><th>Name</th><th>Type</th><th>Actions</th></tr></thead>
          <tbody>
            {scenario.graph.nodes.map((node, index) => (
              <tr key={node.id}>
                <td>{index + 1}</td>
                <td><button className="link" onClick={() => setSelectedNodeId(node.id)}>{node.name}</button></td>
                <td>{node.type}</td>
                <td><button disabled={["start", "end"].includes(node.type)} onClick={() => deleteNode(node.id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>

      <details className="ptb-source">
        <summary>Bidirectional JSON / YAML</summary>
        <div className="ptb-tabs" role="tablist">
          <button role="tab" aria-selected={format === "json"} onClick={() => setFormat("json")}>JSON</button>
          <button role="tab" aria-selected={format === "yaml"} onClick={() => setFormat("yaml")}>YAML</button>
        </div>
        <textarea aria-label={`${format.toUpperCase()} suite definition`} value={sourceText} onChange={(event) => setSourceText(event.target.value)} />
        <button onClick={applySource}>Apply source</button>
      </details>

      {validation && (
        <section className="ptb-validation" aria-label="Validation results">
          <h4>{validation.valid ? "Valid definition" : "Definition needs work"}</h4>
          <ul>{(Array.isArray(validation.errors) ? validation.errors : []).map((error: any, index: number) => <li key={index}><code>{error.path}</code> — {error.message}</li>)}</ul>
        </section>
      )}

      {preflight && (
        <section className="ptb-preflight" role="dialog" aria-modal="true" aria-labelledby="ptb-preflight-title">
          <h4 id="ptb-preflight-title">Launch review</h4>
          <div className="ptb-metrics">
            <span><strong>{preflight.executionCount}</strong> executions</span>
            <span><strong>{preflight.contractExecutionCount}</strong> Contract</span>
            <span><strong>{preflight.liveProbeExecutionCount}</strong> Live Probe</span>
            <span><strong>24h</strong> raw evidence</span>
          </div>
          {preflight.warning && <p className="warning">⚠ {preflight.warning}</p>}
          {(preflight.thresholdCoverage?.missingAssertionIds || []).length > 0 && (
            <p className="error">Missing thresholds: {preflight.thresholdCoverage.missingAssertionIds.join(", ")}</p>
          )}
          <p>
            Estimated cost: {preflight.estimatedCost?.minimumUsd == null
              ? "Unavailable for unpriced model cells"
              : `$${preflight.estimatedCost.minimumUsd}–$${preflight.estimatedCost.maximumUsd}`}
          </p>
          {preflight.estimatedCost?.assumptions && <p className="ptb-helper">{preflight.estimatedCost.assumptions}</p>}
          <table>
            <thead><tr><th>Configuration</th><th>Axes</th><th>Runtime</th></tr></thead>
            <tbody>{(preflight.configurationTable || []).map((cell: any) => (
              <tr key={cell.configurationHash}><td>{cell.matrixCellId}</td><td><code>{JSON.stringify(cell.axes)}</code></td><td><code>{JSON.stringify(cell.runtime)}</code></td></tr>
            ))}</tbody>
          </table>
          <div className="ptb-actions">
            <button onClick={() => setPreflight(null)}>Cancel</button>
            <button className="primary" onClick={confirmLaunch} disabled={busy === "launch" || (preflight.thresholdCoverage?.missingAssertionIds || []).length > 0}>
              {busy === "launch" ? "Launching…" : "Confirm manual launch"}
            </button>
          </div>
        </section>
      )}

      {suiteRun && activeTab !== "editor" && (
        <section className="ptb-results" aria-label="Evaluation results">
          <div className="ptb-results-header">
            <div><span className="ptb-eyebrow">Run {suiteRun.id}</span><h4>Configuration × scenario results</h4></div>
            <div className="ptb-actions"><button className="ptb-secondary" onClick={() => refreshResults()}>Refresh</button>{activeTab === "executions" && suiteRun.status !== "CANCELED" && <button className="ptb-secondary danger" disabled={busy === "cancel"} onClick={() => void cancelRun()}>{busy === "cancel" ? "Canceling…" : "Cancel run"}</button>}</div>
          </div>
          <div className="ptb-metrics">
            <span><strong>{executions.length}</strong> loaded</span>
            <span><strong>{failureCount}</strong> failed</span>
            <span><strong>{executions.filter((item) => item.mode === "contract").length}</strong> Contract</span>
            <span><strong>{executions.filter((item) => item.mode === "live_probe").length}</strong> Live Probe</span>
          </div>
          <div
            className="ptb-heatmap"
            role="img"
            aria-label={`${executions.length} execution cells: ${failureCount} failed`}
          >
            {executions.map((execution) => (
              <button
                key={`heat-${execution.id}`}
                className={`cell status-${String(execution.status).toLowerCase()}`}
                title={`${execution.scenarioId} · ${execution.matrixCellId} · ${execution.status}`}
                aria-label={`${execution.scenarioId}, ${execution.matrixCellId}, repetition ${execution.repetitionIndex + 1}: ${execution.status}`}
                onClick={async () => {
                  const { payload } = await api(`/admin/persona-studio/test-case-runs/${encodeURIComponent(execution.id)}/trace?limit=200`);
                  setTrace(payload);
                }}
              />
            ))}
          </div>
          <div className="ptb-table-scroll">
            <table>
              <thead><tr><th>Status</th><th>Mode</th><th>Scenario</th><th>Cell</th><th>Repeat</th><th>Turns</th><th>Trace</th></tr></thead>
              <tbody>{executions.map((execution) => (
                <tr key={execution.id} data-status={execution.status}>
                  <td><span className="ptb-status">{execution.status === "SUCCEEDED" ? "✓" : execution.status === "FAILED" ? "✕" : "…"} {execution.status}</span></td>
                  <td>{execution.mode === "live_probe" ? "Live Probe" : "Contract"}</td>
                  <td>{execution.scenarioId}</td><td>{execution.matrixCellId}</td><td>{execution.repetitionIndex + 1}</td><td>{execution.personaTurnCount}</td>
                  <td><button onClick={async () => {
                    const { payload } = await api(`/admin/persona-studio/test-case-runs/${encodeURIComponent(execution.id)}/trace?limit=200`);
                    setTrace(payload);
                  }}>Open</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      )}

      <section className={`ptb-bottom-drawer${bottomDrawerOpen ? " is-open" : ""}`} aria-label="Run diagnostics">
        <header><div className="ptb-bottom-tabs" role="tablist">{(["problems", "logs", "trace"] as const).map((tab) => <button key={tab} role="tab" aria-selected={bottomTab === tab} onClick={() => { setBottomTab(tab); setBottomDrawerOpen(true); }}>{tab[0].toUpperCase() + tab.slice(1)}{tab === "problems" && validation && !validation.valid ? ` (${(validation.errors as unknown[] || []).length})` : ""}</button>)}</div><button className="ptb-icon-button" aria-label={bottomDrawerOpen ? "Collapse diagnostics" : "Expand diagnostics"} onClick={() => setBottomDrawerOpen((value) => !value)}><PanelBottom size={17} /></button></header>
        {bottomDrawerOpen && <div className="ptb-bottom-content">{bottomTab === "problems" ? <>{validation ? <section className="ptb-validation" aria-label="Validation results"><h4>{validation.valid ? "No validation problems" : "Definition needs work"}</h4><ul>{(Array.isArray(validation.errors) ? validation.errors : []).map((error: any, index: number) => <li key={index}><code>{error.path}</code> — {error.message}</li>)}</ul></section> : <p className="ptb-empty-copy">Validate the suite to populate deterministic problems.</p>}</> : bottomTab === "logs" ? <div className="ptb-log-lines"><span><Terminal size={15} /> Editor ready</span><span><Save size={15} /> Draft {draftStatus} · revision {draftRevision || "—"}</span><span><FileJson size={15} /> Definition {draftHash ? draftHash.slice(0, 18) + "…" : "not hashed"}</span></div> : trace ? <section className="ptb-trace" aria-label="Execution trace"><ol>{(trace.events || []).map((event: any) => <li key={event.id}><strong>{event.eventType}</strong> <span>{event.nodeId || ""}</span><pre>{JSON.stringify(event.payload, null, 2)}</pre></li>)}</ol></section> : <p className="ptb-empty-copy">Open an execution to inspect node, tool, assertion, and artifact events.</p>}</div>}
      </section>

      {commandOpen && <div className="ptb-command-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCommandOpen(false); }}><section className="ptb-command" role="dialog" aria-modal="true" aria-label="Command palette"><label><Search size={18} /><input autoFocus placeholder="Type a command…" value={commandQuery} onChange={(event) => setCommandQuery(event.target.value)} /></label><div className="ptb-command-list">{[
        ["Add node", "N", () => setPickerOpen(true), Plus],
        ["Open resources", "", () => setDrawer("resources"), Database],
        ["Open experiment", "", () => setDrawer("experiment"), SlidersHorizontal],
        ["Open source", "", () => setDrawer("source"), Braces],
        ["Validate suite", "", () => void validate(), Check],
        ["Tidy graph", "", autoLayout, AlignCenter],
        ["Undo", "⌘Z", undo, Undo2],
        ["Redo", "⇧⌘Z", redo, Redo2],
        ["Save version", "", () => void save(), Save],
        ["Review launch", "⌘↵", () => void preflightLaunch(), Play],
        ["Open executions", "", () => setActiveTab("executions"), History],
        ["Open results", "", () => setActiveTab("results"), Beaker],
        ["Fit graph", "", () => shellRef.current?.querySelector<HTMLButtonElement>("button[aria-label='Fit graph']")?.click(), Focus],
        ["Toggle focus mode", "", () => setFocusMode((value) => !value), Focus],
        ["Keyboard editor", "", () => shellRef.current?.querySelector<HTMLDetailsElement>(".ptb-list-editor")?.setAttribute("open", ""), Keyboard],
        ["Keyboard help", "", () => { setBottomTab("logs"); setBottomDrawerOpen(true); report("Shortcuts: N add node, Shift+S note, ⌘K commands, ⌘Z undo, ⇧⌘Z redo, ⌘Enter preflight."); }, Keyboard],
      ].filter(([label]) => String(label).toLowerCase().includes(commandQuery.toLowerCase())).map(([label, shortcut, action, Icon]: any) => <button key={label} onClick={() => { action(); setCommandOpen(false); }}><Icon size={17} /><span>{label}</span><kbd>{shortcut}</kbd></button>)}</div></section></div>}
      <div className="sr-only" aria-live="polite">{announcement}</div>
    </section>
  );
}

const roots = new WeakMap<Element, Root>();

function mount(container: Element, props: BuilderProps) {
  ensureBuilderStyles();
  roots.get(container)?.unmount();
  const root = createRoot(container);
  roots.set(container, root);
  root.render(<PersonaTestBuilder {...props} />);
  return () => {
    root.unmount();
    roots.delete(container);
  };
}

declare global {
  interface Window {
    TribeXPersonaTestBuilder?: { mount: typeof mount };
  }
}

window.TribeXPersonaTestBuilder = { mount };
