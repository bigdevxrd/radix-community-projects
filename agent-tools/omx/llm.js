// LLM API caller — zero dependencies, uses native fetch (Node 20+)
// Supports Anthropic Claude and OpenAI GPT APIs

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

/**
 * Detect which LLM provider is configured
 * @returns {"anthropic"|"openai"|null}
 */
function getProvider() {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  return null;
}

/**
 * Call the configured LLM and return the text response
 * @param {object} opts
 * @param {string} opts.system — system prompt
 * @param {string} opts.user — user message
 * @param {string} [opts.model] — model override
 * @param {number} [opts.maxTokens=4096] — max response tokens
 * @returns {Promise<string>} LLM text response
 * @throws {Error} if no provider is configured or API call fails
 */
async function ask(opts) {
  const { system, user, maxTokens = 4096 } = opts;
  const provider = getProvider();

  if (!provider) {
    throw new Error(
      "No LLM provider configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY in your .env file."
    );
  }

  const model = opts.model || getDefaultModel(provider);

  if (provider === "anthropic") {
    return callAnthropic({ system, user, model, maxTokens });
  }
  return callOpenAI({ system, user, model, maxTokens });
}

/**
 * Call the LLM and parse the response as JSON
 * @param {object} opts — same as ask()
 * @returns {Promise<object>} parsed JSON
 */
async function askJSON(opts) {
  const text = await ask(opts);

  // Extract JSON from response — handle markdown code fences
  let jsonStr = text;
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  try {
    return JSON.parse(jsonStr);
  } catch (err) {
    throw new Error(`LLM returned invalid JSON: ${err.message}\nRaw: ${text.slice(0, 500)}`);
  }
}

function getDefaultModel(provider) {
  if (provider === "anthropic") {
    return process.env.ARCHITECT_MODEL || "claude-sonnet-4-20250514";
  }
  return "gpt-4o";
}

async function callAnthropic({ system, user, model, maxTokens }) {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  return data.content[0].text;
}

async function callOpenAI({ system, user, model, maxTokens }) {
  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

module.exports = { ask, askJSON, getProvider };
