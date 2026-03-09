# Staging & Production — Průvodce

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
│                     └────────┬────────┘                          │
│                              ▼                                  │
│                     ┌──────────────┐                            │
│                     │   SDÍLENÁ    │                            │
│                     │  Convex DB   │                            │
│                     │ (jedna DB)   │                            │
│                     └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

## URL adresy

| Prostředí  | URL                                     | Git branch | Convex URL |
|------------|-----------------------------------------|------------|------------|
| Production | https://apsahu.netlify.app              | `main`     | `https://exuberant-koala-3.eu-west-1.convex.cloud` |
| Staging    | https://staging--apsahu.netlify.app     | `staging`  | `https://exuberant-koala-3.eu-west-1.convex.cloud` |

## Jak to funguje

### Jedna sdílená databáze

Staging i produkce sdílejí **stejnou Convex databázi**. To znamená:

- **Data jsou vždy stejná** na obou prostředích — žádná desynchronizace
- **Staging testuje pouze kód** (UI, funkce, logiku), ne data
- Pokud na stagingu upravíte data, projeví se to i na produkci

### Dvě oddělené Netlify instance

- Branch `main` → https://apsahu.netlify.app (produkce)
- Branch `staging` → https://staging--apsahu.netlify.app (staging)
- Kód se liší, data ne

### Environment banner

Staging zobrazuje žlutý banner "STAGING ENVIRONMENT" díky proměnné `NEXT_PUBLIC_ENVIRONMENT = "staging"`. Na produkci se banner nezobrazuje.

---

## Denní workflow

### 1. Nová funkce nebo oprava

```bash
# Vytvořte feature branch ze stagingu
git checkout staging
git pull origin staging
git checkout -b feature/nova-funkce

# Vyvíjejte lokálně
npm run dev

# Commitujte a pushněte
git add .
git commit -m "Popis změny"
git push -u origin feature/nova-funkce

# → Vytvořte Pull Request: feature/nova-funkce → staging
```

### 2. Testování na stagingu

Po merge PR do `staging`:
1. Netlify automaticky deployuje na https://staging--apsahu.netlify.app
2. Otestujte nový kód na staging URL
3. Data jsou stejná jako na produkci (sdílená DB)
4. Pokud je vše OK → pokračujte na produkci

### 3. Nasazení do produkce

```bash
# Vytvořte PR: staging → main
# Po merge → Netlify automaticky deployuje na produkci
```

Nebo přes GitHub UI:
1. New Pull Request
2. Base: `main` ← Compare: `staging`
3. Review změny
4. Merge

---

## Synchronizace staging s produkcí

Pokud se staging branch rozsynchronizuje s main (např. po přímých opravách na main):

```bash
# Stáhněte nejnovější main
git checkout main
git pull origin main

# Synchronizujte staging
git checkout staging
git merge main
git push origin staging
```

Nebo přes GitHub: vytvořte PR `main → staging` a merge.

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
3. **Sdílená databáze** — změny dat na stagingu se projeví i na produkci
4. **Revize kódu** — každý PR by měl být schválen

---

## FAQ

### Proč sdílená databáze?

- Jednodušší správa — žádné kopírování dat mezi prostředími
- Staging testuje **kód**, ne data
- Vždy vidíte reálná data při testování

### Jak poznám, že jsem na stagingu?

Žlutý banner nahoře na stránce "STAGING ENVIRONMENT". Nastaveno přes proměnnou `NEXT_PUBLIC_ENVIRONMENT`.

### Co když staging rozbije data?

Protože sdílíte databázi, buďte opatrní s destruktivními operacemi. Testujte hlavně UI a logiku, ne operace mazání/úpravy dat. Pro nebezpečné testy dat zvažte vytvoření separátního Convex deploymentu.

### Mohu mít víc staging prostředí?

Ano! Netlify podporuje branch deploys pro libovolný branch:
- `staging` → https://staging--apsahu.netlify.app
- `staging-v2` → https://staging-v2--apsahu.netlify.app
