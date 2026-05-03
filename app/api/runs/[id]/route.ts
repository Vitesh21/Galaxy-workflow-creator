import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const run = await prisma.workflowRun.findUnique({
    where: { id },
    include: { nodeRuns: true },
  });

  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Verify ownership via workflow
  const workflow = await prisma.workflow.findFirst({
    where: { id: run.workflowId, userId },
  });
  if (!workflow) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  return NextResponse.json(run);
}
