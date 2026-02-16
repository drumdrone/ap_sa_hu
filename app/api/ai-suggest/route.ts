import { NextRequest, NextResponse } from "next/server";

interface ProductData {
  name: string;
  description?: string;
  price?: number;
  category?: string;
  brandPillar?: string;
  productUrl?: string;
}

interface ScrapedContent {
  title: string;
  description: string;
  ingredients: string[];
  benefits: string[];
  usage: string;
  rawText: string;
}

// Scrape product page content
async function scrapeProductPage(url: string): Promise<ScrapedContent | null> {
  try {
    console.log("Scraping URL:", url);
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ApothekeBot/1.0)",
        "Accept": "text/html",
      },
    });
    
    if (!response.ok) {
      console.error("Failed to fetch URL:", response.status);
      return null;
    }
    
    const html = await response.text();
    
    // Extract key information from HTML
    const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const title = titleMatch ? titleMatch[1].trim() : "";
    
    // Extract meta description
    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const metaDesc = metaDescMatch ? metaDescMatch[1].trim() : "";
    
    // Extract product description from common patterns
    const descPatterns = [
      /<div[^>]*class="[^"]*product-description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<p[^>]*class="[^"]*perex[^"]*"[^>]*>([\s\S]*?)<\/p>/i,
    ];
    
    let description = metaDesc;
    for (const pattern of descPatterns) {
      const match = html.match(pattern);
      if (match) {
        description = match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        break;
      }
    }
    
    // Extract ingredients (common patterns)
    const ingredientPatterns = [
      /složen[ií][\s:]+([^<]+)/gi,
      /ingredience[\s:]+([^<]+)/gi,
      /<li[^>]*>([^<]*(?:heřmánek|levandule|máta|meduňka|lípa|šípek|zázvor|kurkuma|kopřiva|fenykl|anýz|skořice|hřebíček|kardamom|rooibos|zelený čaj|černý čaj|bílý čaj|oolong|pu-erh|yerba|guarana|ginkgo|echinacea|rakytník|borůvka|brusinka|malina|jahoda)[^<]*)<\/li>/gi,
    ];
    
    const ingredients: string[] = [];
    for (const pattern of ingredientPatterns) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(html)) !== null) {
        const text = match[1].replace(/<[^>]+>/g, "").trim();
        if (text && text.length < 200) {
          ingredients.push(text);
        }
      }
    }
    
    // Extract benefits/effects
    const benefitPatterns = [
      /účinky[\s:]+([^<]+)/gi,
      /přínosy[\s:]+([^<]+)/gi,
      /pomáhá[\s:]+([^<]+)/gi,
      /podporuje[\s:]+([^<]+)/gi,
    ];
    
    const benefits: string[] = [];
    for (const pattern of benefitPatterns) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(html)) !== null) {
        const text = match[1].replace(/<[^>]+>/g, "").trim();
        if (text && text.length < 200) {
          benefits.push(text);
        }
      }
    }
    
    // Extract usage instructions
    const usagePatterns = [
      /příprava[\s:]+([^<]+)/gi,
      /použití[\s:]+([^<]+)/gi,
      /dávkování[\s:]+([^<]+)/gi,
    ];
    
    let usage = "";
    for (const pattern of usagePatterns) {
      const match = html.match(pattern);
      if (match) {
        usage = match[1].replace(/<[^>]+>/g, "").trim();
        break;
      }
    }
    
    // Get raw text content (cleaned)
    const rawText = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 3000);
    
    return {
      title,
      description,
      ingredients,
      benefits,
      usage,
      rawText,
    };
  } catch (error) {
    console.error("Scrape error:", error);
    return null;
  }
}

// Generate claims based on scraped content
function generateClaimsFromContent(scraped: ScrapedContent, product: ProductData): string[] {
  const claims: string[] = [];
  const name = product.name || scraped.title;
  
  // Analyze content for keywords
  const text = (scraped.rawText + " " + scraped.description).toLowerCase();
  
  // Relaxation/calm keywords
  if (text.includes("uklidn") || text.includes("relaxa") || text.includes("spánek") || text.includes("stres")) {
    claims.push("Váš okamžik klidu v hektickém dni");
    claims.push("Přirozená cesta k vnitřní harmonii");
    claims.push("Nechte starosti za dveřmi");
  }
  
  // Energy/vitality keywords
  if (text.includes("energie") || text.includes("vitalit") || text.includes("povzbuz") || text.includes("síla")) {
    claims.push("Přírodní energie bez kofeinu");
    claims.push("Nastartujte den plný energie");
    claims.push("Vaše přírodní nabíječka");
  }
  
  // Immunity/health keywords
  if (text.includes("imunit") || text.includes("zdrav") || text.includes("vitamin") || text.includes("antioxid")) {
    claims.push("Posílte svou přirozenou obranyschopnost");
    claims.push("Zdraví ukryté v každém doušku");
    claims.push("Příroda jako váš lékař");
  }
  
  // Digestion keywords
  if (text.includes("trávení") || text.includes("zažív") || text.includes("žaludek") || text.includes("střev")) {
    claims.push("Harmonie pro vaše zažívání");
    claims.push("Lehkost po každém jídle");
    claims.push("Přírodní pomocník vašeho trávení");
  }
  
  // Kids/family keywords
  if (text.includes("děti") || text.includes("dětsk") || text.includes("rodina") || text.includes("malých")) {
    claims.push("Bezpečná volba pro celou rodinu");
    claims.push("Zdravé návyky od malička");
    claims.push("Čaj, který si zamilují i nejmenší");
  }
  
  // BIO/organic keywords
  if (text.includes("bio") || text.includes("organic") || text.includes("ekolog") || text.includes("přírodn")) {
    claims.push("100% přírodní bez kompromisů");
    claims.push("Čistota přírody v každém šálku");
    claims.push("BIO kvalita, kterou cítíte");
  }
  
  // Detox keywords
  if (text.includes("detox") || text.includes("očist") || text.includes("pročist")) {
    claims.push("Restart pro vaše tělo");
    claims.push("Přirozená očista zevnitř");
    claims.push("Dejte tělu nový začátek");
  }
  
  // Generic good claims based on tea type
  if (claims.length < 3) {
    claims.push("Tradice kvality od roku 1990");
    claims.push("Prémiová chuť, přírodní původ");
    claims.push(`${name.split(" ")[0]} - váš denní rituál pohody`);
    claims.push("Česká kvalita v každém sáčku");
  }
  
  // Deduplicate and shuffle
  const unique = Array.from(new Set(claims));
  return unique.sort(() => Math.random() - 0.5).slice(0, 4);
}

// Generate Quick Reference Card from scraped content
function generateCardFromContent(scraped: ScrapedContent, product: ProductData): string[] {
  const name = (product.name || scraped.title).substring(0, 35);
  const price = product.price ? `${product.price} Kč` : "—";
  const category = product.category || "—";
  const brandPillar = product.brandPillar || "—";
  
  // Extract key points from description
  const desc = scraped.description || product.description || "";
  const keyPoints = desc.split(/[.,]/).filter(s => s.trim().length > 10 && s.trim().length < 50).slice(0, 3);
  
  // Build benefits list
  const benefitsList = scraped.benefits.length > 0 
    ? scraped.benefits.slice(0, 3).map(b => `✓ ${b.substring(0, 30)}`)
    : ["✓ Přírodní složení", "✓ Prémiová kvalita", "✓ Česká výroba"];
  
  // Build ingredients info
  const ingredientsInfo = scraped.ingredients.length > 0
    ? scraped.ingredients.slice(0, 5).join(", ").substring(0, 60)
    : "Prémiové bylinky";

  const templates = [
    `┌─────────────────────────────────────┐
│  ${name.padEnd(35)} │
├─────────────────────────────────────┤
│  💰 Cena: ${price.padEnd(25)} │
│  📦 Kategorie: ${category.padEnd(20)} │
│  🏷️  Brand: ${brandPillar.padEnd(22)} │
├─────────────────────────────────────┤
│  🌿 SLOŽENÍ:                        │
│  ${ingredientsInfo.padEnd(35)} │
├─────────────────────────────────────┤
│  ⭐ KLÍČOVÉ BENEFITY:               │
│  ${(benefitsList[0] || "").padEnd(35)} │
│  ${(benefitsList[1] || "").padEnd(35)} │
│  ${(benefitsList[2] || "").padEnd(35)} │
├─────────────────────────────────────┤
│  💡 TIP PRO PRODEJCE:               │
│  Zdůrazněte přírodní původ a       │
│  možnost dárkového balení.          │
└─────────────────────────────────────┘`,

    `╔═══════════════════════════════════════╗
║  🍵 ${name.padEnd(33)} ║
╠═══════════════════════════════════════╣
║  QUICK FACTS                          ║
║  ─────────────────────────────────    ║
║  Cena: ${price.padEnd(30)} ║
║  Kategorie: ${category.padEnd(25)} ║
║  Brand Pillar: ${brandPillar.padEnd(21)} ║
╠═══════════════════════════════════════╣
║  🌿 SLOŽENÍ                           ║
║  ${ingredientsInfo.substring(0, 37).padEnd(37)} ║
╠═══════════════════════════════════════╣
║  📋 POPIS                             ║
║  ${(keyPoints[0] || desc.substring(0, 37)).padEnd(37)} ║
╠═══════════════════════════════════════╣
║  🎯 PRODEJNÍ ARGUMENTY                ║
║  ${(benefitsList[0] || "→ Přírodní složení").padEnd(37)} ║
║  ${(benefitsList[1] || "→ Česká kvalita").padEnd(37)} ║
║  ${(benefitsList[2] || "→ Tradiční výroba").padEnd(37)} ║
╚═══════════════════════════════════════╝`,

    `▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
▓  ${name.padEnd(33)} ▓
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

📊 ZÁKLADNÍ INFO
   Cena: ${price}
   Kategorie: ${category}
   Brand Pillar: ${brandPillar}

🌿 SLOŽENÍ
   ${ingredientsInfo}

📝 POPIS
   ${desc.substring(0, 100)}${desc.length > 100 ? "..." : ""}

⭐ KLÍČOVÉ BENEFITY
   ${benefitsList[0] || "✓ Přírodní"}
   ${benefitsList[1] || "✓ Kvalitní"}
   ${benefitsList[2] || "✓ Tradiční"}

🎯 CÍLOVÁ SKUPINA
   • Zdravý životní styl
   • Milovníci čajů
   • Dárkové příležitosti

💡 PRODEJNÍ TIPY
   1. Zdůraznit přírodní složení
   2. Nabídnout k ochutnání
   3. Doporučit dárkové balení

${scraped.usage ? `☕ PŘÍPRAVA\n   ${scraped.usage.substring(0, 60)}` : ""}
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓`,
  ];

  return templates;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, product } = body as { type: string; product: ProductData };

    console.log("AI Suggest request:", { type, productName: product?.name, productUrl: product?.productUrl });

    // Try to scrape product page if URL is available
    let scraped: ScrapedContent | null = null;
    if (product?.productUrl) {
      scraped = await scrapeProductPage(product.productUrl);
      console.log("Scraped content:", scraped ? "success" : "failed");
    }

    if (type === "salesClaim") {
      if (scraped) {
        // Generate claims based on scraped content
        const suggestions = generateClaimsFromContent(scraped, product);
        return NextResponse.json({ suggestions, source: "scraped" });
      }
      
      // Fallback to generic claims
      const fallbackClaims = [
        "Přírodní síla v každém šálku",
        "Vaše chvíle klidu a pohody",
        "Tradice spojená s kvalitou",
        "Čistá příroda pro váš den",
      ];
      return NextResponse.json({ suggestions: fallbackClaims, source: "fallback" });
    }

    if (type === "quickReferenceCard") {
      if (scraped) {
        // Generate cards based on scraped content
        const suggestions = generateCardFromContent(scraped, product);
        return NextResponse.json({ suggestions, source: "scraped" });
      }
      
      // Fallback to basic template
      const name = (product?.name || "Produkt").substring(0, 35);
      const fallbackCard = `┌─────────────────────────────────────┐
│  ${name.padEnd(35)} │
├─────────────────────────────────────┤
│  💰 Cena: ${String(product?.price || "—").padEnd(25)} │
│  📦 Kategorie: ${(product?.category || "—").padEnd(20)} │
├─────────────────────────────────────┤
│  KLÍČOVÉ BODY:                      │
│  ✓ Přírodní složení                 │
│  ✓ Prémiová kvalita                 │
│  ✓ Česká tradice                    │
└─────────────────────────────────────┘`;
      
      return NextResponse.json({ suggestions: [fallbackCard], source: "fallback" });
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch (error) {
    console.error("AI Suggest error:", error);
    return NextResponse.json({ error: "Failed to generate suggestions" }, { status: 500 });
  }
}
