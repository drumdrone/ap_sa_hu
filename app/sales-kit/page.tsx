"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type SharedSalesKitItem = {
  label: string;
  content: string;
  type: string;
};

type SharedSalesKitProduct = {
  productName: string;
  externalId: string | null;
  price: number | null;
  items: SharedSalesKitItem[];
};

// Normalized payload used by this page. The product detail now shares a kit
// built from several products (version 2: { products: [...] }), but links
// generated before that change carry a single product at the top level, so we
// normalize both into `products` here.
type SharedSalesKitPayload = {
  generatedAt: string;
  products: SharedSalesKitProduct[];
};

type RawPayload = {
  version?: number;
  generatedAt?: string;
  // v2 shape
  products?: SharedSalesKitProduct[];
  // legacy single-product shape
  productName?: string;
  externalId?: string | null;
  price?: number | null;
  items?: SharedSalesKitItem[];
};

function normalizePayload(raw: RawPayload): SharedSalesKitPayload | null {
  const generatedAt = raw.generatedAt || new Date().toISOString();

  if (Array.isArray(raw.products)) {
    const products = raw.products.filter(
      (p) => p && typeof p.productName === "string" && Array.isArray(p.items)
    );
    if (products.length === 0) return null;
    return { generatedAt, products };
  }

  // Legacy single-product payload.
  if (typeof raw.productName === "string" && Array.isArray(raw.items)) {
    return {
      generatedAt,
      products: [
        {
          productName: raw.productName,
          externalId: raw.externalId ?? null,
          price: raw.price ?? null,
          items: raw.items,
        },
      ],
    };
  }

  return null;
}

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
    const parsed = JSON.parse(json) as RawPayload;
    return normalizePayload(parsed);
  } catch {
    return null;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function linkifyEscaped(value: string): string {
  const escaped = escapeHtml(value);
  return escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" style="color:#2563eb;text-decoration:underline;">$1</a>'
  );
}

function totalItems(payload: SharedSalesKitPayload): number {
  return payload.products.reduce((sum, p) => sum + p.items.length, 0);
}

function openPrintablePdf(payload: SharedSalesKitPayload) {
  const generated = new Date(payload.generatedAt).toLocaleString("cs-CZ");
  const productsHtml = payload.products
    .map(
      (product) => `
        <section class="product">
          <h2>${escapeHtml(product.productName)}</h2>
          <p class="product-meta">
            ${product.externalId ? `Kód produktu: ${escapeHtml(product.externalId)}` : ""}
            ${product.price !== null && product.price !== undefined ? `${product.externalId ? " &middot; " : ""}Cena: ${product.price} Kč` : ""}
          </p>
          ${product.items
            .map(
              (item, idx) => `
            <div class="item">
              <h3>${idx + 1}. ${escapeHtml(item.label)}</h3>
              <pre>${linkifyEscaped(item.content)}</pre>
            </div>`
            )
            .join("")}
        </section>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="utf-8" />
<title>Sales Kit</title>
<style>
  body { font-family: Arial, sans-serif; padding: 32px; max-width: 820px; margin: 0 auto; color: #111; }
  h1 { color: #166534; border-bottom: 2px solid #166534; padding-bottom: 8px; margin: 0 0 8px; }
  .meta { color: #6b7280; font-size: 12px; margin-bottom: 24px; }
  .product { margin-bottom: 32px; }
  .product h2 { color: #166534; font-size: 18px; margin: 0 0 4px; }
  .product-meta { color: #6b7280; font-size: 12px; margin: 0 0 12px; }
  .item { margin-bottom: 16px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; break-inside: avoid; }
  .item h3 { margin: 0 0 10px; color: #166534; font-size: 14px; }
  .item pre { margin: 0; font-size: 12px; white-space: pre-wrap; word-break: break-word; font-family: inherit; color: #374151; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <h1>Sales Kit</h1>
  <p class="meta">
    ${payload.products.length} produktů &middot; ${totalItems(payload)} položek
    &middot; Vygenerováno: ${escapeHtml(generated)}
  </p>
  ${productsHtml}
  <script>window.addEventListener('load', () => setTimeout(() => window.print(), 150));</script>
</body>
</html>`;

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Otevření PDF zablokoval prohlížeč. Povolte vyskakovací okna a zkuste to znovu.");
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

function SalesKitFallback() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-4">Sales Kit</h1>
        <p className="text-muted-foreground">Načítání…</p>
      </div>
    </main>
  );
}

function SalesKitContent() {
  const searchParams = useSearchParams();
  const encodedData = searchParams.get("data") || "";
  const autoTriggered = useRef(false);

  const payload = useMemo(() => decodeSalesKitPayload(encodedData), [encodedData]);

  useEffect(() => {
    if (!payload || autoTriggered.current) return;
    if (typeof window === "undefined") return;
    if (!new URLSearchParams(window.location.search).has("download")) return;
    autoTriggered.current = true;
    openPrintablePdf(payload);
  }, [payload]);

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
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Sales Kit</h1>
            <p className="text-muted-foreground">
              {payload.products.length} {payload.products.length === 1 ? "produkt" : "produktů"} · {totalItems(payload)} položek
            </p>
          </div>
          <button
            type="button"
            onClick={() => openPrintablePdf(payload)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm shadow"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
            </svg>
            Stáhnout PDF
          </button>
        </div>

        <p className="text-xs text-muted-foreground mb-6">
          Vygenerováno: {new Date(payload.generatedAt).toLocaleString("cs-CZ")}
        </p>

        <div className="space-y-8">
          {payload.products.map((product, productIdx) => (
            <div key={`${product.productName}-${productIdx}`}>
              <div className="mb-3">
                <h2 className="text-xl font-bold text-foreground">{product.productName}</h2>
                <p className="text-sm text-muted-foreground">
                  {product.externalId && <span>Kód produktu: {product.externalId}</span>}
                  {product.price !== null && product.price !== undefined && (
                    <span>{product.externalId ? " · " : ""}Cena: {product.price} Kč</span>
                  )}
                </p>
              </div>
              <div className="space-y-4">
                {product.items.map((item, idx) => (
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
          ))}
        </div>
      </div>
    </main>
  );
}

export default function SalesKitSharePage() {
  return (
    <Suspense fallback={<SalesKitFallback />}>
      <SalesKitContent />
    </Suspense>
  );
}
