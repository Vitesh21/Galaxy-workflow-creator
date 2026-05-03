export type NodeType = "request-inputs" | "crop-image" | "gemini" | "response";

export type HandleType = "image" | "text" | "audio" | "video" | "file";

export interface FieldDef {
  id: string;
  label: string;
  kind: "text_field" | "image_field";
}

export interface NodeData {
  type: NodeType;
  label: string;
  fields?: FieldDef[];
  // crop-image params
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  // gemini params
  systemPrompt?: string;
  model?: string;
  // runtime state
  status?: "idle" | "running" | "success" | "failed";
  output?: string | null;
  // manual input values (keyed by handle id)
  manualInputs?: Record<string, string>;
  // index signature required for React Flow compatibility
  [key: string]: unknown;
}

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: NodeData;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  sourceHandle: string | null;
  target: string;
  targetHandle: string | null;
  animated?: boolean;
  style?: Record<string, string | number>;
}

export interface Workflow {
  id: string;
  userId: string;
  name: string;
  status: "idle" | "running";
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt: string;
  updatedAt: string;
  runs?: WorkflowRun[];
}

export interface NodeRun {
  id: string;
  workflowRunId: string;
  nodeId: string;
  nodeType: string;
  status: "running" | "success" | "failed";
  inputs: Record<string, unknown>;
  output?: Record<string, unknown> | null;
  startedAt: string;
  completedAt?: string | null;
  executionTime?: number | null;
  error?: string | null;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  scope: "full" | "partial" | "single";
  status: "running" | "success" | "failed" | "partial";
  startedAt: string;
  completedAt?: string | null;
  duration?: number | null;
  nodeRuns: NodeRun[];
}
