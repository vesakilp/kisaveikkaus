# Tietoturva-audit - Veikkauskisa

**Päivämäärä:** 2026-06-07  
**Sovellus:** Veikkauskisa (Next.js 16 + Prisma + PostgreSQL)  
**Auditointikohteet:** Autentikointi, valtuutus, tietokanta, API, frontend, riippuvuudet

---

## 🔴 KRIITTISET ONGELMAT (Välitön korjaus vaaditaan)

### 1. JWT_SECRET käyttää heikkoa oletusarvoa
**Tiedosto:** `src/lib/auth/session.ts:4-6`  
**Riski:** 🔴 KRIITTINEN  
**Kuvaus:** JWT-salaisuus käyttää kovakoodattua fallback-arvoa:
```typescript
const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-this-in-production"
);
```

**Vaikutus:**
- Jos JWT_SECRET puuttuu ympäristömuuttujista, käytetään tunnettua arvoa
- Hyökkääjä voi luoda väärennetyt session-tokenit
- Kaikki käyttäjätilit vaarantuvat

**Korjaus:**
```typescript
const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32) {
  throw new Error(
    "JWT_SECRET must be set and at least 32 characters long. " +
    "Generate with: openssl rand -base64 32"
  );
}
const encodedSecret = new TextEncoder().encode(secret);
```

**Prioriteetti:** ⚠️ KORJAA VÄLITTÖMÄSTI ennen tuotantoon vientiä

---

### 2. Bcrypt käytetään Argon2:n sijaan
**Tiedosto:** `src/lib/auth/password.ts`  
**Riski:** 🟡 KESKITASO  
**Kuvaus:** AUTH_DOCS.md lupaa Argon2id-algoritmia, mutta käytössä on bcryptjs.

**Vaikutus:**
- Bcrypt on vanhempi ja hitaampi kuin Argon2id
- Bcrypt on alttiimpi GPU-pohjaisille brute-force-hyökkäyksille
- Dokumentaatio ja toteutus eivät täsmää

**Korjaus:**
1. Asenna argon2: `npm install @node-rs/argon2`
2. Korvaa bcrypt argon2:lla:
```typescript
import { hash, verify } from '@node-rs/argon2';

export async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    memoryCost: 65536,  // 64 MB
    timeCost: 3,        // 3 iterations
    parallelism: 4,     // 4 threads
    outputLen: 32,      // 32 bytes
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return verify(hash, password);
}
```

**Prioriteetti:** 🔶 Korjaa ennen tuotantoa

---

## 🟡 KESKITASON ONGELMAT (Korjaa pian)

### 3. Ei rate limitingiä kirjautumiselle
**Tiedosto:** `src/app/api/auth/login/route.ts`  
**Riski:** 🟡 KESKITASO  
**Kuvaus:** Kirjautumis-endpoint ei rajoita yritysten määrää.

**Vaikutus:**
- Brute-force-hyökkäykset ovat mahdollisia
- Ei suojaa heikkoja salasanoja käyttäviä tilejä
- Voi aiheuttaa DoS:n

**Korjaus:** Lisää rate limiting (esim. upstash/ratelimit tai vercel/ratelimit):
```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "15 m"), // 5 yritystä per 15 min
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return NextResponse.json(
      { error: "Liian monta kirjautumisyritystä. Yritä myöhemmin uudelleen." },
      { status: 429 }
    );
  }
  // ... rest of login logic
}
```

**Prioriteetti:** 🔶 Korjaa ennen tuotantoa

---

### 4. Ei CSRF-suojausta API-kutsuissa
**Tiedosto:** Kaikki API-reitit  
**Riski:** 🟡 KESKITASO  
**Kuvaus:** API-endpointit eivät tarkista CSRF-tokeneita.

**Vaikutus:**
- Cross-Site Request Forgery -hyökkäykset ovat mahdollisia
- Hyökkääjä voi tehdä toimintoja käyttäjän puolesta

**Huomio:** 
- SameSite=lax cookiet antavat osittaisen suojan
- Secure flag puuttuu kehitysympäristössä (OK)

**Korjaus:** Lisää CSRF-token tarkistus tai käytä Next.js:n Server Actions:ia:
```typescript
// Option 1: Add CSRF token middleware
import { getCsrfToken } from "@/lib/csrf";

export async function POST(request: Request) {
  const csrfToken = request.headers.get("x-csrf-token");
  const isValid = await verifyCsrfToken(csrfToken);
  
  if (!isValid) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }
  // ...
}

// Option 2: Migrate to Server Actions (recommended for Next.js 16)
```

**Prioriteetti:** 🟢 Harkitse tuotannossa

---

### 5. Salasanojen vahvuusvaatimukset ovat minimaaliset
**Tiedosto:** `src/lib/auth/password.ts:11-29`  
**Riski:** 🟡 KESKITASO  
**Kuvaus:** Salasanavaatimukset: vain 8 merkkiä, 1 iso, 1 pieni, 1 numero.

**Vaikutus:**
- "Password1" on validi salasana
- Ei tarkista yleisiä salasanoja (esim. "Password123")
- Ei tarkista salasanan entropia

**Korjaus:**
```typescript
import zxcvbn from 'zxcvbn'; // Salasanan vahvuuden arviointi

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 12) { // Nosta 8 -> 12
    return { valid: false, error: "Salasanan täytyy olla vähintään 12 merkkiä pitkä" };
  }

  // Tarkista salasanan vahvuus
  const strength = zxcvbn(password);
  if (strength.score < 3) { // 0-4 asteikko, 3 = hyvä
    return { 
      valid: false, 
      error: `Salasana on liian heikko. ${strength.feedback.warning || ''}`
    };
  }

  // Pidä nykyiset tarkistukset...
  
  // Lisää: Tarkista yleiset salasanat
  const commonPasswords = ["password", "123456", "qwerty", "admin"];
  if (commonPasswords.some(p => password.toLowerCase().includes(p))) {
    return { valid: false, error: "Salasana on liian yleinen" };
  }

  return { valid: true };
}
```

**Prioriteetti:** 🔶 Paranna ennen tuotantoa

---

### 6. Ei session revocation -mekanismia
**Tiedosto:** `src/lib/auth/session.ts`  
**Riski:** 🟡 KESKITASO  
**Kuvaus:** JWT-tokenit ovat voimassa 7 päivää ilman mahdollisuutta mitätöidä niitä.

**Vaikutus:**
- Käyttäjä ei voi kirjautua ulos kaikista laitteista
- Varastettu token on voimassa 7 päivää
- Salasanan vaihto ei mitätöi vanhoja sessioita

**Korjaus:** Lisää session-taulu tietokantaan:
```prisma
model Session {
  id        String   @id @default(cuid())
  userId    Int
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
  ipAddress String?
  userAgent String?
}
```

Tarkista token tietokannasta jokaisessa pyynnössä:
```typescript
export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    
    // Tarkista että sessio on vielä voimassa tietokannassa
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true }
    });
    
    if (!session || session.expiresAt < new Date()) {
      return null;
    }
    
    return payload.user as SessionUser;
  } catch {
    return null;
  }
}
```

**Prioriteetti:** 🔶 Harkitse ennen tuotantoa

---

## 🟢 PIENET ONGELMAT (Parannusehdotukset)

### 7. Virhetiedot paljastavat liikaa
**Tiedosto:** Monet API-reitit  
**Riski:** 🟢 PIENI  
**Kuvaus:** console.error logittaa koko error-objektin.

**Vaikutus:**
- Stack tracet voivat paljastaa tiedostopolkuja
- Tietokantavirheet voivat paljastaa skeeman

**Korjaus:**
```typescript
// Nykyinen:
catch (error) {
  console.error("Login error:", error);
  return NextResponse.json({ error: "Kirjautuminen epäonnistui" }, { status: 500 });
}

// Parempi:
catch (error) {
  // Logita vain turvallisia tietoja
  console.error("Login error:", {
    message: error instanceof Error ? error.message : "Unknown error",
    timestamp: new Date().toISOString(),
    // ÄLÄ logita stack tracea tuotannossa
  });
  
  return NextResponse.json({ error: "Kirjautuminen epäonnistui" }, { status: 500 });
}
```

**Prioriteetti:** 🟢 Paranna kun aikaa

---

### 8. Ei SQL injection -suojausta (Prisma hoitaa)
**Tiedosto:** Kaikki tietokantakutsut  
**Riski:** ✅ EI ONGELMAA  
**Kuvaus:** Prisma ORM suojaa automaattisesti SQL injectiolta.

**Vahvistus:** Tarkistettu että kaikki kyselyt käyttävät Prismaa. Ei raw SQL:ää.

---

### 9. Ei XSS-suojausta (React hoitaa)
**Tiedosto:** Frontend-komponentit  
**Riski:** ✅ EI ONGELMAA  
**Kuvaus:** React escapoi automaattisesti käyttäjäsyötteen.

**Vahvistus:** 
- Ei `dangerouslySetInnerHTML` käyttöä
- Ei `innerHTML` käyttöä
- Ei `eval()` käyttöä

---

### 10. Email-validointi on suppea
**Tiedosto:** `src/lib/auth/password.ts:49-56`  
**Riski:** 🟢 PIENI  
**Kuvaus:** Email-regex on yksinkertainen.

**Korjaus:** Käytä validator-kirjastoa:
```typescript
import validator from 'validator';

export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!validator.isEmail(email)) {
    return { valid: false, error: "Virheellinen sähköpostiosoite" };
  }
  
  // Lisäksi: tarkista MX-recordit tuotannossa (valinnainen)
  
  return { valid: true };
}
```

**Prioriteetti:** 🟢 Nice to have

---

## 📦 RIIPPUVUUDET

### NPM Audit -tulokset:
```
5 moderate severity vulnerabilities
```

**Havainnot:**
1. **@hono/node-server** - Middleware bypass (GHSA-92pp-h63x-v22m)
   - Vaikutus: Prisma dev-riippuvuus, ei tuotannossa
   - Toimenpide: ✅ Ei kriittinen

2. **postcss** - XSS via unescaped </style> (GHSA-qx2v-qp2m-jg93)
   - Vaikutus: Next.js build-time riippuvuus
   - Toimenpide: ✅ Odota Next.js päivitystä

**Suositus:** Päivitä riippuvuudet säännöllisesti:
```bash
npm audit fix
npm outdated
```

---

## 🔒 TURVALLISUUSPARANNUKSET JA PARHAAT KÄYTÄNNÖT

### ✅ Hyvin toteutetut asiat:

1. **Salasanojen hashays:** bcrypt (parempi olisi Argon2)
2. **Session-tokenit:** JWT HTTP-only cookieissa
3. **Admin-suojaus:** Proxy-taso ja API-taso molemmat
4. **Input-validointi:** Validointi ennen tietokantaa
5. **SQL injection -suoja:** Prisma ORM
6. **XSS-suoja:** React automaattinen escaping
7. **Secure cookies:** Tuotannossa secure=true
8. **SameSite cookies:** Lax-asetus
9. **Salasanan pituus:** Min 8 merkkiä (voisi olla 12)
10. **.env tiedostot:** Gitignored oikein

---

## 🎯 PRIORITEETTILISTA (Toimenpiteet tärkeysjärjestyksessä)

### Ennen tuotantoa (PAKOLLINEN):
1. 🔴 Lisää JWT_SECRET pakollinen validointi
2. 🔶 Korvaa bcrypt Argon2:lla
3. 🔶 Lisää rate limiting kirjautumiselle
4. 🔶 Nosta salasanavaatimuksia (12+ merkkiä)
5. 🔶 Lisää session revocation

### Tuotannossa (SUOSITELLAAN):
6. 🟢 Lisää CSRF-suojaus tai siirry Server Actions:iin
7. 🟢 Paranna virhelokitusta
8. 🟢 Lisää audit logging (kuka teki mitä ja milloin)
9. 🟢 Lisää 2FA-tuki
10. 🟢 Lisää "Unohditko salasanan?" -toiminto

### Jatkuva ylläpito:
- Päivitä riippuvuudet kuukausittain
- Tarkista npm audit viikoittain
- Seuraa GitHub Security Advisories
- Testaa tietoturva penetraatiotestauksella

---

## 📋 TIETOTURVATARKISTUSLISTA (Checklist)

### Autentikointi & Valtuutus
- [x] Salasanojen hashays käytössä
- [ ] Vahva hash-algoritmi (Argon2)
- [x] Session-tokenit HTTP-only cookieissa
- [ ] Rate limiting kirjautumiselle
- [ ] Session revocation -mekanismi
- [x] Admin-oikeuksien tarkistus
- [x] Proxy-tason suojaus

### Input-validointi
- [x] Email-validointi
- [x] Salasana-validointi
- [x] DisplayName-validointi
- [ ] CSRF-suojaus
- [x] SQL injection -suoja (Prisma)
- [x] XSS-suoja (React)

### Salaisuuksien hallinta
- [ ] JWT_SECRET pakollinen
- [x] .env gitignored
- [x] .env.example dokumentoitu
- [ ] Tuotannon salaisuudet ympäristömuuttujissa

### Tietokanta
- [x] Prisma ORM käytössä
- [x] Ei raw SQL:ää
- [x] Foreign key constraints
- [x] onDelete: Cascade määritelty

### API-turvallisuus
- [x] Autentikointi API-reiteissä
- [x] Valtuutus (admin-tarkistukset)
- [x] Virheenkäsittely
- [ ] Rate limiting
- [ ] CORS-asetukset (Next.js default OK)

### Frontend-turvallisuus
- [x] Ei dangerouslySetInnerHTML
- [x] Ei innerHTML
- [x] Ei eval()
- [x] React automaattinen escaping
- [x] HTTPS tuotannossa (Vercel)

### Riippuvuudet
- [x] npm audit suoritettu
- [ ] Kriittiset haavoittuvuudet korjattu
- [ ] Päivitysprosessi määritelty

---

## 🚀 SEURAAVAT ASKELEET

1. **Korjaa kriittiset ongelmat** (JWT_SECRET, Argon2)
2. **Toteuta rate limiting**
3. **Lisää session management**
4. **Suorita penetraatiotestaus**
5. **Aseta jatkuva monitorointi**

---

## 📞 YHTEENVETO

**Yleisarvio:** 🟡 KOHTUULLINEN TURVALLISUUS

Sovellus on hyvällä pohjalla, mutta vaatii muutamia kriittisiä korjauksia ennen tuotantoon vientiä. Autentikointi on toteutettu pääosin oikein, mutta puuttuu moderneja suojaustoimenpiteitä kuten rate limiting ja session revocation.

**Suositus:** Korjaa kriittiset ja keskitason ongelmat ennen tuotantoon vientiä. Jatkotyönä lisää audit logging ja 2FA.

---

**Auditoinut:** GitHub Copilot CLI  
**Versio:** Veikkauskisa commit 3af7f64  
**Seuraava audit:** 3 kuukauden kuluttua tai merkittävien muutosten jälkeen
