"use client";

import Link from "next/link";

export function ProductDetailErrorFallback() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <h2 className="text-xl font-semibold text-foreground mb-2 text-center">
        Detail produktu se nepodařilo načíst
      </h2>
      <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
        Často jde o nesoulad frontendu s Convex backendem (např. chybí nasazené funkce{" "}
        <code className="text-xs bg-muted px-1 rounded">editors</code>). Nasadit aktuální{" "}
        <code className="text-xs bg-muted px-1 rounded">convex/</code> na produkční deployment.
      </p>
      <Link href="/katalog" className="text-primary font-medium hover:underline">
        Zpět do katalogu
      </Link>
    </div>
  );
}
