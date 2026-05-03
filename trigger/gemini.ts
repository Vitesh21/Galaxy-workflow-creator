import { task, logger } from "@trigger.dev/sdk/v3";
import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { z } from "zod";

const GeminiInput = z.object({
  prompt: z.string(),
  systemPrompt: z.string().optional(),
  imageUrls: z.array(z.string()).optional(),
  model: z.string().default("gemini-2.5-pro"),
  nodeRunId: z.string(),
});

export const geminiTask = task({
  id: "gemini-llm",
  maxDuration: 300,
  run: async (payload: z.infer<typeof GeminiInput>) => {
    logger.log("Starting Gemini task", { nodeRunId: payload.nodeRunId, model: payload.model });

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: payload.model,
      systemInstruction: payload.systemPrompt,
    });

    const parts: Part[] = [];

    // Add images if provided (Vision)
    if (payload.imageUrls && payload.imageUrls.length > 0) {
      for (const url of payload.imageUrls) {
        try {
          const res = await fetch(url);
          const buf = await res.arrayBuffer();
          const b64 = Buffer.from(buf).toString("base64");
          const mime = res.headers.get("content-type") ?? "image/jpeg";
          parts.push({ inlineData: { data: b64, mimeType: mime } });
        } catch (err) {
          logger.warn("Failed to fetch image for vision", { url, err });
        }
      }
    }

    parts.push({ text: payload.prompt });

    const result = await model.generateContent({ contents: [{ role: "user", parts }] });
    const text = result.response.text();

    logger.log("Gemini task complete", { responseLength: text.length });
    return { response: text };
  },
});
