# Ubuntu Server Setup Guide for Automated Deployment

This guide explains how to prepare a clean Ubuntu Linux server (e.g., Ubuntu 22.04 or 24.04 LTS) for the automated CD deployment job in GitHub Actions.

> [!WARNING]
> **Cloud Cost Notice:** Cloud virtual machines (AWS EC2, DigitalOcean Droplets, Azure VMs, GCP Compute Engine, etc.) can incur financial charges. Always review your cloud provider's active pricing before provisioning a server, and remember to stop or delete the server once you are finished testing to prevent unexpected costs.

---

## 1. Firewall Configuration (UFW)

Secure the server so only SSH (`22`) and HTTP (`80`) are accessible:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw enable
sudo ufw status
```

---

## 2. Install Docker and Docker Compose Plugin

Install the official Docker Engine and Compose plugin:

```bash
# Remove any conflicting packages
for pkg in docker.io docker-doc docker-compose podman-docker containerd runc; do sudo apt-get remove -y $pkg; done

# Install prerequisites
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Set up Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker packages
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verify installation
sudo docker --version
sudo docker compose version
```

---

## 3. Create Non-Root Deploy User

Create a dedicated system user without sudo permissions for CI/CD deployments and add it to the `docker` group:

```bash
# Create deployer user
sudo adduser --disabled-password --gecos "" deployer

# Add deployer to the docker group
sudo usermod -aG docker deployer
```

---

## 4. Set Up SSH Key Pair

Generate a secure SSH key pair on your local machine (not on the server):

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ./deploy_key
```

On the server, configure the public key for the `deployer` user:

```bash
sudo -u deployer mkdir -p /home/deployer/.ssh
sudo -u deployer chmod 700 /home/deployer/.ssh

# Copy contents of deploy_key.pub into authorized_keys
sudo nano /home/deployer/.ssh/authorized_keys

sudo -u deployer chmod 600 /home/deployer/.ssh/authorized_keys
```

Store the **private key** (`./deploy_key`) safely. You will add this key to GitHub Secrets.

---

## 5. Set Up the Application Directory

Log in as the `deployer` user and set up the application folder:

```bash
sudo -u deployer mkdir -p /home/deployer/app
cd /home/deployer/app
```

Place the `docker-compose.yml` file into `/home/deployer/app/docker-compose.yml`:

```yaml
services:
  app:
    image: ${DOCKERHUB_USERNAME:-local}/devops-cicd-prod:${IMAGE_TAG:-latest}
    container_name: devops_app
    restart: unless-stopped
    ports:
      - "${HOST_PORT:-8080}:3000"
    environment:
      NODE_ENV: production
    healthcheck:
      test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 5s
```

Create `/home/deployer/app/.env` with your Docker Hub username and production port `80`:

```bash
cat << 'EOF' > /home/deployer/app/.env
DOCKERHUB_USERNAME=your_dockerhub_username
HOST_PORT=80
EOF
```

---

## 6. Configure GitHub Repository Secrets & Variables

In your GitHub repository, navigate to **Settings > Secrets and variables > Actions**:

### Secrets
- `SERVER_HOST`: Public IP address or domain name of your Linux server.
- `SERVER_USER`: The deploy user (`deployer`).
- `SERVER_SSH_KEY`: The private SSH key generated earlier (`deploy_key`).

### Variables
- `ENABLE_SERVER_DEPLOY`: Set to `true` to enable automated deployment on push to `main`.
