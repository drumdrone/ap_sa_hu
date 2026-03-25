"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAccess } from "@/components/access-context";

const STORAGE_KEY = "globalProductSearchValue";

export function GlobalSearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { role } = useAccess();
  const canEditTicker = role === "editor";

  // Avoid duplicating catalog's own search UI
  const shouldHide = pathname === "/katalog";

  const [value, setValue] = useState("");
  const [debouncedValue, setDebouncedValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Initialize from last stored value
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY) ?? "";
      if (stored) setValue(stored);
    } catch {
      // ignore
    }
  }, []);

  // Debounce for querying
  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value.trim()), 200);
    return () => clearTimeout(t);
  }, [value]);

  const results = useQuery(
    api.products.list,
    debouncedValue.length >= 2 ? { search: debouncedValue } : "skip",
  );

  const ticker = useQuery(api.newsTicker.get, {});
  const setTickerText = useMutation(api.newsTicker.setText);
  const tickerText = ticker?.text ?? "";
  const tickerItems = useMemo(() => {
    const raw = tickerText
      .split(/\r?\n/)
      .flatMap((line) => line.split("|"))
      .map((s) => s.trim())
      .filter(Boolean);
    return raw.length ? raw : [];
  }, [tickerText]);

  const [tickerIdx, setTickerIdx] = useState(0);
  const [tickerPlaying, setTickerPlaying] = useState(true);
  const [tickerEditOpen, setTickerEditOpen] = useState(false);
  const [tickerDraft, setTickerDraft] = useState("");

  useEffect(() => {
    setTickerIdx(0);
  }, [tickerText]);

  useEffect(() => {
    if (!tickerPlaying) return;
    if (tickerItems.length <= 1) return;
    const t = setInterval(() => {
      setTickerIdx((i) => (i + 1) % tickerItems.length);
    }, 4500);
    return () => clearInterval(t);
  }, [tickerItems.length, tickerPlaying]);

  // Persist current value so it stays visible on detail pages too
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore
    }
  }, [value]);

  if (shouldHide) return null;

  return (
    <div className="sticky top-16 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative w-full md:max-w-xl">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onFocus={() => setIsOpen(true)}
              onBlur={() => setTimeout(() => setIsOpen(false), 150)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setIsOpen(false);
                if (e.key === "Enter" && debouncedValue.length >= 2) {
                  router.push(`/katalog?search=${encodeURIComponent(debouncedValue)}`);
                }
              }}
              placeholder="Hledat produkty..."
              className="w-full pl-12 pr-4 h-12 text-base bg-amber-50 border-2 border-amber-300 rounded-xl shadow-md placeholder:text-amber-700/60 focus:outline-none focus:ring-4 focus:ring-amber-300/70 focus:border-amber-600"
            />

            {isOpen && debouncedValue.length >= 2 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card rounded-xl border border-border shadow-xl overflow-hidden">
                {results === undefined ? (
                  <div className="p-4 text-sm text-muted-foreground">Hledám…</div>
                ) : results.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">Žádné produkty nenalezeny</div>
                ) : (
                  <div className="max-h-[360px] overflow-auto">
                    {results.slice(0, 10).map((p: any) => (
                      <button
                        key={p._id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setIsOpen(false);
                          router.push(`/product/${p._id}`);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-muted transition-colors flex items-center gap-3"
                      >
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">
                            🍵
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-medium text-foreground truncate">{p.name}</div>
                          {p.brand ? (
                            <div className="text-xs text-muted-foreground truncate">{p.brand}</div>
                          ) : null}
                        </div>
                      </button>
                    ))}
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => router.push(`/katalog?search=${encodeURIComponent(debouncedValue)}`)}
                      className="w-full text-left px-4 py-3 border-t border-border text-sm text-amber-800 hover:bg-amber-50 transition-colors"
                    >
                      Zobrazit všechny výsledky v katalogu →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* News ticker */}
          <div className="w-full md:flex-1">
            <div className="h-12 rounded-xl border border-border bg-card shadow-sm flex items-center gap-2 px-3 overflow-hidden">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 whitespace-nowrap">
                <span className="px-2 py-1 rounded-full bg-amber-100 border border-amber-200">NEWS</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-foreground truncate">
                  {tickerItems.length ? tickerItems[tickerIdx] : "—"}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setTickerPlaying(false);
                    setTickerIdx((i) => (tickerItems.length ? (i - 1 + tickerItems.length) % tickerItems.length : 0));
                  }}
                  className="h-8 w-8 rounded-lg hover:bg-muted transition-colors grid place-items-center"
                  title="Předchozí"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => setTickerPlaying((p) => !p)}
                  className="h-8 w-8 rounded-lg hover:bg-muted transition-colors grid place-items-center"
                  title={tickerPlaying ? "Pozastavit" : "Spustit"}
                >
                  {tickerPlaying ? "❚❚" : "▶"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTickerPlaying(false);
                    setTickerIdx((i) => (tickerItems.length ? (i + 1) % tickerItems.length : 0));
                  }}
                  className="h-8 w-8 rounded-lg hover:bg-muted transition-colors grid place-items-center"
                  title="Další"
                >
                  ›
                </button>
                {canEditTicker && (
                  <button
                    type="button"
                    onClick={() => {
                      setTickerDraft(tickerText);
                      setTickerEditOpen(true);
                      setTickerPlaying(false);
                    }}
                    className="h-8 px-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors text-xs font-semibold"
                    title="Upravit ticker"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>

            {tickerEditOpen && canEditTicker && (
              <div className="mt-2 rounded-xl border border-border bg-card shadow-sm p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-muted-foreground mb-2">
                      Ticker text (každý řádek nebo `|` je jedna zpráva)
                    </div>
                    <textarea
                      value={tickerDraft}
                      onChange={(e) => setTickerDraft(e.target.value)}
                      className="w-full min-h-[90px] rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300/70 focus:border-amber-600"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setTickerEditOpen(false)}
                    className="h-9 w-9 rounded-lg hover:bg-muted transition-colors grid place-items-center"
                    title="Zavřít"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTickerDraft(tickerText);
                      setTickerEditOpen(false);
                    }}
                    className="px-3 h-9 rounded-lg border border-input bg-background hover:bg-muted transition-colors text-sm"
                  >
                    Zrušit
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await setTickerText({ text: tickerDraft });
                      setTickerEditOpen(false);
                      setTickerPlaying(true);
                    }}
                    className="px-3 h-9 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors text-sm font-semibold"
                  >
                    Uložit
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

