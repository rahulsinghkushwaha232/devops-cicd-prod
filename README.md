# Production-Style Node.js DevOps Demo

A lightweight, production-ready Node.js DevOps demonstration project featuring zero runtime dependencies (only Node.js standard library), automated testing, multi-stage Docker builds, vulnerability scanning, and an automated CI/CD pipeline with healthcheck verification and rollback.

*This project was developed by Rahul Singh Kushwaha ([GitHub](https://github.com/rahulsinghkushwaha232)), inspired by public DevOps learning projects.*

---

## Architecture Diagram

```
+------------------+
|  Developer Push  |
+--------+---------+
         |
         v
+-----------------------------------------------------------------------------------+
| GitHub Actions CI/CD Pipeline                                                     |
|                                                                                   |
|  [ Job: test ]                                                                    |
|    |--> Setup Node.js 22 -> npm run lint (syntax check) -> npm test               |
|    v                                                                              |
|  [ Job: build-scan-push ]                                                         |
|    |--> Setup Buildx -> Docker Build (multi-stage)                                |
|    |--> Aquasecurity Trivy Scan (Log HIGH, Gate CRITICAL with exit-code 1)        |
|    `--> Docker Hub Push (Tags: <sha> & latest | only on main + DOCKERHUB_TOKEN)   |
|    v                                                                              |
|  [ Job: deploy (Optional: when ENABLE_SERVER_DEPLOY == 'true') ]                  |
|    |--> SSH into target Linux server                                              |
|    |--> docker compose pull & up -d (with new commit tag)                         |
|    |--> Health check polling (60s timeout against /health)                        |
|    `--> Success: write .last_good_tag | Failure: rollback to .last_good_tag       |
+-----------------------------------------------------------------------------------+
         |
         v
+------------------+
| Production Host  |
| (Docker Engine)  |
+------------------+
```

---

## Tech Stack

- **Runtime:** Node.js 22 (Standard Library `node:http`, zero external packages)
- **Testing:** Node.js built-in Test Runner (`node:test`, `node:assert`)
- **Containerization:** Docker Multi-Stage (`node:22-alpine`)
- **Orchestration:** Docker Compose
- **CI/CD:** GitHub Actions
- **Security Scanning:** Aquasecurity Trivy (Vulnerability Scanner)
- **Registry:** Docker Hub

---

## Project Structure

```text
devops-cicd-prod/
├── .dockerignore
├── .env.example
├── .gitignore
├── Dockerfile
├── README.md
├── docker-compose.yml
├── package.json
├── .github/
│   └── workflows/
│       └── ci-cd.yml
├── app/
│   ├── index.js
│   └── test.js
└── docs/
    └── server-setup.md
```

---

## How to Run Locally

### 1. Run Tests and Syntax Check
```bash
# Run unit tests using built-in test runner
npm test

# Run syntax check (Note: this is a syntax validation check, not a style linter)
npm run lint
```

### 2. Run Directly with Node.js
```bash
# Start the HTTP server on port 3000
npm start
# or directly: node app/index.js
```
- Root endpoint: [http://localhost:3000/](http://localhost:3000/)
- Health check: [http://localhost:3000/health](http://localhost:3000/health)

### 3. Run with Docker Compose
```bash
# Build and start container in detached mode
docker compose up -d --build
```
- Application is available at [http://localhost:8080/](http://localhost:8080/)
- Health check: [http://localhost:8080/health](http://localhost:8080/health)
- To stop:
  ```bash
  docker compose down
  ```

---

## How the CI/CD Pipeline Works

1. **Trigger:** Pipeline runs on every `push` and `pull_request` targeting `main`, as well as on manual `workflow_dispatch`.
2. **Test Job:** Checks out repository code, sets up Node.js 22, and runs `npm run lint` followed by `npm test`.
3. **Build & Scan Job:**
   - Builds a container image using Docker Buildx.
   - Scans the image using **Aquasecurity Trivy**: displays `HIGH` findings in logs, and enforces a hard failure if any unfixed `CRITICAL` vulnerability is found (`exit-code: 1`).
   - If triggered on a push to `main` and `DOCKERHUB_TOKEN` is present, logs into Docker Hub and pushes `<username>/devops-cicd-prod:<commit_sha>` and `:latest`. If secret is missing, it succeeds without pushing and leaves an informational summary.
4. **Deploy Job (Optional):**
   - Runs on push to `main` when repository variable `ENABLE_SERVER_DEPLOY` is set to `true`.
   - Connects to remote Linux server via SSH.
   - Pulls and deploys the new image tag.
   - Polls container health status up to 60 seconds.
   - Saves successful tag to `.last_good_tag`. If healthcheck fails, automatically rolls back to the previous tag stored in `.last_good_tag`.
   - Writes status to `$GITHUB_STEP_SUMMARY`.

---

## Required Secrets and Variables

Configure the following under **Settings > Secrets and variables > Actions**:

### Secrets (Names Only)
- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`
- `SERVER_HOST`
- `SERVER_USER`
- `SERVER_SSH_KEY`

### Variables (Names Only)
- `ENABLE_SERVER_DEPLOY` (Set to `'true'` to activate SSH deployment)

---

## Security Practices

- **Non-Root Execution:** The production container runs under the non-privileged `node` user (UID 1000) rather than `root`.
- **Minimal Base Image:** Uses `node:22-alpine` to maintain a minimal attack surface.
- **Trivy Vulnerability Gate:** Automated image scanning in the CI pipeline blocks any unfixed `CRITICAL` severity vulnerability.
- **Secret Isolation:** Zero secrets, credentials, tokens, or IP addresses are stored in the repository. All secrets are managed strictly through GitHub Actions Encrypted Secrets.

---

## Measured Results (Current Session)

The following metrics were directly measured during local verification:

- **Automated Tests:** 4 tests executed, 0 suites, 4 passed, 0 failed.
- **Test Execution Duration:** ~326 ms – 480 ms.
- **Syntax Validation (`npm run lint`):** 0 syntax errors across `app/index.js` and `app/test.js`.
- **Runtime Dependencies:** 0 packages (Node.js standard library only).
- **Base Image:** `node:22-alpine` (~140 MB base image footprint).

---

## Server Deployment Guide

For instructions on configuring an Ubuntu server, UFW firewall, and SSH keys for the automated deployment job, see [docs/server-setup.md](file:///c:/Users/ASUS/OneDrive/Attachments/devops-cicd-prod/docs/server-setup.md).
