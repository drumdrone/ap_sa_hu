"use client";

import { ReactNode, useState } from "react";
import { useAccess } from "./access-context";

type Props = {
  children: ReactNode;
};

export function AccessGate({ children }: Props) {
  const { role, setRole } = useAccess();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (role === "viewer" || role === "editor") {
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
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0b1920] text-foreground">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-xl p-6 space-y-4">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-foreground">Apotheke Sales Hub</h1>
          <p className="text-xs text-muted-foreground">
            Tato aplikace je pouze pro interní použití. Zadejte přístupové heslo.
          </p>
        </div>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <label className="block text-xs font-medium text-muted-foreground">
            Heslo
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
              placeholder="view5678 nebo edit5678"
            />
          </label>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-lg bg-primary text-primary-foreground text-sm font-medium py-2.5 hover:bg-primary/90 transition-colors"
          >
            Přihlásit
          </button>
        </form>
        <div className="border-t border-border pt-3 mt-2">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <span className="font-semibold">Režimy:</span>{" "}
            <span className="block">
              <strong>view5678</strong> – prezentační režim (bez editace, skryté tužky).
            </span>
            <span className="block">
              <strong>edit5678</strong> – editorský režim (všechny editační prvky viditelné).
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

