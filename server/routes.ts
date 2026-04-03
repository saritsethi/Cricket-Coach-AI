import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getRAGContext, getSystemPrompt, enforceFollowUp, enforceCitations, extractDataFromImage } from "./rag";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import OpenAI from "openai";
import { z } from "zod";
import type { AppMode } from "@shared/schema";
import { randomUUID } from "crypto";

const createConversationSchema = z.object({
  title: z.string().min(1).max(200),
  mode: z.enum(["pre-match", "post-match", "player"]),
  userToken: z.string().optional(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(10000),
  mode: z.enum(["pre-match", "post-match", "player"]),
  imageUrl: z.string().optional(),
  imageUrls: z.array(z.string()).optional(),
  playerName: z.string().optional(),
  analysisId: z.number().optional(),
  squadContext: z.string().optional(),
  prePlan: z.string().optional(),
  matchContext: z.string().optional(),
  isPlayerAnalysisPage: z.boolean().optional(),
});

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

function getUserToken(req: Request): string | undefined {
  return (req.headers["x-user-token"] as string) || undefined;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ─── Conversations ────────────────────────────────────────────────────────

  app.get("/api/conversations", async (req, res) => {
    try {
      const userToken = getUserToken(req);
      const conversations = await storage.getConversations(userToken);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const conversation = await storage.getConversation(id);
      if (!conversation) return res.status(404).json({ error: "Not found" });
      const userToken = getUserToken(req);
      if (conversation.userToken && userToken !== conversation.userToken) {
        return res.status(403).json({ error: "Forbidden" });
      }
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
      const userToken = parsed.data.userToken || getUserToken(req);
      const conversation = await storage.createConversation({
        ...parsed.data,
        userToken: userToken || null,
        userId: null,
      });
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.delete("/api/conversations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const conversation = await storage.getConversation(id);
      if (!conversation) return res.status(404).json({ error: "Not found" });
      const userToken = getUserToken(req);
      if (conversation.userToken && userToken !== conversation.userToken) {
        return res.status(403).json({ error: "Forbidden" });
      }
      await storage.deleteConversation(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  // ─── Chat ─────────────────────────────────────────────────────────────────

  app.post("/api/chat/:conversationId/messages", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.conversationId as string);
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const userToken = getUserToken(req);
      if (conversation.userToken && userToken !== conversation.userToken) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const parsed = sendMessageSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      }
      const { content, mode, imageUrl, imageUrls, playerName, squadContext, prePlan, matchContext, isPlayerAnalysisPage } = parsed.data;

      const allImageUrls = imageUrls && imageUrls.length > 0 ? imageUrls : (imageUrl ? [imageUrl] : []);
      const primaryImageUrl = allImageUrls[0] || null;

      await storage.createMessage({ conversationId, role: "user", content, imageUrl: primaryImageUrl });

      const existingMessages = await storage.getMessages(conversationId);
      const userMessages = existingMessages.filter(m => m.role === "user");
      const allUserContent = userMessages.map(m => m.content).join(" ");

      const ragContext = await getRAGContext(mode as AppMode, allUserContent, {
        squadContext,
        prePlan,
        playerName,
        matchContext,
      });

      const hasImage = existingMessages.some(m => m.imageUrl) || allImageUrls.length > 0;
      const exchangeCount = Math.floor(userMessages.length);
      const systemPrompt = getSystemPrompt(mode as AppMode, exchangeCount, hasImage, {
        playerName,
        isPlayerAnalysisPage,
      });

      type ChatMessage = { role: "system" | "user" | "assistant"; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> };
      const chatHistory: ChatMessage[] = [
        {
          role: "system",
          content: systemPrompt + (ragContext ? `\n\nHere is relevant context for this conversation:\n\n${ragContext}` : ""),
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
            const imageAbsoluteUrl = url.startsWith("http") ? url : `${req.protocol}://${req.get("host")}${url}`;
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

      const stream = await openai.chat.completions.create({
        model: hasImage ? "gpt-4o" : "gpt-4o-mini",
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

      if (enforcedResponse !== fullResponse) {
        const extra = enforcedResponse.slice(fullResponse.length);
        if (extra) res.write(`data: ${JSON.stringify({ content: extra })}\n\n`);
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

  // ─── Image Extraction ─────────────────────────────────────────────────────

  app.post("/api/extract", async (req, res) => {
    try {
      const { imageUrl, extractionType } = req.body as { imageUrl: string; extractionType: "squad" | "schedule" | "scorecard" };
      if (!imageUrl || !extractionType) {
        return res.status(400).json({ error: "imageUrl and extractionType are required" });
      }
      const host = `${req.protocol}://${req.get("host")}`;
      const result = await extractDataFromImage(imageUrl, extractionType, openai, host);
      res.json({ data: result });
    } catch (error) {
      console.error("Error extracting data:", error);
      res.status(500).json({ error: "Failed to extract data from image" });
    }
  });

  // ─── Teams ────────────────────────────────────────────────────────────────

  app.get("/api/teams", async (req, res) => {
    try {
      const captainToken = getUserToken(req);
      if (!captainToken) return res.status(400).json({ error: "captainToken required" });
      const teamList = await storage.getTeams(captainToken);
      res.json(teamList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });

  app.get("/api/teams/:id", async (req, res) => {
    try {
      const captainToken = getUserToken(req);
      const team = await storage.getTeam(parseInt(req.params.id));
      if (!team) return res.status(404).json({ error: "Team not found" });
      if (captainToken && team.captainToken !== captainToken) {
        return res.status(403).json({ error: "Forbidden" });
      }
      res.json(team);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch team" });
    }
  });

  app.post("/api/teams", async (req, res) => {
    try {
      const captainToken = getUserToken(req);
      if (!captainToken) return res.status(400).json({ error: "captainToken required" });
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: "name is required" });
      const team = await storage.createTeam({ captainToken, name });
      res.status(201).json(team);
    } catch (error) {
      res.status(500).json({ error: "Failed to create team" });
    }
  });

  app.patch("/api/teams/:id", async (req, res) => {
    try {
      const captainToken = getUserToken(req);
      const team = await storage.getTeam(parseInt(req.params.id));
      if (!team) return res.status(404).json({ error: "Team not found" });
      if (!captainToken || team.captainToken !== captainToken) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const updated = await storage.updateTeam(team.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update team" });
    }
  });

  app.delete("/api/teams/:id", async (req, res) => {
    try {
      const captainToken = getUserToken(req);
      const team = await storage.getTeam(parseInt(req.params.id));
      if (!team) return res.status(404).json({ error: "Team not found" });
      if (!captainToken || team.captainToken !== captainToken) {
        return res.status(403).json({ error: "Forbidden" });
      }
      await storage.deleteTeam(team.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete team" });
    }
  });

  // ─── Squad Members ────────────────────────────────────────────────────────

  app.get("/api/teams/:teamId/squad", async (req, res) => {
    try {
      const members = await storage.getSquadMembers(parseInt(req.params.teamId));
      res.json(members);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch squad" });
    }
  });

  app.post("/api/teams/:teamId/squad", async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const member = await storage.createSquadMember({ ...req.body, teamId });
      res.status(201).json(member);
    } catch (error) {
      res.status(500).json({ error: "Failed to create squad member" });
    }
  });

  app.post("/api/teams/:teamId/squad/bulk", async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const { members } = req.body as { members: any[] };
      if (!Array.isArray(members)) return res.status(400).json({ error: "members array required" });
      const created = await storage.bulkCreateSquadMembers(members.map(m => ({ ...m, teamId })));
      res.status(201).json(created);
    } catch (error) {
      res.status(500).json({ error: "Failed to bulk create squad members" });
    }
  });

  app.patch("/api/squad/:id", async (req, res) => {
    try {
      const member = await storage.updateSquadMember(parseInt(req.params.id), req.body);
      res.json(member);
    } catch (error) {
      res.status(500).json({ error: "Failed to update squad member" });
    }
  });

  app.delete("/api/squad/:id", async (req, res) => {
    try {
      await storage.deleteSquadMember(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete squad member" });
    }
  });

  // ─── Season Schedules & Scheduled Matches ─────────────────────────────────

  app.get("/api/teams/:teamId/schedules", async (req, res) => {
    try {
      const schedules = await storage.getSeasonSchedules(parseInt(req.params.teamId));
      res.json(schedules);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch schedules" });
    }
  });

  app.post("/api/teams/:teamId/schedules", async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const schedule = await storage.createSeasonSchedule({ ...req.body, teamId });
      res.status(201).json(schedule);
    } catch (error) {
      res.status(500).json({ error: "Failed to create schedule" });
    }
  });

  app.get("/api/teams/:teamId/fixtures", async (req, res) => {
    try {
      const fixtures = await storage.getScheduledMatchesByTeam(parseInt(req.params.teamId));
      res.json(fixtures);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch fixtures" });
    }
  });

  app.post("/api/schedules/:scheduleId/fixtures", async (req, res) => {
    try {
      const scheduleId = parseInt(req.params.scheduleId);
      const fixture = await storage.createScheduledMatch({ ...req.body, scheduleId });
      res.status(201).json(fixture);
    } catch (error) {
      res.status(500).json({ error: "Failed to create fixture" });
    }
  });

  app.post("/api/schedules/:scheduleId/fixtures/bulk", async (req, res) => {
    try {
      const scheduleId = parseInt(req.params.scheduleId);
      const { fixtures } = req.body as { fixtures: any[] };
      if (!Array.isArray(fixtures)) return res.status(400).json({ error: "fixtures array required" });
      const created = await storage.bulkCreateScheduledMatches(fixtures.map(f => ({ ...f, scheduleId })));
      res.status(201).json(created);
    } catch (error) {
      res.status(500).json({ error: "Failed to bulk create fixtures" });
    }
  });

  app.patch("/api/fixtures/:id", async (req, res) => {
    try {
      const fixture = await storage.updateScheduledMatch(parseInt(req.params.id), req.body);
      res.json(fixture);
    } catch (error) {
      res.status(500).json({ error: "Failed to update fixture" });
    }
  });

  // ─── Match Plans ──────────────────────────────────────────────────────────

  app.get("/api/fixtures/:fixtureId/plan", async (req, res) => {
    try {
      const plan = await storage.getMatchPlan(parseInt(req.params.fixtureId));
      res.json(plan || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch match plan" });
    }
  });

  app.post("/api/fixtures/:fixtureId/plan", async (req, res) => {
    try {
      const scheduledMatchId = parseInt(req.params.fixtureId);
      const existing = await storage.getMatchPlan(scheduledMatchId);
      if (existing) {
        const updated = await storage.updateMatchPlan(existing.id, req.body);
        await storage.updateScheduledMatch(scheduledMatchId, { status: "planned" });
        return res.json(updated);
      }
      const plan = await storage.createMatchPlan({ ...req.body, scheduledMatchId });
      await storage.updateScheduledMatch(scheduledMatchId, { status: "planned" });
      res.status(201).json(plan);
    } catch (error) {
      res.status(500).json({ error: "Failed to save match plan" });
    }
  });

  // ─── Match Analyses ───────────────────────────────────────────────────────

  app.get("/api/fixtures/:fixtureId/analysis", async (req, res) => {
    try {
      const analysis = await storage.getMatchAnalysis(parseInt(req.params.fixtureId));
      res.json(analysis || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch analysis" });
    }
  });

  app.post("/api/fixtures/:fixtureId/analysis", async (req, res) => {
    try {
      const scheduledMatchId = parseInt(req.params.fixtureId);
      const existing = await storage.getMatchAnalysis(scheduledMatchId);
      const shareToken = existing?.shareToken || randomUUID();
      if (existing) {
        const updated = await storage.updateMatchAnalysis(existing.id, { ...req.body, shareToken });
        await storage.updateScheduledMatch(scheduledMatchId, { status: "completed" });
        return res.json(updated);
      }
      const analysis = await storage.createMatchAnalysis({ ...req.body, scheduledMatchId, shareToken });
      await storage.updateScheduledMatch(scheduledMatchId, { status: "completed" });
      res.status(201).json(analysis);
    } catch (error) {
      res.status(500).json({ error: "Failed to save analysis" });
    }
  });

  // ─── Public Analysis by Share Token ──────────────────────────────────────

  app.get("/api/analysis/:shareToken", async (req, res) => {
    try {
      const analysis = await storage.getMatchAnalysisByToken(req.params.shareToken);
      if (!analysis) return res.status(404).json({ error: "Analysis not found" });

      const fixture = await storage.getScheduledMatch(analysis.scheduledMatchId);
      const plan = analysis.matchPlanId ? await storage.getMatchPlan(analysis.scheduledMatchId) : null;

      res.json({ analysis, fixture, plan });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch analysis" });
    }
  });

  // ─── Player Sessions ──────────────────────────────────────────────────────

  app.post("/api/player-sessions", async (req, res) => {
    try {
      const { analysisId, playerName, userToken } = req.body;
      if (!analysisId || !playerName || !userToken) {
        return res.status(400).json({ error: "analysisId, playerName, userToken required" });
      }

      const existing = await storage.getPlayerSession(analysisId, playerName, userToken);
      if (existing) {
        let conversationMessages = null;
        if (existing.conversationId) {
          conversationMessages = await storage.getMessages(existing.conversationId);
        }
        return res.json({ session: existing, messages: conversationMessages });
      }

      const session = await storage.createPlayerSession({ analysisId, playerName, userToken, conversationId: null });
      res.status(201).json({ session, messages: [] });
    } catch (error) {
      res.status(500).json({ error: "Failed to get/create player session" });
    }
  });

  app.patch("/api/player-sessions/:id", async (req, res) => {
    try {
      const session = await storage.updatePlayerSession(parseInt(req.params.id), req.body);
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to update player session" });
    }
  });

  // ─── Object Storage & Static Data ────────────────────────────────────────

  registerObjectStorageRoutes(app);

  app.get("/api/matches", async (req, res) => {
    try {
      const matchList = await storage.getMatches();
      res.json(matchList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch matches" });
    }
  });

  app.get("/api/players", async (req, res) => {
    try {
      const playerList = await storage.getPlayers();
      res.json(playerList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch players" });
    }
  });

  return httpServer;
}
