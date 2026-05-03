"use client";

import { memo, useState } from "react";
import { Handle, Position, type NodeProps, useReactFlow, useEdges } from "@xyflow/react";
import { Sparkles, ChevronRight, ChevronDown, Play, RotateCcw, MoreHorizontal, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/components/canvas/CanvasContext";
import type { NodeData } from "@/types/workflow";

interface Props extends NodeProps { data: NodeData }

const HEADER_H  = 40;
const ROW_H     = 62;   // label(16) + input(38) + gap(8)
const PAD_TOP   = 10;

// Input rows — colors match Galaxy.ai reference
const INPUT_ROWS = [
  { id: "prompt",          label: "Prompt",            required: true,  kind: "text",  color: "#f59e0b", uploadLabel: "" },
  { id: "system-prompt",   label: "System Prompt",     required: false, kind: "text",  color: "#f59e0b", uploadLabel: "" },
  { id: "image-vision-0",  label: "Image (Vision)",    required: false, kind: "image", color: "#f59e0b", uploadLabel: "Upload Image" },
  { id: "video",           label: "Video",             required: false, kind: "video", color: "#22c55e", uploadLabel: "Upload video" },
  { id: "audio",           label: "Audio",             required: false, kind: "audio", color: "#14b8a6", uploadLabel: "Upload audio" },
  { id: "file",            label: "File",              required: false, kind: "file",  color: "#8b5cf6", uploadLabel: "Upload file"  },
];

export const GeminiNode = memo(function GeminiNode({ id, data, selected }: Props) {
  const { setNodes, deleteElements } = useReactFlow();
  const { runNode } = useCanvas();
  const allEdges = useEdges();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [uploads, setUploads] = useState<Record<string, string>>({});

  const connected = new Set(allEdges.filter((e) => e.target === id).map((e) => e.targetHandle));

  function setManual(hid: string, val: string) {
    setNodes((nds) => nds.map((n) =>
      n.id === id ? { ...n, data: { ...n.data, manualInputs: { ...(n.data as NodeData).manualInputs as Record<string,string>, [hid]: val } } } : n
    ));
  }

  function setSys(val: string) {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, systemPrompt: val } } : n));
  }

  function setModel(val: string) {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, model: val } } : n));
  }

  function handleUpload(hid: string, file: File) {
    const reader = new FileReader();
    reader.onload = (e) => setUploads((prev) => ({ ...prev, [hid]: e.target?.result as string }));
    reader.readAsDataURL(file);
  }

  function handleDelete() {
    deleteElements({ nodes: [{ id }] });
    setMenuOpen(false);
  }

  const totalRows = INPUT_ROWS.length;
  const outTop = HEADER_H + PAD_TOP + totalRows * ROW_H / 2;

  const manualInputs = (data.manualInputs as Record<string,string>) ?? {};

  return (
    <div className={cn(
      "bg-white rounded-xl border border-[#e5e7eb] shadow-sm w-[300px]",
      selected && "ring-2 ring-[#7c3aed]",
      data.status === "running" && "node-running",
    )}>
      {/* Output handle */}
      <Handle type="source" position={Position.Right} id="response"
        style={{ top: outTop, right: -7, width: 13, height: 13, background: "#f59e0b", border: "2.5px solid #fff", borderRadius: "50%" }} />

      {/* Header */}
      <div className="flex items-center justify-between px-3 bg-[#f9fafb] border-b border-[#f3f4f6] rounded-t-xl" style={{ height: HEADER_H }}>
        <div className="flex items-center gap-1.5 min-w-0">
          <Sparkles className="w-3 h-3 text-[#7c3aed] shrink-0" />
          {/* Model selector directly in header */}
          <select
            value={String(data.model ?? "gemini-2.5-flash")}
            onChange={(e) => setModel(e.target.value)}
            className="nodrag text-xs font-semibold text-[#111827] bg-transparent border-none outline-none cursor-pointer hover:text-[#7c3aed] transition-colors max-w-[130px] truncate"
          >
            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
            <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
            <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
            <option value="gemini-1.5-flash-8b">Gemini 1.5 Flash 8B</option>
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#e5e7eb] text-[#9ca3af] transition-colors">
            <RotateCcw className="w-3 h-3" />
          </button>
          <button
            onClick={() => runNode(id)}
            className="flex items-center gap-1 px-2 py-1 bg-[#22c55e] hover:bg-[#16a34a] text-white text-[10px] font-medium rounded-md transition-colors"
            title="Run this node only"
          >
            <Play className="w-2.5 h-2.5 ml-0.5" /> Run
          </button>
          <div className="relative">
            <button onClick={() => setMenuOpen((o) => !o)}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#e5e7eb] text-[#9ca3af] transition-colors">
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-[#e5e7eb] rounded-xl shadow-lg z-50 py-1">
                <button onClick={handleDelete}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Input rows */}
      <div className="px-3" style={{ paddingTop: PAD_TOP }}>
        {INPUT_ROWS.map((row, i) => {
          const isConn = connected.has(row.id);
          const handleTop = HEADER_H + PAD_TOP + i * ROW_H + ROW_H / 2 - 6;

          return (
            <div key={row.id} className="relative" style={{ minHeight: ROW_H }}>
              {/* Target handle */}
              <Handle type="target" position={Position.Left} id={row.id}
                style={{ top: handleTop, left: -7, width: 13, height: 13, background: row.color, border: "2.5px solid #fff", borderRadius: "50%" }} />

              {/* Label */}
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: row.color }} />
                <span className="text-[10px] text-[#374151] font-medium">
                  {row.label}
                  {row.required && <span className="text-red-500 ml-0.5">*</span>}
                </span>
              </div>

              {/* Input */}
              {row.kind === "text" && row.id === "system-prompt" ? (
                <textarea rows={2} value={String(data.systemPrompt ?? "")} onChange={(e) => setSys(e.target.value)}
                  disabled={isConn} placeholder={isConn ? "Connected" : "System prompt…"}
                  className={cn("nodrag w-full bg-[#f9fafb] text-[#111827] text-xs px-2 py-1.5 rounded-lg border border-[#e5e7eb] outline-none resize-none transition-colors mb-1.5",
                    isConn ? "opacity-40 cursor-not-allowed" : "focus:border-[#7c3aed] focus:bg-white")} />
              ) : row.kind === "text" ? (
                <textarea rows={2} value={manualInputs[row.id] ?? ""}
                  onChange={(e) => setManual(row.id, e.target.value)}
                  disabled={isConn} placeholder={isConn ? "Connected" : `Enter ${row.label.toLowerCase()}…`}
                  className={cn("nodrag w-full bg-[#f9fafb] text-[#111827] text-xs px-2 py-1.5 rounded-lg border border-[#e5e7eb] outline-none resize-none transition-colors mb-1.5",
                    isConn ? "opacity-40 cursor-not-allowed" : "focus:border-[#7c3aed] focus:bg-white")} />
              ) : (
                /* Upload button for image/video/audio/file */
                <div className="mb-1.5">
                  {uploads[row.id] && row.kind === "image" && (
                    <img src={uploads[row.id]} alt="" className="w-full h-16 object-cover rounded-lg border border-[#e5e7eb] mb-1" />
                  )}
                  {!isConn && (
                    <label className={cn(
                      "flex items-center gap-2 w-full bg-[#f9fafb] border border-dashed rounded-lg px-2 py-1.5 cursor-pointer transition-colors group/up",
                      row.kind === "image" ? "border-[#fde68a] hover:border-[#f59e0b] hover:bg-amber-50" :
                      row.kind === "video" ? "border-[#bbf7d0] hover:border-[#22c55e] hover:bg-green-50" :
                      row.kind === "audio" ? "border-[#99f6e4] hover:border-[#14b8a6] hover:bg-teal-50" :
                      "border-[#ddd6fe] hover:border-[#8b5cf6] hover:bg-violet-50"
                    )}>
                      <Upload className="w-3 h-3 text-[#9ca3af] transition-colors" style={{ color: uploads[row.id] ? row.color : undefined }} />
                      <span className="text-[10px] text-[#9ca3af]">{row.uploadLabel}</span>
                      <input type="file"
                        accept={row.kind === "image" ? "image/*" : row.kind === "video" ? "video/*" : row.kind === "audio" ? "audio/*" : "*"}
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(row.id, f); }}
                      />
                    </label>
                  )}
                  {isConn && (
                    <div className="text-[10px] px-2 py-1.5 rounded-lg border bg-[#f9fafb] text-[#9ca3af]" style={{ borderColor: `${row.color}44` }}>
                      ✓ Connected
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Settings */}
      <button onClick={() => setSettingsOpen((o) => !o)}
        className="flex items-center gap-1.5 w-full px-3 py-1.5 text-[10px] text-[#9ca3af] hover:text-[#374151] border-t border-[#f3f4f6] transition-colors">
        {settingsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        Settings
      </button>
      {settingsOpen && (
        <div className="px-3 pb-2.5">
          <label className="block text-[10px] text-[#6b7280] mb-1">Model</label>
          <select value={String(data.model ?? "gemini-2.5-flash")} onChange={(e) => setModel(e.target.value)}
            className="nodrag w-full bg-[#f9fafb] text-[#111827] text-xs px-2 py-1 rounded-lg border border-[#e5e7eb] outline-none focus:border-[#7c3aed]">
            <option value="gemini-2.5-flash">Gemini 1.5 Flash (free tier)</option>
            <option value="gemini-2.5-flash">Gemini 2.0 Flash</option>
            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
            <option value="gemini-2.5-pro">Gemini 2.5 Pro (paid only)</option>
          </select>
        </div>
      )}

      {/* Response output */}
      <div className="border-t border-[#f3f4f6] px-3 py-2.5">
        <p className="text-[10px] text-[#6b7280] font-medium mb-1">Response</p>
        {data.output ? (
          <div className="bg-[#f9fafb] text-[#111827] text-xs px-2 py-1.5 rounded-lg border border-[#e5e7eb] max-h-24 overflow-y-auto whitespace-pre-wrap leading-relaxed">
            {String(data.output)}
          </div>
        ) : (
          <div className="bg-[#f9fafb] border border-dashed border-[#e5e7eb] rounded-lg py-3 text-center text-[10px] text-[#9ca3af]">
            No output yet
          </div>
        )}
      </div>

      {/* Cost */}
      <div className="flex justify-end px-3 pb-2">
        <span className="text-[9px] text-[#9ca3af]">≈ -0.000M</span>
      </div>
    </div>
  );
});
