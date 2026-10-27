export function selectPreviousMeeting(fixtures, currentFixtureId, currentDate) {
  const cutoff = new Date(currentDate).getTime();
  return fixtures
    .filter((item) => String(item.fixture?.id) !== String(currentFixtureId))
    .filter((item) => Number.isFinite(new Date(item.fixture?.date).getTime()))
    .filter((item) => new Date(item.fixture.date).getTime() < cutoff)
    .sort((a, b) => new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime())[0] || null;
}

export function extractTopScorers(events) {
  const goals = new Map();
  for (const event of events || []) {
    if (event.type !== "Goal" || !event.player?.name || event.detail === "Own Goal") continue;
    goals.set(event.player.name, (goals.get(event.player.name) || 0) + 1);
  }
  const scorers = [...goals.entries()].map(([playerName, goalCount]) => ({ playerName, goals: goalCount }));
  const highest = scorers.reduce((max, scorer) => Math.max(max, scorer.goals), 0);
  return scorers.filter((scorer) => scorer.goals === highest);
}

export function historicalContextFrom(previousFixture, topScorers) {
  if (!previousFixture || topScorers.length === 0) return null;
  return {
    fixtureId: String(previousFixture.fixture.id),
    playedAt: previousFixture.fixture.date,
    homeTeam: previousFixture.teams.home.name,
    awayTeam: previousFixture.teams.away.name,
    homeScore: previousFixture.goals.home,
    awayScore: previousFixture.goals.away,
    topScorers,
    source: [
      `API-Football fixture ${previousFixture.fixture.id}`,
      `API-Football events ${previousFixture.fixture.id}`,
    ],
  };
}
