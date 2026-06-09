# Deployment Guide for Veikkauskisa

This guide covers deployment to Vercel and development across multiple environments (local, GitHub Codespaces, iOS app).

## Table of Contents
- [Environment Setup](#environment-setup)
- [Local Development](#local-development)
- [GitHub Codespaces](#github-codespaces)
- [Vercel Deployment](#vercel-deployment)
- [Database Migrations](#database-migrations)

---

## Environment Setup

### Required Environment Variables

**For all environments:**
- `DATABASE_URL` - Prisma Accelerate connection string (with connection pooling)

**For development/migrations only:**
- `DIRECT_URL` - Direct PostgreSQL connection string (for Prisma CLI)

### Getting Your Database Credentials

1. Go to [Prisma Console](https://console.prisma.io/)
2. Select your project: **veikkauskisa**
3. Select your database: **Development** (or create a production database)
4. Create a connection string:
   - Click "Connection Strings"
   - Click "New Connection String"
   - Copy both:
     - **Prisma Accelerate URL** → use as `DATABASE_URL`
     - **Direct Connection URL** → use as `DIRECT_URL`

---

## Local Development

### First Time Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/veikkauskisa.git
   cd veikkauskisa
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

4. **Edit `.env` with your credentials:**
   ```bash
   # Open .env and add your Prisma credentials
   DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=YOUR_KEY"
   DIRECT_URL="postgres://username:password@db.prisma.io:5432/postgres?sslmode=require"
   ```

5. **Generate Prisma Client:**
   ```bash
   npm run prisma:generate
   ```

6. **Push database schema (first time):**
   ```bash
   npm run prisma:push
   ```

7. **Start development server:**
   ```bash
   npm run dev
   ```

### Daily Development

```bash
# Start dev server
npm run dev

# Run database migrations
npm run prisma:push

# View database in browser
npm run prisma:studio
```

---

## GitHub Codespaces

GitHub Codespaces automatically loads environment variables from GitHub Secrets.

### Setup GitHub Secrets

1. Go to your repository on GitHub
2. Navigate to: **Settings** → **Secrets and variables** → **Codespaces**
3. Click **"New repository secret"**
4. Add these secrets:
   - **Name:** `DATABASE_URL`  
     **Value:** Your Prisma Accelerate connection string
   - **Name:** `DIRECT_URL`  
     **Value:** Your direct PostgreSQL connection string

### Using Codespaces

1. **Create a Codespace:**
   - Go to your repository
   - Click the green **Code** button
   - Select **Codespaces** tab
   - Click **Create codespace on main**

2. **Wait for setup:**
   - Codespaces will automatically install dependencies
   - Environment variables are loaded from GitHub Secrets

3. **Start development:**
   ```bash
   npm run dev
   ```

### GitHub iOS App

When using the GitHub iOS app with agentic development:

1. **Environment variables are automatically available** from GitHub Codespaces secrets
2. **Agents can:**
   - Run `npm run dev` to start the server
   - Run `npm run prisma:push` to update the database
   - Read and modify code files
   - Test API endpoints

**Note:** Make sure GitHub Secrets are set up (see above) before using the iOS app.

---

## Vercel Deployment

### Initial Setup

1. **Install Vercel CLI (optional):**
   ```bash
   npm i -g vercel
   ```

2. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click **"New Project"**
   - Import your GitHub repository
   - Select **veikkauskisa**

### Configure Environment Variables in Vercel

1. In your Vercel project dashboard:
   - Go to **Settings** → **Environment Variables**

2. Add the following variables:

   **For Production:**
   - **Key:** `DATABASE_URL`  
     **Value:** Your production Prisma Accelerate connection string  
     **Environment:** Production, Preview
   - **Key:** `OPENAI_API_KEY`  
     **Value:** OpenAI API key used for automatic result fetching  
     **Environment:** Production, Preview
   - **Key:** `CRON_SECRET`  
     **Value:** Long random secret used to protect `/api/cron/update-results`  
     **Environment:** Production, Preview

   **For Migrations (optional):**
   - **Key:** `DIRECT_URL`  
     **Value:** Your production direct PostgreSQL connection string  
     **Environment:** Production, Preview

3. **Important:** Use different database credentials for production!
   - Create a separate "Production" database in Prisma Console
   - Generate new connection strings for production
   - Never use development credentials in production

### Deploy

**Automatic Deployment (recommended):**
- Push to `main` branch → Deploys to production
- Open a PR → Creates a preview deployment

**Manual Deployment:**
```bash
vercel --prod
```

### Vercel Cron for automatic results

- Cron schedule is configured in `/vercel.json` to call `/api/cron/update-results` once per day (Hobby plan compatible).
- Vercel cron expression is interpreted in UTC (`0 19 * * *`), which maps to 21:00 or 22:00 Finland time depending on daylight saving time.
- Route validates that incoming cron requests include the configured `CRON_SECRET`.
- Route executes updates per competition only within each competition's configured Finland date range and daily time (default 22:00).

### Running Migrations on Vercel

Migrations run automatically during build if you have `DIRECT_URL` set.

To run migrations manually:
```bash
# Set DIRECT_URL in Vercel environment variables first
vercel env pull .env.production.local
npm run prisma:push
```

---

## Database Migrations

### Development Workflow

```bash
# Make changes to prisma/schema.prisma

# Generate Prisma Client
npm run prisma:generate

# Push schema changes to database
npm run prisma:push

# View data in Prisma Studio
npm run prisma:studio
```

### Production Migrations

**Option 1: Using Vercel Build (Recommended)**
- Add `DIRECT_URL` to Vercel environment variables
- Push to GitHub
- Vercel automatically runs migrations during build

**Option 2: Manual Migration**
```bash
# Pull production environment variables
vercel env pull .env.production.local

# Run migration with production credentials
npm run prisma:push
```

### Migration Best Practices

1. **Test migrations in development first**
2. **Always backup your database before production migrations**
3. **Use separate databases for development and production**
4. **Never commit `.env` files with real credentials**

---

## Troubleshooting

### "Connection url is empty"

**Solution:** Make sure environment variables are loaded:
```bash
# Load from .env file
export $(cat .env | grep -v '^#' | xargs)

# Or use dotenv
npx dotenv -e .env -- npx prisma db push
```

### "PrismaClientKnownRequestError: Table does not exist"

**Solution:** Run database migrations:
```bash
npm run prisma:push
```

### Vercel Build Fails

**Check:**
1. Environment variables are set in Vercel dashboard
2. `DATABASE_URL` is configured
3. Prisma Client is generated during build (automatic with `prisma` in dependencies)

### GitHub Codespaces Not Working

**Check:**
1. GitHub Secrets are set in repository settings
2. Secrets are available to Codespaces (not just Actions)
3. Restart the Codespace after adding secrets

---

## Environment Variable Priority

Next.js loads environment variables in this order (later overrides earlier):

1. `.env` - Defaults for all environments
2. `.env.local` - Local overrides (ignored by git)
3. `.env.development` - Development-specific
4. `.env.production` - Production-specific (used by `next build`)
5. Environment variables from hosting platform (Vercel, etc.)

**In Vercel:** Platform environment variables override all `.env` files.

**In Codespaces:** GitHub Secrets are injected as environment variables.

---

## Security Checklist

- [ ] `.env` files are in `.gitignore`
- [ ] Different credentials for development and production
- [ ] GitHub Secrets configured for Codespaces
- [ ] Vercel environment variables configured
- [ ] No credentials committed to git history
- [ ] `.env.example` has placeholder values only

---

## Useful Commands

```bash
# Development
npm run dev                  # Start dev server
npm run build                # Build for production
npm run start                # Start production server

# Database
npm run prisma:generate      # Generate Prisma Client
npm run prisma:push          # Push schema changes
npm run prisma:studio        # Open database GUI
npm run prisma:migrate       # Run migrations (if using migrate instead of push)

# Deployment
vercel                       # Deploy to preview
vercel --prod                # Deploy to production
vercel env pull              # Pull environment variables
```

---

## Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [GitHub Codespaces Documentation](https://docs.github.com/en/codespaces)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
