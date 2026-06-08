# 🚀 Quick Reference - Veikkauskisa

## Environment Variable Setup

| Environment | Method | Configuration File/Location |
|-------------|--------|---------------------------|
| **Local Development** | `.env` file | Copy from `.env.example`, add real credentials |
| **GitHub Codespaces** | GitHub Secrets | Settings → Secrets → Codespaces |
| **Vercel Production** | Vercel Dashboard | Project Settings → Environment Variables |

## Required Variables

```bash
# For application runtime (all environments)
DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=YOUR_KEY"

# For Prisma CLI commands (dev/codespaces only)
DIRECT_URL="postgres://username:password@db.prisma.io:5432/postgres?sslmode=require"
```

## Common Commands

### Development
```bash
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
```

### Database
```bash
npm run prisma:generate  # Generate Prisma Client
npm run prisma:push      # Push schema to database
npm run prisma:studio    # Open database GUI (http://localhost:5555)
npm run prisma:migrate   # Run migrations (alternative to push)
```

### Setup
```bash
./setup.sh               # Automated setup script
npm install              # Install dependencies (manual)
```

## Port Forwarding

| Port | Service | URL |
|------|---------|-----|
| 3000 | Next.js App | http://localhost:3000 |
| 5555 | Prisma Studio | http://localhost:5555 |

## File Structure

```
veikkauskisa/
├── .devcontainer/           # GitHub Codespaces config
│   ├── devcontainer.json    # Codespace settings
│   └── README.md            # Codespace guide
├── .github/
│   ├── workflows/
│   │   └── ci.yml           # GitHub Actions CI
│   └── SECRETS.md           # Secrets setup guide
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── migrations/          # Migration history
├── src/
│   ├── app/                 # Next.js pages & API routes
│   ├── components/          # React components
│   ├── lib/                 # Utilities & Prisma client
│   └── generated/prisma/    # Generated Prisma Client (gitignored)
├── .env.example             # Environment template
├── .env.local.example       # Local override template
├── .env.production.example  # Production template
├── .gitignore               # Git ignore rules
├── prisma.config.ts         # Prisma CLI config
├── vercel.json              # Vercel deployment config
├── DEPLOYMENT.md            # Full deployment guide
├── SECURITY.md              # Security guidelines
├── SETUP_CHECKLIST.md       # Setup checklist
└── README.md                # Main documentation
```

## Database Schema

```prisma
Competition (Kisa)
├── id, name, createdAt, updatedAt
└── rounds[]

Round (Kierros)
├── id, name, bettingStart, bettingEnd
├── competitionId → Competition
└── matchPairs[]

MatchPair (Ottelupari)
├── id, homeTeam, awayTeam, matchDate
└── roundId → Round
```

## API Endpoints

```
GET    /api/competitions           # List competitions
POST   /api/competitions           # Create competition
GET    /api/competitions/[id]      # Get competition
PUT    /api/competitions/[id]      # Update competition
DELETE /api/competitions/[id]      # Delete competition
```

## Environment-Specific Setup

### Local Mac/PC
```bash
# One-time setup
git clone https://github.com/YOUR_USERNAME/veikkauskisa.git
cd veikkauskisa
cp .env.example .env
# Edit .env with your credentials
npm install
npm run prisma:push
npm run dev
```

### GitHub Codespaces
```bash
# Prerequisites: Add DATABASE_URL and DIRECT_URL to GitHub Secrets
# Then: Click Code → Codespaces → Create codespace
# Automatically installs dependencies and generates Prisma Client
npm run dev
```

### GitHub iOS App
```bash
# Prerequisites: GitHub Secrets configured
# Open repo in app → Open in Codespace
# Use AI agents: "Run npm run dev"
```

### Vercel Deployment
```bash
# Prerequisites: Add DATABASE_URL to Vercel environment variables
# Then: Connect GitHub repo to Vercel
# Automatic deployment on git push
```

## Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| `Connection url is empty` | Check `.env` exists and has `DATABASE_URL` |
| `Table does not exist` | Run `npm run prisma:push` |
| `Module not found` | Run `npm install` |
| `Prisma Client not generated` | Run `npm run prisma:generate` |
| Port 3000 in use | Change port: `PORT=3001 npm run dev` |
| Codespace env vars missing | Add secrets to GitHub → Settings → Codespaces |
| Vercel build fails | Add `DATABASE_URL` to Vercel env vars |

## Getting Credentials

1. **Go to:** [console.prisma.io](https://console.prisma.io/)
2. **Select:** veikkauskisa project → Development database
3. **Create:** Connection Strings → New Connection String
4. **Copy:**
   - Prisma Accelerate URL → `DATABASE_URL`
   - Direct Connection URL → `DIRECT_URL`

## Security Reminders

- ✅ Never commit `.env` files
- ✅ Use different databases for dev/prod
- ✅ Store secrets in platform-specific locations
- ✅ Keep `.env.example` with placeholders only
- ❌ Never hardcode credentials in code
- ❌ Never share secrets in issues/PRs

## Support & Documentation

| Topic | Document |
|-------|----------|
| Full deployment guide | [DEPLOYMENT.md](DEPLOYMENT.md) |
| Security best practices | [SECURITY.md](SECURITY.md) |
| GitHub Codespaces setup | [.devcontainer/README.md](.devcontainer/README.md) |
| GitHub Secrets setup | [.github/SECRETS.md](.github/SECRETS.md) |
| Complete setup checklist | [SETUP_CHECKLIST.md](SETUP_CHECKLIST.md) |
| Project overview | [README.md](README.md) |

## One-Liners

```bash
# Quick start from scratch
git clone REPO && cd veikkauskisa && ./setup.sh

# Reset everything
rm -rf node_modules .next && npm install && npm run prisma:generate

# Check environment
echo $DATABASE_URL | head -c 50

# Database status
npm run prisma:studio

# Deploy to Vercel
npx vercel --prod

# Create Codespace from CLI
gh codespace create --repo YOUR_USERNAME/veikkauskisa
```

---

**Need help?** Check [DEPLOYMENT.md](DEPLOYMENT.md) for detailed guides
