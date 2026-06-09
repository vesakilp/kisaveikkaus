# Veikkauskisa

Sovellus veikkauskisojen hallintaan (esim. jalkapallon MM-kisat).

## ✨ Ominaisuudet

- **Hallintapaneeli** kisojen luomiseen ja hallintaan
- **Kisat (CRUD)** – luo, muokkaa ja poista kisoja
- **Kierrokset (CRUD)** – jokaisella kierroksella nimi sekä veikkauksen alku- ja loppuaika
- **Otteluparit (CRUD)** – syötä käsin tai tuo JSON-tiedostosta
- **Automaattinen tulospäivitys** – Vercel Cron + OpenAI hakee päättyneiden otteluiden tuloksia
- **Vahvistusdialogi** kaikissa muutoksissa (muutoksille vaaditaan hyväksyntä)
- **JSON-tuonti** ohjeistus-popupilla
- Valkoinen teema

## 🚀 Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Push database schema
npm run prisma:push

# Start development server
npm run dev
```

Avaa [http://localhost:3000](http://localhost:3000).

### GitHub Codespaces

1. Click the green **Code** button
2. Select **Codespaces** → **Create codespace on main**
3. Wait for automatic setup
4. Run `npm run dev`

**Setup required:** Add `DATABASE_URL` and `DIRECT_URL` to GitHub Secrets (see [DEPLOYMENT.md](./DEPLOYMENT.md))

### Vercel Deployment

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/veikkauskisa)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## 📚 Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete deployment guide for local, Codespaces, and Vercel
- **[SECURITY.md](./SECURITY.md)** - Security best practices and credential management
- **[.devcontainer/README.md](./.devcontainer/README.md)** - GitHub Codespaces setup guide

## 🗄️ Database

This project uses **Prisma Postgres** with **Prisma Accelerate** for:
- ✅ Managed PostgreSQL database
- ✅ Connection pooling
- ✅ Global edge caching
- ✅ Zero cold starts

Get your database credentials from [Prisma Console](https://console.prisma.io/).

### Database Schema

```prisma
model Competition {
  id        Int      @id @default(autoincrement())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  rounds    Round[]
}

model Round {
  id            Int         @id @default(autoincrement())
  name          String
  bettingStart  DateTime
  bettingEnd    DateTime
  competitionId Int
  competition   Competition @relation(...)
  matchPairs    MatchPair[]
}

model MatchPair {
  id        Int      @id @default(autoincrement())
  homeTeam  String
  awayTeam  String
  matchDate DateTime
  roundId   Int
  round     Round    @relation(...)
}
```

## 📝 JSON-tuonnin muoto

```json
[
  {
    "homeTeam": "Suomi",
    "awayTeam": "Ruotsi",
    "matchDate": "2026-06-15T18:00:00"
  }
]
```

## 🛠️ Available Commands

```bash
# Development
npm run dev                # Start development server
npm run build              # Build for production
npm run start              # Start production server
npm run lint               # Run ESLint

# Database
npm run prisma:generate    # Generate Prisma Client
npm run prisma:push        # Push schema changes to database
npm run prisma:studio      # Open Prisma Studio (database GUI)
npm run prisma:migrate     # Run database migrations

# Deployment
vercel                     # Deploy to preview
vercel --prod              # Deploy to production
```

## 🏗️ Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router, React Server Components)
- **Database:** [Prisma 7](https://www.prisma.io/) + [Prisma Postgres](https://www.prisma.io/postgres)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com/)
- **Language:** [TypeScript 5](https://www.typescriptlang.org/)
- **Deployment:** [Vercel](https://vercel.com/)
- **Development:** GitHub Codespaces compatible

## 🔐 Environment Variables

Required environment variables (see [.env.example](./.env.example)):

```bash
# Prisma Accelerate connection (required)
DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=YOUR_KEY"

# Direct connection (for migrations only)
DIRECT_URL="postgres://<username>:<password>@db.prisma.io:5432/postgres?sslmode=require"

# JWT signing key (min. 32 chars)
JWT_SECRET="your-super-secret-jwt-key-min-32-characters"

# OpenAI-driven result automation
OPENAI_API_KEY="sk-..."
CRON_SECRET="long-random-secret"
```

Optional SMTP settings for password reset emails:

```bash
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="smtp-username"
SMTP_PASS="smtp-password"
MAIL_FROM="Veikkauskisa <no-reply@example.com>"
APP_URL="http://localhost:3000"
```

**Never commit `.env` files!** Use:
- **Local:** `.env` file (gitignored)
- **Codespaces:** GitHub Secrets
- **Vercel:** Environment Variables in dashboard

### OpenAI tulosautomaation käyttö

- Jokaisella kisalla on oma muokattava OpenAI prompt hallintapaneelin kisasivulla kohdassa **Asetukset**.
- Samassa näkymässä voi määrittää kisan OpenAI-ajastuksen päivämäärävälille sekä yhdelle päivittäiselle kellonajalle.
- Oletusprompt: `Anna päättyneiden 2026 FIFA Men's World Cupin pelien tulokset`
- Cron endpoint on `/api/cron/update-results` ja sitä kutsutaan Vercelissä kerran päivässä.
- Endpoint käsittelee kunkin kisan ajon vain sille määritellyn päivämäärävälin sisällä ja vain määriteltynä kellonaikana (oletus **22:00**, ei päivämäärärajausta).
- OpenAI-kutsut lokitetaan kilpailukohtaisesti ja request/response näkyvät hallintapaneelissa kohdassa **OpenAI-lokit**.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🔗 Links

- **Live Demo:** Coming soon
- **Prisma Console:** [console.prisma.io](https://console.prisma.io/)
- **Documentation:** [DEPLOYMENT.md](./DEPLOYMENT.md)

---

Made with ❤️ using Next.js and Prisma
