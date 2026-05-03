"use client";

import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { FileOutput, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NodeData } from "@/types/workflow";

interface Props extends NodeProps { data: NodeData }

export const ResponseNode = memo(function ResponseNode({ data, selected }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={cn(
      "bg-white rounded-xl border border-[#e5e7eb] shadow-sm w-[220px]",
      selected && "ring-2 ring-[#7c3aed]",
      data.status === "running" && "node-running",
    )}>
      {/* Input handle centered */}
      <Handle type="target" position={Position.Left} id="result"
        style={{ top: "50%", left: -7, width: 13, height: 13, background: "#f59e0b", border: "2.5px solid #fff", borderRadius: "50%" }} />

      {/* Header */}
      <div className="flex items-center justify-between px-3 bg-[#f9fafb] border-b border-[#f3f4f6] rounded-t-xl h-10">
        <div className="flex items-center gap-2">
          <FileOutput className="w-3.5 h-3.5 text-[#6b7280]" />
          <span className="text-xs font-semibold text-[#111827]">Response</span>
        </div>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#e5e7eb] text-[#9ca3af] transition-colors"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-[#e5e7eb] rounded-xl shadow-lg z-50 py-1">
              <button
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[#374151] hover:bg-[#f3f4f6] transition-colors"
              >
                Protected — cannot delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* result label */}
      <div className="px-3 py-2.5">
        <p className="text-[10px] text-[#6b7280] font-medium mb-1.5">result</p>
        {data.output ? (
          <div className="bg-[#f9fafb] text-[#111827] text-xs px-2 py-1.5 rounded-lg border border-[#e5e7eb] max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed">
            {String(data.output)}
          </div>
        ) : (
          <div className="bg-[#f9fafb] border border-dashed border-[#e5e7eb] rounded-lg py-4 text-center text-[10px] text-[#9ca3af]">
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
