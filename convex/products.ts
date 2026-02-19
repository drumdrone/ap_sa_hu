import { v } from "convex/values"
import { query, mutation } from "./_generated/server"

export const list = query({
  args: {
    feedCategory: v.optional(v.string()),
    feedSubcategory: v.optional(v.string()),
    brand: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let products;
    
    if (args.search && args.search.trim() !== "") {
      // Use search index for text search
      products = await ctx.db
        .query("products")
        .withSearchIndex("search_name", (q) => q.search("name", args.search!))
        .collect();
    } else {
      products = await ctx.db.query("products").collect();
    }
    
    // Apply filters
    if (args.feedCategory) {
      products = products.filter((p) => p.feedCategory === args.feedCategory);
    }
    if (args.feedSubcategory) {
      products = products.filter((p) => p.feedSubcategory === args.feedSubcategory);
    }
    if (args.brand) {
      products = products.filter((p) => p.brand === args.brand);
    }
    
    return products;
  },
});

// Get unique brands from feed data
export const getFeedBrands = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    const brands = Array.from(new Set(products.map((p) => p.brand).filter(Boolean) as string[]));
    return brands.sort();
  },
});

// Get unique categories from feed for filter options
// NOTE: This reads from the small `feedTaxonomy` table (kept up-to-date during feed sync)
// Returns array format instead of object keys (Convex doesn't allow non-ASCII chars in field names)
export const getFeedCategories = query({
  args: {},
  handler: async (ctx) => {
    try {
      const rows = await ctx.db.query("feedTaxonomy").collect();

      const categories = rows
        .map((r) => r.category)
        .filter(Boolean)
        .sort();

      // Return as array of {category, subcategories} to avoid non-ASCII field name issues
      const subcategoryData = rows.map((row) => ({
        category: row.category,
        subcategories: (row.subcategories || []).filter(Boolean).sort(),
      }));

      return { categories, subcategoryData };
    } catch (error) {
      console.error("getFeedCategories failed:", error);
      return { categories: [], subcategoryData: [] };
    }
  },
});

export const getById = query({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getAdjacentProducts = query({
  args: { currentId: v.id("products") },
  handler: async (ctx, args) => {
    const allProducts = await ctx.db.query("products").collect();
    const currentIndex = allProducts.findIndex((p) => p._id === args.currentId);
    
    const prevProduct = currentIndex > 0 ? allProducts[currentIndex - 1] : null;
    const nextProduct = currentIndex < allProducts.length - 1 ? allProducts[currentIndex + 1] : null;
    
    return { prevProduct, nextProduct };
  },
});

// Update marketing data for a product
export const updateMarketingData = mutation({
  args: {
    id: v.id("products"),
    category: v.optional(v.union(
      v.literal("Bylinný"),
      v.literal("Funkční"),
      v.literal("Dětský"),
      v.literal("BIO"),
      v.null()
    )),
    salesClaim: v.optional(v.string()),
    salesClaimSubtitle: v.optional(v.string()),
    targetAudience: v.optional(v.string()),
    brandPillar: v.optional(v.union(
      v.literal("Věda"),
      v.literal("BIO"),
      v.literal("Funkce"),
      v.literal("Tradice"),
      v.literal("Rodina"),
      v.null()
    )),
    tier: v.optional(v.union(v.literal("A"), v.literal("B"), v.literal("C"), v.null())),
    socialFacebook: v.optional(v.string()),
    socialInstagram: v.optional(v.string()),
    socialFacebookImage: v.optional(v.string()),
    socialInstagramImage: v.optional(v.string()),
    hashtags: v.optional(v.array(v.string())),
    quickReferenceCard: v.optional(v.string()),
    faq: v.optional(v.array(v.object({
      question: v.string(),
      answer: v.string(),
    }))),
    faqText: v.optional(v.string()),
    salesForecast: v.optional(v.string()),
    sensoryProfile: v.optional(v.string()),
    seasonalOpportunities: v.optional(v.string()),
    mainBenefits: v.optional(v.string()),
    herbComposition: v.optional(v.string()),
    competitionComparison: v.optional(v.string()),
    articleUrls: v.optional(v.array(v.object({
      title: v.string(),
      url: v.string(),
    }))),
    pdfUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    // Filter out undefined values and convert null to undefined for removal
    const cleanUpdates: Record<string, unknown> = {};
    let lastField = "";
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value === null ? undefined : value;
        if (value !== null) {
          lastField = key;
        }
      }
    }
    
    // Track when marketing data was updated
    cleanUpdates.marketingLastUpdated = Date.now();
    if (lastField) {
      cleanUpdates.lastUpdatedField = lastField;
    }
    
    await ctx.db.patch(id, cleanUpdates);
    console.log(`Updated marketing data for product ${id}, field: ${lastField}`);
    return { success: true };
  },
});

// Dismiss an alert for a product
export const dismissAlert = mutation({
  args: {
    id: v.id("products"),
    alertId: v.string(),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) {
      throw new Error("Product not found");
    }
    
    const currentDismissed = product.dismissedAlerts || [];
    if (!currentDismissed.includes(args.alertId)) {
      await ctx.db.patch(args.id, {
        dismissedAlerts: [...currentDismissed, args.alertId],
      });
    }
    console.log(`Dismissed alert ${args.alertId} for product ${args.id}`);
    return { success: true };
  },
});

// Get recently updated products for news feed
export const getRecentActivity = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    
    // Get all products with marketing updates
    const allProducts = await ctx.db.query("products").collect();
    
    // Filter and sort by marketingLastUpdated
    const recentlyUpdated = allProducts
      .filter((p) => p.marketingLastUpdated)
      .sort((a, b) => (b.marketingLastUpdated ?? 0) - (a.marketingLastUpdated ?? 0))
      .slice(0, limit);
    
    // Map to activity items
    const activities = recentlyUpdated.map((product) => {
      const fieldLabels: Record<string, string> = {
        salesClaim: "prodejní claim",
        salesClaimSubtitle: "podtitulek claimu",
        socialFacebook: "Facebook post",
        socialInstagram: "Instagram post",
        hashtags: "hashtagy",
        tier: "tier prioritu",
        brandPillar: "brand pillar",
        category: "kategorii",
        targetAudience: "cílovou skupinu",
        sensoryProfile: "senzorický profil",
        seasonalOpportunities: "sezónní příležitosti",
        salesForecast: "křivku prodejů",
        faqText: "FAQ",
        mainBenefits: "hlavní benefity",
        herbComposition: "zastoupení bylinek",
      };
      
      const fieldLabel = product.lastUpdatedField 
        ? fieldLabels[product.lastUpdatedField] ?? product.lastUpdatedField
        : "data";
      
      return {
        _id: product._id,
        type: "marketing_update" as const,
        productId: product._id,
        productName: product.name,
        productImage: product.image,
        field: product.lastUpdatedField,
        fieldLabel,
        timestamp: product.marketingLastUpdated!,
        value: product.lastUpdatedField === "salesClaim" ? product.salesClaim : undefined,
      };
    });
    
    return activities;
  },
});

// Get products with missing marketing data (for todo-style alerts)
export const getProductsNeedingAttention = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    
    const needsAttention = products.filter((p) => {
      const missing: string[] = [];
      if (!p.salesClaim) missing.push("claim");
      if (!p.socialFacebook) missing.push("facebook");
      if (!p.socialInstagram) missing.push("instagram");
      if (!p.tier) missing.push("tier");
      return missing.length > 0;
    });
    
    return needsAttention.map((p) => {
      const missing: string[] = [];
      if (!p.salesClaim) missing.push("prodejní claim");
      if (!p.socialFacebook) missing.push("Facebook post");
      if (!p.socialInstagram) missing.push("Instagram post");
      if (!p.tier) missing.push("tier priorita");
      
      return {
        _id: p._id,
        name: p.name,
        image: p.image,
        missing,
      };
    });
  },
});

// Get top 20 products for dashboard
export const getTopProducts = query({
  args: {},
  handler: async (ctx) => {
    const topProducts = await ctx.db
      .query("products")
      .withIndex("by_isTop", (q) => q.eq("isTop", true))
      .collect();
    
    // Sort by topOrder (1 first), then by topAddedAt for products without order
    return topProducts
      .sort((a, b) => {
        const orderA = a.topOrder ?? 99;
        const orderB = b.topOrder ?? 99;
        if (orderA !== orderB) return orderA - orderB;
        return (b.topAddedAt ?? 0) - (a.topAddedAt ?? 0);
      })
      .slice(0, 20);
  },
});

// Set top order for a product (1-20) with shift logic
// When setting position X, products at X and higher shift down
// Products pushed beyond 20 are removed from top list
export const setTopOrder = mutation({
  args: {
    id: v.id("products"),
    order: v.union(v.number(), v.null()),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) {
      throw new Error("Product not found");
    }
    
    if (args.order === null) {
      // Remove from Top 20
      await ctx.db.patch(args.id, {
        isTop: false,
        topAddedAt: undefined,
        topOrder: undefined,
      });
      console.log(`Product ${args.id} removed from Top 20`);
      return { success: true, isTop: false, order: null };
    }
    
    // Validate order is between 1 and 20
    const targetOrder = args.order;
    if (targetOrder < 1 || targetOrder > 20) {
      throw new Error("Pořadí musí být mezi 1 a 20");
    }
    
    // Get all top products
    const topProducts = await ctx.db
      .query("products")
      .withIndex("by_isTop", (q) => q.eq("isTop", true))
      .collect();
    
    // Get current order of this product (if any)
    const currentOrder = product.topOrder;
    
    // Filter out the product we're setting
    const otherTopProducts = topProducts.filter((p) => p._id !== args.id);
    
    // Find products that need to shift (at or after the target position)
    // If we're moving from higher to lower position, only shift products between new and old
    const productsToShift = otherTopProducts
      .filter((p) => {
        if (!p.topOrder) return false;
        // Only shift products at or after target position
        if (currentOrder && currentOrder < targetOrder) {
          // Moving down: shift products between old+1 and new position up
          return p.topOrder > currentOrder && p.topOrder <= targetOrder;
        } else {
          // Moving up or new: shift products at or after target position down
          return p.topOrder >= targetOrder;
        }
      })
      .sort((a, b) => (b.topOrder ?? 0) - (a.topOrder ?? 0)); // Sort descending to update from bottom
    
    // Shift products
    for (const p of productsToShift) {
      if (!p.topOrder) continue;
      
      let newOrder: number;
      if (currentOrder && currentOrder < targetOrder) {
        // Moving down: shift these products up by 1
        newOrder = p.topOrder - 1;
      } else {
        // Moving up or new: shift these products down by 1
        newOrder = p.topOrder + 1;
      }
      
      if (newOrder > 20) {
        // Remove from top list (pushed beyond 20)
        await ctx.db.patch(p._id, {
          isTop: false,
          topAddedAt: undefined,
          topOrder: undefined,
        });
        console.log(`Product ${p._id} removed from Top 20 (pushed beyond position 20)`);
      } else {
        await ctx.db.patch(p._id, { topOrder: newOrder });
        console.log(`Product ${p._id} shifted to position ${newOrder}`);
      }
    }
    
    // Set the target product to the requested position
    await ctx.db.patch(args.id, {
      isTop: true,
      topAddedAt: product.topAddedAt ?? Date.now(),
      topOrder: targetOrder,
    });
    
    console.log(`Product ${args.id} set to Top ${targetOrder}`);
    return { success: true, isTop: true, order: targetOrder };
  },
});

// Toggle top status for a product (legacy, now use setTopOrder)
export const toggleTopProduct = mutation({
  args: {
    id: v.id("products"),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) {
      throw new Error("Product not found");
    }
    
    const isCurrentlyTop = product.isTop ?? false;
    
    if (!isCurrentlyTop) {
      // Check if we already have 20 top products
      const topProducts = await ctx.db
        .query("products")
        .withIndex("by_isTop", (q) => q.eq("isTop", true))
        .collect();
      
      if (topProducts.length >= 20) {
        throw new Error("Již máte 20 produktů v Top 20. Nejdříve odeberte některý produkt.");
      }
      
      // Find next available order
      const usedOrders = new Set(topProducts.map(p => p.topOrder).filter(Boolean));
      let nextOrder = 1;
      while (usedOrders.has(nextOrder) && nextOrder <= 20) nextOrder++;
      
      await ctx.db.patch(args.id, {
        isTop: true,
        topAddedAt: Date.now(),
        topOrder: nextOrder <= 10 ? nextOrder : undefined,
      });
    } else {
      await ctx.db.patch(args.id, {
        isTop: false,
        topAddedAt: undefined,
        topOrder: undefined,
      });
    }
    
    console.log(`Product ${args.id} top status toggled to ${!isCurrentlyTop}`);
    return { success: true, isTop: !isCurrentlyTop };
  },
});

// Get statistics for dashboard
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    
    const total = products.length;
    const withClaim = products.filter((p) => p.salesClaim).length;
    const withFacebook = products.filter((p) => p.socialFacebook).length;
    const withInstagram = products.filter((p) => p.socialInstagram).length;
    const tierA = products.filter((p) => p.tier === "A").length;
    const tierB = products.filter((p) => p.tier === "B").length;
    const tierC = products.filter((p) => p.tier === "C").length;
    
    return {
      total,
      withClaim,
      withFacebook,
      withInstagram,
      tierA,
      tierB,
      tierC,
      claimPercent: total > 0 ? Math.round((withClaim / total) * 100) : 0,
      socialPercent: total > 0 ? Math.round(((withFacebook + withInstagram) / (total * 2)) * 100) : 0,
    };
  },
});

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if products already exist
    const existing = await ctx.db.query("products").first();
    if (existing) {
      console.log("Products already seeded");
      return { message: "Products already exist" };
    }
    
    const sampleProducts = [
      {
        externalId: "demo-1",
        name: "Heřmánkový čaj BIO",
        image: "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400&h=400&fit=crop",
        category: "BIO" as const,
        price: 89,
        availability: "in_stock",
        salesClaim: "Přírodní klid v každém šálku",
        salesClaimSubtitle: "Certifikovaný BIO heřmánek z českých luk pro klidný spánek a relaxaci",
        whyBuy: [
          { icon: "🌿", text: "100% BIO certifikace z kontrolovaného ekologického zemědělství" },
          { icon: "😴", text: "Podporuje kvalitní spánek a uvolnění po náročném dni" },
          { icon: "🇨🇿", text: "Pěstováno a baleno v České republice" },
          { icon: "💚", text: "Bez umělých přísad a konzervantů" },
        ],
        targetAudience: "Ženy 30-55 let, které hledají přírodní způsob relaxace. Aktivní životní styl, zájem o zdravý životní styl a BIO produkty. Preferují kvalitu před cenou.",
        pdfUrl: "/materials/hermanek-bio.pdf",
        bannerUrls: [
          { size: "1200x628", url: "/banners/hermanek-1200x628.jpg" },
          { size: "1080x1080", url: "/banners/hermanek-1080x1080.jpg" },
          { size: "1080x1920", url: "/banners/hermanek-1080x1920.jpg" },
        ],
        socialFacebook: "🌿 Večerní rituál, který změní váš spánek!\n\nNáš BIO heřmánkový čaj je jako objetí přírody po dlouhém dni. Každý šálek obsahuje tu nejčistší esenci českých luk.\n\n✨ Proč si ho zamilujete:\n• 100% BIO certifikace\n• Podporuje klidný spánek\n• Bez umělých přísad\n\nDopřejte si chvilku klidu. Váš večer si to zaslouží. 💚",
        socialInstagram: "Večerní klid v šálku ☕🌿\n\nKdyž den končí a vy potřebujete vypnout, náš BIO heřmánek je tu pro vás. Přírodní, čistý, český.\n\n#apotheke #biocaj #hermanek #vecerniritua #zdravyzivotnistyl #ceskycaj #prirodniklid",
        hashtags: ["apotheke", "biocaj", "hermanek", "vecerniritua", "zdravyzivotnistyl", "ceskycaj", "prirodniklid", "relaxace"],
        brandPillar: "BIO" as const,
        tier: "A" as const,
      },
      {
        externalId: "demo-2",
        name: "Čaj na hubnutí s maté",
        image: "https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=400&h=400&fit=crop",
        category: "Funkční" as const,
        price: 119,
        availability: "in_stock",
        salesClaim: "Aktivujte svůj metabolismus přirozeně",
        salesClaimSubtitle: "Unikátní směs maté, zeleného čaje a zázvoru pro podporu hubnutí",
        whyBuy: [
          { icon: "🔥", text: "Podporuje metabolismus a spalování tuků" },
          { icon: "⚡", text: "Dodává energii bez nervozity díky postupnému uvolňování kofeinu" },
          { icon: "🧪", text: "Složení ověřeno ve spolupráci s Univerzitou Karlovou" },
          { icon: "🎯", text: "Ideální doplněk k aktivnímu životnímu stylu" },
        ],
        targetAudience: "Ženy i muži 25-45 let aktivně řešící svou váhu. Sportovci, lidé začínající s hubnutím. Hledají přírodní podporu, ne zázračné pilulky.",
        pdfUrl: "/materials/hubnuti-mate.pdf",
        bannerUrls: [
          { size: "1200x628", url: "/banners/hubnuti-1200x628.jpg" },
          { size: "1080x1080", url: "/banners/hubnuti-1080x1080.jpg" },
          { size: "1080x1920", url: "/banners/hubnuti-1080x1920.jpg" },
        ],
        socialFacebook: "🔥 Váš nový parťák na cestě za vysněnou postavou!\n\nČaj na hubnutí s maté není žádný zázrak – je to chytrá podpora vašeho úsilí. Kombinace maté, zeleného čaje a zázvoru pomáhá:\n\n✅ Nastartovat metabolismus\n✅ Dodat energii na celý den\n✅ Podpořit spalování tuků\n\nVědecky ověřeno, přírodně účinné. 💪",
        socialInstagram: "Metabolismus na maximum 🔥💪\n\nMaté + zelený čaj + zázvor = vaše tajná zbraň. Žádné zázraky, jen chytrá podpora.\n\n#apotheke #cajnahubnuti #mate #metabolismus #zdravehubnuti #fitness #aktivnizivot",
        hashtags: ["apotheke", "cajnahubnuti", "mate", "metabolismus", "zdravehubnuti", "fitness", "aktivnizivot", "zelenycaj"],
        brandPillar: "Věda" as const,
        tier: "A" as const,
      },
      {
        externalId: "demo-3",
        name: "Dětský ovocný čaj Jahůdka",
        image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=400&fit=crop",
        category: "Dětský" as const,
        price: 69,
        availability: "in_stock",
        salesClaim: "Zdravé pití, které děti milují",
        salesClaimSubtitle: "Lahodný ovocný čaj bez cukru a kofeinu pro nejmenší od 6 měsíců",
        whyBuy: [
          { icon: "👶", text: "Vhodný pro děti od 6 měsíců" },
          { icon: "🍓", text: "Přírodní jahodová chuť bez přidaného cukru" },
          { icon: "☕", text: "Bez kofeinu – bezpečný kdykoliv během dne" },
          { icon: "👨‍⚕️", text: "Doporučováno pediatry" },
        ],
        targetAudience: "Rodiče dětí 0-6 let, především maminky. Hledají zdravé alternativy k slazeným nápojům. Důležitá je bezpečnost a kvalita ingrediencí.",
        pdfUrl: "/materials/detsky-jahudka.pdf",
        bannerUrls: [
          { size: "1200x628", url: "/banners/jahudka-1200x628.jpg" },
          { size: "1080x1080", url: "/banners/jahudka-1080x1080.jpg" },
          { size: "1080x1920", url: "/banners/jahudka-1080x1920.jpg" },
        ],
        socialFacebook: "🍓 Konečně čaj, který děti CHTĚJÍ pít!\n\nJahůdka je hit mezi nejmenšími – a maminky ji milují taky. Proč?\n\n🍼 Vhodný od 6 měsíců\n🚫 Bez cukru a kofeinu\n👨‍⚕️ Doporučeno pediatry\n🍓 Přírodní jahodová chuť\n\nZdravé návyky začínají od malička. 💕",
        socialInstagram: "Jahůdka pro malé parťáky 🍓👶\n\nBez cukru, bez kofeinu, plná chuti. Přesně to, co vaše děti potřebují.\n\n#apotheke #detskycaj #jahudka #prodeti #bezcukru #zdravedeti #maminka",
        hashtags: ["apotheke", "detskycaj", "jahudka", "prodeti", "bezcukru", "zdravedeti", "maminka", "pediatr"],
        brandPillar: "Rodina" as const,
        tier: "A" as const,
      },
      {
        externalId: "demo-4",
        name: "Lipový čaj s medem",
        image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&h=400&fit=crop",
        category: "Bylinný" as const,
        price: 79,
        availability: "in_stock",
        salesClaim: "Tradiční český recept pro celou rodinu",
        salesClaimSubtitle: "Klasická kombinace lipového květu a medu podle receptury našich babiček",
        whyBuy: [
          { icon: "🏠", text: "Tradiční český recept předávaný generacemi" },
          { icon: "🍯", text: "S přírodním květovým medem" },
          { icon: "🤧", text: "Ideální při nachlazení a chřipce" },
          { icon: "👨‍👩‍👧‍👦", text: "Vhodný pro celou rodinu" },
        ],
        targetAudience: "Rodiny s dětmi, senioři. Lidé preferující tradiční české produkty. Nakupují při sezónních onemocněních, ale i preventivně.",
        pdfUrl: "/materials/lipovy-med.pdf",
        bannerUrls: [
          { size: "1200x628", url: "/banners/lipovy-1200x628.jpg" },
          { size: "1080x1080", url: "/banners/lipovy-1080x1080.jpg" },
          { size: "1080x1920", url: "/banners/lipovy-1080x1920.jpg" },
        ],
        socialFacebook: "🍯 Chuť dětství v každém šálku\n\nPamatujete, jak vám babička dělala lipový čaj s medem, když jste byli nemocní? Ten pocit bezpečí a péče...\n\nNáš Lipový čaj s medem je přesně podle tradičního receptu:\n🌳 Lipový květ z českých alejí\n🍯 Přírodní květový med\n💛 Láska v každém sáčku\n\nTradice, která léčí. 🇨🇿",
        socialInstagram: "Babičky věděly své 🍯🌳\n\nLipový čaj s medem – klasika, která nikdy nezklame. Při nachlazení i jen tak.\n\n#apotheke #lipovycaj #tradice #ceskytradice #med #nachlazeni #domacilecba",
        hashtags: ["apotheke", "lipovycaj", "tradice", "ceskytradice", "med", "nachlazeni", "domacilecba", "babiccinrecept"],
        brandPillar: "Tradice" as const,
        tier: "B" as const,
      },
      {
        externalId: "demo-5",
        name: "Funkční čaj Imunita Plus",
        image: "https://images.unsplash.com/photo-1563822249366-3efb23b8e0c9?w=400&h=400&fit=crop",
        category: "Funkční" as const,
        price: 139,
        availability: "in_stock",
        salesClaim: "Vědecky formulovaná podpora imunity",
        salesClaimSubtitle: "Echinacea, vitamín C a zinek v optimálním poměru pro silnou imunitu",
        whyBuy: [
          { icon: "🛡️", text: "Komplexní podpora imunitního systému" },
          { icon: "🔬", text: "Vědecky ověřené složení s optimálním poměrem účinných látek" },
          { icon: "💊", text: "Echinacea + Vitamín C + Zinek v jednom" },
          { icon: "📅", text: "Ideální pro pravidelné užívání v sezóně nachlazení" },
        ],
        targetAudience: "Zdravotně uvědomělí lidé 30-60 let. Hledají prevenci, ne léčbu. Ocení vědecké podklady a důvěryhodnost značky.",
        pdfUrl: "/materials/imunita-plus.pdf",
        bannerUrls: [
          { size: "1200x628", url: "/banners/imunita-1200x628.jpg" },
          { size: "1080x1080", url: "/banners/imunita-1080x1080.jpg" },
          { size: "1080x1920", url: "/banners/imunita-1080x1920.jpg" },
        ],
        socialFacebook: "🛡️ Imunita není náhoda – je to volba\n\nImunita Plus kombinuje to nejlepší z přírody a vědy:\n\n🌸 Echinacea – přírodní podpora obranyschopnosti\n🍊 Vitamín C – antioxidant a podpora imunity\n⚡ Zinek – klíčový minerál pro imunitní systém\n\nVyvinuto ve spolupráci s předními českými odborníky. Protože vaše zdraví si zaslouží to nejlepší. 💪",
        socialInstagram: "Imunita na maximum 🛡️💪\n\nEchinacea + Vitamín C + Zinek. Vědecky ověřeno, přírodně účinné.\n\n#apotheke #imunita #echinacea #vitaminc #zinek #zdravi #prevence #imunitnisystem",
        hashtags: ["apotheke", "imunita", "echinacea", "vitaminc", "zinek", "zdravi", "prevence", "imunitnisystem", "funkcnicaj"],
        brandPillar: "Věda" as const,
        tier: "A" as const,
      },
    ];
    
    for (const product of sampleProducts) {
      await ctx.db.insert("products", product);
    }
    
    console.log("Seeded 5 sample products");
    return { message: "Successfully seeded 5 products" };
  },
});

// Bulk update marketing data for multiple products
export const bulkUpdate = mutation({
  args: {
    productIds: v.array(v.id("products")),
    // Fields to update - only provided fields will be updated
    // Pro prodejce - textové materiály
    quickReferenceCard: v.optional(v.string()),
    salesClaim: v.optional(v.string()),
    salesClaimSubtitle: v.optional(v.string()),
    targetAudience: v.optional(v.string()),
    faqText: v.optional(v.string()),
    // Sociální sítě
    socialFacebook: v.optional(v.string()),
    socialInstagram: v.optional(v.string()),
    socialFacebookImage: v.optional(v.string()),
    socialInstagramImage: v.optional(v.string()),
    hashtags: v.optional(v.array(v.string())),
    // Materiály
    pdfUrl: v.optional(v.string()),
    // Prodejní data
    mainBenefits: v.optional(v.string()),
    herbComposition: v.optional(v.string()),
    salesForecast: v.optional(v.string()),
    seasonalOpportunities: v.optional(v.string()),
    sensoryProfile: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { productIds, ...updates } = args;
    
    // Filter out undefined values
    const cleanUpdates: Record<string, unknown> = {};
    let lastField = "";
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
        lastField = key;
      }
    }
    
    if (Object.keys(cleanUpdates).length === 0) {
      console.log("No fields to update");
      return { success: false, updated: 0, error: "No fields to update" };
    }
    
    // Add tracking fields
    cleanUpdates.marketingLastUpdated = Date.now();
    if (lastField) {
      cleanUpdates.lastUpdatedField = lastField;
    }
    
    // Update all products
    let updated = 0;
    for (const productId of productIds) {
      try {
        await ctx.db.patch(productId, cleanUpdates);
        updated++;
      } catch (error) {
        console.error(`Failed to update product ${productId}:`, error);
      }
    }
    
    console.log(`Bulk updated ${updated}/${productIds.length} products with fields: ${Object.keys(cleanUpdates).join(", ")}`);
    return { success: true, updated };
  },
});

// Find products by SKUs (externalId or image filename)
export const findBySkus = mutation({
  args: {
    skus: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const products: Array<{ _id: string; name: string; image?: string }> = [];
    const foundIds = new Set<string>();
    
    for (const sku of args.skus) {
      // Clean up SKU - remove file paths, extract just the code
      const cleanSku = sku
        .replace(/^.*[\\/]/, '') // Remove path
        .replace(/\.(jpg|jpeg|png|gif|webp)$/i, '') // Remove extension
        .trim();
      
      if (!cleanSku || foundIds.has(cleanSku)) continue;
      
      // Try exact match on externalId first
      let product = await ctx.db
        .query("products")
        .withIndex("by_externalId", (q) => q.eq("externalId", cleanSku))
        .first();
      
      // If not found, try case-insensitive match on image URL
      if (!product) {
        const allProducts = await ctx.db.query("products").collect();
        product = allProducts.find(p => 
          p.externalId?.toLowerCase() === cleanSku.toLowerCase() ||
          p.image?.toLowerCase().includes(cleanSku.toLowerCase())
        ) || null;
      }
      
      if (product && !foundIds.has(product._id)) {
        products.push({
          _id: product._id,
          name: product.name,
          image: product.image,
        });
        foundIds.add(product._id);
      }
    }
    
    console.log(`Found ${products.length} products for ${args.skus.length} SKUs`);
    return products;
  },
});
