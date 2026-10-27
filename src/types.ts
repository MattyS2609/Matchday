export type MatchStatus = "live" | "upcoming" | "finished";

export type DataSource = "demo" | "live" | "cached" | "unavailable";

export interface Team {
  id: string;
  name: string;
  shortName: string;
  accent: string;
}

export interface Fixture {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  minute: number | null;
  kickoff: string;
  venue: string;
  dataSource: DataSource;
}

export interface PlayerMatchStats {
  playerId: string;
  playerName: string;
  teamId: string;
  passes: number;
  shots: number;
  tackles: number;
  goals: number;
}

export interface TeamMatchStats {
  teamId: string;
  shotsOnTarget: number;
}

export interface MatchStats {
  fixtureId: string;
  players: PlayerMatchStats[];
  teams: TeamMatchStats[];
  calculatedAt: string;
  dataSource: DataSource;
  recordTrigger?: RecordTrigger;
  recordTriggers?: RecordTrigger[];
}

export type CreativeQuestionSource = "bedrock" | "deterministic-fallback";

export interface CreativeMatchQuestion {
  id: string;
  fixtureId: string;
  text: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  sourceData: string[];
  generatedAt: string;
  generationSource: CreativeQuestionSource;
}

export type RecordTriggerStatus = "broken" | "on-track";

export interface RecordTrigger {
  recordId: string;
  status: RecordTriggerStatus;
  eventAt?: string;
  newHolder?: string;
  newValue?: string;
  evidence: string;
}

export type QuestionDifficulty = "easy" | "medium" | "hard";

export interface QuizQuestion {
  id: string;
  fixtureId: string;
  text: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  sourceData: string[];
  calculatedAt: string;
  difficulty: QuestionDifficulty;
  points: number;
}

export interface HistoricalRecord {
  id: string;
  category: "goals" | "appearances" | "youngest-oldest" | "club-team" | "fastest";
  title: string;
  holder: string;
  value: string;
  dateOrSeason: string;
  sourceUrl: string;
  verifiedAt: string;
}

export interface FootballDataProvider {
  getFixtures(): Promise<Fixture[]>;
  getMatchStats(fixtureId: string): Promise<MatchStats | null>;
}
