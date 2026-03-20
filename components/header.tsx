"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAccess } from "@/components/access-context";

export function Header() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ created: number; updated: number } | null>(null);
  const pathname = usePathname();
  const showSyncStatus = pathname?.startsWith("/admin/feed");
  const syncStatus = useQuery(api.feedImport.getSyncStatus, showSyncStatus ? {} : "skip");
  const { role, logout } = useAccess();

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const response = await fetch("/api/sync-feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}), // No limit - load all products
      });
      const result = await response.json();
      if (result.success) {
        setSyncResult({ created: result.created, updated: result.updated });
      } else {
        console.error("Sync failed:", result.error);
        alert("Synchronizace selhala: " + (result.error || "Neznámá chyba"));
      }
    } catch (error) {
      console.error("Sync error:", error);
      alert("Chyba při synchronizaci");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-xl">🍵</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Apotheke</h1>
                <p className="text-xs text-blue-500 -mt-0.5 font-medium">Sales Hub</p>
              </div>
            </Link>
            {role && (
              <div className="flex items-center gap-2">
                <div
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase border ${
                    role === "editor"
                      ? "bg-red-50 border-red-300 text-red-700"
                      : "bg-emerald-50 border-emerald-300 text-emerald-700"
                  }`}
                >
                  {role === "editor" ? "Editor" : "Návštěvník"}
                </div>
                <button
                  onClick={logout}
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-muted/40 hover:bg-muted transition-colors"
                  title="Odhlásit"
                >
                  Odhlásit
                </button>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            {/* Sync Status */}
            {syncStatus && (
              <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
                <span>{syncStatus.totalProducts} produktů</span>
                <span>•</span>
                <span>{syncStatus.withMarketingData} s marketingem</span>
              </div>
            )}
            
            {/* Sync Result Toast */}
            {syncResult && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm">
                <span>✓</span>
                <span>{syncResult.created} nových, {syncResult.updated} aktualizováno</span>
                <button 
                  onClick={() => setSyncResult(null)}
                  className="ml-1 hover:text-green-900"
                >
                  ×
                </button>
              </div>
            )}
            
            {/* Sync Button */}
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSyncing ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  <span>Synchronizuji...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="hidden sm:inline">Sync Feed</span>
                </>
              )}
            </button>
            
            <nav className="hidden md:flex items-center gap-6">
              <Link 
                href="/" 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Dashboard
              </Link>
              <Link 
                href="/katalog" 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Katalog
              </Link>
              <Link 
                href="/posm" 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                POSM
              </Link>
              <Link 
                href="/sprava" 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Správa
              </Link>
              <Link 
                href="/hromadna-sprava" 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Hromadná
              </Link>
              <Link 
                href="/admin/feed" 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Feed
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
