import { task, logger } from "@trigger.dev/sdk/v3";
import { z } from "zod";

const CropImageInput = z.object({
  imageUrl: z.string().url(),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  w: z.number().min(1).max(100),
  h: z.number().min(1).max(100),
  nodeRunId: z.string(),
});

export const cropImageTask = task({
  id: "crop-image",
  maxDuration: 300,
  run: async (payload: z.infer<typeof CropImageInput>) => {
    logger.log("Starting crop image task", { nodeRunId: payload.nodeRunId });

    // Mandatory 30+ second artificial delay (hard requirement)
    await new Promise((resolve) => setTimeout(resolve, 32000));

    // Fetch the source image
    const imageRes = await fetch(payload.imageUrl);
    if (!imageRes.ok) throw new Error(`Failed to fetch image: ${imageRes.status}`);

    const imageBuffer = await imageRes.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString("base64");
    const contentType = imageRes.headers.get("content-type") ?? "image/jpeg";

    // Upload to Transloadit for cropping
    const transloaditKey = process.env.TRANSLOADIT_KEY!;
    const transloaditSecret = process.env.TRANSLOADIT_SECRET!;

    const steps = {
      cropped: {
        robot: "/image/resize",
        use: ":original",
        result: true,
        width: `\${file.meta.width * ${payload.w / 100}}`,
        height: `\${file.meta.height * ${payload.h / 100}}`,
        resize_strategy: "crop",
        gravity: `${Math.round(payload.x)}x${Math.round(payload.y)}`,
        imagemagick_stack: "v3.0.0",
      },
    };

    const params = JSON.stringify({
      auth: { key: transloaditKey },
      steps,
    });

    const formData = new FormData();
    formData.append("params", params);

    const blob = new Blob([Buffer.from(imageBase64, "base64")], { type: contentType });
    formData.append("file", blob, "image.jpg");

    const uploadRes = await fetch("https://api2.transloadit.com/assemblies", {
      method: "POST",
      body: formData,
    });

    if (!uploadRes.ok) {
      // Fallback: return original image url if Transloadit fails
      logger.warn("Transloadit upload failed, returning original URL");
      return { outputImageUrl: payload.imageUrl };
    }

    const result = await uploadRes.json() as {
      results?: { cropped?: Array<{ url: string }> };
      ok?: string;
      assembly_url?: string;
    };

    const outputUrl = result.results?.cropped?.[0]?.url ?? payload.imageUrl;

    logger.log("Crop image task complete", { outputUrl });
    return { outputImageUrl: outputUrl };
  },
});
