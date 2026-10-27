import type { Fixture, FootballDataProvider, MatchStats } from "../types";

async function request<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    let detail = "";
    try {
      const body = await response.json() as { error?: string };
      detail = body.error ? `: ${body.error}` : "";
    } catch {
      detail = "";
    }
    throw new Error(`Football data request failed (${response.status})${detail}`);
  }
  return response.json() as Promise<T>;
}

export class ApiFootballProvider implements FootballDataProvider {
  getFixtures(): Promise<Fixture[]> {
    return request<Fixture[]>("/api/fixtures");
  }

  getMatchStats(fixtureId: string): Promise<MatchStats | null> {
    return request<MatchStats | null>(`/api/fixtures/${encodeURIComponent(fixtureId)}/stats`);
  }
}
