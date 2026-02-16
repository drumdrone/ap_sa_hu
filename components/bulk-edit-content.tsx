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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Available sections for bulk edit - organized by category
const BULK_SECTIONS = [
  // Pro prodejce - textové materiály
  { id: "quickReferenceCard", label: "Quick Reference Card", description: "ASCII formátovaná karta s klíčovými info", icon: "📋" },
  { id: "salesClaim", label: "Prodejní claim", description: "Hlavní prodejní argument", icon: "💬" },
  { id: "salesClaimSubtitle", label: "Prodejní claim subtitle", description: "Podtitulek claimu", icon: "💬" },
  { id: "targetAudience", label: "Cílová skupina", description: "Popis cílové skupiny zákazníků", icon: "👥" },
  { id: "faqText", label: "FAQ", description: "Časté dotazy a odpovědi", icon: "❓" },
  
  // Sociální sítě
  { id: "socialFacebook", label: "Facebook post", description: "Text příspěvku pro Facebook", icon: "📘" },
  { id: "socialInstagram", label: "Instagram post", description: "Text příspěvku pro Instagram", icon: "📸" },
  { id: "socialFacebookImage", label: "Facebook obrázek URL", description: "URL obrázku pro Facebook", icon: "🖼️" },
  { id: "socialInstagramImage", label: "Instagram obrázek URL", description: "URL obrázku pro Instagram", icon: "🖼️" },
  { id: "hashtags", label: "Hashtagy", description: "Hashtagy oddělené čárkou", icon: "#️⃣" },
  
  // Materiály
  { id: "pdfUrl", label: "PDF materiál URL", description: "URL na PDF produktový list", icon: "📄" },
  
  // Prodejní data
  { id: "mainBenefits", label: "3 hlavní benefity", description: "Klíčové prodejní argumenty", icon: "✨" },
  { id: "herbComposition", label: "Zastoupení bylinek", description: "Přehled složení produktu", icon: "🌿" },
  { id: "salesForecast", label: "Křivka prodejů", description: "Předpokládané prodeje po měsících", icon: "📈" },
  { id: "seasonalOpportunities", label: "Sezónní příležitosti", description: "Tabulka sezónních prodejních příležitostí", icon: "📅" },
  { id: "sensoryProfile", label: "Senzorický profil", description: "Chuťový profil produktu", icon: "👅" },
] as const;

type SectionId = typeof BULK_SECTIONS[number]["id"];

export default function BulkEditContent() {
  // Filters
  const [search, setSearch] = useState("");
  
  // Selection
  const [selectedProducts, setSelectedProducts] = useState<Set<Id<"products">>>(new Set());
  
  // Editor
  const [activeSection, setActiveSection] = useState<SectionId>("quickReferenceCard");
  const [sectionValues, setSectionValues] = useState<Record<SectionId, string>>({
    quickReferenceCard: "",
    salesClaim: "",
    salesClaimSubtitle: "",
    targetAudience: "",
    faqText: "",
    socialFacebook: "",
    socialInstagram: "",
    socialFacebookImage: "",
    socialInstagramImage: "",
    hashtags: "",
    pdfUrl: "",
    mainBenefits: "",
    herbComposition: "",
    salesForecast: "",
    seasonalOpportunities: "",
    sensoryProfile: "",
  });
  
  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ current: 0, total: 0 });
  const [saveResult, setSaveResult] = useState<{ success: boolean; updated: number } | null>(null);
  
  // Queries and mutations
  const products = useQuery(api.products.list, {
    search: search || undefined,
  });
  const bulkUpdate = useMutation(api.products.bulkUpdate);
  
  // Filtered products
  const filteredProducts = products || [];
  
  // Toggle product selection
  const toggleProduct = (id: Id<"products">) => {
    setSelectedProducts(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
  // Select all filtered products
  const selectAll = () => {
    setSelectedProducts(new Set(filteredProducts.map(p => p._id)));
  };
  
  // Clear selection
  const clearSelection = () => {
    setSelectedProducts(new Set());
  };
  
  // Handle save
  const handleSave = async () => {
    if (selectedProducts.size === 0) {
      alert("Vyberte alespoň jeden produkt");
      return;
    }
    
    const value = sectionValues[activeSection];
    if (!value.trim()) {
      alert("Vyplňte obsah pro vybranou sekci");
      return;
    }
    
    setIsSaving(true);
    setSaveProgress({ current: 0, total: selectedProducts.size });
    setSaveResult(null);
    
    try {
      // Handle hashtags specially - convert comma-separated string to array
      let updateValue: string | string[] = value;
      if (activeSection === "hashtags") {
        updateValue = value.split(/[,\s]+/).map(tag => tag.replace(/^#/, "").trim()).filter(Boolean);
      }
      
      const result = await bulkUpdate({
        productIds: Array.from(selectedProducts),
        [activeSection]: updateValue,
      });
      
      setSaveResult({ success: result.success, updated: result.updated });
      
      if (result.success) {
        // Clear selection after successful save
        setSelectedProducts(new Set());
        setSectionValues(prev => ({ ...prev, [activeSection]: "" }));
      }
    } catch (error) {
      console.error("Bulk update error:", error);
      setSaveResult({ success: false, updated: 0 });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Loading state
  if (products === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Načítám produkty...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/" className="hover:text-foreground">Dashboard</Link>
            <span>/</span>
            <span>Hromadná správa</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Hromadná správa materiálů</h1>
          <p className="text-muted-foreground mt-1">Přidejte stejný obsah k více produktům najednou</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel - Product Selection */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
              <h2 className="font-semibold text-foreground mb-4">Výběr produktů</h2>
              
              {/* Search Filter */}
              <div className="mb-4">
                <Input
                  placeholder="Hledat podle názvu..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full"
                />
              </div>
              
              {/* Selection controls */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    Vybrat vše ({filteredProducts.length})
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearSelection}>
                    Zrušit výběr
                  </Button>
                </div>
                <Badge variant="secondary" className="text-sm">
                  Vybráno: {selectedProducts.size}
                </Badge>
              </div>
              
              {/* Product list */}
              <div className="max-h-[500px] overflow-y-auto border border-border rounded-lg">
                {filteredProducts.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <p>Žádné produkty neodpovídají filtrům</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {filteredProducts.map((product) => (
                      <div
                        key={product._id}
                        className={`flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors ${
                          selectedProducts.has(product._id) ? "bg-primary/5" : ""
                        }`}
                        onClick={() => toggleProduct(product._id)}
                      >
                        <Checkbox
                          checked={selectedProducts.has(product._id)}
                          onCheckedChange={() => toggleProduct(product._id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          {product.image ? (
                            <Image
                              src={product.image}
                              alt={product.name}
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              📦
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            {product.category && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0">
                                {product.category}
                              </Badge>
                            )}
                            {product.tier && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0">
                                {product.tier}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {product.quickReferenceCard && (
                          <span className="text-xs text-green-600" title="Má Quick Reference Card">✓</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Right Panel - Editor */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
              <h2 className="font-semibold text-foreground mb-4">Editor materiálu</h2>
              
              {/* Section selector */}
              <div className="mb-4">
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Vyberte sekci k úpravě
                </label>
                <Select value={activeSection} onValueChange={(v) => setActiveSection(v as SectionId)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[400px]">
                    {BULK_SECTIONS.map((section) => (
                      <SelectItem key={section.id} value={section.id}>
                        <span className="flex items-center gap-2">
                          <span>{section.icon}</span>
                          <span>{section.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {BULK_SECTIONS.find(s => s.id === activeSection)?.description}
                </p>
              </div>
              
              {/* Content editor */}
              <div className="mb-4">
                <label className="text-sm font-medium text-foreground mb-2 block">
                  {BULK_SECTIONS.find(s => s.id === activeSection)?.icon} Obsah pro {BULK_SECTIONS.find(s => s.id === activeSection)?.label}
                </label>
                {/* Use Input for URL fields, Textarea for text content */}
                {["socialFacebookImage", "socialInstagramImage", "pdfUrl"].includes(activeSection) ? (
                  <Input
                    type="url"
                    placeholder={activeSection === "pdfUrl" 
                      ? "https://example.com/material.pdf" 
                      : "https://example.com/image.jpg"}
                    value={sectionValues[activeSection]}
                    onChange={(e) => setSectionValues(prev => ({ ...prev, [activeSection]: e.target.value }))}
                    className="font-mono text-sm"
                  />
                ) : activeSection === "hashtags" ? (
                  <div className="space-y-2">
                    <Input
                      placeholder="apotheke, biocaj, zdravi, ceskycaj"
                      value={sectionValues[activeSection]}
                      onChange={(e) => setSectionValues(prev => ({ ...prev, [activeSection]: e.target.value }))}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Zadejte hashtagy oddělené čárkou (bez #)
                    </p>
                  </div>
                ) : (
                  <Textarea
                    placeholder={activeSection === "socialFacebook" 
                      ? "🌿 Text příspěvku pro Facebook...\n\n✨ Proč si produkt zamilujete:\n• Bod 1\n• Bod 2\n\n#hashtag" 
                      : activeSection === "socialInstagram"
                      ? "Text příspěvku pro Instagram 📸\n\nKrátký a výstižný text...\n\n#hashtag #hashtag2"
                      : `Zadejte obsah pro ${BULK_SECTIONS.find(s => s.id === activeSection)?.label}...`}
                    value={sectionValues[activeSection]}
                    onChange={(e) => setSectionValues(prev => ({ ...prev, [activeSection]: e.target.value }))}
                    className="min-h-[300px] font-mono text-sm"
                  />
                )}
              </div>
              
              {/* Save result */}
              {saveResult && (
                <div className={`mb-4 p-3 rounded-lg ${saveResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                  {saveResult.success ? (
                    <p>✓ Úspěšně aktualizováno {saveResult.updated} produktů</p>
                  ) : (
                    <p>✗ Nepodařilo se aktualizovat produkty</p>
                  )}
                </div>
              )}
              
              {/* Save button */}
              <Button
                onClick={handleSave}
                disabled={isSaving || selectedProducts.size === 0 || !sectionValues[activeSection].trim()}
                className="w-full"
                size="lg"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                    Ukládám...
                  </>
                ) : (
                  <>
                    Uložit ke všem vybraným ({selectedProducts.size} produktů)
                  </>
                )}
              </Button>
              
              {selectedProducts.size === 0 && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Vyberte produkty v levém panelu
                </p>
              )}
            </div>
            
            {/* Quick tips */}
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
              <h3 className="font-medium text-amber-800 mb-2">💡 Tip</h3>
              <p className="text-sm text-amber-700">
                Pro Quick Reference Card používejte ASCII formátování - text bude zobrazen přesně tak, jak ho napíšete.
                Můžete použít speciální znaky jako │, ─, ┌, ┐, └, ┘ pro vytvoření tabulek.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
