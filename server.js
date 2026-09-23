import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = Number(process.env.PORT || 3000);
const APP_VERSION = process.env.APP_VERSION || '9.0.0';
const GIT_SHA = process.env.GIT_SHA || 'local';
const DEPLOY_ENV = process.env.DEPLOY_ENV || process.env.NODE_ENV || 'development';
const DEPLOYED_AT = process.env.DEPLOYED_AT || null;
const startedAt = Date.now();

const metrics = {
  requestsTotal: 0,
  errorsTotal: 0,
  responseTimeMsTotal: 0,
  responseTimeSamples: 0,
  statusCounts: new Map(),
  routeCounts: new Map()
};

function metricRoute(pathname) {
  if (pathname.startsWith('/api/health')) return '/api/health';
  if (pathname.startsWith('/api/metrics')) return '/api/metrics';
  if (pathname.startsWith('/api/deployment')) return '/api/deployment';
  if (pathname.startsWith('/api/ops')) return '/api/ops';
  if (pathname.startsWith('/api/github')) return '/api/github';
  if (pathname.startsWith('/api/ask')) return '/api/ask';
  return pathname === '/' ? '/' : 'static';
}

function escapePrometheus(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\\"').replace(/\n/g, '\\n');
}

function prometheusMetrics() {
  const uptime = process.uptime();
  const memory = process.memoryUsage();
  const cpu = process.cpuUsage();
  const lines = [
    '# HELP portfolio_process_uptime_seconds Application process uptime in seconds.',
    '# TYPE portfolio_process_uptime_seconds gauge',
    `portfolio_process_uptime_seconds ${uptime}`,
    '# HELP portfolio_process_start_time_seconds Unix timestamp when the process started.',
    '# TYPE portfolio_process_start_time_seconds gauge',
    `portfolio_process_start_time_seconds ${Math.floor((Date.now() - Math.floor(uptime * 1000)) / 1000)}`,
    '# HELP portfolio_http_requests_total Total HTTP requests received.',
    '# TYPE portfolio_http_requests_total counter',
    `portfolio_http_requests_total ${metrics.requestsTotal}`,
    '# HELP portfolio_http_errors_total Total HTTP 4xx/5xx responses.',
    '# TYPE portfolio_http_errors_total counter',
    `portfolio_http_errors_total ${metrics.errorsTotal}`,
    '# HELP portfolio_http_response_time_ms_total Sum of observed response times in milliseconds.',
    '# TYPE portfolio_http_response_time_ms_total counter',
    `portfolio_http_response_time_ms_total ${metrics.responseTimeMsTotal}`,
    '# HELP portfolio_http_response_time_samples Number of response time observations.',
    '# TYPE portfolio_http_response_time_samples counter',
    `portfolio_http_response_time_samples ${metrics.responseTimeSamples}`,
    '# HELP portfolio_process_resident_memory_bytes Resident memory used by the process.',
    '# TYPE portfolio_process_resident_memory_bytes gauge',
    `portfolio_process_resident_memory_bytes ${memory.rss}`,
    '# HELP portfolio_node_heap_used_bytes Node.js heap currently used.',
    '# TYPE portfolio_node_heap_used_bytes gauge',
    `portfolio_node_heap_used_bytes ${memory.heapUsed}`,
    '# HELP portfolio_node_heap_total_bytes Node.js heap currently allocated.',
    '# TYPE portfolio_node_heap_total_bytes gauge',
    `portfolio_node_heap_total_bytes ${memory.heapTotal}`,
    '# HELP portfolio_node_cpu_user_microseconds CPU user time.',
    '# TYPE portfolio_node_cpu_user_microseconds counter',
    `portfolio_node_cpu_user_microseconds ${cpu.user}`,
    '# HELP portfolio_node_cpu_system_microseconds CPU system time.',
    '# TYPE portfolio_node_cpu_system_microseconds counter',
    `portfolio_node_cpu_system_microseconds ${cpu.system}`,
    '# HELP portfolio_build_info Static application build information.',
    '# TYPE portfolio_build_info gauge',
    `portfolio_build_info{version="${escapePrometheus(APP_VERSION)}",git_sha="${escapePrometheus(GIT_SHA)}",environment="${escapePrometheus(DEPLOY_ENV)}"} 1`
  ];

  for (const [status, count] of metrics.statusCounts) {
    lines.push(`portfolio_http_responses_total{status="${escapePrometheus(status)}"} ${count}`);
  }
  for (const [route, count] of metrics.routeCounts) {
    lines.push(`portfolio_http_route_requests_total{route="${escapePrometheus(route)}"} ${count}`);
  }
  return `${lines.join('\n')}\n`;
}

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

app.use((req, res, next) => {
  const started = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
    const route = metricRoute(req.path);
    const status = String(res.statusCode);

    metrics.requestsTotal += 1;
    metrics.responseTimeMsTotal += durationMs;
    metrics.responseTimeSamples += 1;
    metrics.statusCounts.set(status, (metrics.statusCounts.get(status) || 0) + 1);
    metrics.routeCounts.set(route, (metrics.routeCounts.get(route) || 0) + 1);

    if (res.statusCode >= 400) metrics.errorsTotal += 1;
  });
  next();
});

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
    status: 'healthy',
    aiConfigured: hasKey,
    primaryModel: MODELS[0] || null,
    models: MODELS,
    retriesPerModel: RETRIES_PER_MODEL,
    github: GITHUB_USERNAME,
    version: APP_VERSION,
    gitSha: GIT_SHA,
    environment: DEPLOY_ENV,
    deployedAt: DEPLOYED_AT,
    uptimeSeconds: Math.round(process.uptime())
  });
});

app.get('/api/deployment', (_req, res) => {
  res.json({
    application: 'devops-portfolio-platform',
    version: APP_VERSION,
    gitSha: GIT_SHA,
    environment: DEPLOY_ENV,
    deployedAt: DEPLOYED_AT,
    node: process.version,
    platform: process.platform,
    architecture: process.arch,
    hostname: os.hostname(),
    uptimeSeconds: Math.round(process.uptime())
  });
});

app.get('/api/metrics', (_req, res) => {
  res.type('text/plain; version=0.0.4; charset=utf-8').send(prometheusMetrics());
});

app.get('/api/ops', (_req, res) => {
  const memory = process.memoryUsage();
  const avgLatency = metrics.responseTimeSamples
    ? metrics.responseTimeMsTotal / metrics.responseTimeSamples
    : 0;

  res.json({
    status: 'healthy',
    application: 'devops-portfolio-platform',
    version: APP_VERSION,
    gitSha: GIT_SHA,
    environment: DEPLOY_ENV,
    uptimeSeconds: Math.round(process.uptime()),
    node: process.version,
    metrics: {
      requests: metrics.requestsTotal,
      errors: metrics.errorsTotal,
      errorRate: metrics.requestsTotal ? metrics.errorsTotal / metrics.requestsTotal : 0,
      averageResponseMs: Number(avgLatency.toFixed(2)),
      memoryRssMb: Number((memory.rss / 1024 / 1024).toFixed(2)),
      heapUsedMb: Number((memory.heapUsed / 1024 / 1024).toFixed(2))
    },
    integrations: {
      github: true,
      ai: hasKey,
      prometheus: true,
      cloudWatch: DEPLOY_ENV === 'production'
    }
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
