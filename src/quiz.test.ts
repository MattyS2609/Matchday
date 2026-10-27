import { describe, expect, it } from "vitest";
import { MockFootballDataProvider } from "./data/mockProvider";
import { calculateAnswer, generateQuestions, hasUsableMatchStats } from "./quiz";
import { getTriggeredRecordQuestion, historicalRecords } from "./records";
import type { MatchStats } from "./types";

const stats: MatchStats = {
  fixtureId: "fixture-1",
  calculatedAt: "2026-10-20T18:00:00.000Z",
  dataSource: "demo",
  players: [
    { playerId: "a", playerName: "Player A", teamId: "home", passes: 40, shots: 1, tackles: 2, goals: 1 },
    { playerId: "b", playerName: "Player B", teamId: "away", passes: 55, shots: 4, tackles: 5, goals: 0 },
    { playerId: "c", playerName: "Player C", teamId: "home", passes: 20, shots: 2, tackles: 1, goals: 0 },
  ],
  teams: [{ teamId: "Home", shotsOnTarget: 3 }, { teamId: "Away", shotsOnTarget: 4 }],
};

describe("quiz engine", () => {
  it("calculates ranking and numerical questions from match data", () => {
    const questions = generateQuestions(stats, 10);
    expect(questions).toHaveLength(10);
    expect(questions.find((question) => question.id === "most-passes")?.correctAnswer).toBe("Player B");
    expect(questions.find((question) => question.id === "total-tackles")?.correctAnswer).toBe("8");
  });

  describe("demo match statistics", () => {
    it("keeps Aston Villa vs Manchester United independent from Arsenal vs Manchester City", async () => {
      const provider = new MockFootballDataProvider();
      const arsenalCity = await provider.getMatchStats("demo-arsenal-city");
      const villaUnited = await provider.getMatchStats("demo-villa-united");

      expect(arsenalCity?.fixtureId).toBe("demo-arsenal-city");
      expect(villaUnited?.fixtureId).toBe("demo-villa-united");
      expect(villaUnited?.players[0].playerName).toBe("Ollie Watkins");
      expect(villaUnited?.teams[0].shotsOnTarget).toBe(7);
      expect(villaUnited?.players).not.toEqual(arsenalCity?.players);
    });
  });

  it("prevents duplicate question ids and assigns difficulty points", () => {
    const questions = generateQuestions(stats, 10);
    expect(new Set(questions.map((question) => question.id)).size).toBe(questions.length);
    expect(questions.find((question) => question.difficulty === "easy")?.points).toBe(1);
    expect(questions.find((question) => question.difficulty === "hard")?.points).toBe(3);
  });

  it("varies player and number questions without leaking a later answer", () => {
    const questions = generateQuestions(stats, 10);
    const ids = questions.map((question) => question.id);

    expect(questions.every((question) => question.options.length === 4)).toBe(true);
    expect(questions.every((question) => new Set(question.options).size === 4)).toBe(true);
    expect(ids).toContain("most-goals");
    expect(ids).not.toContain("most-goals-number");
    expect(ids).not.toContain("most-passes-number");
    expect(ids).not.toContain("most-shots-number");
    expect(ids).not.toContain("most-tackles-number");
  });

  it("returns zero points for an incorrect answer", () => {
    const question = generateQuestions(stats)[0];
    expect(calculateAnswer(question, "Wrong answer")).toEqual({ correct: false, points: 0 });
    expect(calculateAnswer(question, question.correctAnswer)).toEqual({ correct: true, points: question.points });
  });

  it("does not generate questions when required player data is missing", () => {
    const incomplete = { ...stats, players: [], teams: [] };
    expect(generateQuestions(incomplete)).toEqual([]);
    expect(hasUsableMatchStats(incomplete)).toBe(false);
    expect(hasUsableMatchStats({ ...stats, players: [] })).toBe(false);
    expect(hasUsableMatchStats({ ...stats, teams: [] })).toBe(false);
    expect(hasUsableMatchStats(stats)).toBe(true);
  });

  it("generates one record question only for a triggered record signal", () => {
    expect(historicalRecords).toHaveLength(12);
    expect(getTriggeredRecordQuestion(stats)).toBeNull();
    const triggered = getTriggeredRecordQuestion({
      ...stats,
      recordTrigger: {
        recordId: "fastest-hat-trick",
        status: "broken",
        newHolder: "Demo Player",
        newValue: "2 minutes 40 seconds",
        evidence: "A demo event broke the record.",
      },
    });
    expect(triggered?.text).toContain("Demo Player");
    expect(triggered?.text).toContain("Who held it before?");
    expect(triggered?.correctAnswer).toBe("Sadio Mané");
    expect(triggered?.explanation).toContain("Previous record: 2 minutes 56 seconds — Sadio Mané");
    expect(triggered?.explanation).toContain("New record: 2 minutes 40 seconds — Demo Player");
    expect(triggered?.points).toBe(3);
    expect(triggered?.sourceData[0]).toContain("premierleague.com");
  });

  it("exposes the broken record in the Villa demo fixture", async () => {
    const provider = new MockFootballDataProvider();
    const villaStats = await provider.getMatchStats("demo-villa-united");
    const question = villaStats ? getTriggeredRecordQuestion(villaStats) : null;

    expect(villaStats?.recordTrigger?.status).toBe("broken");
    expect(question?.text).toContain("Ollie Watkins");
    expect(question?.correctAnswer).toBe("Sadio Mané");
    expect(question?.explanation).toContain("Previous record: 2 minutes 56 seconds — Sadio Mané");
    expect(question?.explanation).toContain("New record: 2 minutes 41 seconds — Ollie Watkins");
  });

  it("selects the most recent record event by timestamp", () => {
    const question = getTriggeredRecordQuestion({
      ...stats,
      recordTriggers: [
        { recordId: "fastest-hat-trick", status: "broken", eventAt: "2026-10-20T18:05:00.000Z", newHolder: "Earlier Player", evidence: "Earlier event." },
        { recordId: "season-goals", status: "broken", eventAt: "2026-10-20T18:10:00.000Z", newHolder: "Latest Player", newValue: "35 goals", evidence: "Latest event." },
      ],
    });

    expect(question?.text).toContain("Latest Player");
    expect(question?.text).toContain("most goals in a premier league season");
  });

  it("rejects a broken-record trigger without new holder and time", () => {
    expect(getTriggeredRecordQuestion({
      ...stats,
      recordTrigger: {
        recordId: "fastest-hat-trick",
        status: "broken",
        evidence: "Incomplete demo event.",
      },
    })).toBeNull();
  });
});
