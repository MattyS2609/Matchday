# Matchday

Matchday is a Premier League quiz built around the changing story of a live match.

## Current status

Milestones 1 through 6 are complete. The project has live API integration, quiz-generation safeguards, provider and normalization coverage, and documented local-running instructions.

## Run locally

```bash
npm install
npm run dev
```

The app runs without credentials. Copy `.env.example` to `.env` when configuring local settings.

## Architecture notes

- `src/types.ts` contains domain types that are independent of any provider.
- `src/data/` contains the `FootballDataProvider` boundary and the mock implementation.
- API-Football is integrated behind this boundary, server-side, so keys never reach browser code.
- Demo fixtures deliberately carry `dataSource: "demo"` and the UI labels them as simulated.
- Selecting a fixture opens a detail screen with match status, score, venue, data availability, refresh behavior, and a quiz launch action that only proceeds when sufficient statistics are available.
- The quiz engine calculates ranking and numerical questions from the latest available statistics, assigns template difficulty (easy/medium/hard = 1/2/3 points), prevents duplicate question IDs, and refuses to invent questions from empty data.
- Demo mode currently provides ten deterministic questions for both the Arsenal vs Manchester City and Aston Villa vs Manchester United fixtures. Each fixture has an independent statistics dataset, and answers display an explanation and the source statistics used for calculation.
- The records catalogue contains 12 structured entries with official Premier League source URLs and verification dates. A single record question appears only when a match statistics payload includes an explicit break or documented projection. The demo Villa vs United payload includes a clearly labelled simulated broken record: Ollie Watkins beats the fastest hat-trick demonstration record, and the question asks for the previous holder.
- On the individual match page, the regular ten-question quiz and records question are separate. The records panel starts with “No record has been broken in this match” and only checks for changes after a manual refresh. Refreshing is capped at 10 requests per hour per match page, with a wait-time message after the limit. When multiple record events are returned, the event timestamp determines which latest break is shown.
- Broken-record questions use the catalogue's current holder/value as the previous record and require the trigger to provide a new holder/value. This prevents a historical former holder from being mistaken for the record that was actually broken. Feedback displays both entries, for example: “Previous record: 2 minutes 56 seconds — Sadio Mané. New record: 2 minutes 41 seconds — Ollie Watkins.”
- Regular quiz question selection avoids paired player/name and player/number questions for the same statistic. Ranking explanations include the leading player's number, so asking the matching number question later would leak its answer; the generator now uses distinct aggregate numerical facts instead and avoids asking first-goal and top-scorer questions together when they refer to the same player.

API mode requests completed Premier League fixtures for the configured season, sorts by kickoff, and exposes only the three most recent fixtures. Fixture responses are cached for 15 minutes and match statistics for 30 minutes to reduce API-Football usage against the free plan's 100-request daily quota and 10-request-per-minute limit. The current free-plan response only permits seasons 2022–2024, so use `API_FOOTBALL_SEASON=2024` until a newer season is available on the plan. API errors are surfaced to the UI; API mode does not silently substitute demo data.

Run `npm run dev` to start both Vite and the local API server. Put `API_FOOTBALL_KEY` in `.env`, never `.env.example`, and rotate any key that has previously been placed in a tracked or shared file. Set `VITE_DATA_MODE=demo` to run without API credentials. Completed API fixtures can be played as quizzes; upcoming fixtures remain unavailable until kick-off. The application should only generate a question when its required statistics are present; missing statistics must be represented as unavailable rather than inferred.

Run `npm test` for the quiz, provider-boundary, and API normalization tests, and `npm run build` for the production type-check and build. Live API smoke checks should be run sparingly because the free plan limits requests per minute and per day.

## Match Story questions

The match detail page includes an optional Match Story question generated from verified match statistics. It is served by the Express API at `/api/fixtures/:fixtureId/story-question`, cached by fixture, statistics timestamp, and historical meeting, and kept separate from the ten-question quiz and record question. When available, the server also looks up the most recent previous meeting between the same teams and its goal events. Historical questions use only the verified previous-match top scorers; ties and missing event data are handled without guessing.

The default mode is deterministic:

```env
MATCH_QUESTION_MODE=deterministic
MATCH_QUESTION_FALLBACK=true
```

To enable Amazon Bedrock locally, configure AWS credentials using the AWS CLI or another standard AWS credential provider, then set:

```env
MATCH_QUESTION_MODE=llm
AWS_REGION=eu-west-2
BEDROCK_MODEL_ID=amazon.nova-lite-v1:0
```

The server uses the AWS SDK's Bedrock Runtime client. The model receives only the normalized fixture, current statistics, and verified historical context when available. It must return four unique options, a correct answer, an explanation, and evidence. Historical comparison questions are accepted only when their answer is a verified top scorer from the previous meeting. Invalid or failed Bedrock output falls back to a deterministic statistics-based question unless `MATCH_QUESTION_FALLBACK=false`.

For deployment, use an IAM role with only the required Bedrock invocation permission and store API keys in AWS Secrets Manager. Never place AWS credentials, Bedrock configuration secrets, or the API-Football key in a `VITE_` variable or commit them to source control.
