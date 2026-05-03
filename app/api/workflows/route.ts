import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SAMPLE_NODES, SAMPLE_EDGES } from "@/lib/sampleWorkflow";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workflows = await prisma.workflow.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(workflows);
}

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workflow = await prisma.workflow.create({
    data: {
      userId,
      name: "Untitled Workflow",
      nodes: SAMPLE_NODES as unknown as never,
      edges: SAMPLE_EDGES as unknown as never,
    },
  });

  return NextResponse.json(workflow, { status: 201 });
}
