import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// List news by type
export const listByType = query({
  args: {
    type: v.union(
      v.literal("product"),
      v.literal("company"),
      v.literal("materials")
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const news = await ctx.db
      .query("news")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .order("desc")
      .take(limit);
    
    // Sort by createdAt descending and add image URLs
    const sorted = news.sort((a, b) => b.createdAt - a.createdAt);
    
    return Promise.all(
      sorted.map(async (item) => ({
        ...item,
        imageUrl: item.imageStorageId 
          ? await ctx.storage.getUrl(item.imageStorageId) 
          : null,
      }))
    );
  },
});

// List all news (sorted by date)
export const listAll = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    const news = await ctx.db
      .query("news")
      .withIndex("by_createdAt")
      .order("desc")
      .take(limit);
    
    return Promise.all(
      news.map(async (item) => ({
        ...item,
        imageUrl: item.imageStorageId 
          ? await ctx.storage.getUrl(item.imageStorageId) 
          : null,
      }))
    );
  },
});

// Get stats per type
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("news").collect();
    
    const product = all.filter((n) => n.type === "product").length;
    const company = all.filter((n) => n.type === "company").length;
    const materials = all.filter((n) => n.type === "materials").length;
    
    return { product, company, materials, total: all.length };
  },
});

// Generate upload URL for news image
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Create news entry
export const create = mutation({
  args: {
    type: v.union(
      v.literal("product"),
      v.literal("company"),
      v.literal("materials")
    ),
    title: v.string(),
    content: v.optional(v.string()),
    skus: v.optional(v.array(v.string())),
    url: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("news", {
      type: args.type,
      title: args.title,
      content: args.content,
      skus: args.skus,
      url: args.url,
      imageStorageId: args.imageStorageId,
      createdAt: Date.now(),
    });
    return id;
  },
});

// Delete news entry
export const remove = mutation({
  args: {
    id: v.id("news"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Update news entry
export const update = mutation({
  args: {
    id: v.id("news"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    skus: v.optional(v.array(v.string())),
    url: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    removeImage: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, removeImage, ...updates } = args;
    
    // Handle image removal
    if (removeImage) {
      const existing = await ctx.db.get(id);
      if (existing?.imageStorageId) {
        await ctx.storage.delete(existing.imageStorageId);
      }
      await ctx.db.patch(id, { imageStorageId: undefined });
      return;
    }
    
    // Remove undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(id, cleanUpdates);
  },
});

// Find products by IDs or SKUs (externalId) - supports flexible matching
export const findProductsBySkus = query({
  args: {
    skus: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const products: Doc<"products">[] = [];
    const foundIds = new Set<string>();
    
    for (const sku of args.skus) {
      // First, try to get by direct ID (for new format where we store product IDs)
      try {
        const productById = await ctx.db.get(sku as Id<"products">);
        if (productById && !foundIds.has(productById._id)) {
          products.push(productById);
          foundIds.add(productById._id);
          continue;
        }
      } catch {
        // Not a valid ID, continue with SKU matching
      }
      
      // Clean up SKU - remove file paths, extract just the code
      const cleanSku = sku
        .replace(/^.*[\\\\/]/, '') // Remove path (g:\...\)
        .replace(/\.(jpg|jpeg|png|gif|webp)$/i, '') // Remove image extension
        .trim();
      
      if (!cleanSku || foundIds.has(cleanSku)) continue;
      
      // Try exact match first
      let product = await ctx.db
        .query("products")
        .withIndex("by_externalId", (q) => q.eq("externalId", cleanSku))
        .first();
      
      // If not found, try case-insensitive match on all products
      if (!product) {
        const allProducts = await ctx.db.query("products").collect();
        product = allProducts.find(p => 
          p.externalId?.toLowerCase() === cleanSku.toLowerCase() ||
          // Also match if image URL contains the SKU
          p.image?.toLowerCase().includes(cleanSku.toLowerCase())
        ) || null;
      }
      
      if (product && !foundIds.has(product._id)) {
        products.push(product);
        foundIds.add(product._id);
      }
    }
    
    // Get gallery images for all matched products
    const productsWithGallery = await Promise.all(
      products.map(async (product) => {
        const galleryImages = await ctx.db
          .query("gallery")
          .withIndex("by_product", (q) => q.eq("productId", product._id))
          .order("desc")
          .collect();
        
        const galleryWithUrls = await Promise.all(
          galleryImages.map(async (img) => ({
            ...img,
            url: await ctx.storage.getUrl(img.storageId),
          }))
        );
        
        return {
          ...product,
          galleryImages: galleryWithUrls,
        };
      })
    );
    
    return productsWithGallery;
  },
});
