# Apotheke Sales Hub

Interní marketingová aplikace pro prodejce BIO čajů značky Apotheke. Slouží jako "Product Hub" s přehledem produktů a marketingovými materiály ke každému.

## Funkce

### Dashboard (hlavní stránka)
- **Novinky s 3 tabulátory** - panel podobný SEO Tools s přehledem novinek:
  - **Novinky produkty** - změny a aktualizace produktů (upgrade obrázků, nové fotky apod.) s možností párování SKU
  - **Novinka firma** - firemní novinky a oznámení
  - **Novinky materiály** - nové marketingové materiály
  - Jednoduchá správa (přidávání/mazání) přímo z dashboardu
  - Zobrazení podle data od nejnovějších
- **Top 20 produktů** - prioritní produkty zobrazené na prominentním místě s pořadím (při nastavení čísla se ostatní automaticky posunou)
- **Obchodní příležitosti** - kalendářní příležitosti (Valentýn, Vánoce, Den matek, apod.) s proklikem na detail
- **Dostupné materiály** - sekce POSM materiálů s přidáním do Sales Kitu
- **Sales Kit** - plovoucí panel s vybranými položkami, export do TXT/PDF nebo odeslání emailem
- **News Feed** - přehled posledních aktivit (nové claimy, sociální posty, aktualizace)
- **Vyhledávání produktů** - rychlé vyhledání podle názvu
- **Přehled plnění** - progress bary pro produkty s claimem a sociálními sítěmi, Tier rozložení
- **Produkty vyžadující pozornost** - seznam produktů s chybějícími daty
- **Poslední nahrané obrázky** - náhled nedávno přidaných obrázků ke produktům

### Katalog produktů (/katalog)
- Grid/List zobrazení produktů jako e-shop
- Vyhledávání produktů podle názvu
- Filtry: Kategorie z feedu, Podkategorie, Značka (Brand)
- Produktové karty s fotkou, názvem, kategorií, cenou a tier badge
- **Sync Feed** tlačítko pro synchronizaci produktů z XML feedu

### Detail produktu (/product/[id])
Marketing dashboard pro jednotlivý produkt:

#### Dashboard záložka
- **Hero sekce** - velký obrázek produktu, název, cena, badges (kategorie, tier, brand pillar)
- **Dostupnost** - stav skladu (Skladem/Vyprodáno)
- **Odkaz na e-shop** - přímý link na produkt na apotheke.cz

#### Dostupné materiály
Seznam všech připravených materiálů k použití:
- Prodejní claim s tlačítkem pro kopírování
- Quick Reference Card - strukturovaná karta s klíčovými info
- Facebook/Instagram posty připravené k publikování
- Obrázky v galerii
- PDF produktový list
- Prodejní argumenty (Why Buy)

#### Rychlé akce
- **Upravit data** - inline editace marketingových dat
- **Facebook a Instagram images** - nahrání obrázků pro sociální sítě z URL
- **Historie propagace** - přehled předchozích kampaní

#### Pro prodejce
- **To-do list** - marketingové úkoly k vyplnění
- **Product Sales Kit** - možnost přidávat materiály a exportovat

#### Další sekce (záložky v menu)
- **Data z e-shopu** - automaticky synchronizovaná data (název, popis, cena, obrázek, dostupnost)
- **Marketing** - prodejní claim, subtitle, proč koupit, cílová skupina, FAQ
- **Sociální sítě** - příklady postů pro Facebook a Instagram s copy-paste tlačítky, hashtagy
- **Galerie** - obrázky a materiály specifické pro daný produkt s možností uploadu a tagování
- **Materiály** - PDF produktový list, bannery v různých rozměrech, reference card
- **Editovat** - kompletní formulář pro úpravu všech marketingových dat

#### Rozšířené marketingové údaje
- **Quick Reference Card** - strukturovaná ASCII karta s klíčovými informacemi
- **FAQ** - často kladené otázky a odpovědi
- **Prodejní prognóza** - ASCII graf prodejního potenciálu
- **Senzorický profil** - ASCII zobrazení chuťového profilu
- **Sezónní příležitosti** - tabulka vhodných období pro prodej
- **Hlavní benefity** - 3 klíčové výhody produktu
- **Složení bylin** - grafické zobrazení složení
- **Srovnání s konkurencí** - ASCII srovnávací tabulka Apotheke vs. konkurence
- **Související články** - odkazy na blogy a články

### Galerie produktu
Každý produkt má vlastní galerii obrázků:
- Upload obrázků do Convex storage
- Tagování obrázků při uploadu
- Filtrování podle tagů
- Mazání obrázků
- Grid zobrazení s náhledem
- Inline upload z detailu produktu

### POSM Materiály (/posm)
Katalog prodejních materiálů s možností objednávání:
- **Katalog** - přehled všech dostupných POSM materiálů (letáky, stojany, plakáty, woblery, display, cenovky)
- **Správa** - přidávání, editace a mazání materiálů
- **Drag & Drop upload** - přetažení PDF/obrázků při přidávání materiálu
- **Objednávky** - formulář pro objednání materiálů s kontaktními údaji
- **Stavy objednávek** - nová, zpracovává se, odesláno, doručeno, zrušeno
- **Statistiky** - přehled aktivních materiálů a objednávek

### Obchodní příležitosti (/prilezitost/[slug])
Detail sezónní/kalendářní příležitosti:
- **Hero sekce** - název příležitosti, datum, popis
- **Tip pro prodejce** - rychlá rada jak využít příležitost
- **Přiřazené produkty** - seznam produktů vhodných pro danou akci
- **Pokyny k akci** - podrobné instrukce
- **Online bannery** - odkazy na digitální materiály
- **Tiskové letáky** - odkazy na tiskové materiály
- **Event Sales Kit** - export materiálů do TXT/PDF nebo email

#### Dostupné materiály
- Tlačítko "Celý balíček" - přidá všechny materiály do Event Kit najednou
- Jednotlivé materiály s tlačítky pro kopírování a přidání do kitu
- Rozbalený seznam všech dostupných položek (bez scroll limitu)

### Sales Kit / Event Kit
Funkce pro sběr a export materiálů:
- **Přidávání položek** - tlačítko "+" u každého materiálu
- **Export do TXT** - textový soubor s formátováním
- **Export do PDF** - tisknutelný dokument s layoutem
- **Odeslání emailem** - přímé odeslání na zadaný email
- **Plovoucí panel** - viditelný přehled vybraných položek

## Upozornění (Alerts)
Systém automatických upozornění v detailu produktu:
- **Nový obsah** (zelené) - např. nově přidaný claim nebo sociální post k použití
- **Urgentní** (červené) - chybějící povinná data (claim, sociální posty)
- **Tipy** (žluté) - doporučení ke zlepšení (nastavení tieru, brand pillar)

## Synchronizace XML feedu

Aplikace podporuje import produktů z Google Shopping XML feedu:
- Feed URL: `https://www.apotheke.cz/xml-feed/google.xml`
- Tlačítko "Sync Feed" v headeru spustí synchronizaci **všech produktů** (864+)
- Při synchronizaci se aktualizují pouze data z feedu (název, popis, cena, obrázek)
- Marketingová data (prodejní claim, tier, brand pillar, sociální sítě) zůstávají zachována

### Automatické mapování kategorií
Při prvním importu produktu se automaticky nastaví kategorie podle `productType` z feedu:
- **BIO** - produkty obsahující "bio" v názvu kategorie
- **Dětský** - produkty z kategorie "Pro děti"
- **Funkční** - vitamíny, doplňky stravy, fitness produkty
- **Bylinný** - čaje, bylinky, sypané směsi

### Dvě vrstvy dat
1. **Data z feedu** (automaticky aktualizovaná):
   - externalId, name, description, image, price
   - productUrl, availability, brand, gtin, productType

2. **Marketingová data** (ručně přidaná/editovatelná):
   - category, salesClaim, salesClaimSubtitle
   - whyBuy, targetAudience
   - pdfUrl, bannerUrls
   - socialFacebook, socialInstagram, hashtags
   - socialFacebookImage, socialInstagramImage (obrázky pro sociální sítě z URL)
   - brandPillar, tier
   - quickReferenceCard, faq, faqText
   - salesForecast, sensoryProfile, seasonalOpportunities
   - mainBenefits, herbComposition, competitionComparison, articleUrls
   - marketingLastUpdated, lastUpdatedField (pro sledování změn)

## Databáze (Convex)

### Tabulky
- `products` - všechna data o produktech
- `gallery` - obrázky propojené s produkty přes `productId`
- `posmItems` - katalog POSM materiálů
- `posmOrders` - objednávky POSM materiálů
- `opportunities` - obchodní příležitosti (sezónní akce)
- `promotionLogs` - historie propagace produktů
- `news` - novinky/log záznamy (produkty, firma, materiály) s možností SKU párování
- `marketingBackup` - záloha marketingových dat podle SKU (automaticky při mazání produktů)
- `galleryBackup` - záloha obrázků z galerie podle SKU

### Indexy
- `products.by_externalId` - rychlé párování při synchronizaci
- `products.by_isTop` - Top 10 produkty
- `products.search_name` - fulltext vyhledávání podle názvu
- `gallery.by_product` - obrázky podle produktu
- `gallery.by_uploadedAt` - nejnovější obrázky pro news feed
- `opportunities.by_slug` - rychlé vyhledání příležitosti
- `promotionLogs.by_product` - historie propagace produktu
- `news.by_type` - filtrování novinek podle typu
- `news.by_createdAt` - řazení podle data

## Design

- Primární zelená: #2D5A27
- Sekundární: #8BC34A
- Pozadí: #F5F5F0
- Font: Inter
- Zaoblené rohy, jemné stíny
- Responzivní design

## Kategorie barev
- Bylinný = zelená
- Funkční = modrá
- Dětský = růžová
- BIO = žlutá

## Brand Pillars
- Věda (🔬)
- BIO (🌿)
- Funkce (⚡)
- Tradice (🏛️)
- Rodina (👨‍👩‍👧‍👦)

## Tier systém
- **A** - nejvyšší priorita, klíčové produkty
- **B** - střední priorita
- **C** - nízká priorita

## API Endpoints

- `POST /api/sync-feed` - Spustí synchronizaci XML feedu
  - Body: `{ "limit": 100 }` (volitelné, bez limitu načte všechny produkty)
  - Response: `{ "success": true, "created": X, "updated": Y }`

- `POST /api/ai-suggest` - AI návrhy pro marketingová data
  - Body: `{ "prompt": "...", "productName": "..." }`
  - Response: AI generovaný obsah

## Technologie

- **Frontend:** Next.js 16, React, TypeScript
- **Styling:** Tailwind CSS, shadcn/ui komponenty
- **Backend:** Convex (databáze, real-time sync, file storage)
- **Autentizace:** Convex Auth s OTP (Resend)
- **Emailing:** Resend pro odesílání Sales Kitů

## Instalace a spuštění

### 1. Klonování repozitáře
```bash
git clone https://github.com/YOUR_USERNAME/apotheke-sales-hub.git
cd apotheke-sales-hub
npm install
```

### 2. Nastavení Convex
```bash
npx convex dev
```
Při prvním spuštění se vytvoří nový Convex projekt.

### 3. Environment variables
Vytvořte `.env.local` s těmito proměnnými:
```
CONVEX_DEPLOYMENT=your-deployment-name
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

### 4. Import databáze (volitelné)
Data z databáze jsou exportována v `convex/seed/`. Import:
```bash
npx convex import --table products convex/seed/products/documents.jsonl
npx convex import --table feedTaxonomy convex/seed/feedTaxonomy/documents.jsonl
npx convex import --table opportunities convex/seed/opportunities/documents.jsonl
npx convex import --table news convex/seed/news/documents.jsonl
npx convex import --table posmItems convex/seed/posmItems/documents.jsonl
npx convex import --table marketingBackup convex/seed/marketingBackup/documents.jsonl
```

### 5. Spuštění
```bash
npm run dev
```
Aplikace běží na `http://localhost:3000`

## Struktura exportovaných dat

```
convex/seed/
├── products/          # 992 produktů s marketingovými daty
├── feedTaxonomy/      # 7 kategorií z feedu
├── opportunities/     # 6 obchodních příležitostí
├── news/             # 4 novinky
├── posmItems/        # POSM materiály
├── marketingBackup/  # 27 záloh marketingových dat
├── gallery/          # 5 obrázků (vyžaduje Convex storage)
└── import.ts         # Dokumentace k importu
```

**Poznámka:** Auth tabulky (users, sessions) nejsou zahrnuty z bezpečnostních důvodů. Gallery obrázky vyžadují manuální nahrání do Convex storage.

## Nedávné změny

### Zálohovací systém pro marketingová data (únor 2026)
Při smazání produktů (např. při čištění oproti feedu) se automaticky zálohují:
- **Marketingová data** - salesClaim, tier, brandPillar, sociální sítě, FAQ, a další
- **Obrázky z galerie** - storage soubory zůstávají v Convex, pouze se přesunou do zálohy

Když se produkt při dalším importu feedu znovu objeví (podle SKU), data se **automaticky obnoví**.

Nové tabulky v databázi:
- `marketingBackup` - záloha marketingových dat podle SKU
- `galleryBackup` - záloha obrázků podle SKU

Admin stránka `/admin/feed` zobrazuje statistiky záloh.

### Novinky panel s 3 tabulátory (leden 2026)
- Nový panel "Novinky" na hlavní stránce ve stylu SEO Tools
- 3 kategorie: Novinky produkty, Novinka firma, Novinky materiály
- Jednoduchá správa - přidávání a mazání záznamů
- Možnost párování SKU k produktům v databázi (např. při upgrade obrázků)
- Zobrazení podle data od nejnovějších
- Odstraněny statistické karty z dashboardu

### Facebook a Instagram obrázky
- Možnost nahrát obrázky pro sociální sítě přímo z URL
- Nová pole `socialFacebookImage` a `socialInstagramImage` v produktech
- Rychlá akce "Facebook a Instagram images" v detailu produktu

### Event Kit vylepšení
- Tlačítko "Celý balíček" pro přidání všech materiálů najednou
- Rozbalený seznam dostupných materiálů (bez scroll limitu)
- Lepší organizace materiálů v příležitostech
