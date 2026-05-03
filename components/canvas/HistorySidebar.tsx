"use client";

import { useState } from "react";
import { X, CheckCircle2, XCircle, AlertCircle, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import type { WorkflowRun, NodeRun } from "@/types/workflow";

interface HistorySidebarProps {
  runs: WorkflowRun[];
  onClose: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  success: "bg-green-100 text-green-700",
  failed:  "bg-red-100 text-red-600",
  partial: "bg-yellow-100 text-yellow-700",
  running: "bg-violet-100 text-violet-700",
};

// DAG execution order — used to sort nodeRuns in the correct pipeline order
const NODE_TYPE_ORDER: Record<string, number> = {
  "request-inputs": 0,
  "crop-image":     1,
  "gemini":         2,
  "response":       3,
};

function sortNodeRuns(nodeRuns: NodeRun[]): NodeRun[] {
  return [...nodeRuns].sort((a, b) => {
    const orderA = NODE_TYPE_ORDER[a.nodeType] ?? 5;
    const orderB = NODE_TYPE_ORDER[b.nodeType] ?? 5;
    if (orderA !== orderB) return orderA - orderB;
    // Within same type, sort by completedAt (execution order)
    const tA = a.completedAt ? new Date(a.completedAt).getTime() : Infinity;
    const tB = b.completedAt ? new Date(b.completedAt).getTime() : Infinity;
    return tA - tB;
  });
}

function getOutputText(output: Record<string, unknown> | null | undefined): string {
  if (!output) return "";
  if (output["response"])    return String(output["response"]);
  if (output["result"])      return String(output["result"]);
  if (output["text_field"])  return String(output["text_field"]);
  if (output["output-image"]) return "[cropped image]";
  return JSON.stringify(output);
}

function getInputSummary(inputs: Record<string, unknown> | null | undefined): string {
  if (!inputs) return "";
  const entries = Object.entries(inputs).map(([k, v]) => {
    if (typeof v === "string" && v.startsWith("data:")) return `${k}: [image]`;
    if (typeof v === "string") return `${k}: "${v.slice(0, 40)}${v.length > 40 ? "…" : ""}"`;
    return `${k}: ${JSON.stringify(v).slice(0, 40)}`;
  });
  return entries.join(", ");
}

function RunStatusIcon({ status, size = 4 }: { status: string; size?: number }) {
  const cls = `w-${size} h-${size} shrink-0`;
  if (status === "success") return <CheckCircle2 className={cn(cls, "text-green-500")} />;
  if (status === "failed")  return <XCircle className={cn(cls, "text-red-500")} />;
  if (status === "partial") return <AlertCircle className={cn(cls, "text-yellow-500")} />;
  return <Loader2 className={cn(cls, "text-violet-500 animate-spin")} />;
}

function NodeRunRow({ nr, isLast }: { nr: NodeRun; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const prefix = isLast ? "└──" : "├──";
  const outputText = getOutputText(nr.output as Record<string, unknown> | null | undefined);

  return (
    <div className="font-mono text-[10px]">
      {/* Row header */}
      <button
        onClick={() => setExpanded((o) => !o)}
        className="flex items-center gap-1 w-full text-left hover:bg-[#f3f4f6] px-3 py-1 transition-colors"
      >
        <span className="text-[#c0c0c0] shrink-0">{prefix}</span>
        <RunStatusIcon status={nr.status} size={3} />
        <span className={cn(
          "flex-1 min-w-0 ml-0.5",
          nr.status === "failed" ? "text-red-500" : "text-[#374151]"
        )}>
          {nr.nodeType}
        </span>
        {nr.executionTime != null && (
          <span className="text-[#9ca3af] shrink-0">{formatDuration(nr.executionTime)}</span>
        )}
        {expanded
          ? <ChevronDown className="w-2.5 h-2.5 text-[#9ca3af] ml-1 shrink-0" />
          : <ChevronRight className="w-2.5 h-2.5 text-[#9ca3af] ml-1 shrink-0" />}
      </button>

      {/* Collapsed: single-line output preview */}
      {!expanded && outputText && (
        <div className="pl-8 pr-3 pb-0.5 text-[#6b7280]">
          → {outputText.startsWith("[") ? outputText : outputText.slice(0, 60) + (outputText.length > 60 ? "…" : "")}
        </div>
      )}

      {/* Expanded: full detail */}
      {expanded && (
        <div className="pl-8 pr-3 pb-2 space-y-1 bg-[#f9fafb] border-l-2 border-[#e5e7eb] ml-3">
          {/* Inputs */}
          {nr.inputs && Object.keys(nr.inputs as object).length > 0 && (
            <div>
              <div className="text-[#9ca3af] mb-0.5">inputs:</div>
              <div className="text-[#6b7280] break-all whitespace-pre-wrap leading-relaxed">
                {getInputSummary(nr.inputs as Record<string, unknown>)}
              </div>
            </div>
          )}
          {/* Full output */}
          {outputText && (
            <div>
              <div className="text-[#9ca3af] mb-0.5">output:</div>
              <div className={cn(
                "text-[#374151] break-words whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto",
                outputText.startsWith("[") && "text-[#6b7280] italic"
              )}>
                {outputText}
              </div>
            </div>
          )}
          {/* Error */}
          {nr.error && (
            <div>
              <div className="text-red-400 mb-0.5">error:</div>
              <div className="text-red-400 break-words whitespace-pre-wrap leading-relaxed max-h-24 overflow-y-auto">
                {nr.error}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function HistorySidebar({ runs, onClose }: HistorySidebarProps) {
  const [expandedRun, setExpandedRun] = useState<string | null>(runs[0]?.id ?? null);
  const dedupedRuns = Array.from(new Map(runs.map((r) => [r.id, r])).values());

  return (
    <aside className="w-72 bg-white border-l border-[#e5e7eb] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#f3f4f6] shrink-0">
        <span className="text-sm font-semibold text-[#111827]">Run History</span>
        <button onClick={onClose} className="text-[#9ca3af] hover:text-[#374151] transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {dedupedRuns.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#9ca3af]">No runs yet. Hit ▶ Run to start.</div>
        ) : (
          <div className="divide-y divide-[#f3f4f6]">
            {dedupedRuns.map((run, i) => {
              const isOpen   = expandedRun === run.id;
              const date     = new Date(run.startedAt);
              const dateStr  = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
              const timeStr  = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
              const sorted   = sortNodeRuns(run.nodeRuns ?? []);

              return (
                <div key={run.id}>
                  {/* Run header */}
                  <button
                    onClick={() => setExpandedRun(isOpen ? null : run.id)}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-[#f9fafb] transition-colors text-left"
                  >
                    <RunStatusIcon status={run.status} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs font-semibold text-[#111827]">
                          Run #{dedupedRuns.length - i}
                        </span>
                        <span className={cn(
                          "text-[9px] px-1.5 py-0.5 rounded-full font-medium",
                          STATUS_COLORS[run.status] ?? "bg-gray-100 text-gray-500"
                        )}>
                          {run.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#9ca3af]">
                        {dateStr} {timeStr}
                        {run.duration != null && <> · {formatDuration(run.duration)}</>}
                        {" · "}<span className="capitalize">{run.scope}</span>
                      </div>
                    </div>
                    {isOpen
                      ? <ChevronDown className="w-3 h-3 text-[#9ca3af] shrink-0" />
                      : <ChevronRight className="w-3 h-3 text-[#9ca3af] shrink-0" />}
                  </button>

                  {/* Expanded tree view */}
                  {isOpen && sorted.length > 0 && (
                    <div className="bg-[#fafafa] border-t border-[#f3f4f6] py-1">
                      <div className="px-3 pb-1 font-mono text-[9px] text-[#9ca3af]">
                        Run #{dedupedRuns.length - i} — {dateStr} {timeStr} ({run.scope} workflow)
                      </div>
                      {sorted.map((nr, j) => (
                        <NodeRunRow key={nr.id} nr={nr} isLast={j === sorted.length - 1} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
