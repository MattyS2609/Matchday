import { useEffect, useState } from "react";
import { createFootballDataProvider } from "./data";
import { createDeterministicCreativeQuestion } from "./creativeQuestion";
import { calculateAnswer, generateQuestions, hasUsableMatchStats } from "./quiz";
import { getTriggeredRecordQuestion } from "./records";
import type { CreativeMatchQuestion, Fixture, MatchStats, QuizQuestion } from "./types";
import "./styles.css";

const provider = createFootballDataProvider();

function statusLabel(fixture: Fixture): string {
  if (fixture.status === "live") return `${fixture.minute}' LIVE`;
  if (fixture.status === "finished") return "FT";
  return fixture.kickoff;
}

function sourceLabel(source: Fixture["dataSource"]): string {
  if (source === "live") return "LIVE API";
  if (source === "cached") return "CACHED DATA";
  if (source === "unavailable") return "DATA UNAVAILABLE";
  return "DEMO DATA";
}

interface RecordQuestionProps {
  question: QuizQuestion;
  onContinue: () => void;
  onExit: () => void;
  inline?: boolean;
}

function RecordQuestion({ question, onContinue, onExit, inline = false }: RecordQuestionProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const answered = selectedAnswer !== null;

  const content = (
    <>
      <div className="record-alert"><span className="record-alert-icon">★</span><div><p className="eyebrow">RECORD WATCH · 3 POINTS</p><h2>{question.text.includes("just broken") ? "A record has fallen" : "A record moment"}</h2><p>{question.text.includes("just broken") ? "This question was triggered by a simulated record-breaking event in the demo match." : "This question was triggered by a documented projection in the available match data."} Demo data is not live evidence.</p></div></div>
      <h1 className="question-title">{question.text}</h1>
      <div className="answer-grid">
        {question.options.map((option) => {
          const answerClass = answered ? option === question.correctAnswer ? "correct" : option === selectedAnswer ? "incorrect" : "" : "";
          return <button className={`answer-button ${answerClass}`} key={option} onClick={() => setSelectedAnswer(option)} disabled={answered}>{option}<span>{answered && option === question.correctAnswer ? "✓" : ""}</span></button>;
        })}
      </div>
      {answered && <div className={`feedback ${selectedAnswer === question.correctAnswer ? "feedback-correct" : "feedback-incorrect"}`}><strong>{selectedAnswer === question.correctAnswer ? "Correct!" : `Not quite — ${question.correctAnswer}`}</strong><p>{question.explanation}</p><small>Official source: {question.sourceData.join(" · ")}</small><button className="primary-button" onClick={onContinue}>{inline ? "CLOSE RECORD QUESTION" : "CONTINUE TO MATCH QUIZ"} <span>→</span></button></div>}
    </>
  );

  if (inline) return <div className="record-question-inline">{content}</div>;

  return (
    <main>
      <nav className="topbar"><button className="brand brand-button" onClick={onExit}><span className="brand-mark">M</span><span>matchday<span className="brand-dot">.</span></span></button><span className="source-pill"><i /> DEMO DATA</span></nav>
      <section className="quiz-shell">
        <button className="back-button" onClick={onExit}>← EXIT QUIZ</button>
        {content}
      </section>
    </main>
  );
}

function StoryQuestion({ question }: { question: CreativeMatchQuestion }) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const answered = selectedAnswer !== null;
  return <section className="record-detail-panel">
    <div className="record-detail-heading"><div><p className="eyebrow">MATCH STORY</p><h2>A question from this match</h2></div><span className="data-label"><i /> {question.generationSource === "bedrock" ? "AI GENERATED" : "STATISTICS FALLBACK"}</span></div>
    <h3 className="question-title">{question.text}</h3>
    <div className="answer-grid">{question.options.map((option) => <button className={`answer-button ${answered ? option === question.correctAnswer ? "correct" : option === selectedAnswer ? "incorrect" : "" : ""}`} key={option} onClick={() => setSelectedAnswer(option)} disabled={answered}>{option}<span>{answered && option === question.correctAnswer ? "✓" : ""}</span></button>)}</div>
    {answered && <div className={`feedback ${selectedAnswer === question.correctAnswer ? "feedback-correct" : "feedback-incorrect"}`}><strong>{selectedAnswer === question.correctAnswer ? "Correct!" : `Not quite — ${question.correctAnswer}`}</strong><p>{question.explanation}</p><small>Evidence: {question.sourceData.join(" · ")}</small></div>}
  </section>;
}

function App() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadFixtures = () => {
    setIsLoading(true);
    setLoadError(null);
    provider.getFixtures().then((data) => {
      setFixtures(data);
    }).catch(() => {
      setLoadError("We could not load the match centre. Please try again.");
    }).finally(() => {
      setIsLoading(false);
    });
  };

  useEffect(loadFixtures, []);

  if (selectedFixture) {
    return <MatchDetail fixture={selectedFixture} onBack={() => setSelectedFixture(null)} />;
  }

  return (
    <main>
      <nav className="topbar">
        <a className="brand" href="/" aria-label="Matchday home">
          <span className="brand-mark">M</span>
          <span>matchday<span className="brand-dot">.</span></span>
        </a>
        <span className="source-pill"><i /> {sourceLabel(fixtures[0]?.dataSource ?? "demo")}</span>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">THE QUIZ THAT MOVES WITH THE GAME</p>
          <h1>Think you know<br /><em>football?</em></h1>
          <p className="hero-text">Live stats. Instant questions.<br />Your matchday, reimagined.</p>
          <div className="hero-actions">
            <a className="primary-button" href="#matches">PLAY LIVE QUIZ <span>→</span></a>
            <a className="text-button" href="#records">EXPLORE RECORDS <span>↗</span></a>
          </div>
        </div>
        <div className="hero-ball" aria-hidden="true"><span>⚽</span></div>
      </section>

      <section className="content-section" id="matches">
        <div className="section-heading">
          <div><p className="eyebrow">MATCH CENTRE</p><h2>Pick your fixture</h2></div>
          <span className="live-note"><i /> UPDATES AS IT HAPPENS</span>
        </div>
        {isLoading ? <div className="empty-state">Loading today&apos;s fixtures...</div> : loadError ? (
          <div className="empty-state error-state"><p>{loadError}</p><button className="small-button" onClick={loadFixtures}>TRY AGAIN</button></div>
        ) : fixtures.length === 0 ? (
          <div className="empty-state">No Premier League fixtures are available right now.</div>
        ) : (
          <div className="fixture-grid">
            {fixtures.map((fixture) => (
              <button className={`fixture-card ${fixture.status}`} key={fixture.id} onClick={() => setSelectedFixture(fixture)}>
                <div className="fixture-top"><span className={`match-status ${fixture.status}`}><i />{statusLabel(fixture)}</span><span className="chevron">↗</span></div>
                <div className="teams">
                  <span className="team"><b style={{ backgroundColor: fixture.homeTeam.accent }}>{fixture.homeTeam.shortName}</b>{fixture.homeTeam.name}</span>
                  <strong>{fixture.homeScore ?? "–"} <small>—</small> {fixture.awayScore ?? "–"}</strong>
                  <span className="team away"><b style={{ backgroundColor: fixture.awayTeam.accent }}>{fixture.awayTeam.shortName}</b>{fixture.awayTeam.name}</span>
                </div>
                <span className="fixture-footer">{fixture.venue} <span>·</span> {fixture.status === "upcoming" ? "QUIZ OPENS AT KICK-OFF" : "PLAY MATCH QUIZ"}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="records-banner" id="records">
        <div><p className="eyebrow">BEYOND THE 90</p><h2>Football has a memory.</h2><p>Test yourself against the records, moments and legends that shaped the Premier League.</p></div>
        <span className="records-note">Record questions appear only when match data shows a verified break or documented projection.</span>
      </section>

    </main>
  );
}

interface MatchDetailProps {
  fixture: Fixture;
  onBack: () => void;
}

const REFRESH_LIMIT = 10;
const REFRESH_WINDOW_MS = 60 * 60 * 1000;

function MatchDetail({ fixture, onBack }: MatchDetailProps) {
  const [currentFixture, setCurrentFixture] = useState(fixture);
  const [stats, setStats] = useState<MatchStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [isQuizStarted, setIsQuizStarted] = useState(false);
  const [recordStats, setRecordStats] = useState<MatchStats | null>(null);
  const [recordAnswered, setRecordAnswered] = useState(false);
  const [storyQuestion, setStoryQuestion] = useState<CreativeMatchQuestion | null>(null);
  const [storyLoading, setStoryLoading] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);
  const [refreshStartedAt, setRefreshStartedAt] = useState<number | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isUpcoming = currentFixture.status === "upcoming";
  const isFinished = currentFixture.status === "finished";
  const recordQuestion = recordStats ? getTriggeredRecordQuestion(recordStats) : null;

  const startQuiz = () => {
    setStatsLoading(true);
    setStatsError(null);
    provider.getMatchStats(currentFixture.id).then((matchStats) => {
      if (!matchStats) {
        setStatsError("There is not enough verified match data to generate this quiz yet.");
        return;
      }
      if (!hasUsableMatchStats(matchStats)) {
        setStatsError("API-Football returned no usable player and team statistics for this match yet. Please try again later.");
        return;
      }
      setStats(matchStats);
      setIsQuizStarted(true);
    }).catch(() => {
      setStatsError("We could not load the match statistics. Please try again.");
    }).finally(() => setStatsLoading(false));
  };

  const refreshMatch = () => {
    const now = Date.now();
    const windowStart = refreshStartedAt ?? now;
    if (now - windowStart >= REFRESH_WINDOW_MS) {
      setRefreshStartedAt(now);
      setRefreshCount(0);
    } else if (refreshCount >= REFRESH_LIMIT) {
      const remainingMinutes = Math.ceil((REFRESH_WINDOW_MS - (now - windowStart)) / 60000);
      setRefreshMessage(`Refresh limit reached. Try again in ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}.`);
      return;
    }

    setIsRefreshing(true);
    setRefreshMessage(null);
    Promise.all([provider.getFixtures(), provider.getMatchStats(currentFixture.id)]).then(([fixtures, matchStats]) => {
      const refreshedFixture = fixtures.find((item) => item.id === currentFixture.id);
      if (refreshedFixture) setCurrentFixture(refreshedFixture);
      setRecordStats(matchStats);
      setRecordAnswered(false);
      setRefreshStartedAt(windowStart);
      setRefreshCount((count) => count + 1);
    }).catch(() => {
      setRefreshMessage("We could not refresh this match. No new record request was counted.");
    }).finally(() => setIsRefreshing(false));
  };

  const generateStoryQuestion = async () => {
    setStoryLoading(true);
    setStoryError(null);
    if (currentFixture.dataSource === "demo") {
      try {
        const matchStats = stats ?? await provider.getMatchStats(currentFixture.id);
        if (!matchStats) {
          setStoryError("There is not enough verified match data to generate a creative question yet.");
          return;
        }
        setStats(matchStats);
        const question = createDeterministicCreativeQuestion(currentFixture, matchStats);
        if (!question) {
          setStoryError("There is not enough verified match data to generate a creative question yet.");
        } else {
          setStoryQuestion(question);
        }
      } catch {
        setStoryError("We could not load the demo match statistics for the creative question.");
      } finally {
        setStoryLoading(false);
      }
      return;
    }
    fetch(`/api/fixtures/${encodeURIComponent(currentFixture.id)}/story-question`).then(async (result) => {
      const body = await result.json() as CreativeMatchQuestion | { error?: string };
      if (!result.ok) throw new Error("error" in body ? body.error : "Creative question unavailable");
      setStoryQuestion(body as CreativeMatchQuestion);
    }).catch((error: unknown) => {
      setStoryError(error instanceof Error ? error.message : "Creative question unavailable");
    }).finally(() => setStoryLoading(false));
  };

  if (isQuizStarted && stats) {
    return <LiveQuiz fixture={currentFixture} stats={stats} onExit={() => setIsQuizStarted(false)} />;
  }

  return (
    <main>
      <nav className="topbar">
        <button className="brand brand-button" onClick={onBack} aria-label="Back to match centre">
          <span className="brand-mark">M</span>
          <span>matchday<span className="brand-dot">.</span></span>
        </button>
        <span className="source-pill"><i /> {sourceLabel(currentFixture.dataSource)}</span>
      </nav>
      <section className="match-detail">
        <button className="back-button" onClick={onBack}>← BACK TO MATCH CENTRE</button>
        <div className="detail-header">
          <div>
            <p className="eyebrow">PREMIER LEAGUE · {currentFixture.venue}</p>
            <h1>{currentFixture.homeTeam.name}<br /><em>vs {currentFixture.awayTeam.name}</em></h1>
          </div>
          <div className="detail-status">
            <span className={`match-status ${currentFixture.status}`}><i />{statusLabel(currentFixture)}</span>
            <div className="detail-score"><strong>{currentFixture.homeScore ?? "–"}</strong><span>—</span><strong>{currentFixture.awayScore ?? "–"}</strong></div>
          </div>
        </div>
        <div className="data-banner"><span className="data-label"><i /> {currentFixture.dataSource === "live" ? "LIVE API DATA" : "SIMULATED DEMO DATA"}</span><span>{currentFixture.dataSource === "live" ? "Fetched from API-Football" : "Updates are manual in demo mode"}</span></div>
        <section className="detail-panel">
          <p className="eyebrow">MATCHDAY QUIZ</p>
          <h2>{isUpcoming ? "The quiz opens at kick-off." : isFinished ? "The final whistle has gone." : "Ready for the matchday quiz?"}</h2>
          <p>{isUpcoming ? "Come back when this match begins to play questions based on verified match statistics." : "Play ten questions calculated from the latest available match statistics. Every answer includes its source explanation."}</p>
          {statsError && <p className="inline-error" role="alert">{statsError}</p>}
          <div className="detail-actions">
            <button className="primary-button" onClick={startQuiz} disabled={isUpcoming || statsLoading}>{statsLoading ? "LOADING STATS..." : "START 10-QUESTION QUIZ"} <span>→</span></button>
            <button className="outline-button refresh-button" onClick={refreshMatch} disabled={isRefreshing}>{isRefreshing ? "REFRESHING..." : "REFRESH MATCH"} <span>↻</span></button>
          </div>
          {refreshMessage && <p className="inline-error" role="alert">{refreshMessage}</p>}
          <p className="refresh-count">Manual refreshes: {refreshCount}/{REFRESH_LIMIT} per hour</p>
        </section>
        <section className="record-detail-panel">
          <div className="record-detail-heading"><div><p className="eyebrow">RECORD WATCH</p><h2>Has a record fallen?</h2></div><span className="data-label"><i /> REFRESH CONTROLLED</span></div>
          {!recordStats ? (
            <p className="record-placeholder">No record has been broken in this match.</p>
          ) : recordQuestion && !recordAnswered ? (
            <RecordQuestion question={recordQuestion} onContinue={() => setRecordAnswered(true)} onExit={() => setRecordAnswered(true)} inline />
          ) : recordQuestion ? (
            <p className="record-placeholder record-confirmed">Record question answered. Refresh the match to check for a newer record event.</p>
          ) : (
            <p className="record-placeholder">No record has been broken in this match.</p>
          )}
          <p className="record-refresh-note">Record status changes only when you click Refresh Match. The latest event timestamp is shown when multiple record events are available.</p>
        </section>
        {storyQuestion ? <StoryQuestion question={storyQuestion} /> : <section className="record-detail-panel">
          <div className="record-detail-heading"><div><p className="eyebrow">MATCH STORY</p><h2>Find the story in the stats</h2></div><span className="data-label"><i /> OPTIONAL</span></div>
          <p className="record-placeholder">Generate a creative question based only on verified match statistics.</p>
          {storyError && <p className="inline-error" role="alert">{storyError}</p>}
          <button className="outline-button" onClick={generateStoryQuestion} disabled={storyLoading || isUpcoming}>{storyLoading ? "GENERATING..." : "GENERATE MATCH STORY"} <span>✦</span></button>
        </section>}
        <section className="availability-grid">
          <div><span className="availability-icon">◷</span><strong>Match status</strong><p>Score and status are available</p></div>
          <div><span className="availability-icon">◌</span><strong>Match statistics</strong><p>{isUpcoming ? "Not available before kick-off" : "Available for quiz generation"}</p></div>
          <div><span className="availability-icon">!</span><strong>Data source</strong><p>{currentFixture.dataSource === "live" ? "API-Football match data" : "Fixed demo fixture, not live"}</p></div>
        </section>
      </section>
    </main>
  );
}

interface LiveQuizProps {
  fixture: Fixture;
  stats: MatchStats;
  onExit: () => void;
}

function LiveQuiz({ fixture, stats, onExit }: LiveQuizProps) {
  const questions = generateQuestions(stats);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const currentQuestion: QuizQuestion | undefined = questions[questionIndex];
  const isComplete = questionIndex >= questions.length;

  if (isComplete) {
    return (
      <main>
        <nav className="topbar"><button className="brand brand-button" onClick={onExit}><span className="brand-mark">M</span><span>matchday<span className="brand-dot">.</span></span></button><span className="source-pill"><i /> {sourceLabel(stats.dataSource)}</span></nav>
        <section className="quiz-shell result-shell">
          <p className="eyebrow">FINAL WHISTLE</p><h1>Quiz <em>complete.</em></h1>
          <div className="result-score"><strong>{score}</strong><span>points</span></div>
          <p>You got {correctCount} of {questions.length} questions correct in the {fixture.homeTeam.name} vs {fixture.awayTeam.name} quiz.</p>
          <button className="primary-button" onClick={onExit}>BACK TO MATCH <span>→</span></button>
        </section>
      </main>
    );
  }

  if (!currentQuestion) return <section className="empty-state">No questions can be generated from the available statistics.</section>;

  const answerQuestion = (answer: string) => {
    if (selectedAnswer) return;
    const result = calculateAnswer(currentQuestion, answer);
    setSelectedAnswer(answer);
    setScore((current) => current + result.points);
    setCorrectCount((current) => current + (result.correct ? 1 : 0));
  };

  return (
    <main>
      <nav className="topbar"><button className="brand brand-button" onClick={onExit}><span className="brand-mark">M</span><span>matchday<span className="brand-dot">.</span></span></button><span className="source-pill"><i /> DEMO DATA</span></nav>
      <section className="quiz-shell">
        <button className="back-button" onClick={onExit}>← EXIT QUIZ</button>
        <div className="quiz-meta"><span>QUESTION {questionIndex + 1} / {questions.length}</span><strong>{score} PTS</strong></div>
        <div className="progress-bar"><span style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }} /></div>
        <p className="eyebrow">MATCHDAY QUIZ · {currentQuestion.points} {currentQuestion.points === 1 ? "POINT" : "POINTS"}</p>
        <h1 className="question-title">{currentQuestion.text}</h1>
        <div className="answer-grid">
          {currentQuestion.options.map((option) => {
            const answerClass = selectedAnswer ? option === currentQuestion.correctAnswer ? "correct" : option === selectedAnswer ? "incorrect" : "" : "";
            return <button className={`answer-button ${answerClass}`} key={option} onClick={() => answerQuestion(option)} disabled={Boolean(selectedAnswer)}>{option}<span>{selectedAnswer && option === currentQuestion.correctAnswer ? "✓" : ""}</span></button>;
          })}
        </div>
        {selectedAnswer && <div className={`feedback ${selectedAnswer === currentQuestion.correctAnswer ? "feedback-correct" : "feedback-incorrect"}`}><strong>{selectedAnswer === currentQuestion.correctAnswer ? "Correct!" : `Not quite — ${currentQuestion.correctAnswer}`}</strong><p>{currentQuestion.explanation}</p><small>Source data: {currentQuestion.sourceData.join(" · ")}</small><button className="primary-button" onClick={() => { setSelectedAnswer(null); setQuestionIndex((current) => current + 1); }}>{questionIndex + 1 === questions.length ? "SEE RESULTS" : "NEXT QUESTION"} <span>→</span></button></div>}
      </section>
    </main>
  );
}

export default App;
