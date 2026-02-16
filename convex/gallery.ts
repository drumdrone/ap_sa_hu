import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Generate upload URL for file upload
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Save image metadata after upload - linked to a product
export const saveImage = mutation({
  args: {
    productId: v.id("products"),
    storageId: v.id("_storage"),
    filename: v.string(),
    contentType: v.string(),
    size: v.number(),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    console.log("Saving image:", args.filename, "for product:", args.productId, "with tags:", args.tags);
    return await ctx.db.insert("gallery", {
      productId: args.productId,
      storageId: args.storageId,
      filename: args.filename,
      contentType: args.contentType,
      size: args.size,
      tags: args.tags,
      uploadedAt: Date.now(),
    });
  },
});

// Get all images for a specific product
export const listByProduct = query({
  args: {
    productId: v.id("products"),
    tag: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let images = await ctx.db
      .query("gallery")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .order("desc")
      .collect();
    
    // Filter by tag if provided
    if (args.tag) {
      images = images.filter(img => img.tags.includes(args.tag!));
    }
    
    // Get URLs for all images
    const imagesWithUrls = await Promise.all(
      images.map(async (image) => {
        const url = await ctx.storage.getUrl(image.storageId);
        return {
          ...image,
          url,
        };
      })
    );
    
    return imagesWithUrls;
  },
});

// Get recently uploaded images across all products (for news feed)
export const getRecentImages = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    
    const images = await ctx.db
      .query("gallery")
      .withIndex("by_uploadedAt")
      .order("desc")
      .take(limit);
    
    // Get URLs and product info for all images
    const imagesWithDetails = await Promise.all(
      images.map(async (image) => {
        const url = await ctx.storage.getUrl(image.storageId);
        const product = await ctx.db.get(image.productId);
        return {
          ...image,
          url,
          productName: product?.name ?? "Neznámý produkt",
          productImage: product?.image,
        };
      })
    );
    
    return imagesWithDetails;
  },
});

// Get all unique tags for a product
export const getTagsByProduct = query({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const images = await ctx.db
      .query("gallery")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();
    const allTags = images.flatMap(img => img.tags);
    const uniqueTags = Array.from(new Set(allTags)).sort();
    return uniqueTags;
  },
});

// Delete an image
export const deleteImage = mutation({
  args: {
    id: v.id("gallery"),
  },
  handler: async (ctx, args) => {
    const image = await ctx.db.get(args.id);
    if (image) {
      // Delete from storage
      await ctx.storage.delete(image.storageId);
      // Delete from database
      await ctx.db.delete(args.id);
      console.log("Deleted image:", image.filename);
    }
  },
});

// Update image tags
export const updateTags = mutation({
  args: {
    id: v.id("gallery"),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    console.log("Updating tags for image:", args.id, "to:", args.tags);
    await ctx.db.patch(args.id, { tags: args.tags });
  },
});

// Save PDF to product's pdfUrl field
export const savePdfToProduct = mutation({
  args: {
    productId: v.id("products"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId);
    if (url) {
      await ctx.db.patch(args.productId, { 
        pdfUrl: url,
        marketingLastUpdated: Date.now(),
        lastUpdatedField: "pdfUrl",
      });
      console.log("Saved PDF URL to product:", args.productId, "URL:", url);
    }
    return { url };
  },
});
