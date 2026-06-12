"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Header } from "@/components/header";
import { useAccess } from "@/components/access-context";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Send,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  History,
} from "lucide-react";

type ContentItem = { id: string; title: string; url?: string };
type ContentSection = { key: string; label: string; items: ContentItem[] };

// Hint text shown under each section label in the composer
const SECTION_HINTS: Record<string, string> = {
  product: "Označ produktové novinky, které chceš zahrnout.",
  company: "Co se děje ve firmě.",
  materials: "Nové letáky, stojany a další materiály.",
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
    <div className="min-h-screen bg-[#FAF8F5]">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* ------------------------------------------------------------- */}
        {/* Composer                                                      */}
        {/* ------------------------------------------------------------- */}
        <section>
          <h1 className="font-serif text-3xl text-stone-900 mb-1">
            Sestavení newsletteru — zaškrtni, co chceš poslat
          </h1>
          <p className="text-sm text-stone-500 mb-8">
            Názvy a odkazy se přednačtou z aplikace, u vybraných položek je můžeš upravit.
          </p>

          <div className="space-y-9">
            <div>
              <label className="block font-semibold text-stone-900">Předmět</label>
              <p className="text-sm text-stone-500 mb-2">Co příjemci uvidí v hlavičce e-mailu.</p>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Novinky Apotheke – červen"
                className="bg-white border-stone-200 rounded-xl h-11"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-900">
                Úvodní text <span className="font-normal text-stone-400">(volitelné)</span>
              </label>
              <p className="text-sm text-stone-500 mb-2">Jen pokud chceš newsletter uvést pár větami. Jinak přeskoč.</p>
              <Textarea
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
                placeholder="Dobrý den, posíláme přehled novinek…"
                rows={3}
                className="bg-white border-stone-200 rounded-xl"
              />
            </div>

            {(content ?? []).map((section) => {
              const selectedItems = section.items.filter((i) => selectedIds.has(i.id));
              return (
                <div key={section.key}>
                  <h3 className="font-semibold text-stone-900">{section.label}</h3>
                  <p className="text-sm text-stone-500 mb-3">
                    {SECTION_HINTS[section.key] ?? "Označ, co chceš zahrnout."}
                  </p>

                  {section.items.length === 0 ? (
                    <p className="text-sm text-stone-400 italic">Žádné položky.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {section.items.map((item) => {
                        const checked = selectedIds.has(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => toggleItem(item.id)}
                            className={`rounded-full border px-4 py-2 text-sm transition-colors max-w-[320px] truncate ${
                              checked
                                ? "bg-stone-200 border-stone-400 text-stone-900 font-medium"
                                : "bg-white border-stone-200 text-stone-700 hover:border-stone-400"
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
                    <div className="mt-4 space-y-3">
                      {selectedItems.map((item) => (
                        <div
                          key={item.id}
                          className="bg-white border border-stone-200 rounded-2xl p-4 space-y-2"
                        >
                          <div>
                            <label className="text-xs font-medium text-stone-400 uppercase tracking-wide">
                              Název v e-mailu
                            </label>
                            <Input
                              value={titleFor(item)}
                              onChange={(e) =>
                                setEditedTitles((prev) => ({ ...prev, [item.id]: e.target.value }))
                              }
                              className="border-stone-200 rounded-xl mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-stone-400 uppercase tracking-wide">
                              Odkaz
                            </label>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Input
                                value={urlFor(item)}
                                onChange={(e) =>
                                  setEditedUrls((prev) => ({ ...prev, [item.id]: e.target.value }))
                                }
                                placeholder="https://… (volitelné)"
                                className="border-stone-200 rounded-xl text-sm text-blue-700"
                              />
                              {urlFor(item).trim() && (
                                <a
                                  href={urlFor(item).trim()}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="shrink-0 text-stone-400 hover:text-blue-600 p-1.5"
                                  title="Otevřít odkaz"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="pt-4 border-t border-stone-200 space-y-3">
              {sendError && <p className="text-sm text-red-600">{sendError}</p>}
              {sendMessage && <p className="text-sm text-emerald-700">{sendMessage}</p>}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-stone-500">
                  Vybráno {selectedCount} položek · pošle se {activeCount} odběratelům
                </span>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sending}
                  className="inline-flex items-center gap-2 rounded-full bg-stone-900 text-white px-6 py-2.5 text-sm font-medium hover:bg-stone-700 transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {sending ? "Odesílám…" : "Odeslat newsletter"}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------- */}
        {/* Subscribers                                                   */}
        {/* ------------------------------------------------------------- */}
        <section>
          <h2 className="font-serif text-2xl text-stone-900 mb-1">Odběratelé</h2>
          <p className="text-sm text-stone-500 mb-6">
            {activeCount} aktivních z {subscribers?.length ?? 0}. Neaktivní adresy se při odeslání přeskakují.
          </p>

          <form onSubmit={handleAddSubscriber} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end mb-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-stone-400 uppercase tracking-wide">E-mail</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jan@firma.cz"
                className="bg-white border-stone-200 rounded-xl mt-1"
              />
            </div>
            <div className="w-full sm:w-44">
              <label className="text-xs font-medium text-stone-400 uppercase tracking-wide">Jméno (volitelné)</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jan Novák"
                className="bg-white border-stone-200 rounded-xl mt-1"
              />
            </div>
            <button
              type="submit"
              className="rounded-full border border-stone-300 bg-white px-5 py-2 text-sm font-medium text-stone-800 hover:border-stone-500 transition-colors h-10"
            >
              Přidat
            </button>
          </form>
          {subError && <p className="text-sm text-red-600 mb-3">{subError}</p>}

          <button
            type="button"
            onClick={() => setShowBulk((v) => !v)}
            className="text-sm text-stone-500 underline underline-offset-2 hover:text-stone-800 mb-3"
          >
            {showBulk ? "Skrýt hromadné přidání" : "Hromadné přidání více adres…"}
          </button>

          {showBulk && (
            <div className="space-y-2 mb-4">
              <Textarea
                value={bulkRaw}
                onChange={(e) => setBulkRaw(e.target.value)}
                placeholder="anna@firma.cz, petr@firma.cz&#10;eva@firma.cz"
                rows={3}
                className="bg-white border-stone-200 rounded-xl"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleBulkAdd}
                  className="rounded-full border border-stone-300 bg-white px-4 py-1.5 text-sm text-stone-800 hover:border-stone-500 transition-colors"
                >
                  Přidat hromadně
                </button>
                {bulkResult && <span className="text-xs text-stone-500">{bulkResult}</span>}
              </div>
            </div>
          )}

          <div className="bg-white border border-stone-200 rounded-2xl divide-y divide-stone-100 max-h-80 overflow-y-auto">
            {(subscribers ?? []).length === 0 && (
              <p className="text-sm text-stone-400 p-4">Zatím žádní odběratelé.</p>
            )}
            {(subscribers ?? []).map((sub) => (
              <div key={sub._id} className="flex items-center gap-3 px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => toggleSubscriber({ id: sub._id as Id<"newsletterSubscribers"> })}
                  title={sub.isActive ? "Pozastavit" : "Aktivovat"}
                  className="text-stone-400 hover:text-stone-700"
                >
                  {sub.isActive ? (
                    <ToggleRight className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="w-6 h-6" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${sub.isActive ? "text-stone-800" : "text-stone-400 line-through"}`}>
                    {sub.email}
                  </p>
                  {sub.name && <p className="text-xs text-stone-400 truncate">{sub.name}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Smazat odběratele ${sub.email}?`))
                      removeSubscriber({ id: sub._id as Id<"newsletterSubscribers"> });
                  }}
                  className="text-stone-300 hover:text-red-600"
                  title="Smazat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------------- */}
        {/* History                                                        */}
        {/* ------------------------------------------------------------- */}
        {logs && logs.length > 0 && (
          <section>
            <h2 className="font-serif text-2xl text-stone-900 mb-1 flex items-center gap-2">
              <History className="w-5 h-5 text-stone-400" />
              Historie odeslání
            </h2>
            <p className="text-sm text-stone-500 mb-4">Posledních {logs.length} kampaní.</p>
            <div className="bg-white border border-stone-200 rounded-2xl divide-y divide-stone-100">
              {logs.map((log) => (
                <div key={log._id} className="py-2.5 px-4">
                  <p className="text-sm font-medium text-stone-800 truncate">{log.subject}</p>
                  <p className="text-xs text-stone-400">
                    {new Date(log.createdAt).toLocaleString("cs-CZ")} · {log.recipientCount} příjemců
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
