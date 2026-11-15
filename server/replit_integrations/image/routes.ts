import type { Express, Request, Response } from "express";
import { openai } from "./client";

export function registerImageRoutes(app: Express): void {
  app.post("/api/generate-image", async (req: Request, res: Response) => {
    try {
      const { prompt, size = "1024x1024" } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const response = await openai.images.generate({
        model: "gemini-2.5-flash-image",
        prompt,
        n: 1,
        size: size as "1024x1024" | "512x512" | "256x256",
      });

      const imageData = response.data![0];
      res.json({
        url: imageData.url,
        b64_json: imageData.b64_json,
      });
    } catch (error) {
      console.error("Error generating image:", error);
      if ((error as any)?.status === 429) {
        return res.status(429).json({ error: "Image generation is temporarily unavailable: the Gemini free-tier quota for image generation is exceeded. Please try again later." });
      }
      res.status(500).json({ error: "Failed to generate image" });
    }
  });
}

