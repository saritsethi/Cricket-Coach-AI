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

const ALL_PROMPTS: Record<AppMode, { label: string; prompt: string; icon: string }[]> = {
  captain: [
    { label: "Field placement for death overs", prompt: "What are the best field placements for the death overs when defending a total of 160 in a T20 match?", icon: "target" },
    { label: "Bowling strategy against left-handers", prompt: "Suggest a bowling strategy against left-handed batters in powerplay overs.", icon: "zap" },
    { label: "Chase strategy for run targets", prompt: "How should a captain plan a run chase of 180 in a T20?", icon: "trending-up" },
    { label: "Spin bowling tactics on turning pitch", prompt: "What bowling changes and field adjustments should I make when the pitch starts turning?", icon: "rotate-ccw" },
    { label: "DLS method situation planning", prompt: "How should I adjust strategy when rain is expected during a chase?", icon: "cloud-rain" },
    { label: "Powerplay bowling plan", prompt: "What's the best bowling plan for the first 6 overs in a T20?", icon: "zap" },
    { label: "Setting a batting order", prompt: "How should I structure my batting order for a 200+ run chase?", icon: "trending-up" },
    { label: "Middle overs pressure tactics", prompt: "How do I maintain pressure through the middle overs with spin and medium pace?", icon: "target" },
    { label: "Handling a collapse", prompt: "What tactical changes should I make when we lose 3 quick wickets?", icon: "shield" },
    { label: "Part-time bowler usage", prompt: "When and how should I use part-time bowlers effectively?", icon: "rotate-ccw" },
    { label: "New ball strategy", prompt: "What's the best approach with the new ball in an ODI opening spell?", icon: "zap" },
    { label: "Defending a low total", prompt: "How do I set fields and rotate bowlers when defending under 140 in a T20?", icon: "target" },
  ],
  skills: [
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
  equipment: [
    { label: "Best bats for power hitting", prompt: "What are the best cricket bats for power hitting in T20 cricket?", icon: "award" },
    { label: "Choosing cricket shoes", prompt: "What should I look for when choosing cricket shoes for different surfaces?", icon: "footprints" },
    { label: "Protective gear guide", prompt: "What protective gear do I need and what standards should each piece meet?", icon: "shield" },
    { label: "Bowling machine comparison", prompt: "Which bowling machines are best for practice at different skill levels?", icon: "settings" },
    { label: "Ball selection guide", prompt: "How do different cricket balls (Kookaburra, Dukes, SG) compare?", icon: "circle" },
    { label: "Bat weight and balance", prompt: "How do I choose the right bat weight and balance for my style?", icon: "award" },
    { label: "Gloves for different conditions", prompt: "What batting gloves work best in hot vs cold conditions?", icon: "hand" },
    { label: "Helmet safety standards", prompt: "What safety standards should I look for in a cricket helmet?", icon: "shield" },
    { label: "Kit bag essentials", prompt: "What should every cricketer have in their kit bag?", icon: "settings" },
    { label: "Bat care and maintenance", prompt: "How do I properly knock in and maintain my cricket bat?", icon: "award" },
    { label: "Training aids that work", prompt: "What training aids actually help improve cricket skills?", icon: "settings" },
    { label: "Budget gear recommendations", prompt: "What's the best cricket equipment for someone on a tight budget?", icon: "circle" },
  ],
};

export function getRandomPrompts(mode: AppMode, count: number = 5): { label: string; prompt: string; icon: string }[] {
  const all = [...ALL_PROMPTS[mode]];
  const shuffled = all.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export const PRE_CANNED_PROMPTS = ALL_PROMPTS;
