import { describe, expect, it } from "vitest";
import { teamStatistic } from "./api-normalization.mjs";

describe("API-Football normalization", () => {
  it("reads shots on target from the team statistics array", () => {
    const team = {
      team: { name: "Newcastle" },
      statistics: [
        { type: "Shots on Goal", value: 6 },
        { type: "Shots off Goal", value: 7 },
        { type: "Total Shots", value: 17 },
      ],
    };

    expect(teamStatistic(team, "Shots on Goal")).toBe(6);
  });

  it("keeps unavailable team statistics at the explicit normalization boundary", () => {
    expect(teamStatistic({ statistics: [] }, "Shots on Goal")).toBe(0);
  });
});
