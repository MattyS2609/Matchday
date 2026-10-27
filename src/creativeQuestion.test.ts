import { describe, expect, it } from "vitest";
import { createDeterministicCreativeQuestion, validateCreativeQuestion } from "./creativeQuestion";
import type { Fixture, MatchStats } from "./types";

const fixture: Fixture = {
  id: "fixture-1",
  homeTeam: { id: "home", name: "Home", shortName: "HOM", accent: "#000" },
  awayTeam: { id: "away", name: "Away", shortName: "AWA", accent: "#111" },
  homeScore: 1,
  awayScore: 0,
  status: "finished",
  minute: 90,
  kickoff: "Today",
  venue: "Stadium",
  dataSource: "live",
};

const stats: MatchStats = {
  fixtureId: "fixture-1",
  players: [{ playerId: "p", playerName: "Player", teamId: "home", passes: 1, shots: 1, tackles: 1, goals: 0 }],
  teams: [{ teamId: "Home", shotsOnTarget: 6 }, { teamId: "Away", shotsOnTarget: 6 }],
  calculatedAt: "2026-10-27T12:00:00.000Z",
  dataSource: "live",
};

describe("creative match questions", () => {
  it("creates a deterministic question from verified team statistics", () => {
    const question = createDeterministicCreativeQuestion(fixture, stats);
    expect(question?.correctAnswer).toBe("They were equal");
    expect(question?.options).toHaveLength(4);
    expect(question?.generationSource).toBe("deterministic-fallback");
  });

  it("rejects malformed generated output", () => {
    expect(() => validateCreativeQuestion({ fixtureId: "fixture-1", text: "Question", options: ["a", "a", "b", "c"], correctAnswer: "a", explanation: "why", sourceData: ["evidence"] }, "fixture-1")).toThrow("four unique options");
  });
});
