import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = Number(process.env.PORT || 3000);
const GITHUB_USERNAME = process.env.GITHUB_USERNAME || 'Souvik-Pramanik';

// Stable model failover chain. Override with GEMINI_MODELS=... in .env.
const DEFAULT_MODELS = [
  process.env.GEMINI_MODEL || 'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash'
];
const MODELS = [...new Set(
  (process.env.GEMINI_MODELS || DEFAULT_MODELS.join(','))
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
)];
const RETRIES_PER_MODEL = Math.max(0, Math.min(3, Number(process.env.GEMINI_RETRIES || 2)));
const RETRY_BASE_MS = Math.max(250, Math.min(5000, Number(process.env.GEMINI_RETRY_BASE_MS || 800)));
const hasKey = Boolean(process.env.GEMINI_API_KEY);
const client = hasKey ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
app.use(cors({ origin: allowedOrigin, methods: ['GET', 'POST', 'OPTIONS'] }));
app.use(express.json({ limit: '256kb' }));
app.use(express.static(__dirname, { extensions: ['html'] }));

const portfolioContext = `
You are the embedded AI DevOps Assistant on Souvik Pramanik's personal portfolio.
Target role: Cloud / DevOps Engineer.
Location: Kolkata, India.
Public GitHub: https://github.com/${GITHUB_USERNAME}
Public LinkedIn: https://www.linkedin.com/in/nukebyte/
Professional email: snaptokon@proton.me

Current self-reported skill levels:
Advanced: Linux, Bash, Networking.
Intermediate: Git/GitHub, Docker, GitHub Actions, AWS, Azure, Python, Nginx.
Beginner: Kubernetes, Jenkins, Terraform, Ansible, Prometheus, Grafana.

AWS hands-on areas reported: EC2, S3, IAM, CloudWatch, Lambda, ECS, EKS.
Not reported as hands-on: VPC, RDS, Route 53.

Important honesty rules:
- Do not claim Souvik has professional DevOps experience merely because DevOps is his target career.
- Do not invent DevOps projects, production systems, uptime, deployments, clients, or infrastructure.
- Distinguish clearly between reported experience, learning areas, and hypothetical examples.
- Give practical, safe, production-minded DevOps guidance.
- Never ask for or expose API keys, passwords, tokens, or private credentials.
- When suggesting shell commands, explain destructive commands and prefer safe/read-only commands unless the user explicitly asks for a write operation.
`;

function cleanHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-12)
    .map(m => ({ role: m.role, content: m.content.slice(0, 6000) }));
}

function sanitizeQuestion(value) {
  return String(value || '').replace(/\u0000/g, '').trim().slice(0, 6000);
}

function getStatusCode(err) {
  return Number(err?.status || err?.statusCode || err?.response?.status || 0);
}

function isRetryableStatus(status) {
  return [429, 500, 502, 503, 504].includes(status);
}

function getErrorMessage(err) {
  return err?.message || err?.error?.message || 'Gemini request failed';
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateWithFailover({ prompt, config }) {
  const attempts = [];
  let lastError = null;

  for (const model of MODELS) {
    for (let retry = 0; retry <= RETRIES_PER_MODEL; retry += 1) {
      try {
        const started = Date.now();
        const response = await client.models.generateContent({ model, contents: prompt, config });
        return {
          response,
          model,
          latencyMs: Date.now() - started,
          attempts
        };
      } catch (err) {
        lastError = err;
        const status = getStatusCode(err);
        attempts.push({ model, retry, status });

        // Do not retry authentication/configuration/content errors.
        if (!isRetryableStatus(status)) throw err;

        if (retry < RETRIES_PER_MODEL) {
          const delay = Math.min(8000, RETRY_BASE_MS * (2 ** retry)) + Math.floor(Math.random() * 250);
          await sleep(delay);
        }
      }
    }
  }

  const error = new Error(
    `All Gemini models are temporarily unavailable. Tried: ${MODELS.join(', ')}. ${getErrorMessage(lastError)}`
  );
  error.status = getStatusCode(lastError) || 503;
  error.attempts = attempts;
  throw error;
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    aiConfigured: hasKey,
    primaryModel: MODELS[0] || null,
    models: MODELS,
    retriesPerModel: RETRIES_PER_MODEL,
    github: GITHUB_USERNAME
  });
});

app.get('/api/github/profile', async (_req, res) => {
  try {
    const r = await fetch(`https://api.github.com/users/${encodeURIComponent(GITHUB_USERNAME)}`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Souvik-Portfolio-AI' }
    });
    if (!r.ok) return res.status(r.status).json({ error: `GitHub profile request failed (${r.status})` });
    res.json(await r.json());
  } catch (err) {
    res.status(502).json({ error: err.message || 'GitHub request failed' });
  }
});

app.post('/api/ask', async (req, res) => {
  if (!hasKey) {
    return res.status(503).json({
      error: 'AI backend is not configured yet. Add GEMINI_API_KEY to the server environment.'
    });
  }

  const question = sanitizeQuestion(req.body?.message);
  if (!question) return res.status(400).json({ error: 'message is required' });

  const history = cleanHistory(req.body?.history);
  const useWeb = Boolean(req.body?.liveWeb);
  const mode = ['explain', 'debug', 'generate', 'review', 'architect', 'learn'].includes(req.body?.mode)
    ? req.body.mode
    : 'explain';

  const modeInstruction = {
    explain: 'Explain clearly, then give a concise practical example.',
    debug: 'Debug systematically: symptoms → likely causes → checks → fix → verification.',
    generate: 'Generate production-minded example code/configuration, with assumptions and validation steps.',
    review: 'Review the supplied material critically and return findings ordered by severity, then improvements.',
    architect: 'Propose an architecture with components, data flow, trade-offs, security and operational concerns.',
    learn: 'Teach the concept progressively from fundamentals to a hands-on exercise.'
  }[mode];

  try {
    const transcript = history
      .map(m => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content}`)
      .join('\n\n');
    const prompt = `${portfolioContext}\n\n${modeInstruction}\nAnswer as an expert DevOps mentor embedded in a portfolio website. Use Markdown.\n\nConversation so far:\n${transcript || '(none)'}\n\nUser request:\n${question}`;

    const config = {
      systemInstruction: `${portfolioContext}\n${modeInstruction}\nAnswer as an expert DevOps mentor embedded in a portfolio website. Use Markdown.`,
      maxOutputTokens: 1200
    };
    if (useWeb) config.tools = [{ googleSearch: {} }];

    const result = await generateWithFailover({ prompt, config });

    res.json({
      answer: result.response.text || 'No response text was returned.',
      model: result.model,
      latencyMs: result.latencyMs,
      fallbackUsed: result.model !== MODELS[0],
      liveWeb: useWeb,
      groundingMetadata: result.response.candidates?.[0]?.groundingMetadata || null,
      failoverAttempts: result.attempts
    });
  } catch (err) {
    const status = getStatusCode(err) || 500;
    res.status(status).json({
      error: getErrorMessage(err),
      failoverAttempts: err.attempts || []
    });
  }
});

app.listen(PORT, () => {
  console.log(`Souvik AI DevOps Assistant running at http://localhost:${PORT}`);
  console.log(`AI configured: ${hasKey ? 'yes' : 'no'} | models: ${MODELS.join(' -> ')}`);
  console.log(`Retry policy: ${RETRIES_PER_MODEL} retries/model | base ${RETRY_BASE_MS}ms`);
});
