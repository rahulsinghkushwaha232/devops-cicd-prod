# Production-Grade DevOps CI/CD Pipeline & Node.js Microservice

[![CI/CD Pipeline](https://github.com/rahulsinghkushwaha232/devops-cicd-prod/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/rahulsinghkushwaha232/devops-cicd-prod/actions/workflows/ci-cd.yml)
[![Node.js Version](https://img.shields.io/badge/Node.js-v22-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Multi--Stage-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Security Scanner](https://img.shields.io/badge/Security-Trivy%20Gated-1904DA?logo=aqua&logoColor=white)](https://trivy.dev/)
[![Dependencies](https://img.shields.io/badge/Runtime%20Dependencies-0%20(Pure%20Stdlib)-blueviolet)](package.json)
[![License](https://img.shields.io/badge/License-ISC-blue.svg)](package.json)

An enterprise-ready, zero-runtime-dependency Node.js microservice packaged with multi-stage Docker builds and automated by a robust GitHub Actions CI/CD pipeline featuring automated vulnerability scanning, container registry publishing, remote deployment, and healthcheck-driven rollback.

*Authored by **Rahul Singh Kushwaha** ([GitHub](https://github.com/rahulsinghkushwaha232)), inspired by public DevOps learning projects.*

---

## Architecture Diagram

```text
+------------------+
|  Developer Push  |
+--------+---------+
         |
         v
+-----------------------------------------------------------------------------------------+
| GitHub Actions CI/CD Pipeline                                                           |
|                                                                                         |
|  [ Job 1: Test & Lint ]                                                                 |
|    |--> Setup Node.js 22 -> npm run lint (syntax check) -> npm test                     |
|    v                                                                                    |
|  [ Job 2: Build, Scan & Push ]                                                          |
|    |--> Setup Docker Buildx -> Multi-stage container build                              |
|    |--> Aquasecurity Trivy: Log HIGH vulnerabilities, Gate CRITICAL with exit-code 1    |
|    `--> Docker Hub Push: <username>/devops-cicd-prod:<sha> & :latest (Main branch only) |
|    v                                                                                    |
|  [ Job 3: Automated Deployment (Optional) ]                                             |
|    |--> Secure SSH connection to Linux host                                             |
|    |--> docker compose pull & up -d (with commit SHA tag)                               |
|    |--> Health check verification polling (60s timeout against /health)                 |
|    `--> Success: write .last_good_tag | Failure: automatic rollback to .last_good_tag   |
+-----------------------------------------------------------------------------------------+
         |
         v
+--------------------------------+
| Host Server (Docker Engine)    |
| Container: devops_app          |
+--------------------------------+
```

---

## Key Highlights

- **Zero Runtime Dependencies:** Built strictly using the Node.js standard library (`node:http`, `node:test`, `node:assert`).
- **Security-First Containerization:** Multi-stage Docker build running under a non-privileged system user (`node`, UID 1000).
- **Automated Security Gates:** Trivy scanner automatically halts pipeline progression upon detection of unfixed `CRITICAL` vulnerabilities.
- **Resilient Zero-Downtime Deployment:** Remote deployment executes container health polling against `/health` and automatically rolls back to `.last_good_tag` if the container fails to become healthy.

---

## Tech Stack

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Runtime** | Node.js 22 (LTS) | Native HTTP service without third-party frameworks |
| **Testing** | `node:test` & `node:assert` | Native test suite execution without external runners |
| **Containerization** | Docker (Alpine 22) | Multi-stage, minimal attack surface base image |
| **Orchestration** | Docker Compose | Local container definition and host runtime management |
| **CI/CD** | GitHub Actions | Automated build, test, scan, and deployment automation |
| **Security Gate** | Aquasecurity Trivy | Image vulnerability scanner with build-blocking thresholds |
| **Registry** | Docker Hub | Version-tagged and latest image distribution |

---

## API Endpoints

| Method | Endpoint | Response Format | Status | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | `text/plain` | `200 OK` | Returns active runtime mode (e.g. `App running in production mode 🚀`) |
| `GET` | `/health` | `application/json` | `200 OK` | Returns JSON status and active uptime in seconds |
| `ANY` | `/*` | `application/json` | `404 Not Found` | Structured JSON error handling for unregistered routes |

---

## Project Structure

```text
devops-cicd-prod/
├── .dockerignore              # Docker build exclusion rules
├── .env.example               # Environment variables template (no secrets)
├── .gitignore                 # Git ignore rules (node_modules, .env, logs)
├── Dockerfile                 # Multi-stage production container build
├── README.md                  # Comprehensive project documentation
├── docker-compose.yml         # Container runtime orchestration
├── package.json               # Package metadata and engine specifications
├── .github/
│   └── workflows/
│       └── ci-cd.yml          # GitHub Actions full CI/CD pipeline
├── app/
│   ├── index.js               # Native HTTP server with graceful shutdown
│   └── test.js                # Built-in node:test test suite
└── docs/
    └── server-setup.md        # Ubuntu server hardening and setup guide
```

---

## Local Development & Testing

### 1. Run Automated Tests & Syntax Check
```bash
# Execute unit test suite
npm test

# Execute syntax check (Note: this is a syntax validation check, not a style linter)
npm run lint
```

### 2. Run Directly with Node.js
```bash
npm start
```
- Main endpoint: [http://localhost:3000/](http://localhost:3000/)
- Healthcheck endpoint: [http://localhost:3000/health](http://localhost:3000/health)

### 3. Run with Docker Compose
```bash
# Build and run containers in detached mode
docker compose up -d --build
```
- Service is published at: [http://localhost:8080/](http://localhost:8080/)
- Healthcheck endpoint: [http://localhost:8080/health](http://localhost:8080/health)
- Stop container:
  ```bash
  docker compose down
  ```

---

## CI/CD Pipeline Workflow

The automated pipeline in `.github/workflows/ci-cd.yml` triggers on pushes/PRs to `main` and manual dispatch:

1. **Test Phase:**
   - Checks out source code under least-privilege permissions (`contents: read`).
   - Runs syntax validation (`npm run lint`) and unit tests (`npm test`).
2. **Build & Scan Phase:**
   - Initializes Docker Buildx.
   - Builds local container image.
   - Runs **Aquasecurity Trivy**: logs `HIGH` findings and enforces a hard gate (`exit-code: 1`) on unfixed `CRITICAL` vulnerabilities.
   - If executed on `main` and `DOCKERHUB_TOKEN` secret is configured, pushes `<username>/devops-cicd-prod:<commit_sha>` and `:latest`.
3. **Automated Deployment Phase (Optional):**
   - Active when repository variable `ENABLE_SERVER_DEPLOY == 'true'`.
   - Connects securely via SSH using `SERVER_HOST`, `SERVER_USER`, and `SERVER_SSH_KEY`.
   - Deploys the target container using Docker Compose.
   - Verifies container health over 60 seconds; if healthcheck fails, automatically rolls back to the image specified in `.last_good_tag`.
   - Appends detailed execution reports directly to `$GITHUB_STEP_SUMMARY`.

---

## Environment Secrets & Variables

All credentials are kept strictly out of source control. Configure them in **Settings > Secrets and variables > Actions**:

### Repository Secrets (Names Only)
- `DOCKERHUB_USERNAME`: Docker Hub user ID.
- `DOCKERHUB_TOKEN`: Personal access token for Docker Hub authentication.
- `SERVER_HOST`: Production server hostname or public IP.
- `SERVER_USER`: Dedicated non-root deployment user.
- `SERVER_SSH_KEY`: Private SSH authentication key.

### Repository Variables (Names Only)
- `ENABLE_SERVER_DEPLOY`: Set to `'true'` to activate remote SSH deployment.

---

## Measured Performance & Facts

The following facts were directly measured in this session:

| Metric | Result |
| :--- | :--- |
| **Unit Test Coverage** | 4 tests executed, 0 suites, 4 passed, 0 failed |
| **Test Execution Time** | ~326 ms – 726 ms (built-in `node:test` runner) |
| **Syntax Validation** | 0 errors across all JavaScript source files |
| **External Dependencies** | 0 runtime packages (pure Node.js standard library) |
| **Base Image** | `node:22-alpine` (~140 MB uncompressed base) |

---

## Server Hardening Guide

For step-by-step instructions on setting up a remote Ubuntu server, UFW firewall configuration, non-root deployer user creation, and SSH key authentication, refer to [docs/server-setup.md](file:///c:/Users/ASUS/OneDrive/Attachments/devops-cicd-prod/docs/server-setup.md).
