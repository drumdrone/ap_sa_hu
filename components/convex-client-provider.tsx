"use client"

import { ConvexProvider, ConvexReactClient } from "convex/react"
import { ReactNode, useMemo } from "react"

function normalizeConvexUrl(url?: string) {
  return url?.trim().replace(/\/+$/, "")
}

function MissingConvexConfig({ url }: { url?: string }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0b1920] text-foreground">
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-xl p-6 space-y-3">
        <h1 className="text-lg font-semibold">Chybí / neplatná konfigurace Convex</h1>
        <p className="text-sm text-muted-foreground">
          Aplikace nemá správně nastavenou proměnnou{" "}
          <code className="font-mono">NEXT_PUBLIC_CONVEX_URL</code>.
        </p>
        <div className="text-xs text-muted-foreground space-y-2">
          <div>
            <p className="mb-1">Aktuální hodnota při běhu:</p>
            <p className="font-mono bg-muted/40 rounded-lg px-3 py-2 break-all">
              {url ? url : "(nenastaveno)"}
            </p>
          </div>
          <div>
            <p className="mb-1">V Netlify/Vercel nastav například:</p>
            <p className="font-mono bg-muted/40 rounded-lg px-3 py-2">
              NEXT_PUBLIC_CONVEX_URL=https://&lt;tvoje-deployment&gt;.convex.cloud
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convexUrl = normalizeConvexUrl(process.env.NEXT_PUBLIC_CONVEX_URL)
  const convex = useMemo(() => {
    if (!convexUrl) return null
    try {
      return new ConvexReactClient(convexUrl)
    } catch {
      return null
    }
  }, [convexUrl])

  if (!convex) return <MissingConvexConfig url={convexUrl} />

  // The app's only access control is the client-side password gate
  // (view5678 / edit5678 in AccessGate); no screen ever calls Convex Auth
  // signIn and no Convex function requires authentication. ConvexAuthProvider
  // would still run an auth handshake on load and hold every query until it
  // settles — which can hang in restricted contexts like the in-app browser of
  // an email client (where newsletter links open), leaving product pages stuck
  // on the loading spinner forever. Use the plain provider so queries run
  // immediately and unauthenticated.
  return <ConvexProvider client={convex}>{children}</ConvexProvider>
}
