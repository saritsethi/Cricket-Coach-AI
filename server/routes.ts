import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getRAGContext, getSystemPrompt, enforceFollowUp, enforceCitations, enforceReferences } from "./rag";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import OpenAI from "openai";
import { z } from "zod";
import type { AppMode } from "@shared/schema";

const createConversationSchema = z.object({
  title: z.string().min(1).max(200),
  mode: z.enum(["captain", "skills", "equipment"]),
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(10000),
  mode: z.enum(["captain", "skills", "equipment"]),
  imageUrl: z.string().optional(),
});

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/conversations", async (req, res) => {
    try {
      const conversations = await storage.getConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await storage.getConversation(id);
      if (!conversation) return res.status(404).json({ error: "Not found" });
      const messages = await storage.getMessages(id);
      res.json({ ...conversation, messages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.post("/api/conversations", async (req, res) => {
    try {
      const parsed = createConversationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      }
      const conversation = await storage.createConversation(parsed.data);
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.delete("/api/conversations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteConversation(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  app.post("/api/chat/:conversationId/messages", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.conversationId);
      const parsed = sendMessageSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      }
      const { content, mode, imageUrl } = parsed.data;

      await storage.createMessage({ conversationId, role: "user", content, imageUrl: imageUrl || null });

      const existingMessages = await storage.getMessages(conversationId);

      const userMessages = existingMessages.filter(m => m.role === "user");
      const allUserContent = userMessages.map(m => m.content).join(" ");
      const ragContext = await getRAGContext(mode, allUserContent);

      const hasImage = existingMessages.some(m => m.imageUrl);
      const exchangeCount = Math.floor(existingMessages.filter(m => m.role === "user").length);
      const systemPrompt = getSystemPrompt(mode, exchangeCount, hasImage);

      type ChatMessage = { role: "system" | "user" | "assistant"; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> };
      const chatHistory: ChatMessage[] = [
        {
          role: "system",
          content: systemPrompt + (ragContext ? `\n\nHere is relevant data from the cricket database that may help answer this query:\n\n${ragContext}` : ""),
        },
      ];

      const recentMessages = existingMessages.slice(-10);
      recentMessages.forEach(m => {
        if (m.imageUrl && m.role === "user") {
          const imageAbsoluteUrl = `${req.protocol}://${req.get("host")}${m.imageUrl}`;
          chatHistory.push({
            role: "user",
            content: [
              { type: "text", text: m.content },
              { type: "image_url", image_url: { url: imageAbsoluteUrl } },
            ],
          });
        } else {
          chatHistory.push({
            role: m.role as "user" | "assistant",
            content: m.content,
          });
        }
      });

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const useVisionModel = hasImage;
      const stream = await openai.chat.completions.create({
        model: useVisionModel ? "gpt-4o" : "gpt-5-mini",
        messages: chatHistory as any,
        stream: true,
        max_completion_tokens: 4096,
      });

      let fullResponse = "";

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || "";
        if (delta) {
          fullResponse += delta;
          res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
        }
      }

      let enforcedResponse = enforceFollowUp(fullResponse, mode as AppMode, exchangeCount);
      enforcedResponse = enforceCitations(enforcedResponse, mode as AppMode, ragContext);
      enforcedResponse = enforceReferences(enforcedResponse, mode as AppMode, ragContext);

      if (enforcedResponse !== fullResponse) {
        const extra = enforcedResponse.slice(fullResponse.length);
        if (extra) {
          res.write(`data: ${JSON.stringify({ content: extra })}\n\n`);
        }
      }

      await storage.createMessage({ conversationId, role: "assistant", content: enforcedResponse });

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error in chat:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to generate response" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  });

  registerObjectStorageRoutes(app);

  app.get("/api/matches", async (req, res) => {
    try {
      const matches = await storage.getMatches();
      res.json(matches);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch matches" });
    }
  });

  app.get("/api/players", async (req, res) => {
    try {
      const players = await storage.getPlayers();
      res.json(players);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch players" });
    }
  });

  app.get("/api/equipment", async (req, res) => {
    try {
      const equip = await storage.getEquipment();
      res.json(equip);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch equipment" });
    }
  });

  return httpServer;
}
