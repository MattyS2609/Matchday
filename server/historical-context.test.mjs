import { describe, expect, it } from "vitest";
import { extractTopScorers, historicalContextFrom, selectPreviousMeeting } from "./historical-context.mjs";

const currentDate = "2025-05-25T15:00:00Z";
const fixture = (id, date) => ({
  fixture: { id, date },
  teams: { home: { name: "Newcastle" }, away: { name: "Everton" } },
  goals: { home: 2, away: 1 },
});

describe("historical match context", () => {
  it("selects the most recent meeting before the current fixture", () => {
    const previous = selectPreviousMeeting([
      fixture("current", currentDate),
      fixture("older", "2024-01-01T15:00:00Z"),
      fixture("latest", "2024-12-01T15:00:00Z"),
      fixture("future", "2026-01-01T15:00:00Z"),
    ], "current", currentDate);
    expect(previous.fixture.id).toBe("latest");
  });

  it("counts goals and returns tied top scorers", () => {
    const scorers = extractTopScorers([
      { type: "Goal", detail: "Normal Goal", player: { name: "Player A" } },
      { type: "Goal", detail: "Penalty", player: { name: "Player B" } },
      { type: "Goal", detail: "Normal Goal", player: { name: "Player B" } },
      { type: "Goal", detail: "Own Goal", player: { name: "Player C" } },
    ]);
    expect(scorers).toEqual([{ playerName: "Player B", goals: 2 }]);
  });

  it("does not create context without identifiable scorers", () => {
    expect(historicalContextFrom(fixture("previous", "2024-12-01T15:00:00Z"), [])).toBeNull();
  });
});
