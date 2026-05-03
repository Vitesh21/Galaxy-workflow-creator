"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Plus, MoreHorizontal, Pencil, Trash2, ExternalLink, Zap, GitBranch } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface WorkflowSummary {
  id: string;
  name: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export function DashboardClient({ workflows: initial }: { workflows: WorkflowSummary[] }) {
  const router = useRouter();
  const [workflows, setWorkflows] = useState(initial);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  async function createWorkflow() {
    const res = await fetch("/api/workflows", { method: "POST" });
    const data = await res.json() as { id: string };
    router.push(`/canvas/${data.id}`);
  }

  async function deleteWorkflow(id: string) {
    setWorkflows((prev) => prev.filter((w) => w.id !== id));
    await fetch(`/api/workflows/${id}`, { method: "DELETE" });
  }

  async function renameWorkflow(id: string, name: string) {
    if (!name.trim()) return;
    setWorkflows((prev) => prev.map((w) => w.id === id ? { ...w, name } : w));
    setRenamingId(null);
    await fetch(`/api/workflows/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  }

  return (
    <div className="flex h-screen bg-[#f5f5f5]">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-[#e5e7eb] flex flex-col shadow-sm">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-[#f3f4f6]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#7c3aed] flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm text-[#111827]">NextFlow</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 pt-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#ede9fe] text-[#7c3aed] text-xs font-medium">
            <GitBranch className="w-3.5 h-3.5" />
            Workflows
          </div>
        </nav>

        {/* User */}
        <div className="p-3 border-t border-[#f3f4f6] flex items-center gap-2">
          <UserButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#f5f5f5]">
        {/* Header */}
        <header className="h-14 bg-white border-b border-[#e5e7eb] flex items-center justify-between px-6">
          <h1 className="text-sm font-semibold text-[#111827]">My Workflows</h1>
          <button
            onClick={createWorkflow}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            New Workflow
          </button>
        </header>

        {/* Workflow list */}
        <div className="flex-1 overflow-y-auto p-6">
          {workflows.length === 0 ? (
            <EmptyState onCreate={createWorkflow} />
          ) : (
            <div className="space-y-2 max-w-3xl">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_120px_140px_40px] items-center px-4 py-1.5 text-[10px] font-medium text-[#9ca3af] uppercase tracking-wider">
                <span>Name</span>
                <span>Status</span>
                <span>Last edited</span>
                <span />
              </div>

              {workflows.map((wf) => (
                <div
                  key={wf.id}
                  className="group grid grid-cols-[1fr_120px_140px_40px] items-center px-4 py-3 bg-white border border-[#e5e7eb] rounded-xl hover:border-[#d1d5db] hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => router.push(`/canvas/${wf.id}`)}
                >
                  {/* Name */}
                  <div className="min-w-0">
                    {renamingId === wf.id ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => renameWorkflow(wf.id, renameValue)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") renameWorkflow(wf.id, renameValue);
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white text-[#111827] text-sm px-2 py-0.5 rounded-md border border-[#7c3aed] outline-none w-full shadow-sm"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-[#ede9fe] flex items-center justify-center shrink-0">
                          <GitBranch className="w-3 h-3 text-[#7c3aed]" />
                        </div>
                        <span className="text-sm font-medium text-[#111827] truncate">{wf.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <StatusBadge status={wf.status} />

                  {/* Last edited */}
                  <span className="text-xs text-[#9ca3af]">{formatDate(wf.updatedAt)}</span>

                  {/* Actions */}
                  <div className="relative flex justify-end" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setOpenMenu(openMenu === wf.id ? null : wf.id)}
                      className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-[#f3f4f6] text-[#9ca3af] hover:text-[#374151] transition-all"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {openMenu === wf.id && (
                      <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-[#e5e7eb] rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                        <button
                          onClick={() => { router.push(`/canvas/${wf.id}`); setOpenMenu(null); }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[#374151] hover:bg-[#f3f4f6] transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-[#9ca3af]" /> Open
                        </button>
                        <button
                          onClick={() => { setRenamingId(wf.id); setRenameValue(wf.name); setOpenMenu(null); }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[#374151] hover:bg-[#f3f4f6] transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5 text-[#9ca3af]" /> Rename
                        </button>
                        <div className="border-t border-[#f3f4f6] my-0.5" />
                        <button
                          onClick={() => { deleteWorkflow(wf.id); setOpenMenu(null); }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full w-fit",
      status === "running"
        ? "bg-amber-100 text-amber-700"
        : "bg-[#f3f4f6] text-[#6b7280]"
    )}>
      <span className={cn(
        "w-1.5 h-1.5 rounded-full",
        status === "running" ? "bg-amber-500 animate-pulse" : "bg-[#d1d5db]"
      )} />
      {status === "running" ? "Running" : "Idle"}
    </span>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-20">
      <div className="w-14 h-14 rounded-2xl bg-[#ede9fe] flex items-center justify-center">
        <GitBranch className="w-7 h-7 text-[#7c3aed]" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-[#111827] mb-1">No workflows yet</h2>
        <p className="text-sm text-[#6b7280]">Create your first LLM workflow to get started.</p>
      </div>
      <button
        onClick={onCreate}
        className="flex items-center gap-1.5 px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
      >
        <Plus className="w-4 h-4" />
        New Workflow
      </button>
    </div>
  );
}
