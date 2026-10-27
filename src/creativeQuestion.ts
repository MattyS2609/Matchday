import type { CreativeMatchQuestion, Fixture, MatchStats } from "./types";

export function createDeterministicCreativeQuestion(fixture: Fixture, stats: MatchStats): CreativeMatchQuestion | null {
  if (stats.teams.length < 2) return null;
  const [first, second] = stats.teams;
  const equal = first.shotsOnTarget === second.shotsOnTarget;
  const correctAnswer = equal ? "They were equal" : first.shotsOnTarget > second.shotsOnTarget ? first.teamId : second.teamId;
  const options = [first.teamId, second.teamId, "They were equal", "Neither team registered one"];
  return {
    id: `story-${fixture.id}-${stats.calculatedAt}`,
    fixtureId: fixture.id,
    text: `What stood out about the shots on target in ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}?`,
    options,
    correctAnswer,
    explanation: `${first.teamId} recorded ${first.shotsOnTarget} shots on target and ${second.teamId} recorded ${second.shotsOnTarget}.`,
    sourceData: [`${first.teamId}: ${first.shotsOnTarget} shots on target`, `${second.teamId}: ${second.shotsOnTarget} shots on target`],
    generatedAt: new Date().toISOString(),
    generationSource: "deterministic-fallback",
  };
}

export function validateCreativeQuestion(value: unknown, fixtureId: string): CreativeMatchQuestion {
  if (!value || typeof value !== "object") throw new Error("Creative question response was not an object.");
  const question = value as Partial<CreativeMatchQuestion>;
  if (question.fixtureId !== fixtureId || typeof question.text !== "string" || !question.text) throw new Error("Creative question has invalid fixture or text.");
  if (!Array.isArray(question.options) || question.options.length !== 4 || new Set(question.options).size !== 4 || question.options.some((option) => typeof option !== "string" || !option)) throw new Error("Creative question must have four unique options.");
  if (typeof question.correctAnswer !== "string" || !question.options.includes(question.correctAnswer)) throw new Error("Creative question has an invalid correct answer.");
  if (typeof question.explanation !== "string" || !question.explanation || !Array.isArray(question.sourceData) || question.sourceData.length === 0) throw new Error("Creative question is missing explanation or evidence.");
  return question as CreativeMatchQuestion;
}
