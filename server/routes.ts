import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getRAGContext, getSystemPrompt, enforceFollowUp, enforceCitations, enforceReferences } from "./rag";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import OpenAI from "openai";
import { z } from "zod";
import { randomBytes } from "crypto";
import type { AppMode, User } from "@shared/schema";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

const registerSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  email: z.string().email().max(200).trim().transform(v => v.toLowerCase()),
});

const loginSchema = z.object({
  email: z.string().email().max(200).trim().transform(v => v.toLowerCase()),
});

const createConversationSchema = z.object({
  title: z.string().min(1).max(200),
  mode: z.enum(["captain", "skills", "equipment"]),
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(10000),
  mode: z.enum(["captain", "skills", "equipment"]),
  imageUrl: z.string().optional(),
  imageUrls: z.array(z.string()).optional(),
});

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.session as string | undefined;
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const user = await storage.getUserBySessionToken(token);
  if (!user) {
    return res.status(401).json({ error: "Invalid session" });
  }
  req.user = user;
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Please provide a valid name and email address", details: parsed.error.errors });
      }
      const { name, email } = parsed.data;

      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ error: "An account with this email already exists. Please sign in instead." });
      }

      const user = await storage.createUser({ name, email });
      const token = generateSessionToken();
      await storage.updateUserSessionToken(user.id, token);

      res.cookie("session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      res.status(201).json({ id: user.id, name: user.name, email: user.email });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ error: "Failed to register" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Please provide a valid email address" });
      }
      const { email } = parsed.data;

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "No account found with this email. Please sign up first." });
      }

      const token = generateSessionToken();
      await storage.updateUserSessionToken(user.id, token);

      res.cookie("session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      res.json({ id: user.id, name: user.name, email: user.email });
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ error: "Failed to log in" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    const token = req.cookies?.session as string | undefined;
    if (token) {
      const user = await storage.getUserBySessionToken(token);
      if (user) {
        await storage.updateUserSessionToken(user.id, null);
      }
    }
    res.clearCookie("session", { path: "/" });
    res.json({ ok: true });
  });

  app.get("/api/auth/me", async (req, res) => {
    const token = req.cookies?.session as string | undefined;
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const user = await storage.getUserBySessionToken(token);
    if (!user) {
      return res.status(401).json({ error: "Invalid session" });
    }
    res.json({ id: user.id, name: user.name, email: user.email });
  });

  app.get("/api/conversations", authMiddleware, async (req, res) => {
    try {
      const conversations = await storage.getConversations(req.user!.id);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const conversation = await storage.getConversation(id);
      if (!conversation) return res.status(404).json({ error: "Not found" });
      if (conversation.userId !== req.user!.id) return res.status(403).json({ error: "Not authorized" });
      const messages = await storage.getMessages(id);
      res.json({ ...conversation, messages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.post("/api/conversations", authMiddleware, async (req, res) => {
    try {
      const parsed = createConversationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      }
      const conversation = await storage.createConversation({
        ...parsed.data,
        userId: req.user!.id,
      });
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.delete("/api/conversations/:id", authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const conversation = await storage.getConversation(id);
      if (conversation && conversation.userId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized" });
      }
      await storage.deleteConversation(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  app.post("/api/chat/:conversationId/messages", authMiddleware, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.conversationId as string);
      const conversation = await storage.getConversation(conversationId);
      if (!conversation || conversation.userId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const parsed = sendMessageSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      }
      const { content, mode, imageUrl, imageUrls } = parsed.data;

      const allImageUrls = imageUrls && imageUrls.length > 0 ? imageUrls : (imageUrl ? [imageUrl] : []);
      const primaryImageUrl = allImageUrls[0] || null;

      await storage.createMessage({ conversationId, role: "user", content, imageUrl: primaryImageUrl });

      const existingMessages = await storage.getMessages(conversationId);

      const userMessages = existingMessages.filter(m => m.role === "user");
      const allUserContent = userMessages.map(m => m.content).join(" ");
      const ragContext = await getRAGContext(mode, allUserContent);

      const hasImage = existingMessages.some(m => m.imageUrl) || allImageUrls.length > 0;
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
      recentMessages.forEach((m, idx) => {
        const isLastUserMsg = m.role === "user" && idx === recentMessages.length - 1;
        const msgImageUrls = isLastUserMsg && allImageUrls.length > 1 ? allImageUrls : (m.imageUrl ? [m.imageUrl] : []);

        if (msgImageUrls.length > 0 && m.role === "user") {
          const contentParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
            { type: "text", text: m.content },
          ];
          msgImageUrls.forEach(url => {
            const imageAbsoluteUrl = `${req.protocol}://${req.get("host")}${url}`;
            contentParts.push({ type: "image_url", image_url: { url: imageAbsoluteUrl } });
          });
          chatHistory.push({ role: "user", content: contentParts });
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
