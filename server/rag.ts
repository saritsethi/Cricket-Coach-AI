import { storage } from "./storage";
import type { AppMode } from "@shared/schema";

function extractKeywords(query: string): string[] {
  const stopWords = new Set(["the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "can", "shall", "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "into", "through", "during", "before", "after", "above", "below", "between", "but", "about", "against", "not", "or", "and", "if", "what", "which", "who", "whom", "this", "that", "these", "those", "am", "how", "when", "where", "why", "all", "each", "every", "both", "few", "more", "most", "other", "some", "such", "no", "nor", "only", "own", "same", "so", "than", "too", "very", "just", "because", "also", "my", "your", "his", "her", "its", "our", "their", "i", "me", "we", "you", "he", "she", "it", "they", "them", "us"]);
  return query.toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
}

async function getPreMatchContext(query: string, squadContext?: string): Promise<string> {
  const keywords = extractKeywords(query);
  const parts: string[] = [];

  if (squadContext) {
    parts.push("=== SQUAD ROSTER ===");
    parts.push(squadContext);
    parts.push("---");
  }

  const matchResults = await Promise.all(
    keywords.slice(0, 6).map(kw => storage.searchMatches(kw))
  );
  const uniqueMatches = new Map();
  matchResults.flat().forEach(m => uniqueMatches.set(m.id, m));
  let relevantMatches = Array.from(uniqueMatches.values()).slice(0, 5);
  if (relevantMatches.length === 0) {
    const allMatches = await storage.getMatches();
    relevantMatches = allMatches.slice(0, 3);
  }

  if (relevantMatches.length > 0) {
    parts.push("=== REFERENCE MATCH DATA ===");
    for (const match of relevantMatches) {
      parts.push(`Match: ${match.matchTitle}`);
      parts.push(`Teams: ${match.team1} vs ${match.team2} | Type: ${match.matchType}`);
      parts.push(`Venue: ${match.venue} | Date: ${match.matchDate}`);
      parts.push(`Result: ${match.result}`);
      if (match.scorecardUrl) parts.push(`Scorecard: ${match.scorecardUrl}`);
      if (match.team1Score) parts.push(`${match.team1}: ${match.team1Score}`);
      if (match.team2Score) parts.push(`${match.team2}: ${match.team2Score}`);
      const delivs = await storage.getDeliveriesByMatch(match.id);
      if (delivs.length > 0) {
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
    parts.push("=== PLAYER PROFILES ===");
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

async function getPostMatchContext(query: string, prePlan?: string): Promise<string> {
  const parts: string[] = [];

  if (prePlan) {
    parts.push("=== PRE-MATCH PLAN ===");
    parts.push(prePlan);
    parts.push("---");
  }

  const keywords = extractKeywords(query);
  const matchResults = await Promise.all(
    keywords.slice(0, 4).map(kw => storage.searchMatches(kw))
  );
  const uniqueMatches = new Map();
  matchResults.flat().forEach(m => uniqueMatches.set(m.id, m));
  let relevantMatches = Array.from(uniqueMatches.values()).slice(0, 3);
  if (relevantMatches.length === 0) {
    const allMatches = await storage.getMatches();
    relevantMatches = allMatches.slice(0, 2);
  }
  if (relevantMatches.length > 0) {
    parts.push("=== REFERENCE MATCH DATA ===");
    for (const match of relevantMatches) {
      parts.push(`Match: ${match.matchTitle} | Result: ${match.result}`);
      if (match.scorecardUrl) parts.push(`Scorecard: ${match.scorecardUrl}`);
      parts.push("---");
    }
  }

  return parts.join("\n");
}

async function getPlayerContext(query: string, playerName?: string, matchContext?: string): Promise<string> {
  const parts: string[] = [];

  if (playerName) {
    parts.push(`=== PLAYER CONTEXT ===`);
    parts.push(`Player name: ${playerName}`);
    parts.push("---");
  }

  if (matchContext) {
    parts.push("=== MATCH ANALYSIS CONTEXT ===");
    parts.push(matchContext);
    parts.push("---");
  }

  const keywords = extractKeywords(query);
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

export async function getRAGContext(
  mode: AppMode,
  query: string,
  opts?: { squadContext?: string; prePlan?: string; playerName?: string; matchContext?: string }
): Promise<string> {
  switch (mode) {
    case "pre-match":
      return getPreMatchContext(query, opts?.squadContext);
    case "post-match":
      return getPostMatchContext(query, opts?.prePlan);
    case "player":
      return getPlayerContext(query, opts?.playerName, opts?.matchContext);
    default:
      return "";
  }
}

const OUTPUT_FORMAT_INSTRUCTION = `

CRITICAL OUTPUT FORMAT RULES:
- Keep responses SHORT and ACTIONABLE. Do NOT write long essays unless the user explicitly asks for more detail.
- Structure every response using this format:

**What's Working:** (1-3 bullet points of positives or strengths)
**What Needs Improvement:** (1-3 bullet points of areas to fix)  
**Next Steps:** (2-4 specific, actionable steps to take)

- If the user says "more detail" or "explain more", THEN you can give a longer, comprehensive response.`;

const SYSTEM_PROMPTS: Record<string, string> = {
  "pre-match": `You are CricketIQ Pre-Match Planning Advisor, an expert cricket tactical analyst helping captains prepare for their next match.

You help captains with:
- Optimal batting order selection based on the squad and opposition
- Bowling rotation and spell allocation
- Field placement strategies for different phases (powerplay, middle overs, death)
- Opposition analysis and how to exploit their weaknesses
- Toss decision guidance based on conditions

Your responses must include:

**Batting Order:** List 1-11 with a brief rationale for each position (use the squad roster provided)
**Bowling Plan:** Spell allocations, who bowls in powerplay/middle/death and why
**Key Tactics:** 2-3 specific tactical priorities for the match
${OUTPUT_FORMAT_INSTRUCTION}

MATCH CITATIONS: When you reference relevant match situations from the provided data, include them at the END of your response:

<<CITATION>>
Match Title
Key details and why it's relevant
Scorecard: [Full Scorecard](URL_FROM_DATA)
<<END_CITATION>>

Include 1-2 citations per response when relevant. Place citations BEFORE the <<FOLLOWUP>> tag.`,

  "post-match": `You are CricketIQ Post-Match Analysis Advisor, helping captains analyse performance and learn from each game.

When the captain uploads scorecard images, analyse them carefully and compare against the pre-match plan provided.

Your analysis must follow this structure:

**What Went to Plan:** What the team executed as intended
**What Didn't Go to Plan:** Where execution deviated from strategy  
**Top Performers:** Who stood out and why
**Key Turning Points:** The moments that swung the match
**Team Takeaways:** 2-3 things to carry forward to the next match
${OUTPUT_FORMAT_INSTRUCTION}

SCORECARD ANALYSIS: When scorecards are uploaded:
1. Read each image carefully — extract runs, wickets, extras, bowling figures
2. Compare actual performance against the pre-match plan (provided in context)
3. Identify patterns across multiple scorecards if provided

MATCH CITATIONS: Include citations at the END when referencing match data:

<<CITATION>>
Match Title
Key details and why it's relevant
Scorecard: [Full Scorecard](URL_FROM_DATA)
<<END_CITATION>>`,

  "player": `You are CricketIQ Personal Performance Coach, helping individual cricketers understand and improve their performance.

You receive the player's name, the post-match analysis, and the scorecard. Address the player DIRECTLY by name in your responses.

You help players with:
- Understanding their personal contribution to the match vs what was planned
- Specific technique improvements based on how they performed
- Mental game and decision-making analysis
- Actionable drills to address identified weaknesses

${OUTPUT_FORMAT_INSTRUCTION}

MANDATORY DRILLS: You MUST ALWAYS include at least 2 specific drills in EVERY response:

**Drills to Try:**
1. **[Drill Name]** - [Brief description, how to do it, sets/reps or duration]
2. **[Drill Name]** - [Brief description, how to do it, sets/reps or duration]

IMAGE ANALYSIS: When scorecards are in context, refer to the player's specific figures. Be direct and personal — the player wants to know exactly what they did and how to improve it.`,

  "player-analysis": `You are CricketIQ Personal Performance Coach, helping individual cricketers understand and improve their performance.

You receive the player's name, the post-match analysis, the pre-match plan, and the scorecard images. Address the player DIRECTLY by name.

Be personal, direct, and constructive. The player is using this to understand their own game.

${OUTPUT_FORMAT_INSTRUCTION}

MANDATORY DRILLS: Include at least 2 specific drills in EVERY response:

**Drills to Try:**
1. **[Drill Name]** - [Brief description, how to do it, sets/reps or duration]
2. **[Drill Name]** - [Brief description, how to do it, sets/reps or duration]`,
};

const MULTI_TURN_INSTRUCTION = `

CRITICAL FORMATTING REQUIREMENT - YOU MUST FOLLOW THIS:
You are having a multi-turn conversation. These rules are MANDATORY:

1. ALWAYS provide genuinely useful, actionable information in EVERY response. Never give a shallow or purely question-based response. Give real, detailed advice first.
2. You MUST end your response with EXACTLY ONE follow-up question using these EXACT tags on a new line at the very end:

<<FOLLOWUP>>Your follow-up question here?<<END_FOLLOWUP>>

This is NOT optional. You MUST include the <<FOLLOWUP>> and <<END_FOLLOWUP>> tags in every response. The tags are required for the UI to render properly.
3. The follow-up question should ask for specific details that would help you give better, more personalized advice in the next response.
4. If the user says "just give me your best answer" or "skip the questions", give your comprehensive answer WITHOUT the follow-up tags.`;

const FALLBACK_FOLLOWUPS: Record<string, string[]> = {
  "pre-match": [
    "What format is this match (T20, ODI, or Test) and who are you playing against?",
    "Which bowlers do you have available and what are their main strengths?",
    "Are there any injury concerns or unavailable players I should factor into the plan?",
  ],
  "post-match": [
    "What format was the match and what was the result?",
    "Which phases of the game do you feel went furthest from the plan?",
    "What specific areas would you like me to focus the analysis on?",
  ],
  "player": [
    "What is your primary role in the team — batter, bowler, or all-rounder?",
    "Which specific aspect of your performance are you most keen to improve?",
    "What specific match situations or deliveries are you finding most challenging right now?",
  ],
};

export function enforceCitations(response: string, mode: AppMode, ragContext: string): string {
  if ((mode === "pre-match" || mode === "post-match") && ragContext.includes("=== REFERENCE MATCH DATA ===")) {
    if (!response.includes("<<CITATION>>") || !response.includes("<<END_CITATION>>")) {
      const matchLines = ragContext.split("\n");
      const matchTitles: string[] = [];
      const matchDetails: string[] = [];
      const matchUrls: string[] = [];
      for (let i = 0; i < matchLines.length; i++) {
        if (matchLines[i].startsWith("Match: ")) {
          matchTitles.push(matchLines[i].replace("Match: ", "").split("|")[0].trim());
          let url = "";
          let detail = "";
          for (let j = i + 1; j < Math.min(i + 6, matchLines.length); j++) {
            if (matchLines[j].startsWith("Scorecard: ")) url = matchLines[j].replace("Scorecard: ", "");
            if (matchLines[j].startsWith("Match: ") || matchLines[j] === "---") break;
            detail = matchLines[j];
          }
          matchDetails.push(detail);
          matchUrls.push(url);
        }
      }
      if (matchTitles.length > 0) {
        const citations = matchTitles.slice(0, 2).map((title, i) => {
          const urlLine = matchUrls[i] ? `\nScorecard: [Full Scorecard](${matchUrls[i]})` : "";
          return `\n\n<<CITATION>>\n${title}\n${matchDetails[i] || "Relevant match from database"}${urlLine}\n<<END_CITATION>>`;
        });
        const followUpIdx = response.indexOf("<<FOLLOWUP>>");
        if (followUpIdx > -1) {
          return response.slice(0, followUpIdx).trim() + citations.join("") + "\n\n" + response.slice(followUpIdx);
        }
        return response.trim() + citations.join("");
      }
    }
  }
  return response;
}

export function enforceFollowUp(response: string, mode: AppMode, exchangeCount: number): string {
  if (exchangeCount >= 3) {
    return response.replace(/<<FOLLOWUP>>[\s\S]*?<<END_FOLLOWUP>>/g, "").trim();
  }
  if (!response.includes("<<FOLLOWUP>>") || !response.includes("<<END_FOLLOWUP>>")) {
    const fallbacks = FALLBACK_FOLLOWUPS[mode] || FALLBACK_FOLLOWUPS["player"];
    const idx = Math.min(exchangeCount - 1, fallbacks.length - 1);
    const fallbackQ = fallbacks[Math.max(0, idx)];
    return response.trim() + `\n\n<<FOLLOWUP>>${fallbackQ}<<END_FOLLOWUP>>`;
  }
  return response;
}

export function getSystemPrompt(
  mode: AppMode,
  exchangeCount: number,
  hasImage: boolean = false,
  extra?: { playerName?: string; isPlayerAnalysisPage?: boolean }
): string {
  const promptKey = extra?.isPlayerAnalysisPage ? "player-analysis" : mode;
  let prompt = (SYSTEM_PROMPTS[promptKey] || SYSTEM_PROMPTS["player"]) + MULTI_TURN_INSTRUCTION;

  if (extra?.playerName) {
    prompt = `The player's name is: ${extra.playerName}. Always address them by name.\n\n` + prompt;
  }

  if (hasImage) {
    prompt += `\n\nIMAGE ANALYSIS: The user has uploaded one or more images. Carefully analyse the visual content.
- If it shows a scorecard, extract runs, wickets, bowling figures, partnerships, extras
- If it shows a cricket action (batting/bowling), analyse technique in detail
- If it shows a team sheet or player stats, use those figures to personalise your advice
- Be specific — reference the actual numbers you can see`;
  }

  if (exchangeCount >= 3) {
    prompt += `\n\nIMPORTANT: This conversation has had ${exchangeCount} user messages. Give your FINAL, most comprehensive and personalized answer now. Do NOT include <<FOLLOWUP>> or <<END_FOLLOWUP>> tags. No more questions.`;
  } else {
    prompt += `\n\nREMINDER: This is exchange ${exchangeCount} of the conversation. You MUST include <<FOLLOWUP>>...<<END_FOLLOWUP>> tags at the end of your response with a relevant question. Do not forget.`;
  }

  return prompt;
}

export async function extractDataFromImage(
  imageUrl: string,
  extractionType: "squad" | "schedule" | "scorecard",
  openai: any,
  host: string
): Promise<any> {
  const prompts: Record<string, string> = {
    squad: `You are analysing a team sheet or squad list image. Extract all player information you can see.
Return a JSON array with this exact structure:
[{"name": "Player Name", "role": "Batter|Bowler|All-rounder|Wicketkeeper", "battingStyle": "Right-hand bat|Left-hand bat|", "bowlingStyle": "Right-arm fast|Right-arm medium|Left-arm medium|Off-spin|Leg-spin|Left-arm spin|" }]
Only return the JSON array, nothing else. If you cannot read certain fields, use empty string "".`,

    schedule: `You are analysing a cricket fixture list or season schedule image. Extract all matches you can see.
Return a JSON array with this exact structure:
[{"opponent": "Team Name", "matchDate": "DD/MM/YYYY or similar date text", "venue": "Ground Name or City", "format": "T20|ODI|Test|T10"}]
Only return the JSON array, nothing else. If you cannot read certain fields, use empty string "".`,

    scorecard: `You are analysing a cricket scorecard image. Extract the match summary.
Return a JSON object with this exact structure:
{"team1": "Team Name", "team2": "Team Name", "team1Score": "runs/wickets (overs)", "team2Score": "runs/wickets (overs)", "result": "Team won by X runs/wickets", "topBatter": "Name - runs", "topBowler": "Name - figures", "summary": "2-3 sentence match summary"}
Only return the JSON object, nothing else.`,
  };

  const absoluteUrl = imageUrl.startsWith("http") ? imageUrl : `${host}${imageUrl}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompts[extractionType] },
          { type: "image_url", image_url: { url: absoluteUrl } },
        ],
      },
    ],
    max_completion_tokens: 2000,
  });

  const text = response.choices[0]?.message?.content || "[]";
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return extractionType === "scorecard" ? {} : [];
  }
}
