"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type SharedPosmKitItem = {
  name: string;
  typeLabel: string;
  typeColor: string;
  distributionType?: "download" | "order";
  imageUrl?: string;
  downloadUrl?: string;
  quantity: number;
  selectedSize?: string;
};

type SharedPosmKitPayload = {
  generatedAt: string;
  items: SharedPosmKitItem[];
};

function decodePosmKitPayload(encoded: string): SharedPosmKitPayload | null {
  try {
    const padded = encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "=");
    const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64);
    const json = decodeURIComponent(
      Array.from(binary)
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join("")
    );
    const parsed = JSON.parse(json) as SharedPosmKitPayload;
    if (!Array.isArray(parsed?.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function PosmKitFallback() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-4">POSM KIT</h1>
        <p className="text-muted-foreground">Načítání…</p>
      </div>
    </main>
  );
}

function getFilenameFromUrl(url: string, fallback: string): string {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").filter(Boolean).pop();
    if (last && last.includes(".")) return decodeURIComponent(last);
  } catch {}
  return fallback;
}

function PosmKitContent() {
  const searchParams = useSearchParams();
  const encodedData = searchParams.get("data") || "";
  const payload = useMemo(() => decodePosmKitPayload(encodedData), [encodedData]);
  const [downloadingAll, setDownloadingAll] = useState(false);

  if (!payload) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <h1 className="text-2xl font-bold mb-4">POSM KIT</h1>
          <p className="text-muted-foreground mb-6">Odkaz je neplatný nebo poškozený.</p>
          <Link
            href="/"
            className="inline-flex px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Zpět na dashboard
          </Link>
        </div>
      </main>
    );
  }

  const downloadItems = payload.items.filter(
    (i) => i.distributionType === "download" && (i.downloadUrl || i.imageUrl),
  );
  const orderItems = payload.items.filter((i) => i.distributionType === "order");

  const downloadAll = async () => {
    if (downloadingAll) return;
    setDownloadingAll(true);
    for (const item of downloadItems) {
      const url = item.downloadUrl || item.imageUrl;
      if (!url) continue;
      const a = document.createElement("a");
      a.href = url;
      a.download = getFilenameFromUrl(url, item.name);
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      await new Promise((r) => setTimeout(r, 300));
    }
    setDownloadingAll(false);
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">POSM KIT</h1>
            <p className="text-muted-foreground text-sm">
              Vygenerováno: {new Date(payload.generatedAt).toLocaleString("cs-CZ")}
              {" · "}
              {payload.items.length} {payload.items.length === 1 ? "materiál" : "materiálů"}
            </p>
          </div>
          {downloadItems.length > 0 && (
            <button
              type="button"
              onClick={downloadAll}
              disabled={downloadingAll}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 font-medium text-sm shadow"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {downloadingAll ? "Stahuji…" : `Stáhnout všechny materiály (${downloadItems.length})`}
            </button>
          )}
        </div>

        {downloadItems.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3">Ke stažení</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {downloadItems.map((item, idx) => {
                const url = item.downloadUrl || item.imageUrl || "";
                const isPdf = url.toLowerCase().includes(".pdf");
                return (
                  <div
                    key={`dl-${idx}`}
                    className="rounded-xl border border-border bg-card overflow-hidden flex flex-col"
                  >
                    {item.imageUrl && (
                      <div className="bg-muted aspect-video flex items-center justify-center overflow-hidden">
                        {isPdf ? (
                          <div className="flex flex-col items-center text-muted-foreground p-4">
                            <svg className="w-10 h-10 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-xs">PDF</span>
                          </div>
                        ) : (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-contain"
                          />
                        )}
                      </div>
                    )}
                    <div className="p-3 flex-1 flex flex-col gap-2">
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-sm line-clamp-2 flex-1">{item.name}</span>
                      </div>
                      <span
                        className={`inline-flex w-fit text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${item.typeColor}`}
                      >
                        {item.typeLabel}
                      </span>
                      <a
                        href={url}
                        download={getFilenameFromUrl(url, item.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-auto inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-sm font-medium transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Stáhnout
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {orderItems.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">K objednání</h2>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium">Materiál</th>
                    <th className="px-3 py-2 font-medium">Typ</th>
                    <th className="px-3 py-2 font-medium text-right">Mn.</th>
                    <th className="px-3 py-2 font-medium">Velikost</th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map((item, idx) => (
                    <tr
                      key={`ord-${idx}`}
                      className="border-t border-border odd:bg-card even:bg-muted/20"
                    >
                      <td className="px-3 py-2">{item.name}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${item.typeColor}`}
                        >
                          {item.typeLabel}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{item.quantity} ks</td>
                      <td className="px-3 py-2 text-muted-foreground">{item.selectedSize || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export default function PosmKitSharePage() {
  return (
    <Suspense fallback={<PosmKitFallback />}>
      <PosmKitContent />
    </Suspense>
  );
}
