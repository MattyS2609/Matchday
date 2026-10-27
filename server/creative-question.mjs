import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";

const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION || "eu-west-2" });

function contextFor(fixture, stats, previousMeeting) {
  return {
    fixture: { id: fixture.id, homeTeam: fixture.homeTeam.name, awayTeam: fixture.awayTeam.name, homeScore: fixture.homeScore, awayScore: fixture.awayScore, status: fixture.status },
    teams: stats.teams,
    players: stats.players,
    currentMatch: {
      topScorers: [...stats.players].filter((player) => player.goals > 0).sort((a, b) => b.goals - a.goals).slice(0, 3).map((player) => ({ playerName: player.playerName, goals: player.goals })),
    },
    previousMeeting: previousMeeting || null,
  };
}

function evidenceFor(stats) {
  return stats.teams.map((team) => `${team.teamId}: ${team.shotsOnTarget} shots on target`);
}

function validate(value, fixtureId, stats, previousMeeting) {
  if (!value || typeof value !== "object") throw new Error("Bedrock returned an invalid creative question: object expected.");
  if (value.fixtureId !== fixtureId) throw new Error("Bedrock returned an invalid creative question: fixture ID mismatch.");
  if (typeof value.text !== "string" || !value.text.trim()) throw new Error("Bedrock returned an invalid creative question: missing text.");
  if (!Array.isArray(value.options) || value.options.length !== 4 || new Set(value.options).size !== 4 || value.options.some((option) => typeof option !== "string" || !option.trim())) throw new Error("Bedrock returned an invalid creative question: options must be four unique strings.");
  if (typeof value.correctAnswer !== "string" || !value.options.includes(value.correctAnswer)) throw new Error("Bedrock returned an invalid creative question: answer is not one of the options.");
  if (value.category === "historical-comparison" && (!previousMeeting || !previousMeeting.topScorers.some((scorer) => scorer.playerName === value.correctAnswer))) {
    throw new Error("Bedrock returned an invalid historical question: answer is not a previous-match top scorer.");
  }
  const sourceData = Array.isArray(value.sourceData) && value.sourceData.length > 0 ? value.sourceData : evidenceFor(stats);
  const explanation = typeof value.explanation === "string" && value.explanation.trim()
    ? value.explanation
    : `This question is based on the verified statistics supplied for ${stats.fixtureId}.`;
  return { ...value, explanation, sourceData, id: `story-${fixtureId}-${Date.now()}`, fixtureId, generatedAt: new Date().toISOString(), generationSource: "bedrock" };
}

function parseModelJson(text) {
  const trimmed = text.trim();
  const fenceStart = trimmed.indexOf("```");
  const fenceEnd = trimmed.lastIndexOf("```");
  if (fenceStart >= 0 && fenceEnd > fenceStart) {
    const openingLineEnd = trimmed.indexOf("\n", fenceStart);
    const contentStart = openingLineEnd >= 0 ? openingLineEnd + 1 : fenceStart + 3;
    return JSON.parse(trimmed.slice(contentStart, fenceEnd).trim());
  }
  const objectStart = trimmed.indexOf("{");
  const objectEnd = trimmed.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) {
    return JSON.parse(trimmed.slice(objectStart, objectEnd + 1));
  }
  return JSON.parse(trimmed);
}

function deterministic(fixture, stats) {
  if (stats.teams.length < 2) throw new Error("Not enough team statistics for a creative question.");
  const [first, second] = stats.teams;
  const equal = first.shotsOnTarget === second.shotsOnTarget;
  const answer = equal ? "They were equal" : first.shotsOnTarget > second.shotsOnTarget ? first.teamId : second.teamId;
  return {
    id: `story-${fixture.id}-${stats.calculatedAt}`,
    fixtureId: fixture.id,
    text: `What stood out about the shots on target in ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}?`,
    options: [first.teamId, second.teamId, "They were equal", "Neither team registered one"],
    correctAnswer: answer,
    explanation: `${first.teamId} recorded ${first.shotsOnTarget} shots on target and ${second.teamId} recorded ${second.shotsOnTarget}.`,
    sourceData: [`${first.teamId}: ${first.shotsOnTarget} shots on target`, `${second.teamId}: ${second.shotsOnTarget} shots on target`],
    generatedAt: new Date().toISOString(),
    generationSource: "deterministic-fallback",
  };
}

export async function generateCreativeQuestion(fixture, stats, previousMeeting = null) {
  if (process.env.MATCH_QUESTION_MODE !== "llm") return deterministic(fixture, stats);
  const command = new ConverseCommand({
    modelId: process.env.BEDROCK_MODEL_ID,
    system: [{ text: [
      "Create one inventive, match-specific football quiz question using only the supplied facts.",
      "Use a Tenable/Ten-a-Ball-inspired style: give the question a memorable category, angle, or mini-story about this match and make the player weigh plausible football possibilities.",
      "Do not copy any existing quiz wording. Do not write a generic 'who had the most...' or 'how many did...' question unless it is transformed into a more distinctive match storyline.",
      "Good angles include: an unusual statistical pattern, a head-to-head comparison, a player who fits two clues at once, a 'which of these belongs in the match story?' choice, or a surprising connection between the score and the supplied statistics.",
      "The question must have one objectively correct answer. Every option must be a team or player present in the context, or a conclusion directly supported by the supplied numbers.",
      "Do not invent goal times, assists, tactics, emotions, injuries, formations, commentary, or events absent from the context.",
      "If previousMeeting is present, you may create a historical-comparison question linking this match to the previous meeting. Use only its supplied date, score, and topScorers. If it is absent, do not ask a historical question.",
      "Use exactly four unique options. Include a short explanation and at least one sourceData evidence item in the tool response. Return the question through the required tool.",
    ].join(" ") }],
    messages: [{ role: "user", content: [{ text: JSON.stringify(contextFor(fixture, stats, previousMeeting)) }] }],
    inferenceConfig: { maxTokens: 500, temperature: 0.4 },
    toolConfig: {
      tools: [{
        toolSpec: {
          name: "create_match_question",
          description: "Return one validated creative match question.",
          inputSchema: {
            json: {
              type: "object",
              properties: {
                fixtureId: { type: "string" },
                category: { type: "string", enum: ["statistical-pattern", "player-comparison", "score-context", "historical-comparison"] },
                text: { type: "string" },
                options: { type: "array", minItems: 4, maxItems: 4, items: { type: "string" } },
                correctAnswer: { type: "string" },
                explanation: { type: "string" },
                sourceData: { type: "array", minItems: 1, items: { type: "string" } },
              },
              required: ["fixtureId", "text", "options", "correctAnswer", "explanation", "sourceData"],
            },
          },
        },
      }],
      toolChoice: { tool: { name: "create_match_question" } },
    },
  });
  try {
    const result = await bedrock.send(command);
    const toolUse = result.output?.message?.content?.find((item) => item.toolUse?.name === "create_match_question")?.toolUse;
    if (!toolUse?.input) throw new Error("Bedrock returned no structured creative question.");
    return validate(toolUse.input, fixture.id, stats, previousMeeting);
  } catch (error) {
    if (process.env.MATCH_QUESTION_FALLBACK !== "false") return deterministic(fixture, stats);
    throw error;
  }
}
