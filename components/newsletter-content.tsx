"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAccess } from "@/components/access-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ListChecks,
  ArrowRightLeft,
} from "lucide-react";

type ContentBlock = { key: string; label: string; content: string };
type ContentItem = {
  id: string;
  title: string;
  url?: string;
  imageUrl?: string;
  blocks?: ContentBlock[];
};
type ContentSection = { key: string; label: string; items: ContentItem[] };

type ComposedSection = {
  title: string;
  items: Array<{
    title: string;
    url?: string;
    imageUrl?: string;
    blocks?: Array<{ label: string; content: string }>;
  }>;
};

// --- Recipient groups -----------------------------------------------------
// A subscriber belongs to exactly one group; the same e-mail can live in
// several groups. Each group has its own compose tab and its own colour so
// it's always obvious who the newsletter will go to.
type GroupKey = "mediate" | "sales";

type GroupMeta = {
  key: GroupKey;
  label: string; // full name
  composeLabel: string; // compose tab caption
  tab: string; // <TabsTrigger> classes (light + active)
  banner: string; // accent banner inside the compose card
  badge: string; // small pill
  dot: string; // colour dot
};

const GROUPS: GroupMeta[] = [
  {
    key: "mediate",
    label: "Mediate",
    composeLabel: "Sestavení – Mediate",
    tab: "bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100 data-[state=active]:bg-violet-600 data-[state=active]:border-violet-600 data-[state=active]:text-white data-[state=active]:shadow",
    banner: "bg-violet-50 border-violet-200 text-violet-800",
    badge: "bg-violet-100 text-violet-700",
    dot: "bg-violet-500",
  },
  {
    key: "sales",
    label: "Obchodní zástupci",
    composeLabel: "Sestavení – OZ",
    tab: "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 data-[state=active]:bg-rose-600 data-[state=active]:border-rose-600 data-[state=active]:text-white data-[state=active]:shadow",
    banner: "bg-rose-50 border-rose-200 text-rose-800",
    badge: "bg-rose-100 text-rose-700",
    dot: "bg-rose-500",
  },
];

const groupMeta = (key: GroupKey): GroupMeta => GROUPS.find((g) => g.key === key)!;
const groupOf = (g?: string | null): GroupKey => (g === "sales" ? "sales" : "mediate");
const otherGroup = (g: GroupKey): GroupKey => (g === "mediate" ? "sales" : "mediate");

// --- Auto-fill defaults for the composer ---------------------------------
// How many of the curated TOP products are pre-selected automatically.
const TOP_AUTOSELECT = 10;
// Token in the intro replaced per recipient with their first name at send time.
const NAME_TOKEN = "{jmeno}";

// Default intro per group.
const DEFAULT_INTROS: Record<GroupKey, string> = {
  mediate: `Dobrý den ${NAME_TOKEN}, posíláme Vám pravidelný přehled z APSAHU.`,
  sales: `Dobrý den ${NAME_TOKEN}, posíláme Vám informace pro obchodní zástupce.`,
};

// Default subject per group + current date (e.g. "Apotheke Sales Hub – 12. 6. 2026").
// Obchodní zástupci get an "OZ " prefix so the audience is obvious in the inbox.
const defaultSubject = (group: GroupKey) =>
  `${group === "sales" ? "OZ " : ""}Apotheke Sales Hub – ${new Date().toLocaleDateString("cs-CZ")}`;

// IDs of the first N TOP products, in curated order (already sorted by topOrder
// and capped at 20 by the backend).
const topAutoselectIds = (content: ContentSection[] | undefined): string[] =>
  (content?.find((s) => s.key === "top")?.items ?? [])
    .slice(0, TOP_AUTOSELECT)
    .map((i) => i.id);

// Replace the name token for the in-app preview (the real per-recipient
// personalization happens on the server at send time). Tidies up the spacing
// left behind when the name is empty.
const personalizeIntro = (intro: string, name: string): string =>
  intro
    .split(NAME_TOKEN)
    .join(name)
    .replace(/ {2,}/g, " ")
    .replace(/\s+([,.])/g, "$1");

// Render a single line of block text, turning **bold** markers into <strong>.
function renderInline(line: string) {
  return line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    /^\*\*[^*]+\*\*$/.test(part) ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

// Preview of a content block - mirrors the email HTML (proportional font,
// preserved line breaks, **bold** rendered) rather than raw monospace.
function BlockContent({ text }: { text: string }) {
  return (
    <div className="px-3.5 py-3 bg-gray-50 border border-gray-200 rounded-lg text-[13px] leading-relaxed text-gray-700">
      {text.split("\n").map((line, i) => (
        <div key={i}>{line === "" ? " " : renderInline(line)}</div>
      ))}
    </div>
  );
}

// Hint text shown under each section label in the content tab
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
  const logs = useQuery(api.newsletter.listLogs, isEditor ? { limit: 20 } : "skip");

  // --- UI state ---
  const [activeTab, setActiveTab] = useState<string>("mediate");

  // --- Composer state ---
  // Subject and intro are kept per group so each audience can have its own
  // heading. Content selection (below) is shared between both groups.
  const [subjects, setSubjects] = useState<Record<GroupKey, string>>({ mediate: "", sales: "" });
  const [intros, setIntros] = useState<Record<GroupKey, string>>({
    mediate: DEFAULT_INTROS.mediate,
    sales: DEFAULT_INTROS.sales,
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editedTitles, setEditedTitles] = useState<Record<string, string>>({});
  const [editedUrls, setEditedUrls] = useState<Record<string, string>>({});
  // Per item: which product content blocks (salesClaim, mainBenefits...) to attach
  const [selectedBlocks, setSelectedBlocks] = useState<Record<string, string[]>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [previewGroup, setPreviewGroup] = useState<GroupKey>("mediate");

  // Pre-fill both subjects with the current date on mount. Done client-side so
  // the server-rendered HTML doesn't disagree with the client about "today".
  useEffect(() => {
    setSubjects((s) => ({
      mediate: s.mediate || defaultSubject("mediate"),
      sales: s.sales || defaultSubject("sales"),
    }));
  }, []);

  // Pre-select the top 10 TOP products once the content loads (only the first
  // time, so later manual de-selections are respected).
  const didAutoSelectRef = useRef(false);
  useEffect(() => {
    if (didAutoSelectRef.current || !content) return;
    didAutoSelectRef.current = true;
    const ids = topAutoselectIds(content);
    if (ids.length > 0) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
    }
  }, [content]);

  // --- Content tab side menu (scroll-spy) ---
  const [activeSection, setActiveSection] = useState<string>("");
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Default the highlighted menu entry to the first section once content loads.
  useEffect(() => {
    if (content && content.length > 0 && !activeSection) {
      setActiveSection(content[0].key);
    }
  }, [content, activeSection]);

  // Highlight the section currently in view while scrolling the content tab.
  useEffect(() => {
    if (activeTab !== "obsah" || !content) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const key = visible[0]?.target.getAttribute("data-section");
        if (key) setActiveSection(key);
      },
      { rootMargin: "-72px 0px -65% 0px", threshold: 0 }
    );
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [activeTab, content]);

  // Smoothly scroll to a section from the side menu (offset clears the sticky header).
  const scrollToSection = (key: string) => {
    setActiveSection(key);
    sectionRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Active recipients per group + total
  const recipientCounts = useMemo(() => {
    const counts: Record<GroupKey, number> = { mediate: 0, sales: 0 };
    for (const s of subscribers ?? []) {
      if (s.isActive) counts[groupOf(s.group)] += 1;
    }
    return counts;
  }, [subscribers]);
  const totalActive = recipientCounts.mediate + recipientCounts.sales;

  const selectedCount = selectedIds.size;

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

  const toggleBlock = (itemId: string, blockKey: string) => {
    setSelectedBlocks((prev) => {
      const current = prev[itemId] ?? [];
      return {
        ...prev,
        [itemId]: current.includes(blockKey)
          ? current.filter((k) => k !== blockKey)
          : [...current, blockKey],
      };
    });
  };

  const blocksFor = (item: ContentItem) =>
    (item.blocks ?? []).filter((b) => (selectedBlocks[item.id] ?? []).includes(b.key));

  // Composed sections from the current selection - used for recap, preview and send
  const composedSections: ComposedSection[] = useMemo(
    () =>
      (content ?? [])
        .map((section) => ({
          title: section.label,
          items: section.items
            .filter((item) => selectedIds.has(item.id))
            .map((item, idx) => {
              const blocks = blocksFor(item).map(({ label, content }) => ({ label, content }));
              const baseTitle = titleFor(item).trim() || item.title;
              // TOP products are presented as a numbered list (1., 2., …).
              const title = section.key === "top" ? `${idx + 1}. ${baseTitle}` : baseTitle;
              return {
                title,
                url: urlFor(item).trim() || undefined,
                imageUrl: item.imageUrl,
                ...(blocks.length > 0 ? { blocks } : {}),
              };
            }),
        }))
        .filter((section) => section.items.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [content, selectedIds, editedTitles, editedUrls, selectedBlocks]
  );

  const openPreview = (group: GroupKey) => {
    setPreviewGroup(group);
    setShowPreview(true);
  };

  // After a successful send, reset that group's heading back to the defaults.
  // The shared content selection is intentionally kept so the same newsletter
  // can still be sent to the other group.
  const handleSent = (group: GroupKey) => {
    setSubjects((s) => ({ ...s, [group]: defaultSubject(group) }));
    setIntros((s) => ({ ...s, [group]: DEFAULT_INTROS[group] }));
    setShowPreview(false);
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
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Mail className="w-6 h-6" />
          Newsletter
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Vyber obsah, zkontroluj náhled a odešli vybrané skupině.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto bg-transparent p-0 gap-2 justify-start">
          {GROUPS.map((g) => (
            <TabsTrigger
              key={g.key}
              value={g.key}
              className={`rounded-lg border px-4 py-2 ${g.tab}`}
            >
              <Send className="w-4 h-4 mr-1.5" />
              {g.composeLabel}
              <span className="ml-1.5 text-xs opacity-75">({recipientCounts[g.key]})</span>
            </TabsTrigger>
          ))}
          <TabsTrigger
            value="obsah"
            className="rounded-lg border px-4 py-2 bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 data-[state=active]:bg-emerald-600 data-[state=active]:border-emerald-600 data-[state=active]:text-white data-[state=active]:shadow"
          >
            <ListChecks className="w-4 h-4 mr-1.5" />
            Obsah
            {selectedCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-white/90 text-emerald-700 text-[10px] leading-none font-semibold">
                {selectedCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="prijemci"
            className="rounded-lg border px-4 py-2 bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 data-[state=active]:bg-amber-500 data-[state=active]:border-amber-500 data-[state=active]:text-white data-[state=active]:shadow"
          >
            <Users className="w-4 h-4 mr-1.5" />
            Nastavení příjemců
            <span className="ml-1.5 text-xs opacity-75">({totalActive})</span>
          </TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------------------- */}
        {/* Compose tabs: one per recipient group                          */}
        {/* ------------------------------------------------------------- */}
        {GROUPS.map((g) => (
          <TabsContent key={g.key} value={g.key} className="space-y-6 mt-4">
            <ComposeTab
              group={g.key}
              subject={subjects[g.key]}
              onSubjectChange={(value) => setSubjects((s) => ({ ...s, [g.key]: value }))}
              intro={intros[g.key]}
              onIntroChange={(value) => setIntros((s) => ({ ...s, [g.key]: value }))}
              composedSections={composedSections}
              selectedCount={selectedCount}
              activeCount={recipientCounts[g.key]}
              logs={logs ?? []}
              onGoToContent={() => setActiveTab("obsah")}
              onGoToRecipients={() => setActiveTab("prijemci")}
              onPreview={() => openPreview(g.key)}
              onSent={() => handleSent(g.key)}
            />
          </TabsContent>
        ))}

        {/* ------------------------------------------------------------- */}
        {/* Tab: Obsah (shared content selection)                          */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="obsah" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Obsah newsletteru</CardTitle>
              <CardDescription>
                Klikni na položky, které chceš zahrnout. Stejný obsah se použije pro obě
                skupiny — liší se jen předmět a úvod v jednotlivých záložkách sestavení.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-6 items-start">
                {/* Left section menu (sticky) — smooth-scrolls to each section */}
                <nav className="hidden md:block w-52 shrink-0 sticky top-20">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-3 mb-1">
                    Sekce
                  </p>
                  <div className="space-y-0.5">
                    {(content ?? []).map((section) => {
                      const selInSection = section.items.filter((i) => selectedIds.has(i.id)).length;
                      const active = activeSection === section.key;
                      return (
                        <button
                          key={section.key}
                          type="button"
                          onClick={() => scrollToSection(section.key)}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                            active
                              ? "bg-emerald-50 text-emerald-700 font-semibold"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          <span
                            className={`w-1 h-4 rounded-full shrink-0 ${active ? "bg-emerald-500" : "bg-transparent"}`}
                          />
                          <span className="truncate flex-1">{section.label}</span>
                          {selInSection > 0 && (
                            <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold">
                              {selInSection}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </nav>

                {/* Right content column */}
                <div className="flex-1 min-w-0 space-y-7">
              {(content ?? []).map((section) => {
                const selectedItems = section.items.filter((i) => selectedIds.has(i.id));
                return (
                  <div
                    key={section.key}
                    data-section={section.key}
                    ref={(el) => {
                      sectionRefs.current[section.key] = el;
                    }}
                    className="scroll-mt-20"
                  >
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

                                {/* Product content blocks (Rychlé akce / Pro prodejce) */}
                                {(item.blocks?.length ?? 0) > 0 && (
                                  <div>
                                    <label className="text-xs font-medium text-muted-foreground">
                                      Přibalit sekce z produktu
                                      {(selectedBlocks[item.id]?.length ?? 0) > 0 && (
                                        <span className="ml-1 text-primary font-semibold">
                                          ({selectedBlocks[item.id]!.length})
                                        </span>
                                      )}
                                    </label>
                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                      {item.blocks!.map((block) => {
                                        const blockChecked = (selectedBlocks[item.id] ?? []).includes(block.key);
                                        return (
                                          <button
                                            key={block.key}
                                            type="button"
                                            onClick={() => toggleBlock(item.id, block.key)}
                                            title={block.content.slice(0, 300)}
                                            className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                                              blockChecked
                                                ? "bg-emerald-600 text-white border-emerald-600 font-medium"
                                                : "bg-background text-muted-foreground border-border hover:border-emerald-500 hover:text-foreground"
                                            }`}
                                          >
                                            {block.label}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
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

              <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">
                  Vybráno {selectedCount} položek
                </span>
                <Button onClick={() => setActiveTab("mediate")} disabled={selectedCount === 0}>
                  Pokračovat na sestavení
                </Button>
              </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* Tab: Nastavení příjemců (per group)                            */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="prijemci" className="mt-4 space-y-6">
          <p className="text-sm text-muted-foreground">
            Příjemci jsou rozdělení do dvou skupin. Stejný e-mail můžeš mít v obou —
            přidej ho v každé skupině zvlášť, nebo použij šipku pro přesun.
          </p>
          {GROUPS.map((g) => (
            <GroupRecipients key={g.key} meta={g} subscribers={subscribers ?? []} />
          ))}
        </TabsContent>
      </Tabs>

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
                  {subjects[previewGroup].trim() || "(bez předmětu)"}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span className={`inline-block w-2 h-2 rounded-full ${groupMeta(previewGroup).dot}`} />
                  Náhled pro skupinu {groupMeta(previewGroup).label}
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
                {intros[previewGroup].trim() && (
                  <p className="text-[15px] leading-relaxed text-gray-700 whitespace-pre-line mb-6">
                    {personalizeIntro(intros[previewGroup].trim(), "Jan")}
                  </p>
                )}
                {composedSections.map((section) => (
                  <div key={section.title} className="mb-5">
                    <h2 className="text-sm uppercase tracking-wide text-white bg-green-800 px-3.5 py-2.5 rounded-md mb-3 font-semibold">
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
                          <div className="min-w-0 flex-1 text-sm">
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
                            {(item.blocks ?? []).map((block, bIdx) => (
                              <div key={bIdx} className="mt-2.5">
                                <p className="text-[11px] font-bold uppercase tracking-wide text-green-800 mb-1.5">
                                  {block.label}
                                </p>
                                <BlockContent text={block.content} />
                              </div>
                            ))}
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

// ---------------------------------------------------------------------------
// Compose tab - one per recipient group. Owns the subject/intro inputs for its
// group plus the send action; the content selection comes in via props.
// ---------------------------------------------------------------------------
function ComposeTab({
  group,
  subject,
  onSubjectChange,
  intro,
  onIntroChange,
  composedSections,
  selectedCount,
  activeCount,
  logs,
  onGoToContent,
  onGoToRecipients,
  onPreview,
  onSent,
}: {
  group: GroupKey;
  subject: string;
  onSubjectChange: (value: string) => void;
  intro: string;
  onIntroChange: (value: string) => void;
  composedSections: ComposedSection[];
  selectedCount: number;
  activeCount: number;
  logs: Array<{ _id: string; subject: string; recipientCount: number; createdAt: number; group?: string }>;
  onGoToContent: () => void;
  onGoToRecipients: () => void;
  onPreview: () => void;
  onSent: () => void;
}) {
  const meta = groupMeta(group);
  const sendNewsletter = useMutation(api.newsletter.sendNewsletter);
  const [sending, setSending] = useState(false);
  const [sendMessage, setSendMessage] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const groupLogs = logs.filter((l) => groupOf(l.group) === group);

  const handleSend = async () => {
    setSendError(null);
    setSendMessage(null);

    if (!subject.trim()) {
      setSendError("Vyplň předmět e-mailu.");
      return;
    }
    if (selectedCount === 0) {
      setSendError("Vyber alespoň jednu položku na záložce Obsah.");
      return;
    }
    if (activeCount === 0) {
      setSendError(`Skupina ${meta.label} nemá žádné aktivní příjemce (záložka Nastavení příjemců).`);
      return;
    }

    if (
      !confirm(
        `Odeslat newsletter "${subject.trim()}" skupině ${meta.label} (${activeCount} příjemců)?`
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
        group,
      });
      setSendMessage(`Newsletter odeslán ${res.sent} příjemcům skupiny ${meta.label}.`);
      onSent();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Odeslání selhalo.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{meta.composeLabel}</CardTitle>
          <CardDescription>
            Vyplň předmět a úvod pro tuto skupinu, zkontroluj vybraný obsah a odešli.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Prominent "who am I sending to" banner */}
          <div className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 ${meta.banner}`}>
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${meta.dot}`} />
            <span className="text-sm font-semibold">Posíláš skupině: {meta.label}</span>
            <button
              type="button"
              onClick={onGoToRecipients}
              className="ml-auto text-xs font-medium underline underline-offset-2 opacity-90 hover:opacity-100"
            >
              {activeCount} aktivních příjemců
            </button>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground">Předmět</label>
            <p className="text-xs text-muted-foreground mb-2">Co příjemci uvidí v hlavičce e-mailu.</p>
            <Input
              value={subject}
              onChange={(e) => onSubjectChange(e.target.value)}
              placeholder="Novinky Apotheke – červen"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground">
              Úvodní text <span className="font-normal text-muted-foreground">(volitelné)</span>
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              <code className="px-1 rounded bg-muted">{NAME_TOKEN}</code> se u každého
              příjemce nahradí jeho křestním jménem (z jména odběratele, jinak z e-mailu).
            </p>
            <Textarea
              value={intro}
              onChange={(e) => onIntroChange(e.target.value)}
              placeholder="Dobrý den, posíláme přehled novinek…"
              rows={3}
            />
          </div>

          {/* Recap of selected content */}
          <div>
            <label className="block text-sm font-semibold text-foreground">Vybraný obsah</label>
            <p className="text-xs text-muted-foreground mb-2">
              Položky vybíráš na záložce Obsah (společné pro obě skupiny), tady je jen přehled.
            </p>
            {composedSections.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-5 text-center">
                <p className="text-sm text-muted-foreground mb-3">Zatím nejsou vybrané žádné položky.</p>
                <Button variant="outline" size="sm" onClick={onGoToContent}>
                  <ListChecks className="w-4 h-4 mr-1" />
                  Vybrat obsah
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-border divide-y divide-border">
                {composedSections.map((section) => (
                  <div key={section.title} className="px-3 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                      {section.title}
                    </p>
                    <ul className="space-y-1.5">
                      {section.items.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          {item.imageUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.imageUrl}
                              alt=""
                              className="w-7 h-7 rounded object-cover border border-border shrink-0"
                            />
                          )}
                          <span className="truncate">{item.title}</span>
                          {(item.blocks?.length ?? 0) > 0 && (
                            <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold">
                              +{item.blocks!.length} {item.blocks!.length === 1 ? "sekce" : "sekcí"}
                            </span>
                          )}
                          {item.url && (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 text-muted-foreground hover:text-primary"
                              title={item.url}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                <div className="px-3 py-2 bg-muted/30">
                  <button
                    type="button"
                    onClick={onGoToContent}
                    className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  >
                    Upravit výběr…
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-border space-y-3">
            {sendError && <p className="text-sm text-red-600">{sendError}</p>}
            {sendMessage && <p className="text-sm text-emerald-600">{sendMessage}</p>}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">
                Vybráno {selectedCount} položek · pošle se {activeCount} příjemcům skupiny {meta.label}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={onPreview} disabled={selectedCount === 0}>
                  <Eye className="w-4 h-4 mr-1" />
                  Náhled
                </Button>
                <Button onClick={handleSend} disabled={sending}>
                  <Send className="w-4 h-4 mr-1" />
                  {sending ? "Odesílám…" : `Odeslat skupině ${meta.label}`}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {groupLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Historie odeslání · {meta.label}
            </CardTitle>
            <CardDescription>Poslední kampaně pro tuto skupinu.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {groupLogs.slice(0, 10).map((log) => (
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
    </>
  );
}

// ---------------------------------------------------------------------------
// Recipients of a single group - add form, bulk add and the subscriber list.
// ---------------------------------------------------------------------------
type Subscriber = {
  _id: string;
  email: string;
  name?: string;
  group?: string;
  isActive: boolean;
};

function GroupRecipients({
  meta,
  subscribers,
}: {
  meta: GroupMeta;
  subscribers: Subscriber[];
}) {
  const addSubscriber = useMutation(api.newsletter.addSubscriber);
  const addSubscribersBulk = useMutation(api.newsletter.addSubscribersBulk);
  const toggleSubscriber = useMutation(api.newsletter.toggleSubscriber);
  const updateSubscriber = useMutation(api.newsletter.updateSubscriber);
  const removeSubscriber = useMutation(api.newsletter.removeSubscriber);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [subError, setSubError] = useState<string | null>(null);
  const [bulkRaw, setBulkRaw] = useState("");
  const [bulkResult, setBulkResult] = useState<string | null>(null);
  const [showBulk, setShowBulk] = useState(false);

  const list = useMemo(
    () =>
      subscribers
        .filter((s) => groupOf(s.group) === meta.key)
        .sort((a, b) => Number(b.isActive) - Number(a.isActive)),
    [subscribers, meta.key]
  );
  const activeCount = list.filter((s) => s.isActive).length;
  const target = groupMeta(otherGroup(meta.key));

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubError(null);
    if (!email.trim()) {
      setSubError("Zadej e-mailovou adresu.");
      return;
    }
    try {
      await addSubscriber({ email: email.trim(), name: name.trim() || undefined, group: meta.key });
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
      const res = await addSubscribersBulk({ raw: bulkRaw, group: meta.key });
      setBulkResult(
        `Přidáno ${res.added}, přeskočeno (duplicit) ${res.skipped}, neplatných ${res.invalid}.`
      );
      setBulkRaw("");
    } catch (err) {
      setBulkResult(err instanceof Error ? err.message : "Hromadné přidání selhalo.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className={`inline-block w-3 h-3 rounded-full ${meta.dot}`} />
          {meta.label}
          <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${meta.badge}`}>
            {activeCount} aktivních
          </span>
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {list.length} celkem
          </span>
        </CardTitle>
        <CardDescription>Neaktivní adresy se při odeslání přeskakují.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground">E-mail</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jan@firma.cz"
            />
          </div>
          <div className="w-full sm:w-44">
            <label className="text-xs font-medium text-muted-foreground">Jméno</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="volitelné" />
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

        <div className="divide-y divide-border border border-border rounded-lg max-h-96 overflow-y-auto">
          {list.length === 0 && (
            <p className="text-sm text-muted-foreground p-4">Zatím žádní odběratelé v této skupině.</p>
          )}
          {list.map((sub) => (
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
                  if (
                    confirm(`Přesunout ${sub.email} do skupiny ${target.label}?`)
                  ) {
                    updateSubscriber({
                      id: sub._id as Id<"newsletterSubscribers">,
                      name: sub.name,
                      group: target.key,
                    }).catch((err) =>
                      alert(err instanceof Error ? err.message : "Přesun selhal.")
                    );
                  }
                }}
                className="text-muted-foreground hover:text-foreground"
                title={`Přesunout do skupiny ${target.label}`}
              >
                <ArrowRightLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Smazat odběratele ${sub.email} ze skupiny ${meta.label}?`))
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
  );
}
