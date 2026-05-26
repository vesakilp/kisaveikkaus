# Kisaveikkaus

Sovellus kisaveikkausten hallintaan (esim. jalkapallon MM-kisat).

## Ominaisuudet

- **Hallintapaneeli** kisojen luomiseen ja hallintaan
- **Kisat (CRUD)** – luo, muokkaa ja poista kisoja
- **Kierrokset (CRUD)** – jokaisella kierroksella nimi sekä veikkauksen alku- ja loppuaika
- **Otteluparit (CRUD)** – syötä käsin tai tuo JSON-tiedostosta
- **Vahvistusdialoogi** kaikissa muutoksissa (muutoksille vaaditaan hyväksyntä)
- **JSON-tuonti** ohjeistus-popupilla
- Valkoinen teema

## Asennus

```bash
npm install
npx prisma migrate dev
npm run dev
```

Avaa [http://localhost:3000](http://localhost:3000).

## JSON-tuonnin muoto

```json
[
  {
    "homeTeam": "Suomi",
    "awayTeam": "Ruotsi",
    "matchDate": "2026-06-15T18:00:00"
  }
]
```

## Teknologiat

- [Next.js 16](https://nextjs.org/) (App Router)
- [Prisma 7](https://www.prisma.io/) + SQLite
- [Tailwind CSS](https://tailwindcss.com/)
