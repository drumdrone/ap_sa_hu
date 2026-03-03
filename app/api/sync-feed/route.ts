import { NextResponse } from "next/server"
import { fetchAction, fetchQuery, fetchMutation } from "convex/nextjs"
import { api } from "@/convex/_generated/api"
import seedMarketingData from "@/lib/seed-marketing-data.json"

// Default feed URL (LuigisBox format)
const DEFAULT_FEED_URL = "https://www.apotheke.cz/xml-feeds/apotheke-luigisbox-products.xml"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    
    // Handle checkOrphans action - runs entirely on Convex server
    if (body.action === "checkOrphans") {
      const feedUrl = body.feedUrl || DEFAULT_FEED_URL
      
      // Run action on Convex server (fetches feed and compares)
      const result = await fetchAction(api.feedImport.checkOrphanedProducts, {
        feedUrl,
      })
      return NextResponse.json(result)
    }
    
    // Handle searchProducts action - search products by name
    if (body.action === "searchProducts") {
      const query = body.query || ""
      const products = await fetchQuery(api.feedImport.findProductByName, {
        name: query,
      })
      return NextResponse.json({ products })
    }
    
    // Handle restoreFromSeed action - restore marketing data from seed export
    if (body.action === "restoreFromSeed") {
      // Use pre-processed seed marketing data (bundled as JSON import)
      const allSeedProducts = [
        ...seedMarketingData.productsWithMarketing,
        ...seedMarketingData.backupProducts,
      ]

      if (allSeedProducts.length === 0) {
        return NextResponse.json({ restored: 0, notFound: 0, message: "No marketing data found in seed" })
      }

      // Fetch all products from DB to match by externalId
      const dbProducts = await fetchQuery(api.products.list, {})
      const skuToId = new Map<string, string>()
      for (const p of dbProducts) {
        if (p.externalId) {
          skuToId.set(p.externalId, p._id)
        }
      }

      // Restore marketing data product by product using updateMarketingData
      let restored = 0
      let notFound = 0
      for (const seedProduct of allSeedProducts) {
        const productId = skuToId.get(seedProduct.externalId)
        if (!productId) {
          notFound++
          continue
        }

        // Extract only fields supported by updateMarketingData
        const skipFields = new Set(["externalId", "isTop", "topOrder", "whyBuy", "bannerUrls"])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateArgs: any = { id: productId }
        for (const [key, value] of Object.entries(seedProduct)) {
          if (!skipFields.has(key) && value !== undefined && value !== null) {
            updateArgs[key] = value
          }
        }

        if (Object.keys(updateArgs).length > 1) {
          try {
            await fetchMutation(api.products.updateMarketingData, updateArgs)
            restored++
          } catch (err) {
            console.error(`Failed to restore SKU ${seedProduct.externalId}:`, err)
          }
        }
      }

      return NextResponse.json({
        restored,
        notFound,
        seedProductsFound: allSeedProducts.length,
        backupsFound: seedMarketingData.totalBackups,
      })
    }

    // Default: sync feed
    const limit = body.limit // No default limit - load all products
    const feedUrl = body.feedUrl || DEFAULT_FEED_URL
    
    const result = await fetchAction(api.feedImport.syncFromFeed, {
      feedUrl,
      ...(limit ? { limit } : {}), // Only pass limit if specified
    })
    
    return NextResponse.json(result)
  } catch (error) {
    console.error("Feed sync error:", error)
    return NextResponse.json(
      { error: "Failed to sync feed", details: String(error) },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: "Use POST to trigger feed sync",
    example: { limit: 100 }
  })
}
