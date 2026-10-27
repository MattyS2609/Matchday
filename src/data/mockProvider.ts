import type { Fixture, FootballDataProvider, MatchStats, Team } from "../types";

const teams: Record<string, Team> = {
  arsenal: { id: "arsenal", name: "Arsenal", shortName: "ARS", accent: "#ef0107" },
  chelsea: { id: "chelsea", name: "Chelsea", shortName: "CHE", accent: "#034694" },
  liverpool: { id: "liverpool", name: "Liverpool", shortName: "LIV", accent: "#c8102e" },
  city: { id: "city", name: "Manchester City", shortName: "MCI", accent: "#6cabdd" },
  united: { id: "united", name: "Manchester United", shortName: "MUN", accent: "#da291c" },
  villa: { id: "villa", name: "Aston Villa", shortName: "AVL", accent: "#670e36" },
};

const fixtures: Fixture[] = [
  {
    id: "demo-arsenal-city",
    homeTeam: teams.arsenal,
    awayTeam: teams.city,
    homeScore: 1,
    awayScore: 1,
    status: "live",
    minute: 67,
    kickoff: "Today, 20:00",
    venue: "Emirates Stadium",
    dataSource: "demo",
  },
  {
    id: "demo-liverpool-chelsea",
    homeTeam: teams.liverpool,
    awayTeam: teams.chelsea,
    homeScore: null,
    awayScore: null,
    status: "upcoming",
    minute: null,
    kickoff: "Today, 20:00",
    venue: "Anfield",
    dataSource: "demo",
  },
  {
    id: "demo-villa-united",
    homeTeam: teams.villa,
    awayTeam: teams.united,
    homeScore: 2,
    awayScore: 0,
    status: "finished",
    minute: 90,
    kickoff: "Yesterday, 16:30",
    venue: "Villa Park",
    dataSource: "demo",
  },
];

export class MockFootballDataProvider implements FootballDataProvider {
  async getFixtures(): Promise<Fixture[]> {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return fixtures;
  }

  async getMatchStats(fixtureId: string): Promise<MatchStats | null> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    if (!fixtures.some((fixture) => fixture.id === fixtureId) || fixtureId === "demo-liverpool-chelsea") return null;
    if (fixtureId === "demo-villa-united") {
      return {
        fixtureId,
        calculatedAt: "2026-10-20T18:00:00.000Z",
        dataSource: "demo",
        players: [
          { playerId: "watkins", playerName: "Ollie Watkins", teamId: "villa", passes: 24, shots: 6, tackles: 1, goals: 1 },
          { playerId: "rogers", playerName: "Morgan Rogers", teamId: "villa", passes: 38, shots: 3, tackles: 2, goals: 1 },
          { playerId: "tielemans", playerName: "Youri Tielemans", teamId: "villa", passes: 61, shots: 2, tackles: 4, goals: 0 },
          { playerId: "fernandes", playerName: "Bruno Fernandes", teamId: "united", passes: 49, shots: 4, tackles: 3, goals: 0 },
          { playerId: "garnacho", playerName: "Alejandro Garnacho", teamId: "united", passes: 31, shots: 2, tackles: 1, goals: 0 },
          { playerId: "martinez", playerName: "Lisandro Martínez", teamId: "united", passes: 54, shots: 1, tackles: 6, goals: 0 },
        ],
        teams: [
          { teamId: "Aston Villa", shotsOnTarget: 7 },
          { teamId: "Manchester United", shotsOnTarget: 3 },
        ],
        recordTrigger: {
          recordId: "fastest-hat-trick",
          status: "broken",
          eventAt: "2026-10-20T18:05:00.000Z",
          newHolder: "Ollie Watkins",
          newValue: "2 minutes 41 seconds",
          evidence: "Demo event: Ollie Watkins scored a hat-trick in 2 minutes 41 seconds. This is simulated data for demonstration only.",
        },
      };
    }
    return {
      fixtureId,
      calculatedAt: "2026-10-20T18:00:00.000Z",
      dataSource: "demo",
      players: [
        { playerId: "odegaard", playerName: "Martin Ødegaard", teamId: "arsenal", passes: 58, shots: 2, tackles: 1, goals: 0 },
        { playerId: "saka", playerName: "Bukayo Saka", teamId: "arsenal", passes: 41, shots: 4, tackles: 2, goals: 1 },
        { playerId: "rice", playerName: "Declan Rice", teamId: "arsenal", passes: 52, shots: 1, tackles: 5, goals: 0 },
        { playerId: "debruyne", playerName: "Kevin De Bruyne", teamId: "city", passes: 55, shots: 3, tackles: 2, goals: 1 },
        { playerId: "haaland", playerName: "Erling Haaland", teamId: "city", passes: 22, shots: 5, tackles: 0, goals: 0 },
        { playerId: "dias", playerName: "Rúben Dias", teamId: "city", passes: 47, shots: 0, tackles: 4, goals: 0 },
      ],
      teams: [
        { teamId: "Arsenal", shotsOnTarget: 5 },
        { teamId: "Manchester City", shotsOnTarget: 4 },
      ],
    };
  }
}
