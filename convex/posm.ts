import { v } from "convex/values"
import { query, mutation } from "./_generated/server"

// ============ POSM ITEMS ============

export const listItems = query({
  args: {
    type: v.optional(v.string()),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let items;

    if (args.type) {
      items = await ctx.db
        .query("posmItems")
        .withIndex("by_type", (q) => q.eq("type", args.type!))
        .collect();
    } else {
      items = await ctx.db.query("posmItems").collect();
    }

    if (args.activeOnly !== false) {
      items = items.filter(item => item.isActive);
    }

    // Resolve storage URLs for items with storageId
    const itemsWithUrls = await Promise.all(
      items.map(async (item) => {
        let resolvedImageUrl = item.imageUrl;
        let resolvedFileType = item.fileType;
        if (item.storageId) {
          const url = await ctx.storage.getUrl(item.storageId);
          if (url) resolvedImageUrl = url;
          const metadata = await ctx.storage.getMetadata(item.storageId);
          if (metadata?.contentType) {
            resolvedFileType = metadata.contentType;
          }
        }
        return {
          ...item,
          imageUrl: resolvedImageUrl,
          fileType: resolvedFileType,
        };
      })
    );

    return itemsWithUrls.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getItem = query({
  args: { id: v.id("posmItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) return null;

    // Resolve storage URL
    let resolvedImageUrl = item.imageUrl;
    let resolvedFileType = item.fileType;
    if (item.storageId) {
      const url = await ctx.storage.getUrl(item.storageId);
      if (url) resolvedImageUrl = url;
      const metadata = await ctx.storage.getMetadata(item.storageId);
      if (metadata?.contentType) {
        resolvedFileType = metadata.contentType;
      }
    }

    return {
      ...item,
      imageUrl: resolvedImageUrl,
      fileType: resolvedFileType,
    };
  },
});

export const createItem = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    // Type key from posmTypes (built-in or custom). Free-form string.
    type: v.string(),
    imageUrl: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    fileType: v.optional(v.string()),
    downloadUrl: v.optional(v.string()),
    distributionType: v.optional(v.union(
      v.literal("download"),
      v.literal("order")
    )),
    sizes: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    console.log("Creating POSM item:", args.name);
    return await ctx.db.insert("posmItems", {
      ...args,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

export const updateItem = mutation({
  args: {
    id: v.id("posmItems"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    type: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    fileType: v.optional(v.string()),
    downloadUrl: v.optional(v.string()),
    distributionType: v.optional(v.union(
      v.literal("download"),
      v.literal("order")
    )),
    sizes: v.optional(v.array(v.string())),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    console.log("Updating POSM item:", id);
    await ctx.db.patch(id, updates);
    return id;
  },
});

export const deleteItem = mutation({
  args: { id: v.id("posmItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    // Clean up storage if there's a stored file
    if (item?.storageId) {
      try {
        await ctx.storage.delete(item.storageId);
      } catch (e) {
        console.error("Failed to delete storage file:", e);
      }
    }
    console.log("Deleting POSM item:", args.id);
    await ctx.db.delete(args.id);
    return args.id;
  },
});

// ============ POSM ORDERS ============

export const listOrders = query({
  args: {
    status: v.optional(v.union(
      v.literal("new"),
      v.literal("processing"),
      v.literal("shipped"),
      v.literal("delivered"),
      v.literal("cancelled")
    )),
  },
  handler: async (ctx, args) => {
    let orders;

    if (args.status) {
      orders = await ctx.db
        .query("posmOrders")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    } else {
      orders = await ctx.db
        .query("posmOrders")
        .withIndex("by_createdAt")
        .order("desc")
        .collect();
    }

    // Enrich with item data (including resolved URLs)
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        const item = await ctx.db.get(order.itemId);
        let resolvedItem = item;
        if (item?.storageId) {
          const url = await ctx.storage.getUrl(item.storageId);
          const metadata = await ctx.storage.getMetadata(item.storageId);
          if (url) {
            resolvedItem = {
              ...item,
              imageUrl: url,
              fileType: metadata?.contentType ?? item.fileType,
            };
          }
        }
        return {
          ...order,
          item: resolvedItem,
        };
      })
    );

    return enrichedOrders;
  },
});

export const getOrder = query({
  args: { id: v.id("posmOrders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.id);
    if (!order) return null;

    const item = await ctx.db.get(order.itemId);
    return { ...order, item };
  },
});

export const createOrder = mutation({
  args: {
    itemId: v.id("posmItems"),
    quantity: v.number(),
    selectedSize: v.optional(v.string()),
    note: v.optional(v.string()),
    contactName: v.string(),
    contactEmail: v.string(),
    contactPhone: v.optional(v.string()),
    deliveryAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log("Creating POSM order for item:", args.itemId, "quantity:", args.quantity, "size:", args.selectedSize);
    return await ctx.db.insert("posmOrders", {
      ...args,
      status: "new",
      createdAt: Date.now(),
    });
  },
});

export const updateOrderStatus = mutation({
  args: {
    id: v.id("posmOrders"),
    status: v.union(
      v.literal("new"),
      v.literal("processing"),
      v.literal("shipped"),
      v.literal("delivered"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, args) => {
    console.log("Updating order status:", args.id, "to:", args.status);
    await ctx.db.patch(args.id, { status: args.status });
    return args.id;
  },
});

export const deleteOrder = mutation({
  args: { id: v.id("posmOrders") },
  handler: async (ctx, args) => {
    console.log("Deleting POSM order:", args.id);
    await ctx.db.delete(args.id);
    return args.id;
  },
});

// ============ PRODUCT SHEET NAMES ============
// Custom display names for product sheets (shared PDFs from products.pdfUrl),
// surfaced in the POSM "Produktové listy" virtual catalog.

export const listProductSheetNames = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("productSheetNames").collect();
  },
});

export const setProductSheetName = mutation({
  args: {
    pdfUrl: v.string(),
    displayName: v.string(),
  },
  handler: async (ctx, { pdfUrl, displayName }) => {
    const trimmed = displayName.trim();
    if (!trimmed) {
      throw new Error("Display name is required");
    }
    const existing = await ctx.db
      .query("productSheetNames")
      .withIndex("by_pdfUrl", (q) => q.eq("pdfUrl", pdfUrl))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { displayName: trimmed, updatedAt: Date.now() });
      return existing._id;
    }
    return await ctx.db.insert("productSheetNames", {
      pdfUrl,
      displayName: trimmed,
      updatedAt: Date.now(),
    });
  },
});

// ============ POSM TYPES ============
// Stored type catalog. Frontend merges this with hardcoded built-in defaults
// (DB row wins per key) so users can rename / recolor built-ins and add
// fully custom types.

export const listTypes = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("posmTypes").collect();
  },
});

export const upsertType = mutation({
  args: {
    key: v.string(),
    label: v.string(),
    color: v.string(),
    order: v.optional(v.number()),
    isHidden: v.optional(v.boolean()),
    isBuiltIn: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const trimmedLabel = args.label.trim();
    const trimmedKey = args.key.trim();
    if (!trimmedKey) throw new Error("Type key is required");
    if (!trimmedLabel) throw new Error("Type label is required");
    const now = Date.now();
    const existing = await ctx.db
      .query("posmTypes")
      .withIndex("by_key", (q) => q.eq("key", trimmedKey))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        label: trimmedLabel,
        color: args.color,
        order: args.order ?? existing.order,
        isHidden: args.isHidden ?? existing.isHidden,
        isBuiltIn: args.isBuiltIn ?? existing.isBuiltIn,
        updatedAt: now,
      });
      return existing._id;
    }
    return await ctx.db.insert("posmTypes", {
      key: trimmedKey,
      label: trimmedLabel,
      color: args.color,
      order: args.order,
      isHidden: args.isHidden,
      isBuiltIn: args.isBuiltIn,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const deleteType = mutation({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const row = await ctx.db
      .query("posmTypes")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    if (!row) throw new Error("Type not found");
    if (row.isBuiltIn) {
      throw new Error("Built-in types cannot be deleted, only hidden");
    }
    const inUse = await ctx.db
      .query("posmItems")
      .filter((q) => q.eq(q.field("type"), key))
      .first();
    if (inUse) {
      throw new Error("Cannot delete: type is used by existing materials");
    }
    await ctx.db.delete(row._id);
    return row._id;
  },
});

// ============ STATS ============

export const getStats = query({
  handler: async (ctx) => {
    const items = await ctx.db.query("posmItems").collect();
    const orders = await ctx.db.query("posmOrders").collect();

    const activeItems = items.filter(i => i.isActive).length;
    const downloadItems = items.filter(i => i.isActive && i.distributionType === "download").length;
    const orderItems = items.filter(i => i.isActive && i.distributionType === "order").length;
    const newOrders = orders.filter(o => o.status === "new").length;
    const processingOrders = orders.filter(o => o.status === "processing").length;

    return {
      totalItems: items.length,
      activeItems,
      downloadItems,
      orderItems,
      totalOrders: orders.length,
      newOrders,
      processingOrders,
    };
  },
});
