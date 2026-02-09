# GitHub Actions Workflows Report

## Repository Information

- **Repository Root**: `/Users/sarutahiko/Downloads/os-tenmon-ai-v2-reset`
- **Current Branch**: `main`
- **Latest Commit**: `4458789 feat: add Phase00 sha gate, robust ingest confirm, and TENMON_CORE_PACK_v1 core seed (Phase46)`
- **Workflows Directory**: `./.github/workflows`

## Detected Workflows Directories

1. `./.github/workflows` (repository root)

## Workflow Files List

| File Path | File Name | Size | Last Modified |
|-----------|-----------|------|---------------|
| `./.github/workflows/deploy.yml` | `deploy.yml` | 547B | 2024-12-23 05:57:00 |
| `./.github/workflows/tenmon-ark-build.yml` | `tenmon-ark-build.yml` | 677B | 2024-12-15 13:53:00 |

## Workflow Files Content

===== FILE: ./.github/workflows/deploy.yml =====
name: Deploy to VPS

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to VPS
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USERNAME }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/tenmon-ark/api
            git fetch --all
            git reset --hard origin/main
            npm install
            npm run build
            systemctl restart tenmon-ark-api
===== END FILE: ./.github/workflows/deploy.yml =====

===== FILE: ./.github/workflows/tenmon-ark-build.yml =====
name: Deploy TENMON-ARK to VPS

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Deploy to VPS via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/tenmon-ark/tenmon-ark
            git pull origin main
            pnpm install
            pnpm run build
            rm -rf /var/www/html/*
            cp -r dist/public/* /var/www/html/
            systemctl reload nginx
===== END FILE: ./.github/workflows/tenmon-ark-build.yml =====

## Workflow Summaries

### 1. deploy.yml

- **Name**: Deploy to VPS
- **Trigger**: Push to `main` branch
- **Jobs**: 
  - `deploy` (runs on `ubuntu-latest`)
- **Deployment Details**:
  - **Deploy Target**: VPS via SSH
  - **SSH Action**: `appleboy/ssh-action@master`
  - **Host**: `${{ secrets.VPS_HOST }}`
  - **Username**: `${{ secrets.VPS_USERNAME }}`
  - **SSH Key**: `${{ secrets.VPS_SSH_KEY }}`
  - **Deploy Path**: `/opt/tenmon-ark/api`
  - **Deploy Steps**:
    1. `cd /opt/tenmon-ark/api`
    2. `git fetch --all`
    3. `git reset --hard origin/main`
    4. `npm install`
    5. `npm run build`
    6. `systemctl restart tenmon-ark-api`
  - **Systemd Service**: `tenmon-ark-api`

### 2. tenmon-ark-build.yml

- **Name**: Deploy TENMON-ARK to VPS
- **Trigger**: Push to `main` branch
- **Jobs**: 
  - `deploy` (runs on `ubuntu-latest`)
- **Deployment Details**:
  - **Deploy Target**: VPS via SSH
  - **SSH Action**: `appleboy/ssh-action@v1.0.3`
  - **Host**: `${{ secrets.VPS_HOST }}`
  - **Username**: `${{ secrets.VPS_USER }}`
  - **SSH Key**: `${{ secrets.VPS_SSH_KEY }}`
  - **Deploy Path**: `/opt/tenmon-ark/tenmon-ark`
  - **Deploy Steps**:
    1. `cd /opt/tenmon-ark/tenmon-ark`
    2. `git pull origin main`
    3. `pnpm install`
    4. `pnpm run build`
    5. `rm -rf /var/www/html/*`
    6. `cp -r dist/public/* /var/www/html/`
    7. `systemctl reload nginx`
  - **Web Root**: `/var/www/html/`
  - **Systemd Service**: `nginx` (reload)

## Notes

- Both workflows are triggered on push to `main` branch
- Both workflows deploy to VPS using SSH
- `deploy.yml` targets the API service (`tenmon-ark-api`)
- `tenmon-ark-build.yml` targets the web frontend (nginx)
- Both workflows use different deploy paths and build commands (npm vs pnpm)
