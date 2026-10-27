import type { MatchStats, PlayerMatchStats, QuizQuestion, QuestionDifficulty } from "./types";

const pointsByDifficulty: Record<QuestionDifficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

function optionsFor(correctAnswer: string, alternatives: string[]): string[] {
  const options = [correctAnswer, ...alternatives.filter((answer) => answer !== correctAnswer)];
  const numericAnswer = Number(correctAnswer);

  if (Number.isFinite(numericAnswer)) {
    for (const offset of [1, -1, 2, -2, 3, -3, 5, -5]) {
      const distractor = String(numericAnswer + offset);
      if (!options.includes(distractor) && Number(numericAnswer + offset) >= 0) options.push(distractor);
      if (options.length === 4) break;
    }
  }

  for (let index = 1; options.length < 4; index += 1) {
    const distractor = `Option ${index}`;
    if (!options.includes(distractor)) options.push(distractor);
  }

  return options.slice(0, 4);
}

function topPlayer(players: PlayerMatchStats[], field: keyof Pick<PlayerMatchStats, "passes" | "shots" | "tackles">) {
  return [...players].sort((a, b) => b[field] - a[field])[0];
}

function question(
  id: string,
  fixtureId: string,
  text: string,
  correctAnswer: string,
  alternatives: string[],
  explanation: string,
  sourceData: string[],
  calculatedAt: string,
  difficulty: QuestionDifficulty,
): QuizQuestion {
  return {
    id,
    fixtureId,
    text,
    options: optionsFor(correctAnswer, alternatives),
    correctAnswer,
    explanation,
    sourceData,
    calculatedAt,
    difficulty,
    points: pointsByDifficulty[difficulty],
  };
}

export function generateQuestions(stats: MatchStats, limit = 10): QuizQuestion[] {
  const { players, teams, fixtureId, calculatedAt } = stats;
  const questions: QuizQuestion[] = [];
  const add = (candidate: QuizQuestion | null) => {
    if (candidate && !questions.some((item) => item.id === candidate.id)) questions.push(candidate);
  };
  const passes = topPlayer(players, "passes");
  const shots = topPlayer(players, "shots");
  const tackles = topPlayer(players, "tackles");
  const topScorer = [...players].sort((a, b) => b.goals - a.goals)[0];

  if (passes) {
    add(question("most-passes", fixtureId, "Which player has completed the most passes in this match?", passes.playerName, players.map((player) => player.playerName), `${passes.playerName} leads the match with ${passes.passes} completed passes.`, [`${passes.playerName}: ${passes.passes} passes`], calculatedAt, "medium"));
  }
  if (shots) {
    add(question("most-shots", fixtureId, "Which player has taken the most shots?", shots.playerName, players.map((player) => player.playerName), `${shots.playerName} leads the match with ${shots.shots} shots.`, [`${shots.playerName}: ${shots.shots} shots`], calculatedAt, "medium"));
  }
  if (tackles) {
    add(question("most-tackles", fixtureId, "Which player has made the most tackles?", tackles.playerName, players.map((player) => player.playerName), `${tackles.playerName} leads the match with ${tackles.tackles} tackles.`, [`${tackles.playerName}: ${tackles.tackles} tackles`], calculatedAt, "medium"));
  }
  for (const team of teams) {
    add(question(`team-shots-on-target-${team.teamId}`, fixtureId, `How many shots on target did ${team.teamId} have?`, String(team.shotsOnTarget), teams.map((item) => String(item.shotsOnTarget)), `${team.teamId} had ${team.shotsOnTarget} shots on target.`, [`${team.teamId}: ${team.shotsOnTarget} shots on target`], calculatedAt, "easy"));
  }
  if (topScorer && topScorer.goals > 0) {
    add(question("most-goals", fixtureId, "Which player has scored the most goals in this match?", topScorer.playerName, players.map((player) => player.playerName), `${topScorer.playerName} is the top scorer with ${topScorer.goals} goal(s).`, [`${topScorer.playerName}: ${topScorer.goals} goal(s)`], calculatedAt, "medium"));
  }
  if (players.length > 0) {
    const totalGoals = players.reduce((total, player) => total + player.goals, 0);
    const totalPasses = players.reduce((total, player) => total + player.passes, 0);
    const totalShots = players.reduce((total, player) => total + player.shots, 0);
    const totalTackles = players.reduce((total, player) => total + player.tackles, 0);
    add(question("total-passes", fixtureId, "How many completed passes are recorded across the players in this match?", String(totalPasses), ["120", "180", "240"], `${totalPasses} completed passes are recorded across the supplied player statistics.`, [`Total passes: ${totalPasses}`], calculatedAt, "hard"));
    add(question("total-shots", fixtureId, "How many shots are recorded across the players in this match?", String(totalShots), ["8", "12", "16"], `${totalShots} shots are recorded across the supplied player statistics.`, [`Total shots: ${totalShots}`], calculatedAt, "medium"));
    add(question("total-tackles", fixtureId, "How many tackles are recorded across the players in this match?", String(totalTackles), ["10", "15", "20"], `${totalTackles} tackles are recorded across the supplied player statistics.`, [`Total tackles: ${totalTackles}`], calculatedAt, "hard"));
    add(question("total-goals", fixtureId, "How many goals have been scored in this match?", String(totalGoals), ["0", "1", "3"], `${totalGoals} goals have been recorded in the available match data.`, [`Total goals: ${totalGoals}`], calculatedAt, "easy"));
  }
  return questions.slice(0, limit);
}

export function hasUsableMatchStats(stats: MatchStats): boolean {
  return stats.players.length > 0 && stats.teams.length > 0;
}

export function calculateAnswer(questionToScore: QuizQuestion, answer: string): { correct: boolean; points: number } {
  const correct = answer === questionToScore.correctAnswer;
  return { correct, points: correct ? questionToScore.points : 0 };
}
