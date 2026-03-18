"use client"

import { ConvexAuthProvider } from "@convex-dev/auth/react"
import { ConvexReactClient } from "convex/react"
import { ReactNode } from "react"

// Only create the client if the URL is available
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convex) {
    // Without a provider, any useQuery/useMutation will throw on the client.
    // Show a clear message instead of crashing the whole app.
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#0b1920] text-foreground">
        <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-xl p-6 space-y-3">
          <h1 className="text-lg font-semibold">Chybí konfigurace Convex</h1>
          <p className="text-sm text-muted-foreground">
            Aplikace nemá nastavenou proměnnou <code className="font-mono">NEXT_PUBLIC_CONVEX_URL</code>.
          </p>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              V Netlify/Vercel nastav:
            </p>
            <p className="font-mono bg-muted/40 rounded-lg px-3 py-2">
              NEXT_PUBLIC_CONVEX_URL=https://&lt;tvoje-deployment&gt;.convex.cloud
            </p>
          </div>
        </div>
      </div>
    )
  }

  return <ConvexAuthProvider client={convex}>{children}</ConvexAuthProvider>
}
