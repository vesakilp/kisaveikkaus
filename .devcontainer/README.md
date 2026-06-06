# GitHub Codespaces Setup for Kisaveikkaus

This repository is configured to work seamlessly with GitHub Codespaces, including the GitHub iOS app with agentic development tools.

## Quick Start

### Using GitHub Web or Desktop

1. Click the green **Code** button
2. Select **Codespaces** tab
3. Click **Create codespace on main**
4. Wait for setup to complete (automatic)
5. Run `npm run dev` to start the development server

### Using GitHub iOS App

1. Open the repository in the GitHub app
2. Tap the **Code** button
3. Select **Open in Codespace**
4. Wait for the environment to load
5. Use AI agents to:
   - Start the dev server: "Run npm run dev"
   - Make code changes
   - Run database migrations: "Run npm run prisma:push"
   - Test the application

## Environment Variables

Codespaces automatically loads environment variables from **GitHub Secrets**.

### Required Setup (One-time)

1. Go to your repository on GitHub.com
2. Navigate to: **Settings** → **Secrets and variables** → **Codespaces**
3. Add these secrets:

   **DATABASE_URL**
   ```
   prisma+postgres://accelerate.prisma-data.net/?api_key=YOUR_KEY
   ```

   **DIRECT_URL**
   ```
   postgres://username:password@db.prisma.io:5432/postgres?sslmode=require
   ```

4. Get your credentials from [Prisma Console](https://console.prisma.io/)

## Available Ports

- **Port 3000**: Next.js application (auto-forwarded)
- **Port 5555**: Prisma Studio (auto-forwarded)

## Pre-configured Features

✅ Node.js 20  
✅ GitHub CLI  
✅ VS Code extensions (ESLint, Prettier, Prisma, Tailwind)  
✅ Automatic dependency installation  
✅ Prisma Client generation on startup  
✅ Environment variables from GitHub Secrets  

## Common Commands for AI Agents

```bash
# Start development server
npm run dev

# Generate Prisma Client
npm run prisma:generate

# Push database schema changes
npm run prisma:push

# Open Prisma Studio (database GUI)
npm run prisma:studio

# Run linter
npm run lint

# Build for production
npm run build
```

## Troubleshooting

### "Environment variables not found"

**Solution:** Make sure GitHub Secrets are configured (see above). Restart the Codespace after adding secrets.

### "Cannot connect to database"

**Solution:** 
1. Check that `DATABASE_URL` and `DIRECT_URL` are set in GitHub Secrets
2. Verify credentials are correct in Prisma Console
3. Run `npm run prisma:generate` to regenerate the client

### "Port 3000 is already in use"

**Solution:** Stop any running processes:
```bash
pkill -f "next dev"
npm run dev
```

## Using with AI Agents (GitHub iOS App)

When working with AI agents on the GitHub iOS app:

1. **Agents have full access to:**
   - File system (can read/write code)
   - Terminal (can run npm commands)
   - Environment variables (from GitHub Secrets)

2. **Agents can help with:**
   - Writing new features
   - Fixing bugs
   - Running tests
   - Database migrations
   - Debugging issues

3. **Example prompts:**
   - "Start the development server"
   - "Add a new API endpoint for users"
   - "Fix the TypeScript error in admin page"
   - "Update the database schema to add a new field"
   - "Run the linter and fix issues"

## Security Notes

- ✅ GitHub Secrets are encrypted and secure
- ✅ Secrets are only available within your Codespaces
- ✅ Secrets are never exposed in logs or git history
- ⚠️ Be careful when sharing Codespace URLs (they may have access to your secrets)

## Learn More

- [GitHub Codespaces Documentation](https://docs.github.com/en/codespaces)
- [Managing Secrets for Codespaces](https://docs.github.com/en/codespaces/managing-your-codespaces/managing-secrets-for-your-codespaces)
- [Using GitHub Codespaces in VS Code](https://docs.github.com/en/codespaces/developing-in-codespaces/using-github-codespaces-in-visual-studio-code)
