import { NextResponse } from "next/server"
import { fetchAction, fetchQuery } from "convex/nextjs"
import { api } from "@/convex/_generated/api"

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
