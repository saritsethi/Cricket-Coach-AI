import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp, jsonb, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
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

export const equipment = pgTable("equipment", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  brand: text("brand").notNull(),
  description: text("description").notNull(),
  rating: real("rating").default(0),
  priceRange: text("price_range"),
  suitableFor: text("suitable_for").array(),
  pros: text("pros").array(),
  cons: text("cons").array(),
  imageUrl: text("image_url"),
  specifications: jsonb("specifications"),
});

export const insertEquipmentSchema = createInsertSchema(equipment).omit({ id: true });
export type InsertEquipment = z.infer<typeof insertEquipmentSchema>;
export type Equipment = typeof equipment.$inferSelect;

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  mode: text("mode").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
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

export type AppMode = "captain" | "skills" | "equipment";

export const PRE_CANNED_PROMPTS: Record<AppMode, { label: string; prompt: string; icon: string }[]> = {
  captain: [
    { label: "Field placement for death overs", prompt: "What are the best field placements for the death overs when defending a total of 160 in a T20 match? Consider the batter's strengths and recent scoring patterns.", icon: "target" },
    { label: "Bowling strategy against left-handers", prompt: "Suggest a bowling strategy against left-handed batters in powerplay overs. Include field positions, bowling lengths, and line variations.", icon: "zap" },
    { label: "Chase strategy for run targets", prompt: "How should a captain plan a run chase of 180 in a T20? Include powerplay approach, middle overs strategy, and death overs acceleration plan.", icon: "trending-up" },
    { label: "Spin bowling tactics on turning pitch", prompt: "What bowling changes and field adjustments should a captain make when the pitch starts turning in the middle overs of an ODI match?", icon: "rotate-ccw" },
    { label: "DLS method situation planning", prompt: "How should a captain adjust strategy when rain is expected during a chase? Consider DLS par scores and batting approach for different stages.", icon: "cloud-rain" },
  ],
  skills: [
    { label: "Improve cover drive technique", prompt: "Analyze the cover drive technique. What are the key elements of a perfect cover drive? Include foot position, bat swing, head position, and common mistakes to avoid.", icon: "swords" },
    { label: "Fast bowling action analysis", prompt: "Break down the biomechanics of a fast bowling action. What elements contribute to generating pace while minimizing injury risk?", icon: "flame" },
    { label: "Playing spin effectively", prompt: "How can a batter improve their technique against spin bowling? Cover footwork, use of crease, reading the ball out of the hand, and sweep shot variations.", icon: "eye" },
    { label: "Fielding drills for slip catching", prompt: "What are the best drills and techniques for improving slip catching? Include reaction training, hand positioning, and concentration exercises.", icon: "hand" },
    { label: "Power hitting in death overs", prompt: "Analyze the techniques used by top T20 batters for power hitting in death overs. Cover bat speed, swing path, clearing the front leg, and shot selection.", icon: "zap" },
  ],
  equipment: [
    { label: "Best bats for power hitting", prompt: "Compare the top cricket bats suited for power hitting in T20 cricket. Consider willow grade, sweet spot position, pick-up weight, and durability.", icon: "award" },
    { label: "Choosing the right cricket shoes", prompt: "What factors should a cricketer consider when choosing cricket shoes? Cover spike types, ankle support, weight, and suitability for different surfaces.", icon: "footprints" },
    { label: "Protective gear guide", prompt: "Provide a comprehensive guide to cricket protective gear including helmets, pads, gloves, and guards. What standards should each piece meet?", icon: "shield" },
    { label: "Bowling machine comparison", prompt: "Compare popular bowling machines for practice. Consider speed range, ball types, programmability, and value for money at different skill levels.", icon: "settings" },
    { label: "Ball selection for different conditions", prompt: "How do different cricket balls (Kookaburra, Dukes, SG) behave in various conditions? What should teams consider when choosing match balls?", icon: "circle" },
  ],
};
