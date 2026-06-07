# Security Checklist for Public Repository

## ✅ Protected Files (in .gitignore)

The following sensitive files are properly excluded from version control:

- ✅ `.env*` - All environment files containing credentials
- ✅ `*.db` - Database files (both root and prisma/ directory)
- ✅ `/src/generated/prisma` - Generated Prisma client
- ✅ `node_modules/` - Dependencies
- ✅ `.next/` - Build artifacts

## 🔐 Credentials Location

**All credentials are now stored in `.env` file (never commit this file):**

```bash
# Prisma Accelerate connection (for application)
DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=YOUR_API_KEY"

# Direct connection (for Prisma CLI migrations)
DIRECT_URL="postgres://username:password@db.prisma.io:5432/postgres?sslmode=require"
```

## ⚠️ Before Pushing to GitHub

**Check these files contain NO hardcoded credentials:**

1. ✅ `prisma.config.ts` - Uses `process.env.DIRECT_URL`
2. ✅ `src/lib/prisma.ts` - Uses `process.env.DATABASE_URL`
3. ✅ All other `.ts`, `.tsx`, `.js` files

**Files that SHOULD be committed:**
- ✅ `prisma/schema.prisma` - Contains only the data model (no URLs)
- ✅ `.env.example` - Template with placeholder values
- ✅ `prisma.config.ts` - Uses environment variables
- ✅ Source code files

**Files that should NEVER be committed:**
- ❌ `.env` - Contains real credentials
- ❌ `.env.local`, `.env.development`, `.env.production`
- ❌ `*.db` - Database files
- ❌ Any file with API keys, passwords, or secrets

## 🔍 How to Verify Before Push

Run this command to check for potential secrets:

```bash
# Check for hardcoded secrets
grep -r "sk_\|api_key.*=.*['\"].\|password.*=.*['\"].\|postgres://.*@" \
  --include="*.ts" --include="*.tsx" --include="*.js" \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=src/generated \
  .
```

If this returns any matches in your source files (excluding generated code), review them carefully.

## 🚨 If Credentials Were Already Pushed

If you accidentally pushed credentials to GitHub:

1. **Immediately rotate the credentials:**
   - Delete the exposed connection string in Prisma Console
   - Create a new connection string
   - Update your `.env` file

2. **Remove from Git history:**
   ```bash
   # Use BFG Repo-Cleaner or git-filter-branch
   # Or consider creating a fresh repository
   ```

3. **Never just delete the file in a new commit** - it's still in the Git history!

## 📋 Deployment Checklist

When deploying to production (Vercel, Netlify, etc.):

1. Add environment variables in the platform's dashboard
2. Use the Prisma Accelerate URL for `DATABASE_URL`
3. Never commit production credentials to the repository
4. Use different credentials for development and production

## 🔗 Additional Security

Consider adding to your repository:

- [ ] `CODEOWNERS` file for sensitive file reviews
- [ ] GitHub secret scanning enabled
- [ ] Pre-commit hooks to prevent committing secrets
- [ ] Regular security audits with `npm audit`

---

## 🛡️ Security Vulnerability Reporting

If you discover a security vulnerability, **DO NOT** create a public GitHub issue. Instead:

1. Email security concerns to: [security@example.com]
2. Provide detailed description of the issue
3. Wait for acknowledgment (we respond within 48 hours)
4. Coordinate disclosure with us

## 📊 Security Audits

We conduct regular security audits:
- See [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) for the latest audit results
- See [AUTH_DOCS.md](./AUTH_DOCS.md) for authentication documentation

## 🔐 Security Best Practices

### Passwords
- Minimum 12 characters (recommended)
- Use Argon2 hashing (upgrade from bcrypt planned)
- Never store plaintext passwords
- Never log passwords

### Session Tokens
- HTTP-only cookies
- Secure flag in production
- SameSite=lax or strict
- 7-day expiration
- Redirect to login on expiration

### API Security
- Authentication on all protected endpoints
- Rate limiting on authentication endpoints
- Input validation on all endpoints
- Error handling without sensitive information

### Database
- Always use Prisma ORM (no raw SQL)
- Foreign key constraints
- Cascade delete where appropriate
- Regular backups

### Environment Variables
- Never commit .env files
- Use strong random secrets
- Rotate secrets regularly
- Separate secrets for development and production

## ✅ Security Checklist

### Before Each Release:
- [ ] Run npm audit
- [ ] Update dependencies
- [ ] Manual code review
- [ ] Security scan
- [ ] Penetration testing (for major releases)

### Monthly:
- [ ] Dependency updates
- [ ] Review logs for suspicious activity
- [ ] Clean up old sessions
- [ ] User audit
