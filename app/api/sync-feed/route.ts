import { NextResponse } from "next/server"
import { fetchAction, fetchQuery, fetchMutation } from "convex/nextjs"
import { api } from "@/convex/_generated/api"
import seedMarketingData from "@/lib/seed-marketing-data.json"

// Default feed URL (LuigisBox format)
const DEFAULT_FEED_URL = "https://www.apotheke.cz/xml-feeds/apotheke-luigisbox-products.xml"

export async function POST(request: Request) {
  try {
    // Check that Convex URL is configured
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
    if (!convexUrl) {
      console.error("NEXT_PUBLIC_CONVEX_URL is not set")
      return NextResponse.json(
        { error: "Convex not configured", details: "NEXT_PUBLIC_CONVEX_URL environment variable is missing" },
        { status: 500 }
      )
    }

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

      // Use the Convex mutation that handles all fields including isTop/topOrder
      // Process in batches to avoid payload size limits
      const BATCH_SIZE = 20
      let totalRestored = 0
      let totalNotFound = 0

      for (let i = 0; i < allSeedProducts.length; i += BATCH_SIZE) {
        const batch = allSeedProducts.slice(i, i + BATCH_SIZE)
        const result = await fetchMutation(api.products.restoreMarketingFromSeed, {
          products: batch,
        })
        totalRestored += result.restored
        totalNotFound += result.notFound
      }

      return NextResponse.json({
        restored: totalRestored,
        notFound: totalNotFound,
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
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error("Feed sync error:", errorMessage, errorStack)
    return NextResponse.json(
      { error: "Failed to sync feed", details: errorMessage },
      { status: 500 }
    )
  }
}

export async function GET() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
  return NextResponse.json({
    message: "Use POST to trigger feed sync",
    example: { limit: 100 },
    convexConfigured: !!convexUrl,
    environment: process.env.NEXT_PUBLIC_ENVIRONMENT || "unknown",
  })
}
