# GitHub Secrets Setup Guide

This guide shows you how to configure GitHub Secrets for GitHub Codespaces and GitHub Actions.

## Why GitHub Secrets?

GitHub Secrets allow you to:
- ✅ Store sensitive credentials securely
- ✅ Use Codespaces without committing `.env` files
- ✅ Develop on GitHub iOS app with AI agents
- ✅ Run CI/CD workflows securely

## Setup Instructions

### Step 1: Get Your Database Credentials

1. Go to [Prisma Console](https://console.prisma.io/)
2. Select your project: **veikkauskisa**
3. Select your database: **Development**
4. Click **"Connection Strings"** → **"New Connection String"**
5. Copy both connection strings:
   - **Prisma Accelerate URL** (starts with `prisma+postgres://`)
   - **Direct Connection URL** (starts with `postgres://`)

### Step 2: Add Secrets to GitHub

#### For Codespaces (Development)

1. Go to your repository on GitHub.com
2. Click **Settings** (repository settings, not your account)
3. In the left sidebar, expand **Secrets and variables**
4. Click **Codespaces**
5. Click **"New repository secret"**
6. Add the following secrets:

**Secret 1: DATABASE_URL**
- **Name:** `DATABASE_URL`
- **Secret:** Paste your Prisma Accelerate connection string
  ```
  prisma+postgres://accelerate.prisma-data.net/?api_key=eyJ...
  ```

**Secret 2: DIRECT_URL**
- **Name:** `DIRECT_URL`
- **Secret:** Paste your Direct PostgreSQL connection string
  ```
  postgres://c158fa...@db.prisma.io:5432/postgres?sslmode=require
  ```

#### For GitHub Actions (CI/CD) - Optional

If you want to run tests against a real database in CI:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add the same secrets as above

**Note:** The current CI configuration uses a dummy DATABASE_URL for build testing only.

### Step 3: Verify Setup

1. Create a new Codespace or restart existing one
2. In the Codespace terminal, run:
   ```bash
   echo $DATABASE_URL
   ```
3. You should see your connection string (not "YOUR_ACCELERATE_API_KEY")

## Using Different Environments

### Development Database (Recommended)

For Codespaces and local development:
- Use your **Development** database from Prisma Console
- Add its credentials to GitHub Secrets

### Production Database (Separate)

For Vercel production:
1. Create a separate **Production** database in Prisma Console
2. Add production credentials to Vercel (not GitHub)
3. Never use production credentials in development

## Security Best Practices

✅ **DO:**
- Use GitHub Secrets for Codespaces
- Use Vercel Environment Variables for production
- Create separate databases for dev and prod
- Rotate credentials if they're exposed

❌ **DON'T:**
- Commit credentials to git
- Share secrets in issues or pull requests
- Use production credentials in development
- Share Codespace URLs with untrusted users

## Troubleshooting

### "Environment variables not found in Codespace"

**Solution:**
1. Check that secrets are added in the **Codespaces** section (not Actions)
2. Restart the Codespace after adding secrets
3. Go to Codespace → **Settings** → **Environment variables** to verify

### "Permission denied to access secrets"

**Solution:**
1. Make sure you have write access to the repository
2. Repository secrets are available to all collaborators
3. For organization repos, check organization secret policies

### "Secret not updating in Codespace"

**Solution:**
1. Stop the Codespace
2. Delete the Codespace
3. Create a new Codespace (secrets are loaded at creation time)

## Alternative: Codespace Secrets vs Repository Secrets

**Repository Secrets (Recommended):**
- Available to all contributors
- Shared across all Codespaces
- Easier to manage

**Personal Codespace Secrets:**
- Only available to you
- Override repository secrets
- Useful for personal credentials

To add personal secrets:
1. Go to your GitHub profile → **Settings**
2. Click **Codespaces** in sidebar
3. Add secrets under **"Codespaces secrets"**

## Quick Reference

| Secret Name | Used In | Purpose |
|-------------|---------|---------|
| `DATABASE_URL` | Codespaces, Vercel | Application database connection |
| `DIRECT_URL` | Codespaces (CLI) | Prisma migrations and introspection |

## Next Steps

After setting up secrets:
1. ✅ [Create a Codespace](.devcontainer/README.md)
2. ✅ [Deploy to Vercel](DEPLOYMENT.md#vercel-deployment)
3. ✅ [Use GitHub iOS app](.devcontainer/README.md#using-with-ai-agents-github-ios-app)

## Learn More

- [GitHub Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Managing Codespaces Secrets](https://docs.github.com/en/codespaces/managing-your-codespaces/managing-secrets-for-your-codespaces)
- [Prisma Connection Management](https://www.prisma.io/docs/guides/database/troubleshooting-orm/help-articles/nextjs-prisma-client-monorepo)
