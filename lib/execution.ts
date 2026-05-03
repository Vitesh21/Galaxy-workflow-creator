import type { WorkflowNode, WorkflowEdge, NodeData } from "@/types/workflow";

export interface ExecutionContext {
  nodeOutputs: Map<string, Record<string, unknown>>;
}

/** Build a map of nodeId → [nodeIds that must complete before this node] */
export function buildDependencyMap(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): Map<string, string[]> {
  const deps = new Map<string, string[]>();
  for (const node of nodes) deps.set(node.id, []);
  for (const edge of edges) {
    const list = deps.get(edge.target) ?? [];
    if (!list.includes(edge.source)) list.push(edge.source);
    deps.set(edge.target, list);
  }
  return deps;
}

/** Topological sort — returns node IDs in execution order */
export function topologicalSort(
  nodes: WorkflowNode[],
  deps: Map<string, string[]>
): string[] {
  const visited = new Set<string>();
  const order: string[] = [];

  function visit(id: string) {
    if (visited.has(id)) return;
    visited.add(id);
    for (const dep of deps.get(id) ?? []) visit(dep);
    order.push(id);
  }

  for (const node of nodes) visit(node.id);
  return order;
}

/** Detect cycles in the edge list (for DAG validation) */
export function hasCycle(nodes: WorkflowNode[], edges: WorkflowEdge[]): boolean {
  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) {
    const list = adj.get(e.source) ?? [];
    list.push(e.target);
    adj.set(e.source, list);
  }

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  for (const n of nodes) color.set(n.id, WHITE);

  function dfs(id: string): boolean {
    color.set(id, GRAY);
    for (const neighbor of adj.get(id) ?? []) {
      if (color.get(neighbor) === GRAY) return true;
      if (color.get(neighbor) === WHITE && dfs(neighbor)) return true;
    }
    color.set(id, BLACK);
    return false;
  }

  for (const n of nodes) {
    if (color.get(n.id) === WHITE && dfs(n.id)) return true;
  }
  return false;
}

/** Collect resolved inputs for a node based on edges and upstream outputs */
export function resolveNodeInputs(
  node: WorkflowNode,
  edges: WorkflowEdge[],
  nodeOutputs: Map<string, Record<string, unknown>>
): Record<string, unknown> {
  const data = node.data as NodeData;
  const inputs: Record<string, unknown> = { ...(data.manualInputs ?? {}) };

  const incomingEdges = edges.filter((e) => e.target === node.id);
  for (const edge of incomingEdges) {
    const sourceOutput = nodeOutputs.get(edge.source);
    if (!sourceOutput || !edge.sourceHandle || !edge.targetHandle) continue;
    inputs[edge.targetHandle] = sourceOutput[edge.sourceHandle];
  }

  return inputs;
}

/** Handle types for connection validation */
export const HANDLE_TYPES: Record<string, "image" | "text"> = {
  "image_field": "image",
  "input-image": "image",
  "output-image": "image",
  "image-vision-0": "image",
  "text_field": "text",
  "prompt": "text",
  "response": "text",
  "result": "text",
};

export function areHandlesCompatible(sourceHandle: string, targetHandle: string): boolean {
  const srcType = HANDLE_TYPES[sourceHandle];
  const tgtType = HANDLE_TYPES[targetHandle];
  if (!srcType || !tgtType) return true; // unknown types — allow
  return srcType === tgtType;
}
