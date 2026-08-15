// POST /api/check-results
// Body: { weekDate: "2026-08-15", legs: [{ index, market, selection }] }
// Returns: [{ index, result: "won" | "lost" | "pending", note }]
//
// Uses football-data.org's free tier (12 major competitions, 10 req/min,
// no credit card) to pull real fixtures and scores, then works out each
// leg's outcome with plain string/number matching — no AI involved, so
// this costs nothing to run.

function addDays(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function teamNameVariants(team) {
  const base = team.name || "";
  const stripped = base.replace(/\s*(FC|CF|AFC|CD|SC)\.?$/i, "").trim();
  return [base, stripped, team.shortName, team.tla].filter(Boolean).map((s) => s.toLowerCase());
}

function teamAppearsIn(text, team) {
  return teamNameVariants(team).some((v) => v.length > 2 && text.includes(v));
}

function findMatch(selectionLower, matches) {
  return matches.find((m) => teamAppearsIn(selectionLower, m.homeTeam) && teamAppearsIn(selectionLower, m.awayTeam));
}

function pickedTeam(selectionLower, match) {
  // Which team the free text is actually backing, based on wording like
  // "Arsenal to beat Chelsea" or "Arsenal to win".
  const home = match.homeTeam;
  const away = match.awayTeam;
  const homeIdx = Math.min(...teamNameVariants(home).map((v) => selectionLower.indexOf(v)).filter((i) => i >= 0), Infinity);
  const awayIdx = Math.min(...teamNameVariants(away).map((v) => selectionLower.indexOf(v)).filter((i) => i >= 0), Infinity);
  if (/\bdraw\b/.test(selectionLower) && !/win|beat/.test(selectionLower)) return "draw";
  if (homeIdx === Infinity || awayIdx === Infinity) return null;
  // Whichever team name appears first in the sentence is treated as the pick,
  // e.g. "Arsenal to beat Chelsea" or "Arsenal win vs Chelsea".
  return homeIdx < awayIdx ? "home" : "away";
}

function checkLeg(leg, matches) {
  const { index, market = "", selection = "" } = leg;
  const text = (selection || "").toLowerCase();
  const marketLower = market.toLowerCase();

  if (!text.trim()) return { index, result: "pending", note: "no pick entered" };

  const match = findMatch(text, matches);
  if (!match) return { index, result: "pending", note: "couldn't find a matching fixture" };

  const homeName = match.homeTeam.shortName || match.homeTeam.name;
  const awayName = match.awayTeam.shortName || match.awayTeam.name;

  if (match.status !== "FINISHED") {
    return { index, result: "pending", note: `${homeName} vs ${awayName} not finished yet` };
  }

  const home = match.score.fullTime.home;
  const away = match.score.fullTime.away;
  if (home === null || away === null) {
    return { index, result: "pending", note: "score not available yet" };
  }
  const scoreline = `${homeName} ${home}-${away} ${awayName}`;

  // Match result / double chance / draw no bet
  if (marketLower.includes("result") || marketLower.includes("double chance") || marketLower.includes("draw no bet")) {
    const pick = pickedTeam(text, match);
    const actualWinner = home > away ? "home" : away > home ? "away" : "draw";
    if (marketLower.includes("double chance")) {
      const coversDraw = text.includes("draw");
      const win = pick === actualWinner || (coversDraw && actualWinner === "draw");
      return { index, result: win ? "won" : "lost", note: scoreline };
    }
    if (marketLower.includes("draw no bet") && actualWinner === "draw") {
      return { index, result: "pending", note: `${scoreline} (draw — stake void on Draw No Bet)` };
    }
    if (pick === null) return { index, result: "pending", note: `couldn't tell which side was backed (${scoreline})` };
    return { index, result: pick === actualWinner ? "won" : "lost", note: scoreline };
  }

  // Both teams to score (+ optional combined result)
  if (marketLower.includes("both teams to score") || marketLower.includes("btts")) {
    const bttsHit = home > 0 && away > 0;
    if (marketLower.includes("result")) {
      const pick = pickedTeam(text, match);
      const actualWinner = home > away ? "home" : away > home ? "away" : "draw";
      const win = bttsHit && pick === actualWinner;
      return { index, result: win ? "won" : "lost", note: scoreline };
    }
    const wantsBtts = !text.includes("no") && !marketLower.includes("no");
    return { index, result: bttsHit === wantsBtts ? "won" : "lost", note: scoreline };
  }

  // Over/under goals
  if (marketLower.includes("over") || marketLower.includes("under") || marketLower.includes("goals")) {
    const thresholdMatch = (market + " " + selection).match(/(\d+(\.\d+)?)/);
    const threshold = thresholdMatch ? parseFloat(thresholdMatch[1]) : 2.5;
    const isOver = text.includes("over") || marketLower.includes("over");
    const total = home + away;
    const hit = isOver ? total > threshold : total < threshold;
    return { index, result: hit ? "won" : "lost", note: `${scoreline} (${total} goals)` };
  }

  // Correct score
  if (marketLower.includes("correct score")) {
    const scoreMatch = selection.match(/(\d+)\s*[-:]\s*(\d+)/);
    if (!scoreMatch) return { index, result: "pending", note: `couldn't read the predicted score (${scoreline})` };
    const predA = parseInt(scoreMatch[1], 10);
    const predB = parseInt(scoreMatch[2], 10);
    // Assume the predicted score was written in the same team order as it
    // appears in the selection text (first-named team's score first).
    const pick = pickedTeam(text, match);
    const predHome = pick === "away" ? predB : predA;
    const predAway = pick === "away" ? predA : predB;
    const hit = predHome === home && predAway === away;
    return { index, result: hit ? "won" : "lost", note: scoreline };
  }

  // Clean sheet
  if (marketLower.includes("clean sheet")) {
    const pick = pickedTeam(text, match);
    if (pick === null || pick === "draw") return { index, result: "pending", note: `couldn't tell which team was backed (${scoreline})` };
    const conceded = pick === "home" ? away : home;
    return { index, result: conceded === 0 ? "won" : "lost", note: scoreline };
  }

  // Handicap
  if (marketLower.includes("handicap")) {
    const hcMatch = selection.match(/([+-]?\d+(\.\d+)?)/);
    if (!hcMatch) return { index, result: "pending", note: `couldn't read the handicap (${scoreline})` };
    const hc = parseFloat(hcMatch[1]);
    const pick = pickedTeam(text, match);
    if (pick === null || pick === "draw") return { index, result: "pending", note: `couldn't tell which team was backed (${scoreline})` };
    const adjusted = pick === "home" ? home + hc : away + hc;
    const other = pick === "home" ? away : home;
    return { index, result: adjusted > other ? "won" : "lost", note: scoreline };
  }

  // Anything needing player-level data (goalscorer, cards, corners) isn't
  // available on the free tier — leave it for a human to mark.
  return { index, result: "pending", note: `${scoreline} — this market needs a manual check (no player-level data on the free tier)` };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST" });
    return;
  }

  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) {
    res.status(500).json({ error: "FOOTBALL_DATA_TOKEN is not set on the server" });
    return;
  }

  try {
    const { weekDate, legs } = req.body || {};
    if (!weekDate || !Array.isArray(legs)) {
      res.status(400).json({ error: "Body must include weekDate and legs[]" });
      return;
    }

    const from = weekDate;
    const to = addDays(weekDate, 4);
    const url = `https://api.football-data.org/v4/matches?dateFrom=${from}&dateTo=${to}`;
    const apiRes = await fetch(url, { headers: { "X-Auth-Token": token } });

    if (!apiRes.ok) {
      res.status(502).json({ error: `football-data.org returned ${apiRes.status}` });
      return;
    }

    const data = await apiRes.json();
    const matches = data.matches || [];
    const results = legs.map((leg) => checkLeg(leg, matches));
    res.status(200).json(results);
  } catch (err) {
    res.status(500).json({ error: err.message || "Unexpected error" });
  }
}
