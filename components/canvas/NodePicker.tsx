"use client";

import { useState } from "react";
import { Scissors, Sparkles, Plus, X, Search, ImageIcon, Video, Music, MoreHorizontal, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface NodePickerProps {
  open: boolean;
  onToggle: () => void;
  onAdd: (type: string) => void;
}

const CATEGORIES = [
  {
    id: "recent",
    label: "Recent",
    icon: Clock,
    nodes: [
      { type: "cropImage", label: "Crop Image",     icon: Scissors, description: "Crop by percentage", functional: true },
      { type: "gemini",    label: "Gemini 3.1 Pro", icon: Sparkles, description: "LLM with vision",   functional: true },
    ],
  },
  {
    id: "image",
    label: "Image",
    icon: ImageIcon,
    nodes: [
      { type: "cropImage", label: "Crop Image", icon: Scissors, description: "Crop by percentage", functional: true },
    ],
  },
  {
    id: "llm",
    label: "LLM",
    icon: Sparkles,
    nodes: [
      { type: "gemini", label: "Gemini 3.1 Pro", icon: Sparkles, description: "Google Gemini with vision", functional: true },
    ],
  },
  {
    id: "video",
    label: "Video",
    icon: Video,
    nodes: [],
  },
  {
    id: "audio",
    label: "Audio",
    icon: Music,
    nodes: [],
  },
  {
    id: "others",
    label: "Others",
    icon: MoreHorizontal,
    nodes: [],
  },
];

export function NodePicker({ open, onToggle, onAdd }: NodePickerProps) {
  const [activeTab, setActiveTab] = useState("recent");
  const [search, setSearch] = useState("");

  const activeCat = CATEGORIES.find((c) => c.id === activeTab)!;
  const filtered = activeCat.nodes.filter((n) =>
    n.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col items-center gap-2 mb-2">
      {open && (
        <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-2xl w-80 mb-2 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#f3f4f6]">
            <span className="text-xs font-semibold text-[#111827]">Add Node</span>
            <button onClick={onToggle} className="text-[#9ca3af] hover:text-[#374151] transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Search */}
          <div className="px-3 pt-3 pb-2">
            <div className="flex items-center gap-2 bg-[#f9fafb] border border-[#e5e7eb] rounded-lg px-2.5 py-1.5">
              <Search className="w-3 h-3 text-[#9ca3af] shrink-0" />
              <input
                type="text"
                placeholder="Search nodes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-xs text-[#111827] outline-none placeholder:text-[#9ca3af]"
              />
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex gap-1 px-3 pb-2 overflow-x-auto">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap transition-colors",
                  activeTab === cat.id
                    ? "bg-[#ede9fe] text-[#7c3aed]"
                    : "text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#374151]"
                )}
              >
                <cat.icon className="w-3 h-3" />
                {cat.label}
              </button>
            ))}
          </div>

          {/* Nodes */}
          <div className="px-3 pb-3 min-h-[80px]">
            {filtered.length === 0 ? (
              <div className="text-center text-xs text-[#9ca3af] py-6">
                {activeCat.nodes.length === 0 ? "Coming soon" : "No results"}
              </div>
            ) : (
              filtered.map((node) => (
                <button
                  key={node.type}
                  onClick={() => { onAdd(node.type); onToggle(); }}
                  className="flex items-center gap-3 w-full px-2 py-2.5 rounded-xl hover:bg-[#f3f4f6] transition-colors text-left group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#ede9fe] flex items-center justify-center shrink-0 group-hover:bg-[#ddd6fe] transition-colors">
                    <node.icon className="w-4 h-4 text-[#7c3aed]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-[#111827]">{node.label}</div>
                    <div className="text-[10px] text-[#9ca3af]">{node.description}</div>
                  </div>
                  {node.functional && (
                    <span className="text-[9px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full font-medium shrink-0">Live</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* + trigger button */}
      <button
        onClick={onToggle}
        className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all duration-200",
          open
            ? "bg-[#374151] text-white rotate-45"
            : "bg-[#7c3aed] hover:bg-[#6d28d9] text-white hover:shadow-lg hover:scale-105"
        )}
        title="Add node"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
