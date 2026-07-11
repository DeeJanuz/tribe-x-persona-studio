type GraphNode = { id: string; type: string };
type GraphEdge = { source: string; target: string };

export function removeGraphNodes<
  Node extends GraphNode,
  Edge extends GraphEdge,
>(nodes: Node[], edges: Edge[], requestedIds: Iterable<string>) {
  const requested = new Set(requestedIds);
  const removable = new Set(
    nodes
      .filter((node) => requested.has(node.id) && node.type !== "start" && node.type !== "end")
      .map((node) => node.id),
  );

  return {
    nodes: nodes.filter((node) => !removable.has(node.id)),
    edges: edges.filter((edge) => !removable.has(edge.source) && !removable.has(edge.target)),
    removedIds: [...removable],
  };
}

export function requirePreflightSuiteVersionId(
  existingVersionId: string | null,
  savedVersion: { id?: string } | null,
): string {
  const suiteVersionId = existingVersionId || savedVersion?.id;
  if (!suiteVersionId) {
    throw new Error("Save an exact immutable suite version before reviewing launch.");
  }
  return suiteVersionId;
}
