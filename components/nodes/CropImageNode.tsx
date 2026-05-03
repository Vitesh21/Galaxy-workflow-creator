"use client";

import { memo, useState } from "react";
import { Handle, Position, type NodeProps, useReactFlow } from "@xyflow/react";
import { RotateCcw, Play, MoreHorizontal, Plus, Upload, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/components/canvas/CanvasContext";
import type { NodeData } from "@/types/workflow";

interface Props extends NodeProps { data: NodeData }

const HANDLE_COLOR = { image: "#f59e0b", text: "#3b82f6" };

const PARAMS = [
  { key: "x" as const, label: "X Position (%)", default: 0  },
  { key: "y" as const, label: "Y Position (%)", default: 0  },
  { key: "w" as const, label: "Width (%)",       default: 100 },
  { key: "h" as const, label: "Height (%)",      default: 100 },
];

// Header 40 + inputRow 54 + 4 param rows * 46 + padding
const HEADER_H = 40;
const INPUT_ROW_H = 50;
const PARAM_ROW_H = 48;
const PAD_TOP = 10;

export const CropImageNode = memo(function CropImageNode({ id, data, selected }: Props) {
  const { setNodes, deleteElements } = useReactFlow();
  const { runNode } = useCanvas();
  const [menuOpen, setMenuOpen] = useState(false);
  const [inputImageUrl, setInputImageUrl] = useState<string>("");

  function upd(key: "x" | "y" | "w" | "h", val: number) {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, [key]: val } } : n));
  }

  function resetParam(key: "x" | "y" | "w" | "h") {
    const defaults = { x: 0, y: 0, w: 100, h: 100 };
    upd(key, defaults[key]);
  }

  function handleDelete() {
    deleteElements({ nodes: [{ id }] });
    setMenuOpen(false);
  }

  function handleImageUpload(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => setInputImageUrl(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  // Handle positions
  const inputHandleTop = HEADER_H + PAD_TOP + INPUT_ROW_H / 2 - 6;
  const outputHandleTop = HEADER_H + PAD_TOP + INPUT_ROW_H + PARAMS.length * PARAM_ROW_H + 30;

  const val = (key: "x"|"y"|"w"|"h") => (data[key] as number) ?? (key === "w" || key === "h" ? 100 : 0);

  return (
    <div className={cn(
      "bg-white rounded-xl border border-[#e5e7eb] shadow-sm w-[300px]",
      selected && "ring-2 ring-[#7c3aed]",
      data.status === "running" && "node-running",
    )}>
      {/* Input handle */}
      <Handle type="target" position={Position.Left} id="input-image"
        style={{ top: inputHandleTop, left: -7, width: 13, height: 13, background: HANDLE_COLOR.image, border: "2.5px solid #fff", borderRadius: "50%" }} />
      {/* Output handle */}
      <Handle type="source" position={Position.Right} id="output-image"
        style={{ top: outputHandleTop, right: -7, width: 13, height: 13, background: HANDLE_COLOR.image, border: "2.5px solid #fff", borderRadius: "50%" }} />

      {/* Header */}
      <div className="flex items-center justify-between px-3 bg-[#f9fafb] border-b border-[#f3f4f6] rounded-t-xl" style={{ height: HEADER_H }}>
        <span className="text-xs font-semibold text-[#111827]">Crop Image</span>
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
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#e5e7eb] text-[#9ca3af] transition-colors"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-[#e5e7eb] rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-3 py-2.5 space-y-1">
        {/* Input Image row */}
        <div className="relative" style={{ height: INPUT_ROW_H }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] text-[#374151] font-medium">Input Image<span className="text-red-500">*</span></span>
          </div>
          {inputImageUrl ? (
            <img src={inputImageUrl} alt="input" className="w-full h-8 object-cover rounded-md border border-[#e5e7eb]" />
          ) : (
            <label className="flex items-center gap-2 w-full bg-[#f9fafb] border border-dashed border-[#e5e7eb] rounded-lg px-2 py-1.5 cursor-pointer hover:border-[#f59e0b] hover:bg-amber-50 transition-colors group/up">
              <Upload className="w-3 h-3 text-[#9ca3af] group-hover/up:text-[#f59e0b]" />
              <span className="text-[10px] text-[#9ca3af] group-hover/up:text-[#f59e0b]">Upload Image</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
            </label>
          )}
        </div>

        {/* Param rows with sliders */}
        {PARAMS.map(({ key, label, default: def }) => (
          <div key={key} className="relative flex items-center gap-2" style={{ height: PARAM_ROW_H - 6 }}>
            {/* Handle dot */}
            <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[9px] text-[#6b7280]">{label}</span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-medium text-[#374151] w-7 text-right tabular-nums">{val(key)}</span>
                  <button onClick={() => resetParam(key)} className="text-[#9ca3af] hover:text-[#374151] transition-colors">
                    <RotateCcw className="w-2.5 h-2.5" />
                  </button>
                  <button className="text-[#9ca3af] hover:text-[#374151] transition-colors">
                    <Plus className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
              <div className="relative h-1.5">
                <div className="absolute inset-0 bg-[#e5e7eb] rounded-full" />
                <div
                  className="absolute top-0 left-0 h-full bg-[#7c3aed] rounded-full"
                  style={{ width: `${val(key)}%` }}
                />
                <input
                  type="range"
                  min={key === "w" || key === "h" ? 1 : 0}
                  max={100}
                  value={val(key)}
                  onChange={(e) => upd(key, Number(e.target.value))}
                  className="nodrag absolute inset-0 w-full opacity-0 cursor-pointer h-1.5"
                />
              </div>
            </div>
          </div>
        ))}

        {/* Output Image */}
        <div className="pt-1 border-t border-[#f3f4f6]">
          <p className="text-[10px] text-[#6b7280] font-medium mb-1">Output Image</p>
          {data.output ? (
            <img src={String(data.output)} alt="output" className="w-full h-20 object-cover rounded-lg border border-[#e5e7eb]" />
          ) : (
            <div className="bg-[#f9fafb] border border-dashed border-[#e5e7eb] rounded-lg py-3 text-center text-[10px] text-[#9ca3af]">
              No output yet
            </div>
          )}
        </div>
      </div>

      {/* Cost */}
      <div className="flex justify-end px-3 pb-2">
        <span className="text-[9px] text-[#9ca3af]">≈ -0.000M</span>
      </div>
    </div>
  );
});
