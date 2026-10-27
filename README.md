# Matchday

Matchday is a Premier League football quiz built around the changing story of a match. It combines live API-Football data with a React quiz engine, historical record questions, and optional AI-generated Match Story questions.

## Project progress

Milestones 1–6 are complete:

- React, TypeScript, and Vite application scaffold
- Responsive football-themed match-centre UI
- Demo data provider and live API provider boundary
- Server-side API-Football integration
- Completed Premier League fixture selection
- Player and team-statistics normalization
- Ten-question quiz generation with difficulty scoring
- Duplicate-question and answer-leakage safeguards
- Historical Premier League record questions
- API caching, error handling, and normalization tests
- Match Story questions generated from verified match statistics
- Optional Amazon Bedrock integration using Amazon Nova Lite
- Historical head-to-head context for Match Story questions
- Documented local setup and security requirements

The current project is suitable for local development and demonstration. Production deployment still requires operational decisions around persistent caching, rate limiting, secret management, monitoring, and hosting.

## How the project works

```text
React/Vite browser
        |
        |  Vite proxy for /api
        v
Express API server
        |
        +--> API-Football
        |      fixtures, player statistics,
        |      team statistics, previous meetings
        |
        +--> Amazon Bedrock (optional)
               Match Story question generation
```

### Data modes

The browser selects a provider using `VITE_DATA_MODE`:

- `demo` uses deterministic sample fixtures and requires no external credentials.
- `api-football` requests data from the local Express server. The API key never reaches browser code.

### Match centre and quiz

API mode requests completed Premier League fixtures for the configured season. Results are sorted by kickoff and limited to the three most recent fixtures. Selecting a completed fixture loads normalized player and team statistics and enables the ten-question quiz.

The quiz generates supported questions from the available data:

- Player leaders for passes, shots, and tackles
- Team shots on target
- Top scorer
- Aggregate goals, passes, shots, and tackles

Questions are not generated from missing data. Difficulty is worth 1, 2, or 3 points for easy, medium, and hard questions.

### Historical records

The record panel is separate from the regular quiz. It only displays a record question when the match data includes an explicit record trigger. The demo provider includes a clearly labelled simulated record event. Live API statistics do not automatically prove a Premier League record.

### Match Story

Match Story is a separate optional question on the match detail page. The Express server:

1. Loads normalized current-match statistics.
2. Finds the most recent previous meeting between the same teams.
3. Reads that match's goal events and identifies verified top scorers.
4. Sends only the verified context to Amazon Bedrock when LLM mode is enabled.
5. Validates the returned question and its four options.
6. Caches the result by fixture, statistics timestamp, and historical meeting.

The prompt encourages inventive, Tenable/Ten-a-Ball-inspired questions while preventing unsupported claims about tactics, emotions, injuries, commentary, goal times, or events that were not supplied. If Bedrock is unavailable or returns invalid output, the application uses a clearly identifiable deterministic statistics-based fallback unless fallback is disabled.

## Requirements

- Node.js 20 or newer
- npm
- An API-Football account and key for live mode
- AWS credentials with Bedrock invocation permission for LLM mode

Demo mode only requires Node.js and npm.

## Installation

From the project directory:

```powershell
npm install
```

Copy the example environment file:

```powershell
Copy-Item .env.example .env
```

Never commit `.env`. It is ignored by `.gitignore`.

## Configuration

### Demo mode

For a no-credential setup, use:

```env
VITE_DATA_MODE=demo
MATCH_QUESTION_MODE=deterministic
MATCH_QUESTION_FALLBACK=true
```

### API-Football mode

Use the following settings in `.env`:

```env
VITE_DATA_MODE=api-football
API_FOOTBALL_KEY=your-local-api-football-key
API_FOOTBALL_BASE_URL=https://v3.football.api-sports.io
API_FOOTBALL_LEAGUE_ID=39
API_FOOTBALL_SEASON=2024
```

The free plan used during development accepted seasons 2022–2024 and has request limits. The application caches fixtures for 15 minutes and match statistics for 30 minutes. Head-to-head context is cached for 24 hours. Do not repeatedly run live smoke tests against a limited API key.

### Amazon Bedrock Match Story mode

The current tested model is Amazon Nova Lite:

```env
MATCH_QUESTION_MODE=llm
MATCH_QUESTION_FALLBACK=true
AWS_REGION=eu-west-2
BEDROCK_MODEL_ID=amazon.nova-lite-v1:0
```

Configure AWS credentials using the AWS CLI, AWS IAM Identity Center, or another standard AWS SDK credential provider. For local development, a named AWS CLI profile can be selected with:

```env
AWS_PROFILE=your-profile-name
```

The AWS identity needs permission to call Bedrock, including `bedrock:Converse` and `bedrock:InvokeModel` for the selected model. Model access and availability are account- and region-specific; confirm the exact model ID in the AWS console or with the AWS CLI.

For production, use an IAM role and AWS Secrets Manager rather than long-lived access keys in environment files.

## Running the application

Start the Vite frontend and Express API together:

```powershell
npm run dev
```

The frontend is served by Vite and the API listens on port `3001` by default. Open the Vite URL shown in the terminal, normally `http://localhost:5173`.

Individual commands are also available:

```powershell
npm run dev:client
npm run dev:api
```

To use the API server on another port:

```env
API_PORT=3002
```

## Useful API routes

```text
GET /api/fixtures
GET /api/fixtures/:fixtureId/stats
GET /api/fixtures/:fixtureId/story-question
```

The API returns explicit errors for missing credentials, unavailable API data, and unusable statistics. API mode does not silently replace live failures with demo data.

## Validation

Run the complete test suite:

```powershell
npm test
```

Run the TypeScript check and production build:

```powershell
npm run build
```

The tests cover quiz generation, API provider behavior, API normalization, creative-question validation, and historical meeting/scorer extraction.

## Security

- Never put API keys in `VITE_` variables.
- Never commit `.env`, AWS credentials, API-Football keys, or generated secrets.
- `.env.example` contains placeholders and is safe to share.
- Rotate credentials if they have been committed, pasted into a public issue, or otherwise exposed.
- Do not use `git add -f .env`.
- Use AWS IAM roles and Secrets Manager for deployed services.

