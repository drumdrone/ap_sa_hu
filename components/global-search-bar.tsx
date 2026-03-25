"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const STORAGE_KEY = "globalProductSearchValue";

export function GlobalSearchBar() {
  const router = useRouter();
  const pathname = usePathname();

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
        <div className="relative max-w-xl">
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
                // explicit action: go to catalog with search
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
      </div>
    </div>
  );
}

