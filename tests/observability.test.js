import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('observability configuration exists', () => {
  assert.equal(fs.existsSync('monitoring/prometheus.yml'), true);
  assert.equal(fs.existsSync('monitoring/alerts.yml'), true);
  assert.equal(fs.existsSync('monitoring/grafana/dashboards/devops-portfolio.json'), true);
});

test('prometheus configuration scrapes the application metrics endpoint', () => {
  const config = fs.readFileSync('monitoring/prometheus.yml', 'utf8');
  assert.match(config, /metrics_path:\s*\/api\/metrics/);
  assert.match(config, /app:3000/);
});

test('alert rules include availability and error-rate protection', () => {
  const rules = fs.readFileSync('monitoring/alerts.yml', 'utf8');
  assert.match(rules, /PortfolioDown/);
  assert.match(rules, /PortfolioHighErrorRate/);
});
