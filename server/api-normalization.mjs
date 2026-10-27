export function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function teamStatistic(team, type) {
  const statistic = (team.statistics || []).find((item) => item.type === type);
  return numberOrZero(statistic?.value);
}
