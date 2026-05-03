"use client";

import { memo, useRef } from "react";
import { Handle, Position, type NodeProps, useReactFlow } from "@xyflow/react";
import { Plus, Type, ImageIcon, Copy, Trash2, GripVertical, Info, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NodeData, FieldDef } from "@/types/workflow";
import { nanoid } from "nanoid";

interface Props extends NodeProps { data: NodeData & { fields: FieldDef[] } }

const HEADER_H  = 40;
const FIELD_H   = 82;  // label-row(28) + input(44) + gap(10)
const PAD_TOP   = 8;

export const RequestInputsNode = memo(function RequestInputsNode({ id, data, selected }: Props) {
  const { setNodes } = useReactFlow();
  const fields: FieldDef[] = (data.fields as FieldDef[]) ?? [];

  function addField(kind: "text_field" | "image_field") {
    const f: FieldDef = { id: nanoid(6), label: kind, kind };
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, fields: [...fields, f] } } : n));
  }

  function removeField(fid: string) {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, fields: fields.filter((f) => f.id !== fid) } } : n));
  }

  function setFieldValue(fid: string, value: string) {
    setNodes((nds) => nds.map((n) =>
      n.id === id ? { ...n, data: { ...n.data, fieldValues: { ...(n.data.fieldValues as Record<string,string> ?? {}), [fid]: value } } } : n
    ));
  }

  function handleImageUpload(fid: string, file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setNodes((nds) => nds.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, fieldValues: { ...(n.data.fieldValues as Record<string,string> ?? {}), [fid]: dataUrl } } } : n
      ));
    };
    reader.readAsDataURL(file);
  }

  const fieldValues = (data.fieldValues as Record<string,string>) ?? {};

  return (
    <div className={cn(
      "bg-white rounded-xl border border-[#e5e7eb] shadow-sm w-[260px]",
      selected && "ring-2 ring-[#7c3aed]",
      data.status === "running" && "node-running",
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 bg-[#f9fafb] border-b border-[#f3f4f6] rounded-t-xl" style={{ height: HEADER_H }}>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-[#111827]">Request-Inputs</span>
          <Info className="w-3 h-3 text-[#9ca3af]" />
        </div>
        <button
          onClick={() => addField("text_field")}
          className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[#e5e7eb] text-[#6b7280] transition-colors"
          title="Add field"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Fields */}
      <div className="px-3 py-2 space-y-2">
        {fields.map((field, i) => {
          const handleTop = HEADER_H + PAD_TOP + i * FIELD_H + FIELD_H / 2 - 6;
          const imgUrl = fieldValues[field.id];

          return (
            <div key={field.id} className="group/f">
              {/* Source handle */}
              <Handle
                type="source"
                position={Position.Right}
                id={field.id}
                style={{
                  top: handleTop,
                  right: -7,
                  width: 13, height: 13,
                  background: field.kind === "image_field" ? "#f59e0b" : "#3b82f6",
                  border: "2.5px solid #fff",
                  borderRadius: "50%",
                }}
              />

              {/* Field header row */}
              <div className="flex items-center gap-1 mb-1">
                <GripVertical className="w-3 h-3 text-[#d1d5db] shrink-0" />
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  {field.kind === "text_field"
                    ? <Type className="w-3 h-3 text-[#6b7280] shrink-0" />
                    : <ImageIcon className="w-3 h-3 text-[#6b7280] shrink-0" />}
                  {/* Inline-editable field label */}
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => {
                      const updated = fields.map((f) => f.id === field.id ? { ...f, label: e.target.value } : f);
                      setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, fields: updated } } : n));
                    }}
                    className="nodrag text-[10px] text-[#374151] font-medium bg-transparent border-none outline-none w-full min-w-0 hover:bg-[#f3f4f6] focus:bg-[#f3f4f6] rounded px-0.5 transition-colors"
                  />
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover/f:opacity-100 transition-opacity">
                  <button
                    onClick={() => navigator.clipboard.writeText(field.id)}
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#f3f4f6] text-[#9ca3af] hover:text-[#374151]"
                    title="Copy field ID"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => removeField(field.id)}
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-50 text-[#9ca3af] hover:text-red-500"
                    title="Remove field"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Field input */}
              {field.kind === "text_field" ? (
                <textarea
                  className="nodrag w-full bg-[#f9fafb] text-[#111827] text-xs px-2 py-1.5 rounded-lg border border-[#e5e7eb] outline-none resize-none focus:border-[#7c3aed] focus:bg-white transition-colors leading-relaxed"
                  rows={2}
                  placeholder="Enter text…"
                  value={fieldValues[field.id] ?? ""}
                  onChange={(e) => setFieldValue(field.id, e.target.value)}
                />
              ) : (
                <div className="space-y-1">
                  <label className="flex items-center gap-2 w-full bg-[#f9fafb] border border-[#e5e7eb] border-dashed rounded-lg px-2 py-2 cursor-pointer hover:border-[#7c3aed] hover:bg-[#faf5ff] transition-colors group/up">
                    <Upload className="w-3.5 h-3.5 text-[#9ca3af] group-hover/up:text-[#7c3aed] transition-colors" />
                    <span className="text-xs text-[#9ca3af] group-hover/up:text-[#7c3aed] transition-colors">
                      {imgUrl ? "Replace image" : "Upload image"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(field.id, file);
                      }}
                    />
                  </label>
                  {imgUrl && (
                    <img src={imgUrl} alt="uploaded" className="w-full h-20 object-cover rounded-lg border border-[#e5e7eb]" />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add field buttons */}
      <div className="flex items-center gap-3 px-3 py-2 border-t border-[#f3f4f6]">
        <button onClick={() => addField("text_field")} className="flex items-center gap-1 text-[10px] text-[#7c3aed] hover:text-[#6d28d9] font-medium transition-colors">
          <Plus className="w-3 h-3" /> text
        </button>
        <button onClick={() => addField("image_field")} className="flex items-center gap-1 text-[10px] text-[#7c3aed] hover:text-[#6d28d9] font-medium transition-colors">
          <Plus className="w-3 h-3" /> image
        </button>
      </div>
    </div>
  );
});
