"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

const SELLER_FIELDS = [
  { key: "salesClaim", label: "Prodejni claim" },
  { key: "quickReferenceCard", label: "Quick Reference Card" },
  { key: "mainBenefits", label: "3 hlavni benefity" },
  { key: "herbComposition", label: "Slozeni bylin" },
  { key: "salesForecast", label: "Prodejni vyhled" },
  { key: "sensoryProfile", label: "Senzoricky profil" },
  { key: "targetAudience", label: "Cilova skupina" },
  { key: "faqText", label: "FAQ" },
] as const;

const FILL_LEVELS = [
  { label: "Nizka", color: "bg-red-500" },
  { label: "Slusna", color: "bg-orange-400" },
  { label: "Dobra", color: "bg-yellow-400" },
  { label: "Skvela", color: "bg-green-500" },
  { label: "Vyjimecna", color: "bg-emerald-600" },
] as const;

function isFieldFilled(product: Record<string, unknown>, key: string): boolean {
  if (key === "faqText") {
    const faqText = product.faqText;
    if (typeof faqText === "string" && faqText.trim().length > 0) return true;
    const faq = product.faq;
    return Array.isArray(faq) && faq.length > 0;
  }
  const value = product[key];
  return typeof value === "string" && value.trim().length > 0;
}

function computeFillLevel(filled: number, total: number): number {
  if (total === 0) return 0;
  const ratio = filled / total;
  if (ratio <= 0) return 0;
  if (ratio < 0.4) return 1;
  if (ratio < 0.6) return 2;
  if (ratio < 0.8) return 3;
  if (ratio < 1) return 4;
  return 5;
}

function SellerFillIndicator({ product }: { product: Record<string, unknown> }) {
  const filledKeys = SELLER_FIELDS.filter((f) => isFieldFilled(product, f.key));
  const level = computeFillLevel(filledKeys.length, SELLER_FIELDS.length);
  const labelIndex = Math.max(0, Math.min(FILL_LEVELS.length - 1, level - 1));
  const labelText = level === 0 ? "Nevyplneno" : FILL_LEVELS[labelIndex].label;
  const missing = SELLER_FIELDS.filter((f) => !isFieldFilled(product, f.key));
  const tooltip = [
    `Vyplneno ${filledKeys.length} / ${SELLER_FIELDS.length}`,
    "",
    "Vyplnena pole:",
    ...(filledKeys.length ? filledKeys.map((f) => `+ ${f.label}`) : ["(zadna)"]),
    "",
    "Chybi:",
    ...(missing.length ? missing.map((f) => `- ${f.label}`) : ["(nic)"]),
  ].join("\n");

  return (
    <div className="w-44" title={tooltip}>
      <div
        className={`text-xs font-semibold mb-1 ${
          level === 0 ? "text-muted-foreground" : "text-foreground"
        }`}
      >
        {labelText}
        <span className="ml-1 font-normal text-muted-foreground">
          ({filledKeys.length}/{SELLER_FIELDS.length})
        </span>
      </div>
      <div className="flex gap-0.5 h-2 rounded overflow-hidden">
        {FILL_LEVELS.map((seg, i) => (
          <div
            key={seg.label}
            className={`flex-1 ${i < level ? seg.color : "bg-muted"}`}
          />
        ))}
      </div>
    </div>
  );
}

// AI suggestion state type
interface AiSuggestionState {
  loading: boolean;
  suggestions: string[];
  error: string | null;
}

export default function AdminTableContent() {
  const [search, setSearch] = useState("");
  const [editingProduct, setEditingProduct] = useState<Id<"products"> | null>(null);
  const [editingProductData, setEditingProductData] = useState<{
    name: string;
    description?: string;
    price?: number;
    category?: string;
    brandPillar?: string;
    productUrl?: string;
  } | null>(null);
  const [editForm, setEditForm] = useState({
    quickReferenceCard: "",
    salesClaim: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  
  // AI suggestion states
  const [claimAi, setClaimAi] = useState<AiSuggestionState>({
    loading: false,
    suggestions: [],
    error: null,
  });
  const [cardAi, setCardAi] = useState<AiSuggestionState>({
    loading: false,
    suggestions: [],
    error: null,
  });

  const products = useQuery(api.products.list, { search: search || undefined });
  const updateMarketingData = useMutation(api.products.updateMarketingData);

  const openEditDialog = (product: NonNullable<typeof products>[number]) => {
    setEditingProduct(product._id);
    setEditingProductData({
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      brandPillar: product.brandPillar,
      productUrl: product.productUrl,
    });
    setEditForm({
      quickReferenceCard: product.quickReferenceCard || "",
      salesClaim: product.salesClaim || "",
    });
    // Reset AI states
    setClaimAi({ loading: false, suggestions: [], error: null });
    setCardAi({ loading: false, suggestions: [], error: null });
  };

  const generateAiSuggestions = async (type: "salesClaim" | "quickReferenceCard") => {
    const setState = type === "salesClaim" ? setClaimAi : setCardAi;
    
    setState({ loading: true, suggestions: [], error: null });
    
    try {
      const response = await fetch("/api/ai-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          product: editingProductData,
        }),
      });
      
      if (!response.ok) throw new Error("Failed to generate");
      
      const data = await response.json();
      setState({ loading: false, suggestions: data.suggestions, error: null });
    } catch (error) {
      console.error("AI suggestion error:", error);
      setState({ loading: false, suggestions: [], error: "Nepodařilo se vygenerovat návrhy" });
    }
  };

  const selectSuggestion = (type: "salesClaim" | "quickReferenceCard", value: string) => {
    setEditForm({ ...editForm, [type]: value });
    // Clear suggestions after selection
    if (type === "salesClaim") {
      setClaimAi({ loading: false, suggestions: [], error: null });
    } else {
      setCardAi({ loading: false, suggestions: [], error: null });
    }
  };

  const handleSave = async () => {
    if (!editingProduct) return;
    
    setIsSaving(true);
    try {
      await updateMarketingData({
        id: editingProduct,
        quickReferenceCard: editForm.quickReferenceCard || undefined,
        salesClaim: editForm.salesClaim || undefined,
      });
      setSaveMessage("Uloženo!");
      setTimeout(() => {
        setSaveMessage(null);
        setEditingProduct(null);
      }, 1000);
    } catch (error) {
      console.error("Error saving:", error);
      setSaveMessage("Chyba při ukládání");
      setTimeout(() => setSaveMessage(null), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  if (products === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Načítám produkty...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-primary font-semibold hover:opacity-80 transition-opacity"
              >
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-primary-foreground text-sm">🍃</span>
                </div>
                <span>Apotheke Hub</span>
              </Link>
              <span className="text-muted-foreground">/</span>
              <h1 className="text-xl font-bold text-foreground">Správa produktů</h1>
            </div>
            <div className="flex items-center gap-4">
              <Input
                placeholder="Hledat produkty..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64"
              />
              <Badge variant="outline" className="text-muted-foreground">
                {products.length} produktů
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[80px]">Obrázek</TableHead>
                <TableHead className="w-[250px]">Název</TableHead>
                <TableHead className="w-[200px]">Pro prodejce</TableHead>
                <TableHead>Quick Reference Card</TableHead>
                <TableHead>Prodejní Claim</TableHead>
                <TableHead className="w-[100px] text-center">Akce</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product._id} className="hover:bg-muted/30">
                  {/* Image */}
                  <TableCell>
                    <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-lg">
                          🍵
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  {/* Name */}
                  <TableCell>
                    <Link 
                      href={`/product/${product._id}`}
                      className="font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {product.name}
                    </Link>
                    {product.tier && (
                      <Badge 
                        variant="outline" 
                        className={`ml-2 text-xs ${
                          product.tier === "A" 
                            ? "bg-green-100 text-green-700 border-green-300" 
                            : product.tier === "B"
                            ? "bg-blue-100 text-blue-700 border-blue-300"
                            : "bg-gray-100 text-gray-700 border-gray-300"
                        }`}
                      >
                        Tier {product.tier}
                      </Badge>
                    )}
                  </TableCell>
                  
                  {/* Pro prodejce – completeness */}
                  <TableCell>
                    <SellerFillIndicator product={product as unknown as Record<string, unknown>} />
                  </TableCell>

                  {/* Quick Reference Card */}
                  <TableCell>
                    {product.quickReferenceCard ? (
                      <div className="max-w-xs">
                        <div className="text-xs text-green-600 font-medium flex items-center gap-1 mb-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Vyplněno
                        </div>
                        <p className="text-xs text-muted-foreground truncate font-mono">
                          {product.quickReferenceCard.substring(0, 50)}...
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  
                  {/* Sales Claim */}
                  <TableCell>
                    {product.salesClaim ? (
                      <div className="max-w-xs">
                        <div className="text-xs text-green-600 font-medium flex items-center gap-1 mb-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Vyplněno
                        </div>
                        <p className="text-sm text-foreground line-clamp-2">
                          &quot;{product.salesClaim}&quot;
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  
                  {/* Actions */}
                  <TableCell className="text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(product)}
                    >
                      ✏️ Upravit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {products.length === 0 && (
            <div className="p-12 text-center">
              <div className="text-4xl mb-4">📦</div>
              <h3 className="text-lg font-semibold mb-2">Žádné produkty</h3>
              <p className="text-muted-foreground">
                {search ? "Žádné produkty neodpovídají vyhledávání." : "Zatím nemáte žádné produkty."}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Edit Sidebar */}
      <Sheet open={!!editingProduct} onOpenChange={(open) => {
          if (!open) {
            setEditingProduct(null);
            setEditingProductData(null);
            setClaimAi({ loading: false, suggestions: [], error: null });
            setCardAi({ loading: false, suggestions: [], error: null });
          }
        }}>
        <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Upravit marketingová data</SheetTitle>
            <SheetDescription>
              Vyplňte Quick Reference Card a prodejní claim pro zobrazení v detailu produktu.
            </SheetDescription>
          </SheetHeader>
          
          <div className="space-y-6 py-6">
            {/* AI Source indicator */}
            {editingProductData?.productUrl && (
              <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <svg className="w-4 h-4 text-purple-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-purple-700">AI bude analyzovat obsah z e-shopu</p>
                  <p className="text-xs text-purple-600 truncate">{editingProductData.productUrl}</p>
                </div>
              </div>
            )}
            
            {/* Sales Claim */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">
                  Prodejní Claim
                </label>
                <button
                  type="button"
                  onClick={() => generateAiSuggestions("salesClaim")}
                  disabled={claimAi.loading}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  {claimAi.loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                      Generuji...
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      AI Návrhy
                    </>
                  )}
                </button>
              </div>
              <Input
                value={editForm.salesClaim}
                onChange={(e) => setEditForm({ ...editForm, salesClaim: e.target.value })}
                placeholder="např. Přírodní klid v každém šálku"
              />
              
              {/* AI Suggestions for Claim */}
              {claimAi.suggestions.length > 0 && (
                <div className="border border-purple-200 rounded-lg bg-purple-50/50 p-3 space-y-2">
                  <p className="text-xs font-medium text-purple-700 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Vyberte návrh:
                  </p>
                  <div className="space-y-1.5">
                    {claimAi.suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => selectSuggestion("salesClaim", suggestion)}
                        className="w-full text-left px-3 py-2 text-sm bg-white hover:bg-purple-100 border border-purple-100 rounded-lg transition-colors"
                      >
                        &quot;{suggestion}&quot;
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {claimAi.error && (
                <p className="text-xs text-red-500">{claimAi.error}</p>
              )}
              
              <p className="text-xs text-muted-foreground">
                Krátký a úderný text, který zákazníka zaujme.
              </p>
            </div>
            
            {/* Quick Reference Card */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">
                  Quick Reference Card
                </label>
                <button
                  type="button"
                  onClick={() => generateAiSuggestions("quickReferenceCard")}
                  disabled={cardAi.loading}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  {cardAi.loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                      Generuji...
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      AI Návrhy
                    </>
                  )}
                </button>
              </div>
              
              {/* AI Suggestions for Card */}
              {cardAi.suggestions.length > 0 && (
                <div className="border border-purple-200 rounded-lg bg-purple-50/50 p-3 space-y-2 mb-2">
                  <p className="text-xs font-medium text-purple-700 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Vyberte šablonu:
                  </p>
                  <div className="grid gap-2">
                    {cardAi.suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => selectSuggestion("quickReferenceCard", suggestion)}
                        className="text-left p-2 bg-white hover:bg-purple-100 border border-purple-100 rounded-lg transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-purple-700">Šablona {idx + 1}</span>
                          <span className="text-xs text-muted-foreground">Klikněte pro použití</span>
                        </div>
                        <pre className="text-[10px] font-mono text-gray-600 overflow-hidden max-h-24 bg-gray-50 rounded p-2">
                          {suggestion.substring(0, 300)}...
                        </pre>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {cardAi.error && (
                <p className="text-xs text-red-500 mb-2">{cardAi.error}</p>
              )}
              
              <Textarea
                value={editForm.quickReferenceCard}
                onChange={(e) => setEditForm({ ...editForm, quickReferenceCard: e.target.value })}
                placeholder="Vložte formátovanou kartu pro prodejce..."
                className="min-h-[400px] font-mono text-sm bg-gray-900 text-green-400"
              />
              <p className="text-xs text-muted-foreground">
                ASCII formátovaná karta s klíčovými informacemi pro prodejce.
              </p>
            </div>
          </div>
          
          <SheetFooter className="flex-col gap-2 sm:flex-row">
            {saveMessage && (
              <span className={`text-sm ${saveMessage === "Uloženo!" ? "text-green-600" : "text-red-600"}`}>
                {saveMessage}
              </span>
            )}
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => setEditingProduct(null)} className="flex-1 sm:flex-none">
                Zrušit
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="flex-1 sm:flex-none">
                {isSaving ? "Ukládám..." : "Uložit"}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
