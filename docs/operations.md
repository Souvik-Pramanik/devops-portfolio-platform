# Operations Runbook

## Local observability

```bash
docker compose up --build
```

Endpoints:

- Application: `http://localhost:3000`
- Health: `http://localhost:3000/api/health`
- Operations: `http://localhost:3000/api/ops`
- Prometheus metrics: `http://localhost:3000/api/metrics`
- Prometheus UI: `http://localhost:9090`
- Grafana: `http://localhost:3001`

Grafana defaults for the local demo:

- Username: `admin`
- Password: `admin`

## Manual rollback

Use the GitHub Actions **Manual ECS Rollback** workflow and provide a known-good ECS task-definition revision, for example:

```text
devops-portfolio-platform:4
```

The workflow validates the revision, updates the ECS service, waits for service stability and reports the resulting task definition.

## Blue/green foundation

The Terraform variable is disabled by default:

```hcl
enable_blue_green = false
```

Do not enable it in an existing environment until the CodeDeploy traffic strategy has been reviewed and tested in a non-production environment.

## Incident simulation

The public operations dashboard only simulates failures in the browser. It does not expose AWS control-plane credentials or arbitrary infrastructure actions.
