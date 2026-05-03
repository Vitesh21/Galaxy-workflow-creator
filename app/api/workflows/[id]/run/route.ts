import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildDependencyMap, resolveNodeInputs, hasCycle } from "@/lib/execution";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import type { WorkflowNode, WorkflowEdge } from "@/types/workflow";

const RunSchema = z.object({
  scope: z.enum(["full", "partial", "single"]).default("full"),
  nodeIds: z.array(z.string()).optional(),
  // Latest node state sent from the canvas so we don't rely on stale DB data
  nodes: z.array(z.unknown()).optional(),
  edges: z.array(z.unknown()).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as unknown;
  const parsed = RunSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const workflow = await prisma.workflow.findFirst({ where: { id, userId } });
  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Nodes: use live canvas state (has latest fieldValues/manualInputs)
  // Edges: always use DB version — React Flow's getEdges() can null out sourceHandle/targetHandle
  //        for handles it can't find in the DOM, breaking image routing
  const nodes = (parsed.data.nodes as WorkflowNode[] | undefined) ?? (workflow.nodes as unknown as WorkflowNode[]);
  const edges = workflow.edges as unknown as WorkflowEdge[];

  if (hasCycle(nodes, edges)) {
    return NextResponse.json({ error: "Workflow contains a cycle" }, { status: 400 });
  }

  let targetNodes = nodes;
  if (parsed.data.scope !== "full" && parsed.data.nodeIds?.length) {
    const ids = new Set(parsed.data.nodeIds);
    targetNodes = nodes.filter((n) => ids.has(n.id));
  }

  const run = await prisma.workflowRun.create({
    data: { workflowId: id, scope: parsed.data.scope, status: "running" },
  });

  await prisma.workflow.update({ where: { id }, data: { status: "running" } });

  // Fire-and-forget DAG execution
  void executeDAG(run.id, id, targetNodes, edges);

  return NextResponse.json({ runId: run.id });
}

// ─── DAG orchestrator ────────────────────────────────────────────────────────
async function executeDAG(runId: string, workflowId: string, nodes: WorkflowNode[], edges: WorkflowEdge[]) {
  const nodeOutputs = new Map<string, Record<string, unknown>>();
  const nodeRunIds  = new Map<string, string>();
  const completed   = new Set<string>();
  const failed      = new Set<string>();
  const deps        = buildDependencyMap(nodes, edges);

  for (const node of nodes) {
    const nr = await prisma.nodeRun.create({
      data: { workflowRunId: runId, nodeId: node.id, nodeType: node.data.type, status: "running" },
    });
    nodeRunIds.set(node.id, nr.id);
  }

  const pending  = new Set(nodes.map((n) => n.id));
  const inFlight = new Set<string>();

  async function tryDispatch() {
    for (const nodeId of [...pending]) {
      if (inFlight.has(nodeId)) continue;
      const nodeDeps = deps.get(nodeId) ?? [];
      if (!nodeDeps.every((d) => completed.has(d) || failed.has(d))) continue;

      pending.delete(nodeId);
      inFlight.add(nodeId);

      const node      = nodes.find((n) => n.id === nodeId)!;
      const nodeRunId = nodeRunIds.get(nodeId)!;
      const inputs    = resolveNodeInputs(node, edges, nodeOutputs);
      const t0        = Date.now();

      executeNode(node, inputs).then(async (output) => {
        nodeOutputs.set(nodeId, output);
        completed.add(nodeId);
        inFlight.delete(nodeId);
        await prisma.nodeRun.update({
          where: { id: nodeRunId },
          data: { status: "success", output: output as never, inputs: inputs as never, completedAt: new Date(), executionTime: Date.now() - t0 },
        });
        await tryDispatch();
      }).catch(async (err: unknown) => {
        failed.add(nodeId);
        inFlight.delete(nodeId);
        await prisma.nodeRun.update({
          where: { id: nodeRunId },
          data: { status: "failed", inputs: inputs as never, completedAt: new Date(), executionTime: Date.now() - t0, error: err instanceof Error ? err.message : String(err) },
        });
        await tryDispatch();
      });
    }

    if (pending.size === 0 && inFlight.size === 0) {
      const status      = failed.size === 0 ? "success" : completed.size > 0 ? "partial" : "failed";
      const completedAt = new Date();
      const runRec      = await prisma.workflowRun.findUnique({ where: { id: runId } });
      const duration    = runRec ? completedAt.getTime() - new Date(runRec.startedAt).getTime() : 0;
      await prisma.workflowRun.update({ where: { id: runId }, data: { status, completedAt, duration } });
      await prisma.workflow.update({ where: { id: workflowId }, data: { status: "idle" } });
    }
  }

  await tryDispatch();
}

// ─── Node executors ───────────────────────────────────────────────────────────
async function executeNode(node: WorkflowNode, inputs: Record<string, unknown>): Promise<Record<string, unknown>> {
  switch (node.data.type) {

    // ── Request-Inputs: return the field values the user typed/uploaded ──────
    case "request-inputs": {
      const fieldValues = (node.data.fieldValues as Record<string, string>) ?? {};
      // Merge with any manual overrides passed via edges (none for this node, but safe)
      return { ...fieldValues, ...inputs };
    }

    // ── Crop Image: sharp-based percentage crop + mandatory 30s delay ────────
    case "crop-image": {
      const imageInput = inputs["input-image"] as string | undefined;
      if (!imageInput) throw new Error("No input image — upload an image in Request-Inputs first");

      // Mandatory 30+ second artificial delay (hard requirement from spec)
      await new Promise((r) => setTimeout(r, 32_000));

      // Decode base64 data URL or fetch remote URL
      let imageBuffer: Buffer;
      if (imageInput.startsWith("data:")) {
        const base64 = imageInput.split(",")[1];
        imageBuffer = Buffer.from(base64!, "base64");
      } else {
        const res = await fetch(imageInput);
        imageBuffer = Buffer.from(await res.arrayBuffer());
      }

      // Dynamic import of sharp (avoids edge-runtime issues)
      const sharp = (await import("sharp")).default;
      const meta  = await sharp(imageBuffer).metadata();
      const fullW = meta.width  ?? 800;
      const fullH = meta.height ?? 600;

      const x = Math.round(((node.data.x as number) ?? 0)   / 100 * fullW);
      const y = Math.round(((node.data.y as number) ?? 0)   / 100 * fullH);
      const w = Math.round(((node.data.w as number) ?? 100) / 100 * fullW);
      const h = Math.round(((node.data.h as number) ?? 100) / 100 * fullH);

      const cropped  = await sharp(imageBuffer).extract({ left: x, top: y, width: Math.max(1, w), height: Math.max(1, h) }).jpeg().toBuffer();
      const dataUrl  = `data:image/jpeg;base64,${cropped.toString("base64")}`;

      return { "output-image": dataUrl };
    }

    // ── Gemini: uses new @google/genai SDK (v1 API) with retry + fallback ─────
    case "gemini": {
      const prompt = (inputs["prompt"] as string) || ((node.data.manualInputs as Record<string, string> | undefined)?.["prompt"]);
      if (!prompt?.trim()) throw new Error("No prompt — type text in Request-Inputs or connect a Prompt handle");

      const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY! });

      // Build multimodal content parts
      const contents: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
      for (let i = 0; i < 5; i++) {
        const img = inputs[`image-vision-${i}`] as string | undefined;
        if (!img) continue;
        if (img.startsWith("data:")) {
          const mimeType = img.split(";")[0].split(":")[1] as string;
          const data     = img.split(",")[1] as string;
          contents.push({ inlineData: { mimeType, data } });
        } else {
          const res      = await fetch(img);
          const buf      = await res.arrayBuffer();
          const mimeType = res.headers.get("content-type") ?? "image/jpeg";
          contents.push({ inlineData: { mimeType, data: Buffer.from(buf).toString("base64") } });
        }
      }
      contents.push({ text: prompt });

      const systemInstruction = (node.data.systemPrompt as string) || undefined;

      // Try preferred model first, then fallbacks, with retry on 429
      const modelFallbacks = [
        (node.data.model as string) ?? "gemini-2.5-flash",
        "gemini-1.5-flash-8b",
        "gemini-1.5-flash",
        "gemini-1.0-pro",
      ];

      let lastError: Error = new Error("All Gemini models failed");

      for (const modelName of modelFallbacks) {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const response = await ai.models.generateContent({
              model: modelName,
              contents: [{ role: "user", parts: contents }],
              config: { systemInstruction },
            });
            return { response: response.text ?? "" };
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            const is429 = msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED");
            const isNotFound = msg.includes("404") || msg.includes("not found");

            if (isNotFound) break; // this model doesn't exist — try next fallback
            if (is429 && attempt < 2) {
              // Extract retryDelay from error or default to 5s
              const delayMatch = msg.match(/retryDelay["\s:]+(\d+)/);
              const waitMs = delayMatch ? parseInt(delayMatch[1]) * 1000 : 5000;
              await new Promise((r) => setTimeout(r, Math.min(waitMs, 10000)));
              continue; // retry same model
            }
            lastError = err instanceof Error ? err : new Error(msg);
            if (is429) break; // quota exhausted for this model — try next fallback
            throw err; // non-quota error — surface immediately
          }
        }
      }

      throw new Error(
        `Gemini quota exhausted on all models. ` +
        `Go to aistudio.google.com → Get API key → Create API key in a NEW project, ` +
        `then update GOOGLE_GENERATIVE_AI_API_KEY in .env and restart. Original: ${lastError.message}`
      );
    }

    // ── Response: collect final result ───────────────────────────────────────
    case "response": {
      return { result: inputs["result"] ?? "" };
    }

    default:
      return {};
  }
}
