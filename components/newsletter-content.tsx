"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Header } from "@/components/header";
import { useAccess } from "@/components/access-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Mail,
  Send,
  Trash2,
  UserPlus,
  Users,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  History,
} from "lucide-react";

type ContentItem = { id: string; title: string; url?: string };
type ContentSection = { key: string; label: string; items: ContentItem[] };

export function NewsletterContent() {
  const { role } = useAccess();
  const isEditor = role === "editor";

  const content = useQuery(api.newsletter.getContent, isEditor ? {} : "skip") as
    | ContentSection[]
    | undefined;
  const subscribers = useQuery(api.newsletter.listSubscribers, isEditor ? {} : "skip");
  const logs = useQuery(api.newsletter.listLogs, isEditor ? { limit: 10 } : "skip");

  const addSubscriber = useMutation(api.newsletter.addSubscriber);
  const addSubscribersBulk = useMutation(api.newsletter.addSubscribersBulk);
  const toggleSubscriber = useMutation(api.newsletter.toggleSubscriber);
  const removeSubscriber = useMutation(api.newsletter.removeSubscriber);
  const sendNewsletter = useMutation(api.newsletter.sendNewsletter);

  // --- Subscriber form state ---
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [subError, setSubError] = useState<string | null>(null);
  const [bulkRaw, setBulkRaw] = useState("");
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  // --- Composer state ---
  const [subject, setSubject] = useState("");
  const [intro, setIntro] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editedTitles, setEditedTitles] = useState<Record<string, string>>({});
  const [editedUrls, setEditedUrls] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sendMessage, setSendMessage] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const activeCount = useMemo(
    () => (subscribers ?? []).filter((s) => s.isActive).length,
    [subscribers]
  );

  const selectedCount = selectedIds.size;

  const handleAddSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubError(null);
    if (!email.trim()) {
      setSubError("Zadej e-mailovou adresu.");
      return;
    }
    try {
      await addSubscriber({ email: email.trim(), name: name.trim() || undefined });
      setEmail("");
      setName("");
    } catch (err) {
      setSubError(err instanceof Error ? err.message : "Nepodařilo se přidat odběratele.");
    }
  };

  const handleBulkAdd = async () => {
    setBulkResult(null);
    if (!bulkRaw.trim()) return;
    try {
      const res = await addSubscribersBulk({ raw: bulkRaw });
      setBulkResult(
        `Přidáno ${res.added}, přeskočeno (duplicit) ${res.skipped}, neplatných ${res.invalid}.`
      );
      setBulkRaw("");
    } catch (err) {
      setBulkResult(err instanceof Error ? err.message : "Hromadné přidání selhalo.");
    }
  };

  const toggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const titleFor = (item: ContentItem) =>
    editedTitles[item.id] !== undefined ? editedTitles[item.id] : item.title;

  const urlFor = (item: ContentItem) =>
    editedUrls[item.id] !== undefined ? editedUrls[item.id] : (item.url ?? "");

  const handleSend = async () => {
    setSendError(null);
    setSendMessage(null);

    if (!subject.trim()) {
      setSendError("Vyplň předmět e-mailu.");
      return;
    }
    if (selectedCount === 0) {
      setSendError("Vyber alespoň jednu položku.");
      return;
    }
    if (activeCount === 0) {
      setSendError("Nemáš žádné aktivní odběratele.");
      return;
    }

    // Build sections from selected items, preserving section grouping & order
    const sections = (content ?? [])
      .map((section) => ({
        title: section.label,
        items: section.items
          .filter((item) => selectedIds.has(item.id))
          .map((item) => ({
            title: titleFor(item).trim() || item.title,
            url: urlFor(item).trim() || undefined,
          })),
      }))
      .filter((section) => section.items.length > 0);

    if (
      !confirm(
        `Odeslat newsletter "${subject.trim()}" na ${activeCount} aktivních odběratelů?`
      )
    ) {
      return;
    }

    setSending(true);
    try {
      const res = await sendNewsletter({
        subject: subject.trim(),
        intro: intro.trim() || undefined,
        sections,
      });
      setSendMessage(`Newsletter odeslán na ${res.sent} odběratelů.`);
      setSelectedIds(new Set());
      setEditedTitles({});
      setEditedUrls({});
      setSubject("");
      setIntro("");
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Odeslání selhalo.");
    } finally {
      setSending(false);
    }
  };

  if (role === "viewer") {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold">Newsletter</h1>
          <p className="text-sm text-muted-foreground mt-4">
            Tato stránka je dostupná jen v editorském režimu.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="w-6 h-6" />
            Newsletter
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Spravuj odběratele a poskládej newsletter zaškrtnutím položek. Názvy se
            přednačtou, ale můžeš je upravit.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ------------------------------------------------------------- */}
          {/* Subscribers                                                   */}
          {/* ------------------------------------------------------------- */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Odběratelé
                <span className="ml-auto text-sm font-normal text-muted-foreground">
                  {activeCount} aktivních / {subscribers?.length ?? 0} celkem
                </span>
              </CardTitle>
              <CardDescription>
                Lidé, kteří chtějí dostávat newsletter. Neaktivní adresy se
                přeskakují.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleAddSubscriber} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground">E-mail</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jan@firma.cz"
                  />
                </div>
                <div className="w-full sm:w-40">
                  <label className="text-xs font-medium text-muted-foreground">Jméno (volitelné)</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jan Novák"
                  />
                </div>
                <Button type="submit">
                  <UserPlus className="w-4 h-4 mr-1" />
                  Přidat
                </Button>
              </form>
              {subError && <p className="text-sm text-red-600">{subError}</p>}

              {/* Bulk add */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Hromadné přidání (vlož e-maily oddělené čárkou, středníkem nebo na nové řádky)
                </label>
                <Textarea
                  value={bulkRaw}
                  onChange={(e) => setBulkRaw(e.target.value)}
                  placeholder="anna@firma.cz, petr@firma.cz&#10;eva@firma.cz"
                  rows={3}
                />
                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" size="sm" onClick={handleBulkAdd}>
                    Přidat hromadně
                  </Button>
                  {bulkResult && <span className="text-xs text-muted-foreground">{bulkResult}</span>}
                </div>
              </div>

              {/* List */}
              <div className="divide-y divide-border border border-border rounded-lg max-h-80 overflow-y-auto">
                {(subscribers ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground p-4">Zatím žádní odběratelé.</p>
                )}
                {(subscribers ?? []).map((sub) => (
                  <div key={sub._id} className="flex items-center gap-3 px-3 py-2">
                    <button
                      type="button"
                      onClick={() => toggleSubscriber({ id: sub._id as Id<"newsletterSubscribers"> })}
                      title={sub.isActive ? "Pozastavit" : "Aktivovat"}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {sub.isActive ? (
                        <ToggleRight className="w-6 h-6 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="w-6 h-6" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${sub.isActive ? "" : "text-muted-foreground line-through"}`}>
                        {sub.email}
                      </p>
                      {sub.name && <p className="text-xs text-muted-foreground truncate">{sub.name}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Smazat odběratele ${sub.email}?`))
                          removeSubscriber({ id: sub._id as Id<"newsletterSubscribers"> });
                      }}
                      className="text-muted-foreground hover:text-red-600"
                      title="Smazat"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ------------------------------------------------------------- */}
          {/* Composer                                                      */}
          {/* ------------------------------------------------------------- */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                Sestavení newsletteru
              </CardTitle>
              <CardDescription>
                Zaškrtni, co chceš odeslat. U každé položky můžeš upravit zobrazený název.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Předmět</label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Novinky Apotheke – červen"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Úvodní text (volitelné)</label>
                <Textarea
                  value={intro}
                  onChange={(e) => setIntro(e.target.value)}
                  placeholder="Dobrý den, posíláme přehled novinek…"
                  rows={3}
                />
              </div>

              <div className="space-y-4">
                {(content ?? []).map((section) => (
                  <div key={section.key}>
                    <h3 className="text-sm font-semibold mb-2">{section.label}</h3>
                    {section.items.length === 0 ? (
                      <p className="text-xs text-muted-foreground pl-1">Žádné položky.</p>
                    ) : (
                      <div className="space-y-2">
                        {section.items.map((item) => {
                          const checked = selectedIds.has(item.id);
                          return (
                            <div
                              key={item.id}
                              className={`flex items-start gap-3 rounded-lg border p-2 ${
                                checked ? "border-primary bg-primary/5" : "border-border"
                              }`}
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => toggleItem(item.id)}
                                className="mt-1.5"
                              />
                              <div className="flex-1 min-w-0 space-y-1">
                                <Input
                                  value={titleFor(item)}
                                  onChange={(e) =>
                                    setEditedTitles((prev) => ({ ...prev, [item.id]: e.target.value }))
                                  }
                                  disabled={!checked}
                                  className="text-sm"
                                />
                                <div className="flex items-center gap-1">
                                  <Input
                                    value={urlFor(item)}
                                    onChange={(e) =>
                                      setEditedUrls((prev) => ({ ...prev, [item.id]: e.target.value }))
                                    }
                                    disabled={!checked}
                                    placeholder="https://… (odkaz, volitelné)"
                                    className="text-xs h-8 text-blue-700"
                                  />
                                  {urlFor(item).trim() && (
                                    <a
                                      href={urlFor(item).trim()}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="shrink-0 text-blue-600 hover:text-blue-800 p-1"
                                      title="Otevřít odkaz"
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-border space-y-3">
                {sendError && <p className="text-sm text-red-600">{sendError}</p>}
                {sendMessage && <p className="text-sm text-emerald-600">{sendMessage}</p>}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">
                    Vybráno {selectedCount} položek · {activeCount} odběratelů
                  </span>
                  <Button onClick={handleSend} disabled={sending}>
                    <Send className="w-4 h-4 mr-1" />
                    {sending ? "Odesílám…" : "Odeslat newsletter"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* History                                                        */}
        {/* ------------------------------------------------------------- */}
        {logs && logs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Historie odeslání
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {logs.map((log) => (
                  <div key={log._id} className="py-2 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{log.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString("cs-CZ")} · {log.recipientCount} příjemců
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
