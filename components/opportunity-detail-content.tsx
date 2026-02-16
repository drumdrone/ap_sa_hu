"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import Image from "next/image";

interface EventSalesKitItem {
  id: string;
  type: "instruction" | "product" | "material" | "tip";
  label: string;
  content: string;
  imageUrl?: string;
  sku?: string;
  productUrl?: string;
}

interface OpportunityProduct {
  _id: Id<"products">;
  name: string;
  price: number;
  image?: string;
  salesClaim?: string;
  externalId?: string;
  productUrl?: string;
}

interface OpportunityPosmItem {
  _id: Id<"posmItems">;
  name: string;
  type: string;
  description?: string;
  imageUrl?: string;
}

type MenuSection = "dashboard" | "products" | "instructions" | "edit";

export function OpportunityDetailContent({ slug }: { slug: string }) {
  const [activeSection, setActiveSection] = useState<MenuSection>("dashboard");
  const opportunity = useQuery(api.opportunities.getBySlug, { slug });
  const allOpportunities = useQuery(api.opportunities.list);
  const seedOpportunities = useMutation(api.opportunities.seedOpportunities);
  const addProduct = useMutation(api.opportunities.addProduct);
  const removeProduct = useMutation(api.opportunities.removeProduct);
  const updateInstructions = useMutation(api.opportunities.updateInstructions);
  const updateTip = useMutation(api.opportunities.updateTip);
  const updateOnlineBanners = useMutation(api.opportunities.updateOnlineBanners);
  const updatePrintFlyers = useMutation(api.opportunities.updatePrintFlyers);
  const sendSalesKitEmail = useMutation(api.emails.sendSalesKitEmail);
  
  // State for product search
  const [productSearch, setProductSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchResults = useQuery(
    api.opportunities.searchProducts,
    debouncedSearch.length >= 2 ? { query: debouncedSearch } : "skip"
  );
  
  // State for editing
  const [isEditingInstructions, setIsEditingInstructions] = useState(false);
  const [instructionsText, setInstructionsText] = useState("");
  const [isEditingTip, setIsEditingTip] = useState(false);
  const [tipText, setTipText] = useState("");
  const [isEditingBanners, setIsEditingBanners] = useState(false);
  const [bannersText, setBannersText] = useState("");
  const [isEditingFlyers, setIsEditingFlyers] = useState(false);
  const [flyersText, setFlyersText] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  
  // Event Sales Kit state
  const [salesKitItems, setSalesKitItems] = useState<EventSalesKitItem[]>([]);
  const [showSalesKit, setShowSalesKit] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  
  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(productSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch]);
  
  // Seed opportunities if needed
  useEffect(() => {
    if (opportunity === null) {
      seedOpportunities();
    }
  }, [opportunity, seedOpportunities]);
  
  // Update local state when opportunity loads
  useEffect(() => {
    if (opportunity) {
      setInstructionsText(opportunity.instructions || "");
      setTipText(opportunity.tip || "");
      setBannersText(opportunity.onlineBanners || "");
      setFlyersText(opportunity.printFlyers || "");
    }
  }, [opportunity]);
  
  // Sales Kit functions
  const addToSalesKit = (item: EventSalesKitItem) => {
    setSalesKitItems(prev => {
      if (prev.find(i => i.id === item.id)) return prev;
      return [...prev, item];
    });
    setShowSalesKit(true);
  };
  
  const removeFromSalesKit = (id: string) => {
    setSalesKitItems(prev => prev.filter(i => i.id !== id));
  };
  
  const isInSalesKit = (id: string) => salesKitItems.some(i => i.id === id);
  
  const exportToTxt = () => {
    if (!opportunity) return;
    const lines: string[] = [
      "═══════════════════════════════════════",
      `EVENT SALES KIT - ${opportunity.name.toUpperCase()}`,
      "═══════════════════════════════════════",
      "",
      `Příležitost: ${opportunity.name}`,
      `Datum: ${opportunity.date}`,
      "",
      "───────────────────────────────────────",
      ""
    ];
    
    salesKitItems.forEach(item => {
      lines.push(`▸ ${item.label.toUpperCase()}`);
      lines.push("");
      lines.push(item.content);
      if (item.sku) lines.push(`SKU: ${item.sku}`);
      if (item.productUrl) lines.push(`E-shop: ${item.productUrl}`);
      lines.push("");
      lines.push("───────────────────────────────────────");
      lines.push("");
    });
    
    lines.push("Vygenerováno: " + new Date().toLocaleString("cs-CZ"));
    
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `event-kit-${slug}-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const makeLinksClickable = (text: string) => {
    const escaped = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const urlRegex = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/g;
    return escaped.replace(urlRegex, (url) => {
      const href = url.startsWith("www.") ? `https://${url}` : url;
      return `<a href="${href}" target="_blank" style="color: #2563eb; text-decoration: underline;">${url}</a>`;
    });
  };
  
  const exportToPdf = () => {
    if (!opportunity) return;
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Event Sales Kit - ${opportunity.name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { color: #2D5A27; border-bottom: 3px solid #2D5A27; padding-bottom: 10px; }
          .meta { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 30px; }
          .meta p { margin: 5px 0; }
          .item { margin-bottom: 25px; page-break-inside: avoid; }
          .item-label { background: #2D5A27; color: white; padding: 8px 15px; font-weight: bold; border-radius: 4px 4px 0 0; }
          .item-content { border: 1px solid #ddd; border-top: none; padding: 15px; white-space: pre-wrap; }
          .item-content a { color: #2563eb; text-decoration: underline; }
          .product-info { display: flex; gap: 15px; align-items: flex-start; }
          .product-image { width: 60px; height: 60px; object-fit: cover; border-radius: 8px; }
          .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <h1>${opportunity.icon} ${opportunity.name}</h1>
        <div class="meta">
          <p><strong>Datum:</strong> ${opportunity.date}</p>
          <p><strong>Položek:</strong> ${salesKitItems.length}</p>
        </div>
        ${salesKitItems.map(item => `
          <div class="item">
            <div class="item-label">${item.label}</div>
            <div class="item-content">
              <div class="product-info">
                ${item.imageUrl ? `<img src="${item.imageUrl}" class="product-image" />` : ""}
                <div>
                  ${makeLinksClickable(item.content)}
                  ${item.sku ? `<p style="margin: 5px 0 0 0; font-size: 11px; color: #6b7280;">SKU: ${item.sku}</p>` : ""}
                  ${item.productUrl ? `<p style="margin: 2px 0 0 0; font-size: 11px;"><a href="${item.productUrl}">Zobrazit na e-shopu →</a></p>` : ""}
                </div>
              </div>
            </div>
          </div>
        `).join("")}
        <div class="footer">
          Vygenerováno: ${new Date().toLocaleString("cs-CZ")} | Apotheke Sales Hub
        </div>
      </body>
      </html>
    `;
    
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 250);
    }
  };
  
  const handleSendEmail = async () => {
    if (!emailTo.trim() || !opportunity) {
      alert("Zadejte email");
      return;
    }
    
    setSendingEmail(true);
    try {
      const content = salesKitItems.map((item, index) => {
        let itemContent = `${index + 1}. ${item.label}\n${item.content}`;
        if (item.sku) itemContent += `\nSKU: ${item.sku}`;
        if (item.productUrl) itemContent += `\nE-shop: ${item.productUrl}`;
        return itemContent + "\n";
      }).join("\n---\n\n");
      
      const header = `EVENT SALES KIT - ${opportunity.name.toUpperCase()}\n${"=".repeat(50)}\nDatum: ${opportunity.date}\nVygenerováno: ${new Date().toLocaleDateString("cs-CZ")}\n\n`;
      
      await sendSalesKitEmail({
        email: emailTo,
        subject: `Event Sales Kit - ${opportunity.name} (${new Date().toLocaleDateString("cs-CZ")})`,
        content: header + content,
      });
      
      setSaveMessage("Email odeslán!");
      setTimeout(() => setSaveMessage(null), 2000);
      setShowEmailDialog(false);
      setEmailTo("");
    } catch (error) {
      console.error("Error sending email:", error);
      alert("Chyba při odesílání emailu");
    } finally {
      setSendingEmail(false);
    }
  };
  
  const handleAddProduct = async (productId: Id<"products">) => {
    if (!opportunity) return;
    try {
      await addProduct({
        opportunityId: opportunity._id,
        productId,
      });
      setProductSearch("");
    } catch (error) {
      console.error("Error adding product:", error);
    }
  };
  
  const handleRemoveProduct = async (productId: Id<"products">) => {
    if (!opportunity) return;
    try {
      await removeProduct({
        opportunityId: opportunity._id,
        productId,
      });
    } catch (error) {
      console.error("Error removing product:", error);
    }
  };
  
  const handleSaveInstructions = async () => {
    if (!opportunity) return;
    try {
      await updateInstructions({
        opportunityId: opportunity._id,
        instructions: instructionsText,
      });
      setIsEditingInstructions(false);
      setSaveMessage("Uloženo!");
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (error) {
      console.error("Error saving instructions:", error);
    }
  };
  
  const handleSaveTip = async () => {
    if (!opportunity) return;
    try {
      await updateTip({
        opportunityId: opportunity._id,
        tip: tipText,
      });
      setIsEditingTip(false);
      setSaveMessage("Uloženo!");
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (error) {
      console.error("Error saving tip:", error);
    }
  };
  
  const handleSaveBanners = async () => {
    if (!opportunity) return;
    try {
      await updateOnlineBanners({
        opportunityId: opportunity._id,
        onlineBanners: bannersText,
      });
      setIsEditingBanners(false);
      setSaveMessage("Uloženo!");
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (error) {
      console.error("Error saving banners:", error);
    }
  };
  
  const handleSaveFlyers = async () => {
    if (!opportunity) return;
    try {
      await updatePrintFlyers({
        opportunityId: opportunity._id,
        printFlyers: flyersText,
      });
      setIsEditingFlyers(false);
      setSaveMessage("Uloženo!");
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (error) {
      console.error("Error saving flyers:", error);
    }
  };
  
  // Cast products and posmItems to proper types
  const products = (opportunity?.products ?? []) as OpportunityProduct[];
  
  // Get adjacent opportunities for navigation
  const adjacentOpportunities = (() => {
    if (!allOpportunities || !opportunity) return null;
    const currentIndex = allOpportunities.findIndex(o => o._id === opportunity._id);
    return {
      prev: currentIndex > 0 ? allOpportunities[currentIndex - 1] : null,
      next: currentIndex < allOpportunities.length - 1 ? allOpportunities[currentIndex + 1] : null,
    };
  })();
  
  // Loading state
  if (opportunity === undefined) {
    return (
      <div className="min-h-screen bg-background flex">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground">Načítám příležitost...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Not found - try seeding
  if (opportunity === null) {
    return (
      <div className="min-h-screen bg-background flex">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground">Připravuji příležitosti...</p>
          </div>
        </div>
      </div>
    );
  }
  
  const menuItems = [
    { id: "dashboard" as const, label: "Dashboard", icon: "🏠" },
    { id: "products" as const, label: "Produkty", icon: "🍵" },
    { id: "instructions" as const, label: "Pokyny", icon: "📋" },
    { id: "edit" as const, label: "Editovat", icon: "✏️" },
  ];
  
  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Sidebar Menu */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        {/* Logo / Back */}
        <div className="p-4 border-b border-border">
          <Link
            href="/"
            className="flex items-center gap-2 text-primary font-semibold hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground text-sm">🍃</span>
            </div>
            <span>Apotheke Hub</span>
          </Link>
        </div>

        {/* Opportunity Mini Card */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0 flex items-center justify-center">
              <span className="text-2xl">{opportunity.icon}</span>
            </div>
            <div className="min-w-0">
              <p className="font-medium text-foreground text-sm truncate">{opportunity.name}</p>
              <p className="text-xs text-muted-foreground">{opportunity.date}</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1 ${
                activeSection === item.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Opportunity Navigation */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            {adjacentOpportunities?.prev ? (
              <Link
                href={`/prilezitost/${adjacentOpportunities.prev.slug}`}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-2 text-xs text-muted-foreground hover:text-foreground bg-muted rounded-lg transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Předchozí
              </Link>
            ) : (
              <div className="flex-1" />
            )}
            {adjacentOpportunities?.next ? (
              <Link
                href={`/prilezitost/${adjacentOpportunities.next.slug}`}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-2 text-xs text-muted-foreground hover:text-foreground bg-muted rounded-lg transition-colors"
              >
                Další
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <div className="flex-1" />
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8 max-w-6xl">
          {/* Save Message Toast */}
          {saveMessage && (
            <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
              {saveMessage}
            </div>
          )}
          
          {activeSection === "dashboard" && (
            <div className="space-y-6">
              {/* Hero Section */}
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  {/* Large Icon */}
                  <div className={`w-full md:w-80 h-64 md:h-80 bg-gradient-to-br ${opportunity.color} flex-shrink-0 flex items-center justify-center`}>
                    <span className="text-9xl">{opportunity.icon}</span>
                  </div>
                  {/* Opportunity Info */}
                  <div className="flex-1 p-6 md:p-8 flex flex-col justify-center">
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
                        📅 {opportunity.date}
                      </Badge>
                      {products.length > 0 && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 border-0">
                          {products.length} {products.length === 1 ? "produkt" : products.length < 5 ? "produkty" : "produktů"}
                        </Badge>
                      )}
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">{opportunity.name}</h1>
                    <p className="text-lg text-muted-foreground mb-4">{opportunity.description}</p>
                    {opportunity.tip && (
                      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <span className="text-lg">💡</span>
                        <p className="text-sm text-amber-800">{opportunity.tip}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Two Column Layout: Available Materials + Quick Actions */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Left Column - Available Materials */}
                <div className="bg-card border border-border rounded-xl overflow-hidden h-full">
                  <div className="p-4 border-b border-border bg-muted/30">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <span className="text-xl">📦</span>
                        Dostupné materiály 
                        {(opportunity.instructions || opportunity.tip || products.length > 0) && (
                          <span className="text-green-600">
                            ({(opportunity.instructions ? 1 : 0) + (opportunity.tip ? 1 : 0) + products.length})
                          </span>
                        )}
                      </h2>
                      {(opportunity.instructions || opportunity.tip || products.length > 0) && (
                        <button
                          onClick={() => {
                            // Add all available materials to sales kit
                            if (opportunity.instructions) {
                              addToSalesKit({
                                id: "instructions",
                                type: "instruction",
                                label: "Pokyny k akci",
                                content: opportunity.instructions,
                              });
                            }
                            if (opportunity.tip) {
                              addToSalesKit({
                                id: "tip",
                                type: "tip",
                                label: "Tip pro prodejce",
                                content: opportunity.tip,
                              });
                            }
                            products.forEach((product) => {
                              addToSalesKit({
                                id: `product-${product._id}`,
                                type: "product",
                                label: product.name,
                                content: `${product.name}\nCena: ${product.price} Kč${product.salesClaim ? `\n${product.salesClaim}` : ""}`,
                                imageUrl: product.image,
                                sku: product.externalId,
                                productUrl: product.productUrl,
                              });
                            });
                            setSaveMessage("Všechny materiály přidány do Event Kit!");
                            setTimeout(() => setSaveMessage(null), 2000);
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Celý balíček
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {/* Instructions Alert */}
                    {opportunity.instructions && (
                      <div className="rounded-lg p-3 border bg-green-50 border-green-200">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-green-100">
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground mb-1">Pokyny k akci</p>
                            <p className="text-sm font-medium leading-snug text-green-800 line-clamp-2">
                              {opportunity.instructions.substring(0, 100)}{opportunity.instructions.length > 100 ? "..." : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2 ml-11">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(opportunity.instructions || "");
                              setSaveMessage("Pokyny zkopírovány!");
                              setTimeout(() => setSaveMessage(null), 2000);
                            }}
                            className="px-3 py-1.5 rounded text-xs font-medium transition-colors bg-green-600 text-white hover:bg-green-700"
                          >
                            Kopírovat
                          </button>
                          <button
                            onClick={() => addToSalesKit({
                              id: "instructions",
                              type: "instruction",
                              label: "Pokyny k akci",
                              content: opportunity.instructions || "",
                            })}
                            className={`px-2 py-1.5 rounded text-xs font-bold transition-colors ${
                              isInSalesKit("instructions")
                                ? "bg-primary text-primary-foreground"
                                : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
                            }`}
                            title="Přidat do Event Kit"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Tip Alert */}
                    {opportunity.tip && (
                      <div className="rounded-lg p-3 border bg-amber-50 border-amber-200">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-amber-100">
                            <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6A4.997 4.997 0 017 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z"/>
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground mb-1">Tip pro prodejce</p>
                            <p className="text-sm font-medium leading-snug text-amber-800">
                              {opportunity.tip}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2 ml-11">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(opportunity.tip || "");
                              setSaveMessage("Tip zkopírován!");
                              setTimeout(() => setSaveMessage(null), 2000);
                            }}
                            className="px-3 py-1.5 rounded text-xs font-medium transition-colors bg-amber-500 text-white hover:bg-amber-600"
                          >
                            Kopírovat
                          </button>
                          <button
                            onClick={() => addToSalesKit({
                              id: "tip",
                              type: "tip",
                              label: "Tip pro prodejce",
                              content: opportunity.tip || "",
                            })}
                            className={`px-2 py-1.5 rounded text-xs font-bold transition-colors ${
                              isInSalesKit("tip")
                                ? "bg-primary text-primary-foreground"
                                : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
                            }`}
                            title="Přidat do Event Kit"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Products Alerts */}
                    {products.map((product) => (
                      <div key={product._id} className="rounded-lg p-3 border bg-green-50 border-green-200">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-lg bg-white overflow-hidden flex-shrink-0">
                            {product.image ? (
                              <Image
                                src={product.image}
                                alt={product.name}
                                width={48}
                                height={48}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                🍵
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground mb-1">Produkt k propagaci</p>
                            <p className="text-sm font-medium leading-snug text-green-800 truncate">
                              {product.name}
                            </p>
                            <p className="text-xs text-green-700">{product.price} Kč</p>
                            {product.externalId && (
                              <p className="text-xs text-muted-foreground">SKU: {product.externalId}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2 ml-11">
                          <Link
                            href={`/product/${product._id}`}
                            className="px-3 py-1.5 rounded text-xs font-medium transition-colors bg-green-600 text-white hover:bg-green-700"
                          >
                            Detail
                          </Link>
                          {product.productUrl && (
                            <a
                              href={product.productUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded text-xs font-medium transition-colors bg-white border border-green-300 text-green-700 hover:bg-green-50"
                            >
                              E-shop →
                            </a>
                          )}
                          <button
                            onClick={() => addToSalesKit({
                              id: `product-${product._id}`,
                              type: "product",
                              label: product.name,
                              content: `${product.name}\nCena: ${product.price} Kč${product.salesClaim ? `\n${product.salesClaim}` : ""}`,
                              imageUrl: product.image,
                              sku: product.externalId,
                              productUrl: product.productUrl,
                            })}
                            className={`px-2 py-1.5 rounded text-xs font-bold transition-colors ${
                              isInSalesKit(`product-${product._id}`)
                                ? "bg-primary text-primary-foreground"
                                : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
                            }`}
                            title="Přidat do Event Kit"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {/* Empty state */}
                    {!opportunity.instructions && !opportunity.tip && products.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                          </svg>
                        </div>
                        <h3 className="font-semibold text-gray-600">Zatím žádné materiály</h3>
                        <p className="text-sm text-muted-foreground">Přidejte pokyny nebo produkty k propagaci.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column - Quick Actions */}
                <div className="bg-card border border-border rounded-xl overflow-hidden h-full">
                  <div className="p-4 border-b border-border bg-muted/30">
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <span className="text-xl">⚡</span>
                      Rychlé akce
                    </h2>
                  </div>
                  <div className="p-4 space-y-3">
                    {/* Instructions Card */}
                    <div className={`w-full rounded-xl transition-colors ${
                      opportunity.instructions
                        ? "bg-gray-800 border border-gray-700"
                        : "bg-gray-50 border-2 border-dashed border-gray-300"
                    }`}>
                      <div className="flex items-center gap-4 p-4">
                        <button
                          onClick={() => setActiveSection("instructions")}
                          className="flex items-center gap-4 flex-1 text-left hover:opacity-80 transition-opacity"
                        >
                          <div className="relative flex-shrink-0">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                              opportunity.instructions ? "bg-gray-700" : "bg-gray-200"
                            }`}>
                              <span className="text-2xl">📋</span>
                            </div>
                            <span className="absolute -top-1 -left-1 w-5 h-5 bg-green-500 text-white text-xs font-bold rounded-full flex items-center justify-center">1</span>
                          </div>
                          <div className="flex-1">
                            <p className={`font-semibold flex items-center gap-2 ${opportunity.instructions ? "text-green-400" : "text-foreground"}`}>
                              Pokyny k akci
                              {opportunity.instructions && (
                                <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">✓</span>
                              )}
                            </p>
                            <p className={`text-sm ${opportunity.instructions ? "text-gray-400" : "text-muted-foreground"}`}>
                              {opportunity.instructions 
                                ? "Zobrazit pokyny pro prodejce" 
                                : "Pokyny nejsou vyplněny"}
                            </p>
                          </div>
                          <svg className={`w-5 h-5 ${opportunity.instructions ? "text-gray-500" : "text-muted-foreground"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        {opportunity.instructions && (
                          <button
                            onClick={() => addToSalesKit({
                              id: "instructions",
                              type: "instruction",
                              label: "Pokyny k akci",
                              content: opportunity.instructions || ""
                            })}
                            className={`p-2 rounded-lg transition-colors ${
                              isInSalesKit("instructions")
                                ? "bg-green-500 text-white"
                                : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                            }`}
                            title="Přidat do Event Kit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Products Card */}
                    <div className={`w-full rounded-xl transition-colors ${
                      products.length > 0
                        ? "bg-purple-50 border border-purple-200"
                        : "bg-gray-50 border-2 border-dashed border-gray-300"
                    }`}>
                      <div className="flex items-center gap-4 p-4">
                        <button
                          onClick={() => setActiveSection("products")}
                          className="flex items-center gap-4 flex-1 text-left hover:opacity-80 transition-opacity"
                        >
                          <div className="relative flex-shrink-0">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                              products.length > 0 ? "bg-purple-100" : "bg-gray-200"
                            }`}>
                              <span className="text-2xl">🍵</span>
                            </div>
                            <span className="absolute -top-1 -left-1 w-5 h-5 bg-foreground text-background text-xs font-bold rounded-full flex items-center justify-center">2</span>
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-foreground flex items-center gap-2">
                              Produkty k propagaci
                              {products.length > 0 && (
                                <span className="text-xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full">{products.length}</span>
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {products.length > 0 
                                ? "Spravovat přiřazené produkty" 
                                : "Zatím žádné produkty - přidejte první!"}
                            </p>
                          </div>
                          <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Tip Card */}
                    <div className={`w-full rounded-xl transition-colors ${
                      opportunity.tip
                        ? "bg-amber-50 border border-amber-200"
                        : "bg-gray-50 border-2 border-dashed border-gray-300"
                    }`}>
                      <div className="flex items-center gap-4 p-4">
                        <button
                          onClick={() => setActiveSection("edit")}
                          className="flex items-center gap-4 flex-1 text-left hover:opacity-80 transition-opacity"
                        >
                          <div className="relative flex-shrink-0">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                              opportunity.tip ? "bg-amber-100" : "bg-gray-200"
                            }`}>
                              <span className="text-2xl">💡</span>
                            </div>
                            <span className="absolute -top-1 -left-1 w-5 h-5 bg-foreground text-background text-xs font-bold rounded-full flex items-center justify-center">3</span>
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-foreground flex items-center gap-2">
                              Tip pro prodejce
                              {opportunity.tip && (
                                <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">✓</span>
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {opportunity.tip 
                                ? opportunity.tip.substring(0, 40) + (opportunity.tip.length > 40 ? "..." : "")
                                : "Tip není vyplněn"}
                            </p>
                          </div>
                          <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        {opportunity.tip && (
                          <button
                            onClick={() => addToSalesKit({
                              id: "tip",
                              type: "tip",
                              label: "Tip pro prodejce",
                              content: opportunity.tip || ""
                            })}
                            className={`p-2 rounded-lg transition-colors ${
                              isInSalesKit("tip")
                                ? "bg-green-500 text-white"
                                : "bg-amber-100 hover:bg-amber-200 text-amber-700"
                            }`}
                            title="Přidat do Event Kit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Online Banners Card */}
                    <div className={`w-full rounded-xl transition-colors ${
                      opportunity.onlineBanners
                        ? "bg-blue-50 border border-blue-200"
                        : "bg-gray-50 border-2 border-dashed border-gray-300"
                    }`}>
                      {isEditingBanners ? (
                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-foreground">🖼️ Online bannery</p>
                            <button onClick={() => setIsEditingBanners(false)} className="text-muted-foreground hover:text-foreground">✕</button>
                          </div>
                          <Textarea
                            value={bannersText}
                            onChange={(e) => setBannersText(e.target.value)}
                            placeholder="Vložte odkazy na bannery nebo popis..."
                            className="w-full min-h-[150px] resize-none"
                          />
                          <Button onClick={handleSaveBanners} className="bg-blue-600 hover:bg-blue-700">
                            Uložit
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 p-4">
                          <button
                            onClick={() => setIsEditingBanners(true)}
                            className="flex items-center gap-4 flex-1 text-left hover:opacity-80 transition-opacity"
                          >
                            <div className="relative flex-shrink-0">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                opportunity.onlineBanners ? "bg-blue-100" : "bg-gray-200"
                              }`}>
                                <span className="text-2xl">🖼️</span>
                              </div>
                              <span className="absolute -top-1 -left-1 w-5 h-5 bg-foreground text-background text-xs font-bold rounded-full flex items-center justify-center">4</span>
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-foreground flex items-center gap-2">
                                Online bannery
                                {opportunity.onlineBanners && (
                                  <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">✓</span>
                                )}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {opportunity.onlineBanners 
                                  ? opportunity.onlineBanners.substring(0, 40) + (opportunity.onlineBanners.length > 40 ? "..." : "")
                                  : "Odkazy na online bannery"}
                              </p>
                            </div>
                            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                          {opportunity.onlineBanners && (
                            <button
                              onClick={() => addToSalesKit({
                                id: "onlineBanners",
                                type: "material",
                                label: "Online bannery",
                                content: opportunity.onlineBanners || ""
                              })}
                              className={`p-2 rounded-lg transition-colors ${
                                isInSalesKit("onlineBanners")
                                  ? "bg-green-500 text-white"
                                  : "bg-blue-100 hover:bg-blue-200 text-blue-700"
                              }`}
                              title="Přidat do Event Kit"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Print Flyers Card */}
                    <div className={`w-full rounded-xl transition-colors ${
                      opportunity.printFlyers
                        ? "bg-orange-50 border border-orange-200"
                        : "bg-gray-50 border-2 border-dashed border-gray-300"
                    }`}>
                      {isEditingFlyers ? (
                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-foreground">📄 Tiskové letáky</p>
                            <button onClick={() => setIsEditingFlyers(false)} className="text-muted-foreground hover:text-foreground">✕</button>
                          </div>
                          <Textarea
                            value={flyersText}
                            onChange={(e) => setFlyersText(e.target.value)}
                            placeholder="Vložte odkazy na letáky nebo popis..."
                            className="w-full min-h-[150px] resize-none"
                          />
                          <Button onClick={handleSaveFlyers} className="bg-orange-600 hover:bg-orange-700">
                            Uložit
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 p-4">
                          <button
                            onClick={() => setIsEditingFlyers(true)}
                            className="flex items-center gap-4 flex-1 text-left hover:opacity-80 transition-opacity"
                          >
                            <div className="relative flex-shrink-0">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                opportunity.printFlyers ? "bg-orange-100" : "bg-gray-200"
                              }`}>
                                <span className="text-2xl">📄</span>
                              </div>
                              <span className="absolute -top-1 -left-1 w-5 h-5 bg-foreground text-background text-xs font-bold rounded-full flex items-center justify-center">5</span>
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-foreground flex items-center gap-2">
                                Tiskové letáky
                                {opportunity.printFlyers && (
                                  <span className="text-xs bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full">✓</span>
                                )}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {opportunity.printFlyers 
                                  ? opportunity.printFlyers.substring(0, 40) + (opportunity.printFlyers.length > 40 ? "..." : "")
                                  : "Odkazy na tiskové letáky"}
                              </p>
                            </div>
                            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                          {opportunity.printFlyers && (
                            <button
                              onClick={() => addToSalesKit({
                                id: "printFlyers",
                                type: "material",
                                label: "Tiskové letáky",
                                content: opportunity.printFlyers || ""
                              })}
                              className={`p-2 rounded-lg transition-colors ${
                                isInSalesKit("printFlyers")
                                  ? "bg-green-500 text-white"
                                  : "bg-orange-100 hover:bg-orange-200 text-orange-700"
                              }`}
                              title="Přidat do Event Kit"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "products" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-foreground">Produkty k propagaci</h2>
              
              {/* Product Search */}
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="font-semibold mb-3">Přidat produkt</h3>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Hledat produkt pro přidání..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pr-10"
                  />
                  <svg
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  
                  {/* Search Results */}
                  {searchResults && searchResults.length > 0 && productSearch.length >= 2 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                      {searchResults.map((product) => {
                        const isAlreadyAdded = products.some(p => p._id === product._id);
                        return (
                          <button
                            key={product._id}
                            className={`w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left ${isAlreadyAdded ? "opacity-50" : ""}`}
                            onClick={() => !isAlreadyAdded && handleAddProduct(product._id)}
                            disabled={isAlreadyAdded}
                          >
                            {product.image && (
                              <img src={product.image} alt={product.name} className="w-10 h-10 rounded-lg object-cover" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground truncate">{product.name}</p>
                              <p className="text-sm text-muted-foreground">{product.price} Kč</p>
                            </div>
                            {isAlreadyAdded ? (
                              <Badge variant="secondary">Přidáno</Badge>
                            ) : (
                              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Products List */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/30">
                  <h3 className="font-semibold">Přiřazené produkty ({products.length})</h3>
                </div>
                <div className="divide-y divide-border">
                  {products.length > 0 ? products.map((product) => (
                    <div key={product._id} className="flex items-center gap-4 p-4">
                      {product.image && (
                        <Image src={product.image} alt={product.name} width={64} height={64} className="w-16 h-16 rounded-lg object-cover" />
                      )}
                      <div className="flex-1 min-w-0">
                        <Link href={`/product/${product._id}`} className="font-medium text-foreground hover:text-primary truncate block">
                          {product.name}
                        </Link>
                        <p className="text-sm text-muted-foreground">{product.price} Kč</p>
                        {product.externalId && <p className="text-xs text-muted-foreground">SKU: {product.externalId}</p>}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addToSalesKit({
                            id: `product-${product._id}`,
                            type: "product",
                            label: product.name,
                            content: `${product.name}\nCena: ${product.price} Kč${product.salesClaim ? `\n${product.salesClaim}` : ""}`,
                            imageUrl: product.image,
                            sku: product.externalId,
                            productUrl: product.productUrl,
                          })}
                          className={isInSalesKit(`product-${product._id}`) ? "bg-primary text-primary-foreground" : ""}
                        >
                          {isInSalesKit(`product-${product._id}`) ? "✓ V Kitu" : "+ Do Kitu"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => handleRemoveProduct(product._id)}
                        >
                          Odebrat
                        </Button>
                      </div>
                    </div>
                  )) : (
                    <div className="p-8 text-center text-muted-foreground">
                      Zatím žádné produkty. Použijte vyhledávání výše pro přidání.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSection === "instructions" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-foreground">Pokyny k akci</h2>
              
              <div className="bg-card border border-border rounded-xl p-6">
                {isEditingInstructions ? (
                  <div className="space-y-4">
                    <Textarea
                      value={instructionsText}
                      onChange={(e) => setInstructionsText(e.target.value)}
                      placeholder="Napište pokyny pro prodejce..."
                      className="min-h-[200px]"
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleSaveInstructions}>Uložit pokyny</Button>
                      <Button variant="ghost" onClick={() => {
                        setIsEditingInstructions(false);
                        setInstructionsText(opportunity.instructions || "");
                      }}>
                        Zrušit
                      </Button>
                    </div>
                  </div>
                ) : opportunity.instructions ? (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">Aktuální pokyny</h3>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setIsEditingInstructions(true)}>
                          ✏️ Upravit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addToSalesKit({
                            id: "instructions",
                            type: "instruction",
                            label: "Pokyny k akci",
                            content: opportunity.instructions || "",
                          })}
                          className={isInSalesKit("instructions") ? "bg-primary text-primary-foreground" : ""}
                        >
                          {isInSalesKit("instructions") ? "✓ V Kitu" : "+ Do Kitu"}
                        </Button>
                      </div>
                    </div>
                    <p className="text-foreground whitespace-pre-wrap">{opportunity.instructions}</p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">Zatím žádné pokyny.</p>
                    <Button onClick={() => setIsEditingInstructions(true)}>
                      + Přidat pokyny
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === "edit" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-foreground">Upravit příležitost</h2>
              
              {/* Instructions */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-semibold mb-4">Pokyny k akci</h3>
                <Textarea
                  value={instructionsText}
                  onChange={(e) => setInstructionsText(e.target.value)}
                  placeholder="Napište pokyny pro prodejce..."
                  className="min-h-[150px] mb-4"
                />
                <Button onClick={handleSaveInstructions}>Uložit pokyny</Button>
              </div>
              
              {/* Tip */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-semibold mb-4">Tip pro prodejce</h3>
                <Input
                  value={tipText}
                  onChange={(e) => setTipText(e.target.value)}
                  placeholder="Rychlý tip pro prodejce..."
                  className="mb-4"
                />
                <Button onClick={handleSaveTip}>Uložit tip</Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Floating Sales Kit Panel */}
      {showSalesKit && salesKitItems.length > 0 && (
        <div className="fixed bottom-4 right-4 w-80 bg-card border-2 border-primary rounded-xl shadow-xl z-50">
          <div className="p-4 border-b border-border bg-primary/5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <span>📦</span>
                Event Sales Kit
                <Badge variant="secondary" className="bg-primary text-primary-foreground">{salesKitItems.length}</Badge>
              </h3>
              <button
                onClick={() => setShowSalesKit(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="p-4 max-h-[300px] overflow-y-auto space-y-2">
            {salesKitItems.map((item) => (
              <div key={item.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                {item.imageUrl ? (
                  <Image src={item.imageUrl} alt={item.label} width={32} height={32} className="w-8 h-8 rounded object-cover" />
                ) : (
                  <span className="text-lg">
                    {item.type === "instruction" ? "📋" : item.type === "product" ? "🍵" : item.type === "material" ? "📄" : "💡"}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.label}</p>
                  {item.sku && <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>}
                </div>
                <button
                  onClick={() => removeFromSalesKit(item.id)}
                  className="text-muted-foreground hover:text-red-500"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-border bg-muted/30">
            <div className="grid grid-cols-3 gap-2">
              <Button size="sm" variant="outline" onClick={exportToTxt}>TXT</Button>
              <Button size="sm" variant="outline" onClick={exportToPdf}>PDF</Button>
              <Button size="sm" className="bg-primary text-primary-foreground" onClick={() => setShowEmailDialog(true)}>
                Email
              </Button>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="w-full mt-2 text-red-500 hover:text-red-600"
              onClick={() => setSalesKitItems([])}
            >
              Vyprázdnit kit
            </Button>
          </div>
        </div>
      )}

      {/* Show Sales Kit button when hidden */}
      {!showSalesKit && salesKitItems.length > 0 && (
        <button
          onClick={() => setShowSalesKit(true)}
          className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 hover:bg-primary/90 transition-colors z-50"
        >
          <span>📦</span>
          Event Sales Kit
          <Badge variant="secondary" className="bg-white text-primary">{salesKitItems.length}</Badge>
        </button>
      )}

      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Odeslat Event Sales Kit emailem</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email příjemce</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Odešle {salesKitItems.length} {salesKitItems.length === 1 ? "položku" : salesKitItems.length < 5 ? "položky" : "položek"} z Event Kitu.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowEmailDialog(false)}>Zrušit</Button>
            <Button onClick={handleSendEmail} disabled={sendingEmail}>
              {sendingEmail ? "Odesílám..." : "Odeslat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
