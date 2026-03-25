# Audit: Možnosti bezplatné databáze pro Apotheke Sales Hub

## Aktuální stav

**Stack:** Next.js 16 + Convex (DB, auth, file storage, realtime) + Netlify (hosting)

Convex aktuálně poskytuje:
- Databáze (NoSQL, realtime sync)
- Autentizace (OTP přes email / Resend)
- Souborové úložiště (obrázky, PDF)
- Serverové funkce (queries, mutations, actions)

### Convex Free Tier limity
| Zdroj | Limit |
|-------|-------|
| Function calls | 1M / měsíc |
| Storage (DB + soubory) | ~1 GB |
| Bandwidth | ~1 GB / měsíc |
| Deployments | 20 projektů |
| Vývojáři | 6 |

**Problém:** S 800+ produkty, obrázky v galerii a POSM materiály se snadno narazí na limity úložiště a bandwidth.

---

## Možnosti řešení (seřazeno od nejmenšího po největší effort)

---

### 1. Convex Self-Hosted (na Fly.io nebo vlastním serveru)

**Effort: NÍZKÝ** (minimální změny v kódu)

Convex je od února 2025 plně open-source a self-hostovatelný.

| Pro | Proti |
|-----|-------|
| Žádné změny v kódu aplikace | Potřeba spravovat server |
| Všechny funkce zachovány | Fly.io free tier je omezený |
| Docker image ready | Single-machine škálování |
| Dashboard dostupný | Nutnost řešit zálohy |

**Free hosting možnosti:**
- **Fly.io** — 3 shared VMs zdarma, 1 GB persistent volume → ideální pro Convex backend
- **Railway** — $5 kredit/měsíc zdarma
- **Render** — free tier pro web services (ale uspává po 15 min neaktivity)

**Jak na to:**
```bash
# 1. Stáhnout Fly.io config
npx degit get-convex/convex-backend/self-hosted/fly fly

# 2. Deploy na Fly.io
fly launch
fly ssh console --command "./generate_admin_key.sh"

# 3. Změnit CONVEX_URL v .env na vlastní URL
```

**Odhad práce:** 2–4 hodiny

---

### 2. Supabase (kompletní náhrada Convexu)

**Effort: STŘEDNÍ** (přepis backend logiky)

| Zdroj | Free tier |
|-------|-----------|
| Database (PostgreSQL) | 500 MB |
| File storage | 1 GB |
| Bandwidth | 2 GB |
| Auth MAUs | 50,000 |
| Edge Functions | 500K invocations/měsíc |
| Projekty | 2 |
| API requesty | Neomezené |

| Pro | Proti |
|-----|-------|
| PostgreSQL — robustní, standardní | Přepis všech Convex queries/mutations |
| Auth, storage, realtime v jednom | Auto-pause po 7 dnech neaktivity |
| Větší bandwidth (2 GB vs 1 GB) | 500 MB DB limit (méně než Convex) |
| Široká komunita, dokumentace | Nutnost naučit se SQL/Supabase API |
| Row Level Security | Žádné zálohy na free tier |

**Co je potřeba migrovat:**
1. Schema → PostgreSQL tabulky (products, users, gallery, posmItems, posmOrders, opportunities, news...)
2. Convex queries/mutations → Supabase client calls nebo API routes
3. Auth (OTP) → Supabase Auth (má nativní OTP přes email)
4. File storage → Supabase Storage
5. Realtime subscriptions → Supabase Realtime

**Odhad práce:** 3–5 dnů

---

### 3. Firebase / Firestore

**Effort: STŘEDNÍ** (přepis backend logiky)

| Zdroj | Free tier (Spark) |
|-------|-----------|
| Firestore storage | 1 GB |
| Reads | 50K / den |
| Writes | 20K / den |
| Deletes | 20K / den |
| Auth | 50K MAU (email/social) |
| Hosting | 1 GB storage, 10 GB/měsíc transfer |
| Cloud Functions | 2M invocations/měsíc |

| Pro | Proti |
|-----|-------|
| Velmi štědrý free tier | NoSQL — podobné Convexu, ale jiné API |
| Firebase Hosting = nemusíte Netlify | Od 02/2026 nový Storage bucket model |
| Stabilní, Google backing | Vendor lock-in |
| Realtime listeners nativně | Denní limity (ne měsíční) |
| Snadná migrace NoSQL → NoSQL | Složitější security rules |

**Odhad práce:** 3–5 dnů

---

### 4. Neon (PostgreSQL) + NextAuth + Cloudflare R2

**Effort: VYSOKÝ** (sestavení z komponent)

| Služba | Free tier |
|--------|-----------|
| **Neon** (DB) | 3 GB storage, 0.25 compute units |
| **NextAuth** (auth) | Zdarma (OSS) |
| **Cloudflare R2** (soubory) | 10 GB storage, 10M reads, 1M writes |

| Pro | Proti |
|-----|-------|
| Největší storage zdarma (3 GB DB + 10 GB soubory) | Nutnost integrovat 3 služby |
| Neon branching pro dev/staging | Žádný built-in realtime |
| R2 bez egress poplatků! | Více konfigurace |
| PostgreSQL standard | Více env variables, deployments |

**Odhad práce:** 5–7 dnů

---

### 5. Turso (SQLite na edge) + NextAuth

**Effort: VYSOKÝ**

| Zdroj | Free tier |
|-------|-----------|
| Storage | 9 GB |
| Row reads | 1 miliarda / měsíc |
| Row writes | 25M / měsíc |

| Pro | Proti |
|-----|-------|
| Obrovský free tier (9 GB!) | SQLite — jiný ekosystém |
| Extrémně nízká latence (edge) | Nutnost vlastní auth |
| libSQL (fork SQLite) | Nutnost vlastní file storage |
| Drizzle ORM integrace | Méně zralý ekosystém |

---

## Srovnávací tabulka

| | Convex (self-host) | Supabase | Firebase | Neon + R2 | Turso |
|---|---|---|---|---|---|
| **DB storage** | Neomezeno* | 500 MB | 1 GB | 3 GB | 9 GB |
| **File storage** | Neomezeno* | 1 GB | 1 GB | 10 GB (R2) | Nutné řešit |
| **Auth** | Zachováno | 50K MAU | 50K MAU | NextAuth (OSS) | NextAuth (OSS) |
| **Realtime** | Ano | Ano | Ano | Ne | Ne |
| **Effort migrace** | Minimální | Střední | Střední | Vysoký | Vysoký |
| **Auto-pause** | Ne | Ano (7 dní) | Ne | Ano (5 min) | Ne |
| **Vendor lock-in** | Nízký | Střední | Vysoký | Nízký | Nízký |

*\* Omezeno kapacitou serveru*

---

## Doporučení

### Nejlepší poměr effort/výsledek: **Convex Self-Hosted na Fly.io**

**Proč:**
1. **Žádné změny v kódu** — celá aplikace funguje beze změn
2. **Žádné limity** Convex free tier (function calls, storage, bandwidth)
3. **Fly.io free tier** stačí pro interní aplikaci s desítkami uživatelů
4. **2–4 hodiny práce** místo dnů přepisování

**Postup:**
1. Deploy Convex backendu na Fly.io (Docker)
2. Změnit `NEXT_PUBLIC_CONVEX_URL` v Netlify na novou URL
3. Migrovat data (export z Convex Cloud → import do self-hosted)
4. Hotovo

### Alternativa pokud chcete pryč od Convexu: **Supabase**

Supabase nabízí nejkompletnější balíček (DB + Auth + Storage + Realtime) v jedné službě. Migrace zabere několik dnů, ale získáte standardní PostgreSQL stack.

---

## Zdroje

- [Convex Pricing](https://www.convex.dev/pricing)
- [Convex Self-Hosting Docs](https://docs.convex.dev/self-hosting)
- [Convex Self-Hosted GitHub](https://github.com/get-convex/convex-backend/blob/main/self-hosted/README.md)
- [Supabase Pricing](https://supabase.com/pricing)
- [Firebase Pricing](https://firebase.google.com/pricing)
- [Neon](https://neon.com/)
- [Turso](https://turso.tech/)
- [Cloudflare R2 Pricing](https://developers.cloudflare.com/r2/pricing/)
