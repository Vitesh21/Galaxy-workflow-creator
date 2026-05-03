import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { WorkflowCanvas } from "@/components/canvas/WorkflowCanvas";
import type { WorkflowNode, WorkflowEdge, WorkflowRun } from "@/types/workflow";

export default async function CanvasPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;
  const workflow = await prisma.workflow.findFirst({
    where: { id, userId },
    include: {
      runs: {
        orderBy: { startedAt: "desc" },
        take: 20,
        include: { nodeRuns: true },
      },
    },
  });

  if (!workflow) redirect("/dashboard");

  return (
    <WorkflowCanvas
      workflowId={workflow.id}
      initialName={workflow.name}
      initialNodes={workflow.nodes as unknown as WorkflowNode[]}
      initialEdges={workflow.edges as unknown as WorkflowEdge[]}
      initialRuns={workflow.runs as unknown as WorkflowRun[]}
    />
  );
}
