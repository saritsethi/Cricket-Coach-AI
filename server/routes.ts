import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getRAGContext, getSystemPrompt, enforceFollowUp, enforceCitations, extractDataFromImage } from "./rag";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import OpenAI from "openai";
import { z } from "zod";
import type { AppMode } from "@shared/schema";
import type { Team } from "@shared/schema";
import { randomUUID } from "crypto";

const createConversationSchema = z.object({
  title: z.string().min(1).max(200),
  mode: z.enum(["pre-match", "post-match", "player"]),
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(10000),
  mode: z.enum(["pre-match", "post-match", "player"]),
  imageUrl: z.string().optional(),
  imageUrls: z.array(z.string()).optional(),
  playerName: z.string().optional(),
  squadContext: z.string().optional(),
  prePlan: z.string().optional(),
  matchContext: z.string().optional(),
  isPlayerAnalysisPage: z.boolean().optional(),
  analysisId: z.number().optional(),
});

const squadMemberSchema = z.object({
  name: z.string().min(1).max(200),
  role: z.string().optional(),
  battingStyle: z.string().optional(),
  bowlingStyle: z.string().optional(),
});

const squadBulkSchema = z.object({
  members: z.array(squadMemberSchema),
});

const fixtureSchema = z.object({
  opponent: z.string().min(1).max(200),
  matchDate: z.string().optional(),
  venue: z.string().optional(),
  format: z.string().optional(),
  homeAway: z.string().optional(),
  teamId: z.number().optional(),
});

const fixtureBulkSchema = z.object({
  fixtures: z.array(fixtureSchema),
});

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

function getUserToken(req: Request): string | undefined {
  return (req.headers["x-user-token"] as string) || (req.query.userToken as string) || undefined;
}

function requireUserToken(req: Request, res: Response): string | null {
  const token = getUserToken(req);
  if (!token) {
    res.status(400).json({ error: "x-user-token header required" });
    return null;
  }
  return token;
}

async function getTeamForCaptain(
  teamId: number,
  captainToken: string,
  res: Response
): Promise<Team | null> {
  const team = await storage.getTeam(teamId);
  if (!team) {
    res.status(404).json({ error: "Team not found" });
    return null;
  }
  if (team.captainToken !== captainToken) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  return team;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ─── Conversations ────────────────────────────────────────────────────────

  app.get("/api/conversations", async (req, res) => {
    try {
      const userToken = requireUserToken(req, res);
      if (!userToken) return;
      const conversations = await storage.getConversations(userToken);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", async (req, res) => {
    try {
      const userToken = requireUserToken(req, res);
      if (!userToken) return;
      const id = parseInt(req.params.id as string);
      const conversation = await storage.getConversation(id);
      if (!conversation) return res.status(404).json({ error: "Not found" });
      if (!conversation.userToken || conversation.userToken !== userToken) {
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
      const userToken = requireUserToken(req, res);
      if (!userToken) return;
      const parsed = createConversationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      }
      const conversation = await storage.createConversation({
        ...parsed.data,
        userToken,
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
      const userToken = requireUserToken(req, res);
      if (!userToken) return;
      const id = parseInt(req.params.id as string);
      const conversation = await storage.getConversation(id);
      if (!conversation) return res.status(404).json({ error: "Not found" });
      if (!conversation.userToken || conversation.userToken !== userToken) {
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
      if (!conversation.userToken || conversation.userToken !== userToken) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const parsed = sendMessageSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      }
      const { content, mode, imageUrl, imageUrls, playerName, squadContext, prePlan, matchContext: clientMatchContext, isPlayerAnalysisPage, analysisId } = parsed.data;

      const allImageUrls = imageUrls && imageUrls.length > 0 ? imageUrls : (imageUrl ? [imageUrl] : []);
      const primaryImageUrl = allImageUrls[0] || null;
      const allImageUrlsToStore = allImageUrls.length > 0 ? allImageUrls : undefined;

      await storage.createMessage({
        conversationId,
        role: "user",
        content,
        imageUrl: primaryImageUrl,
        imageUrls: allImageUrlsToStore,
      });

      const existingMessages = await storage.getMessages(conversationId);
      const userMessages = existingMessages.filter(m => m.role === "user");
      const allUserContent = userMessages.map(m => m.content).join(" ");

      // Build matchContext server-side from analysisId if client didn't provide it
      let matchContext = clientMatchContext;
      if (!matchContext && analysisId && mode === "player") {
        try {
          const analysisRow = await storage.getMatchAnalysisById(analysisId);
          if (analysisRow) {
            const [fix, plan] = await Promise.all([
              storage.getScheduledMatch(analysisRow.scheduledMatchId),
              storage.getMatchPlan(analysisRow.scheduledMatchId),
            ]);
            const parts: string[] = [];
            if (fix) {
              parts.push(`Match: vs ${fix.opponent} (${fix.format ?? ""})`);
              if (fix.matchDate) parts.push(`Date: ${fix.matchDate}`);
              if (fix.venue) parts.push(`Venue: ${fix.venue}`);
              if (fix.result) parts.push(`Result: ${fix.result}`);
            }
            if (analysisRow.summaryNotes) parts.push(`Match Summary: ${analysisRow.summaryNotes}`);
            if (plan?.battingOrder) parts.push(`Planned batting order: ${plan.battingOrder}`);
            if (plan?.bowlingPlan) parts.push(`Bowling plan: ${plan.bowlingPlan}`);
            matchContext = parts.join("\n");
          }
        } catch {
          // Fall back to client-provided context (already undefined/empty)
        }
      }

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
        // For the last user message, prefer the freshly-sent allImageUrls (may have multi images);
        // for historical messages, read the stored imageUrls array or fall back to single imageUrl
        const storedUrls = m.imageUrls && m.imageUrls.length > 0 ? m.imageUrls : (m.imageUrl ? [m.imageUrl] : []);
        const msgImageUrls = isLastUserMsg ? (allImageUrls.length > 0 ? allImageUrls : storedUrls) : storedUrls;

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
        messages: chatHistory as Parameters<typeof openai.chat.completions.create>[0]["messages"],
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
      const { imageUrl, extractionType, context } = req.body as { imageUrl: string; extractionType: "squad" | "schedule" | "scorecard"; context?: string };
      if (!imageUrl || !extractionType) {
        return res.status(400).json({ error: "imageUrl and extractionType are required" });
      }
      const host = `${req.protocol}://${req.get("host")}`;
      const result = await extractDataFromImage(imageUrl, extractionType, openai, host, context);
      res.json({ data: result });
    } catch (error) {
      console.error("Error extracting data:", error);
      res.status(500).json({ error: "Failed to extract data from image" });
    }
  });

  // ─── Teams ────────────────────────────────────────────────────────────────

  app.get("/api/teams", async (req, res) => {
    try {
      const captainToken = requireUserToken(req, res);
      if (!captainToken) return;
      const teamList = await storage.getTeams(captainToken);
      res.json(teamList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });

  app.get("/api/teams/:id", async (req, res) => {
    try {
      const captainToken = requireUserToken(req, res);
      if (!captainToken) return;
      const team = await storage.getTeam(parseInt(req.params.id as string));
      if (!team) return res.status(404).json({ error: "Team not found" });
      if (team.captainToken !== captainToken) return res.status(403).json({ error: "Forbidden" });
      res.json(team);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch team" });
    }
  });

  app.post("/api/teams", async (req, res) => {
    try {
      const captainToken = requireUserToken(req, res);
      if (!captainToken) return;
      const { name } = req.body as { name?: string };
      if (!name) return res.status(400).json({ error: "name is required" });
      const team = await storage.createTeam({ captainToken, name });
      res.status(201).json(team);
    } catch (error) {
      res.status(500).json({ error: "Failed to create team" });
    }
  });

  app.patch("/api/teams/:id", async (req, res) => {
    try {
      const captainToken = requireUserToken(req, res);
      if (!captainToken) return;
      const team = await getTeamForCaptain(parseInt(req.params.id as string), captainToken, res);
      if (!team) return;
      const updated = await storage.updateTeam(team.id, req.body as Partial<{ name: string }>);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update team" });
    }
  });

  app.delete("/api/teams/:id", async (req, res) => {
    try {
      const captainToken = requireUserToken(req, res);
      if (!captainToken) return;
      const team = await getTeamForCaptain(parseInt(req.params.id as string), captainToken, res);
      if (!team) return;
      await storage.deleteTeam(team.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete team" });
    }
  });

  // ─── Squad Members ────────────────────────────────────────────────────────

  app.get("/api/teams/:teamId/squad", async (req, res) => {
    try {
      const captainToken = requireUserToken(req, res);
      if (!captainToken) return;
      const teamId = parseInt(req.params.teamId as string);
      const team = await getTeamForCaptain(teamId, captainToken, res);
      if (!team) return;
      const members = await storage.getSquadMembers(teamId);
      res.json(members);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch squad" });
    }
  });

  app.post("/api/teams/:teamId/squad", async (req, res) => {
    try {
      const captainToken = requireUserToken(req, res);
      if (!captainToken) return;
      const teamId = parseInt(req.params.teamId as string);
      const team = await getTeamForCaptain(teamId, captainToken, res);
      if (!team) return;
      const parsed = squadMemberSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      const member = await storage.createSquadMember({ ...parsed.data, teamId });
      res.status(201).json(member);
    } catch (error) {
      res.status(500).json({ error: "Failed to create squad member" });
    }
  });

  app.post("/api/teams/:teamId/squad/bulk", async (req, res) => {
    try {
      const captainToken = requireUserToken(req, res);
      if (!captainToken) return;
      const teamId = parseInt(req.params.teamId as string);
      const team = await getTeamForCaptain(teamId, captainToken, res);
      if (!team) return;
      const parsed = squadBulkSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      const created = await storage.bulkCreateSquadMembers(parsed.data.members.map(m => ({ ...m, teamId })));
      res.status(201).json(created);
    } catch (error) {
      res.status(500).json({ error: "Failed to bulk create squad members" });
    }
  });

  app.patch("/api/squad/:id", async (req, res) => {
    try {
      const captainToken = requireUserToken(req, res);
      if (!captainToken) return;
      const memberId = parseInt(req.params.id as string);
      const member = await storage.getSquadMember(memberId);
      if (!member) return res.status(404).json({ error: "Squad member not found" });
      const team = await getTeamForCaptain(member.teamId, captainToken, res);
      if (!team) return;
      const parsed = squadMemberSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      const updated = await storage.updateSquadMember(memberId, parsed.data);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update squad member" });
    }
  });

  app.delete("/api/squad/:id", async (req, res) => {
    try {
      const captainToken = requireUserToken(req, res);
      if (!captainToken) return;
      const memberId = parseInt(req.params.id as string);
      const member = await storage.getSquadMember(memberId);
      if (!member) return res.status(404).json({ error: "Squad member not found" });
      const team = await getTeamForCaptain(member.teamId, captainToken, res);
      if (!team) return;
      await storage.deleteSquadMember(memberId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete squad member" });
    }
  });

  // ─── Season Schedules & Scheduled Matches ─────────────────────────────────

  app.get("/api/teams/:teamId/schedules", async (req, res) => {
    try {
      const captainToken = requireUserToken(req, res);
      if (!captainToken) return;
      const teamId = parseInt(req.params.teamId as string);
      const team = await getTeamForCaptain(teamId, captainToken, res);
      if (!team) return;
      const schedules = await storage.getSeasonSchedules(teamId);
      res.json(schedules);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch schedules" });
    }
  });

  app.post("/api/teams/:teamId/schedules", async (req, res) => {
    try {
      const captainToken = requireUserToken(req, res);
      if (!captainToken) return;
      const teamId = parseInt(req.params.teamId as string);
      const team = await getTeamForCaptain(teamId, captainToken, res);
      if (!team) return;
      const { seasonName } = req.body as { seasonName?: string };
      const schedule = await storage.createSeasonSchedule({ teamId, seasonName: seasonName || "Season 2025" });
      res.status(201).json(schedule);
    } catch (error) {
      res.status(500).json({ error: "Failed to create schedule" });
    }
  });

  app.get("/api/teams/:teamId/fixtures", async (req, res) => {
    try {
      const captainToken = requireUserToken(req, res);
      if (!captainToken) return;
      const teamId = parseInt(req.params.teamId as string);
      const team = await getTeamForCaptain(teamId, captainToken, res);
      if (!team) return;
      const fixtures = await storage.getScheduledMatchesByTeam(teamId);
      res.json(fixtures);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch fixtures" });
    }
  });

  app.post("/api/schedules/:scheduleId/fixtures", async (req, res) => {
    try {
      const captainToken = requireUserToken(req, res);
      if (!captainToken) return;
      const scheduleId = parseInt(req.params.scheduleId as string);
      const schedule = await storage.getSeasonSchedule(scheduleId);
      if (!schedule) return res.status(404).json({ error: "Schedule not found" });
      const team = await getTeamForCaptain(schedule.teamId, captainToken, res);
      if (!team) return;
      const parsed = fixtureSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      const fixture = await storage.createScheduledMatch({
        ...parsed.data,
        scheduleId,
        teamId: team.id,
        status: "upcoming",
        matchDate: parsed.data.matchDate || "TBD",
        format: parsed.data.format || "T20",
        homeAway: parsed.data.homeAway || "home",
      });
      res.status(201).json(fixture);
    } catch (error) {
      res.status(500).json({ error: "Failed to create fixture" });
    }
  });

  app.post("/api/schedules/:scheduleId/fixtures/bulk", async (req, res) => {
    try {
      const captainToken = requireUserToken(req, res);
      if (!captainToken) return;
      const scheduleId = parseInt(req.params.scheduleId as string);
      const schedule = await storage.getSeasonSchedule(scheduleId);
      if (!schedule) return res.status(404).json({ error: "Schedule not found" });
      const team = await getTeamForCaptain(schedule.teamId, captainToken, res);
      if (!team) return;
      const parsed = fixtureBulkSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      const created = await storage.bulkCreateScheduledMatches(
        parsed.data.fixtures.map(f => ({
          ...f,
          scheduleId,
          teamId: team.id,
          status: "upcoming" as const,
          matchDate: f.matchDate || "TBD",
          format: f.format || "T20",
          homeAway: f.homeAway || "home",
        }))
      );
      res.status(201).json(created);
    } catch (error) {
      res.status(500).json({ error: "Failed to bulk create fixtures" });
    }
  });

  app.patch("/api/fixtures/:id", async (req, res) => {
    try {
      const captainToken = requireUserToken(req, res);
      if (!captainToken) return;
      const fixtureId = parseInt(req.params.id as string);
      const fixture = await storage.getScheduledMatch(fixtureId);
      if (!fixture) return res.status(404).json({ error: "Fixture not found" });
      const team = await getTeamForCaptain(fixture.teamId, captainToken, res);
      if (!team) return;
      const updated = await storage.updateScheduledMatch(fixtureId, req.body as Partial<{ status: string; result: string }>);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update fixture" });
    }
  });

  // ─── Match Plans ──────────────────────────────────────────────────────────

  app.get("/api/fixtures/:fixtureId/plan", async (req, res) => {
    try {
      const captainToken = requireUserToken(req, res);
      if (!captainToken) return;
      const fixtureId = parseInt(req.params.fixtureId as string);
      const fixture = await storage.getScheduledMatch(fixtureId);
      if (!fixture) return res.status(404).json({ error: "Fixture not found" });
      const team = await getTeamForCaptain(fixture.teamId, captainToken, res);
      if (!team) return;
      const plan = await storage.getMatchPlan(fixtureId);
      res.json(plan || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch match plan" });
    }
  });

  app.post("/api/fixtures/:fixtureId/plan", async (req, res) => {
    try {
      const captainToken = requireUserToken(req, res);
      if (!captainToken) return;
      const scheduledMatchId = parseInt(req.params.fixtureId as string);
      const fixture = await storage.getScheduledMatch(scheduledMatchId);
      if (!fixture) return res.status(404).json({ error: "Fixture not found" });
      const team = await getTeamForCaptain(fixture.teamId, captainToken, res);
      if (!team) return;
      const payload = req.body as { conversationId?: number; battingOrder?: string; bowlingPlan?: string; notes?: string };

      // Auto-extract image URLs from the conversation messages for plan context
      let imageUrls: string[] = [];
      if (payload.conversationId) {
        const msgs = await storage.getMessages(payload.conversationId);
        imageUrls = msgs.flatMap(m => {
          if (m.imageUrls && m.imageUrls.length > 0) return m.imageUrls;
          if (m.imageUrl) return [m.imageUrl];
          return [];
        });
      }

      const existing = await storage.getMatchPlan(scheduledMatchId);
      if (existing) {
        const updated = await storage.updateMatchPlan(existing.id, { ...payload, imageUrls: imageUrls.length > 0 ? imageUrls : (existing.imageUrls || []) });
        await storage.updateScheduledMatch(scheduledMatchId, { status: "planned" });
        return res.json(updated);
      }
      const plan = await storage.createMatchPlan({ ...payload, scheduledMatchId, imageUrls });
      await storage.updateScheduledMatch(scheduledMatchId, { status: "planned" });
      res.status(201).json(plan);
    } catch (error) {
      res.status(500).json({ error: "Failed to save match plan" });
    }
  });

  // ─── Match Analyses ───────────────────────────────────────────────────────

  app.get("/api/fixtures/:fixtureId/analysis", async (req, res) => {
    try {
      const captainToken = requireUserToken(req, res);
      if (!captainToken) return;
      const fixtureId = parseInt(req.params.fixtureId as string);
      const fixture = await storage.getScheduledMatch(fixtureId);
      if (!fixture) return res.status(404).json({ error: "Fixture not found" });
      const team = await getTeamForCaptain(fixture.teamId, captainToken, res);
      if (!team) return;
      const analysis = await storage.getMatchAnalysis(fixtureId);
      res.json(analysis || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch analysis" });
    }
  });

  app.post("/api/fixtures/:fixtureId/analysis", async (req, res) => {
    try {
      const captainToken = requireUserToken(req, res);
      if (!captainToken) return;
      const scheduledMatchId = parseInt(req.params.fixtureId as string);
      const fixture = await storage.getScheduledMatch(scheduledMatchId);
      if (!fixture) return res.status(404).json({ error: "Fixture not found" });
      const team = await getTeamForCaptain(fixture.teamId, captainToken, res);
      if (!team) return;
      const existing = await storage.getMatchAnalysis(scheduledMatchId);
      const shareToken = existing?.shareToken || randomUUID();
      const payload = req.body as { conversationId?: number; summaryNotes?: string; matchPlanId?: number };

      // Auto-extract image URLs from the conversation messages for analysis context
      let imageUrls: string[] = [];
      if (payload.conversationId) {
        const msgs = await storage.getMessages(payload.conversationId);
        imageUrls = msgs.flatMap(m => {
          if (m.imageUrls && m.imageUrls.length > 0) return m.imageUrls;
          if (m.imageUrl) return [m.imageUrl];
          return [];
        });
      }
      // Also include plan images if we have a plan
      if (imageUrls.length === 0 && existing?.scheduledMatchId) {
        const plan = await storage.getMatchPlan(scheduledMatchId);
        if (plan?.imageUrls?.length) imageUrls = plan.imageUrls;
      }

      if (existing) {
        const updated = await storage.updateMatchAnalysis(existing.id, {
          ...payload,
          shareToken,
          imageUrls: imageUrls.length > 0 ? imageUrls : (existing.imageUrls || []),
        });
        await storage.updateScheduledMatch(scheduledMatchId, { status: "completed" });
        return res.json(updated);
      }
      const analysis = await storage.createMatchAnalysis({ ...payload, scheduledMatchId, shareToken, imageUrls });
      await storage.updateScheduledMatch(scheduledMatchId, { status: "completed" });
      res.status(201).json(analysis);
    } catch (error) {
      res.status(500).json({ error: "Failed to save analysis" });
    }
  });

  // ─── Public Analysis by Share Token ──────────────────────────────────────

  app.get("/api/analysis/:shareToken", async (req, res) => {
    try {
      const analysis = await storage.getMatchAnalysisByToken(req.params.shareToken as string);
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
      const userToken = requireUserToken(req, res);
      if (!userToken) return;
      const { analysisId, playerName } = req.body as { analysisId?: number; playerName?: string };
      if (!analysisId || !playerName) {
        return res.status(400).json({ error: "analysisId and playerName required" });
      }

      const existing = await storage.getPlayerSession(analysisId, playerName, userToken);
      if (existing) {
        let conversationMessages = null;
        if (existing.conversationId) {
          // Verify the linked conversation still belongs to this userToken before returning messages
          const conv = await storage.getConversation(existing.conversationId);
          if (conv && conv.userToken === userToken) {
            conversationMessages = await storage.getMessages(existing.conversationId);
          }
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
      const userToken = requireUserToken(req, res);
      if (!userToken) return;
      const sessionId = parseInt(req.params.id as string);
      const existing = await storage.getPlayerSessionById(sessionId);
      if (!existing) return res.status(404).json({ error: "Session not found" });
      if (existing.userToken !== userToken) return res.status(403).json({ error: "Forbidden" });

      const patch = req.body as Partial<{ conversationId: number }>;

      // If a conversationId is being linked, verify it belongs to this userToken
      if (patch.conversationId !== undefined) {
        const conv = await storage.getConversation(patch.conversationId);
        if (!conv || conv.userToken !== userToken) {
          return res.status(403).json({ error: "Conversation does not belong to this user" });
        }
      }

      const session = await storage.updatePlayerSession(sessionId, patch);
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
