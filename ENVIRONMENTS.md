# Environment Configuration Guide

Visual guide to understanding how credentials work across different environments.

## 🌍 Environment Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    YOUR KISAVEIKKAUS PROJECT                     │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
        ┌───────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐
        │    Local     │ │  GitHub   │ │   Vercel    │
        │ Development  │ │ Codespaces│ │ Production  │
        └──────────────┘ └───────────┘ └─────────────┘
                │               │               │
        ┌───────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐
        │  .env file   │ │  GitHub   │ │   Vercel    │
        │  (gitignored)│ │  Secrets  │ │  Env Vars   │
        └──────────────┘ └───────────┘ └─────────────┘
                │               │               │
                └───────────────┼───────────────┘
                                │
                        ┌───────▼────────┐
                        │ Prisma Postgres│
                        │    Database    │
                        └────────────────┘
```

## 📍 Environment Details

### 1. Local Development (Your Computer)

**How it works:**
- Reads credentials from `.env` file
- File is gitignored (never committed)
- You have full control

**Setup:**
```bash
cp .env.example .env
# Edit .env with real credentials
npm run dev
```

**Pros:**
- ✅ Fast and direct
- ✅ Full control
- ✅ Works offline (after initial setup)

**Cons:**
- ❌ Must manually set up .env file
- ❌ Not shared with team
- ❌ Can't use on different computers without setup

---

### 2. GitHub Codespaces (Web & iOS App)

**How it works:**
- Reads credentials from GitHub Secrets
- Secrets are encrypted and secure
- Automatically injected as environment variables
- Works on any device (web browser, VS Code, iOS app)

**Setup:**
```
GitHub Repo → Settings → Secrets → Codespaces → Add secrets:
  - DATABASE_URL
  - DIRECT_URL
```

**Pros:**
- ✅ Works anywhere (web, desktop, mobile)
- ✅ No local setup needed
- ✅ Shared across all Codespaces
- ✅ AI agents have automatic access
- ✅ Encrypted and secure

**Cons:**
- ❌ Requires GitHub account
- ❌ Uses Codespaces hours (free tier: 60 hours/month)
- ❌ Must set up secrets once

**Perfect for:**
- Working from multiple devices
- Using GitHub iOS app with AI agents
- Team collaboration
- Quick prototyping without local setup

---

### 3. Vercel Production

**How it works:**
- Reads credentials from Vercel Environment Variables
- Set in Vercel project dashboard
- Automatically used during builds and runtime
- Separate from development credentials

**Setup:**
```
Vercel Project → Settings → Environment Variables → Add:
  - DATABASE_URL (production value)
```

**Pros:**
- ✅ Automatic deployment on git push
- ✅ Global CDN
- ✅ Preview deployments for PRs
- ✅ Production-grade infrastructure

**Cons:**
- ❌ Must set up environment variables
- ❌ Should use separate production database

**Best practices:**
- Use different database for production
- Don't use development credentials
- Test in preview deployments first

---

## 🔄 Credential Flow

### Development to Production Pipeline

```
1. LOCAL DEVELOPMENT
   ├── Use .env file
   ├── DATABASE_URL → Development database
   └── DIRECT_URL → Development database
           │
           │ git push
           ▼
2. GITHUB CODESPACES (Optional)
   ├── Use GitHub Secrets
   ├── DATABASE_URL → Development database (same as local)
   └── DIRECT_URL → Development database (same as local)
           │
           │ git push to main
           ▼
3. VERCEL PRODUCTION
   ├── Use Vercel Environment Variables
   ├── DATABASE_URL → Production database (different!)
   └── No DIRECT_URL needed (only for migrations)
```

## 🗄️ Database Strategy

### Recommended Setup

```
┌─────────────────────────────────────────────────────────┐
│              Prisma Console (console.prisma.io)         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📊 Development Database (eu-central-1)                 │
│  ├── Used by: Local dev + GitHub Codespaces            │
│  ├── Connection string in: .env + GitHub Secrets       │
│  └── Safe to experiment and reset                      │
│                                                         │
│  📊 Production Database (eu-central-1)                  │
│  ├── Used by: Vercel production only                   │
│  ├── Connection string in: Vercel environment vars     │
│  └── Contains real user data                           │
│                                                         │
│  📊 Staging Database (optional)                         │
│  ├── Used by: Vercel preview deployments               │
│  ├── Connection string in: Vercel preview env vars     │
│  └── For testing before production                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Why Separate Databases?

**Development Database:**
- Experiment freely
- Test migrations
- Can reset anytime
- Shared with team

**Production Database:**
- Real user data
- Never reset
- Carefully managed
- Backed up regularly

## 🎯 Which Environment Should I Use?

### Use Local Development When:
- ✅ You're working on your primary computer
- ✅ You have a stable internet connection
- ✅ You want the fastest development experience
- ✅ You're working on complex features

### Use GitHub Codespaces When:
- ✅ You're on a different computer (travel, library, etc.)
- ✅ You're using an iPad or mobile device
- ✅ You want to use GitHub iOS app with AI agents
- ✅ You need a clean environment quickly
- ✅ You're collaborating with team members

### Use Vercel Production When:
- ✅ You're ready to deploy to users
- ✅ You want automatic deployments
- ✅ You need preview deployments for PRs
- ✅ You want production monitoring

## 🔐 Security Comparison

| Environment | Security Method | Risk Level | Best For |
|-------------|----------------|------------|----------|
| **Local** | `.env` file (gitignored) | �� Medium | Personal development |
| **Codespaces** | GitHub Secrets (encrypted) | 🟢 Low | Mobile/multi-device |
| **Vercel** | Platform env vars (encrypted) | 🟢 Low | Production hosting |

## 📱 Using GitHub iOS App

The GitHub iOS app with AI agents is particularly powerful because:

1. **No local setup needed** - Just open the app
2. **AI agents automatically have access** to GitHub Secrets
3. **Can develop anywhere** - Coffee shop, commute, etc.
4. **Full development environment** - Complete Linux environment in the cloud

**Example workflow:**
```
1. Open GitHub app on iPhone/iPad
2. Navigate to kisaveikkaus repository
3. Tap "Open in Codespace"
4. Tell AI agent: "Add a new feature to track player scores"
5. AI agent:
   - Updates database schema
   - Runs npm run prisma:push
   - Creates API endpoints
   - Updates UI components
   - Tests the changes
6. Review changes and commit
7. Automatic deployment to Vercel
```

## 🚀 Quick Start Commands by Environment

### Local
```bash
git clone REPO
cd kisaveikkaus
cp .env.example .env
# Edit .env
npm install
npm run prisma:push
npm run dev
```

### Codespaces
```bash
# After setting up GitHub Secrets:
# Click Code → Codespaces → Create
# Wait for auto-setup
npm run dev
```

### Vercel
```bash
# After connecting repo and setting env vars:
git push origin main
# Automatic deployment
```

## 📚 Learn More

- **Local Setup:** [DEPLOYMENT.md](DEPLOYMENT.md#local-development)
- **Codespaces Setup:** [.devcontainer/README.md](.devcontainer/README.md)
- **GitHub Secrets:** [.github/SECRETS.md](.github/SECRETS.md)
- **Vercel Setup:** [DEPLOYMENT.md](DEPLOYMENT.md#vercel-deployment)
- **Security:** [SECURITY.md](SECURITY.md)

---

**Choose the environment that fits your workflow!** All three work seamlessly together. 🎉
