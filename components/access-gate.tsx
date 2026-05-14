"use client";

import { ReactNode, useState } from "react";
import { usePathname } from "next/navigation";
import { useAccess } from "./access-context";

type Props = {
  children: ReactNode;
};

const PUBLIC_PATH_PREFIXES = ["/sales-kit"];

export function AccessGate({ children }: Props) {
  const { role, setRole } = useAccess();
  const pathname = usePathname();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isPublicRoute = PUBLIC_PATH_PREFIXES.some((prefix) =>
    pathname?.startsWith(prefix)
  );

  if (isPublicRoute || role === "viewer" || role === "editor") {
    return <>{children}</>;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = password.trim();

    if (trimmed === "view5678") {
      setRole("viewer");
      setError(null);
      return;
    }

    if (trimmed === "edit5678") {
      setRole("editor");
      setError(null);
      return;
    }

    setError("Nesprávné heslo. Zkuste to znovu.");
  };

  return (
    <div
      className="min-h-screen w-full flex bg-white text-slate-900"
      style={{ backgroundColor: "#ffffff" }}
    >
      <div className="flex-1 md:basis-2/3 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Přihlášení</h1>
            <p className="text-sm text-slate-500">
              Vítejte zpět! Zadejte přístupové heslo pro vstup do aplikace.
            </p>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label htmlFor="access-password" className="block text-sm font-medium text-slate-700">
                Heslo
              </label>
              <input
                id="access-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition"
                placeholder="Zadejte heslo"
                autoFocus
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              type="submit"
              className="w-full rounded-lg bg-primary text-primary-foreground text-sm font-semibold py-3 shadow-sm hover:bg-primary/90 transition-colors"
            >
              Přihlásit se
            </button>
          </form>
        </div>
      </div>
      <div className="hidden md:block md:basis-1/3 relative overflow-hidden">
        <img
          src="/apsahuways.png"
          alt="APSAHU – Apotheke Sales Hub"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
    </div>
  );
}

