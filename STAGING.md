# Staging & Production Environment — Průvodce

## Přehled architektury

```
┌─────────────────────────────────────────────────────────────────┐
│                        GIT REPOZITÁŘ                            │
│                                                                 │
│  feature/* ──PR──▶ staging ──PR──▶ main                        │
│                       │                │                        │
│                       ▼                ▼                        │
│              ┌──────────────┐  ┌──────────────┐                │
│              │   STAGING    │  │  PRODUCTION   │                │
│              │   Netlify    │  │   Netlify     │                │
│              │   deploy     │  │   deploy      │                │
│              └──────┬───────┘  └──────┬───────┘                │
│                     │                 │                          │
│                     ▼                 ▼                          │
│              ┌──────────────┐  ┌──────────────┐                │
│              │   STAGING    │  │  PRODUCTION   │                │
│              │   Convex DB  │  │  Convex DB    │                │
│              │  (testovací) │  │  (ostrá data) │                │
│              └──────────────┘  └──────────────┘                │
└─────────────────────────────────────────────────────────────────┘
```

## URL adresy

| Prostředí  | URL                                     | Git branch | Convex deployment | Convex URL |
|------------|-----------------------------------------|------------|-------------------|------------|
| Production | https://apsahu.netlify.app              | `main`     | `prod:exuberant-koala-3` | `https://exuberant-koala-3.eu-west-1.convex.cloud` |
| Staging    | https://staging--apsahu.netlify.app     | `staging`  | `dev:quirky-wolverine-818` | `https://quirky-wolverine-818.convex.cloud` |

## Jak to funguje

### 1. Dvě oddělené databáze (Convex)

Convex automaticky podporuje oddělené deploymenty. Každý deployment má **svoji vlastní databázi**, takže:

- **Production Convex** = ostrá data, na která se dívají uživatelé
- **Staging Convex** = testovací data, kde se dá cokoliv zkoušet

Data se mezi nimi **nepřekrývají** — pokud něco rozbijete na stagingu, produkce jede dál.

### 2. Dvě oddělené Netlify instance

Netlify automaticky deployuje branch `staging` na subdoménu `staging--apsahu.netlify.app`. Branch `main` jde vždy na `apsahu.netlify.app`.

---

## Nastavení (jednorázové)

### Krok 1: Vytvořte staging Convex deployment

```bash
# V terminálu projektu:
npx convex deploy --cmd "npm run build" --project ap_sa_hu
```

Nebo v Convex dashboardu:
1. Jděte na https://dashboard.convex.dev
2. Vyberte váš projekt
3. Klikněte na **"Deployments"** → **"Create deployment"**
4. Pojmenujte ho např. `staging`
5. Poznamenejte si staging URL (např. `https://quirky-wolverine-818.convex.cloud`)

### Krok 2: Nastavte environment variables v Netlify

1. Jděte do Netlify dashboardu → Site settings → Environment variables
2. Nastavte pro **branch `main`** (Production):
   ```
   NEXT_PUBLIC_CONVEX_URL = https://exuberant-koala-3.eu-west-1.convex.cloud
   CONVEX_DEPLOYMENT = prod:exuberant-koala-3
   ```
3. Nastavte pro **branch `staging`** (Staging):
   ```
   NEXT_PUBLIC_CONVEX_URL = https://quirky-wolverine-818.convex.cloud
   CONVEX_DEPLOYMENT = dev:quirky-wolverine-818
   ```

> **Důležité:** V Netlify UI můžete u každé proměnné nastavit "Scopes" —
> vyberte "Branch deploys → staging" pro staging hodnoty
> a "Production" pro produkční hodnoty.

### Krok 3: Povolte branch deploys v Netlify

1. Netlify dashboard → Site configuration → Build & deploy → Branches and deploy contexts
2. Nastavte:
   - **Production branch:** `main`
   - **Branch deploys:** "Let me add individual branches" → přidejte `staging`

### Krok 4: Vytvořte staging branch

```bash
git checkout main
git pull origin main
git checkout -b staging
git push -u origin staging
```

### Krok 5: Naplňte staging databázi testovacími daty

```bash
# Přepněte se na staging Convex deployment
npx convex dev --deployment dev:quirky-wolverine-818

# Importujte seed data
npx convex import --table products convex/seed/products/documents.jsonl
npx convex import --table opportunities convex/seed/opportunities/documents.jsonl
npx convex import --table news convex/seed/news/documents.jsonl
npx convex import --table posmItems convex/seed/posmItems/documents.jsonl
```

---

## Denní workflow pro vývojáře

### Nová funkce nebo oprava

```bash
# 1. Vytvořte feature branch ze stagingu
git checkout staging
git pull origin staging
git checkout -b feature/nova-funkce

# 2. Vyvíjejte lokálně (s dev Convex)
npm run dev

# 3. Commitujte změny
git add .
git commit -m "Popis změny"

# 4. Pushněte a vytvořte PR do staging
git push -u origin feature/nova-funkce
# → vytvořte Pull Request: feature/nova-funkce → staging
```

### Testování na stagingu

Po merge PR do `staging`:
1. Netlify automaticky deployuje na https://staging--apsahu.netlify.app
2. Otestujte vše na staging URL
3. Pokud je vše OK → pokračujte na produkci

### Nasazení do produkce

```bash
# Vytvořte PR: staging → main
# Po schválení a merge → Netlify automaticky deployuje na produkci
```

Nebo přes GitHub UI:
1. New Pull Request
2. Base: `main` ← Compare: `staging`
3. Review změny
4. Merge

---

## Convex schema & funkce — deployment na staging vs produkci

Když měníte Convex schema nebo funkce (soubory v `/convex/`):

```bash
# Deploy na staging
npx convex deploy --deployment dev:quirky-wolverine-818 --cmd "npm run build"

# Deploy na produkci (až po otestování!)
npx convex deploy --deployment prod:exuberant-koala-3 --cmd "npm run build"
```

**Pozor:** Convex backend se deployuje odděleně od Netlify frontendu. Pokud měníte schema, musíte deployment provést ručně (nebo nastavit CI/CD).

---

## Rollback (návrat k předchozí verzi)

### Frontend (Netlify)
1. Netlify dashboard → Deploys
2. Klikněte na předchozí úspěšný deploy
3. Klikněte **"Publish deploy"**

### Backend (Convex)
Convex nepodporuje automatický rollback, ale můžete:
1. Vrátit git commit: `git revert <commit-hash>`
2. Re-deployovat Convex funkce

---

## Bezpečnostní pravidla

1. **Nikdy nepushujte přímo do `main`** — vždy přes PR ze `staging`
2. **Nikdy nedělejte `git push --force` na `main` nebo `staging`**
3. **Staging databáze ≠ Produkční databáze** — testovací data neovlivní produkci
4. **Revízia kódu** — každý PR by měl být schválen alespoň 1 další osobou
5. **Citlivé klíče NIKDY nepatří do gitu** — viz sekce níže

### Citlivé proměnné (Netlify Dashboard)

Tyto proměnné nastavte **výhradně v Netlify UI** (Site Settings → Environment variables), **nikdy je nedávejte do `netlify.toml` ani jiného souboru v gitu**:

| Proměnná | Popis | Scope |
|----------|-------|-------|
| `CONVEX_DEPLOY_KEY` | Klíč pro Convex deployment | Per-branch (production / staging) |
| `RESEND_API_KEY` | API klíč pro odesílání emailů (OTP) | Per-branch |
| `AUTH_SECRET` | Secret pro autentizaci | Per-branch |

> **Tip:** Pro staging prostředí zvažte použití **testovacího Resend API klíče**,
> aby se testovací OTP emaily neposílaly z produkční domény.

---

## FAQ

### Jak zkopírovat produkční data do staging databáze?

```bash
# Export z produkce
npx convex export --deployment prod:exuberant-koala-3 --path ./backup

# Import do stagingu
npx convex import --deployment dev:quirky-wolverine-818 --path ./backup
```

### Co když se staging rozbije?

Žádný problém — produkce na `main` branchi jede nezávisle. Na stagingu můžete:
1. Vrátit commit (`git revert`)
2. Smazat a znovu vytvořit staging Convex deployment
3. Re-importovat data ze seedu

### Mohu mít víc staging prostředí?

Ano! Netlify podporuje branch deploys pro libovolný branch. Můžete mít:
- `staging` → https://staging--apsahu.netlify.app
- `staging-v2` → https://staging-v2--apsahu.netlify.app

Každý s vlastním Convex deploymentem.

### Jak poznám, že jsem na stagingu?

Aplikace má environment proměnnou `NEXT_PUBLIC_ENVIRONMENT`. Můžete ji využít pro zobrazení banneru (viz komponenta `EnvironmentBanner`).
