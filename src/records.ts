import type { HistoricalRecord, MatchStats, QuizQuestion } from "./types";

const recordsSource = "https://www.premierleague.com/stats/records";
const playersSource = "https://www.premierleague.com/en/news/662064/records-players";
const verifiedAt = "2026-10-20";

export const historicalRecords: HistoricalRecord[] = [
  { id: "fastest-goal", category: "fastest", title: "Fastest Premier League goal", holder: "Shane Long", value: "7.69 seconds", dateOrSeason: "23 April 2019", sourceUrl: "https://www.premierleague.com/en/news/1195500/long-scores-fastest-goal-in-premier-league-history", verifiedAt },
  { id: "fastest-hat-trick", category: "fastest", title: "Fastest Premier League hat-trick", holder: "Sadio Mané", value: "2 minutes 56 seconds", dateOrSeason: "2014/15", sourceUrl: recordsSource, verifiedAt },
  { id: "season-goals", category: "goals", title: "Most goals in a Premier League season", holder: "Erling Haaland", value: "36 goals", dateOrSeason: "2022/23", sourceUrl: "https://www.premierleague.com/en/news/3793778", verifiedAt },
  { id: "all-time-goals", category: "goals", title: "Most Premier League goals", holder: "Alan Shearer", value: "260 goals", dateOrSeason: "1992/93–2005/06", sourceUrl: recordsSource, verifiedAt },
  { id: "most-appearances", category: "appearances", title: "Most Premier League appearances", holder: "James Milner", value: "658 appearances", dateOrSeason: "2002/03–2025/26", sourceUrl: playersSource, verifiedAt },
  { id: "most-assists", category: "appearances", title: "Most Premier League assists", holder: "Ryan Giggs", value: "162 assists", dateOrSeason: "1992/93–2013/14", sourceUrl: playersSource, verifiedAt },
  { id: "most-clean-sheets", category: "appearances", title: "Most Premier League clean sheets", holder: "Petr Čech", value: "202 clean sheets", dateOrSeason: "2004/05–2018/19", sourceUrl: playersSource, verifiedAt },
  { id: "youngest-player", category: "youngest-oldest", title: "Youngest Premier League player", holder: "Ethan Nwaneri", value: "15 years 181 days", dateOrSeason: "18 September 2022", sourceUrl: recordsSource, verifiedAt },
  { id: "oldest-player", category: "youngest-oldest", title: "Oldest Premier League player", holder: "John Burridge", value: "43 years 162 days", dateOrSeason: "1994/95", sourceUrl: recordsSource, verifiedAt },
  { id: "most-goals-match", category: "goals", title: "Most goals by a player in one match", holder: "Five players share the record", value: "5 goals", dateOrSeason: "Various seasons", sourceUrl: recordsSource, verifiedAt },
  { id: "most-titles", category: "club-team", title: "Most Premier League winner medals", holder: "Ryan Giggs", value: "13 titles", dateOrSeason: "1992/93–2012/13", sourceUrl: recordsSource, verifiedAt },
  { id: "consecutive-appearances", category: "club-team", title: "Most consecutive Premier League appearances", holder: "Brad Friedel", value: "310 appearances", dateOrSeason: "2004/05–2011/12", sourceUrl: recordsSource, verifiedAt },
];

export function getTriggeredRecordQuestion(stats: MatchStats): QuizQuestion | null {
  const triggers = stats.recordTriggers ?? (stats.recordTrigger ? [stats.recordTrigger] : []);
  const trigger = [...triggers].sort((a, b) => (b.eventAt ?? "").localeCompare(a.eventAt ?? ""))[0];
  if (!trigger) return null;
  const record = historicalRecords.find((candidate) => candidate.id === trigger.recordId);
  if (!record) return null;
  if (trigger.status === "broken" && (!trigger.newHolder || !trigger.newValue)) return null;

  const alternatives = historicalRecords
    .filter((candidate) => candidate.id !== record.id)
    .map((candidate) => candidate.holder)
    .filter((holder, index, holders) => holders.indexOf(holder) === index);

  return {
    id: `record-${record.id}-${trigger.status}`,
    fixtureId: stats.fixtureId,
    text: trigger.status === "broken"
      ? `${trigger.newHolder ?? "A player"} has just broken the ${record.title.toLowerCase()} record. Who held it before?`
      : `${trigger.newHolder ?? "A player"} is on track to challenge the ${record.title.toLowerCase()} record. Who currently holds it?`,
    options: trigger.status === "broken"
      ? [record.holder, ...alternatives].slice(0, 4)
      : [record.holder, ...alternatives].slice(0, 4),
    correctAnswer: record.holder,
    explanation: trigger.status === "broken"
      ? `Previous record: ${record.value} — ${record.holder}. New record: ${trigger.newValue} — ${trigger.newHolder}. ${trigger.evidence}`
      : `Current record: ${record.value} — ${record.holder}. ${trigger.evidence}`,
    sourceData: [record.sourceUrl, `Verified ${record.verifiedAt}`],
    calculatedAt: stats.calculatedAt,
    difficulty: "hard",
    points: 3,
  };
}
