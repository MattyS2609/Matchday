import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiFootballProvider } from "./apiFootballProvider";
import type { Fixture, MatchStats } from "../types";

const fixtures: Fixture[] = [{
  id: "1208398",
  homeTeam: { id: " Newcastle ", name: "Newcastle", shortName: "NEW", accent: "#34506b" },
  awayTeam: { id: " Everton ", name: "Everton", shortName: "EVE", accent: "#607d94" },
  homeScore: 0,
  awayScore: 1,
  status: "finished",
  minute: 90,
  kickoff: "25 May 2025, 15:00",
  venue: "St. James' Park",
  dataSource: "live",
}];

const stats: MatchStats = {
  fixtureId: "1208398",
  players: [],
  teams: [
    { teamId: "Newcastle", shotsOnTarget: 6 },
    { teamId: "Everton", shotsOnTarget: 6 },
  ],
  calculatedAt: "2026-10-27T12:00:00.000Z",
  dataSource: "live",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ApiFootballProvider", () => {
  it("returns normalized fixtures from the server boundary", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(fixtures), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(new ApiFootballProvider().getFixtures()).resolves.toEqual(fixtures);
    expect(fetchMock).toHaveBeenCalledWith("/api/fixtures");
  });

  it("returns normalized match statistics without changing API values", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(stats), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(new ApiFootballProvider().getMatchStats("1208398")).resolves.toEqual(stats);
    expect(fetchMock).toHaveBeenCalledWith("/api/fixtures/1208398/stats");
  });

  it("URL-encodes fixture identifiers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("null", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await new ApiFootballProvider().getMatchStats("fixture/with spaces");
    expect(fetchMock).toHaveBeenCalledWith("/api/fixtures/fixture%2Fwith%20spaces/stats");
  });

  it("surfaces server errors instead of silently switching to demo data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "API unavailable" }), { status: 502 })));

    await expect(new ApiFootballProvider().getFixtures()).rejects.toThrow("Football data request failed (502): API unavailable");
  });
});
