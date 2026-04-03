import { db } from "./db";
import {
  users, matches, deliveries, players, playerImages, conversations, messages,
  teams, squadMembers, seasonSchedules, scheduledMatches, matchPlans, matchAnalyses, playerSessions,
  type User, type InsertUser,
  type Match, type InsertMatch,
  type Delivery, type InsertDelivery,
  type Player, type InsertPlayer,
  type PlayerImage, type InsertPlayerImage,
  type Conversation, type InsertConversation,
  type Message, type InsertMessage,
  type Team, type InsertTeam,
  type SquadMember, type InsertSquadMember,
  type SeasonSchedule, type InsertSeasonSchedule,
  type ScheduledMatch, type InsertScheduledMatch,
  type MatchPlan, type InsertMatchPlan,
  type MatchAnalysis, type InsertMatchAnalysis,
  type PlayerSession, type InsertPlayerSession,
} from "@shared/schema";
import { eq, desc, and, ilike, or } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserBySessionToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserSessionToken(id: string, token: string | null): Promise<void>;

  getMatches(): Promise<Match[]>;
  getMatch(id: number): Promise<Match | undefined>;
  createMatch(match: InsertMatch): Promise<Match>;
  searchMatches(query: string): Promise<Match[]>;

  getDeliveriesByMatch(matchId: number): Promise<Delivery[]>;
  createDelivery(delivery: InsertDelivery): Promise<Delivery>;
  searchDeliveries(filters: { batter?: string; bowler?: string; shotType?: string; deliveryType?: string; isWicket?: boolean }): Promise<Delivery[]>;

  getPlayers(): Promise<Player[]>;
  getPlayer(id: number): Promise<Player | undefined>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  searchPlayers(query: string): Promise<Player[]>;
  getPlayerImages(playerId: number): Promise<PlayerImage[]>;
  getPlayerImagesByRole(role: string): Promise<PlayerImage[]>;
  createPlayerImage(image: InsertPlayerImage): Promise<PlayerImage>;

  getConversations(userToken?: string): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  createConversation(conv: InsertConversation): Promise<Conversation>;
  deleteConversation(id: number): Promise<void>;

  getMessages(conversationId: number): Promise<Message[]>;
  createMessage(msg: InsertMessage): Promise<Message>;

  getTeams(captainToken: string): Promise<Team[]>;
  getTeam(id: number): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: number, data: Partial<InsertTeam>): Promise<Team>;
  deleteTeam(id: number): Promise<void>;

  getSquadMembers(teamId: number): Promise<SquadMember[]>;
  getSquadMember(id: number): Promise<SquadMember | undefined>;
  createSquadMember(member: InsertSquadMember): Promise<SquadMember>;
  updateSquadMember(id: number, data: Partial<InsertSquadMember>): Promise<SquadMember>;
  deleteSquadMember(id: number): Promise<void>;
  bulkCreateSquadMembers(members: InsertSquadMember[]): Promise<SquadMember[]>;

  getSeasonSchedules(teamId: number): Promise<SeasonSchedule[]>;
  getSeasonSchedule(id: number): Promise<SeasonSchedule | undefined>;
  createSeasonSchedule(schedule: InsertSeasonSchedule): Promise<SeasonSchedule>;

  getScheduledMatches(scheduleId: number): Promise<ScheduledMatch[]>;
  getScheduledMatchesByTeam(teamId: number): Promise<ScheduledMatch[]>;
  getScheduledMatch(id: number): Promise<ScheduledMatch | undefined>;
  createScheduledMatch(match: InsertScheduledMatch): Promise<ScheduledMatch>;
  updateScheduledMatch(id: number, data: Partial<InsertScheduledMatch>): Promise<ScheduledMatch>;
  bulkCreateScheduledMatches(matches: InsertScheduledMatch[]): Promise<ScheduledMatch[]>;

  getMatchPlan(scheduledMatchId: number): Promise<MatchPlan | undefined>;
  createMatchPlan(plan: InsertMatchPlan): Promise<MatchPlan>;
  updateMatchPlan(id: number, data: Partial<InsertMatchPlan>): Promise<MatchPlan>;

  getMatchAnalysis(scheduledMatchId: number): Promise<MatchAnalysis | undefined>;
  getMatchAnalysisById(id: number): Promise<MatchAnalysis | undefined>;
  getMatchAnalysisByToken(shareToken: string): Promise<MatchAnalysis | undefined>;
  createMatchAnalysis(analysis: InsertMatchAnalysis): Promise<MatchAnalysis>;
  updateMatchAnalysis(id: number, data: Partial<InsertMatchAnalysis>): Promise<MatchAnalysis>;

  getPlayerSession(analysisId: number, playerName: string, userToken: string): Promise<PlayerSession | undefined>;
  getPlayerSessionById(id: number): Promise<PlayerSession | undefined>;
  createPlayerSession(session: InsertPlayerSession): Promise<PlayerSession>;
  updatePlayerSession(id: number, data: Partial<InsertPlayerSession>): Promise<PlayerSession>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  async getUserBySessionToken(token: string) {
    const [user] = await db.select().from(users).where(eq(users.sessionToken, token));
    return user;
  }
  async createUser(user: InsertUser) {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }
  async updateUserSessionToken(id: string, token: string | null) {
    await db.update(users).set({ sessionToken: token }).where(eq(users.id, id));
  }

  async getMatches() {
    return db.select().from(matches).orderBy(desc(matches.id));
  }
  async getMatch(id: number) {
    const [match] = await db.select().from(matches).where(eq(matches.id, id));
    return match;
  }
  async createMatch(match: InsertMatch) {
    const [created] = await db.insert(matches).values(match).returning();
    return created;
  }
  async searchMatches(query: string) {
    const pattern = `%${query}%`;
    return db.select().from(matches).where(
      or(
        ilike(matches.matchTitle, pattern),
        ilike(matches.team1, pattern),
        ilike(matches.team2, pattern),
        ilike(matches.venue, pattern),
        ilike(matches.matchType, pattern),
        ilike(matches.result, pattern)
      )
    ).limit(10);
  }

  async getDeliveriesByMatch(matchId: number) {
    return db.select().from(deliveries).where(eq(deliveries.matchId, matchId))
      .orderBy(deliveries.innings, deliveries.overNumber, deliveries.ballNumber);
  }
  async createDelivery(delivery: InsertDelivery) {
    const [created] = await db.insert(deliveries).values(delivery).returning();
    return created;
  }
  async searchDeliveries(filters: { batter?: string; bowler?: string; shotType?: string; deliveryType?: string; isWicket?: boolean }) {
    const conditions = [];
    if (filters.batter) conditions.push(ilike(deliveries.batter, `%${filters.batter}%`));
    if (filters.bowler) conditions.push(ilike(deliveries.bowler, `%${filters.bowler}%`));
    if (filters.shotType) conditions.push(ilike(deliveries.shotType, `%${filters.shotType}%`));
    if (filters.deliveryType) conditions.push(ilike(deliveries.deliveryType, `%${filters.deliveryType}%`));
    if (filters.isWicket !== undefined) conditions.push(eq(deliveries.isWicket, filters.isWicket));
    if (conditions.length === 0) return db.select().from(deliveries).limit(50);
    return db.select().from(deliveries).where(and(...conditions)).limit(50);
  }

  async getPlayers() {
    return db.select().from(players).orderBy(players.name);
  }
  async getPlayer(id: number) {
    const [player] = await db.select().from(players).where(eq(players.id, id));
    return player;
  }
  async createPlayer(player: InsertPlayer) {
    const [created] = await db.insert(players).values(player).returning();
    return created;
  }
  async searchPlayers(query: string) {
    const pattern = `%${query}%`;
    return db.select().from(players).where(
      or(
        ilike(players.name, pattern),
        ilike(players.role, pattern),
        ilike(players.country, pattern),
        ilike(players.battingStyle, pattern),
        ilike(players.bowlingStyle, pattern)
      )
    ).limit(20);
  }
  async getPlayerImages(playerId: number) {
    return db.select().from(playerImages).where(eq(playerImages.playerId, playerId));
  }
  async getPlayerImagesByRole(role: string) {
    return db.select().from(playerImages).where(ilike(playerImages.role, `%${role}%`));
  }
  async createPlayerImage(image: InsertPlayerImage) {
    const [created] = await db.insert(playerImages).values(image).returning();
    return created;
  }

  async getConversations(userToken?: string) {
    if (userToken) {
      return db.select().from(conversations)
        .where(eq(conversations.userToken, userToken))
        .orderBy(desc(conversations.createdAt));
    }
    return db.select().from(conversations).orderBy(desc(conversations.createdAt));
  }
  async getConversation(id: number) {
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conv;
  }
  async createConversation(conv: InsertConversation) {
    const [created] = await db.insert(conversations).values(conv).returning();
    return created;
  }
  async deleteConversation(id: number) {
    await db.delete(messages).where(eq(messages.conversationId, id));
    await db.delete(conversations).where(eq(conversations.id, id));
  }

  async getMessages(conversationId: number) {
    return db.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }
  async createMessage(msg: InsertMessage) {
    const [created] = await db.insert(messages).values(msg).returning();
    return created;
  }

  // Teams
  async getTeams(captainToken: string) {
    return db.select().from(teams).where(eq(teams.captainToken, captainToken)).orderBy(desc(teams.createdAt));
  }
  async getTeam(id: number) {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }
  async createTeam(team: InsertTeam) {
    const [created] = await db.insert(teams).values(team).returning();
    return created;
  }
  async updateTeam(id: number, data: Partial<InsertTeam>) {
    const [updated] = await db.update(teams).set(data).where(eq(teams.id, id)).returning();
    return updated;
  }
  async deleteTeam(id: number) {
    await db.delete(teams).where(eq(teams.id, id));
  }

  // Squad members
  async getSquadMembers(teamId: number) {
    return db.select().from(squadMembers).where(eq(squadMembers.teamId, teamId)).orderBy(squadMembers.name);
  }
  async getSquadMember(id: number) {
    const [member] = await db.select().from(squadMembers).where(eq(squadMembers.id, id));
    return member;
  }
  async createSquadMember(member: InsertSquadMember) {
    const [created] = await db.insert(squadMembers).values(member).returning();
    return created;
  }
  async updateSquadMember(id: number, data: Partial<InsertSquadMember>) {
    const [updated] = await db.update(squadMembers).set(data).where(eq(squadMembers.id, id)).returning();
    return updated;
  }
  async deleteSquadMember(id: number) {
    await db.delete(squadMembers).where(eq(squadMembers.id, id));
  }
  async bulkCreateSquadMembers(members: InsertSquadMember[]) {
    if (members.length === 0) return [];
    return db.insert(squadMembers).values(members).returning();
  }

  // Season schedules
  async getSeasonSchedules(teamId: number) {
    return db.select().from(seasonSchedules).where(eq(seasonSchedules.teamId, teamId)).orderBy(desc(seasonSchedules.createdAt));
  }
  async getSeasonSchedule(id: number) {
    const [schedule] = await db.select().from(seasonSchedules).where(eq(seasonSchedules.id, id));
    return schedule;
  }
  async createSeasonSchedule(schedule: InsertSeasonSchedule) {
    const [created] = await db.insert(seasonSchedules).values(schedule).returning();
    return created;
  }

  // Scheduled matches
  async getScheduledMatches(scheduleId: number) {
    return db.select().from(scheduledMatches).where(eq(scheduledMatches.scheduleId, scheduleId)).orderBy(scheduledMatches.matchDate);
  }
  async getScheduledMatchesByTeam(teamId: number) {
    return db.select().from(scheduledMatches).where(eq(scheduledMatches.teamId, teamId)).orderBy(scheduledMatches.matchDate);
  }
  async getScheduledMatch(id: number) {
    const [match] = await db.select().from(scheduledMatches).where(eq(scheduledMatches.id, id));
    return match;
  }
  async createScheduledMatch(match: InsertScheduledMatch) {
    const [created] = await db.insert(scheduledMatches).values(match).returning();
    return created;
  }
  async updateScheduledMatch(id: number, data: Partial<InsertScheduledMatch>) {
    const [updated] = await db.update(scheduledMatches).set(data).where(eq(scheduledMatches.id, id)).returning();
    return updated;
  }
  async bulkCreateScheduledMatches(matches: InsertScheduledMatch[]) {
    if (matches.length === 0) return [];
    return db.insert(scheduledMatches).values(matches).returning();
  }

  // Match plans
  async getMatchPlan(scheduledMatchId: number) {
    const [plan] = await db.select().from(matchPlans).where(eq(matchPlans.scheduledMatchId, scheduledMatchId));
    return plan;
  }
  async createMatchPlan(plan: InsertMatchPlan) {
    const [created] = await db.insert(matchPlans).values(plan).returning();
    return created;
  }
  async updateMatchPlan(id: number, data: Partial<InsertMatchPlan>) {
    const [updated] = await db.update(matchPlans).set(data).where(eq(matchPlans.id, id)).returning();
    return updated;
  }

  // Match analyses
  async getMatchAnalysis(scheduledMatchId: number) {
    const [analysis] = await db.select().from(matchAnalyses).where(eq(matchAnalyses.scheduledMatchId, scheduledMatchId));
    return analysis;
  }
  async getMatchAnalysisById(id: number) {
    const [analysis] = await db.select().from(matchAnalyses).where(eq(matchAnalyses.id, id));
    return analysis;
  }
  async getMatchAnalysisByToken(shareToken: string) {
    const [analysis] = await db.select().from(matchAnalyses).where(eq(matchAnalyses.shareToken, shareToken));
    return analysis;
  }
  async createMatchAnalysis(analysis: InsertMatchAnalysis) {
    const [created] = await db.insert(matchAnalyses).values(analysis).returning();
    return created;
  }
  async updateMatchAnalysis(id: number, data: Partial<InsertMatchAnalysis>) {
    const [updated] = await db.update(matchAnalyses).set(data).where(eq(matchAnalyses.id, id)).returning();
    return updated;
  }

  // Player sessions
  async getPlayerSession(analysisId: number, playerName: string, userToken: string) {
    const [session] = await db.select().from(playerSessions).where(
      and(
        eq(playerSessions.analysisId, analysisId),
        eq(playerSessions.playerName, playerName),
        eq(playerSessions.userToken, userToken)
      )
    );
    return session;
  }
  async getPlayerSessionById(id: number) {
    const [session] = await db.select().from(playerSessions).where(eq(playerSessions.id, id));
    return session;
  }
  async createPlayerSession(session: InsertPlayerSession) {
    const [created] = await db.insert(playerSessions).values(session).returning();
    return created;
  }
  async updatePlayerSession(id: number, data: Partial<InsertPlayerSession>) {
    const [updated] = await db.update(playerSessions).set(data).where(eq(playerSessions.id, id)).returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
