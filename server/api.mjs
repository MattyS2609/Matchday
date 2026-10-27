import "dotenv/config";
import express from "express";
import { numberOrZero, teamStatistic } from "./api-normalization.mjs";
import { generateCreativeQuestion } from "./creative-question.mjs";
import { extractTopScorers, historicalContextFrom, selectPreviousMeeting } from "./historical-context.mjs";

const app = express();
const port = Number(process.env.API_PORT || 3001);
const apiBaseUrl = process.env.API_FOOTBALL_BASE_URL || "https://v3.football.api-sports.io";
const leagueId = process.env.API_FOOTBALL_LEAGUE_ID || "39";
const fixtureCache = { expiresAt: 0, value: null };
const statsCache = new Map();
const storyCache = new Map();
const historicalCache = new Map();
const CACHE_MS = 15 * 60 * 1000;
const STATS_CACHE_MS = 30 * 60 * 1000;
const HISTORICAL_CACHE_MS = 24 * 60 * 60 * 1000;
const FREE_PLAN_SEASONS = new Set(["2022", "2023", "2024"]);

function currentSeason() {
  if (process.env.API_FOOTBALL_SEASON) return process.env.API_FOOTBALL_SEASON;
  const now = new Date();
  return String(now.getUTCMonth() >= 7 ? now.getUTCFullYear() : now.getUTCFullYear() - 1);
}

function configuredSeason() {
  const season = currentSeason();
  if (!FREE_PLAN_SEASONS.has(season)) {
    console.warn(`API_FOOTBALL_SEASON=${season} may be unavailable on the free plan; use 2022, 2023, or 2024.`);
  }
  return season;
}

async function apiRequest(path) {
  if (!process.env.API_FOOTBALL_KEY) {
    throw new Error("API_FOOTBALL_KEY is missing. Add it to .env or use VITE_DATA_MODE=demo.");
  }
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY },
  });
  if (!response.ok) throw new Error(`API-Football returned HTTP ${response.status}`);
  const body = await response.json();
  if (body.errors && Object.keys(body.errors).length > 0) {
    throw new Error(`API-Football rejected the request: ${JSON.stringify(body.errors)}`);
  }
  return body.response;
}

function shortName(name) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 3).toUpperCase();
}

function statusOf(status) {
  if (["1H", "2H", "ET", "P", "LIVE"].includes(status.short)) return "live";
  if (["FT", "AET", "PEN"].includes(status.short)) return "finished";
  return "upcoming";
}

function normalizeFixture(item) {
  const status = statusOf(item.fixture.status);
  return {
    id: String(item.fixture.id),
    homeTeam: { id: String(item.teams.home.id), name: item.teams.home.name, shortName: shortName(item.teams.home.name), accent: "#34506b" },
    awayTeam: { id: String(item.teams.away.id), name: item.teams.away.name, shortName: shortName(item.teams.away.name), accent: "#607d94" },
    homeScore: item.goals.home,
    awayScore: item.goals.away,
    status,
    minute: item.fixture.status.elapsed ?? null,
    kickoff: new Date(item.fixture.date).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }),
    venue: item.fixture.venue?.name || "Venue unavailable",
    dataSource: "live",
    kickoffTimestamp: new Date(item.fixture.date).getTime(),
  };
}

async function previousMeetingFor(fixture) {
  const teamKey = [fixture.homeTeam.id, fixture.awayTeam.id].sort().join("-");
  const cached = historicalCache.get(teamKey);
  if (cached && Date.now() < cached.expiresAt) return cached.value;
  const meetings = await apiRequest(`/fixtures/headtohead?h2h=${encodeURIComponent(`${fixture.homeTeam.id}-${fixture.awayTeam.id}`)}`);
  const previous = selectPreviousMeeting(meetings, fixture.id, new Date(fixture.kickoff).toISOString());
  if (!previous) {
    historicalCache.set(teamKey, { expiresAt: Date.now() + HISTORICAL_CACHE_MS, value: null });
    return null;
  }
  const events = await apiRequest(`/fixtures/events?fixture=${encodeURIComponent(previous.fixture.id)}`);
  const value = historicalContextFrom(previous, extractTopScorers(events));
  historicalCache.set(teamKey, { expiresAt: Date.now() + HISTORICAL_CACHE_MS, value });
  return value;
}

app.get("/api/fixtures", async (_request, response) => {
  try {
    if (fixtureCache.value && Date.now() < fixtureCache.expiresAt) return response.json(fixtureCache.value);
    const fixtures = (await apiRequest(`/fixtures?league=${leagueId}&season=${configuredSeason()}&status=FT`))
      .map(normalizeFixture)
      .sort((a, b) => b.kickoffTimestamp - a.kickoffTimestamp)
      .slice(0, 3)
      .map(({ kickoffTimestamp, ...fixture }) => fixture);
    fixtureCache.value = fixtures;
    fixtureCache.expiresAt = Date.now() + CACHE_MS;
    response.json(fixtures);
  } catch (error) {
    response.status(502).json({ error: error instanceof Error ? error.message : "Football data unavailable" });
  }
});

function playerStats(item, fixtureId) {
  const stats = item.statistics?.[0] || {};
  return {
    playerId: String(item.player.id),
    playerName: item.player.name,
    teamId: String(item.statistics?.[0]?.team?.id || ""),
    passes: numberOrZero(stats.passes?.total),
    shots: numberOrZero(stats.shots?.total),
    tackles: numberOrZero(stats.tackles?.total),
    goals: numberOrZero(stats.goals?.total),
    fixtureId,
  };
}

app.get("/api/fixtures/:fixtureId/stats", async (request, response) => {
  const { fixtureId } = request.params;
  const cached = statsCache.get(fixtureId);
  if (cached && Date.now() < cached.expiresAt) return response.json(cached.value);
  try {
    const [players, teams] = await Promise.all([
      apiRequest(`/fixtures/players?fixture=${encodeURIComponent(fixtureId)}`),
      apiRequest(`/fixtures/statistics?fixture=${encodeURIComponent(fixtureId)}`),
    ]);
    const playerRows = players.flatMap((team) => (team.players || []).map((player) => playerStats({
      ...player,
      statistics: [{ ...player.statistics?.[0], team: { id: team.team.id } }],
    }, fixtureId)));
    const value = {
      fixtureId,
      players: playerRows.filter((player) => player.playerName),
      teams: teams.map((team) => ({ teamId: team.team.name, shotsOnTarget: teamStatistic(team, "Shots on Goal") })),
      calculatedAt: new Date().toISOString(),
      dataSource: "live",
    };
    if (value.players.length === 0 || value.teams.length === 0) {
      return response.status(422).json({ error: "API-Football returned no usable player and team statistics for this match." });
    }
    statsCache.set(fixtureId, { expiresAt: Date.now() + STATS_CACHE_MS, value });
    response.json(value);
  } catch (error) {
    response.status(502).json({ error: error instanceof Error ? error.message : "Match statistics unavailable" });
  }
});

app.get("/api/fixtures/:fixtureId/story-question", async (request, response) => {
  const { fixtureId } = request.params;
  try {
    let fixture = fixtureCache.value?.find((item) => item.id === fixtureId);
    if (!fixture) {
      const fixtures = (await apiRequest(`/fixtures?league=${leagueId}&season=${configuredSeason()}&status=FT`))
        .map(normalizeFixture)
        .sort((a, b) => b.kickoffTimestamp - a.kickoffTimestamp)
        .slice(0, 3);
      fixture = fixtures.find((item) => item.id === fixtureId);
    }
    if (!fixture) return response.status(404).json({ error: "Fixture not found." });
    let stats = statsCache.get(fixtureId)?.value;
    if (!stats) {
      const [players, teams] = await Promise.all([
        apiRequest(`/fixtures/players?fixture=${encodeURIComponent(fixtureId)}`),
        apiRequest(`/fixtures/statistics?fixture=${encodeURIComponent(fixtureId)}`),
      ]);
      const playerRows = players.flatMap((team) => (team.players || []).map((player) => playerStats({
        ...player,
        statistics: [{ ...player.statistics?.[0], team: { id: team.team.id } }],
      }, fixtureId)));
      stats = {
        fixtureId,
        players: playerRows.filter((player) => player.playerName),
        teams: teams.map((team) => ({ teamId: team.team.name, shotsOnTarget: teamStatistic(team, "Shots on Goal") })),
        calculatedAt: new Date().toISOString(),
        dataSource: "live",
      };
      if (stats.players.length === 0 || stats.teams.length === 0) {
        return response.status(422).json({ error: "Usable match statistics are required before generating a creative question." });
      }
      statsCache.set(fixtureId, { expiresAt: Date.now() + STATS_CACHE_MS, value: stats });
    }
    if (!stats || stats.players.length === 0 || stats.teams.length < 2) {
      return response.status(422).json({ error: "Usable match statistics are required before generating a creative question." });
    }
    const previousMeeting = await previousMeetingFor(fixture);
    const previousMeetingKey = previousMeeting?.fixtureId || "none";
    const cacheKey = `${fixtureId}:${stats.calculatedAt}:${previousMeetingKey}`;
    if (storyCache.has(cacheKey)) return response.json(storyCache.get(cacheKey));
    const question = await generateCreativeQuestion(fixture, stats, previousMeeting);
    storyCache.set(cacheKey, question);
    response.json(question);
  } catch (error) {
    response.status(502).json({ error: error instanceof Error ? error.message : "Creative question unavailable" });
  }
});

app.listen(port, () => {
  if (!process.env.API_FOOTBALL_KEY) console.warn("API_FOOTBALL_KEY is missing; API mode will report an actionable error.");
  console.log(`Football API server listening on http://localhost:${port}`);
});
