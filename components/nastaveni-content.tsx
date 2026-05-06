"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, UserPlus, ToggleLeft, ToggleRight } from "lucide-react";

export function NastaveniContent() {
  const editors = useQuery(api.editors.listAll);
  const createEditor = useMutation(api.editors.create);
  const toggleActive = useMutation(api.editors.toggleActive);
  const removeEditor = useMutation(api.editors.remove);

  const [name, setName] = useState("");
  const [shortcut, setShortcut] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !shortcut.trim()) {
      setError("Vyplň jméno i zkratku.");
      return;
    }
    setSubmitting(true);
    try {
      await createEditor({ name: name.trim(), shortcut: shortcut.trim().toUpperCase() });
      setName("");
      setShortcut("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nepodařilo se přidat editora.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id: Id<"editors">) => {
    try {
      await toggleActive({ id });
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemove = async (id: Id<"editors">, name: string) => {
    if (!confirm(`Opravdu smazat editora "${name}"? Tato akce je nevratná.`)) return;
    try {
      await removeEditor({ id });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Nastavení</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Správa editorů a dalších možností aplikace.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Editoři
            </CardTitle>
            <CardDescription>
              Editoři jsou lidé, kteří upravují marketingová data. Jejich zkratka se ukládá ke každému poli.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground">Jméno</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="např. Jan Novák"
                />
              </div>
              <div className="w-full sm:w-32">
                <label className="text-xs font-medium text-muted-foreground">Zkratka</label>
                <Input
                  value={shortcut}
                  onChange={(e) => setShortcut(e.target.value.toUpperCase())}
                  placeholder="JN"
                  maxLength={6}
                />
              </div>
              <Button type="submit" disabled={submitting}>
                Přidat
              </Button>
            </form>
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <div className="border-t pt-4">
              {editors === undefined ? (
                <p className="text-sm text-muted-foreground">Načítám…</p>
              ) : editors.length === 0 ? (
                <p className="text-sm text-muted-foreground">Zatím žádní editoři. Přidej prvního výše.</p>
              ) : (
                <ul className="divide-y">
                  {editors.map((ed) => (
                    <li key={ed._id} className="flex items-center justify-between py-3 gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-xs font-bold ${
                            ed.isActive
                              ? "bg-blue-100 text-blue-700"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {ed.shortcut}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{ed.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {ed.isActive ? "Aktivní" : "Neaktivní"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggle(ed._id)}
                          title={ed.isActive ? "Deaktivovat" : "Aktivovat"}
                        >
                          {ed.isActive ? (
                            <ToggleRight className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <ToggleLeft className="w-5 h-5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(ed._id, ed.name)}
                          title="Smazat"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
