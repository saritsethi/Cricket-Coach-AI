import { db } from "./db";
import { matches, deliveries, players, playerImages, equipment } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function seedDatabase() {
  const [existingMatch] = await db.select({ count: sql<number>`count(*)` }).from(matches);
  if (existingMatch.count > 0) {
    console.log("Database already seeded, skipping...");
    return;
  }

  console.log("Seeding database with cricket data...");

  const matchData = [
    {
      matchTitle: "India vs Australia - 1st T20I 2024",
      team1: "India", team2: "Australia", venue: "Wankhede Stadium, Mumbai",
      matchDate: "2024-11-15", matchType: "T20I",
      result: "India won by 6 wickets", tossWinner: "Australia", tossDecision: "bat",
      team1Score: "164/4 (18.5 ov)", team2Score: "160/8 (20 ov)",
      scorecardUrl: "https://www.espncricinfo.com/series/australia-tour-of-india-2024-25-1439778/india-vs-australia-1st-t20i-1439791/full-scorecard",
    },
    {
      matchTitle: "England vs South Africa - ICC World Cup Semi-Final",
      team1: "England", team2: "South Africa", venue: "Eden Gardens, Kolkata",
      matchDate: "2024-03-22", matchType: "ODI",
      result: "England won by 3 wickets", tossWinner: "England", tossDecision: "field",
      team1Score: "282/7 (49.2 ov)", team2Score: "279/8 (50 ov)",
      scorecardUrl: "https://www.espncricinfo.com/series/icc-cricket-world-cup-2023-24-1367856/england-vs-south-africa-semi-final-1367927/full-scorecard",
    },
    {
      matchTitle: "Australia vs Pakistan - 2nd Test 2024",
      team1: "Australia", team2: "Pakistan", venue: "MCG, Melbourne",
      matchDate: "2024-12-10", matchType: "Test",
      result: "Australia won by an innings and 48 runs", tossWinner: "Australia", tossDecision: "bat",
      team1Score: "462/7d", team2Score: "198 & 216",
      scorecardUrl: "https://www.espncricinfo.com/series/pakistan-tour-of-australia-2024-25-1443268/australia-vs-pakistan-2nd-test-1443277/full-scorecard",
    },
    {
      matchTitle: "Mumbai Indians vs Chennai Super Kings - IPL Final",
      team1: "Mumbai Indians", team2: "Chennai Super Kings", venue: "Narendra Modi Stadium, Ahmedabad",
      matchDate: "2024-05-26", matchType: "T20",
      result: "Mumbai Indians won by 5 wickets", tossWinner: "Chennai Super Kings", tossDecision: "bat",
      team1Score: "173/5 (19.4 ov)", team2Score: "170/6 (20 ov)",
      scorecardUrl: "https://www.espncricinfo.com/series/indian-premier-league-2024-1410320/mumbai-indians-vs-chennai-super-kings-final-1422146/full-scorecard",
    },
  ];

  const createdMatches = await db.insert(matches).values(matchData).returning();

  const deliveryData = [];
  const batters = ["Virat Kohli", "Rohit Sharma", "Steve Smith", "Jos Buttler", "Babar Azam"];
  const bowlers = ["Jasprit Bumrah", "Pat Cummins", "Rashid Khan", "Kagiso Rabada", "Shaheen Afridi"];
  const batterStyles = ["Right-hand bat", "Right-hand bat", "Right-hand bat", "Right-hand bat", "Right-hand bat"];
  const bowlerStyles = ["Right-arm fast", "Right-arm fast-medium", "Right-arm leg-spin", "Right-arm fast", "Left-arm fast"];
  const shotTypes = ["Cover drive", "Pull shot", "Sweep", "Cut", "Straight drive", "Flick", "Loft over mid-on", "Reverse sweep", "Hook", "Slog sweep"];
  const deliveryTypes = ["Good length", "Short ball", "Yorker", "Full toss", "Bouncer", "Slower ball", "Outswinger", "Inswinger", "Leg cutter", "Off cutter"];
  const lines = ["Off stump", "Middle stump", "Leg stump", "Outside off", "Wide outside off", "Down leg"];
  const lengths = ["Good length", "Short", "Full", "Yorker length", "Back of a length", "Overpitched"];
  const shotDirections = ["Cover", "Mid-wicket", "Long-on", "Third man", "Fine leg", "Square leg", "Point", "Mid-off", "Long-off", "Straight"];
  const fieldSets = [
    ["Slip", "Gully", "Point", "Cover", "Mid-off", "Mid-on", "Mid-wicket", "Square leg", "Fine leg"],
    ["Deep mid-wicket", "Long-on", "Long-off", "Deep cover", "Deep point", "Third man", "Fine leg", "Short fine leg", "Slip"],
    ["Two slips", "Gully", "Point", "Extra cover", "Mid-off", "Mid-on", "Square leg", "Deep square leg", "Long leg"],
    ["Short leg", "Silly point", "Slip", "Gully", "Point", "Cover", "Mid-off", "Mid-on", "Mid-wicket"],
  ];
  const wicketTypes = ["Bowled", "Caught", "LBW", "Run out", "Stumped", "Caught behind"];

  for (const match of createdMatches) {
    for (let innings = 1; innings <= 2; innings++) {
      for (let over = 0; over < 10; over++) {
        for (let ball = 1; ball <= 6; ball++) {
          const bi = Math.floor(Math.random() * batters.length);
          const bowi = Math.floor(Math.random() * bowlers.length);
          const runs = [0, 0, 0, 1, 1, 1, 2, 2, 4, 6][Math.floor(Math.random() * 10)];
          const isWicket = Math.random() < 0.05;
          const hasExtras = Math.random() < 0.08;

          deliveryData.push({
            matchId: match.id,
            innings,
            overNumber: over,
            ballNumber: ball,
            batter: batters[bi],
            batterStyle: batterStyles[bi],
            bowler: bowlers[bowi],
            bowlerStyle: bowlerStyles[bowi],
            nonStriker: batters[(bi + 1) % batters.length],
            runsScored: runs,
            extras: hasExtras ? 1 : 0,
            extraType: hasExtras ? ["Wide", "No ball", "Bye", "Leg bye"][Math.floor(Math.random() * 4)] : null,
            totalRuns: runs + (hasExtras ? 1 : 0),
            isWicket,
            wicketType: isWicket ? wicketTypes[Math.floor(Math.random() * wicketTypes.length)] : null,
            fielder: isWicket && Math.random() > 0.3 ? batters[Math.floor(Math.random() * batters.length)] : null,
            shotType: runs > 0 ? shotTypes[Math.floor(Math.random() * shotTypes.length)] : null,
            shotDirection: runs > 0 ? shotDirections[Math.floor(Math.random() * shotDirections.length)] : null,
            deliveryType: deliveryTypes[Math.floor(Math.random() * deliveryTypes.length)],
            lineOfDelivery: lines[Math.floor(Math.random() * lines.length)],
            lengthOfDelivery: lengths[Math.floor(Math.random() * lengths.length)],
            fieldPositions: fieldSets[Math.floor(Math.random() * fieldSets.length)],
          });
        }
      }
    }
  }

  for (let i = 0; i < deliveryData.length; i += 100) {
    await db.insert(deliveries).values(deliveryData.slice(i, i + 100));
  }

  await db.insert(players).values([
    {
      name: "Virat Kohli", country: "India", role: "Top-order Batter",
      battingStyle: "Right-hand bat", bowlingStyle: "Right-arm medium",
      specialization: "Chase master, all-format player",
      strengths: ["Cover drive", "Flick through mid-wicket", "Running between wickets", "Mental toughness in chases", "Consistency across formats"],
      weaknesses: ["Outside off stump early in innings", "Outswinging deliveries", "Occasional vulnerability to spin on turning tracks"],
      stats: { tests: { runs: 8848, average: 49.15, centuries: 29 }, odis: { runs: 13906, average: 58.18, centuries: 50 }, t20is: { runs: 4188, average: 52.73, centuries: 1 } },
    },
    {
      name: "Jasprit Bumrah", country: "India", role: "Fast Bowler",
      battingStyle: "Right-hand bat", bowlingStyle: "Right-arm fast",
      specialization: "Death overs specialist, yorker king",
      strengths: ["Yorker accuracy", "Deceptive slower ball", "Death over economy", "Ability to bowl at any phase", "Unorthodox action"],
      weaknesses: ["Injury concerns with unorthodox action", "Limited batting ability"],
      stats: { tests: { wickets: 159, average: 20.42, bestBowling: "6/27" }, odis: { wickets: 149, average: 23.69, economy: 4.64 }, t20is: { wickets: 85, average: 17.82, economy: 6.28 } },
    },
    {
      name: "Steve Smith", country: "Australia", role: "Top-order Batter",
      battingStyle: "Right-hand bat", bowlingStyle: "Right-arm leg-spin",
      specialization: "Test match specialist, unconventional technique",
      strengths: ["Leave and defense", "Playing spin", "Concentration and patience", "Unorthodox scoring shots", "Conversion of starts to big scores"],
      weaknesses: ["Susceptible to full deliveries early on", "Limited in T20 formats", "Shuffling across stumps can lead to LBW"],
      stats: { tests: { runs: 9685, average: 56.94, centuries: 32 }, odis: { runs: 4978, average: 43.84, centuries: 12 } },
    },
    {
      name: "Rashid Khan", country: "Afghanistan", role: "All-rounder",
      battingStyle: "Right-hand bat", bowlingStyle: "Right-arm leg-spin",
      specialization: "T20 specialist leg-spinner, aggressive lower-order bat",
      strengths: ["Googly variation", "Economy in middle overs", "Fearless batting", "Quick through the air", "Ability to take wickets in clusters"],
      weaknesses: ["Can be expensive on flat tracks", "Less effective in Test cricket", "Limited in longer formats"],
      stats: { t20is: { wickets: 130, average: 13.45, economy: 6.12 }, odis: { wickets: 170, average: 18.34 } },
    },
    {
      name: "Jos Buttler", country: "England", role: "Wicketkeeper-Batter",
      battingStyle: "Right-hand bat", bowlingStyle: null,
      specialization: "Explosive T20 opener, innovative shot-maker",
      strengths: ["Reverse sweep", "Ramp shot", "Power hitting in death overs", "360-degree scoring", "Match-winning ability under pressure"],
      weaknesses: ["Inconsistency in Test cricket", "Vulnerable against high-quality spin", "Can get out playing aerial shots"],
      stats: { t20is: { runs: 2843, average: 33.85, strikeRate: 144.52 }, odis: { runs: 4120, average: 40.78 } },
    },
    {
      name: "Pat Cummins", country: "Australia", role: "Fast Bowler",
      battingStyle: "Right-hand bat", bowlingStyle: "Right-arm fast-medium",
      specialization: "Test captain, pace spearhead",
      strengths: ["Bounce extraction", "Consistent line and length", "Leadership under pressure", "Useful lower-order bat", "Stamina for long spells"],
      weaknesses: ["Injury history", "Can be expensive in T20s", "Limited variations compared to death overs specialists"],
      stats: { tests: { wickets: 275, average: 21.68, bestBowling: "5/38" }, odis: { wickets: 96, average: 27.34 } },
    },
    {
      name: "Babar Azam", country: "Pakistan", role: "Top-order Batter",
      battingStyle: "Right-hand bat", bowlingStyle: null,
      specialization: "Elegant stroke-maker, all-format captain",
      strengths: ["Timing and placement", "Cover drive mastery", "Consistency across formats", "Ability to anchor innings", "Strike rotation"],
      weaknesses: ["Scoring rate in T20s under scrutiny", "Vulnerability to express pace", "Pressure of captaincy on batting"],
      stats: { t20is: { runs: 4145, average: 41.04, strikeRate: 129.65 }, odis: { runs: 5729, average: 56.72, centuries: 19 } },
    },
    {
      name: "Kagiso Rabada", country: "South Africa", role: "Fast Bowler",
      battingStyle: "Left-hand bat", bowlingStyle: "Right-arm fast",
      specialization: "Pace spearhead, strike bowler",
      strengths: ["Raw pace and bounce", "Wicket-taking ability", "New ball mastery", "Reverse swing", "Big-match temperament"],
      weaknesses: ["Occasional no-balls", "Can leak runs in death overs", "Fitness management"],
      stats: { tests: { wickets: 290, average: 22.56 }, odis: { wickets: 132, average: 27.11 }, t20is: { wickets: 48, average: 23.71 } },
    },
  ]);

  await db.insert(equipment).values([
    {
      name: "Gray-Nicolls Kronus 800", category: "Cricket Bat", brand: "Gray-Nicolls",
      description: "Premium English willow bat with massive edges and a high sweet spot. Ideal for aggressive stroke play with excellent power through the V.",
      rating: 4.7, priceRange: "$350-$500",
      suitableFor: ["Professional", "Advanced club", "Power hitters"],
      pros: ["Grade 1 English willow", "Massive edges for power", "Well-balanced pick-up", "Traditional pressing technique"],
      cons: ["Premium price point", "Requires knocking in", "May be heavy for some players"],
      specifications: { weight: "2lb 8oz - 2lb 12oz", grains: "6-12", edgeThickness: "38mm", sweetSpot: "Mid-High" },
    },
    {
      name: "Kookaburra Ghost Pro", category: "Cricket Bat", brand: "Kookaburra",
      description: "A beautifully crafted bat with a classic profile. Features Kookaburra's signature clean hitting and well-rounded performance.",
      rating: 4.5, priceRange: "$300-$450",
      suitableFor: ["Professional", "Semi-professional", "All-round batters"],
      pros: ["Excellent balance", "Clean grain structure", "Good for front foot play", "Durable willow"],
      cons: ["Sweet spot takes time to develop", "Limited edge size", "Conservative design"],
      specifications: { weight: "2lb 7oz - 2lb 11oz", grains: "7-14", edgeThickness: "36mm", sweetSpot: "Mid" },
    },
    {
      name: "Masuri V-Series Elite", category: "Helmet", brand: "Masuri",
      description: "International standard cricket helmet with titanium grille and superior ventilation. Meets latest ICC safety standards for all levels of play.",
      rating: 4.8, priceRange: "$200-$350",
      suitableFor: ["Professional", "Club cricket", "All formats"],
      pros: ["Titanium grille for visibility", "BSI certified", "Excellent ventilation", "Lightweight design", "Adjustable fit system"],
      cons: ["Higher price than entry-level", "Titanium grille needs careful handling", "Limited color options"],
      specifications: { standard: "BSI 7928:2013", grilleMaterial: "Titanium", weight: "600g", ventilation: "12 air vents" },
    },
    {
      name: "SG Sierra 350", category: "Cricket Bat", brand: "SG",
      description: "Indian-made bat crafted from Grade 1 Kashmir willow with an expanded sweet spot. Known for excellent performance on subcontinental pitches.",
      rating: 4.3, priceRange: "$150-$250",
      suitableFor: ["Club cricket", "League matches", "Spin-friendly conditions"],
      pros: ["Excellent value for money", "Great for Indian conditions", "Light pick-up", "Pre-knocked profile"],
      cons: ["Kashmir willow has shorter lifespan", "Less power than English willow", "Limited availability outside India"],
      specifications: { weight: "2lb 5oz - 2lb 9oz", willowType: "Grade 1 Kashmir", edgeThickness: "34mm", sweetSpot: "Low-Mid" },
    },
    {
      name: "New Balance CK4030 v5", category: "Cricket Shoes", brand: "New Balance",
      description: "Lightweight cricket shoes with full-length cushioning and spike outsole for superior grip. Designed for fast bowlers and agile fielders.",
      rating: 4.6, priceRange: "$120-$180",
      suitableFor: ["Fast bowlers", "Fielders", "All surfaces"],
      pros: ["REVlite midsole cushioning", "Excellent ankle support", "Durable rubber spikes", "Breathable mesh upper", "Lightweight design"],
      cons: ["Spikes wear out on hard surfaces", "Narrow fit for wide feet", "Limited color choices"],
      specifications: { weight: "310g", soleType: "Full metal spike", cushioning: "REVlite", upperMaterial: "Mesh + synthetic" },
    },
    {
      name: "BOLA Professional Bowling Machine", category: "Bowling Machine", brand: "BOLA",
      description: "Programmable bowling machine capable of simulating all types of deliveries. Used by international cricket teams for practice sessions.",
      rating: 4.9, priceRange: "$2000-$3500",
      suitableFor: ["Cricket academies", "Professional teams", "Serious club setups"],
      pros: ["Programmable delivery sequences", "Simulates pace up to 95mph", "Spin and swing capabilities", "Remote control operation", "Durable construction"],
      cons: ["Very expensive", "Requires power source", "Heavy and not easily portable", "Maintenance costs"],
      specifications: { maxSpeed: "95 mph", deliveryTypes: "Pace, Swing, Spin, Seam", ballCapacity: "30 balls", power: "240V mains" },
    },
    {
      name: "Kookaburra Turf Ball (Red)", category: "Cricket Ball", brand: "Kookaburra",
      description: "Official match ball used in international cricket in Australia, New Zealand, and South Africa. Four-piece construction with hand-stitched seam.",
      rating: 4.4, priceRange: "$30-$50",
      suitableFor: ["First-class cricket", "Test matches", "Professional leagues"],
      pros: ["Consistent seam quality", "Good swing for first 15-20 overs", "Durable lacquer coating", "Approved for international cricket"],
      cons: ["Seam flattens faster than Dukes", "Less lateral movement after 30 overs", "Lacquer can chip on abrasive pitches"],
      specifications: { weight: "155.9-163g", circumference: "224-229mm", construction: "Four-piece", seamType: "Hand-stitched" },
    },
    {
      name: "SS Gladiator Batting Pads", category: "Batting Pads", brand: "SS (Sareen Sports)",
      description: "Lightweight yet protective batting pads with triple-wing bolster and high-density foam. Designed for maximum mobility and protection.",
      rating: 4.2, priceRange: "$60-$100",
      suitableFor: ["Club cricket", "League matches", "Training"],
      pros: ["Lightweight construction", "Good knee protection", "Easy strap system", "Affordable for quality", "Available in multiple sizes"],
      cons: ["Not as protective as premium models", "Straps wear over time", "Minimal shin coverage"],
      specifications: { padding: "High-density PU foam", kneeBolster: "Triple-wing", weight: "750g per pad", sizes: "Youth, Adult, Large Adult" },
    },
  ]);

  const allPlayers = await db.select().from(players);
  const imageData: { playerId: number; role: string; actionType: string; description: string; imageUrl: string }[] = [];

  for (const p of allPlayers) {
    if (p.battingStyle) {
      imageData.push(
        { playerId: p.id, role: "batter", actionType: "stance", description: `${p.name} in batting stance, ${p.battingStyle}`, imageUrl: `/images/players/${p.name.toLowerCase().replace(/\s+/g, "-")}-stance.jpg` },
        { playerId: p.id, role: "batter", actionType: "cover_drive", description: `${p.name} playing a cover drive`, imageUrl: `/images/players/${p.name.toLowerCase().replace(/\s+/g, "-")}-cover-drive.jpg` },
        { playerId: p.id, role: "batter", actionType: "pull_shot", description: `${p.name} playing a pull shot`, imageUrl: `/images/players/${p.name.toLowerCase().replace(/\s+/g, "-")}-pull.jpg` },
      );
    }
    if (p.bowlingStyle && p.bowlingStyle !== "Right-arm medium") {
      imageData.push(
        { playerId: p.id, role: "bowler", actionType: "delivery_stride", description: `${p.name} in delivery stride, ${p.bowlingStyle}`, imageUrl: `/images/players/${p.name.toLowerCase().replace(/\s+/g, "-")}-delivery.jpg` },
        { playerId: p.id, role: "bowler", actionType: "bowling_action", description: `${p.name} bowling action front-on view`, imageUrl: `/images/players/${p.name.toLowerCase().replace(/\s+/g, "-")}-action.jpg` },
      );
    }
  }

  if (imageData.length > 0) {
    await db.insert(playerImages).values(imageData);
  }

  console.log("Database seeded successfully!");
}
