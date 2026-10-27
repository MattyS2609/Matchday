import type { FootballDataProvider } from "../types";
import { ApiFootballProvider } from "./apiFootballProvider";
import { MockFootballDataProvider } from "./mockProvider";

export function createFootballDataProvider(): FootballDataProvider {
  return import.meta.env.VITE_DATA_MODE === "api-football"
    ? new ApiFootballProvider()
    : new MockFootballDataProvider();
}
