"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  Panel,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  ArrowLeft, Play, Clock, Download, Upload, Undo2, Redo2,
  ZoomIn, ZoomOut, Maximize2, LayoutGrid, Move, Command, File, Plus,
} from "lucide-react";

import { RequestInputsNode } from "@/components/nodes/RequestInputsNode";
import { CropImageNode } from "@/components/nodes/CropImageNode";
import { GeminiNode } from "@/components/nodes/GeminiNode";
import { ResponseNode } from "@/components/nodes/ResponseNode";
import { HistorySidebar } from "@/components/canvas/HistorySidebar";
import { NodePicker } from "@/components/canvas/NodePicker";
import { CanvasContext } from "@/components/canvas/CanvasContext";
import { hasCycle, areHandlesCompatible } from "@/lib/execution";
import { cn } from "@/lib/utils";
import type { WorkflowNode, WorkflowEdge, WorkflowRun } from "@/types/workflow";

const nodeTypes = {
  requestInputs: RequestInputsNode,
  cropImage: CropImageNode,
  gemini: GeminiNode,
  responseNode: ResponseNode,
};

const PROTECTED_NODE_IDS = new Set(["request-inputs", "response"]);
const AUTOSAVE_DELAY = 1500;

interface WorkflowCanvasProps {
  workflowId: string;
  initialName: string;
  initialNodes: WorkflowNode[];
  initialEdges: WorkflowEdge[];
  initialRuns: WorkflowRun[];
}

// ─── Custom bottom toolbar ────────────────────────────────────────────────────
function CanvasToolbar({
  onUndo, onRedo, onBack,
}: {
  onUndo: () => void;
  onRedo: () => void;
  onBack: () => void;
}) {
  const { zoomIn, zoomOut, fitView, getViewport } = useReactFlow();
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    const id = setInterval(() => {
      const vp = getViewport();
      setZoom(Math.round(vp.zoom * 100));
    }, 300);
    return () => clearInterval(id);
  }, [getViewport]);

  const btn = "flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[#f3f4f6] text-[#374151] transition-colors";

  return (
    <div className="flex items-center gap-0.5 bg-white border border-[#e5e7eb] rounded-2xl shadow-md px-2 py-1.5 select-none">
      {/* Navigation */}
      <button onClick={onBack} className={btn} title="Back to dashboard">
        <ArrowLeft className="w-4 h-4" />
      </button>
      <button onClick={onUndo} className={btn} title="Undo (⌘Z)">
        <Undo2 className="w-4 h-4" />
      </button>
      <button onClick={onRedo} className={btn} title="Redo (⌘⇧Z)">
        <Redo2 className="w-4 h-4" />
      </button>
      <button className={btn} title="Keyboard shortcuts">
        <Command className="w-4 h-4" />
      </button>

      <div className="w-px h-5 bg-[#e5e7eb] mx-1" />

      {/* Zoom */}
      <button onClick={() => zoomOut({ duration: 200 })} className={btn} title="Zoom out">
        <ZoomOut className="w-4 h-4" />
      </button>
      <button
        onClick={() => fitView({ duration: 300, padding: 0.1 })}
        className="px-2 h-8 rounded-lg hover:bg-[#f3f4f6] text-[#374151] text-xs font-medium tabular-nums min-w-[48px] text-center transition-colors"
        title="Fit view"
      >
        {zoom}%
      </button>
      <button onClick={() => zoomIn({ duration: 200 })} className={btn} title="Zoom in">
        <ZoomIn className="w-4 h-4" />
      </button>

      <div className="w-px h-5 bg-[#e5e7eb] mx-1" />

      {/* View controls */}
      <button onClick={() => fitView({ duration: 300, padding: 0.1 })} className={btn} title="Fit view">
        <Maximize2 className="w-4 h-4" />
      </button>
      <button className={btn} title="Toggle minimap">
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button className={btn} title="Pan mode">
        <Move className="w-4 h-4" />
      </button>
    </div>
  );
}

// NodePickerPill removed — using NodePicker from NodePicker.tsx instead

// ─── Main canvas inner ────────────────────────────────────────────────────────
function CanvasInner({
  workflowId, initialName, initialNodes, initialEdges, initialRuns,
}: WorkflowCanvasProps) {
  const router = useRouter();
  const { getNodes, getEdges, fitView } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes as unknown as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges as unknown as Edge[]);
  const [workflowName, setWorkflowName] = useState(initialName);
  const [editingName, setEditingName] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [runs, setRuns] = useState<WorkflowRun[]>(initialRuns);
  const [isRunning, setIsRunning] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const undoStack    = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const redoStack    = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const saveTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nodeCounter  = useRef(0);
  // Track all active poll intervals so we can clear them
  const pollIntervals = useRef<Set<ReturnType<typeof setInterval>>>(new Set());

  // Clear all polling on unmount
  useEffect(() => {
    return () => { pollIntervals.current.forEach(clearInterval); };
  }, []);

  function scheduleAutosave(ns: Node[], es: Edge[]) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void fetch(`/api/workflows/${workflowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes: ns, edges: es }),
      });
    }, AUTOSAVE_DELAY);
  }

  function pushHistory(ns: Node[], es: Edge[]) {
    undoStack.current.push({ nodes: ns, edges: es });
    redoStack.current = [];
  }

  function undo() {
    if (!undoStack.current.length) return;
    const prev = undoStack.current.pop()!;
    redoStack.current.push({ nodes: [...nodes], edges: [...edges] });
    setNodes(prev.nodes);
    setEdges(prev.edges);
  }

  function redo() {
    if (!redoStack.current.length) return;
    const next = redoStack.current.pop()!;
    undoStack.current.push({ nodes: [...nodes], edges: [...edges] });
    setNodes(next.nodes);
    setEdges(next.edges);
  }

  const onConnect = useCallback(
    (connection: Connection) => {
      const { sourceHandle, targetHandle } = connection;
      if (sourceHandle && targetHandle && !areHandlesCompatible(sourceHandle, targetHandle)) return;

      const currentNodes = getNodes();
      const currentEdges = getEdges();
      const newEdge: Edge = {
        ...connection,
        id: `e-${connection.source}-${connection.sourceHandle}-${connection.target}-${connection.targetHandle}-${Date.now()}`,
        animated: true,
        style: { stroke: "#7c3aed", strokeWidth: 2 },
        source: connection.source!,
        target: connection.target!,
      };
      const proposed = addEdge(newEdge, currentEdges);
      if (hasCycle(currentNodes as unknown as WorkflowNode[], proposed as unknown as WorkflowEdge[])) return;

      pushHistory([...nodes], [...edges]);
      setEdges(proposed);
      scheduleAutosave(currentNodes, proposed);
    },
    [nodes, edges, getNodes, getEdges]
  );

  // Delete / undo / redo keyboard handler
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      if ((e.key === "Delete" || e.key === "Backspace") && !isInput) {
        const ns = getNodes();
        const es = getEdges();
        const selNodes = ns.filter((n) => n.selected && !PROTECTED_NODE_IDS.has(n.id));
        const selEdges = es.filter((e) => e.selected);
        if (!selNodes.length && !selEdges.length) return;
        pushHistory([...ns], [...es]);
        const deletedIds = new Set(selNodes.map((n) => n.id));
        const newNodes = ns.filter((n) => !deletedIds.has(n.id));
        const newEdges = es.filter(
          (e) => !selEdges.some((se) => se.id === e.id) && !deletedIds.has(e.source) && !deletedIds.has(e.target)
        );
        setNodes(newNodes);
        setEdges(newEdges);
        scheduleAutosave(newNodes, newEdges);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.metaKey || e.ctrlKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) { e.preventDefault(); redo(); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nodes, edges]);

  function addNode(type: string) {
    nodeCounter.current += 1;
    const id = `${type}-${Date.now()}`;
    // Place new nodes in a staggered grid, offset from center
    const col = nodeCounter.current % 3;
    const row = Math.floor(nodeCounter.current / 3);
    const position = { x: 300 + col * 320, y: 100 + row * 260 };

    const typeMap: Record<string, string> = { cropImage: "cropImage", gemini: "gemini" };
    const newNode: Node = {
      id,
      type: typeMap[type],
      position,
      data: type === "cropImage"
        ? { type: "crop-image", label: "Crop Image", x: 0, y: 0, w: 100, h: 100, status: "idle", manualInputs: {} }
        : { type: "gemini", label: "Gemini 3.1 Pro", model: "gemini-2.5-pro", status: "idle", manualInputs: {} },
    };
    pushHistory([...nodes], [...edges]);
    const newNodes = [...nodes, newNode];
    setNodes(newNodes);
    scheduleAutosave(newNodes, edges);
  }

  function exportWorkflow() {
    const blob = new Blob([JSON.stringify({ name: workflowName, nodes, edges }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"), { href: url, download: `${workflowName}.json` }).click();
    URL.revokeObjectURL(url);
  }

  function importWorkflow(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const p = JSON.parse(ev.target?.result as string) as { nodes: Node[]; edges: Edge[]; name?: string };
        pushHistory([...nodes], [...edges]);
        setNodes(p.nodes); setEdges(p.edges);
        if (p.name) setWorkflowName(p.name);
        scheduleAutosave(p.nodes, p.edges);
      } catch { /* invalid json */ }
    };
    reader.readAsText(file);
  }

  async function saveName(name: string) {
    setWorkflowName(name); setEditingName(false);
    await fetch(`/api/workflows/${workflowId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  }

  async function runWorkflow(scope: "full" | "single" | "partial" = "full", nodeIds?: string[]) {
    // Cancel any existing polls before starting a new run
    pollIntervals.current.forEach(clearInterval);
    pollIntervals.current.clear();
    setIsRunning(true);
    const currentNodes = getNodes();
    const currentEdges = getEdges();
    const selectedIds  = nodeIds ?? currentNodes.filter((n) => n.selected).map((n) => n.id);
    try {
      const res = await fetch(`/api/workflows/${workflowId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, nodeIds: selectedIds, nodes: currentNodes, edges: currentEdges }),
      });
      const data = await res.json() as { runId?: string; error?: string };
      if (data.error) { console.error(data.error); setIsRunning(false); return; }
      if (data.runId) pollRunStatus(data.runId);
    } catch { setIsRunning(false); }
  }

  function runNode(nodeId: string) {
    void runWorkflow("single", [nodeId]);
  }

  function pollRunStatus(runId: string) {
    const interval = setInterval(async () => {
      try {
        const run = await fetch(`/api/runs/${runId}`).then((r) => r.json()) as WorkflowRun & {
          nodeRuns: Array<{ nodeId: string; status: string; output?: Record<string, unknown> | null }>;
        };

        if (run.nodeRuns) {
          setNodes((nds) => nds.map((n) => {
            const nr = run.nodeRuns.find((r) => r.nodeId === n.id);
            if (!nr) return n;
            const o = nr.output as Record<string, unknown> | null | undefined;
            // Pick the right output key per node type
            const out = o
              ? ((o["response"] ?? o["result"] ?? o["output-image"] ?? null) as string | null)
              : null;
            return { ...n, data: { ...n.data, status: nr.status, output: out } };
          }));
        }

        if (run.status !== "running") {
          clearInterval(interval);
          pollIntervals.current.delete(interval);
          setIsRunning(false);
          setRuns((prev) => {
            const without = prev.filter((r) => r.id !== run.id);
            return [run, ...without].slice(0, 20);
          });
        }
      } catch {
        clearInterval(interval);
        pollIntervals.current.delete(interval);
        setIsRunning(false);
      }
    }, 2000);

    // Register so we can clear on unmount or new run
    pollIntervals.current.add(interval);
  }

  return (
    <CanvasContext.Provider value={{ runNode, workflowId }}>
    <div className="flex flex-col h-screen bg-[#f5f5f5]">
      {/* ── Top bar — light theme ─────────────────────────────────── */}
      <header className="h-11 border-b border-[#e5e7eb] flex items-center justify-between px-3 bg-white shrink-0 z-10">
        {/* Left */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => router.push("/dashboard")}
            className="p-1.5 rounded hover:bg-[#f3f4f6] text-[#9ca3af] hover:text-[#374151] transition-colors shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          {editingName ? (
            <input
              autoFocus
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              onBlur={(e) => saveName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveName(workflowName); if (e.key === "Escape") setEditingName(false); }}
              className="bg-white text-[#111827] text-xs px-2 py-1 rounded-md border border-[#7c3aed] outline-none max-w-[200px] shadow-sm"
            />
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="text-xs font-medium text-[#111827] hover:text-[#7c3aed] transition-colors truncate max-w-[220px]"
            >
              {workflowName}
            </button>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-1 shrink-0">
          {isRunning && (
            <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-2 py-1 rounded-md flex items-center gap-1.5 mr-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Running…
            </span>
          )}
          <button onClick={exportWorkflow} className="p-1.5 rounded hover:bg-[#f3f4f6] text-[#9ca3af] hover:text-[#374151] transition-colors" title="Export JSON">
            <Download className="w-3.5 h-3.5" />
          </button>
          <label className="p-1.5 rounded hover:bg-[#f3f4f6] text-[#9ca3af] hover:text-[#374151] transition-colors cursor-pointer" title="Import JSON">
            <Upload className="w-3.5 h-3.5" />
            <input type="file" accept=".json" onChange={importWorkflow} className="hidden" />
          </label>
          <div className="w-px h-4 bg-[#e5e7eb] mx-1" />
          <button
            onClick={() => setHistoryOpen((o) => !o)}
            className={cn("p-1.5 rounded transition-colors", historyOpen ? "bg-[#ede9fe] text-[#7c3aed]" : "text-[#9ca3af] hover:text-[#374151] hover:bg-[#f3f4f6]")}
            title="Run History"
          >
            <Clock className="w-3.5 h-3.5" />
          </button>
          {/* Green run button */}
          <button
            onClick={() => runWorkflow("full")}
            disabled={isRunning}
            className={cn(
              "ml-2 w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-sm",
              isRunning ? "bg-[#d1d5db] cursor-not-allowed" : "bg-[#22c55e] hover:bg-[#16a34a] shadow-green-200"
            )}
            title="Run workflow"
          >
            <Play className={cn("w-3.5 h-3.5 text-white ml-0.5", isRunning && "opacity-40")} />
          </button>
          <div className="ml-2">
            <UserButton />
          </div>
        </div>
      </header>

      {/* ── Canvas + sidebar ─────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.12, minZoom: 0.3 }}
            minZoom={0.2}
            maxZoom={2}
            deleteKeyCode={null}
            proOptions={{ hideAttribution: true }}
            connectionRadius={40}
            snapToGrid
            snapGrid={[8, 8]}
          >
            {/* Light dot grid */}
            <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} color="#d1d5db" />

            {/* MiniMap — black bg, per-type colours */}
            <MiniMap
              position="bottom-right"
              nodeColor={(node) => {
                const t = node.type;
                if (t === "cropImage")   return "#f59e0b"; // orange
                if (t === "gemini")      return "#3b82f6"; // blue
                if (t === "requestInputs") return "#6b7280"; // gray
                return "#4b5563";                           // dark gray (response)
              }}
              nodeStrokeWidth={0}
              maskColor="rgba(0,0,0,0.55)"
              style={{
                background: "#111111",
                borderRadius: 12,
                border: "1px solid #27272a",
                marginBottom: 56,
              }}
            />

            {/* ── Custom bottom-left toolbar ── */}
            <Panel position="bottom-left">
              <div className="mb-4 ml-2">
                <CanvasToolbar
                  onUndo={undo}
                  onRedo={redo}
                  onBack={() => router.push("/dashboard")}
                />
              </div>
            </Panel>

            {/* ── Node picker — bottom-center ── */}
            <Panel position="bottom-center">
              <div className="mb-4">
                <NodePicker open={pickerOpen} onToggle={() => setPickerOpen((o) => !o)} onAdd={addNode} />
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {historyOpen && (
          <HistorySidebar runs={runs} onClose={() => setHistoryOpen(false)} />
        )}
      </div>
    </div>
    </CanvasContext.Provider>
  );
}

export function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
