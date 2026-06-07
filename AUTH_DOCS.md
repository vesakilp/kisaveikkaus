# Autentikointi ja käyttäjähallinta

## Toteutetut ominaisuudet

### 1. Navigaatiokomponentti (`src/components/Navigation.tsx`)
- Näyttää kirjautuneen käyttäjän tiedot
- Admin-badge kirjautuneille admin-käyttäjille
- Dropdown-valikko käyttäjälle (näyttää sähköpostin, kirjaudu ulos)
- Linkit hallintapaneeliin ja käyttäjähallintaan (vain admineille)
- Kirjaudu/Rekisteröidy -painikkeet kirjautumattomille
- Dynaaminen päivitys käyttäjän tilan mukaan

### 2. Proxy-suojaus (`src/proxy.ts`)
- Suojaa kaikki `/admin/*` -polut
- Tarkistaa session-cookien
- Uudelleenohjaa kirjautumattomat käyttäjät `/login`-sivulle
- Uudelleenohjaa ei-admin-käyttäjät etusivulle
- Käyttää Next.js 16:n uutta `proxy`-funktiota (ei vanhaa `middleware`-nimeä)

### 3. Kirjautumissivu (`src/app/login/page.tsx`)
- Sähköposti ja salasana -kentät
- Validointi ja virheenkäsittely
- Automaattinen uudelleenohjaus kirjautumisen jälkeen (admin → `/admin`, muut → `/`)
- Linkki rekisteröitymissivulle ja etusivulle

### 4. Rekisteröitymissivu (`src/app/register/page.tsx`)
- Sähköposti, näyttönimi ja salasana -kentät
- Salasanan vahvistus
- Salasanan vaatimukset näkyvillä
- Validointi ja virheenkäsittely
- Linkki kirjautumissivulle ja etusivulle

### 5. Käyttäjähallinta (`src/app/admin/users/page.tsx`)
- Listaus kaikista käyttäjistä taulukkomuodossa
- Käyttäjien muokkaus (näyttönimi, salasana, admin-rooli)
- Käyttäjien poisto vahvistuksella
- Inline-muokkaus suoraan taulukossa
- Kirjautumispäivämäärän näyttäminen
- Suojattu admin-oikeuksilla

### 6. Päivitetty etusivu (`src/app/page.tsx`)
- Selkeät Kirjaudu/Rekisteröidy -painikkeet
- Responsiivinen layout
- Integroitu navigaatiokomponenttiin

### 7. Päivitetty layout (`src/app/layout.tsx`)
- Globaali navigaatiokomponentti kaikilla sivuilla
- Yhtenäinen ulkoasu läpi sovelluksen

## API-endpointit (aiemmin toteutetut)

- `POST /api/auth/login` - Kirjautuminen
- `POST /api/auth/register` - Rekisteröityminen
- `POST /api/auth/logout` - Uloskirjautuminen
- `GET /api/auth/me` - Kirjautuneen käyttäjän tiedot
- `GET /api/users` - Käyttäjien listaus (admin)
- `PUT /api/users/[id]` - Käyttäjän muokkaus (admin)
- `DELETE /api/users/[id]` - Käyttäjän poisto (admin)

## Tietoturva

1. **Salasanojen hashays**: Argon2id-algoritmi (session.ts)
2. **Session-tokenit**: Satunnaiset 32-tavuiset tokenit
3. **Session-voimassaolo**: 7 päivää
4. **Admin-suojaus**: Proxy tarkistaa admin-oikeudet
5. **CSRF-suojaus**: Session-tokenit HTTP-only cookieissa
6. **Salasanan vaatimukset**: Min. 8 merkkiä, iso/pieni kirjain, numero

## Käyttö

### Kehitysympäristö
```bash
npm run dev
```

### Tuotanto
```bash
npm run build
npm start
```

### Ensimmäisen admin-käyttäjän luominen
Käytä Prisma Studiota tai SQL-kysely:
```sql
UPDATE User SET isAdmin = true WHERE email = 'admin@example.com';
```

Tai luo suoraan tietokantaan:
```bash
npx prisma studio
```

## Teknologiat

- **Next.js 16** (App Router, Turbopack)
- **Prisma** (ORM)
- **SQLite** (kehitys) / **PostgreSQL** (tuotanto)
- **Argon2** (salasanojen hashays)
- **TypeScript** (tyypitys)
- **Tailwind CSS** (tyylit)

## Tulevaisuuden parannukset

- [ ] Sähköpostin vahvistus rekisteröityessä
- [ ] "Unohditko salasanan?" -toiminto
- [ ] Kahden tekijän todennus (2FA)
- [ ] Session-hallinta (aktiiviset sessiot, kirjaudu ulos kaikista laitteista)
- [ ] Käyttäjän profiilin muokkaus
- [ ] Käyttäjäroolit (admin, moderator, user)
- [ ] Audit log (käyttäjien toimintojen seuranta)
