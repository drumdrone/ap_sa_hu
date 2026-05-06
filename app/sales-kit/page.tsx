"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type SharedSalesKitItem = {
  label: string;
  content: string;
  type: string;
};

type SharedSalesKitPayload = {
  productName: string;
  externalId: string;
  price: number | null;
  generatedAt: string;
  items: SharedSalesKitItem[];
};

function decodeSalesKitPayload(encoded: string): SharedSalesKitPayload | null {
  try {
    const padded = encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "=");
    const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64);
    const json = decodeURIComponent(
      Array.from(binary)
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join("")
    );
    const parsed = JSON.parse(json) as SharedSalesKitPayload;
    if (!parsed?.productName || !Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export default function SalesKitSharePage() {
  const searchParams = useSearchParams();
  const encodedData = searchParams.get("data") || "";

  const payload = useMemo(() => decodeSalesKitPayload(encodedData), [encodedData]);

  if (!payload) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <h1 className="text-2xl font-bold mb-4">Sales Kit</h1>
          <p className="text-muted-foreground mb-6">Odkaz je neplatný nebo poškozený.</p>
          <Link href="/" className="inline-flex px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
            Zpět na dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Sales Kit</h1>
          <p className="text-muted-foreground">{payload.productName}</p>
        </div>

        <div className="bg-muted/40 border border-border rounded-xl p-4 mb-6 text-sm">
          <p><strong>Kód produktu:</strong> {payload.externalId}</p>
          {payload.price !== null && <p><strong>Cena:</strong> {payload.price} Kč</p>}
          <p><strong>Vygenerováno:</strong> {new Date(payload.generatedAt).toLocaleString("cs-CZ")}</p>
        </div>

        <div className="space-y-4">
          {payload.items.map((item, idx) => (
            <section key={`${item.label}-${idx}`} className="rounded-xl border border-border overflow-hidden">
              <div className="bg-primary text-primary-foreground px-4 py-2 font-medium">
                {item.label}
              </div>
              <pre className="p-4 whitespace-pre-wrap break-words text-xs font-mono bg-card text-card-foreground">
                {item.content}
              </pre>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
