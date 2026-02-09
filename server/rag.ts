import { storage } from "./storage";
import type { AppMode } from "@shared/schema";

function extractKeywords(query: string): string[] {
  const stopWords = new Set(["the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "can", "shall", "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "into", "through", "during", "before", "after", "above", "below", "between", "but", "about", "against", "not", "or", "and", "if", "what", "which", "who", "whom", "this", "that", "these", "those", "am", "how", "when", "where", "why", "all", "each", "every", "both", "few", "more", "most", "other", "some", "such", "no", "nor", "only", "own", "same", "so", "than", "too", "very", "just", "because", "also", "my", "your", "his", "her", "its", "our", "their", "i", "me", "we", "you", "he", "she", "it", "they", "them", "us"]);

  return query.toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
}

async function getCaptainContext(query: string): Promise<string> {
  const keywords = extractKeywords(query);
  const parts: string[] = [];

  const matchResults = await Promise.all(
    keywords.slice(0, 3).map(kw => storage.searchMatches(kw))
  );
  const uniqueMatches = new Map();
  matchResults.flat().forEach(m => uniqueMatches.set(m.id, m));
  const relevantMatches = Array.from(uniqueMatches.values()).slice(0, 5);

  if (relevantMatches.length > 0) {
    parts.push("=== RELEVANT MATCH DATA ===");
    for (const match of relevantMatches) {
      parts.push(`Match: ${match.matchTitle}`);
      parts.push(`Teams: ${match.team1} vs ${match.team2} | Type: ${match.matchType}`);
      parts.push(`Venue: ${match.venue} | Date: ${match.matchDate}`);
      parts.push(`Result: ${match.result}`);
      if (match.tossWinner) parts.push(`Toss: ${match.tossWinner} won, chose to ${match.tossDecision}`);
      if (match.team1Score) parts.push(`${match.team1}: ${match.team1Score}`);
      if (match.team2Score) parts.push(`${match.team2}: ${match.team2Score}`);

      const delivs = await storage.getDeliveriesByMatch(match.id);
      if (delivs.length > 0) {
        const wickets = delivs.filter(d => d.isWicket);
        const totalRuns = delivs.reduce((s, d) => s + d.totalRuns, 0);
        parts.push(`Ball-by-ball: ${delivs.length} deliveries, ${totalRuns} runs, ${wickets.length} wickets`);

        const bowlerStats: Record<string, { runs: number; wickets: number; balls: number }> = {};
        delivs.forEach(d => {
          if (!bowlerStats[d.bowler]) bowlerStats[d.bowler] = { runs: 0, wickets: 0, balls: 0 };
          bowlerStats[d.bowler].runs += d.totalRuns;
          bowlerStats[d.bowler].balls++;
          if (d.isWicket) bowlerStats[d.bowler].wickets++;
        });
        parts.push("Bowling figures:");
        Object.entries(bowlerStats).forEach(([bowler, stats]) => {
          const overs = Math.floor(stats.balls / 6) + "." + (stats.balls % 6);
          parts.push(`  ${bowler}: ${overs}-${stats.runs}-${stats.wickets}`);
        });

        if (wickets.length > 0) {
          parts.push("Wickets:");
          wickets.forEach(w => {
            parts.push(`  ${w.batter} - ${w.wicketType}${w.fielder ? ` (${w.fielder})` : ""} | Over ${w.overNumber}.${w.ballNumber} | Delivery: ${w.deliveryType || "N/A"}`);
          });
        }

        const fieldPositions = delivs.filter(d => d.fieldPositions && d.fieldPositions.length > 0).slice(0, 5);
        if (fieldPositions.length > 0) {
          parts.push("Sample field positions:");
          fieldPositions.forEach(d => {
            parts.push(`  Over ${d.overNumber}.${d.ballNumber}: ${d.fieldPositions?.join(", ")}`);
          });
        }
      }
      parts.push("---");
    }
  }

  const playerResults = await Promise.all(
    keywords.slice(0, 3).map(kw => storage.searchPlayers(kw))
  );
  const uniquePlayers = new Map();
  playerResults.flat().forEach(p => uniquePlayers.set(p.id, p));
  const relevantPlayers = Array.from(uniquePlayers.values()).slice(0, 5);

  if (relevantPlayers.length > 0) {
    parts.push("=== RELEVANT PLAYER PROFILES ===");
    relevantPlayers.forEach(p => {
      parts.push(`${p.name} (${p.country}) - ${p.role}`);
      if (p.battingStyle) parts.push(`  Batting: ${p.battingStyle}`);
      if (p.bowlingStyle) parts.push(`  Bowling: ${p.bowlingStyle}`);
      if (p.strengths?.length) parts.push(`  Strengths: ${p.strengths.join(", ")}`);
      if (p.weaknesses?.length) parts.push(`  Weaknesses: ${p.weaknesses.join(", ")}`);
    });
  }

  return parts.join("\n");
}

async function getSkillsContext(query: string): Promise<string> {
  const keywords = extractKeywords(query);
  const parts: string[] = [];

  const playerResults = await Promise.all(
    keywords.slice(0, 3).map(kw => storage.searchPlayers(kw))
  );
  const uniquePlayers = new Map();
  playerResults.flat().forEach(p => uniquePlayers.set(p.id, p));
  const relevantPlayers = Array.from(uniquePlayers.values()).slice(0, 8);

  if (relevantPlayers.length > 0) {
    parts.push("=== PLAYER TECHNIQUE PROFILES ===");
    for (const p of relevantPlayers) {
      parts.push(`${p.name} (${p.country}) - ${p.role}`);
      if (p.battingStyle) parts.push(`  Batting style: ${p.battingStyle}`);
      if (p.bowlingStyle) parts.push(`  Bowling style: ${p.bowlingStyle}`);
      if (p.specialization) parts.push(`  Specialization: ${p.specialization}`);
      if (p.strengths?.length) parts.push(`  Key strengths: ${p.strengths.join(", ")}`);
      if (p.weaknesses?.length) parts.push(`  Areas to improve: ${p.weaknesses.join(", ")}`);
      if (p.stats) parts.push(`  Career stats: ${JSON.stringify(p.stats)}`);

      const images = await storage.getPlayerImages(p.id);
      if (images.length > 0) {
        parts.push(`  Reference images:`);
        images.forEach(img => {
          parts.push(`    - [${img.role}/${img.actionType}] ${img.description}`);
        });
      }
    }
  }

  const delivFilters: Record<string, string> = {};
  const shotTypes = ["cover drive", "pull", "sweep", "cut", "loft", "slog", "flick", "hook", "straight drive", "reverse sweep"];
  const deliveryTypes = ["yorker", "bouncer", "slower ball", "outswinger", "inswinger", "leg spin", "off spin", "doosra", "googly", "carrom ball"];

  for (const kw of keywords) {
    if (shotTypes.some(s => s.includes(kw))) delivFilters.shotType = kw;
    if (deliveryTypes.some(d => d.includes(kw))) delivFilters.deliveryType = kw;
  }

  if (Object.keys(delivFilters).length > 0) {
    const delivs = await storage.searchDeliveries(delivFilters);
    if (delivs.length > 0) {
      parts.push("=== TECHNIQUE DATA FROM MATCHES ===");
      delivs.slice(0, 15).forEach(d => {
        parts.push(`${d.batter} (${d.batterStyle || "N/A"}) vs ${d.bowler} (${d.bowlerStyle || "N/A"})`);
        parts.push(`  Shot: ${d.shotType || "N/A"} | Direction: ${d.shotDirection || "N/A"} | Runs: ${d.runsScored}`);
        parts.push(`  Delivery: ${d.deliveryType || "N/A"} | Line: ${d.lineOfDelivery || "N/A"} | Length: ${d.lengthOfDelivery || "N/A"}`);
        if (d.isWicket) parts.push(`  WICKET: ${d.wicketType}`);
      });
    }
  }

  return parts.join("\n");
}

async function getEquipmentContext(query: string): Promise<string> {
  const keywords = extractKeywords(query);
  const parts: string[] = [];

  const equipResults = await Promise.all(
    keywords.slice(0, 3).map(kw => storage.searchEquipment(kw))
  );
  const uniqueEquip = new Map();
  equipResults.flat().forEach(e => uniqueEquip.set(e.id, e));
  const relevant = Array.from(uniqueEquip.values()).slice(0, 10);

  if (relevant.length > 0) {
    parts.push("=== EQUIPMENT DATABASE ===");
    relevant.forEach(e => {
      parts.push(`${e.name} by ${e.brand} - ${e.category}`);
      parts.push(`  Rating: ${e.rating}/5 | Price Range: ${e.priceRange || "N/A"}`);
      parts.push(`  ${e.description}`);
      if (e.suitableFor?.length) parts.push(`  Suitable for: ${e.suitableFor.join(", ")}`);
      if (e.pros?.length) parts.push(`  Pros: ${e.pros.join(", ")}`);
      if (e.cons?.length) parts.push(`  Cons: ${e.cons.join(", ")}`);
      if (e.specifications) parts.push(`  Specs: ${JSON.stringify(e.specifications)}`);
    });
  }

  return parts.join("\n");
}

export async function getRAGContext(mode: AppMode, query: string): Promise<string> {
  switch (mode) {
    case "captain":
      return getCaptainContext(query);
    case "skills":
      return getSkillsContext(query);
    case "equipment":
      return getEquipmentContext(query);
    default:
      return "";
  }
}

const SYSTEM_PROMPTS: Record<AppMode, string> = {
  captain: `You are CricketIQ Captain's Strategy Advisor, an expert cricket tactical analyst. You help cricket captains with:
- Field placement strategies for different match situations
- Bowling changes and rotation plans
- Batting order decisions and run chase strategies
- DLS calculations and rain-affected match planning
- Powerplay and death over tactics
- Spin vs pace bowling strategies on different pitches

Use the match data and player profiles provided to give data-driven tactical advice. Reference specific matches, players, and statistics when available. Be specific about field positions (e.g., "deep mid-wicket", "short fine leg", "slip cordon") and bowling plans. Format your responses clearly with sections and bullet points where appropriate.`,

  skills: `You are CricketIQ Skill Building Coach, an expert cricket technique analyst and coach. You help cricketers with:
- Batting technique analysis (stance, grip, footwork, shot execution)
- Bowling action biomechanics (run-up, delivery stride, arm action, follow-through)
- Fielding drills and improvement plans
- Mental conditioning and match awareness
- Practice routines and training programs
- Video analysis insights based on player data

Use the player profiles and match delivery data provided to give technique-specific advice. Reference how top players execute specific skills. Include drill descriptions and step-by-step technique breakdowns. Be encouraging but technically precise.`,

  equipment: `You are CricketIQ Equipment Expert, a comprehensive cricket gear reviewer and advisor. You help cricketers with:
- Cricket bat selection (willow grade, weight, balance, sweet spot)
- Protective gear recommendations (helmets, pads, gloves, guards)
- Bowling equipment and accessories
- Cricket shoes for different surfaces
- Training equipment and bowling machines
- Equipment maintenance and care tips

Use the equipment database provided to make specific product comparisons and recommendations. Include pros/cons, price considerations, and suitability for different playing levels. Be objective and helpful.`,
};

export function getSystemPrompt(mode: AppMode): string {
  return SYSTEM_PROMPTS[mode];
}
