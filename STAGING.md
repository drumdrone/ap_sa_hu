# Deploy Workflow — Průvodce

## Přehled

```
feature branch → PR do main → Netlify Deploy Preview → otestovat → merge → produkce
```

Používáme **jeden Convex projekt** a **Netlify Deploy Previews** pro testování před nasazením.

## URL adresy

| Co | URL |
|----|-----|
| Produkce | https://remarkable-starlight-5c32cc.netlify.app |
| Deploy Preview | `deploy-preview-XX--remarkable-starlight-5c32cc.netlify.app` (automaticky z PR) |
| Convex Dashboard | https://dashboard.convex.dev |

## Denní workflow

### 1. Nová funkce nebo oprava

```bash
# Vytvoř feature branch z main
git checkout main
git pull origin main
git checkout -b feature/nova-funkce

# Vyvíjej lokálně
npm run dev              # Next.js dev server
npx convex dev           # Convex dev server (v druhém terminálu)

# Commitni změny
git add .
git commit -m "Popis změny"

# Pushni a vytvoř PR do main
git push -u origin feature/nova-funkce
```

### 2. Testování na Deploy Preview

1. Vytvoř **Pull Request** do `main` na GitHubu
2. Netlify automaticky vygeneruje **Deploy Preview** URL (viz komentář od Netlify bota v PR)
3. Otestuj na preview URL
4. Pokud něco nefunguje → oprav na branchi → pushni → nový preview automaticky

### 3. Nasazení do produkce

- Když je vše otestované → **Merge PR** do `main`
- Netlify automaticky deployuje na produkci

## Convex

Celý projekt běží proti jednomu Convex deploymentu (`exuberant-koala-3`).

- **Lokální vývoj:** `npx convex dev` — používá dev mode
- **Deploy (Netlify):** `npx convex deploy --cmd 'npm run build'` — Netlify to spouští automaticky

### Ruční deploy (pokud potřebuješ)

```bash
npm run convex:deploy
```

## Rollback

### Frontend (Netlify)
1. Netlify dashboard → Deploys
2. Klikni na předchozí úspěšný deploy
3. Klikni **"Publish deploy"**

### Backend (Convex)
1. Vrať git commit: `git revert <commit-hash>`
2. Pushni a nech Netlify re-deployovat

## Bezpečnostní pravidla

1. **Nikdy nepushuj přímo do `main`** — vždy přes PR
2. **Nikdy neděl `git push --force` na `main`**
3. **Citlivé klíče nepatří do gitu** — nastav je v Netlify Dashboard

### Citlivé proměnné (Netlify Dashboard)

Nastav v **Netlify UI** (Site Settings → Environment variables):

| Proměnná | Popis |
|----------|-------|
| `CONVEX_DEPLOY_KEY` | Klíč pro Convex deployment |
| `RESEND_API_KEY` | API klíč pro odesílání emailů (OTP) |
| `AUTH_SECRET` | Secret pro autentizaci |
