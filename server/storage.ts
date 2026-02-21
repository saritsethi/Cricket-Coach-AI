import { db } from "./db";
import {
  users, matches, deliveries, players, playerImages, equipment, conversations, messages,
  type User, type InsertUser,
  type Match, type InsertMatch,
  type Delivery, type InsertDelivery,
  type Player, type InsertPlayer,
  type PlayerImage, type InsertPlayerImage,
  type Equipment, type InsertEquipment,
  type Conversation, type InsertConversation,
  type Message, type InsertMessage,
} from "@shared/schema";
import { eq, desc, and, ilike, or, sql } from "drizzle-orm";

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

  getEquipment(): Promise<Equipment[]>;
  getEquipmentById(id: number): Promise<Equipment | undefined>;
  createEquipment(item: InsertEquipment): Promise<Equipment>;
  searchEquipment(query: string): Promise<Equipment[]>;

  getConversations(userId?: string): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  createConversation(conv: InsertConversation): Promise<Conversation>;
  deleteConversation(id: number): Promise<void>;

  getMessages(conversationId: number): Promise<Message[]>;
  createMessage(msg: InsertMessage): Promise<Message>;
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

  async getEquipment() {
    return db.select().from(equipment).orderBy(desc(equipment.rating));
  }
  async getEquipmentById(id: number) {
    const [item] = await db.select().from(equipment).where(eq(equipment.id, id));
    return item;
  }
  async createEquipment(item: InsertEquipment) {
    const [created] = await db.insert(equipment).values(item).returning();
    return created;
  }
  async searchEquipment(query: string) {
    const pattern = `%${query}%`;
    return db.select().from(equipment).where(
      or(
        ilike(equipment.name, pattern),
        ilike(equipment.category, pattern),
        ilike(equipment.brand, pattern),
        ilike(equipment.description, pattern)
      )
    ).limit(20);
  }

  async getConversations(userId?: string) {
    if (userId) {
      return db.select().from(conversations).where(eq(conversations.userId, userId)).orderBy(desc(conversations.createdAt));
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
}

export const storage = new DatabaseStorage();
