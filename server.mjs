import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { networkInterfaces } from "node:os";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 8765);
const host = process.env.HOST || "0.0.0.0";
const defaultModels = [
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "google/gemini-2.5-flash-lite"
];
const models = (process.env.OPENROUTER_MODEL || defaultModels.join(","))
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
const model = models[0] || defaultModels[0];
const openRouterModelTimeoutMs = Number(process.env.OPENROUTER_MODEL_TIMEOUT_MS || 90_000);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".pdf": "application/pdf"
};

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

async function readJsonRequest(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 1_500_000) {
      throw new Error("Request is too large.");
    }
  }
  return JSON.parse(body || "{}");
}

function extractJson(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    const first = candidate.indexOf("{");
    const last = candidate.lastIndexOf("}");
    if (first === -1 || last === -1 || last <= first) {
      throw new Error("The model did not return JSON.");
    }
    const objectText = candidate.slice(first, last + 1);
    try {
      return JSON.parse(objectText);
    } catch {
      return JSON.parse(repairCommonJsonSyntax(objectText));
    }
  }
}

function repairCommonJsonSyntax(text) {
  return String(text || "")
    .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_-]*)(\s*:)/g, '$1"$2"$3')
    .replace(/:\s*'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_, value) => `: "${value.replace(/"/g, '\\"')}"`)
    .replace(/}\s*(?={\s*")/g, "},")
    .replace(/]\s*(?="[^"]+"\s*:)/g, "],")
    .replace(/,\s*([}\]])/g, "$1");
}

async function buildPrompt(resume, jobDescription, { pageBudgetMode = false } = {}) {
  const [masterPrompt, rubric, structureRules] = await Promise.all([
    readFile(join(rootDir, "prompts/master_prompt.md"), "utf8"),
    readFile(join(rootDir, "docs/resume_tailoring_rubric.md"), "utf8"),
    readFile(join(rootDir, "docs/resume_structure.md"), "utf8")
  ]);

  const hasTargetJob = Boolean(String(jobDescription || "").trim());
  const targetJobBlock = hasTargetJob
    ? `TARGET_JOB_DESCRIPTION:
${jobDescription}`
    : `TARGET_JOB_DESCRIPTION:
(none provided)

MODE:
General resume improvement. Improve clarity, structure, consistency, ATS readability, and evidence-grounded wording without tailoring to a specific role. Do not invent a target role, required skills, or job-specific missing evidence.`;

  const pageBudgetInstruction = pageBudgetMode
    ? `
PAGE_BUDGET_MODE:
The user explicitly asked for optional suggestions to shorten an overlong resume.
- Return only 2-5 concrete, evidence-grounded change cards that reduce length.
- Each card must have an exact existing before text and a shorter after text, or a clearly identified optional section/bullet to remove.
- Preserve all dates, mandatory fields, and factual claims. Never remove years, employers, institutions, publication years, patent years, author lists, or contact information.
- Prefer shortening long bullets or removing clearly lower-priority optional material. Do not add new content, ask missing-experience questions, or suggest cosmetic date/spacing changes.
- Every card remains optional and requires user approval.
`
    : "";

  return `${masterPrompt}

Use this rubric while making decisions:

${rubric}

Use this resume structure contract. It takes precedence over any flexible ordering advice:

${structureRules}

Return JSON only. Do not include markdown fences.

ORIGINAL_RESUME:
${resume}

${targetJobBlock}

USER_PREFERENCES:
- Require user approval for every change.
- Ask before adding any relevant experience that is not already in the resume.
- Prefer evidence-grounded changes and concise change cards.
- Ask one specific skill or topic per user question. For C and C++, use the single label C/C++.
- Do not create a vague question saying an existing role "lacks dates and specific contributions". Required dates, company, and title are checked locally by the app.
- Do not ask the user to expand an experience entry that you also recommend removing or deemphasizing.
- When a broad role-fit observation has a safe wording fix, return it as an exact before/after rewrite card; never turn it into a Missing Experience question.
${pageBudgetInstruction}
`;
}

async function callOpenRouter(resume, jobDescription, options = {}) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("Missing OPENROUTER_API_KEY. Start the server with your OpenRouter API key.");
  }

  const prompt = await buildPrompt(resume, jobDescription, options);
  const errors = [];

  for (const modelName of models) {
    try {
      const content = await callOpenRouterTextWithModel(prompt, 0.2, modelName);
      const parsed = await parseOrRepairJson(content, modelName);
      return {
        ...parsed,
        model: modelName
      };
    } catch (error) {
      errors.push(`${modelName}: ${error.message}`);
    }
  }

  if (models.length === 1) {
    throw new Error(errors[0] || "OpenRouter failed for the configured model.");
  }

  throw new Error(`OpenRouter failed for all configured models. ${errors.join(" | ")}`);
}

async function parseOrRepairJson(content, usedModel) {
  try {
    return extractJson(content);
  } catch (error) {
    try {
      const { content: repairedContent } = await repairJsonResponse(content, error.message, usedModel);
      return extractJson(repairedContent);
    } catch (repairError) {
      throw new Error(`returned invalid JSON and repair failed. Original parse error: ${error.message}. Repair error: ${repairError.message}`);
    }
  }
}

async function callOpenRouterText(prompt, temperature = 0.2) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("Missing OPENROUTER_API_KEY. Start the server with your OpenRouter API key.");
  }

  const errors = [];

  for (const modelName of models) {
    try {
      const content = await callOpenRouterTextWithModel(prompt, temperature, modelName);
      return { content, model: modelName };
    } catch (error) {
      errors.push(`${modelName}: ${error.message}`);
    }
  }

  if (models.length === 1) {
    throw new Error(errors[0] || "OpenRouter failed for the configured model.");
  }

  throw new Error(`OpenRouter failed for all configured models. ${errors.join(" | ")}`);
}

function formatOpenRouterError(payload, status) {
  const message = payload.error?.message || "";
  const provider = payload.error?.metadata?.provider_name || "";
  const raw = payload.error?.metadata?.raw || "";
  let rawDetail = "";

  try {
    rawDetail = typeof raw === "string" ? JSON.parse(raw).detail || raw : JSON.stringify(raw);
  } catch {
    rawDetail = String(raw);
  }

  if (/DEGRADED function cannot be invoked/i.test(rawDetail)) {
    return `${provider || "The selected provider"} is temporarily degraded for this model. This is an OpenRouter/provider availability issue, not a resume upload or API-key problem. Try again later or choose a different model.`;
  }

  return [
    message,
    provider && `provider: ${provider}`,
    rawDetail && `details: ${String(rawDetail).slice(0, 500)}`
  ].filter(Boolean).join(" ") || `OpenRouter request failed with ${status}.`;
}

function supportsJsonResponseFormat(modelName) {
  return /^(openai|google|qwen|anthropic)\//i.test(modelName);
}

async function callOpenRouterTextWithModel(prompt, temperature, modelName) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), openRouterModelTimeoutMs);
  const body = {
    model: modelName,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
    temperature,
    max_tokens: 5000
  };

  if (supportsJsonResponseFormat(modelName)) {
    body.response_format = { type: "json_object" };
  }

  let response;
  try {
    response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://127.0.0.1:8765",
        "X-OpenRouter-Title": "RoleFit Resume Tailor"
      },
      body: JSON.stringify(body)
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`OpenRouter model call timed out after ${Math.round(openRouterModelTimeoutMs / 1000)}s.`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  const raw = await response.text();
  let payload;

  try {
    payload = JSON.parse(raw);
  } catch {
    throw new Error(`OpenRouter returned a non-JSON response: ${raw.slice(0, 200)}`);
  }

  if (!response.ok) {
    throw new Error(formatOpenRouterError(payload, response.status));
  }

  const firstChoice = payload.choices?.[0];
  const content = firstChoice?.message?.content;
  if (!content) {
    const finishReason = firstChoice?.finish_reason ? ` finish_reason: ${firstChoice.finish_reason}.` : "";
    const messageKeys = firstChoice?.message ? ` message keys: ${Object.keys(firstChoice.message).join(", ")}.` : "";
    throw new Error(`OpenRouter returned no message content.${finishReason}${messageKeys}`);
  }

  return content;
}

async function repairJsonResponse(badJson, parseError, preferredModelName) {
  const repairPrompt = `Repair the following malformed JSON into valid JSON.

Rules:
- Return JSON only.
- Do not add markdown fences.
- Do not summarize.
- Preserve the same top-level object and fields.
- Fix only syntax problems such as missing commas, dangling commas, broken quotes, or stray text.

Parse error:
${parseError}

Malformed JSON:
${badJson}`;

  const repairModels = [
    preferredModelName,
    ...models.filter((modelName) => modelName !== preferredModelName && supportsJsonResponseFormat(modelName)),
    ...models.filter((modelName) => modelName !== preferredModelName && !supportsJsonResponseFormat(modelName))
  ].filter(Boolean);
  const errors = [];

  for (const modelName of repairModels) {
    try {
      const content = await callOpenRouterTextWithModel(repairPrompt, 0, modelName);
      return { content, model: modelName };
    } catch (error) {
      errors.push(`${modelName}: ${error.message}`);
    }
  }

  throw new Error(errors.join(" | ") || "JSON repair failed.");
}

function buildRephrasePrompt({ topic, userText, resume, jobDescription }) {
  return `You are an evidence-grounded resume editor.

Rewrite the user's rough note into one concise resume bullet for the target job.

Rules:
- Do not invent tools, metrics, employers, titles, dates, or outcomes.
- Preserve the user's level of certainty. If the note is exploratory or learning-based, do not make it sound like production experience.
- Use active, professional wording.
- Make it relevant to the job description where truthful.
- Return JSON only. No markdown fences.

Return exactly:
{
  "bullet": "- ..."
}

TOPIC_OR_REQUIREMENT:
${topic || "confirmed experience"}

USER_ROUGH_EXPERIENCE:
${userText}

CURRENT_RESUME_CONTEXT:
${resume || ""}

TARGET_JOB_DESCRIPTION:
${jobDescription || ""}
`;
}

async function rephraseExperience(input) {
  const { content, model: usedModel } = await callOpenRouterText(buildRephrasePrompt(input), 0.15);
  const parsed = extractJson(content);
  const bullet = String(parsed.bullet || "").trim();

  if (!bullet) {
    throw new Error("OpenRouter did not return a rephrased bullet.");
  }

  return {
    bullet: `- ${bullet.replace(/^[-*•]\s*/, "").trim()}`,
    model: usedModel
  };
}

function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const requestPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const safePath = normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(rootDir, safePath);

  if (!filePath.startsWith(rootDir) || !existsSync(filePath)) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
    "Cache-Control": "no-store, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0"
  });
  createReadStream(filePath).pipe(response);
}

const server = createServer(async (request, response) => {
  try {
    if (request.method === "POST" && request.url === "/api/analyze") {
      const { resume, jobDescription, pageBudgetMode } = await readJsonRequest(request);

      if (!resume) {
        sendJson(response, 400, { error: "Resume is required." });
        return;
      }

      const result = await callOpenRouter(resume, jobDescription || "", { pageBudgetMode: Boolean(pageBudgetMode) });
      sendJson(response, 200, result);
      return;
    }

    if (request.method === "POST" && request.url === "/api/rephrase-experience") {
      const { topic, userText, resume, jobDescription } = await readJsonRequest(request);

      if (!userText) {
        sendJson(response, 400, { error: "Write your rough experience before asking AI to rephrase it." });
        return;
      }

      const result = await rephraseExperience({ topic, userText, resume, jobDescription });
      sendJson(response, 200, result);
      return;
    }

    if (request.method === "GET") {
      serveStatic(request, response);
      return;
    }

    sendJson(response, 405, { error: "Method not allowed." });
  } catch (error) {
    sendJson(response, 500, { error: error.message || "Server error." });
  }
});

if (process.env.ROLEFIT_NO_SERVER !== "1") {
  server.listen(port, host, () => {
    const networkUrls = getNetworkUrls(port);
    console.log(`RoleFit Resume Tailor running locally at http://127.0.0.1:${port}/`);
    if (networkUrls.length) {
      console.log(`On a phone on the same Wi-Fi, try: ${networkUrls.map((url) => `${url}index.html`).join(" or ")}`);
    }
    console.log(`OpenRouter model${models.length > 1 ? "s" : ""}: ${models.join(", ")}`);
    console.log(`OpenRouter per-model timeout: ${Math.round(openRouterModelTimeoutMs / 1000)}s`);
  });
}

function getNetworkUrls(portNumber) {
  return Object.values(networkInterfaces())
    .flat()
    .filter((item) => item && item.family === "IPv4" && !item.internal)
    .map((item) => `http://${item.address}:${portNumber}/`);
}

export {
  buildPrompt,
  callOpenRouter,
  extractJson,
  parseOrRepairJson,
  repairCommonJsonSyntax
};
