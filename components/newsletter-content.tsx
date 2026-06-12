"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAccess } from "@/components/access-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Mail,
  Send,
  Trash2,
  Users,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  History,
  Eye,
  X,
} from "lucide-react";

type ContentItem = { id: string; title: string; url?: string; imageUrl?: string };
type ContentSection = { key: string; label: string; items: ContentItem[] };

// Hint text shown under each section label in the composer
const SECTION_HINTS: Record<string, string> = {
  product: "Označ produktové novinky, které chceš zahrnout.",
  company: "Co se děje ve firmě.",
  materials: "Novinky z aktualit o materiálech.",
  posm: "Materiály z POSM katalogu — články, letáky, stojany…",
  top: "Aktuální TOP produkty z katalogu.",
};

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
  const [showBulk, setShowBulk] = useState(false);

  // --- Composer state ---
  const [subject, setSubject] = useState("");
  const [intro, setIntro] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editedTitles, setEditedTitles] = useState<Record<string, string>>({});
  const [editedUrls, setEditedUrls] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sendMessage, setSendMessage] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

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

  // Composed sections from the current selection - used for preview and send
  const composedSections = useMemo(
    () =>
      (content ?? [])
        .map((section) => ({
          title: section.label,
          items: section.items
            .filter((item) => selectedIds.has(item.id))
            .map((item) => ({
              title: titleFor(item).trim() || item.title,
              url: urlFor(item).trim() || undefined,
              imageUrl: item.imageUrl,
            })),
        }))
        .filter((section) => section.items.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [content, selectedIds, editedTitles, editedUrls]
  );

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
        sections: composedSections,
      });
      setSendMessage(`Newsletter odeslán na ${res.sent} odběratelů.`);
      setSelectedIds(new Set());
      setEditedTitles({});
      setEditedUrls({});
      setSubject("");
      setIntro("");
      setShowPreview(false);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Odeslání selhalo.");
    } finally {
      setSending(false);
    }
  };

  if (role === "viewer") {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold">Newsletter</h1>
        <p className="text-sm text-muted-foreground mt-4">
          Tato stránka je dostupná jen v editorském režimu.
        </p>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Mail className="w-6 h-6" />
          Newsletter
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Vyber položky kliknutím, názvy a odkazy se přednačtou a jdou upravit.
        </p>
      </div>

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
            Zaškrtni, co chceš odeslat. U vybraných položek můžeš upravit název i odkaz.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-7">
          <div>
            <label className="block text-sm font-semibold text-foreground">Předmět</label>
            <p className="text-xs text-muted-foreground mb-2">Co příjemci uvidí v hlavičce e-mailu.</p>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Novinky Apotheke – červen"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground">
              Úvodní text <span className="font-normal text-muted-foreground">(volitelné)</span>
            </label>
            <p className="text-xs text-muted-foreground mb-2">Jen pokud chceš newsletter uvést pár větami. Jinak přeskoč.</p>
            <Textarea
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              placeholder="Dobrý den, posíláme přehled novinek…"
              rows={3}
            />
          </div>

          {(content ?? []).map((section) => {
            const selectedItems = section.items.filter((i) => selectedIds.has(i.id));
            return (
              <div key={section.key}>
                <h3 className="text-sm font-semibold text-foreground">{section.label}</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  {SECTION_HINTS[section.key] ?? "Označ, co chceš zahrnout."}
                </p>

                {section.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Žádné položky.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {section.items.map((item) => {
                      const checked = selectedIds.has(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleItem(item.id)}
                          className={`rounded-full border px-4 py-1.5 text-sm transition-colors max-w-[320px] truncate ${
                            checked
                              ? "bg-primary text-primary-foreground border-primary font-medium"
                              : "bg-background text-foreground border-border hover:border-primary/60"
                          }`}
                          title={item.title}
                        >
                          {item.title}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Edit fields for selected items */}
                {selectedItems.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {selectedItems.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-border bg-muted/30 p-3"
                      >
                        <div className="flex gap-3">
                          {item.imageUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.imageUrl}
                              alt=""
                              className="w-14 h-14 rounded-lg object-cover border border-border shrink-0 mt-1 bg-white"
                            />
                          )}
                          <div className="flex-1 min-w-0 space-y-2">
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">
                                Název v e-mailu
                              </label>
                              <Input
                                value={titleFor(item)}
                                onChange={(e) =>
                                  setEditedTitles((prev) => ({ ...prev, [item.id]: e.target.value }))
                                }
                                className="mt-1 bg-background"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">Odkaz</label>
                              <div className="flex items-center gap-1.5 mt-1">
                                <Input
                                  value={urlFor(item)}
                                  onChange={(e) =>
                                    setEditedUrls((prev) => ({ ...prev, [item.id]: e.target.value }))
                                  }
                                  placeholder="https://… (volitelné)"
                                  className="text-sm text-blue-700 bg-background"
                                />
                                {urlFor(item).trim() && (
                                  <a
                                    href={urlFor(item).trim()}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="shrink-0 text-muted-foreground hover:text-primary p-1.5"
                                    title="Otevřít odkaz"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="pt-3 border-t border-border space-y-3">
            {sendError && <p className="text-sm text-red-600">{sendError}</p>}
            {sendMessage && <p className="text-sm text-emerald-600">{sendMessage}</p>}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">
                Vybráno {selectedCount} položek · pošle se {activeCount} odběratelům
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowPreview(true)}
                  disabled={selectedCount === 0}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Náhled
                </Button>
                <Button onClick={handleSend} disabled={sending}>
                  <Send className="w-4 h-4 mr-1" />
                  {sending ? "Odesílám…" : "Odeslat newsletter"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------- */}
      {/* Subscribers + History                                          */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Odběratelé
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                {activeCount} aktivních / {subscribers?.length ?? 0}
              </span>
            </CardTitle>
            <CardDescription>
              Neaktivní adresy se při odeslání přeskakují.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <div className="w-full sm:w-36">
                <label className="text-xs font-medium text-muted-foreground">Jméno</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="volitelné"
                />
              </div>
              <Button type="submit">Přidat</Button>
            </form>
            {subError && <p className="text-sm text-red-600">{subError}</p>}

            <button
              type="button"
              onClick={() => setShowBulk((v) => !v)}
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              {showBulk ? "Skrýt hromadné přidání" : "Hromadné přidání více adres…"}
            </button>

            {showBulk && (
              <div className="space-y-2">
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
            )}

            <div className="divide-y divide-border border border-border rounded-lg max-h-72 overflow-y-auto">
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

        {logs && logs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Historie odeslání
              </CardTitle>
              <CardDescription>Posledních {logs.length} kampaní.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {logs.map((log) => (
                  <div key={log._id} className="py-2">
                    <p className="text-sm font-medium truncate">{log.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString("cs-CZ")} · {log.recipientCount} příjemců
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Email preview modal                                            */}
      {/* ------------------------------------------------------------- */}
      {showPreview && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto p-4 sm:p-8"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="bg-gray-100 rounded-xl shadow-xl w-full max-w-2xl my-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-white rounded-t-xl">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">
                  {subject.trim() || "(bez předmětu)"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Náhled e-mailu · takto ho uvidí příjemci
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="text-muted-foreground hover:text-foreground p-1"
                title="Zavřít"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6">
              <div className="bg-white border border-gray-200 rounded-xl p-6 font-[Arial,Helvetica,sans-serif]">
                {intro.trim() && (
                  <p className="text-[15px] leading-relaxed text-gray-700 whitespace-pre-line mb-6">
                    {intro.trim()}
                  </p>
                )}
                {composedSections.map((section) => (
                  <div key={section.title} className="mb-5">
                    <h2 className="text-sm uppercase tracking-wide text-green-800 border-b-2 border-green-800 pb-1.5 mb-3 font-semibold">
                      {section.title}
                    </h2>
                    <div className="space-y-3">
                      {section.items.map((item, idx) => (
                        <div key={idx} className="flex gap-3">
                          {item.imageUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.imageUrl}
                              alt=""
                              className="w-16 h-16 rounded-lg object-cover border border-gray-200 shrink-0"
                            />
                          )}
                          <div className="min-w-0 text-sm">
                            {item.url ? (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 font-semibold hover:underline"
                              >
                                {item.title}
                              </a>
                            ) : (
                              <span className="font-semibold text-gray-900">{item.title}</span>
                            )}
                            {item.url && (
                              <p className="text-xs text-gray-400 break-all mt-0.5">{item.url}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <p className="text-center text-[11px] text-gray-400 mt-6">Apotheke Sales Hub</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
