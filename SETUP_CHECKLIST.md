# Setup Checklist for Veikkauskisa

Use this checklist to ensure your project is properly configured across all environments.

## Initial Setup

### 1. Prisma Database Setup
- [ ] Created account on [Prisma Console](https://console.prisma.io/)
- [ ] Created "Development" database in eu-central-1 (or your preferred region)
- [ ] Generated connection strings (Accelerate URL and Direct URL)
- [ ] Saved connection strings securely (password manager or secure notes)

### 2. Local Development
- [ ] Cloned repository: `git clone https://github.com/YOUR_USERNAME/veikkauskisa.git`
- [ ] Ran setup script: `./setup.sh` OR
  - [ ] Copied `.env.example` to `.env`
  - [ ] Added `DATABASE_URL` to `.env`
  - [ ] Added `DIRECT_URL` to `.env`
  - [ ] Ran `npm install`
  - [ ] Ran `npm run prisma:generate`
  - [ ] Ran `npm run prisma:push`
- [ ] Started dev server: `npm run dev`
- [ ] Verified app works at http://localhost:3000

### 3. GitHub Repository Setup
- [ ] Pushed code to GitHub (or forked repository)
- [ ] Added `.gitignore` (should already exist)
- [ ] Verified `.env` is NOT committed (check on GitHub)
- [ ] Repository is private OR ready for public (no secrets committed)

### 4. GitHub Secrets (for Codespaces)
- [ ] Went to **Settings** → **Secrets and variables** → **Codespaces**
- [ ] Added `DATABASE_URL` secret
- [ ] Added `DIRECT_URL` secret
- [ ] Tested by creating a Codespace

### 5. GitHub Codespaces
- [ ] Created a test Codespace
- [ ] Verified environment variables load: `echo $DATABASE_URL`
- [ ] Ran `npm run dev` successfully
- [ ] Accessed app through forwarded port
- [ ] Deleted test Codespace (optional, to save hours)

### 6. GitHub iOS App Setup
- [ ] Installed GitHub app on iOS device
- [ ] Logged into GitHub account
- [ ] Found repository in app
- [ ] Tested opening in Codespace
- [ ] Tested AI agent commands (if using)

### 7. Vercel Deployment
- [ ] Created account on [Vercel](https://vercel.com)
- [ ] Connected GitHub account to Vercel
- [ ] Created new project from GitHub repository
- [ ] Configured environment variables in Vercel:
  - [ ] Added `DATABASE_URL` (Production)
  - [ ] Added `DIRECT_URL` (Production) - optional, only for migrations
- [ ] Created production database in Prisma Console (separate from dev)
- [ ] Used production credentials in Vercel
- [ ] Triggered first deployment
- [ ] Verified deployment successful
- [ ] Tested production app

## Optional Enhancements

### Production Database
- [ ] Created separate "Production" database in Prisma Console
- [ ] Generated production connection strings
- [ ] Added production URLs to Vercel only (not GitHub)
- [ ] Never mixed dev and prod credentials

### Domain Setup (Optional)
- [ ] Configured custom domain in Vercel
- [ ] Updated DNS records
- [ ] Verified SSL certificate
- [ ] Tested custom domain

### Monitoring (Optional)
- [ ] Enabled Vercel Analytics
- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Configured logging

### CI/CD
- [ ] Reviewed `.github/workflows/ci.yml`
- [ ] Tested pull request checks work
- [ ] Configured branch protection rules (optional)

## Security Checklist

- [ ] `.env` files in `.gitignore`
- [ ] No credentials in `prisma.config.ts`
- [ ] No credentials in `src/lib/prisma.ts`
- [ ] No credentials in git history: `git log --all --oneline | xargs git show | grep -i "sk_"`
- [ ] Different credentials for dev and prod
- [ ] GitHub Secrets configured properly
- [ ] Vercel environment variables set
- [ ] `.env.example` has only placeholders
- [ ] Reviewed [SECURITY.md](SECURITY.md)

## Troubleshooting Checklist

If something doesn't work:

### Local Development Issues
- [ ] Checked `.env` exists and has correct values
- [ ] Ran `npm install`
- [ ] Ran `npm run prisma:generate`
- [ ] Ran `npm run prisma:push`
- [ ] Checked port 3000 is available
- [ ] Checked database credentials are correct in Prisma Console

### Codespaces Issues
- [ ] Verified GitHub Secrets are set in **Codespaces** section (not Actions)
- [ ] Restarted Codespace after adding secrets
- [ ] Checked `echo $DATABASE_URL` returns actual value
- [ ] Ran `npm run prisma:generate` manually
- [ ] Checked forwarded ports are accessible

### Vercel Issues
- [ ] Verified environment variables are set in Vercel dashboard
- [ ] Checked build logs for errors
- [ ] Verified `DATABASE_URL` is set
- [ ] Re-deployed after adding environment variables
- [ ] Checked database is accessible from Vercel IPs

### Database Issues
- [ ] Verified database exists in Prisma Console
- [ ] Checked database status is "ready"
- [ ] Verified connection string is correct (copy-paste)
- [ ] Checked connection string has no extra spaces
- [ ] Ran `npm run prisma:push` to sync schema

## Maintenance Checklist

### Monthly
- [ ] Review Prisma Postgres usage and costs
- [ ] Check Vercel usage and bandwidth
- [ ] Review GitHub Codespaces hours used
- [ ] Update dependencies: `npm update`
- [ ] Check for security updates: `npm audit`

### Before Production Launch
- [ ] Create production database
- [ ] Configure production environment variables
- [ ] Test all features in production
- [ ] Set up monitoring and alerts
- [ ] Create database backup strategy
- [ ] Document deployment process
- [ ] Set up staging environment (optional)

## Documentation Checklist

- [ ] Read [README.md](README.md)
- [ ] Read [DEPLOYMENT.md](DEPLOYMENT.md)
- [ ] Read [SECURITY.md](SECURITY.md)
- [ ] Read [.devcontainer/README.md](.devcontainer/README.md)
- [ ] Read [.github/SECRETS.md](.github/SECRETS.md)

## Final Verification

Test all environments:

- [ ] **Local:** `npm run dev` → works at http://localhost:3000
- [ ] **Codespaces:** Create Codespace → `npm run dev` → works
- [ ] **iOS App:** Open in Codespace → AI agent can run commands
- [ ] **Vercel:** Deployed → works at your-project.vercel.app

## Get Help

If you're stuck:
1. Check troubleshooting sections in documentation
2. Review GitHub Issues for similar problems
3. Check Prisma Discord for database issues
4. Check Vercel Discord for deployment issues

---

✅ **All done?** You're ready to develop! Start with `npm run dev`
