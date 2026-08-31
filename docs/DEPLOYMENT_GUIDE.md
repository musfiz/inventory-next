# Inventory UI — Deployment Guide

Next.js 16 app with `output: 'standalone'` mode. This guide covers **manual zip upload (Hostinger)**, **CI/CD pipelines (GitHub Actions)**, **Docker**, and **VPS/server deployment**.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Environment Variables](#2-environment-variables)
3. [Build the Project](#3-build-the-project)
4. [Option A — Manual Upload to Hostinger (Zip)](#4-option-a--manual-upload-to-hostinger-zip)
5. [Option B — Hostinger VPS with Node.js](#5-option-b--hostinger-vps-with-nodejs)
6. [Option C — CI/CD with GitHub Actions](#6-option-c--cicd-with-github-actions)
7. [Option D — Docker Deployment](#7-option-d--docker-deployment)
8. [Option E — Vercel (Recommended for Next.js)](#8-option-e--vercel)
9. [Post-Deployment Checklist](#9-post-deployment-checklist)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

| Tool    | Minimum Version |
| ------- | --------------- |
| Node.js | 20.x LTS+       |
| npm     | 10.x+           |
| Git     | 2.x             |

---

## 2. Environment Variables

Copy `.env.example` to `.env.production` and fill in production values:

```bash
cp .env.example .env.production
```

**Required variables:**

| Variable                        | Example                          | Description                       |
| ------------------------------- | -------------------------------- | --------------------------------- |
| `NODE_ENV`                      | `production`                     | Must be `production`              |
| `NEXT_PUBLIC_APP_NAME`          | `Universal Inventory Management` | App display name                  |
| `NEXT_PUBLIC_APP_URL`           | `https://uims.yourdomain.com`    | Frontend URL                      |
| `NEXT_PUBLIC_BACKEND_URL`       | `https://api.yourdomain.com`     | Laravel API URL                   |
| `NEXT_PUBLIC_CURRENCY_CODE`     | `BDT`                            | ISO currency code                 |
| `NEXT_PUBLIC_CURRENCY_SYMBOL`   | `৳`                              | Currency symbol for display       |
| `NEXT_PUBLIC_CURRENCY_POSITION` | `left`                           | `left` or `right`                 |
| `AUTH_SESSION_COOKIE`           | `laravel-session`                | Must match Laravel session cookie |
| `NEXT_PUBLIC_USE_MOCK`          | `false`                          | Must be `false` in production     |

**Optional variables:** `NEXT_PUBLIC_IMAGE_HOSTS`, `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_ENABLE_*` feature flags.

> **Security:** Never commit `.env.production` to Git. Inject values via CI/CD secrets or host environment config.

---

## 3. Build the Project

```bash
# Install dependencies
npm ci

# Build for production
npm run build
```

This produces a `.next/standalone` directory containing a self-contained Node.js server.

**Build output structure:**

```
.next/
├── standalone/          # Self-contained server (includes node_modules)
│   ├── server.js        # Entry point
│   ├── .next/           # Compiled app
│   └── node_modules/    # Only production deps
├── static/              # Static assets (JS, CSS, media)
```

---

## 4. Option A — Manual Upload to Hostinger (Zip)

> **Important:** Hostinger **Shared Hosting** does NOT support Node.js. You need either a **Hostinger VPS** plan or the **Node.js Hosting** plan. If you only have shared PHP hosting, see [Option E (Vercel)](#8-option-e--vercel) instead.

### If you have Hostinger Node.js / VPS Hosting:

#### Step 1: Build locally

```bash
npm ci
npm run build
```

#### Step 2: Prepare the deployment folder

```bash
# Create a deployment directory
mkdir -p deploy

# Copy standalone server
cp -r .next/standalone/* deploy/

# Copy static assets into the standalone .next folder
cp -r .next/static deploy/.next/static

# Copy public folder
cp -r public deploy/public
```

#### Step 3: Create the zip

```bash
cd deploy
zip -r ../inventory-ui-deploy.zip .
cd ..
```

**On Windows (PowerShell):**

```powershell
Compress-Archive -Path deploy\* -DestinationPath inventory-ui-deploy.zip
```

#### Step 4: Upload to Hostinger

1. Log in to **Hostinger hPanel**
2. Go to **Files → File Manager**
3. Navigate to your domain's root directory (e.g., `/home/user/domains/yourdomain.com/`)
4. Upload `inventory-ui-deploy.zip`
5. Extract the zip via File Manager's Extract option
6. Set up the **Node.js Application** in hPanel:
   - **Node.js version:** 20.x
   - **Application root:** directory where you extracted files
   - **Application startup file:** `server.js`
   - **Port:** assigned by Hostinger (auto-detected)
7. Add environment variables via hPanel → **Environment Variables** section
8. Click **Restart** the Node.js application

#### Step 5: Verify

Visit `https://yourdomain.com` — the app should load.

#### Fixing "Refused to apply style… MIME type ('text/plain')" / page stuck on "Loading…"

This means the browser reached the page HTML, but requests to `/_next/static/...` (CSS/JS chunks) are not being served by the Node.js process — Hostinger's Apache/LiteSpeed layer is intercepting them and returning a fallback response with the wrong `Content-Type`. Check in this order:

1. **Rebuild on Linux, not Windows.** Native packages (`sharp`, `lightningcss-*`) install OS/arch-specific binaries. A `deploy/` folder built and zipped on Windows will contain Windows binaries that fail on Hostinger's Linux server, which can crash or degrade the Node process so it stops serving static assets correctly. Build inside WSL/Linux/Docker, or build directly on the server via SSH, instead of zipping a Windows-built folder.
2. **Confirm the app is actually running.** In hPanel → **Node.js**, check the app status/logs. If it crashed after startup, Apache falls back to serving files directly (or a default error page) for paths it doesn't recognize, which is what produces the wrong MIME type. Restart the app and re-check logs after triggering a request.
3. **Verify `.next/static` was uploaded to the exact expected path**: `<app-root>/.next/static/...`, sitting next to `server.js`. If it's missing or nested one level too deep/shallow, requests for chunk files 404 and Hostinger returns an HTML/text error page instead of the real file.
4. **Add an `.htaccess` in the app root** to stop Apache/LiteSpeed from intercepting `_next` (some hosting security templates force `text/plain` on underscore-prefixed paths) and ensure all requests are proxied to the Node app:

   ```apache
   PassengerEnabled on
   PassengerAppRoot /home/USERNAME/domains/yourdomain.com/public_html
   PassengerAppType node
   PassengerStartupFile server.js

   <IfModule mod_mime.c>
     AddType text/css .css
     AddType application/javascript .js
   </IfModule>
   ```

5. **Do a full re-upload after any fix**, then hard-restart the Node.js app in hPanel (stop, wait, start — not just "restart") so it isn't serving a half-crashed process.

#### "Errors on first load, then it works after reloading" (shared hosting)

This pattern — fails once, then works on reload — is Phusion Passenger **cold-starting** the Node process on Hostinger shared hosting. Passenger spins the app down after a period of inactivity; the first request after idle time hits the app before it has finished booting, so some `/_next/static` requests get served by Apache's fallback (wrong MIME type) while the process is still starting up. Once booted, subsequent requests work normally until it goes idle again.

Fixes:

1. **Keep at least one instance always running.** Add to `.htaccess` in the app root:
   ```apache
   PassengerMinInstances 1
   PassengerStartTimeout 90
   ```
2. **Ping the app periodically** so Passenger never lets it go idle — set up a cron job in hPanel (**Advanced → Cron Jobs**) that curls the site every 5 minutes:
   ```bash
   curl -s -o /dev/null https://uims.yourdomain.com
   ```
3. Note this is a limitation of shared hosting's process manager, not the app code — on a VPS (Section 5) or with PM2, the process stays resident and this doesn't happen.

---

## 5. Option B — Hostinger VPS with Node.js

If you have a Hostinger VPS, you get full SSH access.

### Initial Server Setup

```bash
# SSH into your VPS
ssh root@YOUR_VPS_IP

# Install Node.js via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# Install PM2 for process management
npm install -g pm2
```

### Deploy via SCP/SFTP

```bash
# On your local machine — build first
npm ci && npm run build

# Prepare standalone
mkdir -p deploy
cp -r .next/standalone/* deploy/
cp -r .next/static deploy/.next/static
cp -r public deploy/public

# Upload to VPS
scp -r deploy/* root@YOUR_VPS_IP:/var/www/inventory-ui/
```

### Start with PM2

```bash
# On the VPS
cd /var/www/inventory-ui

# Create .env file with production values
nano .env

# Start with PM2
PORT=3000 pm2 start server.js --name inventory-ui

# Save PM2 process list and enable startup on reboot
pm2 save
pm2 startup
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name uims.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable the site and get SSL
sudo ln -s /etc/nginx/sites-available/inventory-ui /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d uims.yourdomain.com
```

---

## 6. Option C — CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml` in the repository root:

### Deploy to VPS via SSH

```yaml
name: Deploy Inventory UI

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  NODE_VERSION: '20'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Create production env
        run: |
          cat <<EOF > .env.production
          NODE_ENV=production
          NEXT_PUBLIC_APP_NAME=${{ secrets.APP_NAME }}
          NEXT_PUBLIC_APP_URL=${{ secrets.APP_URL }}
          NEXT_PUBLIC_BACKEND_URL=${{ secrets.BACKEND_URL }}
          NEXT_PUBLIC_CURRENCY_CODE=${{ secrets.CURRENCY_CODE }}
          NEXT_PUBLIC_CURRENCY_SYMBOL=${{ secrets.CURRENCY_SYMBOL }}
          NEXT_PUBLIC_CURRENCY_POSITION=${{ secrets.CURRENCY_POSITION }}
          AUTH_SESSION_COOKIE=${{ secrets.AUTH_SESSION_COOKIE }}
          NEXT_PUBLIC_USE_MOCK=false
          EOF

      - name: Build
        run: npm run build

      - name: Prepare standalone
        run: |
          mkdir -p deploy
          cp -r .next/standalone/* deploy/
          cp -r .next/static deploy/.next/static
          cp -r public deploy/public

      - name: Deploy to server via SSH
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          source: 'deploy/*'
          target: '/var/www/inventory-ui'
          strip_components: 1

      - name: Restart application
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /var/www/inventory-ui
            pm2 restart inventory-ui || PORT=3000 pm2 start server.js --name inventory-ui
            pm2 save
```

### Required GitHub Secrets

Go to **GitHub → Repo → Settings → Secrets and variables → Actions** and add:

| Secret                | Value                            |
| --------------------- | -------------------------------- |
| `SSH_HOST`            | Your server IP                   |
| `SSH_USER`            | `root` or deploy user            |
| `SSH_PRIVATE_KEY`     | SSH private key content          |
| `APP_NAME`            | `Universal Inventory Management` |
| `APP_URL`             | `https://uims.yourdomain.com`    |
| `BACKEND_URL`         | `https://api.yourdomain.com`     |
| `CURRENCY_CODE`       | `BDT`                            |
| `CURRENCY_SYMBOL`     | `৳`                              |
| `CURRENCY_POSITION`   | `left`                           |
| `AUTH_SESSION_COOKIE` | `laravel-session`                |

### Deploy to Vercel via GitHub Actions (Alternative)

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## 7. Option D — Docker Deployment

### Dockerfile

Create `Dockerfile` in the project root:

```dockerfile
FROM node:20-alpine AS base

# --- Dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# --- Builder ---
FROM base AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Runner ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

### .dockerignore

```
node_modules
.next
.git
*.md
.env*
```

### Build and Run

```bash
# Build image
docker build -t inventory-ui .

# Run container
docker run -d \
  --name inventory-ui \
  -p 3000:3000 \
  -e NEXT_PUBLIC_APP_URL=https://uims.yourdomain.com \
  -e NEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com \
  --restart unless-stopped \
  inventory-ui
```

> **Note:** `NEXT_PUBLIC_*` variables are baked in at build time. To change them, you must rebuild the image. Non-public env vars (like `AUTH_SESSION_COOKIE`) can be passed at runtime via `-e` flags.

### Docker Compose (with Nginx)

```yaml
# docker-compose.yml
services:
  inventory-ui:
    build: .
    restart: unless-stopped
    ports:
      - '3000:3000'
    env_file:
      - .env.production

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - inventory-ui
```

### GitHub Actions with Docker

```yaml
name: Docker Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build and push Docker image
        run: |
          docker build -t inventory-ui .
          docker save inventory-ui | gzip > inventory-ui.tar.gz

      - name: Upload to server
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          source: 'inventory-ui.tar.gz'
          target: '/tmp'

      - name: Deploy on server
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            docker load < /tmp/inventory-ui.tar.gz
            docker stop inventory-ui || true
            docker rm inventory-ui || true
            docker run -d \
              --name inventory-ui \
              -p 3000:3000 \
              --env-file /var/www/inventory-ui/.env.production \
              --restart unless-stopped \
              inventory-ui
            rm /tmp/inventory-ui.tar.gz
```

---

## 8. Option E — Vercel

The simplest option for Next.js apps.

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) → **Import Project** → select the repo
3. Set **Root Directory** to the project root
4. Add environment variables in Vercel dashboard (**Settings → Environment Variables**)
5. Click **Deploy**

Vercel auto-detects `next build` and handles standalone output, edge routing, and SSL.

**Subsequent deploys** happen automatically on every push to `main`.

---

## 9. Post-Deployment Checklist

- [ ] App loads at the production URL
- [ ] Login works (Sanctum cookie + CORS between frontend/backend domains)
- [ ] Backend API calls succeed (check browser Network tab for CORS errors)
- [ ] Images load correctly (check `NEXT_PUBLIC_BACKEND_URL` + `remotePatterns` in next.config)
- [ ] SSL certificate is valid
- [ ] `NEXT_PUBLIC_USE_MOCK` is `false` (no mock data shown)
- [ ] Laravel backend CORS config allows the frontend domain
- [ ] Laravel `SESSION_DOMAIN` and `SANCTUM_STATEFUL_DOMAINS` include the frontend domain
- [ ] Currency formatting displays correctly

### Common CORS Setup (Laravel Backend)

Ensure these are set in the Laravel backend `.env`:

```env
SANCTUM_STATEFUL_DOMAINS=uims.yourdomain.com
SESSION_DOMAIN=.yourdomain.com
FRONTEND_URL=https://uims.yourdomain.com
```

---

## 10. Troubleshooting

| Issue                                                               | Solution                                                                                                                                                                                                  |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 401 Unauthorized on login                                           | Check `SANCTUM_STATEFUL_DOMAINS` and `SESSION_DOMAIN` in backend                                                                                                                                          |
| CORS errors                                                         | Add frontend domain to Laravel `config/cors.php` allowed origins                                                                                                                                          |
| Images broken                                                       | Verify `NEXT_PUBLIC_BACKEND_URL` and `remotePatterns` in `next.config.ts`                                                                                                                                 |
| 502 Bad Gateway                                                     | Check if Node.js process is running (`pm2 status`) and Nginx proxy_pass port matches                                                                                                                      |
| Build fails on server                                               | Ensure Node.js 20+ and sufficient RAM (≥1 GB for build)                                                                                                                                                   |
| `NEXT_PUBLIC_*` not updating                                        | These are baked at build time — must rebuild after changing them                                                                                                                                          |
| Static assets 404                                                   | Ensure `.next/static` was copied to `standalone/.next/static`                                                                                                                                             |
| Public files 404                                                    | Ensure `public/` was copied to the standalone directory                                                                                                                                                   |
| CSS/JS MIME type `text/plain`, page stuck on "Loading…" (Hostinger) | See [Fixing MIME type errors](#fixing-refused-to-apply-style-mime-type-textplain--page-stuck-on-loading) in Section 4 — usually a crashed Node process or Windows-built native binaries deployed to Linux |
