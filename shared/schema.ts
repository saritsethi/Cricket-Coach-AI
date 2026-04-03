import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp, jsonb, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  sessionToken: text("session_token"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  name: true,
  email: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  matchTitle: text("match_title").notNull(),
  team1: text("team1").notNull(),
  team2: text("team2").notNull(),
  venue: text("venue").notNull(),
  matchDate: text("match_date").notNull(),
  matchType: text("match_type").notNull(),
  result: text("result").notNull(),
  tossWinner: text("toss_winner"),
  tossDecision: text("toss_decision"),
  team1Score: text("team1_score"),
  team2Score: text("team2_score"),
  scorecardUrl: text("scorecard_url"),
});

export const insertMatchSchema = createInsertSchema(matches).omit({ id: true });
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Match = typeof matches.$inferSelect;

export const deliveries = pgTable("deliveries", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull(),
  innings: integer("innings").notNull(),
  overNumber: integer("over_number").notNull(),
  ballNumber: integer("ball_number").notNull(),
  batter: text("batter").notNull(),
  batterStyle: text("batter_style"),
  bowler: text("bowler").notNull(),
  bowlerStyle: text("bowler_style"),
  nonStriker: text("non_striker"),
  runsScored: integer("runs_scored").notNull(),
  extras: integer("extras").default(0),
  extraType: text("extra_type"),
  totalRuns: integer("total_runs").notNull(),
  isWicket: boolean("is_wicket").default(false),
  wicketType: text("wicket_type"),
  fielder: text("fielder"),
  shotType: text("shot_type"),
  shotDirection: text("shot_direction"),
  deliveryType: text("delivery_type"),
  lineOfDelivery: text("line_of_delivery"),
  lengthOfDelivery: text("length_of_delivery"),
  fieldPositions: text("field_positions").array(),
});

export const insertDeliverySchema = createInsertSchema(deliveries).omit({ id: true });
export type InsertDelivery = z.infer<typeof insertDeliverySchema>;
export type Delivery = typeof deliveries.$inferSelect;

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  country: text("country").notNull(),
  role: text("role").notNull(),
  battingStyle: text("batting_style"),
  bowlingStyle: text("bowling_style"),
  specialization: text("specialization"),
  strengths: text("strengths").array(),
  weaknesses: text("weaknesses").array(),
  imageUrl: text("image_url"),
  stats: jsonb("stats"),
});

export const insertPlayerSchema = createInsertSchema(players).omit({ id: true });
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof players.$inferSelect;

export const playerImages = pgTable("player_images", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull(),
  role: text("role").notNull(),
  actionType: text("action_type").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
});

export const insertPlayerImageSchema = createInsertSchema(playerImages).omit({ id: true });
export type InsertPlayerImage = z.infer<typeof insertPlayerImageSchema>;
export type PlayerImage = typeof playerImages.$inferSelect;

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  mode: text("mode").notNull(),
  userId: varchar("user_id"),
  userToken: text("user_token"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  imageUrls: text("image_urls").array(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});
export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// ─── Team Management ─────────────────────────────────────────────────────────

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  captainToken: text("captain_token").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertTeamSchema = createInsertSchema(teams).omit({ id: true, createdAt: true });
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;

export const squadMembers = pgTable("squad_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  name: text("name").notNull(),
  role: text("role"),
  battingStyle: text("batting_style"),
  bowlingStyle: text("bowling_style"),
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertSquadMemberSchema = createInsertSchema(squadMembers).omit({ id: true, createdAt: true });
export type InsertSquadMember = z.infer<typeof insertSquadMemberSchema>;
export type SquadMember = typeof squadMembers.$inferSelect;

// ─── Season Schedule ──────────────────────────────────────────────────────────

export const seasonSchedules = pgTable("season_schedules", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  seasonName: text("season_name").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertSeasonScheduleSchema = createInsertSchema(seasonSchedules).omit({ id: true, createdAt: true });
export type InsertSeasonSchedule = z.infer<typeof insertSeasonScheduleSchema>;
export type SeasonSchedule = typeof seasonSchedules.$inferSelect;

export const scheduledMatches = pgTable("scheduled_matches", {
  id: serial("id").primaryKey(),
  scheduleId: integer("schedule_id").notNull(),
  teamId: integer("team_id").notNull(),
  opponent: text("opponent").notNull(),
  matchDate: text("match_date").notNull(),
  venue: text("venue"),
  format: text("format").notNull(),
  homeAway: text("home_away").default("home"),
  status: text("status").default("upcoming"),
  result: text("result"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertScheduledMatchSchema = createInsertSchema(scheduledMatches).omit({ id: true, createdAt: true });
export type InsertScheduledMatch = z.infer<typeof insertScheduledMatchSchema>;
export type ScheduledMatch = typeof scheduledMatches.$inferSelect;

// ─── Match Plans & Analyses ──────────────────────────────────────────────────

export const matchPlans = pgTable("match_plans", {
  id: serial("id").primaryKey(),
  scheduledMatchId: integer("scheduled_match_id").notNull(),
  conversationId: integer("conversation_id"),
  battingOrder: text("batting_order"),
  bowlingPlan: text("bowling_plan"),
  notes: text("notes"),
  imageUrls: text("image_urls").array(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertMatchPlanSchema = createInsertSchema(matchPlans).omit({ id: true, createdAt: true });
export type InsertMatchPlan = z.infer<typeof insertMatchPlanSchema>;
export type MatchPlan = typeof matchPlans.$inferSelect;

export const matchAnalyses = pgTable("match_analyses", {
  id: serial("id").primaryKey(),
  scheduledMatchId: integer("scheduled_match_id").notNull(),
  matchPlanId: integer("match_plan_id"),
  conversationId: integer("conversation_id"),
  summaryNotes: text("summary_notes"),
  imageUrls: text("image_urls").array(),
  shareToken: text("share_token").unique(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertMatchAnalysisSchema = createInsertSchema(matchAnalyses).omit({ id: true, createdAt: true });
export type InsertMatchAnalysis = z.infer<typeof insertMatchAnalysisSchema>;
export type MatchAnalysis = typeof matchAnalyses.$inferSelect;

// ─── Player Sessions (via WhatsApp share link) ────────────────────────────────

export const playerSessions = pgTable("player_sessions", {
  id: serial("id").primaryKey(),
  analysisId: integer("analysis_id").notNull(),
  playerName: text("player_name").notNull(),
  userToken: text("user_token").notNull(),
  conversationId: integer("conversation_id"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertPlayerSessionSchema = createInsertSchema(playerSessions).omit({ id: true, createdAt: true });
export type InsertPlayerSession = z.infer<typeof insertPlayerSessionSchema>;
export type PlayerSession = typeof playerSessions.$inferSelect;

// ─── App Mode ─────────────────────────────────────────────────────────────────

export type AppMode = "pre-match" | "post-match" | "player";

const ALL_PROMPTS: Record<AppMode, { label: string; prompt: string; icon: string }[]> = {
  "pre-match": [
    { label: "Set optimal batting order", prompt: "Based on my squad, what's the optimal batting order for today's T20 match?", icon: "trending-up" },
    { label: "Bowling rotation plan", prompt: "How should I rotate my bowlers across 20 overs against a strong top order?", icon: "rotate-ccw" },
    { label: "Powerplay strategy", prompt: "What's the best powerplay bowling plan to restrict the opposition in the first 6 overs?", icon: "zap" },
    { label: "Field placements for spinners", prompt: "What field should I set when my spinner bowls against a left-right batting combination?", icon: "target" },
    { label: "Chase strategy planning", prompt: "We need to chase 185 in a T20. How should I structure the innings phase by phase?", icon: "trending-up" },
    { label: "Death over bowling plan", prompt: "Which bowlers should I save for the death overs and what lengths should they bowl?", icon: "flame" },
    { label: "Toss decision analysis", prompt: "It's a damp morning with expected afternoon sun. Should I bat or bowl first and why?", icon: "target" },
    { label: "Handling left-right combination", prompt: "The opposition opens with a left-right pair. How do I adjust field and bowling?", icon: "rotate-ccw" },
    { label: "Opposition weakness analysis", prompt: "Based on the scorecards I've uploaded, what are the main weaknesses in the opposition's batting?", icon: "eye" },
    { label: "Middle overs pressure plan", prompt: "How do I build pressure in overs 7-15 with medium pace and spin?", icon: "shield" },
    { label: "Backup bowling options", prompt: "My main seamer is injured. How do I redistribute overs among the remaining attack?", icon: "zap" },
    { label: "Batting order for ODI", prompt: "How should I structure the batting order in a 50-over match to maximise total runs?", icon: "trending-up" },
  ],
  "post-match": [
    { label: "Analyse today's scorecard", prompt: "Here's the scorecard from today's match. How did we perform vs the plan?", icon: "chart-bar" },
    { label: "Bowling performance review", prompt: "Review the bowling figures and tell me who executed the plan and who didn't.", icon: "rotate-ccw" },
    { label: "Batting collapse analysis", prompt: "We lost 5 wickets in 4 overs in the middle. What went wrong?", icon: "trending-down" },
    { label: "Death overs review", prompt: "We conceded 65 runs in the last 5 overs. What can we change next time?", icon: "flame" },
    { label: "Plan vs actual comparison", prompt: "Compare what we planned before the match with how the game actually went.", icon: "target" },
    { label: "Opposition batsman patterns", prompt: "Looking at the scorecard, what scoring patterns did the opposition's top order show?", icon: "eye" },
    { label: "Identify turning points", prompt: "At what point did the match swing and what decisions caused it?", icon: "zap" },
    { label: "Fielding lapses review", prompt: "Were there any fielding decisions or drops that materially affected the outcome?", icon: "shield" },
    { label: "Powerplay review", prompt: "How did our powerplay bowling and batting compare to what we targeted?", icon: "trending-up" },
    { label: "Lessons for next match", prompt: "Based on today's analysis, what are the top 3 things we must do differently next game?", icon: "target" },
    { label: "Player standout performances", prompt: "Who were the standout performers and what specifically did they do well?", icon: "award" },
    { label: "Share analysis with team", prompt: "Summarise the key takeaways from today so I can share with the squad on WhatsApp.", icon: "share" },
  ],
  player: [
    { label: "Improve cover drive technique", prompt: "How do I improve my cover drive? I keep getting out playing it.", icon: "swords" },
    { label: "Fast bowling action analysis", prompt: "What are the key elements of a good fast bowling action to generate pace safely?", icon: "flame" },
    { label: "Playing spin effectively", prompt: "How can I improve my technique against spin bowling?", icon: "eye" },
    { label: "Slip catching drills", prompt: "What drills can improve my slip catching reactions?", icon: "hand" },
    { label: "Power hitting technique", prompt: "How do T20 batters generate power in their shots? What drills help?", icon: "zap" },
    { label: "Bowling yorkers consistently", prompt: "How do I practice bowling yorkers more consistently?", icon: "flame" },
    { label: "Playing the short ball", prompt: "I struggle against bouncers. How do I improve my short ball technique?", icon: "swords" },
    { label: "Running between wickets", prompt: "How can I improve my running between wickets and calling?", icon: "footprints" },
    { label: "Building an innings", prompt: "How do I build a longer innings instead of getting out after a start?", icon: "trending-up" },
    { label: "Reverse swing bowling", prompt: "What technique and ball management is needed for reverse swing?", icon: "flame" },
    { label: "Wicketkeeping footwork", prompt: "What drills improve wicketkeeping footwork and positioning?", icon: "hand" },
    { label: "Mental game under pressure", prompt: "How do I stay focused and handle pressure in important match situations?", icon: "eye" },
  ],
};

export function getRandomPrompts(mode: AppMode, count: number = 5): { label: string; prompt: string; icon: string }[] {
  const all = [...ALL_PROMPTS[mode]];
  const shuffled = all.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export const PRE_CANNED_PROMPTS = ALL_PROMPTS;
