import { useState, useEffect, useMemo, useRef } from "react";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Trophy,
  Calendar,
  Check,
  X,
  Clock,
  RotateCcw,
  Banknote,
  Shuffle,
  Target,
  Settings,
  Sparkles,
  Loader2,
  Lock,
  Unlock,
  Search,
  RefreshCw,
  Share2,
  ListChecks,
} from "lucide-react";
import { getSeason, setSeason, subscribeToSeason } from "./lib/storage";

const PLAYERS = ["James", "Matt", "Zak", "Lee", "Sam"];
const STORAGE_KEY = "acca-club-season";
const STAKE = 10;
const SEASON_START_DATE = "2026-08-15";

function addDays(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Sample season used purely for the "what could this look like" preview.
// Never touches real storage — five weeks, deliberately covering every
// stage of the workflow: a win, a loss, a split multi-acca week, a bet
// that's placed but not settled yet, and one still mid pick-submission.
const DEMO_ROTATION = ["Zak", "Sam", "James", "Lee", "Matt"];

const df = (player, market, legs) => ({
  id: `demo-fold-${player}-${market}`.replace(/\s/g, ""),
  folds: legs.map((l, i) => ({
    id: `df-${player}-${i}`,
    player: l.player,
    selection: l.selection,
    odds: l.odds || "",
    result: l.result || "pending",
    submitted: l.submitted !== false,
  })),
});

const DEMO_WEEKS = [
  {
    id: "demo-w5",
    weekNumber: 5,
    date: "2026-09-12",
    player: "Matt",
    slips: [
      {
        ...df("Matt", "PlayerCarded", [
          { player: "Zak", selection: "Casemiro to be carded", submitted: true },
          { player: "Sam", selection: "Declan Rice to be carded", submitted: true },
          { player: "James", selection: "Virgil van Dijk to be carded", submitted: true },
          { player: "Lee", selection: "", submitted: false },
          { player: "Matt", selection: "Bruno Fernandes to be carded", submitted: true },
        ]),
        stake: 10,
        market: "Player to be Carded",
        customMarket: "",
        confirmed: false,
        confirmedBy: "",
        confirmedAt: null,
        settled: false,
        settledBy: "",
        settledAt: null,
      },
    ],
  },
  {
    id: "demo-w4",
    weekNumber: 4,
    date: "2026-09-05",
    player: "Lee",
    slips: [
      {
        ...df("Lee", "Handicap", [
          { player: "Zak", selection: "Arsenal -1.5 vs Everton", odds: "1.95" },
          { player: "Sam", selection: "Man City -2 vs Wolves", odds: "2.10" },
          { player: "James", selection: "Liverpool -1 vs Brentford", odds: "1.80" },
          { player: "Lee", selection: "Newcastle -1 vs Fulham", odds: "2.05" },
          { player: "Matt", selection: "Spurs -1 vs Burnley", odds: "1.88" },
        ]),
        stake: 10,
        market: "Handicap",
        customMarket: "",
        confirmed: true,
        confirmedBy: "Lee",
        confirmedAt: Date.parse("2026-09-05T18:30:00"),
        settled: false,
        settledBy: "",
        settledAt: null,
      },
    ],
  },
  {
    id: "demo-w3",
    weekNumber: 3,
    date: "2026-08-29",
    player: "James",
    slips: [
      {
        ...df("James", "OU25", [
          { player: "Zak", selection: "Man Utd vs Chelsea — Over 2.5", odds: "1.72", result: "won" },
          { player: "Sam", selection: "Villa vs West Ham — Over 2.5", odds: "1.90", result: "won" },
          { player: "James", selection: "Brighton vs Palace — Under 2.5", odds: "2.00", result: "won" },
          { player: "Lee", selection: "Forest vs Bournemouth — Over 2.5", odds: "1.85", result: "won" },
          { player: "Matt", selection: "Everton vs Wolves — Under 2.5", odds: "2.15", result: "won" },
        ]),
        stake: 5,
        market: "Over/Under 2.5 Goals",
        customMarket: "",
        confirmed: true,
        confirmedBy: "James",
        confirmedAt: Date.parse("2026-08-29T17:00:00"),
        settled: true,
        settledBy: "James",
        settledAt: Date.parse("2026-08-31T21:15:00"),
      },
      {
        ...df("James", "CorrectScore", [
          { player: "Zak", selection: "Arsenal 2-1 Fulham", odds: "9/1", result: "lost" },
          { player: "Sam", selection: "Man City 3-0 Burnley", odds: "8/1", result: "won" },
          { player: "James", selection: "Liverpool 2-0 Brentford", odds: "15/2", result: "lost" },
          { player: "Lee", selection: "Newcastle 1-1 Everton", odds: "6/1", result: "lost" },
          { player: "Matt", selection: "Spurs 2-1 Wolves", odds: "10/1", result: "won" },
        ]),
        stake: 5,
        market: "Correct Score",
        customMarket: "",
        confirmed: true,
        confirmedBy: "James",
        confirmedAt: Date.parse("2026-08-29T17:02:00"),
        settled: true,
        settledBy: "James",
        settledAt: Date.parse("2026-08-31T21:16:00"),
      },
    ],
  },
  {
    id: "demo-w2",
    weekNumber: 2,
    date: "2026-08-22",
    player: "Sam",
    slips: [
      {
        ...df("Sam", "BTTS", [
          { player: "Zak", selection: "Arsenal vs Brighton — BTTS", odds: "1.90", result: "won" },
          { player: "Sam", selection: "Chelsea vs Villa — BTTS", odds: "1.75", result: "won" },
          { player: "James", selection: "Man City vs Forest — BTTS", odds: "2.05", result: "lost" },
          { player: "Lee", selection: "Liverpool vs Wolves — BTTS", odds: "1.65", result: "won" },
          { player: "Matt", selection: "Newcastle vs Burnley — BTTS", odds: "1.80", result: "won" },
        ]),
        stake: 10,
        market: "Both Teams to Score",
        customMarket: "",
        confirmed: true,
        confirmedBy: "Sam",
        confirmedAt: Date.parse("2026-08-22T18:00:00"),
        settled: true,
        settledBy: "Sam",
        settledAt: Date.parse("2026-08-24T20:45:00"),
      },
    ],
  },
  {
    id: "demo-w1",
    weekNumber: 1,
    date: "2026-08-15",
    player: "Zak",
    slips: [
      {
        ...df("Zak", "MatchResult", [
          { player: "Zak", selection: "Arsenal to beat Wolves", odds: "1.55", result: "won" },
          { player: "Sam", selection: "Man City to beat Burnley", odds: "1.40", result: "won" },
          { player: "James", selection: "Liverpool to beat Bournemouth", odds: "1.65", result: "won" },
          { player: "Lee", selection: "Newcastle to beat Forest", odds: "1.80", result: "won" },
          { player: "Matt", selection: "Chelsea to beat Fulham", odds: "1.72", result: "won" },
        ]),
        stake: 10,
        market: "Match Result",
        customMarket: "",
        confirmed: true,
        confirmedBy: "Zak",
        confirmedAt: Date.parse("2026-08-15T17:45:00"),
        settled: true,
        settledBy: "Zak",
        settledAt: Date.parse("2026-08-17T21:00:00"),
      },
    ],
  },
];

const MARKET_OPTIONS = [
  "Match Result",
  "Both Teams to Score",
  "BTTS & Result",
  "Over 1.5 Goals",
  "Over/Under 2.5 Goals",
  "Correct Score",
  "Double Chance",
  "Draw No Bet",
  "Anytime Goalscorer",
  "First Goalscorer",
  "Player to be Carded",
  "Handicap",
  "Clean Sheet",
  "Total Cards",
  "Other",
];

const uid = () => Math.random().toString(36).slice(2, 9);

const shuffleArr = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const emptyFold = (player) => ({
  id: uid(),
  player,
  selection: "",
  odds: "",
  result: "pending",
  submitted: false,
});

const emptySlip = (rotation, stake) => ({
  id: uid(),
  stake,
  market: "",
  customMarket: "",
  confirmed: false,
  confirmedBy: "",
  confirmedAt: null,
  settled: false,
  settledBy: "",
  settledAt: null,
  autoSuggestions: null,
  autoCheckedAt: null,
  folds: rotation.map((p) => emptyFold(p)),
});

// First acca of the week is £10. Opening additional accas splits the £10
// budget evenly across all of them (still editable afterwards per acca).
function distributeStakes(slips) {
  if (slips.length <= 1) return slips.map((s) => ({ ...s, stake: STAKE }));
  const share = +(STAKE / slips.length).toFixed(2);
  return slips.map((s) => ({ ...s, stake: share }));
}

// Accepts either decimal odds ("2.5") or fractional odds ("5/2", "11/4", "9/1")
// and returns the decimal equivalent, or null if it can't be parsed.
function parseOdds(raw) {
  if (!raw) return null;
  const str = raw.trim();
  if (str.includes("/")) {
    const [numStr, denStr] = str.split("/");
    const num = parseFloat(numStr);
    const den = parseFloat(denStr);
    if (!num || !den) return null;
    return num / den + 1;
  }
  const dec = parseFloat(str);
  return dec > 0 ? dec : null;
}

function combinedOdds(folds) {
  const valid = folds.map((f) => parseOdds(f.odds)).filter((o) => o !== null);
  if (valid.length === 0) return null;
  return valid.reduce((acc, o) => acc * o, 1);
}

function slipStatus(slip) {
  if (slip.folds.some((f) => f.result === "lost")) return "lost";
  if (slip.folds.length > 0 && slip.folds.every((f) => f.result === "won")) return "won";
  return "pending";
}

function slipReturn(slip) {
  const status = slipStatus(slip);
  if (status !== "won") return 0;
  const odds = combinedOdds(slip.folds);
  return odds ? slip.stake * odds : 0;
}

function marketLabel(slip) {
  if (!slip.market) return "";
  if (slip.market === "Other") return slip.customMarket || "Other";
  return slip.market;
}

function fmt(n) {
  return `£${n.toFixed(2)}`;
}

function fmtSigned(n) {
  return `${n >= 0 ? "+" : "−"}£${Math.abs(n).toFixed(2)}`;
}

// Draws one acca as a shareable image: navy header, a row per leg, and a
// footer with stake/odds/return. Returns a <canvas>.
async function renderSlipImage(slip, weekNumber, weekDate) {
  await (document.fonts && document.fonts.ready ? document.fonts.ready.catch(() => {}) : Promise.resolve());

  const W = 1080;
  const HEADER_H = 220;
  const ROW_H = 130;
  const FOOTER_H = 200;
  const legs = slip.folds;
  const H = HEADER_H + legs.length * ROW_H + FOOTER_H;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  const HEAD_FONT = "'Work Sans', Arial, sans-serif";
  const MONO_FONT = "'IBM Plex Mono', 'Courier New', monospace";

  function wrapText(text, maxWidth, font) {
    ctx.font = font;
    const words = String(text || "").split(" ");
    const lines = [];
    let line = "";
    words.forEach((word) => {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);
    return lines.slice(0, 2);
  }

  // background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);

  // header
  ctx.fillStyle = "#0B2545";
  ctx.fillRect(0, 0, W, HEADER_H);
  ctx.fillStyle = "#C1272D";
  ctx.font = `700 26px ${HEAD_FONT}`;
  ctx.fillText("SKY BET CLUB", 60, 70);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `700 44px ${HEAD_FONT}`;
  ctx.fillText(`Week ${weekNumber} · ${legs.length}-fold`, 60, 130);
  ctx.fillStyle = "#AFC0D6";
  ctx.font = `500 26px ${HEAD_FONT}`;
  ctx.fillText(`${marketLabel(slip) || "Market not set"} — ${weekDate || ""}`, 60, 175);

  // legs
  let y = HEADER_H;
  legs.forEach((fold, i) => {
    if (i % 2 === 1) {
      ctx.fillStyle = "#F5F7FA";
      ctx.fillRect(0, y, W, ROW_H);
    }
    ctx.fillStyle = "#0B2545";
    ctx.font = `700 32px ${HEAD_FONT}`;
    ctx.fillText(fold.player, 60, y + 46);

    ctx.fillStyle = "#101828";
    const lines = wrapText(fold.selection || "(no pick entered)", W - 320, `400 28px ${HEAD_FONT}`);
    ctx.font = `400 28px ${HEAD_FONT}`;
    lines.forEach((line, li) => ctx.fillText(line, 60, y + 84 + li * 34));

    ctx.textAlign = "right";
    ctx.fillStyle = "#4B5A72";
    ctx.font = `600 30px ${MONO_FONT}`;
    ctx.fillText(fold.odds || "—", W - 60, y + 46);
    const resultColor = fold.result === "won" ? "#0B2545" : fold.result === "lost" ? "#C1272D" : "#8C97A8";
    const resultLabel = fold.result === "won" ? "WON" : fold.result === "lost" ? "LOST" : "PENDING";
    ctx.fillStyle = resultColor;
    ctx.font = `700 24px ${HEAD_FONT}`;
    ctx.fillText(resultLabel, W - 60, y + 82);
    ctx.textAlign = "left";

    y += ROW_H;
    ctx.strokeStyle = "rgba(11,37,69,0.1)";
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  });

  // footer
  const status = slipStatus(slip);
  const odds = combinedOdds(legs);
  const ret = slipReturn(slip);
  const footerBg = status === "won" ? "#0B2545" : status === "lost" ? "#8C1C21" : "#F2F4F7";
  const footerText = status === "pending" ? "#0B2545" : "#FFFFFF";
  ctx.fillStyle = footerBg;
  ctx.fillRect(0, y, W, FOOTER_H);

  ctx.fillStyle = footerText;
  ctx.font = `500 26px ${HEAD_FONT}`;
  ctx.fillText(`Stake ${fmt(slip.stake)}  ·  Odds ${odds ? odds.toFixed(2) : "—"}`, 60, y + 60);

  ctx.font = `700 50px ${HEAD_FONT}`;
  const resultText = status === "won" ? `Returns ${fmt(ret)}` : status === "lost" ? "Lost — returns £0.00" : `Potential ${odds ? fmt(slip.stake * odds) : "—"}`;
  ctx.fillText(resultText, 60, y + 130);

  return canvas;
}

// Shares the acca as an image via the native share sheet (WhatsApp shows up
// there directly on phones); falls back to a plain download on desktop.
async function shareSlipImage(slip, weekNumber, weekDate) {
  const canvas = await renderSlipImage(slip, weekNumber, weekDate);
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) return reject(new Error("Couldn't generate the image"));
      const fileName = `sky-bet-club-wk${weekNumber}.png`;
      const file = new File([blob], fileName, { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "Sky Bet Club", text: `Week ${weekNumber} acca` });
          resolve("shared");
          return;
        } catch (e) {
          if (e && e.name === "AbortError") {
            resolve("cancelled");
            return;
          }
          // fall through to download if the native share genuinely failed
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      resolve("downloaded");
    }, "image/png");
  });
}

// Superlatives for the season highlights front page: who's backed the
// boldest odds, who plays it safest, who's actually correct most often,
// biggest single week, and who wins most while holding the slip.
function computeAwards(weeks, allSlips, dutyStats, legStats) {
  let highestOdds = null;
  allSlips.forEach((s) => {
    const co = combinedOdds(s.folds);
    if (co !== null && (!highestOdds || co > highestOdds.odds)) {
      highestOdds = { player: s.player, odds: co };
    }
  });

  const withOdds = legStats.filter((p) => p.avgOdds !== null);
  const safest = withOdds.length ? withOdds.reduce((a, b) => (b.avgOdds < a.avgOdds ? b : a)) : null;

  const withWon = legStats.filter((p) => p.won > 0);
  const mostCorrect = withWon.length ? withWon.reduce((a, b) => (b.won > a.won ? b : a)) : null;

  const withAcc = legStats.filter((p) => p.accuracy !== null);
  const bestRate = withAcc.length ? withAcc.reduce((a, b) => (b.accuracy > a.accuracy ? b : a)) : null;

  let biggestWeek = null;
  weeks.forEach((w) => {
    const staked = w.slips.reduce((a, s) => a + s.stake, 0);
    const returns = w.slips.reduce((a, s) => a + slipReturn(s), 0);
    const profit = returns - staked;
    if (profit > 0 && (!biggestWeek || profit > biggestWeek.profit)) {
      biggestWeek = { player: w.player, profit, weekNumber: w.weekNumber };
    }
  });

  const withDutyWins = dutyStats.filter((p) => p.won > 0);
  const mostWins = withDutyWins.length ? withDutyWins.reduce((a, b) => (b.won > a.won ? b : a)) : null;

  return { highestOdds, safest, mostCorrect, bestRate, biggestWeek, mostWins };
}

// One-line "front page" headline naming the current season leader.
function seasonHeadline(dutyStats) {
  const active = dutyStats.filter((p) => p.won + p.lost + p.pending > 0);
  if (active.length === 0) return "No bets on the board yet — get week one started.";
  const leader = active[0];
  const weeksOnDuty = leader.won + leader.lost + leader.pending;
  const weekWord = `${weeksOnDuty} week${weeksOnDuty === 1 ? "" : "s"} on duty`;
  if (leader.profit > 0) return `${leader.name} leads the table, up ${fmt(leader.profit)} across ${weekWord}.`;
  if (leader.profit === 0) return `${leader.name} leads the table, break-even across ${weekWord}.`;
  return `${leader.name} leads the table — the group's down overall, but least of all at ${fmtSigned(leader.profit)}.`;
}

// Uses live web search to try to work out whether each leg actually won,
// based on the free-text selection each player typed in.
// Calls our own /api/check-results serverless function, which looks the
// fixtures up on football-data.org (free tier) and works out each leg's
// outcome from real scores — no AI involved, so this costs nothing to run.
async function checkLiveResults(slip, weekDate) {
  const legs = slip.folds.map((f, i) => ({
    index: i,
    market: marketLabel(slip) || "",
    selection: f.selection || "",
  }));

  const response = await fetch("/api/check-results", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ weekDate, legs }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "Live check request failed");
  }
  const parsed = await response.json();
  if (!Array.isArray(parsed)) throw new Error("Unexpected response shape");
  return parsed;
}

// Pure so it can crunch either the real (persisted) season or the local-only
// demo season used for the "what could this look like" preview.
function computeSeasonStats(weeks) {
  const allSlips = [];
  weeks.forEach((w) => w.slips.forEach((s) => allSlips.push({ ...s, player: w.player, weekNumber: w.weekNumber })));
  const allFolds = [];
  allSlips.forEach((s) => s.folds.forEach((f) => allFolds.push(f)));

  const totalStaked = allSlips.reduce((a, s) => a + s.stake, 0);
  const totalReturns = allSlips.reduce((a, s) => a + slipReturn(s), 0);
  const settledSlips = allSlips.filter((s) => slipStatus(s) !== "pending");
  const wonSlips = settledSlips.filter((s) => slipStatus(s) === "won");
  const seasonStats = {
    totalStaked,
    totalReturns,
    profit: totalReturns - totalStaked,
    bets: allSlips.length,
    won: wonSlips.length,
    lost: settledSlips.length - wonSlips.length,
    pending: allSlips.length - settledSlips.length,
    winRate: settledSlips.length ? (wonSlips.length / settledSlips.length) * 100 : 0,
  };

  const dutyStats = PLAYERS.map((p) => {
    const slips = allSlips.filter((s) => s.player === p);
    const staked = slips.reduce((a, s) => a + s.stake, 0);
    const returns = slips.reduce((a, s) => a + slipReturn(s), 0);
    const settled = slips.filter((s) => slipStatus(s) !== "pending");
    const won = settled.filter((s) => slipStatus(s) === "won");
    const accaOdds = slips.map((s) => combinedOdds(s.folds)).filter((o) => o !== null);
    const avgOdds = accaOdds.length ? accaOdds.reduce((a, o) => a + o, 0) / accaOdds.length : null;
    return {
      name: p,
      staked,
      returns,
      profit: returns - staked,
      won: won.length,
      lost: settled.length - won.length,
      pending: slips.length - settled.length,
      winRate: settled.length ? (won.length / settled.length) * 100 : null,
      avgOdds,
    };
  }).sort((a, b) => b.profit - a.profit);

  const legStats = PLAYERS.map((p) => {
    const folds = allFolds.filter((f) => f.player === p);
    const won = folds.filter((f) => f.result === "won").length;
    const lost = folds.filter((f) => f.result === "lost").length;
    const pending = folds.filter((f) => f.result === "pending").length;
    const decided = won + lost;
    const oddsVals = folds.map((f) => parseOdds(f.odds)).filter((o) => o !== null);
    const avgOdds = oddsVals.length ? oddsVals.reduce((a, o) => a + o, 0) / oddsVals.length : null;
    return {
      name: p,
      won,
      lost,
      pending,
      total: folds.length,
      accuracy: decided ? (won / decided) * 100 : null,
      avgOdds,
    };
  }).sort((a, b) => (b.accuracy ?? -1) - (a.accuracy ?? -1));

  return { allSlips, allFolds, seasonStats, dutyStats, legStats };
}

export default function AccaClub() {
  const [rotation, setRotation] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [showReset, setShowReset] = useState(false);
  const [showReshuffle, setShowReshuffle] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showDemo, setShowDemo] = useState(false);
  const autoCheckRef = useRef(new Set());

  const applyIncoming = (parsed, isInitial) => {
    setRotation(parsed.rotation || []);
    setWeeks(parsed.weeks || []);
    if (isInitial) {
      const exp = {};
      if (parsed.weeks && parsed.weeks.length) exp[parsed.weeks[0].id] = true;
      setExpanded(exp);
    }
  };

  const loadFromStorage = async (isInitial) => {
    try {
      const parsed = await getSeason();
      if (parsed) applyIncoming(parsed, isInitial);
    } catch (e) {
      console.error("Load failed", e);
    }
  };

  useEffect(() => {
    (async () => {
      await loadFromStorage(true);
      setLoading(false);
    })();
  }, []);

  // Live sync: Supabase pushes an update to every open tab the moment
  // anyone saves, so this fires near-instantly rather than waiting on a
  // timer. Skipped while someone's mid-typing so it doesn't yank focus.
  useEffect(() => {
    const unsubscribe = subscribeToSeason((parsed) => {
      const active = document.activeElement;
      const isTyping = active && ["INPUT", "SELECT", "TEXTAREA"].includes(active.tagName);
      if (!isTyping) applyIncoming(parsed, false);
    });
    return unsubscribe;
  }, []);

  // Slow fallback poll in case the realtime connection ever drops.
  useEffect(() => {
    const interval = setInterval(() => {
      const active = document.activeElement;
      const isTyping = active && ["INPUT", "SELECT", "TEXTAREA"].includes(active.tagName);
      if (!isTyping) loadFromStorage(false);
    }, 120000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await loadFromStorage(false);
    setRefreshing(false);
  };

  const persist = async (nextRotation, nextWeeks) => {
    setRotation(nextRotation);
    setWeeks(nextWeeks);
    try {
      await setSeason({ rotation: nextRotation, weeks: nextWeeks });
    } catch (e) {
      console.error("Save failed", e);
    }
  };

  const setRotationOnly = (r) => persist(r, weeks);
  const setWeeksOnly = (w) => persist(rotation, w);

  const nextPlayer = useMemo(() => {
    if (rotation.length === 0) return null;
    return rotation[weeks.length % rotation.length];
  }, [weeks, rotation]);

  const currentPlayer = weeks.length > 0 ? weeks[0].player : null;

  const addWeek = () => {
    const w = {
      id: uid(),
      weekNumber: weeks.length + 1,
      date: weeks.length === 0 ? SEASON_START_DATE : addDays(weeks[0].date, 7),
      player: nextPlayer,
      slips: [emptySlip(rotation, STAKE)],
    };
    setWeeksOnly([w, ...weeks]);
    setExpanded((e) => ({ ...e, [w.id]: true }));
  };

  const updateWeek = (weekId, patch) => setWeeksOnly(weeks.map((w) => (w.id === weekId ? { ...w, ...patch } : w)));
  const deleteWeek = (weekId) => setWeeksOnly(weeks.filter((w) => w.id !== weekId));
  const addSlip = (weekId) =>
    setWeeksOnly(
      weeks.map((w) =>
        w.id === weekId ? { ...w, slips: distributeStakes([...w.slips, emptySlip(rotation, 0)]) } : w
      )
    );
  const deleteSlip = (weekId, slipId) =>
    setWeeksOnly(
      weeks.map((w) =>
        w.id === weekId ? { ...w, slips: distributeStakes(w.slips.filter((s) => s.id !== slipId)) } : w
      )
    );
  const updateSlip = (weekId, slipId, patch) =>
    setWeeksOnly(
      weeks.map((w) =>
        w.id === weekId ? { ...w, slips: w.slips.map((s) => (s.id === slipId ? { ...s, ...patch } : s)) } : w
      )
    );
  const addFold = (weekId, slipId) =>
    setWeeksOnly(
      weeks.map((w) =>
        w.id === weekId
          ? {
              ...w,
              slips: w.slips.map((s) =>
                s.id === slipId
                  ? { ...s, folds: [...s.folds, emptyFold(rotation[s.folds.length % rotation.length])] }
                  : s
              ),
            }
          : w
      )
    );
  const deleteFold = (weekId, slipId, foldId) =>
    setWeeksOnly(
      weeks.map((w) =>
        w.id === weekId
          ? {
              ...w,
              slips: w.slips.map((s) =>
                s.id === slipId ? { ...s, folds: s.folds.filter((f) => f.id !== foldId) } : s
              ),
            }
          : w
      )
    );
  const updateFold = (weekId, slipId, foldId, patch) =>
    setWeeksOnly(
      weeks.map((w) =>
        w.id === weekId
          ? {
              ...w,
              slips: w.slips.map((s) =>
                s.id === slipId
                  ? { ...s, folds: s.folds.map((f) => (f.id === foldId ? { ...f, ...patch } : f)) }
                  : s
              ),
            }
          : w
      )
    );

  // Quiet background check: whenever anyone has the app open, look for
  // confirmed-but-unsettled bets from gameweeks that should be finished by
  // now and pull suggested results for them automatically. Nothing gets
  // applied without a person hitting "Apply" — this just saves someone
  // having to remember to click "Check live results" themselves.
  useEffect(() => {
    if (loading) return;
    const now = Date.now();
    const READY_AFTER = 3 * 24 * 60 * 60 * 1000;
    const COOLDOWN = 12 * 60 * 60 * 1000;

    weeks.forEach((w) => {
      const weekTime = new Date(w.date + "T00:00:00").getTime();
      if (Number.isNaN(weekTime) || now - weekTime < READY_AFTER) return;
      w.slips.forEach((s) => {
        if (!s.confirmed || s.settled) return;
        if (s.autoCheckedAt && now - s.autoCheckedAt < COOLDOWN) return;
        if (autoCheckRef.current.has(s.id)) return;
        autoCheckRef.current.add(s.id);
        checkLiveResults(s, w.date)
          .then((results) => {
            updateSlip(w.id, s.id, { autoSuggestions: results, autoCheckedAt: Date.now() });
          })
          .catch(() => {})
          .finally(() => {
            autoCheckRef.current.delete(s.id);
          });
      });
    });
  }, [weeks, loading]);

  const { seasonStats, dutyStats, legStats, allSlips } = useMemo(() => computeSeasonStats(weeks), [weeks]);
  const awards = useMemo(() => computeAwards(weeks, allSlips, dutyStats, legStats), [weeks, allSlips, dutyStats, legStats]);

  const doReset = () => {
    persist([], []);
    setShowReset(false);
  };

  const doReshuffle = () => {
    setRotationOnly([]);
    setShowReshuffle(false);
  };

  if (loading) {
    return (
      <div style={{ ...styles.wrap, alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <style>{FONT_IMPORT}</style>
        <div style={{ fontFamily: "'Work Sans', sans-serif", color: "#0B2545" }}>Loading the ledger…</div>
      </div>
    );
  }

  if (rotation.length === 0) {
    return <SetupScreen onDone={(r) => setRotationOnly(r)} />;
  }

  return (
    <div style={styles.wrap}>
      <style>{FONT_IMPORT}</style>

      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.eyebrow}>SEASON LEDGER — SHARED BY ALL FIVE MANAGERS</div>
          <h1 style={styles.title}>SKY BET CLUB</h1>
          <div style={styles.rotationRow}>
            {rotation.map((p) => {
              const isCurrent = p === currentPlayer;
              const isNext = !isCurrent && p === nextPlayer;
              return (
                <button
                  key={p}
                  onClick={() => setSelectedPlayer(p)}
                  style={{
                    ...styles.rotationChip,
                    ...(isCurrent ? styles.rotationChipActive : {}),
                    ...(isNext ? styles.rotationChipNext : {}),
                  }}
                  title={`View ${p}'s performance`}
                >
                  {p}
                </button>
              );
            })}
            <button style={styles.reshuffleIconBtn} onClick={() => setShowReshuffle(true)} title="Reshuffle rotation order">
              <Settings size={13} />
            </button>
          </div>
          <div style={styles.rotationLegend}>
            <span><span style={{ ...styles.legendDot, background: "#C1272D" }} /> this week</span>
            <span><span style={{ ...styles.legendDot, background: "#14335E" }} /> next week</span>
          </div>
        </div>
        <RotationQueue currentPlayer={currentPlayer} nextPlayer={nextPlayer} rotation={rotation} dutyStats={dutyStats} onSelectPlayer={setSelectedPlayer} />
      </header>

      {showReshuffle && (
        <div style={styles.confirmBox}>
          <span>Reshuffle the rotation order? Past weeks keep their recorded picker — this only changes who's suggested next.</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={styles.dangerBtn} onClick={doReshuffle}>Reshuffle</button>
            <button style={styles.ghostBtn} onClick={() => setShowReshuffle(false)}>Cancel</button>
          </div>
        </div>
      )}

      <SeasonHighlights dutyStats={dutyStats} legStats={legStats} awards={awards} />

      <section style={styles.statsStrip}>
        <StatBlock label="Staked" value={fmt(seasonStats.totalStaked)} />
        <StatBlock label="Returned" value={fmt(seasonStats.totalReturns)} />
        <StatBlock label="Record" value={`${seasonStats.won}W – ${seasonStats.lost}L`} sub={`${seasonStats.pending} pending`} />
      </section>

      <div style={styles.actionsRow}>
        <button style={styles.primaryBtn} onClick={addWeek}>
          <Plus size={18} strokeWidth={2.5} /> New week — {nextPlayer} is up
        </button>
        <button style={styles.ghostBtn} onClick={handleManualRefresh} disabled={refreshing}>
          <RefreshCw size={15} className={refreshing ? "spin" : ""} /> {refreshing ? "Syncing…" : "Refresh"}
        </button>
        <button style={styles.ghostBtn} onClick={() => setShowDemo(true)}>
          <Sparkles size={15} /> See a 5-week demo
        </button>
        {weeks.length > 0 && (
          <button style={styles.ghostBtn} onClick={() => setShowReset(true)}>
            <RotateCcw size={15} /> Reset season
          </button>
        )}
      </div>

      {showReset && (
        <div style={styles.confirmBox}>
          <span>Wipe every week and the rotation, and start a fresh season?</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={styles.dangerBtn} onClick={doReset}>Yes, clear it</button>
            <button style={styles.ghostBtn} onClick={() => setShowReset(false)}>Cancel</button>
          </div>
        </div>
      )}

      <main style={styles.weeksCol}>
        {weeks.length === 0 && (
          <div style={styles.emptyState}>
            <Banknote size={28} style={{ opacity: 0.5, marginBottom: 10 }} />
            <div style={{ fontFamily: "'Teko', sans-serif", fontSize: 24, letterSpacing: 0.5 }}>NO BETS ON THE BOARD YET</div>
            <div style={{ fontFamily: "'Work Sans', sans-serif", fontSize: 14, opacity: 0.75, marginTop: 4 }}>
              Start week one — {nextPlayer} is first up in the rotation.
            </div>
          </div>
        )}

        {weeks.map((w, i) => (
          <WeekCard
            key={w.id}
            week={w}
            rotation={rotation}
            rotated={i % 2 === 0}
            isOpen={!!expanded[w.id]}
            onToggle={() => setExpanded((e) => ({ ...e, [w.id]: !e[w.id] }))}
            onUpdateWeek={(patch) => updateWeek(w.id, patch)}
            onDeleteWeek={() => deleteWeek(w.id)}
            onAddSlip={() => addSlip(w.id)}
            onDeleteSlip={(sid) => deleteSlip(w.id, sid)}
            onUpdateSlip={(sid, patch) => updateSlip(w.id, sid, patch)}
            onAddFold={(sid) => addFold(w.id, sid)}
            onDeleteFold={(sid, fid) => deleteFold(w.id, sid, fid)}
            onUpdateFold={(sid, fid, patch) => updateFold(w.id, sid, fid, patch)}
          />
        ))}
      </main>

      {weeks.length > 0 && (
        <section style={styles.leaderboard}>
          <div style={styles.eyebrow}>ON-DUTY LEDGER</div>
          <h2 style={styles.subTitle}>P&amp;L WHILE HOLDING THE SLIP</h2>
          <div style={styles.leaderTable}>
            {dutyStats.map((p, idx) => (
              <div key={p.name} style={styles.leaderRow}>
                <div style={styles.leaderRank}>{idx === 0 && p.profit > 0 ? <Trophy size={16} color="#C1272D" /> : idx + 1}</div>
                <div style={styles.leaderNameBtn} onClick={() => setSelectedPlayer(p.name)}>{p.name}</div>
                <div style={styles.leaderRecord}>{p.won}W – {p.lost}L{p.pending ? ` · ${p.pending} pending` : ""}</div>
                <div style={{ ...styles.leaderProfit, color: p.profit >= 0 ? "#FFFFFF" : "#C1272D" }}>
                  {p.profit >= 0 ? "+" : "−"}{fmt(Math.abs(p.profit))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ ...styles.eyebrow, marginTop: 26 }}>LEG ACCURACY</div>
          <h2 style={styles.subTitle}>WHO ACTUALLY PICKS WINNERS</h2>
          <div style={styles.leaderTable}>
            {legStats.map((p, idx) => (
              <div key={p.name} style={styles.leaderRowOdds}>
                <div style={styles.leaderRank}>
                  {idx === 0 && p.accuracy !== null && p.accuracy > 50 ? <Target size={16} color="#C1272D" /> : idx + 1}
                </div>
                <div style={styles.leaderNameBtn} onClick={() => setSelectedPlayer(p.name)}>{p.name}</div>
                <div style={styles.leaderRecord}>{p.won}W – {p.lost}L{p.pending ? ` · ${p.pending} pending` : ""}</div>
                <div style={styles.leaderAvgOdds}>{p.avgOdds === null ? "avg —" : `avg ${p.avgOdds.toFixed(2)}`}</div>
                <div style={{ ...styles.leaderProfit, color: "#FFFFFF" }}>
                  {p.accuracy === null ? "—" : `${p.accuracy.toFixed(0)}%`}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {selectedPlayer && (
        <PlayerDetailModal
          player={selectedPlayer}
          weeks={weeks}
          dutyStats={dutyStats}
          legStats={legStats}
          onClose={() => setSelectedPlayer(null)}
        />
      )}

      {showDemo && <DemoPreview onClose={() => setShowDemo(false)} />}
    </div>
  );
}

// Odds-board styled: what each leg would have returned if it had been its
// own standalone bet at the same stake, instead of all combined into one
// all-or-nothing accumulator.
function SoloBetsModal({ slip, weekNumber, weekDate, onClose }) {
  const rows = slip.folds.map((f) => {
    const odds = parseOdds(f.odds);
    const soloReturn = f.result === "won" && odds ? slip.stake * odds : 0;
    return { ...f, odds, soloReturn };
  });
  const soloTotal = rows.reduce((a, r) => a + (r.result === "won" ? r.soloReturn : 0), 0);
  const actualReturn = slipReturn(slip);
  const anyPending = rows.some((r) => r.result === "pending");

  return (
    <div style={styles.termBackdrop} onClick={onClose}>
      <div style={styles.termPanel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.termHeader}>
          <div>
            <div style={styles.termEyebrow}>SKY BET CLUB // WK {weekNumber} · {weekDate}</div>
            <div style={styles.termTitle}>SOLO BETS — {marketLabel(slip) || "NO MARKET SET"}</div>
          </div>
          <button style={styles.termCloseBtn} onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        <div style={styles.termTableHead}>
          <span>PLAYER</span>
          <span>PICK</span>
          <span style={{ textAlign: "right" }}>ODDS</span>
          <span style={{ textAlign: "right" }}>SOLO RETURN</span>
        </div>
        {rows.map((r) => (
          <div key={r.id} style={styles.termRow}>
            <span style={styles.termPlayer}>{r.player}</span>
            <span style={styles.termPick}>{r.selection || "(no pick)"}</span>
            <span style={styles.termOdds}>{r.odds ? r.odds.toFixed(2) : "—"}</span>
            <span
              style={{
                ...styles.termReturn,
                color: r.result === "won" ? "#00D97E" : r.result === "lost" ? "#FF5C5C" : "#7A8A99",
              }}
            >
              {r.result === "won" ? `£${r.soloReturn.toFixed(2)}` : r.result === "lost" ? "£0.00" : "PENDING"}
            </span>
          </div>
        ))}

        <div style={styles.termFooter}>
          <div style={styles.termFooterRow}>
            <span>COMBINED IF SOLO{anyPending ? " (SO FAR)" : ""}</span>
            <span style={{ color: "#00D97E" }}>£{soloTotal.toFixed(2)}</span>
          </div>
          <div style={styles.termFooterRow}>
            <span>ACTUAL ACCA RETURN</span>
            <span style={{ color: slipStatus(slip) === "won" ? "#00D97E" : "#FF5C5C" }}>£{actualReturn.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerDetailModal({ player, weeks, dutyStats, legStats, onClose }) {
  const duty = dutyStats.find((p) => p.name === player);
  const legs = legStats.find((p) => p.name === player);
  const theirWeeks = weeks.filter((w) => w.player === player);

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.modalPanel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>{player}</h2>
          <button style={styles.iconBtnGhost} onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        <div style={styles.modalStatsGrid}>
          <div style={styles.modalStatCard}>
            <span style={styles.oddsSectionLabel}>ON DUTY</span>
            <span style={styles.modalStatBig}>{duty ? `${duty.won}W – ${duty.lost}L` : "—"}</span>
            <span style={styles.modalStatSub}>
              {duty && duty.winRate !== null ? `${duty.winRate.toFixed(0)}% win rate` : "no settled accas yet"}
              {duty && duty.pending ? ` · ${duty.pending} pending` : ""}
            </span>
          </div>
          <div style={styles.modalStatCard}>
            <span style={styles.oddsSectionLabel}>SEASON P&amp;L WHEN ON DUTY</span>
            <span style={{ ...styles.modalStatBig, color: duty && duty.profit >= 0 ? "#0B2545" : "#8C1C21" }}>
              {duty ? `${duty.profit >= 0 ? "+" : "−"}${fmt(Math.abs(duty.profit))}` : "—"}
            </span>
            <span style={styles.modalStatSub}>{duty ? `${fmt(duty.staked)} staked · ${fmt(duty.returns)} back` : ""}</span>
          </div>
          <div style={styles.modalStatCard}>
            <span style={styles.oddsSectionLabel}>AVG ACCA ODDS</span>
            <span style={styles.modalStatBig}>{duty && duty.avgOdds !== null ? duty.avgOdds.toFixed(2) : "—"}</span>
            <span style={styles.modalStatSub}>across accas placed on their weeks</span>
          </div>
          <div style={styles.modalStatCard}>
            <span style={styles.oddsSectionLabel}>THEIR LEG PICKS</span>
            <span style={styles.modalStatBig}>{legs && legs.accuracy !== null ? `${legs.accuracy.toFixed(0)}%` : "—"}</span>
            <span style={styles.modalStatSub}>
              {legs ? `${legs.won}W – ${legs.lost}L` : ""}{legs && legs.avgOdds !== null ? ` · avg ${legs.avgOdds.toFixed(2)}` : ""}
            </span>
          </div>
        </div>

        <div style={styles.modalHistoryLabel}>BETS PLACED ON THEIR WEEKS</div>
        {theirWeeks.length === 0 && <p style={styles.modalEmpty}>Hasn't been on duty yet this season.</p>}
        <div style={styles.modalHistoryList}>
          {theirWeeks.map((w) => (
            <div key={w.id} style={styles.modalWeekCard}>
              <div style={styles.modalWeekHeader}>
                <span style={styles.modalWeekTitle}>WK {w.weekNumber} · {w.date}</span>
              </div>
              {w.slips.map((slip, si) => {
                const st = slipStatus(slip);
                const co = combinedOdds(slip.folds);
                return (
                  <div key={slip.id} style={styles.modalSlipRow}>
                    <span style={styles.modalSlipMarket}>{marketLabel(slip) || "no market set"}</span>
                    <span style={styles.resultsOddsText}>{co ? co.toFixed(2) : "—"}</span>
                    <span style={styles.oddsSectionWaiting}>{fmt(slip.stake)}</span>
                    <StatusPill status={st} small />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DemoPreview({ onClose }) {
  const { seasonStats, dutyStats, legStats, allSlips } = computeSeasonStats(DEMO_WEEKS);
  const awards = computeAwards(DEMO_WEEKS, allSlips, dutyStats, legStats);
  const currentPlayer = DEMO_WEEKS[0].player;
  const nextIdx = (DEMO_ROTATION.indexOf(currentPlayer) + 1) % DEMO_ROTATION.length;
  const nextPlayer = DEMO_ROTATION[nextIdx];
  const noop = () => {};

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={{ ...styles.modalPanel, maxWidth: 860 }} onClick={(e) => e.stopPropagation()}>
        <div style={styles.demoBanner}>
          <Sparkles size={14} />
          DEMO SEASON — sample data for illustration only, nothing here is saved
        </div>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>SKY BET CLUB · Weeks 1–5</h2>
          <button style={styles.iconBtnGhost} onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
          <RotationQueue currentPlayer={currentPlayer} nextPlayer={nextPlayer} rotation={DEMO_ROTATION} dutyStats={dutyStats} />
        </div>

        <SeasonHighlights dutyStats={dutyStats} legStats={legStats} awards={awards} />

        <section style={{ ...styles.statsStrip, marginBottom: 22 }}>
          <StatBlock label="Staked" value={fmt(seasonStats.totalStaked)} />
          <StatBlock label="Returned" value={fmt(seasonStats.totalReturns)} />
          <StatBlock label="Record" value={`${seasonStats.won}W – ${seasonStats.lost}L`} sub={`${seasonStats.pending} pending`} />
        </section>

        <div style={styles.weeksCol}>
          {DEMO_WEEKS.map((w, i) => (
            <WeekCard
              key={w.id}
              week={w}
              rotation={DEMO_ROTATION}
              rotated={i % 2 === 0}
              isOpen={true}
              onToggle={noop}

              onUpdateWeek={noop}
              onDeleteWeek={noop}
              onAddSlip={noop}
              onDeleteSlip={noop}
              onUpdateSlip={noop}
              onAddFold={noop}
              onDeleteFold={noop}
              onUpdateFold={noop}
            />
          ))}
        </div>

        <section style={{ ...styles.leaderboard, marginTop: 30 }}>
          <div style={styles.eyebrow}>ON-DUTY LEDGER</div>
          <h2 style={styles.subTitle}>P&amp;L WHILE HOLDING THE SLIP</h2>
          <div style={styles.leaderTable}>
            {dutyStats.map((p, idx) => (
              <div key={p.name} style={styles.leaderRow}>
                <div style={styles.leaderRank}>{idx === 0 && p.profit > 0 ? <Trophy size={16} color="#C1272D" /> : idx + 1}</div>
                <div style={styles.leaderName}>{p.name}</div>
                <div style={styles.leaderRecord}>{p.won}W – {p.lost}L{p.pending ? ` · ${p.pending} pending` : ""}</div>
                <div style={{ ...styles.leaderProfit, color: p.profit >= 0 ? "#FFFFFF" : "#C1272D" }}>
                  {p.profit >= 0 ? "+" : "−"}{fmt(Math.abs(p.profit))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ ...styles.eyebrow, marginTop: 26 }}>LEG ACCURACY</div>
          <h2 style={styles.subTitle}>WHO ACTUALLY PICKS WINNERS</h2>
          <div style={styles.leaderTable}>
            {legStats.map((p, idx) => (
              <div key={p.name} style={styles.leaderRowOdds}>
                <div style={styles.leaderRank}>
                  {idx === 0 && p.accuracy !== null && p.accuracy > 50 ? <Target size={16} color="#C1272D" /> : idx + 1}
                </div>
                <div style={styles.leaderName}>{p.name}</div>
                <div style={styles.leaderRecord}>{p.won}W – {p.lost}L{p.pending ? ` · ${p.pending} pending` : ""}</div>
                <div style={styles.leaderAvgOdds}>{p.avgOdds === null ? "avg —" : `avg ${p.avgOdds.toFixed(2)}`}</div>
                <div style={{ ...styles.leaderProfit, color: "#FFFFFF" }}>
                  {p.accuracy === null ? "—" : `${p.accuracy.toFixed(0)}%`}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function SetupScreen({ onDone }) {
  const [display, setDisplay] = useState(PLAYERS);
  const [shuffling, setShuffling] = useState(false);
  const [settled, setSettled] = useState(false);
  const intervalRef = useRef(null);

  const runShuffle = () => {
    setSettled(false);
    setShuffling(true);
    let ticks = 0;
    intervalRef.current = setInterval(() => {
      setDisplay(shuffleArr(PLAYERS));
      ticks += 1;
      if (ticks >= 14) {
        clearInterval(intervalRef.current);
        const final = shuffleArr(PLAYERS);
        setDisplay(final);
        setShuffling(false);
        setSettled(true);
      }
    }, 90);
  };

  useEffect(() => () => intervalRef.current && clearInterval(intervalRef.current), []);

  return (
    <div style={{ ...styles.wrap, minHeight: 480, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <style>{FONT_IMPORT}</style>
      <div style={styles.eyebrow}>SEASON SET-UP</div>
      <h1 style={{ ...styles.title, fontSize: 44, textAlign: "center" }}>SET THE ORDER</h1>
      <p style={{ fontFamily: "'Work Sans', sans-serif", color: "#4B5A72", maxWidth: 380, textAlign: "center", fontSize: 14, marginBottom: 28 }}>
        Randomise who goes first, second, third… the rotation this locks in decides who's on the clock each week for the rest of the season.
      </p>

      <div style={styles.shuffleBoard}>
        {display.map((p, i) => (
          <div key={p} style={{ ...styles.shuffleChip, opacity: shuffling ? 0.7 : 1 }}>
            <span style={styles.shuffleChipNum}>{i + 1}</span>
            {p}
          </div>
        ))}
      </div>

      {!settled && (
        <button style={styles.primaryBtn} onClick={runShuffle} disabled={shuffling}>
          <Shuffle size={17} /> {shuffling ? "Shuffling…" : "Randomise the rotation"}
        </button>
      )}

      {settled && (
        <div style={{ display: "flex", gap: 10 }}>
          <button style={styles.ghostBtn} onClick={runShuffle}>
            <Shuffle size={14} /> Reshuffle
          </button>
          <button style={styles.primaryBtn} onClick={() => onDone(display)}>
            Lock it in — start the season
          </button>
        </div>
      )}
    </div>
  );
}

function RotationQueue({ currentPlayer, nextPlayer, rotation, dutyStats, onSelectPlayer }) {
  const winsByName = Object.fromEntries(dutyStats.map((p) => [p.name, p.won]));
  const startIdx = rotation.indexOf(currentPlayer || nextPlayer);
  const order = rotation.map((_, i) => rotation[(startIdx + i) % rotation.length]);
  const chain = currentPlayer ? order.slice(2) : order.slice(1);
  const click = (p) => () => onSelectPlayer && onSelectPlayer(p);

  return (
    <div style={styles.rotationQueue}>
      {currentPlayer && (
        <button style={styles.queueBarThis} onClick={click(currentPlayer)}>
          <span style={styles.queueBarLabel}>THIS WEEK</span>
          <span style={styles.queueBarName}>{currentPlayer}</span>
          {winsByName[currentPlayer] > 0 && <span style={styles.queueBarWins}>{winsByName[currentPlayer]}W</span>}
        </button>
      )}
      <button style={styles.queueBarNext} onClick={click(nextPlayer)}>
        <span style={styles.queueBarLabelNext}>{currentPlayer ? "NEXT" : "UP FIRST"}</span>
        <span style={styles.queueBarNameNext}>{nextPlayer}</span>
        {winsByName[nextPlayer] > 0 && <span style={styles.queueBarWinsNext}>{winsByName[nextPlayer]}W</span>}
      </button>
      {chain.length > 0 && (
        <div style={styles.queueChain}>
          <span style={styles.queueChainThen}>then</span>
          {chain.map((p, i) => (
            <span key={p} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button style={styles.queueChainName} onClick={click(p)}>{p}</button>
              {i < chain.length - 1 && <span style={styles.queueChainArrow}>→</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const AWARD_TINTS = {
  red: { bg: "#FCEBEB", label: "#8C1C21" },
  navy: { bg: "#E4ECF6", label: "#0B2545" },
  grey: { bg: "#EDF1F7", label: "#4B5A72" },
};

function AwardCard({ tint, label, value, sub }) {
  const t = AWARD_TINTS[tint];
  return (
    <div style={{ ...styles.awardCard, background: t.bg }}>
      <div style={{ ...styles.awardLabel, color: t.label }}>{label}</div>
      <div style={styles.awardValue}>{value}</div>
      <div style={styles.awardSub}>{sub}</div>
    </div>
  );
}

function SeasonHighlights({ dutyStats, legStats, awards }) {
  const cards = [
    {
      tint: "red",
      label: "HIGHEST ODDS BACKED",
      value: awards.highestOdds ? awards.highestOdds.player : "—",
      sub: awards.highestOdds ? awards.highestOdds.odds.toFixed(2) : "no bets settled yet",
    },
    {
      tint: "navy",
      label: "MOST RISK-AVERSE",
      value: awards.safest ? awards.safest.name : "—",
      sub: awards.safest ? `avg ${awards.safest.avgOdds.toFixed(2)} odds` : "no picks yet",
    },
    {
      tint: "grey",
      label: "MOST CORRECT PICKS",
      value: awards.mostCorrect ? awards.mostCorrect.name : "—",
      sub: awards.mostCorrect ? `${awards.mostCorrect.won} legs won` : "no wins yet",
    },
    {
      tint: "grey",
      label: "BEST STRIKE RATE",
      value: awards.bestRate ? awards.bestRate.name : "—",
      sub: awards.bestRate ? `${awards.bestRate.accuracy.toFixed(0)}% of legs` : "no results yet",
    },
    {
      tint: "navy",
      label: "BIGGEST WEEK",
      value: awards.biggestWeek ? awards.biggestWeek.player : "—",
      sub: awards.biggestWeek ? fmtSigned(awards.biggestWeek.profit) : "no wins yet",
    },
    {
      tint: "red",
      label: "MOST ON-DUTY WINS",
      value: awards.mostWins ? awards.mostWins.name : "—",
      sub: awards.mostWins ? `${awards.mostWins.won} week${awards.mostWins.won === 1 ? "" : "s"} won` : "no wins yet",
    },
  ];

  return (
    <section style={{ marginBottom: 22 }}>
      <div style={styles.heroCard}>
        <div style={styles.heroBanner}>
          <div style={styles.heroEyebrow}>SEASON HEADLINE</div>
          <div style={styles.heroHeadline}>{seasonHeadline(dutyStats)}</div>
        </div>
        <div style={styles.heroStrip}>
          <div style={styles.heroStripItem}>
            <span style={styles.heroStripLabel}>HIGHEST ODDS</span>
            <span style={styles.heroStripValue}>
              {awards.highestOdds ? `${awards.highestOdds.player} · ${awards.highestOdds.odds.toFixed(2)}` : "—"}
            </span>
          </div>
          <div style={{ ...styles.heroStripItem, borderLeft: "0.5px solid #E2E6ED" }}>
            <span style={styles.heroStripLabel}>SAFEST PLAYER</span>
            <span style={styles.heroStripValue}>
              {awards.safest ? `${awards.safest.name} · avg ${awards.safest.avgOdds.toFixed(2)}` : "—"}
            </span>
          </div>
          <div style={{ ...styles.heroStripItem, borderLeft: "0.5px solid #E2E6ED" }}>
            <span style={styles.heroStripLabel}>BEST STRIKE RATE</span>
            <span style={styles.heroStripValue}>
              {awards.bestRate ? `${awards.bestRate.name} · ${awards.bestRate.accuracy.toFixed(0)}%` : "—"}
            </span>
          </div>
        </div>
      </div>

      <div style={{ ...styles.eyebrow, marginTop: 20 }}>SEASON AWARDS</div>
      <div style={styles.awardGrid}>
        {cards.map((c) => (
          <AwardCard key={c.label} {...c} />
        ))}
      </div>
    </section>
  );
}

function StatBlock({ label, value, sub, tone, icon: Icon }) {
  return (
    <div style={styles.statBlock}>
      <div style={styles.statLabel}>{label}</div>
      <div style={{ ...styles.statValue, color: tone === "win" ? "#FFFFFF" : tone === "loss" ? "#FF8A80" : "#FFFFFF" }}>
        {Icon && <Icon size={16} style={{ marginRight: 5, verticalAlign: -2 }} />}
        {value}
      </div>
      {sub && <div style={styles.statSub}>{sub}</div>}
    </div>
  );
}

function WeekCard({
  week,
  rotation,
  rotated,
  isOpen,
  onToggle,
  onUpdateWeek,
  onDeleteWeek,
  onAddSlip,
  onDeleteSlip,
  onUpdateSlip,
  onAddFold,
  onDeleteFold,
  onUpdateFold,
}) {
  const weekStaked = week.slips.reduce((a, s) => a + s.stake, 0);
  const weekReturns = week.slips.reduce((a, s) => a + slipReturn(s), 0);
  const weekProfit = weekReturns - weekStaked;
  const statuses = week.slips.map(slipStatus);
  const overallStatus = statuses.every((s) => s === "won")
    ? "won"
    : statuses.every((s) => s === "lost")
    ? "lost"
    : statuses.some((s) => s === "pending")
    ? "pending"
    : "mixed";

  const [showWeekSolo, setShowWeekSolo] = useState(false);

  return (
    <div style={{ ...styles.ticket, transform: `rotate(${rotated ? "-0.3deg" : "0.3deg"})` }}>
      <div style={styles.ticketHeader} onClick={onToggle}>
        <div style={styles.ticketHeaderLeft}>
          <div style={styles.ticketWeekNum}>WK {week.weekNumber}</div>
          <div>
            <div style={styles.ticketPlayer}>{week.player}</div>
            <div style={styles.ticketDate}>
              <Calendar size={11} style={{ verticalAlign: -1, marginRight: 3 }} />
              {week.date}
            </div>
          </div>
        </div>
        <div style={styles.ticketHeaderRight}>
          <StatusPill status={overallStatus} />
          <div style={{ textAlign: "right" }}>
            <div style={{ ...styles.ticketProfit, color: weekProfit >= 0 ? "#0B2545" : "#C1272D" }}>
              {weekProfit >= 0 ? "+" : "−"}{fmt(Math.abs(weekProfit))}
            </div>
          </div>
          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>

      {isOpen && (
        <div style={styles.ticketBody}>
          <div style={styles.ticketControlsRow}>
            <select value={week.player} onChange={(e) => onUpdateWeek({ player: e.target.value })} style={styles.selectInput}>
              {rotation.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <input type="date" value={week.date} onChange={(e) => onUpdateWeek({ date: e.target.value })} style={styles.dateInput} />
            <button style={styles.iconBtnDanger} onClick={onDeleteWeek} title="Delete week">
              <Trash2 size={14} />
            </button>
          </div>

          {week.slips.map((slip, si) => (
            <SlipBlock
              key={slip.id}
              slip={slip}
              index={si}
              rotation={rotation}
              weekDate={week.date}
              weekNumber={week.weekNumber}
              canDelete={week.slips.length > 1}
              onDelete={() => onDeleteSlip(slip.id)}
              onUpdateSlip={(patch) => onUpdateSlip(slip.id, patch)}
              onAddFold={() => onAddFold(slip.id)}
              onDeleteFold={(fid) => onDeleteFold(slip.id, fid)}
              onUpdateFold={(fid, patch) => onUpdateFold(slip.id, fid, patch)}
            />
          ))}

          <button style={styles.addSlipBtn} onClick={onAddSlip}>
            <Plus size={14} /> Add another acca this week
          </button>

          <button style={styles.soloByPlayerBtnProminent} onClick={() => setShowWeekSolo(true)}>
            <ListChecks size={16} /> Solo bets by player — see what each of you would've won alone
          </button>

          <div style={styles.weekFooter}>
            <span>Week staked: <b>{fmt(weekStaked)}</b></span>
            <span>Returned: <b>{fmt(weekReturns)}</b></span>
          </div>
        </div>
      )}

      {showWeekSolo && (
        <WeekSoloBetsModal week={week} rotation={rotation} onClose={() => setShowWeekSolo(false)} />
      )}
    </div>
  );
}

// What each player would have won that week if every one of their picks
// across every acca had been their own standalone bet, rather than tied
// into the group's combined accumulators. Red/navy styled, matches the
// rest of the app (unlike the dark per-acca solo view).
function WeekSoloBetsModal({ week, rotation, onClose }) {
  const byPlayer = rotation.map((player) => {
    const picks = [];
    week.slips.forEach((slip) => {
      const fold = slip.folds.find((f) => f.player === player);
      if (!fold) return;
      const odds = parseOdds(fold.odds);
      const soloReturn = fold.result === "won" && odds ? slip.stake * odds : 0;
      picks.push({ ...fold, market: marketLabel(slip) || "No market set", odds, soloReturn });
    });
    const total = picks.reduce((a, p) => a + (p.result === "won" ? p.soloReturn : 0), 0);
    const anyPending = picks.some((p) => p.result === "pending");
    return { player, picks, total, anyPending };
  });

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={{ ...styles.modalPanel, maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <div style={styles.oddsSectionLabel}>WEEK {week.weekNumber} · SOLO BETS</div>
            <h2 style={styles.modalTitle}>What each of you would have won on your own</h2>
          </div>
          <button style={styles.iconBtnGhost} onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {byPlayer.map((p) => (
            <div key={p.player} style={styles.soloCard}>
              <div style={styles.soloCardHeader}>
                <span style={styles.soloPlayerName}>{p.player}</span>
                <span style={{ ...styles.soloTotal, color: p.total > 0 ? "#0B2545" : "#4B5A72" }}>
                  {p.anyPending ? "so far: " : ""}{fmt(p.total)}
                </span>
              </div>
              {p.picks.length === 0 && <p style={styles.modalEmpty}>No pick submitted this week.</p>}
              {p.picks.map((pick, i) => (
                <div key={i} style={styles.soloPickRow}>
                  <span style={styles.soloMarket}>{pick.market}</span>
                  <span style={styles.soloSelection}>{pick.selection || "(no pick entered)"}</span>
                  <span style={styles.soloOdds}>{pick.odds ? pick.odds.toFixed(2) : "—"}</span>
                  <span
                    style={{
                      ...styles.soloBadge,
                      background: pick.result === "won" ? "#0B2545" : pick.result === "lost" ? "#C1272D" : "#EDF1F7",
                      color: pick.result === "pending" ? "#4B5A72" : "#FFFFFF",
                    }}
                  >
                    {pick.result === "won" ? <Check size={13} /> : pick.result === "lost" ? <X size={13} /> : <Clock size={13} />}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SlipBlock({ slip, index, rotation, weekDate, weekNumber, canDelete, onDelete, onUpdateSlip, onAddFold, onDeleteFold, onUpdateFold }) {
  const status = slipStatus(slip);
  const odds = combinedOdds(slip.folds);
  const ret = slipReturn(slip);
  const submittedCount = slip.folds.filter((f) => f.submitted).length;
  const waitingOn = slip.folds.filter((f) => !f.submitted).map((f) => f.player);
  const locked = slip.confirmed;
  const [sharing, setSharing] = useState(false);
  const [showSolo, setShowSolo] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [rollLabel, setRollLabel] = useState("");
  const rollIntervalRef = useRef(null);

  const handleRandomMarket = () => {
    if (locked || rolling) return;
    const pool = MARKET_OPTIONS.filter((m) => m !== "Other");
    setRolling(true);
    let ticks = 0;
    rollIntervalRef.current = setInterval(() => {
      setRollLabel(pool[Math.floor(Math.random() * pool.length)]);
      ticks += 1;
      if (ticks >= 16) {
        clearInterval(rollIntervalRef.current);
        const final = pool[Math.floor(Math.random() * pool.length)];
        setRollLabel(final);
        setTimeout(() => {
          onUpdateSlip({ market: final });
          setRolling(false);
        }, 350);
      }
    }, 80);
  };

  useEffect(() => () => rollIntervalRef.current && clearInterval(rollIntervalRef.current), []);

  const handleShare = async () => {
    setSharing(true);
    try {
      await shareSlipImage(slip, weekNumber, weekDate);
    } catch (e) {
      console.error("Share failed", e);
    } finally {
      setSharing(false);
    }
  };

  return (
    <div style={styles.slip}>
      <div style={styles.slipHeader}>
        <span style={styles.slipLabel}>ACCA {index + 1} · {slip.folds.length}-FOLD</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button style={styles.iconBtnGhost} onClick={() => setShowSolo(true)} title="View as solo bets">
            <ListChecks size={14} />
          </button>
          <button style={styles.iconBtnGhost} onClick={handleShare} disabled={sharing} title="Share as image">
            {sharing ? <Loader2 size={14} className="spin" /> : <Share2 size={14} />}
          </button>
          <div style={styles.stakeWrap}>
            <span style={styles.stakeSign}>£</span>
            <input
              type="number"
              min="0"
              step="0.5"
              value={slip.stake}
              onChange={(e) => onUpdateSlip({ stake: parseFloat(e.target.value) || 0 })}
              style={styles.stakeInput}
              title="Stake for this acca"
              disabled={locked}
            />
          </div>
          <StatusPill status={status} small />
          {canDelete && !locked && (
            <button style={styles.iconBtnGhost} onClick={onDelete} title="Remove acca">
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      <div style={styles.marketBar}>
        <span style={styles.marketBarLabel}>This week's market:</span>
        {rolling ? (
          <span style={styles.rollBanner}>{rollLabel || "…"}</span>
        ) : (
          <select
            value={slip.market}
            onChange={(e) => onUpdateSlip({ market: e.target.value })}
            style={styles.marketBarSelect}
            disabled={locked}
          >
            <option value="">Choose a market…</option>
            {MARKET_OPTIONS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        )}
        {!locked && (
          <button style={styles.randomMarketBtn} onClick={handleRandomMarket} disabled={rolling} title="Randomise the market">
            <Shuffle size={13} className={rolling ? "spin" : ""} />
          </button>
        )}
        {slip.market === "Other" && !rolling && (
          <input
            placeholder="Custom market"
            value={slip.customMarket}
            onChange={(e) => onUpdateSlip({ customMarket: e.target.value })}
            style={styles.marketBarCustom}
            disabled={locked}
          />
        )}
        {slip.market && !rolling && (
          <span style={styles.marketBarHint}>applies to every leg</span>
        )}
      </div>

      <div style={styles.submitBanner}>
        <span style={{ color: submittedCount === slip.folds.length ? "#0B2545" : "#14335E" }}>
          {submittedCount}/{slip.folds.length} picks submitted
        </span>
        {waitingOn.length > 0 && (
          <span style={{ opacity: 0.75 }}>· waiting on {waitingOn.join(", ")}</span>
        )}
      </div>

      {!locked && submittedCount > 0 && submittedCount < slip.folds.length && (
        <button
          style={styles.partialBtn}
          onClick={() => onUpdateSlip({ folds: slip.folds.filter((f) => f.submitted) })}
        >
          Not everyone playing this week? Build the acca with these {submittedCount} pick{submittedCount === 1 ? "" : "s"}
        </button>
      )}

      {slip.folds.map((fold, fi) => (
        <div key={fold.id} style={{ ...styles.foldCard, borderColor: fold.submitted ? "rgba(11,37,69,0.4)" : "rgba(11,37,69,0.12)" }}>
          <div style={styles.foldTopRow}>
            <span style={styles.foldNum}>{fi + 1}</span>
            <select
              value={fold.player}
              onChange={(e) => onUpdateFold(fold.id, { player: e.target.value })}
              style={styles.foldPlayerSelect}
              disabled={locked}
            >
              {rotation.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <span style={styles.foldMarketTag}>{marketLabel(slip) || "no market set"}</span>
            <button
              onClick={() => onUpdateFold(fold.id, { submitted: !fold.submitted })}
              style={{
                ...styles.submitToggle,
                background: fold.submitted ? "#0B2545" : "transparent",
                color: fold.submitted ? "#FFFFFF" : "#14335E",
                borderColor: fold.submitted ? "#0B2545" : "rgba(11,37,69,0.2)",
              }}
              title={fold.submitted ? "Submitted" : "Mark submitted"}
              disabled={locked}
            >
              <Check size={12} />
            </button>
            {slip.folds.length > 1 && !locked && (
              <button style={styles.iconBtnGhost} onClick={() => onDeleteFold(fold.id)} title="Remove leg">
                <X size={12} />
              </button>
            )}
          </div>

          <div style={styles.foldBottomRow}>
            <input
              placeholder="Selection e.g. Arsenal vs Chelsea — Arsenal win"
              value={fold.selection}
              onChange={(e) => onUpdateFold(fold.id, { selection: e.target.value })}
              style={styles.foldInput}
              disabled={locked}
            />
          </div>

        </div>
      ))}

      <OddsSection
        slip={slip}
        rotation={rotation}
        allSubmitted={submittedCount === slip.folds.length}
        onUpdateFold={onUpdateFold}
        onUpdateSlip={onUpdateSlip}
      />

      <ResultsSection
        slip={slip}
        rotation={rotation}
        status={status}
        weekDate={weekDate}
        onUpdateFold={onUpdateFold}
        onUpdateSlip={onUpdateSlip}
      />

      <div style={styles.slipFooterRow}>
        {!locked && (
          <button style={styles.addFoldBtn} onClick={onAddFold}>
            <Plus size={12} /> Add leg
          </button>
        )}
        <div style={styles.slipMath}>
          <span>Stake {fmt(slip.stake)}</span>
          <span>·</span>
          <span>Odds {odds ? odds.toFixed(2) : "—"}</span>
          <span>·</span>
          <span style={{ color: status === "won" ? "#0B2545" : status === "lost" ? "#C1272D" : "#0B2545" }}>
            {status === "won" ? `Returns ${fmt(ret)}` : status === "lost" ? "Returns £0.00" : "Potential " + (odds ? fmt(slip.stake * odds) : "—")}
          </span>
        </div>
      </div>

      {showSolo && (
        <SoloBetsModal slip={slip} weekNumber={weekNumber} weekDate={weekDate} onClose={() => setShowSolo(false)} />
      )}
    </div>
  );
}

// Once every player has submitted their pick, whoever's placing the actual
// bet fills in the real odds for each leg here, then confirms it's placed.
function OddsSection({ slip, rotation, allSubmitted, onUpdateFold, onUpdateSlip }) {
  const [confirmer, setConfirmer] = useState(rotation[0] || "");

  if (!allSubmitted) {
    const missing = slip.folds.filter((f) => !f.submitted).map((f) => f.player);
    return (
      <div style={styles.oddsSection}>
        <span style={styles.oddsSectionLabel}>ODDS</span>
        <span style={styles.oddsSectionWaiting}>
          Locked until every pick's in{missing.length ? ` — still waiting on ${missing.join(", ")}` : ""}.
        </span>
      </div>
    );
  }

  if (slip.confirmed) {
    const when = slip.confirmedAt ? new Date(slip.confirmedAt).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" }) : "";
    return (
      <div style={styles.confirmedBar}>
        <Lock size={13} />
        <span>Bet placed by <b>{slip.confirmedBy}</b>{when ? ` · ${when}` : ""}</span>
        <button style={styles.unlockBtn} onClick={() => onUpdateSlip({ confirmed: false })} title="Reopen for editing">
          <Unlock size={12} /> Reopen
        </button>
      </div>
    );
  }

  const allOddsIn = slip.folds.every((f) => parseOdds(f.odds) !== null);

  return (
    <div style={styles.oddsSection}>
      <span style={styles.oddsSectionLabel}>ODDS — enter these once you've placed the bet</span>
      {slip.folds.map((fold, fi) => (
        <div key={fold.id} style={styles.oddsRow}>
          <span style={styles.oddsRowPlayer}>{fold.player}</span>
          <span style={styles.oddsRowSelection}>{fold.selection || "(no pick entered)"}</span>
          <div style={styles.oddsWrap}>
            <input
              placeholder="2.5 or 5/2"
              value={fold.odds}
              onChange={(e) => onUpdateFold(fold.id, { odds: e.target.value.replace(/[^0-9./]/g, "") })}
              style={styles.oddsInput}
            />
            {fold.odds.includes("/") && parseOdds(fold.odds) && (
              <span style={styles.oddsPreview}>= {parseOdds(fold.odds).toFixed(2)}</span>
            )}
          </div>
        </div>
      ))}

      {allOddsIn && (
        <div style={styles.confirmBar}>
          <span style={styles.confirmBarLabel}>Bet actually placed by:</span>
          <select value={confirmer} onChange={(e) => setConfirmer(e.target.value)} style={styles.marketBarSelect}>
            {rotation.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button
            style={styles.confirmBtn}
            onClick={() => onUpdateSlip({ confirmed: true, confirmedBy: confirmer, confirmedAt: Date.now() })}
          >
            <Lock size={13} /> Confirm bet placed
          </button>
        </div>
      )}
    </div>
  );
}

function ResultsSection({ slip, rotation, status, weekDate, onUpdateFold, onUpdateSlip }) {
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState(false);
  const [settler, setSettler] = useState(rotation[0] || "");

  if (!slip.confirmed) return null;

  const handleCheckLive = async () => {
    setChecking(true);
    setCheckError(false);
    try {
      const results = await checkLiveResults(slip, weekDate);
      onUpdateSlip({ autoSuggestions: results, autoCheckedAt: Date.now() });
    } catch (e) {
      setCheckError(true);
    } finally {
      setChecking(false);
    }
  };

  const applySuggestion = (foldIndex, result) => {
    const fold = slip.folds[foldIndex];
    if (fold) onUpdateFold(fold.id, { result });
  };

  if (slip.settled) {
    const when = slip.settledAt ? new Date(slip.settledAt).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" }) : "";
    return (
      <div style={{ ...styles.confirmedBar, background: status === "won" ? "#0B2545" : status === "lost" ? "#8C1C21" : "#0F2C52" }}>
        <StatusPill status={status} small />
        <span>Settled by <b>{slip.settledBy}</b>{when ? ` · ${when}` : ""}</span>
        <button style={styles.unlockBtn} onClick={() => onUpdateSlip({ settled: false })} title="Reopen results">
          <Unlock size={12} /> Reopen
        </button>
      </div>
    );
  }

  const allDecided = slip.folds.every((f) => f.result !== "pending");
  const checkedAgo = slip.autoCheckedAt ? Math.round((Date.now() - slip.autoCheckedAt) / 60000) : null;
  const checkedLabel =
    checkedAgo === null ? "" : checkedAgo < 1 ? "just now" : checkedAgo < 60 ? `${checkedAgo}m ago` : `${Math.round(checkedAgo / 60)}h ago`;

  return (
    <div style={styles.liveCheckSection}>
      <div style={styles.liveCheckHeader}>
        <span style={styles.oddsSectionLabel}>RESULTS — mark once full-time</span>
        <button style={styles.recapBtn} onClick={handleCheckLive} disabled={checking}>
          {checking ? <Loader2 size={13} className="spin" /> : <Search size={13} />}
          {checking ? "Searching…" : slip.autoCheckedAt ? "Re-check live results" : "Check live results"}
        </button>
      </div>
      {slip.autoCheckedAt && !checking && (
        <span style={styles.oddsSectionWaiting}>checked automatically · {checkedLabel}</span>
      )}
      {checkError && <p style={styles.recapErrorText}>Couldn't check that time — give it another go.</p>}
      {slip.autoSuggestions && (
        <div style={styles.suggestionList}>
          {slip.autoSuggestions.map((s) => {
            const fold = slip.folds[s.index];
            if (!fold) return null;
            return (
              <div key={s.index} style={styles.suggestionRow}>
                <span style={styles.oddsRowPlayer}>{fold.player}</span>
                <span style={styles.oddsRowSelection}>{s.note || "—"}</span>
                <StatusPill status={s.result} small />
                <button
                  style={styles.applyBtn}
                  onClick={() => applySuggestion(s.index, s.result)}
                  disabled={fold.result === s.result}
                >
                  Apply
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div style={styles.resultsLegList}>
        {slip.folds.map((fold) => (
          <div key={fold.id} style={styles.oddsRow}>
            <span style={styles.oddsRowPlayer}>{fold.player}</span>
            <span style={styles.oddsRowSelection}>{fold.selection || "(no pick entered)"}</span>
            <span style={styles.resultsOddsText}>{fold.odds || "—"}</span>
            <ResultToggle result={fold.result} onChange={(r) => onUpdateFold(fold.id, { result: r })} />
          </div>
        ))}
      </div>

      {allDecided && (
        <div style={styles.confirmBar}>
          <span style={styles.confirmBarLabel}>Settled by:</span>
          <select value={settler} onChange={(e) => setSettler(e.target.value)} style={styles.marketBarSelect}>
            {rotation.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button
            style={styles.confirmBtn}
            onClick={() => onUpdateSlip({ settled: true, settledBy: settler, settledAt: Date.now() })}
          >
            <Lock size={13} /> Settle this bet
          </button>
        </div>
      )}
    </div>
  );
}

function ResultToggle({ result, onChange }) {
  const opts = [
    { key: "won", label: <Check size={12} />, color: "#0B2545" },
    { key: "pending", label: <Clock size={12} />, color: "#64748B" },
    { key: "lost", label: <X size={12} />, color: "#8C1C21" },
  ];
  return (
    <div style={styles.toggleGroup}>
      {opts.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          style={{
            ...styles.toggleBtn,
            background: result === o.key ? o.color : "transparent",
            color: result === o.key ? "#FFFFFF" : "#94A3B8",
          }}
          title={o.key}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function StatusPill({ status, small }) {
  const map = {
    won: { label: "WON", bg: "#0B2545", fg: "#FFFFFF" },
    lost: { label: "LOST", bg: "#C1272D", fg: "#FFFFFF" },
    pending: { label: "PENDING", bg: "#64748B", fg: "#EDEFF3" },
    mixed: { label: "SETTLED", bg: "#64748B", fg: "#EDEFF3" },
  };
  const s = map[status] || map.pending;
  return (
    <span
      style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: small ? 9.5 : 10.5,
        letterSpacing: 0.5,
        padding: small ? "2px 6px" : "3px 8px",
        borderRadius: 3,
        background: s.bg,
        color: s.fg,
        fontWeight: 600,
      }}
    >
      {s.label}
    </span>
  );
}

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Teko:wght@400;500;600;700&family=Work+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.spin { animation: spin 0.9s linear infinite; display: inline-block; }`;

const styles = {
  wrap: {
    fontFamily: "'Work Sans', sans-serif",
    background: "#FFFFFF",
    backgroundImage:
      "radial-gradient(ellipse at top left, rgba(193,39,45,0.05), transparent 55%), radial-gradient(ellipse at bottom right, rgba(11,37,69,0.06), transparent 60%)",
    color: "#101828",
    padding: "28px 20px 48px",
    minHeight: "100%",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
    flexWrap: "wrap",
    marginBottom: 24,
    borderBottom: "1px solid rgba(193,39,45,0.25)",
    paddingBottom: 20,
  },
  headerLeft: { minWidth: 240 },
  eyebrow: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11,
    letterSpacing: 2,
    color: "#14335E",
    marginBottom: 6,
  },
  title: {
    fontFamily: "'Teko', sans-serif",
    fontSize: 52,
    fontWeight: 600,
    letterSpacing: 1,
    margin: 0,
    color: "#0B2545",
    lineHeight: 0.95,
  },
  subTitle: {
    fontFamily: "'Teko', sans-serif",
    fontSize: 28,
    fontWeight: 600,
    letterSpacing: 0.5,
    margin: "2px 0 14px",
    color: "#0B2545",
  },
  rotationRow: { display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap", alignItems: "center" },
  rotationChip: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11,
    padding: "4px 9px",
    borderRadius: 3,
    border: "1px solid rgba(193,39,45,0.3)",
    color: "#4B5A72",
    background: "transparent",
    cursor: "pointer",
  },
  rotationChipActive: {
    background: "#C1272D",
    color: "#FFFFFF",
    borderColor: "#C1272D",
    fontWeight: 600,
  },
  rotationChipNext: {
    background: "rgba(20,51,94,0.14)",
    color: "#EAF0F8",
    borderColor: "#14335E",
    fontWeight: 600,
  },
  rotationLegend: {
    display: "flex",
    gap: 14,
    marginTop: 8,
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10,
    color: "#4B5A72",
  },
  legendDot: {
    display: "inline-block",
    width: 7,
    height: 7,
    borderRadius: "50%",
    marginRight: 4,
    verticalAlign: 1,
  },
  rotationQueue: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    width: 260,
    flexShrink: 0,
  },
  queueBarThis: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#C1272D",
    border: "none",
    borderRadius: 10,
    padding: "10px 14px",
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
  },
  queueBarLabel: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: 0.5,
    color: "#FCEBEB",
    width: 74,
    flexShrink: 0,
  },
  queueBarName: {
    fontFamily: "'Work Sans', sans-serif",
    fontSize: 15,
    fontWeight: 600,
    color: "#FFFFFF",
    flex: 1,
  },
  queueBarWins: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10,
    color: "#FCEBEB",
  },
  queueBarNext: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#E4ECF6",
    border: "none",
    borderRadius: 10,
    padding: "9px 14px",
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
  },
  queueBarLabelNext: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: 0.5,
    color: "#4B5A72",
    width: 74,
    flexShrink: 0,
  },
  queueBarNameNext: {
    fontFamily: "'Work Sans', sans-serif",
    fontSize: 14,
    fontWeight: 600,
    color: "#0B2545",
    flex: 1,
  },
  queueBarWinsNext: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10,
    color: "#4B5A72",
  },
  queueChain: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    padding: "2px 14px 0",
  },
  queueChainThen: {
    fontFamily: "'Work Sans', sans-serif",
    fontSize: 11,
    color: "#8C97A8",
    marginRight: 2,
  },
  queueChainName: {
    fontFamily: "'Work Sans', sans-serif",
    fontSize: 12,
    fontWeight: 600,
    color: "#4B5A72",
    background: "transparent",
    border: "none",
    padding: 0,
    cursor: "pointer",
  },
  queueChainArrow: {
    fontSize: 11,
    color: "#C7CDD6",
  },
  reshuffleIconBtn: {
    background: "transparent",
    border: "1px solid rgba(193,39,45,0.3)",
    borderRadius: 3,
    color: "#4B5A72",
    padding: "5px 6px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
  },
  heroCard: {
    background: "#FFFFFF",
    border: "0.5px solid #E2E6ED",
    borderRadius: 12,
    overflow: "hidden",
    boxShadow: "0 8px 20px rgba(11,37,69,0.08)",
  },
  heroBanner: { background: "#0B2545", padding: "18px 22px" },
  heroEyebrow: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 1.5,
    color: "#AFC0D6",
    marginBottom: 6,
  },
  heroHeadline: {
    fontFamily: "'Work Sans', sans-serif",
    fontSize: 19,
    fontWeight: 600,
    color: "#FFFFFF",
    lineHeight: 1.35,
  },
  heroStrip: { display: "flex", flexWrap: "wrap" },
  heroStripItem: { flex: "1 1 160px", padding: "12px 18px", display: "flex", flexDirection: "column", gap: 3 },
  heroStripLabel: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#8C97A8", letterSpacing: 0.5 },
  heroStripValue: { fontFamily: "'Work Sans', sans-serif", fontSize: 13.5, fontWeight: 600, color: "#101828" },
  awardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 10,
    marginTop: 12,
  },
  awardCard: { borderRadius: 10, padding: "12px 14px" },
  awardLabel: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: 0.4, marginBottom: 6 },
  awardValue: { fontFamily: "'Work Sans', sans-serif", fontSize: 17, fontWeight: 600, color: "#101828" },
  awardSub: { fontFamily: "'Work Sans', sans-serif", fontSize: 12, color: "#4B5A72", marginTop: 1 },
  statsStrip: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
    gap: 1,
    background: "rgba(193,39,45,0.2)",
    marginBottom: 22,
    border: "1px solid rgba(193,39,45,0.2)",
  },
  statBlock: { background: "#0F2C52", color: "#FFFFFF", padding: "14px 16px" },
  statLabel: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10,
    letterSpacing: 1,
    color: "#AFC0D6",
    marginBottom: 6,
  },
  statValue: { fontFamily: "'Teko', sans-serif", fontSize: 26, fontWeight: 600 },
  statSub: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#AFC0D6", marginTop: 2 },
  actionsRow: { display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap", alignItems: "center" },
  primaryBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "#C1272D",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 4,
    padding: "10px 16px",
    fontFamily: "'Work Sans', sans-serif",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
  },
  ghostBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "transparent",
    color: "#4B5A72",
    border: "1px solid rgba(193,39,45,0.3)",
    borderRadius: 4,
    padding: "9px 14px",
    fontFamily: "'Work Sans', sans-serif",
    fontSize: 13,
    cursor: "pointer",
  },
  dangerBtn: {
    background: "#C1272D",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 4,
    padding: "8px 14px",
    fontFamily: "'Work Sans', sans-serif",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  confirmBox: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    background: "rgba(193,39,45,0.15)",
    border: "1px solid rgba(193,39,45,0.4)",
    borderRadius: 4,
    padding: "10px 14px",
    marginBottom: 18,
    fontSize: 13,
  },
  weeksCol: { display: "flex", flexDirection: "column", gap: 18, maxWidth: 820 },
  emptyState: {
    textAlign: "center",
    padding: "48px 20px",
    border: "1px dashed rgba(193,39,45,0.3)",
    borderRadius: 6,
    color: "#4B5A72",
  },
  ticket: {
    background: "#FFFFFF",
    color: "#101828",
    borderRadius: 3,
    boxShadow: "0 8px 20px rgba(0,0,0,0.28)",
    overflow: "hidden",
  },
  ticketHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 18px",
    cursor: "pointer",
    borderBottom: "1px dashed rgba(11,37,69,0.18)",
    gap: 12,
    flexWrap: "wrap",
  },
  ticketHeaderLeft: { display: "flex", alignItems: "center", gap: 14 },
  ticketWeekNum: {
    fontFamily: "'Teko', sans-serif",
    fontSize: 26,
    fontWeight: 600,
    color: "#14335E",
    minWidth: 58,
  },
  ticketPlayer: { fontFamily: "'Work Sans', sans-serif", fontWeight: 700, fontSize: 16 },
  ticketDate: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, opacity: 0.65 },
  ticketHeaderRight: { display: "flex", alignItems: "center", gap: 12 },
  ticketProfit: { fontFamily: "'Teko', sans-serif", fontSize: 22, fontWeight: 600 },
  ticketBody: { padding: "14px 18px 18px" },
  ticketControlsRow: { display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" },
  recapErrorText: {
    fontFamily: "'Work Sans', sans-serif",
    fontSize: 12.5,
    color: "#8C1C21",
    margin: "0 0 8px",
  },
  recapBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "transparent",
    border: "1px solid rgba(11,37,69,0.2)",
    borderRadius: 3,
    padding: "6px 10px",
    fontFamily: "'Work Sans', sans-serif",
    fontSize: 12,
    fontWeight: 600,
    color: "#4B5A72",
    cursor: "pointer",
  },
  selectInput: {
    fontFamily: "'Work Sans', sans-serif",
    fontSize: 13,
    padding: "6px 8px",
    borderRadius: 3,
    border: "1px solid rgba(11,37,69,0.18)",
    background: "#fff",
  },
  dateInput: {
    fontFamily: "'Work Sans', sans-serif",
    fontSize: 13,
    padding: "6px 8px",
    borderRadius: 3,
    border: "1px solid rgba(11,37,69,0.18)",
    background: "#fff",
  },
  iconBtnDanger: {
    marginLeft: "auto",
    background: "transparent",
    border: "1px solid rgba(193,39,45,0.4)",
    color: "#8C1C21",
    borderRadius: 3,
    padding: "6px 8px",
    cursor: "pointer",
  },
  slip: {
    background: "#F2F4F7",
    border: "1px solid rgba(11,37,69,0.12)",
    borderRadius: 3,
    padding: 12,
    marginBottom: 10,
  },
  slipHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  slipLabel: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, letterSpacing: 0.5, opacity: 0.7 },
  stakeWrap: {
    display: "flex",
    alignItems: "center",
    background: "#fff",
    border: "1px solid rgba(11,37,69,0.18)",
    borderRadius: 3,
    padding: "0 6px",
  },
  stakeSign: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: "#4B5A72" },
  stakeInput: {
    width: 42,
    border: "none",
    outline: "none",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 12,
    padding: "5px 2px",
    background: "transparent",
    textAlign: "right",
  },
  marketBar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 8,
    background: "#F5F7FA",
    border: "1px dashed rgba(11,37,69,0.18)",
    borderRadius: 3,
    padding: "8px 10px",
  },
  marketBarLabel: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11,
    color: "#4B5A72",
    flexShrink: 0,
  },
  marketBarSelect: {
    fontFamily: "'Work Sans', sans-serif",
    fontWeight: 600,
    fontSize: 13,
    padding: "6px 8px",
    borderRadius: 3,
    border: "1px solid rgba(11,37,69,0.18)",
    background: "#fff",
  },
  marketBarCustom: {
    flex: 1,
    minWidth: 120,
    fontFamily: "'Work Sans', sans-serif",
    fontSize: 13,
    padding: "6px 8px",
    borderRadius: 3,
    border: "1px solid rgba(11,37,69,0.18)",
    background: "#fff",
  },
  marketBarHint: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10,
    color: "#14335E",
    fontStyle: "italic",
  },
  rollBanner: {
    flex: 1,
    minWidth: 140,
    fontFamily: "'Work Sans', sans-serif",
    fontWeight: 700,
    fontSize: 13,
    padding: "6px 10px",
    borderRadius: 3,
    background: "#0B2545",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  randomMarketBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#C1272D",
    border: "none",
    borderRadius: 3,
    color: "#FFFFFF",
    padding: "7px 9px",
    cursor: "pointer",
    flexShrink: 0,
  },
  submitBanner: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10.5,
    marginBottom: 8,
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
  },
  partialBtn: {
    display: "block",
    width: "100%",
    textAlign: "left",
    background: "transparent",
    border: "1px dashed rgba(11,37,69,0.3)",
    borderRadius: 3,
    padding: "7px 10px",
    marginBottom: 8,
    fontFamily: "'Work Sans', sans-serif",
    fontSize: 12,
    fontWeight: 600,
    color: "#14335E",
    cursor: "pointer",
  },
  partialConfirm: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    background: "rgba(193,39,45,0.1)",
    border: "1px solid rgba(193,39,45,0.35)",
    borderRadius: 3,
    padding: "8px 10px",
    marginBottom: 8,
    fontFamily: "'Work Sans', sans-serif",
    fontSize: 12.5,
  },
  foldCard: {
    border: "1px solid rgba(11,37,69,0.12)",
    borderRadius: 3,
    background: "#F5F7FA",
    padding: 8,
    marginBottom: 6,
  },
  foldTopRow: { display: "flex", alignItems: "center", gap: 6, marginBottom: 6 },
  foldBottomRow: { display: "flex", alignItems: "center", gap: 6 },
  foldNum: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10,
    width: 14,
    textAlign: "center",
    opacity: 0.55,
    flexShrink: 0,
  },
  foldPlayerSelect: {
    fontFamily: "'Work Sans', sans-serif",
    fontWeight: 600,
    fontSize: 12,
    padding: "5px 6px",
    borderRadius: 3,
    border: "1px solid rgba(11,37,69,0.15)",
    background: "#fff",
    flexShrink: 0,
  },
  foldMarketTag: {
    flex: 1,
    minWidth: 0,
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11,
    color: "#4B5A72",
    fontStyle: "italic",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  submitToggle: {
    width: 26,
    height: 26,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid",
    borderRadius: 3,
    cursor: "pointer",
    flexShrink: 0,
  },
  foldInput: {
    flex: 1,
    minWidth: 0,
    fontFamily: "'Work Sans', sans-serif",
    fontSize: 13,
    padding: "6px 8px",
    borderRadius: 3,
    border: "1px solid rgba(11,37,69,0.15)",
    background: "#fff",
    marginBottom: 6,
  },
  oddsWrap: { display: "flex", flexDirection: "column", flexShrink: 0, width: 64 },
  oddsInput: {
    width: 64,
    flexShrink: 0,
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 12,
    padding: "6px 6px",
    borderRadius: 3,
    border: "1px solid rgba(11,37,69,0.15)",
    background: "#fff",
    textAlign: "center",
  },
  oddsPreview: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 9,
    color: "#14335E",
    textAlign: "center",
    marginTop: 2,
  },
  oddsSection: {
    background: "#F2F4F7",
    border: "1px solid rgba(11,37,69,0.15)",
    borderRadius: 3,
    padding: 10,
    marginBottom: 10,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  oddsSectionLabel: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10.5,
    letterSpacing: 0.5,
    color: "#4B5A72",
    fontWeight: 600,
  },
  oddsSectionWaiting: {
    fontFamily: "'Work Sans', sans-serif",
    fontSize: 12.5,
    color: "#14335E",
    fontStyle: "italic",
  },
  oddsRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  oddsRowPlayer: {
    fontFamily: "'Work Sans', sans-serif",
    fontWeight: 700,
    fontSize: 12,
    width: 46,
    flexShrink: 0,
  },
  oddsRowSelection: {
    flex: 1,
    minWidth: 0,
    fontFamily: "'Work Sans', sans-serif",
    fontSize: 12.5,
    color: "#101828",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  confirmBar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 4,
    paddingTop: 8,
    borderTop: "1px dashed rgba(11,37,69,0.15)",
  },
  confirmBarLabel: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11,
    color: "#4B5A72",
  },
  confirmBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "#14335E",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 3,
    padding: "7px 12px",
    fontFamily: "'Work Sans', sans-serif",
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
    marginLeft: "auto",
  },
  confirmedBar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    background: "#0F2C52",
    color: "#FFFFFF",
    borderRadius: 3,
    padding: "9px 12px",
    marginBottom: 10,
    fontFamily: "'Work Sans', sans-serif",
    fontSize: 12.5,
  },
  unlockBtn: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    background: "transparent",
    border: "1px solid rgba(193,39,45,0.4)",
    color: "#C1272D",
    borderRadius: 3,
    padding: "4px 8px",
    fontSize: 11,
    fontFamily: "'Work Sans', sans-serif",
    cursor: "pointer",
    marginLeft: "auto",
  },
  liveCheckSection: {
    background: "#F5F7FA",
    border: "1px solid rgba(11,37,69,0.12)",
    borderRadius: 3,
    padding: 10,
    marginBottom: 10,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  liveCheckHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 },
  suggestionList: { display: "flex", flexDirection: "column", gap: 6 },
  resultsLegList: { display: "flex", flexDirection: "column", gap: 6, paddingTop: 4, borderTop: "1px dashed rgba(11,37,69,0.15)" },
  resultsOddsText: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11.5,
    color: "#14335E",
    width: 40,
    flexShrink: 0,
    textAlign: "center",
  },
  suggestionRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  applyBtn: {
    background: "transparent",
    border: "1px solid rgba(11,37,69,0.2)",
    borderRadius: 3,
    padding: "4px 8px",
    fontSize: 11,
    fontFamily: "'Work Sans', sans-serif",
    fontWeight: 600,
    color: "#4B5A72",
    cursor: "pointer",
    flexShrink: 0,
  },
  toggleGroup: { display: "flex", gap: 2, flexShrink: 0 },
  toggleBtn: {
    width: 24,
    height: 24,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid rgba(11,37,69,0.15)",
    borderRadius: 3,
    cursor: "pointer",
  },
  iconBtnGhost: {
    background: "transparent",
    border: "none",
    color: "#14335E",
    cursor: "pointer",
    padding: 3,
    flexShrink: 0,
  },
  slipFooterRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTop: "1px dashed rgba(11,37,69,0.15)",
    flexWrap: "wrap",
    gap: 8,
  },
  addFoldBtn: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    background: "transparent",
    border: "1px dashed rgba(11,37,69,0.25)",
    borderRadius: 3,
    padding: "4px 8px",
    fontSize: 11.5,
    fontFamily: "'Work Sans', sans-serif",
    color: "#4B5A72",
    cursor: "pointer",
  },
  slipMath: {
    display: "flex",
    gap: 6,
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11.5,
    color: "#4B5A72",
  },
  addSlipBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "transparent",
    border: "1px dashed rgba(11,37,69,0.2)",
    borderRadius: 3,
    padding: "8px 12px",
    fontFamily: "'Work Sans', sans-serif",
    fontSize: 12.5,
    color: "#4B5A72",
    cursor: "pointer",
    width: "100%",
    justifyContent: "center",
  },
  weekFooter: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    fontSize: 12.5,
    fontFamily: "'Work Sans', sans-serif",
    opacity: 0.8,
  },
  soloByPlayerBtnProminent: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    background: "#0B2545",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 6,
    padding: "12px 16px",
    fontFamily: "'Work Sans', sans-serif",
    fontSize: 13.5,
    fontWeight: 700,
    cursor: "pointer",
    width: "100%",
    marginTop: 4,
    marginBottom: 4,
  },
  soloByPlayerBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "transparent",
    border: "1px solid rgba(36,31,20,0.25)",
    borderRadius: 3,
    padding: "5px 10px",
    fontFamily: "'Work Sans', sans-serif",
    fontSize: 12,
    fontWeight: 600,
    color: "#5C4A15",
    cursor: "pointer",
    opacity: 1,
  },
  soloCard: {
    background: "#F5F7FA",
    border: "1px solid rgba(11,37,69,0.12)",
    borderRadius: 10,
    padding: "14px 16px",
  },
  soloCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingBottom: 10,
    borderBottom: "1px solid rgba(11,37,69,0.12)",
  },
  soloPlayerName: { fontSize: 17, fontWeight: 700, color: "#0B2545", fontFamily: "'Work Sans', sans-serif" },
  soloTotal: { fontSize: 18, fontWeight: 700, fontFamily: "'Work Sans', sans-serif" },
  soloPickRow: {
    display: "grid",
    gridTemplateColumns: "150px 1fr 56px 34px",
    gap: 10,
    alignItems: "center",
    fontSize: 13,
    padding: "6px 0",
  },
  soloMarket: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#4B5A72" },
  soloSelection: { color: "#101828", fontFamily: "'Work Sans', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  soloOdds: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, color: "#4B5A72", textAlign: "right" },
  soloBadge: {
    width: 24,
    height: 24,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "auto",
  },
  leaderboard: { maxWidth: 820, marginTop: 34 },
  termBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.75)",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "40px 20px",
    zIndex: 60,
    overflowY: "auto",
  },
  termPanel: {
    background: "#0A0A0A",
    color: "#EDEDED",
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    borderRadius: 8,
    border: "1px solid #262626",
    width: "100%",
    maxWidth: 640,
    padding: "20px 22px 24px",
    boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
  },
  termHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 },
  termEyebrow: { fontSize: 10.5, letterSpacing: 2, color: "#00D97E", marginBottom: 6 },
  termTitle: { fontSize: 18, fontWeight: 700, color: "#EDEDED", letterSpacing: 0.5 },
  termCloseBtn: { background: "transparent", border: "1px solid #262626", color: "#B3B3B3", borderRadius: 4, padding: 6, cursor: "pointer" },
  termTableHead: {
    display: "grid",
    gridTemplateColumns: "70px 1fr 60px 90px",
    gap: 10,
    fontSize: 10,
    letterSpacing: 1,
    color: "#7A8A99",
    borderBottom: "1px solid #262626",
    paddingBottom: 8,
    marginBottom: 4,
  },
  termRow: {
    display: "grid",
    gridTemplateColumns: "70px 1fr 60px 90px",
    gap: 10,
    alignItems: "center",
    fontSize: 13,
    padding: "10px 0",
    borderBottom: "1px solid #1A1A1A",
  },
  termPlayer: { color: "#EDEDED", fontWeight: 700 },
  termPick: { color: "#B3B3B3", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  termOdds: { color: "#B3B3B3", textAlign: "right" },
  termReturn: { textAlign: "right", fontWeight: 700 },
  termFooter: { marginTop: 14, paddingTop: 14, borderTop: "1px solid #262626", display: "flex", flexDirection: "column", gap: 8 },
  termFooterRow: { display: "flex", justifyContent: "space-between", fontSize: 13, color: "#B3B3B3", letterSpacing: 0.5 },
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(9,20,38,0.72)",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "40px 20px",
    zIndex: 50,
    overflowY: "auto",
  },
  modalPanel: {
    background: "#FFFFFF",
    color: "#101828",
    borderRadius: 6,
    width: "100%",
    maxWidth: 640,
    padding: "22px 24px 28px",
    boxShadow: "0 20px 50px rgba(0,0,0,0.4)",
  },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  demoBanner: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#C1272D",
    color: "#FFFFFF",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 0.5,
    padding: "8px 12px",
    borderRadius: 4,
    marginBottom: 16,
  },
  modalTitle: { fontFamily: "'Teko', sans-serif", fontSize: 38, fontWeight: 600, margin: 0 },
  modalStatsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 10,
    marginBottom: 24,
  },
  modalStatCard: {
    background: "#F2F4F7",
    border: "1px solid rgba(11,37,69,0.12)",
    borderRadius: 4,
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  modalStatBig: { fontFamily: "'Teko', sans-serif", fontSize: 28, fontWeight: 600, color: "#14335E" },
  modalStatSub: { fontFamily: "'Work Sans', sans-serif", fontSize: 11.5, color: "#4B5A72" },
  modalHistoryLabel: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11,
    letterSpacing: 1,
    color: "#4B5A72",
    fontWeight: 600,
    marginBottom: 10,
  },
  modalEmpty: { fontFamily: "'Work Sans', sans-serif", fontSize: 13, color: "#14335E", fontStyle: "italic" },
  modalHistoryList: { display: "flex", flexDirection: "column", gap: 10, maxHeight: 340, overflowY: "auto" },
  modalWeekCard: {
    background: "#F2F4F7",
    border: "1px solid rgba(11,37,69,0.12)",
    borderRadius: 4,
    padding: 12,
  },
  modalWeekHeader: { marginBottom: 6 },
  modalWeekTitle: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, fontWeight: 600, color: "#4B5A72" },
  modalSlipRow: { display: "flex", alignItems: "center", gap: 10, padding: "4px 0" },
  modalSlipMarket: { flex: 1, minWidth: 0, fontFamily: "'Work Sans', sans-serif", fontSize: 13, color: "#101828" },
  leaderTable: { display: "flex", flexDirection: "column", gap: 1, background: "rgba(193,39,45,0.15)", border: "1px solid rgba(193,39,45,0.2)" },
  leaderRow: {
    display: "grid",
    gridTemplateColumns: "28px 1fr auto auto",
    alignItems: "center",
    gap: 14,
    background: "#0F2C52",
    color: "#FFFFFF",
    padding: "10px 16px",
  },
  leaderRowOdds: {
    display: "grid",
    gridTemplateColumns: "28px 1fr auto auto auto",
    alignItems: "center",
    gap: 14,
    background: "#0F2C52",
    color: "#FFFFFF",
    padding: "10px 16px",
  },
  leaderAvgOdds: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: "#AFC0D6", minWidth: 60, textAlign: "right" },
  leaderRank: { fontFamily: "'Teko', sans-serif", fontSize: 18, color: "#AFC0D6", textAlign: "center" },
  leaderName: { fontFamily: "'Work Sans', sans-serif", fontWeight: 600, fontSize: 14 },
  leaderNameBtn: { fontFamily: "'Work Sans', sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer", textDecoration: "underline", textDecorationColor: "rgba(193,39,45,0.4)", textUnderlineOffset: 3 },
  leaderRecord: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: "#AFC0D6" },
  leaderProfit: { fontFamily: "'Teko', sans-serif", fontSize: 20, fontWeight: 600, minWidth: 80, textAlign: "right" },
  shuffleBoard: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 26, width: 260 },
  shuffleChip: {
    fontFamily: "'Work Sans', sans-serif",
    fontWeight: 600,
    fontSize: 15,
    background: "#0F2C52",
    color: "#FFFFFF",
    border: "1px solid rgba(193,39,45,0.3)",
    borderRadius: 4,
    padding: "9px 14px",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  shuffleChipNum: {
    fontFamily: "'Teko', sans-serif",
    fontSize: 18,
    color: "#C1272D",
    width: 18,
  },
};
