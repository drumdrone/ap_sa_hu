import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Default opportunities to seed
const defaultOpportunities = [
  {
    slug: "ucitele-den",
    date: "28. března",
    name: "Den učitelů",
    description: "Dárek pro učitele",
    icon: "👩‍🏫",
    color: "from-rose-400 to-rose-500",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200",
    tip: "Čaj 'Děkuji' jako poděkování pro učitele"
  },
  {
    slug: "valentyn",
    date: "14. února",
    name: "Valentýn",
    description: "Dárek pro partnera",
    icon: "💕",
    color: "from-pink-400 to-pink-500",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200",
    tip: "Dárkové balení s romantickými čaji"
  },
  {
    slug: "matky-den",
    date: "11. května",
    name: "Den matek",
    description: "Dárek pro maminku",
    icon: "💐",
    color: "from-fuchsia-400 to-fuchsia-500",
    bgColor: "bg-fuchsia-50",
    borderColor: "border-fuchsia-200",
    tip: "Wellness čaje pro odpočinek"
  },
  {
    slug: "velikonoce",
    date: "20. dubna",
    name: "Velikonoce",
    description: "Jarní dárek",
    icon: "🐣",
    color: "from-yellow-400 to-yellow-500",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    tip: "Jarní očista a nová energie"
  },
  {
    slug: "vanoce",
    date: "24. prosince",
    name: "Vánoce",
    description: "Vánoční dárek",
    icon: "🎄",
    color: "from-emerald-500 to-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    tip: "Dárkové balení vánočních čajů"
  },
  {
    slug: "novy-rok",
    date: "1. ledna",
    name: "Nový rok",
    description: "Novoroční předsevzetí",
    icon: "🎊",
    color: "from-indigo-400 to-indigo-500",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
    tip: "Podpora novoročních předsevzetí"
  }
];

// Seed default opportunities
export const seedOpportunities = mutation({
  args: {},
  handler: async (ctx) => {
    for (const opp of defaultOpportunities) {
      // Check if already exists
      const existing = await ctx.db
        .query("opportunities")
        .withIndex("by_slug", (q) => q.eq("slug", opp.slug))
        .first();
      
      if (!existing) {
        await ctx.db.insert("opportunities", {
          ...opp,
          productIds: [],
          posmItemIds: [],
          createdAt: Date.now(),
        });
      }
    }
    return { success: true };
  },
});

// List all opportunities
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("opportunities").collect();
  },
});

// Get opportunity by slug
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const opportunity = await ctx.db
      .query("opportunities")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    
    if (!opportunity) return null;
    
    // Fetch assigned products
    const products: Array<{
      _id: typeof opportunity.productIds extends Array<infer T> ? T : never;
      name: string;
      price: number;
      image?: string;
      salesClaim?: string;
      externalId?: string;
      productUrl?: string;
      _creationTime: number;
    }> = [];
    if (opportunity.productIds && opportunity.productIds.length > 0) {
      for (const productId of opportunity.productIds) {
        const product = await ctx.db.get(productId);
        if (product) products.push(product as typeof products[number]);
      }
    }
    
    // Fetch related POSM items
    const posmItems: Array<{
      _id: typeof opportunity.posmItemIds extends Array<infer T> ? T : never;
      name: string;
      type: string;
      description?: string;
      imageUrl?: string;
      sizes?: string[];
      isActive: boolean;
      createdAt: number;
      _creationTime: number;
    }> = [];
    if (opportunity.posmItemIds && opportunity.posmItemIds.length > 0) {
      for (const itemId of opportunity.posmItemIds) {
        const item = await ctx.db.get(itemId);
        if (item) posmItems.push(item as typeof posmItems[number]);
      }
    }
    
    // Resolve file URLs for banners and flyers
    const bannerFilesWithUrls = await Promise.all(
      (opportunity.bannerFiles || []).map(async (file) => ({
        ...file,
        url: await ctx.storage.getUrl(file.storageId),
      }))
    );
    const flyerFilesWithUrls = await Promise.all(
      (opportunity.flyerFiles || []).map(async (file) => ({
        ...file,
        url: await ctx.storage.getUrl(file.storageId),
      }))
    );

    return {
      ...opportunity,
      products,
      posmItems,
      bannerFiles: bannerFilesWithUrls,
      flyerFiles: flyerFilesWithUrls,
    };
  },
});

// Add product to opportunity
export const addProduct = mutation({
  args: {
    opportunityId: v.id("opportunities"),
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const opportunity = await ctx.db.get(args.opportunityId);
    if (!opportunity) throw new Error("Příležitost nenalezena");
    
    const currentProducts = opportunity.productIds || [];
    if (!currentProducts.includes(args.productId)) {
      await ctx.db.patch(args.opportunityId, {
        productIds: [...currentProducts, args.productId],
      });
    }
    return { success: true };
  },
});

// Remove product from opportunity
export const removeProduct = mutation({
  args: {
    opportunityId: v.id("opportunities"),
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const opportunity = await ctx.db.get(args.opportunityId);
    if (!opportunity) throw new Error("Příležitost nenalezena");
    
    const currentProducts = opportunity.productIds || [];
    await ctx.db.patch(args.opportunityId, {
      productIds: currentProducts.filter((id) => id !== args.productId),
    });
    return { success: true };
  },
});

// Update instructions
export const updateInstructions = mutation({
  args: {
    opportunityId: v.id("opportunities"),
    instructions: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.opportunityId, {
      instructions: args.instructions,
    });
    return { success: true };
  },
});

// Update tip
export const updateTip = mutation({
  args: {
    opportunityId: v.id("opportunities"),
    tip: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.opportunityId, {
      tip: args.tip,
    });
    return { success: true };
  },
});

// Update online banners
export const updateOnlineBanners = mutation({
  args: {
    opportunityId: v.id("opportunities"),
    onlineBanners: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.opportunityId, {
      onlineBanners: args.onlineBanners,
    });
    return { success: true };
  },
});

// Update print flyers
export const updatePrintFlyers = mutation({
  args: {
    opportunityId: v.id("opportunities"),
    printFlyers: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.opportunityId, {
      printFlyers: args.printFlyers,
    });
    return { success: true };
  },
});

// Generate upload URL for opportunity files
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Save uploaded file to opportunity (banners or flyers)
export const saveOpportunityFile = mutation({
  args: {
    opportunityId: v.id("opportunities"),
    field: v.union(v.literal("bannerFiles"), v.literal("flyerFiles")),
    storageId: v.id("_storage"),
    filename: v.string(),
    contentType: v.string(),
    size: v.number(),
  },
  handler: async (ctx, args) => {
    const opportunity = await ctx.db.get(args.opportunityId);
    if (!opportunity) throw new Error("Příležitost nenalezena");

    const currentFiles = opportunity[args.field] || [];
    const newFile = {
      storageId: args.storageId,
      filename: args.filename,
      contentType: args.contentType,
      size: args.size,
    };

    await ctx.db.patch(args.opportunityId, {
      [args.field]: [...currentFiles, newFile],
    });
    return { success: true };
  },
});

// Delete uploaded file from opportunity
export const deleteOpportunityFile = mutation({
  args: {
    opportunityId: v.id("opportunities"),
    field: v.union(v.literal("bannerFiles"), v.literal("flyerFiles")),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const opportunity = await ctx.db.get(args.opportunityId);
    if (!opportunity) throw new Error("Příležitost nenalezena");

    const currentFiles = opportunity[args.field] || [];
    const updatedFiles = currentFiles.filter(
      (f: { storageId: string }) => f.storageId !== args.storageId
    );

    await ctx.db.patch(args.opportunityId, {
      [args.field]: updatedFiles,
    });

    // Delete from storage
    await ctx.storage.delete(args.storageId);
    return { success: true };
  },
});

// Add POSM item to opportunity
export const addPosmItem = mutation({
  args: {
    opportunityId: v.id("opportunities"),
    posmItemId: v.id("posmItems"),
  },
  handler: async (ctx, args) => {
    const opportunity = await ctx.db.get(args.opportunityId);
    if (!opportunity) throw new Error("Příležitost nenalezena");
    
    const currentItems = opportunity.posmItemIds || [];
    if (!currentItems.includes(args.posmItemId)) {
      await ctx.db.patch(args.opportunityId, {
        posmItemIds: [...currentItems, args.posmItemId],
      });
    }
    return { success: true };
  },
});

// Remove POSM item from opportunity
export const removePosmItem = mutation({
  args: {
    opportunityId: v.id("opportunities"),
    posmItemId: v.id("posmItems"),
  },
  handler: async (ctx, args) => {
    const opportunity = await ctx.db.get(args.opportunityId);
    if (!opportunity) throw new Error("Příležitost nenalezena");
    
    const currentItems = opportunity.posmItemIds || [];
    await ctx.db.patch(args.opportunityId, {
      posmItemIds: currentItems.filter((id) => id !== args.posmItemId),
    });
    return { success: true };
  },
});

// Search products for autocomplete
export const searchProducts = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    if (!args.query || args.query.length < 2) return [];
    
    const results = await ctx.db
      .query("products")
      .withSearchIndex("search_name", (q) => q.search("name", args.query))
      .take(10);
    
    return results;
  },
});
