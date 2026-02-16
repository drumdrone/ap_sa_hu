"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { CategoryBadge } from "@/components/ui/category-badge";
import { TierBadge } from "@/components/ui/tier-badge";
import { BrandPillarBadge } from "@/components/ui/brand-pillar-badge";
import { CopyButton } from "@/components/copy-button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type MenuSection = "dashboard" | "eshop" | "marketing" | "social" | "gallery" | "materials" | "edit";
type MobileView = "product" | "data";

interface ProductDetailContentProps {
  productId: Id<"products">;
}

// To-do items for sales team
const todoItems = [
  { id: "post-fb", label: "Vytvořit příspěvek na Facebook", priority: "high" },
  { id: "post-ig", label: "Vytvořit příspěvek na Instagram", priority: "high" },
  { id: "update-web", label: "Aktualizovat produktovou stránku", priority: "medium" },
  { id: "send-newsletter", label: "Zahrnout do newsletteru", priority: "medium" },
  { id: "train-team", label: "Proškolit prodejní tým", priority: "low" },
  { id: "review-materials", label: "Zkontrolovat marketingové materiály", priority: "low" },
];

type QuickActionPanel = "social" | "materials" | "edit" | "gallery" | "referenceCard" | "promotionHistory" | null;
type InlineEdit =
  | "gallery"
  | "social"
  | "socialImages"
  | "materials"
  | "eshop"
  | "presentation"
  | "referenceCard"
  | "faq"
  | "salesForecast"
  | "articles"
  | "mainBenefits"
  | "herbComposition"
  | "competitionComparison"
  | "seasonalOpportunities"
  | "sensoryProfile"
  | null;

export function ProductDetailContent({ productId }: ProductDetailContentProps) {
  const [activeSection, setActiveSection] = useState<MenuSection>("dashboard");
  const [mobileView, setMobileView] = useState<MobileView>("product");
  const [completedTodos, setCompletedTodos] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [openPanel, setOpenPanel] = useState<QuickActionPanel>(null);
  
  // Inline edit state
  const [inlineEdit, setInlineEdit] = useState<InlineEdit>(null);
  const [inlineValue, setInlineValue] = useState("");
  const [editingFaq, setEditingFaq] = useState<{ question: string; answer: string }[]>([]);
  const [editingArticles, setEditingArticles] = useState<{ title: string; url: string }[]>([]);
  
  // Gallery state
  const [isUploading, setIsUploading] = useState(false);
  const [newImageTags, setNewImageTags] = useState("");
  const [selectedGalleryTag, setSelectedGalleryTag] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inlineFileInputRef = useRef<HTMLInputElement>(null);
  
  // Lightbox state for gallery
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  
  const product = useQuery(api.products.getById, { id: productId });
  const adjacentProducts = useQuery(api.products.getAdjacentProducts, { currentId: productId });
  const updateMarketingData = useMutation(api.products.updateMarketingData);
  
  // Gallery queries and mutations
  const galleryImages = useQuery(api.gallery.listByProduct, { productId, tag: selectedGalleryTag });
  const galleryTags = useQuery(api.gallery.getTagsByProduct, { productId });
  const generateUploadUrl = useMutation(api.gallery.generateUploadUrl);
  const saveImage = useMutation(api.gallery.saveImage);
  const deleteImage = useMutation(api.gallery.deleteImage);
  const savePdfToProduct = useMutation(api.gallery.savePdfToProduct);
  
  // Top product mutations
  const toggleTopProduct = useMutation(api.products.toggleTopProduct);
  const setTopOrder = useMutation(api.products.setTopOrder);
  const topProducts = useQuery(api.products.getTopProducts);
  
  // Promotion logs
  const promotionLogs = useQuery(api.promotionLogs.getByProduct, { productId });
  const addPromotionLog = useMutation(api.promotionLogs.add);
  const removePromotionLog = useMutation(api.promotionLogs.remove);
  const [newLogTitle, setNewLogTitle] = useState("");
  const [newLogDate, setNewLogDate] = useState("");
  const [newLogUrl, setNewLogUrl] = useState("");
  
  // Sales Kit - items to export
  type SalesKitItem = {
    id: string;
    type: "claim" | "reference" | "gallery" | "social" | "materials" | "whybuy";
    label: string;
    content: string;
  };
  const [salesKitItems, setSalesKitItems] = useState<SalesKitItem[]>([]);
  const [showSalesKit, setShowSalesKit] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  
  const sendSalesKitEmail = useMutation(api.emails.sendSalesKitEmail);
  
  // Lightbox functions for gallery
  const lightboxImages = galleryImages?.filter(img => img.url).map(img => img.url!) || [];
  
  const handleOpenLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };
  
  const handleLightboxPrev = () => {
    setLightboxIndex(prev => (prev > 0 ? prev - 1 : lightboxImages.length - 1));
  };
  
  const handleLightboxNext = () => {
    setLightboxIndex(prev => (prev < lightboxImages.length - 1 ? prev + 1 : 0));
  };
  
  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxOpen(false);
      } else if (e.key === "ArrowLeft") {
        handleLightboxPrev();
      } else if (e.key === "ArrowRight") {
        handleLightboxNext();
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, lightboxImages.length]);
  
  const addToSalesKit = (item: SalesKitItem) => {
    setSalesKitItems(prev => {
      if (prev.find(i => i.id === item.id)) return prev;
      return [...prev, item];
    });
    setShowSalesKit(true);
  };
  
  const removeFromSalesKit = (id: string) => {
    setSalesKitItems(prev => prev.filter(i => i.id !== id));
  };
  
  const exportSalesKitToTxt = () => {
    if (!product || salesKitItems.length === 0) return;
    const lines: string[] = [
      "═══════════════════════════════════════",
      `PRODEJNÍ MATERIÁLY - ${product.name}`,
      "═══════════════════════════════════════",
      "",
      `Produkt: ${product.name}`,
      `Kód: ${product.externalId || productId}`,
      `Cena: ${product.price} Kč`,
      "",
      "───────────────────────────────────────",
      ""
    ];
    
    salesKitItems.forEach(item => {
      lines.push(`▸ ${item.label.toUpperCase()}`);
      lines.push("");
      lines.push(item.content);
      lines.push("");
      lines.push("───────────────────────────────────────");
      lines.push("");
    });
    
    lines.push("Vygenerováno: " + new Date().toLocaleString("cs-CZ"));
    
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${product.name.replace(/[^a-zA-Z0-9]/g, "_")}_sales_kit.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const exportSalesKitToPdf = async () => {
    if (!product || salesKitItems.length === 0) return;
    
    // Helper to convert URLs to clickable links
    const makeLinksClickable = (text: string) => {
      const escaped = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      // Match URLs (http, https, www)
      const urlRegex = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/g;
      return escaped.replace(urlRegex, (url) => {
        const href = url.startsWith("www.") ? `https://${url}` : url;
        return `<a href="${href}" target="_blank" style="color: #2563eb; text-decoration: underline;">${url}</a>`;
      });
    };
    
    // Create a printable HTML and open print dialog
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Sales Kit - ${product.name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { color: #2D5A27; border-bottom: 3px solid #2D5A27; padding-bottom: 10px; }
          .meta { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 30px; }
          .meta p { margin: 5px 0; }
          .item { margin-bottom: 25px; page-break-inside: avoid; }
          .item-label { background: #2D5A27; color: white; padding: 8px 15px; font-weight: bold; border-radius: 4px 4px 0 0; }
          .item-content { border: 1px solid #ddd; border-top: none; padding: 15px; white-space: pre-wrap; font-family: 'Courier New', Courier, monospace; font-size: 11px; line-height: 1.3; }
          .item-content a { color: #2563eb; text-decoration: underline; }
          .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
          @media print { body { padding: 20px; } .item-content a { color: #2563eb; } }
        </style>
      </head>
      <body>
        <h1>🍃 ${product.name}</h1>
        <div class="meta">
          <p><strong>Kód produktu:</strong> ${product.externalId || productId}</p>
          <p><strong>Cena:</strong> ${product.price} Kč</p>
          ${product.category ? `<p><strong>Kategorie:</strong> ${product.category}</p>` : ""}
        </div>
        ${salesKitItems.map(item => `
          <div class="item">
            <div class="item-label">${item.label}</div>
            <div class="item-content">${makeLinksClickable(item.content)}</div>
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

  const toggleTodo = (id: string) => {
    setCompletedTodos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Inline edit save handler
  const handleInlineSave = async (field: string, value: string) => {
    setIsSaving(true);
    try {
      await updateMarketingData({
        id: productId,
        [field]: value || undefined,
      });
      setInlineEdit(null);
      setInlineValue("");
    } catch (error) {
      console.error("Error saving inline edit:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // FAQ save handler
  const handleFaqSave = async () => {
    setIsSaving(true);
    try {
      const filteredFaq = editingFaq.filter(item => item.question.trim() && item.answer.trim());
      await updateMarketingData({
        id: productId,
        faq: filteredFaq.length > 0 ? filteredFaq : undefined,
      });
      setInlineEdit(null);
      setEditingFaq([]);
    } catch (error) {
      console.error("Error saving FAQ:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Articles save handler
  const handleArticlesSave = async () => {
    setIsSaving(true);
    try {
      const filteredArticles = editingArticles.filter(item => item.title.trim() && item.url.trim());
      await updateMarketingData({
        id: productId,
        articleUrls: filteredArticles.length > 0 ? filteredArticles : undefined,
      });
      setInlineEdit(null);
      setEditingArticles([]);
    } catch (error) {
      console.error("Error saving articles:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Inline image upload handler
  const handleInlineImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsSaving(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      
      await saveImage({
        productId,
        storageId,
        filename: file.name,
        contentType: file.type,
        size: file.size,
        tags: ["hlavní"],
      });
      setInlineEdit(null);
    } catch (error) {
      console.error("Error uploading image:", error);
    } finally {
      setIsSaving(false);
      if (inlineFileInputRef.current) {
        inlineFileInputRef.current.value = "";
      }
    }
  };

  if (product === undefined) {
    return (
      <div className="min-h-screen bg-background flex">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground">Načítám produkt...</p>
          </div>
        </div>
      </div>
    );
  }

  if (product === null) {
    return (
      <div className="min-h-screen bg-background flex">
        <div className="flex-1 flex flex-col items-center justify-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Produkt nenalezen</h2>
          <Link href="/" className="text-primary hover:underline">
            Zpět na katalog
          </Link>
        </div>
      </div>
    );
  }

  const menuItems = [
    { id: "dashboard" as const, label: "Dashboard", icon: "🏠" },
    { id: "eshop" as const, label: "Data z e-shopu", icon: "🛒" },
    { id: "marketing" as const, label: "Marketing", icon: "📋" },
    { id: "social" as const, label: "Sociální sítě", icon: "📱" },
    { id: "gallery" as const, label: "Galerie", icon: "🖼️" },
    { id: "materials" as const, label: "Materiály", icon: "📁" },
    { id: "edit" as const, label: "Editovat", icon: "✏️" },
  ];

  const completedCount = completedTodos.size;
  const totalTodos = todoItems.length;
  const progressPercent = Math.round((completedCount / totalTodos) * 100);

  // Check if marketing data is filled
  const hasMarketingData = !!(product.salesClaim || product.tier || product.brandPillar);
  const hasSocialData = !!(product.socialFacebook || product.socialInstagram);

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Mobile Top Bar */}
      <div className="lg:hidden sticky top-0 z-50 bg-card border-b border-border">
        {/* Header with back button and product info */}
        <div className="flex items-center gap-3 p-3">
          <Link
            href="/"
            className="w-9 h-9 bg-muted rounded-lg flex items-center justify-center"
          >
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
              {product.image ? (
                <Image
                  src={product.image}
                  alt={product.name}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                  🍵
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground text-sm truncate">{product.name}</p>
              <p className="text-xs text-primary font-medium">{product.price} Kč</p>
            </div>
          </div>
        </div>
        
        {/* Tab Switcher - like Macaly chat/preview */}
        <div className="flex p-2 gap-1 bg-muted/50">
          <button
            onClick={() => setMobileView("product")}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
              mobileView === "product"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            📦 Produkt
          </button>
          <button
            onClick={() => setMobileView("data")}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
              mobileView === "data"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            📊 Data
          </button>
        </div>
      </div>

      {/* Left Sidebar Menu - Hidden on mobile */}
      <aside className="hidden lg:flex w-64 bg-card border-r border-border flex-col">
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

        {/* Product Mini Card */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
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
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                  🍵
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-foreground text-sm truncate">{product.name}</p>
              <p className="text-xs text-muted-foreground">{product.price} Kč</p>
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

        {/* Product Navigation */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            {adjacentProducts?.prevProduct ? (
              <Link
                href={`/product/${adjacentProducts.prevProduct._id}`}
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
            {adjacentProducts?.nextProduct ? (
              <Link
                href={`/product/${adjacentProducts.nextProduct._id}`}
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
        <div className="p-4 lg:p-6 xl:p-8 max-w-full 2xl:max-w-[1600px]">
          {/* Mobile View: Product Tab */}
          <div className={`lg:hidden ${mobileView !== "product" ? "hidden" : ""}`}>
            {/* Mobile Product View - Simplified dashboard */}
            <div className="space-y-4">
              {/* Product Image and Info Card */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="aspect-square max-h-72 bg-muted">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      width={400}
                      height={400}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <span className="text-6xl">🍵</span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {product.category && <CategoryBadge category={product.category} />}
                    {product.tier && <TierBadge tier={product.tier} />}
                    {product.brandPillar && <BrandPillarBadge pillar={product.brandPillar} />}
                  </div>
                  <h1 className="text-xl font-bold text-foreground mb-1">{product.name}</h1>
                  <p className="text-xl font-bold text-primary">{product.price} Kč</p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      product.availability === "in_stock" 
                        ? "bg-green-100 text-green-700" 
                        : "bg-red-100 text-red-700"
                    }`}>
                      {product.availability === "in_stock" ? "✓ Skladem" : "✗ Vyprodáno"}
                    </span>
                    {product.productUrl && (
                      <a 
                        href={product.productUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        → E-shop
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions Mobile */}
              <div className="bg-card border border-border rounded-xl p-4">
                <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                  <span>⚡</span> Rychlé akce
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setOpenPanel("referenceCard")}
                    className="flex items-center gap-2 p-3 bg-muted rounded-lg text-sm font-medium text-left"
                  >
                    <span>📋</span>
                    <span className="truncate">Reference Card</span>
                  </button>
                  <button
                    onClick={() => { setMobileView("data"); setActiveSection("social"); }}
                    className="flex items-center gap-2 p-3 bg-muted rounded-lg text-sm font-medium text-left"
                  >
                    <span>📱</span>
                    <span className="truncate">Sociální sítě</span>
                  </button>
                  <button
                    onClick={() => { setMobileView("data"); setActiveSection("gallery"); }}
                    className="flex items-center gap-2 p-3 bg-muted rounded-lg text-sm font-medium text-left"
                  >
                    <span>🖼️</span>
                    <span className="truncate">Galerie</span>
                  </button>
                  <button
                    onClick={() => { setMobileView("data"); setActiveSection("edit"); }}
                    className="flex items-center gap-2 p-3 bg-muted rounded-lg text-sm font-medium text-left"
                  >
                    <span>✏️</span>
                    <span className="truncate">Upravit</span>
                  </button>
                </div>
              </div>

              {/* Top 20 Mobile */}
              <div className={`bg-card border border-border rounded-xl p-4 ${
                product.isTop ? "ring-2 ring-amber-400" : ""
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <span>{product.isTop ? "⭐" : "☆"}</span> 
                    Top 20
                    {product.topOrder && (
                      <span className="text-xs bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                        #{product.topOrder}
                      </span>
                    )}
                  </h2>
                  <button
                    onClick={async () => {
                      try {
                        await setTopOrder({ id: productId, order: 1 });
                        setSaveMessage("Produkt je nyní na prvním místě!");
                        setTimeout(() => setSaveMessage(null), 2000);
                      } catch (error: unknown) {
                        const errorMessage = error instanceof Error ? error.message : "Nepodařilo se změnit pozici";
                        alert(errorMessage);
                      }
                    }}
                    disabled={isSaving || product.topOrder === 1}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                      product.topOrder === 1
                        ? "bg-amber-500 text-white"
                        : "bg-amber-500 text-white active:scale-95"
                    }`}
                  >
                    🥇 {product.topOrder === 1 ? "#1" : "Na 1. místo"}
                  </button>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((pos) => {
                    const isCurrentPosition = product.topOrder === pos;
                    const occupiedBy = topProducts?.find(p => p.topOrder === pos && p._id !== productId);
                    const isOccupied = !!occupiedBy;
                    
                    return (
                      <button
                        key={pos}
                        onClick={async () => {
                          try {
                            await setTopOrder({ id: productId, order: isCurrentPosition ? null : pos });
                            if (!isCurrentPosition) {
                              setSaveMessage(`Pozice ${pos}!`);
                              setTimeout(() => setSaveMessage(null), 2000);
                            }
                          } catch (error: unknown) {
                            const errorMessage = error instanceof Error ? error.message : "Chyba";
                            alert(errorMessage);
                          }
                        }}
                        disabled={isSaving}
                        className={`aspect-square rounded-lg font-bold text-sm transition-all ${
                          isCurrentPosition
                            ? "bg-amber-500 text-white shadow-md"
                            : isOccupied
                            ? "bg-amber-100 text-amber-600 border border-amber-300"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {pos}
                      </button>
                    );
                  })}
                </div>
                {product.isTop && (
                  <button
                    onClick={async () => {
                      try {
                        await setTopOrder({ id: productId, order: null });
                        setSaveMessage("Odebráno z Top 20");
                        setTimeout(() => setSaveMessage(null), 2000);
                      } catch (error: unknown) {
                        const errorMessage = error instanceof Error ? error.message : "Chyba";
                        alert(errorMessage);
                      }
                    }}
                    disabled={isSaving}
                    className="w-full mt-2 py-2 rounded-lg text-sm font-medium bg-red-100 text-red-600 active:bg-red-200"
                  >
                    Odebrat z Top 20
                  </button>
                )}
              </div>

              {/* Sales Claim Mobile */}
              {product.salesClaim && (
                <div className="bg-card border border-border rounded-xl p-4">
                  <h2 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
                    <span>💬</span> Prodejní claim
                  </h2>
                  <p className="text-sm text-foreground leading-relaxed mb-3">{product.salesClaim}</p>
                  <CopyButton text={product.salesClaim} />
                </div>
              )}

              {/* Description Mobile */}
              {product.description && (
                <div className="bg-card border border-border rounded-xl p-4">
                  <h2 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
                    <span>📝</span> Popis
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">{product.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Mobile View: Data Tab */}
          <div className={`lg:hidden ${mobileView !== "data" ? "hidden" : ""}`}>
            {/* Data section selector */}
            <div className="flex gap-1 overflow-x-auto pb-3 mb-4 -mx-4 px-4 scrollbar-hide">
              {[
                { id: "eshop" as const, label: "E-shop", icon: "🛒" },
                { id: "marketing" as const, label: "Marketing", icon: "📋" },
                { id: "social" as const, label: "Sociální", icon: "📱" },
                { id: "gallery" as const, label: "Galerie", icon: "🖼️" },
                { id: "materials" as const, label: "Materiály", icon: "📁" },
                { id: "edit" as const, label: "Editovat", icon: "✏️" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    activeSection === item.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop: Always show section content */}
          {/* Mobile: Only show section content when in "data" view OR when on edit sections */}
          <div className={`${mobileView === "product" ? "hidden lg:block" : ""}`}>
          {activeSection === "dashboard" && (
            <div className="space-y-6">
              {/* Hero Section - Large Image + Product Name */}
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  {/* Large Product Image */}
                  <div 
                    className="w-full md:w-80 h-64 md:h-80 bg-muted flex-shrink-0 relative group cursor-pointer"
                    onClick={() => {
                      if (galleryImages && galleryImages.length > 0) {
                        handleOpenLightbox(0);
                      }
                    }}
                  >
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.name}
                        width={320}
                        height={320}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <span className="text-8xl">🍵</span>
                      </div>
                    )}
                    {/* Gallery button overlay */}
                    {galleryImages && galleryImages.length > 0 && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors">
                        <button className="absolute bottom-3 right-3 flex items-center gap-2 px-3 py-2 bg-white/90 hover:bg-white rounded-lg shadow-lg text-sm font-medium text-foreground transition-all opacity-80 group-hover:opacity-100">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {galleryImages.length} {galleryImages.length === 1 ? "foto" : galleryImages.length < 5 ? "fotky" : "fotek"}
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Product Info */}
                  <div className="flex-1 p-6 md:p-8 flex flex-col justify-center">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {product.category && <CategoryBadge category={product.category} />}
                      {product.tier && <TierBadge tier={product.tier} />}
                      {product.brandPillar && <BrandPillarBadge pillar={product.brandPillar} />}
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">{product.name}</h1>
                    <p className="text-2xl font-bold text-primary mb-4">{product.price} Kč</p>
                    {product.productUrl && (
                      <a 
                        href={product.productUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm font-medium"
                      >
                        Zobrazit na e-shopu →
                      </a>
                    )}
                    {/* Benefit Tags from mainBenefits */}
                    {product.mainBenefits && (() => {
                      // Parse benefits - split by lines, remove leading numbers
                      const lines = product.mainBenefits.split('\n').filter(line => line.trim());
                      const benefits: string[] = [];
                      for (const line of lines) {
                        // Remove leading numbers like "1.", "1)", "1:" etc.
                        const cleanText = line.trim().replace(/^[\d]+[.):\-\s]+/, '').trim();
                        if (cleanText.length > 3 && cleanText.length < 100) {
                          benefits.push(cleanText);
                        }
                      }
                      // Take first 3 benefits
                      const displayBenefits = benefits.slice(0, 3);
                      return displayBenefits.length > 0 ? (
                        <div className="flex flex-wrap gap-2 mt-4">
                          {displayBenefits.map((benefit, idx) => (
                            <span 
                              key={idx}
                              className="px-3 py-1.5 rounded-full text-xs font-medium bg-foreground text-background border border-foreground/20"
                            >
                              {benefit}
                            </span>
                          ))}
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
              </div>

              {/* Three Column Layout: Alerts + Quick Actions + Pro prodejce */}
              <div className="grid 2xl:grid-cols-[1fr_1fr_minmax(500px,1.5fr)] xl:grid-cols-3 lg:grid-cols-2 gap-6">
                {/* Left Column - Alerts */}
                <div className="space-y-4">
                  {(() => {
                    const dismissedAlerts = product.dismissedAlerts || [];
                    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
                    const isRecentUpdate = product.marketingLastUpdated && product.marketingLastUpdated > sevenDaysAgo;
                    
                    const alerts: { id: string; icon: "bell" | "lightbulb" | "check"; type: "urgent" | "tip" | "new"; message: string; action: string; date?: number }[] = [];
                    
                    // AVAILABLE CONTENT - Show what's ready to use for customers/salespeople
                    
                    // Sales claim available
                    if (product.salesClaim) {
                      alerts.push({
                        id: "has-claim",
                        icon: "check",
                        type: "new",
                        message: `Prodejní claim: "${product.salesClaim.substring(0, 60)}${product.salesClaim.length > 60 ? "..." : ""}"`,
                        action: "Kopírovat",
                        date: product.marketingLastUpdated
                      });
                    }
                    
                    // Quick Reference Card available
                    if (product.quickReferenceCard) {
                      alerts.push({
                        id: "has-reference-card",
                        icon: "check",
                        type: "new",
                        message: "Quick Reference Card je připravena k použití!",
                        action: "Zobrazit",
                        date: product.marketingLastUpdated
                      });
                    }
                    
                    // Facebook post available
                    if (product.socialFacebook) {
                      alerts.push({
                        id: "has-fb",
                        icon: "check",
                        type: "new",
                        message: "Facebook post je připraven k publikování.",
                        action: "Zkopírovat",
                        date: product.marketingLastUpdated
                      });
                    }
                    
                    // Instagram post available
                    if (product.socialInstagram) {
                      alerts.push({
                        id: "has-ig",
                        icon: "check",
                        type: "new",
                        message: "Instagram post je připraven k publikování.",
                        action: "Zkopírovat",
                        date: product.marketingLastUpdated
                      });
                    }
                    
                    // Gallery images available
                    if (galleryImages && galleryImages.length > 0) {
                      alerts.push({
                        id: "has-gallery",
                        icon: "check",
                        type: "new",
                        message: `${galleryImages.length} ${galleryImages.length === 1 ? "obrázek" : galleryImages.length < 5 ? "obrázky" : "obrázků"} v galerii k použití.`,
                        action: "Prohlédnout",
                        date: galleryImages[0]?.uploadedAt
                      });
                    }
                    
                    // PDF available
                    if (product.pdfUrl) {
                      alerts.push({
                        id: "has-pdf",
                        icon: "check",
                        type: "new",
                        message: "PDF produktový list je k dispozici.",
                        action: "Stáhnout"
                      });
                    }
                    
                    // Why Buy points available
                    if (product.whyBuy && product.whyBuy.length > 0) {
                      alerts.push({
                        id: "has-whybuy",
                        icon: "lightbulb",
                        type: "tip",
                        message: `${product.whyBuy.length} prodejních argumentů připraveno.`,
                        action: "Zobrazit"
                      });
                    }
                    
                    // Filter out dismissed alerts
                    const visibleAlerts = alerts.filter(a => !dismissedAlerts.includes(a.id));
                    const alertCount = visibleAlerts.length;
                    
                    return (
                      <div className="bg-card border border-border rounded-xl overflow-hidden h-full">
                        <div className="p-4 border-b border-border bg-muted/30">
                          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                            <span className="text-xl">📦</span>
                            Dostupné materiály 
                            {alertCount > 0 && <span className="text-green-600">({alertCount})</span>}
                          </h2>
                        </div>
                        <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                          {visibleAlerts.length > 0 ? visibleAlerts.map((alert) => (
                            <div 
                              key={alert.id}
                              className={`rounded-lg p-3 border ${
                                alert.type === "new" 
                                  ? "bg-green-50 border-green-200" 
                                  : alert.type === "urgent"
                                  ? "bg-red-50 border-red-200"
                                  : "bg-amber-50 border-amber-200"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  alert.type === "new" 
                                    ? "bg-green-100" 
                                    : alert.type === "urgent" 
                                    ? "bg-red-100" 
                                    : "bg-amber-100"
                                }`}>
                                  {alert.icon === "check" ? (
                                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  ) : alert.icon === "bell" ? (
                                    <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/>
                                    </svg>
                                  ) : (
                                    <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6A4.997 4.997 0 017 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z"/>
                                    </svg>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-muted-foreground mb-1">
                                    {alert.date 
                                      ? new Date(alert.date).toLocaleDateString("cs-CZ", { day: "numeric", month: "short", year: "numeric" })
                                      : new Date().toLocaleDateString("cs-CZ", { day: "numeric", month: "short", year: "numeric" })
                                    }
                                  </p>
                                  <p className={`text-sm font-medium leading-snug ${
                                    alert.type === "new" ? "text-green-800" : alert.type === "urgent" ? "text-red-800" : "text-amber-800"
                                  }`}>
                                    {alert.message}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2 mt-2 ml-11">
                                <button
                                  onClick={() => {
                                    if (alert.id === "has-claim" && product.salesClaim) {
                                      navigator.clipboard.writeText(product.salesClaim);
                                      setSaveMessage("Claim zkopírován!");
                                      setTimeout(() => setSaveMessage(null), 2000);
                                    } else if (alert.id === "has-reference-card") {
                                      setOpenPanel("referenceCard");
                                    } else if (alert.id === "has-fb" && product.salesClaim) {
                                      navigator.clipboard.writeText(product.socialFacebook || "");
                                      setSaveMessage("Facebook post zkopírován!");
                                      setTimeout(() => setSaveMessage(null), 2000);
                                    } else if (alert.id === "has-ig" && product.socialInstagram) {
                                      navigator.clipboard.writeText(product.socialInstagram);
                                      setSaveMessage("Instagram post zkopírován!");
                                      setTimeout(() => setSaveMessage(null), 2000);
                                    } else if (alert.id === "has-gallery") {
                                      setOpenPanel("gallery");
                                    } else if (alert.id === "has-pdf" && product.pdfUrl) {
                                      window.open(product.pdfUrl, "_blank");
                                    } else if (alert.id === "has-whybuy") {
                                      setActiveSection("marketing");
                                    }
                                  }}
                                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                                    alert.type === "new"
                                      ? "bg-green-600 text-white hover:bg-green-700"
                                      : alert.type === "urgent"
                                      ? "bg-red-500 text-white hover:bg-red-600"
                                      : "bg-amber-500 text-white hover:bg-amber-600"
                                  }`}
                                >
                                  {alert.action}
                                </button>
                                {/* Add to Sales Kit button */}
                                <button
                                  onClick={() => {
                                    const getKitItem = (): { id: string; type: "claim" | "reference" | "gallery" | "social" | "materials" | "whybuy"; label: string; content: string } | null => {
                                      if (alert.id === "has-claim" && product.salesClaim) {
                                        return { id: "sales-claim", type: "claim", label: "Prodejní claim", content: product.salesClaim + (product.salesClaimSubtitle ? `\n${product.salesClaimSubtitle}` : "") };
                                      }
                                      if (alert.id === "has-reference-card" && product.quickReferenceCard) {
                                        return { id: "reference-card", type: "reference", label: "Quick Reference Card", content: product.quickReferenceCard };
                                      }
                                      if (alert.id === "has-fb" && product.socialFacebook) {
                                        return { id: "fb-post", type: "social", label: "Facebook post", content: product.socialFacebook };
                                      }
                                      if (alert.id === "has-ig" && product.socialInstagram) {
                                        return { id: "ig-post", type: "social", label: "Instagram post", content: product.socialInstagram };
                                      }
                                      if (alert.id === "has-pdf" && product.pdfUrl) {
                                        return { id: "pdf-link", type: "materials", label: "PDF odkaz", content: product.pdfUrl };
                                      }
                                      if (alert.id === "has-whybuy" && product.whyBuy) {
                                        return { id: "why-buy", type: "whybuy", label: "Proč koupit", content: product.whyBuy.join("\n• ") };
                                      }
                                      return null;
                                    };
                                    const item = getKitItem();
                                    if (item) addToSalesKit(item);
                                  }}
                                  className={`px-2 py-1.5 rounded text-xs font-bold transition-colors ${
                                    salesKitItems.find(i => 
                                      (alert.id === "has-claim" && i.id === "sales-claim") ||
                                      (alert.id === "has-reference-card" && i.id === "reference-card") ||
                                      (alert.id === "has-fb" && i.id === "fb-post") ||
                                      (alert.id === "has-ig" && i.id === "ig-post") ||
                                      (alert.id === "has-pdf" && i.id === "pdf-link") ||
                                      (alert.id === "has-whybuy" && i.id === "why-buy")
                                    )
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
                                  }`}
                                  title="Přidat do Sales Kit"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          )) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                </svg>
                              </div>
                              <h3 className="font-semibold text-gray-600">Zatím žádné materiály</h3>
                              <p className="text-sm text-muted-foreground">Pro tento produkt nejsou k dispozici žádné marketingové materiály.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
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
                    {/* Quick Reference Card - First */}
                    <div className={`w-full rounded-xl transition-colors ${
                        product.quickReferenceCard
                          ? "bg-gray-800 border border-gray-700"
                          : "bg-gray-50 border-2 border-dashed border-gray-300"
                      }`}>
                      <div className="flex items-center gap-4 p-4">
                        <button
                          onClick={() => setOpenPanel("referenceCard")}
                          className="flex items-center gap-4 flex-1 text-left hover:opacity-80 transition-opacity"
                        >
                          <div className="relative flex-shrink-0">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                              product.quickReferenceCard ? "bg-gray-700" : "bg-gray-200"
                            }`}>
                              <span className="text-2xl">📋</span>
                            </div>
                            <span className="absolute -top-1 -left-1 w-5 h-5 bg-green-500 text-white text-xs font-bold rounded-full flex items-center justify-center">1</span>
                          </div>
                          <div className="flex-1">
                            <p className={`font-semibold flex items-center gap-2 ${product.quickReferenceCard ? "text-green-400" : "text-foreground"}`}>
                              Quick Reference Card
                              {product.quickReferenceCard && (
                                <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">✓</span>
                              )}
                            </p>
                            <p className={`text-sm ${product.quickReferenceCard ? "text-gray-400" : "text-muted-foreground"}`}>
                              {product.quickReferenceCard 
                                ? "Zobrazit kartu pro prodejce" 
                                : "Karta není vyplněna"}
                            </p>
                          </div>
                          <svg className={`w-5 h-5 ${product.quickReferenceCard ? "text-gray-500" : "text-muted-foreground"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        {product.quickReferenceCard && (
                          <button
                            onClick={() => addToSalesKit({
                              id: "reference-card",
                              type: "reference",
                              label: "Quick Reference Card",
                              content: product.quickReferenceCard || ""
                            })}
                            className={`p-2 rounded-lg transition-colors ${
                              salesKitItems.find(i => i.id === "reference-card")
                                ? "bg-green-500 text-white"
                                : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                            }`}
                            title="Přidat do Sales Kit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Gallery - Second */}
                    <div className={`w-full rounded-xl transition-colors ${
                        galleryImages && galleryImages.length > 0
                          ? "bg-purple-50 border border-purple-200"
                          : "bg-gray-50 border-2 border-dashed border-gray-300"
                      }`}>
                      {inlineEdit === "gallery" ? (
                        <div className="p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-foreground">Správa galerie</p>
                            <button onClick={() => setInlineEdit(null)} className="text-muted-foreground hover:text-foreground">✕</button>
                          </div>
                          
                          {/* Existing images grid */}
                          {galleryImages && galleryImages.length > 0 && (
                            <div className="grid grid-cols-4 gap-2">
                              {galleryImages.map((img) => (
                                <div key={img._id} className="relative group">
                                  <img 
                                    src={img.url || ""} 
                                    alt={img.filename}
                                    className="w-full h-16 object-cover rounded-lg"
                                  />
                                  <button
                                    onClick={async () => {
                                      if (confirm("Opravdu smazat tento obrázek?")) {
                                        await deleteImage({ id: img._id });
                                      }
                                    }}
                                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                    title="Smazat"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Upload new image */}
                          <div className="pt-2 border-t border-purple-200">
                            <p className="text-sm text-muted-foreground mb-2">Nahrát nový obrázek:</p>
                            <input
                              ref={inlineFileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleInlineImageUpload}
                              disabled={isSaving}
                              className="w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200"
                            />
                            {isSaving && <p className="text-sm text-muted-foreground mt-1">Nahrávám...</p>}
                          </div>
                        </div>
                      ) : (
                        <div className="p-4">
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => setOpenPanel("gallery")}
                              className="flex items-center gap-4 flex-1 text-left hover:opacity-80 transition-opacity"
                            >
                              <div className="relative flex-shrink-0">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                  galleryImages && galleryImages.length > 0 ? "bg-purple-100" : "bg-gray-200"
                                }`}>
                                  <span className="text-2xl">🖼️</span>
                                </div>
                                <span className="absolute -top-1 -left-1 w-5 h-5 bg-foreground text-background text-xs font-bold rounded-full flex items-center justify-center">2</span>
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-foreground flex items-center gap-2">
                                  Galerie
                                  {galleryImages && galleryImages.length > 0 && (
                                    <span className="text-xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full">{galleryImages.length}</span>
                                  )}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {galleryImages && galleryImages.length > 0 
                                    ? "Prohlédnout a spravovat obrázky" 
                                    : "Zatím žádné obrázky - přidejte první!"}
                                </p>
                              </div>
                              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {galleryImages && galleryImages.length > 0 && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); addToSalesKit({
                                    id: "gallery-images",
                                    type: "gallery",
                                    label: `Galerie (${galleryImages.length} obr.)`,
                                    content: `Obrázky v galerii: ${galleryImages.length}\n\nOdkazy:\n${galleryImages.slice(0, 5).map(img => img.url).join("\n")}${galleryImages.length > 5 ? "\n..." : ""}`
                                  }); }}
                                  className={`p-2 rounded-lg transition-colors ${
                                    salesKitItems.find(i => i.id === "gallery-images")
                                      ? "bg-green-500 text-white"
                                      : "bg-purple-100 hover:bg-purple-200 text-purple-700"
                                  }`}
                                  title="Přidat do Sales Kit"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                </button>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); setInlineEdit("gallery"); }}
                                className="p-2 hover:bg-black/10 rounded-lg transition-colors"
                                title="Nahrát obrázek"
                              >
                                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Facebook & Instagram Images */}
                    <div className={`w-full rounded-xl transition-colors ${
                        product.socialFacebookImage || product.socialInstagramImage
                          ? "bg-pink-50 border border-pink-200"
                          : "bg-gray-50 border-2 border-dashed border-gray-300"
                      }`}>
                      {inlineEdit === "socialImages" ? (
                        <div className="p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-foreground">📷 Facebook a Instagram obrázky</p>
                            <button onClick={() => setInlineEdit(null)} className="text-muted-foreground hover:text-foreground">✕</button>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                </svg>
                                Facebook obrázek (URL)
                              </label>
                              <Input
                                value={inlineValue.split("|||")[0] || ""}
                                onChange={(e) => {
                                  const parts = inlineValue.split("|||");
                                  setInlineValue(`${e.target.value}|||${parts[1] || ""}`);
                                }}
                                placeholder="https://example.com/facebook-image.jpg"
                                className="w-full"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                                <svg className="w-4 h-4 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                </svg>
                                Instagram obrázek (URL)
                              </label>
                              <Input
                                value={inlineValue.split("|||")[1] || ""}
                                onChange={(e) => {
                                  const parts = inlineValue.split("|||");
                                  setInlineValue(`${parts[0] || ""}|||${e.target.value}`);
                                }}
                                placeholder="https://example.com/instagram-image.jpg"
                                className="w-full"
                              />
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              setIsSaving(true);
                              try {
                                const [fbImage, igImage] = inlineValue.split("|||");
                                await updateMarketingData({
                                  id: productId,
                                  socialFacebookImage: fbImage?.trim() || undefined,
                                  socialInstagramImage: igImage?.trim() || undefined,
                                });
                                setInlineEdit(null);
                                setInlineValue("");
                              } catch (error) {
                                console.error("Error saving social images:", error);
                              } finally {
                                setIsSaving(false);
                              }
                            }}
                            disabled={isSaving}
                            className="px-4 py-2 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700 disabled:opacity-50"
                          >
                            {isSaving ? "Ukládám..." : "Uložit"}
                          </button>
                        </div>
                      ) : product.socialFacebookImage || product.socialInstagramImage ? (
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <p className="font-semibold text-foreground flex items-center gap-2">
                              <span>📷</span> Facebook a Instagram obrázky
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => addToSalesKit({
                                  id: "social-images",
                                  type: "social",
                                  label: "Sociální obrázky",
                                  content: [
                                    product.socialFacebookImage ? `FACEBOOK: ${product.socialFacebookImage}` : "",
                                    product.socialInstagramImage ? `INSTAGRAM: ${product.socialInstagramImage}` : "",
                                  ].filter(Boolean).join("\n")
                                })}
                                className={`p-2 rounded-lg transition-colors ${
                                  salesKitItems.find(i => i.id === "social-images")
                                    ? "bg-green-500 text-white"
                                    : "bg-pink-100 hover:bg-pink-200 text-pink-700"
                                }`}
                                title="Přidat do Sales Kit"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                              </button>
                              <button
                                onClick={() => { 
                                  setInlineEdit("socialImages"); 
                                  setInlineValue(`${product.socialFacebookImage || ""}|||${product.socialInstagramImage || ""}`);
                                }}
                                className="p-2 hover:bg-black/10 rounded-lg transition-colors"
                                title="Upravit"
                              >
                                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {product.socialFacebookImage && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-1 text-xs font-medium text-blue-600">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                  </svg>
                                  Facebook
                                </div>
                                <a href={product.socialFacebookImage} target="_blank" rel="noopener noreferrer" className="block">
                                  <img 
                                    src={product.socialFacebookImage} 
                                    alt="Facebook" 
                                    className="w-full h-24 object-cover rounded-lg border hover:opacity-80 transition-opacity"
                                  />
                                </a>
                              </div>
                            )}
                            {product.socialInstagramImage && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-1 text-xs font-medium text-pink-600">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                  </svg>
                                  Instagram
                                </div>
                                <a href={product.socialInstagramImage} target="_blank" rel="noopener noreferrer" className="block">
                                  <img 
                                    src={product.socialInstagramImage} 
                                    alt="Instagram" 
                                    className="w-full h-24 object-cover rounded-lg border hover:opacity-80 transition-opacity"
                                  />
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 p-4">
                          <button
                            onClick={() => { setInlineEdit("socialImages"); setInlineValue("|||"); }}
                            className="flex items-center gap-4 flex-1 text-left hover:opacity-80 transition-opacity"
                          >
                            <div className="relative flex-shrink-0">
                              <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center">
                                <span className="text-2xl">📷</span>
                              </div>
                              <span className="absolute -top-1 -left-1 w-5 h-5 bg-foreground text-background text-xs font-bold rounded-full flex items-center justify-center">3</span>
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-foreground">Facebook a Instagram obrázky</p>
                              <p className="text-sm text-muted-foreground">Přidejte URL obrázků pro sociální sítě</p>
                            </div>
                            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Download Materials */}
                    <div className={`w-full rounded-xl transition-colors ${
                        product.pdfUrl || (product.bannerUrls && product.bannerUrls.length > 0)
                          ? "bg-blue-50 border border-blue-200"
                          : "bg-gray-50 border-2 border-dashed border-gray-300"
                      }`}>
                      {inlineEdit === "materials" ? (
                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-foreground">📥 Přidat materiály</p>
                            <button onClick={() => setInlineEdit(null)} className="text-muted-foreground hover:text-foreground">✕</button>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground mb-1">Odkaz na PDF</label>
                              <Input
                                value={inlineValue}
                                onChange={(e) => setInlineValue(e.target.value)}
                                placeholder="https://example.com/product.pdf"
                                className="w-full"
                              />
                            </div>
                            <div className="text-center text-xs text-muted-foreground">nebo</div>
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground mb-1">Nahrát PDF soubor</label>
                              <input
                                type="file"
                                accept=".pdf,application/pdf"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  setIsSaving(true);
                                  try {
                                    const uploadUrl = await generateUploadUrl();
                                    const result = await fetch(uploadUrl, {
                                      method: "POST",
                                      headers: { "Content-Type": file.type },
                                      body: file,
                                    });
                                    const { storageId } = await result.json();
                                    // Save PDF URL directly to product
                                    await savePdfToProduct({
                                      productId,
                                      storageId,
                                    });
                                    setInlineEdit(null);
                                    setSaveMessage("PDF nahráno a uloženo!");
                                    setTimeout(() => setSaveMessage(null), 2000);
                                  } catch (error) {
                                    console.error("Error uploading PDF:", error);
                                  } finally {
                                    setIsSaving(false);
                                  }
                                }}
                                disabled={isSaving}
                                className="w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                              />
                            </div>
                          </div>
                          <button
                            onClick={() => handleInlineSave("pdfUrl", inlineValue)}
                            disabled={isSaving || !inlineValue}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                          >
                            {isSaving ? "Ukládám..." : "Uložit odkaz"}
                          </button>
                        </div>
                      ) : (
                        <div className="p-4">
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => setOpenPanel("materials")}
                              className="flex items-center gap-4 flex-1 text-left hover:opacity-80 transition-opacity"
                            >
                              <div className="relative flex-shrink-0">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                  product.pdfUrl || (product.bannerUrls && product.bannerUrls.length > 0) ? "bg-blue-100" : "bg-gray-200"
                                }`}>
                                  <span className="text-2xl">📥</span>
                                </div>
                                <span className="absolute -top-1 -left-1 w-5 h-5 bg-foreground text-background text-xs font-bold rounded-full flex items-center justify-center">4</span>
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-foreground">Stáhnout materiály</p>
                                <p className="text-sm text-muted-foreground">
                                  {product.pdfUrl || (product.bannerUrls && product.bannerUrls.length > 0)
                                    ? "PDF listy a bannery ke stažení"
                                    : "Žádné materiály - nahrajte PDF nebo bannery"}
                                </p>
                              </div>
                              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {(product.pdfUrl || (product.bannerUrls && product.bannerUrls.length > 0)) && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); addToSalesKit({
                                    id: "download-materials",
                                    type: "materials",
                                    label: "Materiály ke stažení",
                                    content: [
                                      product.pdfUrl ? `PDF: ${product.pdfUrl}` : "",
                                      product.bannerUrls?.length ? `Bannery:\n${product.bannerUrls.join("\n")}` : ""
                                    ].filter(Boolean).join("\n\n")
                                  }); }}
                                  className={`p-2 rounded-lg transition-colors ${
                                    salesKitItems.find(i => i.id === "download-materials")
                                      ? "bg-green-500 text-white"
                                      : "bg-blue-100 hover:bg-blue-200 text-blue-700"
                                  }`}
                                  title="Přidat do Sales Kit"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                </button>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); setInlineEdit("materials"); setInlineValue(product.pdfUrl || ""); }}
                                className="p-2 hover:bg-black/10 rounded-lg transition-colors"
                                title="Přidat PDF odkaz"
                              >
                                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Promotion History - Fifth */}
                    <div className={`w-full rounded-xl transition-colors ${
                        promotionLogs && promotionLogs.length > 0
                          ? "bg-indigo-50 border border-indigo-200"
                          : "bg-gray-50 border-2 border-dashed border-gray-300"
                      }`}>
                      <div className="flex items-center gap-4 p-4">
                        <button
                          onClick={() => setOpenPanel("promotionHistory")}
                          className="flex items-center gap-4 flex-1 text-left hover:opacity-80 transition-opacity"
                        >
                          <div className="relative flex-shrink-0">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                              promotionLogs && promotionLogs.length > 0 ? "bg-indigo-100" : "bg-gray-200"
                            }`}>
                              <span className="text-2xl">📜</span>
                            </div>
                            <span className="absolute -top-1 -left-1 w-5 h-5 bg-foreground text-background text-xs font-bold rounded-full flex items-center justify-center">5</span>
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-foreground">Historie propagace</p>
                            <p className="text-sm text-muted-foreground">
                              {promotionLogs && promotionLogs.length > 0
                                ? `${promotionLogs.length} ${promotionLogs.length === 1 ? "záznam" : promotionLogs.length < 5 ? "záznamy" : "záznamů"}`
                                : "Zatím žádné záznamy"}
                            </p>
                          </div>
                          <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* View on e-shop */}
                    {product.productUrl && (
                      <a
                        href={product.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center gap-4 p-4 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl transition-colors"
                      >
                        <div className="relative flex-shrink-0">
                          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                            <span className="text-2xl">🛒</span>
                          </div>
                          <span className="absolute -top-1 -left-1 w-5 h-5 bg-foreground text-background text-xs font-bold rounded-full flex items-center justify-center">6</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">Zobrazit na e-shopu</p>
                          <p className="text-sm text-muted-foreground">Otevřít produktovou stránku</p>
                        </div>
                        <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}

                    {/* Edit Marketing Data */}
                    {(() => {
                      const missingFields: string[] = [];
                      if (!product.salesClaim) missingFields.push("claim");
                      if (!product.tier) missingFields.push("tier");
                      if (!product.brandPillar) missingFields.push("pillar");
                      const hasMissing = missingFields.length > 0;
                      return (
                        <button
                          onClick={() => setOpenPanel("edit")}
                          className={`w-full flex items-center gap-4 p-4 rounded-xl transition-colors text-left ${
                            hasMissing
                              ? "bg-red-50 hover:bg-red-100 border-2 border-dashed border-red-300"
                              : "bg-amber-50 hover:bg-amber-100 border border-amber-200"
                          }`}
                        >
                          <div className="relative flex-shrink-0">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                              hasMissing ? "bg-red-100" : "bg-amber-100"
                            }`}>
                              <span className="text-2xl">{hasMissing ? "⚠️" : "✏️"}</span>
                            </div>
                            <span className="absolute -top-1 -left-1 w-5 h-5 bg-foreground text-background text-xs font-bold rounded-full flex items-center justify-center">7</span>
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-foreground flex items-center gap-2">
                              Upravit data
                              {hasMissing && (
                                <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded-full">
                                  {missingFields.length} chybí
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {hasMissing
                                ? "Doplňte chybějící marketingové údaje!"
                                : "Editovat marketingové informace"}
                            </p>
                          </div>
                          <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      );
                    })()}

                    {/* Presentation */}
                    <a
                      href="https://notebooklm.google.com/notebook/8e4b446d-d801-44d3-a6cb-4f5ea37760e8?artifactId=3e6d9eb6-b181-4b66-904f-12f224eb5235"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center gap-4 p-4 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors"
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                          <span className="text-2xl">📊</span>
                        </div>
                        <span className="absolute -top-1 -left-1 w-5 h-5 bg-foreground text-background text-xs font-bold rounded-full flex items-center justify-center">6</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">Prezentace</p>
                        <p className="text-sm text-muted-foreground">Otevřít AI prezentaci produktu</p>
                      </div>
                      <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>

                    {/* Quick Reference Card */}
                    <div className={`w-full rounded-xl transition-colors ${
                      product.quickReferenceCard
                        ? "bg-cyan-50 border border-cyan-200"
                        : "bg-gray-50 border-2 border-dashed border-gray-300"
                    }`}>
                      {inlineEdit === "referenceCard" ? (
                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-foreground">Quick Reference Card</p>
                            <button onClick={() => setInlineEdit(null)} className="text-muted-foreground hover:text-foreground">✕</button>
                          </div>
                          <textarea
                            value={inlineValue}
                            onChange={(e) => setInlineValue(e.target.value)}
                            placeholder="Vložte formátovanou kartu..."
                            className="w-full p-3 border rounded-lg text-xs font-mono min-h-[300px] resize-none bg-gray-900 text-green-400"
                          />
                          <button
                            onClick={() => handleInlineSave("quickReferenceCard", inlineValue)}
                            disabled={isSaving}
                            className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700 disabled:opacity-50"
                          >
                            {isSaving ? "Ukládám..." : "Uložit"}
                          </button>
                        </div>
                      ) : product.quickReferenceCard ? (
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <p className="font-semibold text-foreground flex items-center gap-2">
                              <span>📋</span> Quick Reference Card
                            </p>
                            <div className="flex items-center gap-2">
                              <CopyButton text={product.quickReferenceCard} />
                              <button
                                onClick={() => { setInlineEdit("referenceCard"); setInlineValue(product.quickReferenceCard || ""); }}
                                className="p-2 hover:bg-black/10 rounded-lg transition-colors"
                                title="Upravit kartu"
                              >
                                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <div className="bg-gray-900 rounded-lg p-3 overflow-x-auto">
                            <pre className="text-[10px] text-green-400 font-mono whitespace-pre leading-tight">{product.quickReferenceCard}</pre>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 p-4">
                          <button
                            onClick={() => { setInlineEdit("referenceCard"); setInlineValue(""); }}
                            className="flex items-center gap-4 flex-1 text-left hover:opacity-80 transition-opacity"
                          >
                            <div className="relative flex-shrink-0">
                              <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center">
                                <span className="text-2xl">📋</span>
                              </div>
                              <span className="absolute -top-1 -left-1 w-5 h-5 bg-foreground text-background text-xs font-bold rounded-full flex items-center justify-center">7</span>
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-foreground">Quick Reference Card</p>
                              <p className="text-sm text-muted-foreground">Přidejte rychlou kartu pro prodejce</p>
                            </div>
                            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Articles Section */}
                    <div className={`w-full rounded-xl transition-colors ${
                      product.articleUrls && product.articleUrls.length > 0
                        ? "bg-blue-50 border border-blue-200"
                        : "bg-gray-50 border-2 border-dashed border-gray-300"
                    }`}>
                      {inlineEdit === "articles" ? (
                        <div className="p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-foreground">📰 Články</p>
                            <button onClick={() => { setInlineEdit(null); setEditingArticles([]); }} className="text-muted-foreground hover:text-foreground">✕</button>
                          </div>
                          <div className="space-y-3">
                            {editingArticles.map((item, index) => (
                              <div key={index} className="bg-white p-3 rounded-lg border space-y-2">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={item.title}
                                    onChange={(e) => {
                                      const newArticles = [...editingArticles];
                                      newArticles[index].title = e.target.value;
                                      setEditingArticles(newArticles);
                                    }}
                                    placeholder="Název článku..."
                                    className="flex-1 px-2 py-1 border rounded text-sm"
                                  />
                                  <button
                                    onClick={() => setEditingArticles(editingArticles.filter((_, i) => i !== index))}
                                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                                <input
                                  type="url"
                                  value={item.url}
                                  onChange={(e) => {
                                    const newArticles = [...editingArticles];
                                    newArticles[index].url = e.target.value;
                                    setEditingArticles(newArticles);
                                  }}
                                  placeholder="https://..."
                                  className="w-full px-2 py-1 border rounded text-sm text-blue-600"
                                />
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingArticles([...editingArticles, { title: "", url: "" }])}
                              className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 flex items-center gap-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Přidat článek
                            </button>
                            <button
                              onClick={handleArticlesSave}
                              disabled={isSaving}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                            >
                              {isSaving ? "Ukládám..." : "Uložit články"}
                            </button>
                          </div>
                        </div>
                      ) : product.articleUrls && product.articleUrls.length > 0 ? (
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <p className="font-semibold text-foreground flex items-center gap-2">
                              <span>📰</span> Články ({product.articleUrls.length})
                            </p>
                            <button
                              onClick={() => { setInlineEdit("articles"); setEditingArticles(product.articleUrls || []); }}
                              className="p-2 hover:bg-black/10 rounded-lg transition-colors"
                              title="Upravit články"
                            >
                              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                          </div>
                          <div className="space-y-2">
                            {product.articleUrls.map((item, index) => (
                              <div key={index} className="flex items-center gap-2 group">
                                <span className="w-5 h-5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
                                  {index + 1}
                                </span>
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 flex items-center gap-2 p-2 bg-white rounded-lg border hover:border-blue-300 hover:bg-blue-50 transition-colors"
                                >
                                  <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                  </svg>
                                  <span className="text-sm text-foreground truncate">{item.title}</span>
                                  <svg className="w-3 h-3 text-muted-foreground ml-auto flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                                <button
                                  onClick={() => addToSalesKit({
                                    id: `article-${index}`,
                                    type: "materials",
                                    label: `Článek: ${item.title}`,
                                    content: `${item.title}\n${item.url}`
                                  })}
                                  className={`p-1.5 rounded transition-colors opacity-0 group-hover:opacity-100 ${
                                    salesKitItems.find(i => i.id === `article-${index}`)
                                      ? "bg-green-500 text-white opacity-100"
                                      : "bg-blue-100 hover:bg-blue-200 text-blue-700"
                                  }`}
                                  title="Přidat do Sales Kit"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 p-4">
                          <button
                            onClick={() => { setInlineEdit("articles"); setEditingArticles([{ title: "", url: "" }]); }}
                            className="flex items-center gap-4 flex-1 text-left hover:opacity-80 transition-opacity"
                          >
                            <div className="relative flex-shrink-0">
                              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                <span className="text-2xl">📰</span>
                              </div>
                              <span className="absolute -top-1 -left-1 w-5 h-5 bg-foreground text-background text-xs font-bold rounded-full flex items-center justify-center">10</span>
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-foreground">Články</p>
                              <p className="text-sm text-muted-foreground">Přidejte odkazy na relevantní články</p>
                            </div>
                            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Top 20 Selector */}
                    <div className={`w-full rounded-xl transition-colors ${
                      product.isTop
                        ? "bg-amber-100 border-2 border-amber-400"
                        : "bg-gray-50 border-2 border-dashed border-gray-300"
                    }`}>
                      <div className="p-3 sm:p-4">
                        {/* Header - stacks on mobile */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div className="relative flex-shrink-0">
                              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${
                                product.isTop ? "bg-amber-400" : "bg-gray-200"
                              }`}>
                                <span className="text-xl sm:text-2xl">{product.isTop ? "⭐" : "☆"}</span>
                              </div>
                              {product.topOrder && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                  {product.topOrder}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-foreground flex items-center gap-2 flex-wrap">
                                <span>Top 20</span>
                                {product.isTop && product.topOrder && (
                                  <span className="text-xs bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                                    TOP {product.topOrder}
                                  </span>
                                )}
                              </p>
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                {product.isTop
                                  ? "Změňte pořadí nebo odeberte"
                                  : "Vyberte pozici na dashboardu"}
                              </p>
                            </div>
                          </div>
                          {/* Na první místo button - full width on mobile */}
                          <button
                            onClick={async () => {
                              try {
                                await setTopOrder({ id: productId, order: 1 });
                                setSaveMessage("Produkt je nyní na prvním místě!");
                                setTimeout(() => setSaveMessage(null), 2000);
                              } catch (error: unknown) {
                                const errorMessage = error instanceof Error ? error.message : "Nepodařilo se změnit pozici";
                                alert(errorMessage);
                              }
                            }}
                            disabled={isSaving || product.topOrder === 1}
                            className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                              product.topOrder === 1
                                ? "bg-amber-500 text-white cursor-default"
                                : "bg-amber-500 text-white hover:bg-amber-600 shadow-lg hover:shadow-xl active:scale-95 sm:hover:scale-105"
                            }`}
                          >
                            <span>🥇</span>
                            {product.topOrder === 1 ? "Je na 1. místě" : "Na první místo"}
                          </button>
                        </div>
                        
                        {/* Position selector - grid on mobile for better touch targets */}
                        <div className="mt-3 sm:mt-4">
                          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 sm:gap-2">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((pos) => {
                              const isCurrentPosition = product.topOrder === pos;
                              const occupiedBy = topProducts?.find(p => p.topOrder === pos && p._id !== productId);
                              const isOccupied = !!occupiedBy;
                              
                              return (
                                <button
                                  key={pos}
                                  onClick={async () => {
                                    try {
                                      await setTopOrder({ id: productId, order: isCurrentPosition ? null : pos });
                                      if (!isCurrentPosition) {
                                        setSaveMessage(`Produkt je nyní na pozici ${pos}!`);
                                        setTimeout(() => setSaveMessage(null), 2000);
                                      }
                                    } catch (error: unknown) {
                                      const errorMessage = error instanceof Error ? error.message : "Nepodařilo se změnit pozici";
                                      alert(errorMessage);
                                    }
                                  }}
                                  disabled={isSaving}
                                  className={`aspect-square w-full max-w-[44px] rounded-lg font-bold text-sm transition-all ${
                                    isCurrentPosition
                                      ? "bg-amber-500 text-white shadow-lg scale-105 sm:scale-110"
                                      : isOccupied
                                      ? "bg-amber-100 text-amber-600 active:bg-amber-200 sm:hover:bg-amber-200 border border-amber-300"
                                      : "bg-white text-gray-600 active:bg-amber-200 sm:hover:bg-amber-200 sm:hover:text-amber-800 border border-gray-200"
                                  }`}
                                  title={isOccupied ? `Obsazeno: ${occupiedBy.name} (kliknutím se posune)` : `Nastavit jako Top ${pos}`}
                                >
                                  {pos}
                                </button>
                              );
                            })}
                          </div>
                          
                          {product.isTop && (
                            <button
                              onClick={async () => {
                                try {
                                  await setTopOrder({ id: productId, order: null });
                                  setSaveMessage("Produkt odebrán z Top 20");
                                  setTimeout(() => setSaveMessage(null), 2000);
                                } catch (error: unknown) {
                                  const errorMessage = error instanceof Error ? error.message : "Nepodařilo se odebrat z Top 20";
                                  alert(errorMessage);
                                }
                              }}
                              disabled={isSaving}
                              className="w-full sm:w-auto mt-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-100 text-red-600 active:bg-red-200 sm:hover:bg-red-200 transition-colors"
                            >
                              Odebrat z Top 20
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 hidden sm:block">
                          Tip: Při nastavení pozice se ostatní produkty automaticky posunou dolů.
                        </p>
                      </div>
                    </div>

                    {/* Last Uploaded Images */}
                    {galleryImages && galleryImages.length > 0 && (
                      <div className="w-full bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="font-semibold text-foreground flex items-center gap-2">
                            <span>🖼️</span> Poslední nahrané obrázky
                          </p>
                          <button
                            onClick={() => setOpenPanel("gallery")}
                            className="text-sm text-primary hover:underline"
                          >
                            Zobrazit vše →
                          </button>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {galleryImages.slice(0, 4).map((img, index) => (
                            <div 
                              key={img._id} 
                              className="aspect-square rounded-lg overflow-hidden bg-white border cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                              onClick={() => img.url && handleOpenLightbox(index)}
                            >
                              {img.url ? (
                                <Image
                                  src={img.url}
                                  alt={img.filename}
                                  width={100}
                                  height={100}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Copy Sales Claim */}
                    {product.salesClaim && (
                      <div className="p-4 bg-muted/50 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-2 font-medium">PRODEJNÍ CLAIM</p>
                        <p className="text-foreground font-medium mb-3">{product.salesClaim}</p>
                        <CopyButton text={product.salesClaim} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Third Column - Pro prodejce (Advanced Data) */}
                <div className="bg-card border border-border rounded-xl overflow-hidden h-full">
                  <div className="p-4 border-b border-border bg-muted/30">
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <span className="text-xl">📈</span>
                      Pro prodejce
                    </h2>
                  </div>
                  <div className="p-4 space-y-3">
                    {/* 3 Hlavní benefity */}
                    <div className={`w-full rounded-xl transition-colors ${
                      product.mainBenefits
                        ? "bg-amber-50 border border-amber-200"
                        : "bg-gray-50 border-2 border-dashed border-gray-300"
                    }`}>
                      {inlineEdit === "mainBenefits" ? (
                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-foreground">🎯 3 hlavní benefity</p>
                            <button onClick={() => setInlineEdit(null)} className="text-muted-foreground hover:text-foreground">✕</button>
                          </div>
                          <textarea
                            value={inlineValue}
                            onChange={(e) => setInlineValue(e.target.value)}
                            placeholder="1. ŘÍKÁ DĚKUJI ZA VÁS&#10;2. PRÉMIOVÝ DESIGN&#10;3. 4 LAHODNÉ PŘÍCHUTĚ"
                            className="w-full p-3 border rounded-lg text-sm font-mono min-h-[150px] resize-none bg-gray-900 text-amber-300"
                          />
                          <button
                            onClick={async () => {
                              setIsSaving(true);
                              try {
                                await updateMarketingData({
                                  id: productId,
                                  mainBenefits: inlineValue.trim() || undefined,
                                });
                                setInlineEdit(null);
                                setInlineValue("");
                              } catch (error) {
                                console.error("Error saving benefits:", error);
                              } finally {
                                setIsSaving(false);
                              }
                            }}
                            disabled={isSaving}
                            className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
                          >
                            {isSaving ? "Ukládám..." : "Uložit"}
                          </button>
                        </div>
                      ) : product.mainBenefits ? (
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <p className="font-semibold text-foreground flex items-center gap-2">
                              <span>🎯</span> 3 hlavní benefity
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => addToSalesKit({
                                  id: "mainBenefits",
                                  type: "whybuy",
                                  label: "3 hlavní benefity",
                                  content: product.mainBenefits || ""
                                })}
                                className={`p-2 rounded-lg transition-colors ${
                                  salesKitItems.find(i => i.id === "mainBenefits")
                                    ? "bg-green-500 text-white"
                                    : "bg-amber-100 hover:bg-amber-200 text-amber-700"
                                }`}
                                title="Přidat do Sales Kit"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                              </button>
                              <CopyButton text={product.mainBenefits || ""} />
                              <button
                                onClick={() => { setInlineEdit("mainBenefits"); setInlineValue(product.mainBenefits || ""); }}
                                className="p-2 hover:bg-black/10 rounded-lg transition-colors"
                                title="Upravit"
                              >
                                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <pre className="p-3 bg-gray-900 text-amber-300 rounded-lg text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                            {product.mainBenefits}
                          </pre>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 p-4">
                          <button
                            onClick={() => { setInlineEdit("mainBenefits"); setInlineValue(""); }}
                            className="flex items-center gap-4 flex-1 text-left hover:opacity-80 transition-opacity"
                          >
                            <div className="relative flex-shrink-0">
                              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                                <span className="text-2xl">🎯</span>
                              </div>
                              <span className="absolute -top-1 -left-1 w-5 h-5 bg-foreground text-background text-xs font-bold rounded-full flex items-center justify-center">0</span>
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-foreground">3 hlavní benefity</p>
                              <p className="text-sm text-muted-foreground">Přidejte 3 klíčové prodejní argumenty</p>
                            </div>
                            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Herb Composition */}
                    <div className={`w-full rounded-xl transition-colors ${
                      product.herbComposition
                        ? "bg-lime-50 border border-lime-200"
                        : "bg-gray-50 border-2 border-dashed border-gray-300"
                    }`}>
                      {inlineEdit === "herbComposition" ? (
                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-foreground">🌿 Hlavní zastoupení bylinek</p>
                            <button onClick={() => setInlineEdit(null)} className="text-muted-foreground hover:text-foreground">✕</button>
                          </div>
                          <textarea
                            value={inlineValue}
                            onChange={(e) => setInlineValue(e.target.value)}
                            placeholder="Vložte přehled bylinek..."
                            className="w-full p-3 border rounded-lg text-xs font-mono min-h-[300px] resize-none bg-gray-900 text-lime-300"
                          />
                          <button
                            onClick={() => handleInlineSave("herbComposition", inlineValue)}
                            disabled={isSaving}
                            className="px-4 py-2 bg-lime-600 text-white rounded-lg text-sm font-medium hover:bg-lime-700 disabled:opacity-50"
                          >
                            {isSaving ? "Ukládám..." : "Uložit"}
                          </button>
                        </div>
                      ) : product.herbComposition ? (
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <p className="font-semibold text-foreground flex items-center gap-2">
                              <span>🌿</span> Hlavní zastoupení bylinek
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => addToSalesKit({
                                  id: "herbComposition",
                                  type: "materials",
                                  label: "Zastoupení bylinek",
                                  content: product.herbComposition || ""
                                })}
                                className={`p-2 rounded-lg transition-colors ${
                                  salesKitItems.find(i => i.id === "herbComposition")
                                    ? "bg-green-500 text-white"
                                    : "bg-lime-100 hover:bg-lime-200 text-lime-700"
                                }`}
                                title="Přidat do Sales Kit"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                              </button>
                              <CopyButton text={product.herbComposition || ""} />
                              <button
                                onClick={() => { setInlineEdit("herbComposition"); setInlineValue(product.herbComposition || ""); }}
                                className="p-2 hover:bg-black/10 rounded-lg transition-colors"
                                title="Upravit"
                              >
                                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <pre className="text-xs font-mono whitespace-pre-wrap bg-gray-900 text-lime-300 p-4 rounded-lg overflow-x-auto">
                            {product.herbComposition}
                          </pre>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 p-4">
                          <button
                            onClick={() => { setInlineEdit("herbComposition"); setInlineValue(""); }}
                            className="flex items-center gap-4 flex-1 text-left hover:opacity-80 transition-opacity"
                          >
                            <div className="relative flex-shrink-0">
                              <div className="w-12 h-12 bg-lime-100 rounded-xl flex items-center justify-center">
                                <span className="text-2xl">🌿</span>
                              </div>
                              <span className="absolute -top-1 -left-1 w-5 h-5 bg-foreground text-background text-xs font-bold rounded-full flex items-center justify-center">0</span>
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-foreground">Hlavní zastoupení bylinek</p>
                              <p className="text-sm text-muted-foreground">Přidejte přehled složení produktu</p>
                            </div>
                            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Competition Comparison */}
                    <div className={`w-full rounded-xl transition-colors ${
                      product.competitionComparison
                        ? "bg-orange-50 border border-orange-200"
                        : "bg-gray-50 border-2 border-dashed border-gray-300"
                    }`}>
                      {inlineEdit === "competitionComparison" ? (
                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-foreground">⚔️ Srovnání s konkurencí</p>
                            <button onClick={() => setInlineEdit(null)} className="text-muted-foreground hover:text-foreground">✕</button>
                          </div>
                          <textarea
                            value={inlineValue}
                            onChange={(e) => setInlineValue(e.target.value)}
                            placeholder="Vložte srovnání s konkurencí..."
                            className="w-full p-3 border rounded-lg text-xs font-mono min-h-[300px] resize-none bg-gray-900 text-orange-300"
                          />
                          <button
                            onClick={() => handleInlineSave("competitionComparison", inlineValue)}
                            disabled={isSaving}
                            className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
                          >
                            {isSaving ? "Ukládám..." : "Uložit"}
                          </button>
                        </div>
                      ) : product.competitionComparison ? (
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <p className="font-semibold text-foreground flex items-center gap-2">
                              <span>⚔️</span> Srovnání s konkurencí
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => addToSalesKit({
                                  id: "competitionComparison",
                                  type: "materials",
                                  label: "Srovnání s konkurencí",
                                  content: product.competitionComparison || ""
                                })}
                                className={`p-2 rounded-lg transition-colors ${
                                  salesKitItems.find(i => i.id === "competitionComparison")
                                    ? "bg-green-500 text-white"
                                    : "bg-orange-100 hover:bg-orange-200 text-orange-700"
                                }`}
                                title="Přidat do Sales Kit"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                              </button>
                              <CopyButton text={product.competitionComparison || ""} />
                              <button
                                onClick={() => { setInlineEdit("competitionComparison"); setInlineValue(product.competitionComparison || ""); }}
                                className="p-2 hover:bg-black/10 rounded-lg transition-colors"
                                title="Upravit"
                              >
                                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <pre className="text-xs font-mono whitespace-pre-wrap bg-gray-900 text-orange-300 p-4 rounded-lg overflow-x-auto">
                            {product.competitionComparison}
                          </pre>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 p-4">
                          <button
                            onClick={() => { setInlineEdit("competitionComparison"); setInlineValue(""); }}
                            className="flex items-center gap-4 flex-1 text-left hover:opacity-80 transition-opacity"
                          >
                            <div className="relative flex-shrink-0">
                              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                                <span className="text-2xl">⚔️</span>
                              </div>
                              <span className="absolute -top-1 -left-1 w-5 h-5 bg-foreground text-background text-xs font-bold rounded-full flex items-center justify-center">0</span>
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-foreground">Srovnání s konkurencí</p>
                              <p className="text-sm text-muted-foreground">Přidejte srovnání produktu vs. konkurence</p>
                            </div>
                            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Sales Forecast */}
                    <div className={`w-full rounded-xl transition-colors ${
                      product.salesForecast
                        ? "bg-purple-50 border border-purple-200"
                        : "bg-gray-50 border-2 border-dashed border-gray-300"
                    }`}>
                      {inlineEdit === "salesForecast" ? (
                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-foreground">📊 Předpokládaná křivka prodejů</p>
                            <button onClick={() => setInlineEdit(null)} className="text-muted-foreground hover:text-foreground">✕</button>
                          </div>
                          <textarea
                            value={inlineValue}
                            onChange={(e) => setInlineValue(e.target.value)}
                            placeholder="Vložte graf prodejů (ASCII art)..."
                            className="w-full p-3 border rounded-lg text-xs font-mono min-h-[250px] resize-none bg-gray-900 text-purple-300"
                          />
                          <button
                            onClick={() => handleInlineSave("salesForecast", inlineValue)}
                            disabled={isSaving}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                          >
                            {isSaving ? "Ukládám..." : "Uložit"}
                          </button>
                        </div>
                      ) : product.salesForecast ? (
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <p className="font-semibold text-foreground flex items-center gap-2">
                              <span>📊</span> Předpokládaná křivka prodejů
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => addToSalesKit({
                                  id: "salesForecast",
                                  type: "materials",
                                  label: "Křivka prodejů",
                                  content: product.salesForecast || ""
                                })}
                                className={`p-2 rounded-lg transition-colors ${
                                  salesKitItems.find(i => i.id === "salesForecast")
                                    ? "bg-green-500 text-white"
                                    : "bg-purple-100 hover:bg-purple-200 text-purple-700"
                                }`}
                                title="Přidat do Sales Kit"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                              </button>
                              <CopyButton text={product.salesForecast} />
                              <button
                                onClick={() => { setInlineEdit("salesForecast"); setInlineValue(product.salesForecast || ""); }}
                                className="p-2 hover:bg-black/10 rounded-lg transition-colors"
                                title="Upravit graf"
                              >
                                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                            <pre className="text-xs text-purple-300 font-mono whitespace-pre">{product.salesForecast}</pre>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 p-4">
                          <button
                            onClick={() => { setInlineEdit("salesForecast"); setInlineValue(""); }}
                            className="flex items-center gap-4 flex-1 text-left hover:opacity-80 transition-opacity"
                          >
                            <div className="relative flex-shrink-0">
                              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                                <span className="text-2xl">📊</span>
                              </div>
                              <span className="absolute -top-1 -left-1 w-5 h-5 bg-foreground text-background text-xs font-bold rounded-full flex items-center justify-center">1</span>
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-foreground">Křivka prodejů</p>
                              <p className="text-sm text-muted-foreground">Přidejte předpokládané prodeje po měsících</p>
                            </div>
                            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* FAQ Section */}
                    <div className={`w-full rounded-xl transition-colors ${
                      product.faqText
                        ? "bg-[#f8f5f0] border border-amber-200"
                        : "bg-gray-50 border-2 border-dashed border-gray-300"
                    }`}>
                      {inlineEdit === "faq" ? (
                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-foreground">💬 ČASTÉ OTÁZKY ZÁKAZNÍKŮ (FAQ)</p>
                            <button onClick={() => setInlineEdit(null)} className="text-muted-foreground hover:text-foreground">✕</button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Formát: OTÁZKAODPOVĚĎ„Otázka?"Odpověď.„Další otázka?"Další odpověď.
                          </p>
                          <textarea
                            value={inlineValue}
                            onChange={(e) => setInlineValue(e.target.value)}
                            placeholder='OTÁZKAODPOVĚĎ„Od jakého věku?"Od ukončeného 9. měsíce.„Obsahuje cukr?"Ne, je bez přidaného cukru.'
                            className="w-full p-3 border rounded-lg text-sm min-h-[200px] resize-none"
                          />
                          <button
                            onClick={() => handleInlineSave("faqText", inlineValue)}
                            disabled={isSaving}
                            className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
                          >
                            {isSaving ? "Ukládám..." : "Uložit"}
                          </button>
                        </div>
                      ) : product.faqText ? (
                        <div className="p-5">
                          <div className="flex items-center justify-between mb-4">
                            <p className="font-semibold text-foreground flex items-center gap-2 text-lg">
                              <span>💬</span> ČASTÉ OTÁZKY ZÁKAZNÍKŮ (FAQ)
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => addToSalesKit({
                                  id: "faq-text",
                                  type: "whybuy",
                                  label: "FAQ - Časté dotazy",
                                  content: product.faqText || ""
                                })}
                                className={`p-2 rounded-lg transition-colors ${
                                  salesKitItems.find(i => i.id === "faq-text")
                                    ? "bg-green-500 text-white"
                                    : "bg-amber-100 hover:bg-amber-200 text-amber-700"
                                }`}
                                title="Přidat do Sales Kit"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                              </button>
                              <CopyButton text={product.faqText} />
                              <button
                                onClick={() => { setInlineEdit("faq"); setInlineValue(product.faqText || ""); }}
                                className="p-2 hover:bg-black/10 rounded-lg transition-colors"
                                title="Upravit FAQ"
                              >
                                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <div className="bg-gray-900 rounded-lg p-3 overflow-x-auto">
                            <pre className="text-[10px] text-green-400 font-mono whitespace-pre leading-tight">{product.faqText}</pre>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 p-4">
                          <button
                            onClick={() => { setInlineEdit("faq"); setInlineValue(""); }}
                            className="flex items-center gap-4 flex-1 text-left hover:opacity-80 transition-opacity"
                          >
                            <div className="relative flex-shrink-0">
                              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                                <span className="text-2xl">💬</span>
                              </div>
                              <span className="absolute -top-1 -left-1 w-5 h-5 bg-foreground text-background text-xs font-bold rounded-full flex items-center justify-center">2</span>
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-foreground">FAQ</p>
                              <p className="text-sm text-muted-foreground">Přidejte časté dotazy a odpovědi</p>
                            </div>
                            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Sezónní příležitosti Section - Editable */}
                    <div className={`w-full rounded-xl transition-colors ${
                      product.seasonalOpportunities
                        ? "bg-[#f0f8f0] border border-green-200"
                        : "bg-gray-50 border-2 border-dashed border-gray-300"
                    }`}>
                      {inlineEdit === "seasonalOpportunities" ? (
                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-foreground">📅 SEZÓNNÍ PŘÍLEŽITOSTI</p>
                            <button onClick={() => setInlineEdit(null)} className="text-muted-foreground hover:text-foreground">✕</button>
                          </div>
                          <textarea
                            value={inlineValue}
                            onChange={(e) => setInlineValue(e.target.value)}
                            placeholder="Vložte tabulku sezónních příležitostí (ASCII art)..."
                            className="w-full p-3 border rounded-lg text-xs font-mono min-h-[250px] resize-none bg-gray-900 text-green-400"
                          />
                          <button
                            onClick={() => handleInlineSave("seasonalOpportunities", inlineValue)}
                            disabled={isSaving}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                          >
                            {isSaving ? "Ukládám..." : "Uložit"}
                          </button>
                        </div>
                      ) : product.seasonalOpportunities ? (
                        <div className="p-5">
                          <div className="flex items-center justify-between mb-4">
                            <p className="font-semibold text-foreground flex items-center gap-2 text-lg">
                              <span>📅</span> SEZÓNNÍ PŘÍLEŽITOSTI
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => addToSalesKit({
                                  id: "seasonal-opportunities",
                                  type: "whybuy",
                                  label: "Sezónní příležitosti",
                                  content: product.seasonalOpportunities || ""
                                })}
                                className={`p-2 rounded-lg transition-colors ${
                                  salesKitItems.find(i => i.id === "seasonal-opportunities")
                                    ? "bg-green-500 text-white"
                                    : "bg-green-100 hover:bg-green-200 text-green-700"
                                }`}
                                title="Přidat do Sales Kit"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                              </button>
                              <CopyButton text={product.seasonalOpportunities} />
                              <button
                                onClick={() => { setInlineEdit("seasonalOpportunities"); setInlineValue(product.seasonalOpportunities || ""); }}
                                className="p-2 hover:bg-black/10 rounded-lg transition-colors"
                                title="Upravit"
                              >
                                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <div className="bg-gray-900 rounded-lg p-3 overflow-x-auto">
                            <pre className="text-[10px] text-green-400 font-mono whitespace-pre leading-tight">{product.seasonalOpportunities}</pre>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 p-4">
                          <button
                            onClick={() => { setInlineEdit("seasonalOpportunities"); setInlineValue(""); }}
                            className="flex items-center gap-4 flex-1 text-left hover:opacity-80 transition-opacity"
                          >
                            <div className="relative flex-shrink-0">
                              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                                <span className="text-2xl">📅</span>
                              </div>
                              <span className="absolute -top-1 -left-1 w-5 h-5 bg-foreground text-background text-xs font-bold rounded-full flex items-center justify-center">3</span>
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-foreground">Sezónní příležitosti</p>
                              <p className="text-sm text-muted-foreground">Přidejte tabulku sezónních prodejních příležitostí</p>
                            </div>
                            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Senzorický profil Section - Editable */}
                    <div className={`w-full rounded-xl transition-colors ${
                      product.sensoryProfile
                        ? "bg-[#f5f0f8] border border-purple-200"
                        : "bg-gray-50 border-2 border-dashed border-gray-300"
                    }`}>
                      {inlineEdit === "sensoryProfile" ? (
                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-foreground">👃 SENZORICKÝ PROFIL</p>
                            <button onClick={() => setInlineEdit(null)} className="text-muted-foreground hover:text-foreground">✕</button>
                          </div>
                          <textarea
                            value={inlineValue}
                            onChange={(e) => setInlineValue(e.target.value)}
                            placeholder="Vložte senzorický profil produktu (ASCII art)..."
                            className="w-full p-3 border rounded-lg text-xs font-mono min-h-[250px] resize-none bg-gray-900 text-purple-300"
                          />
                          <button
                            onClick={() => handleInlineSave("sensoryProfile", inlineValue)}
                            disabled={isSaving}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                          >
                            {isSaving ? "Ukládám..." : "Uložit"}
                          </button>
                        </div>
                      ) : product.sensoryProfile ? (
                        <div className="p-5">
                          <div className="flex items-center justify-between mb-4">
                            <p className="font-semibold text-foreground flex items-center gap-2 text-lg">
                              <span>👃</span> SENZORICKÝ PROFIL
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => addToSalesKit({
                                  id: "sensory-profile",
                                  type: "whybuy",
                                  label: "Senzorický profil",
                                  content: product.sensoryProfile || ""
                                })}
                                className={`p-2 rounded-lg transition-colors ${
                                  salesKitItems.find(i => i.id === "sensory-profile")
                                    ? "bg-green-500 text-white"
                                    : "bg-purple-100 hover:bg-purple-200 text-purple-700"
                                }`}
                                title="Přidat do Sales Kit"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                              </button>
                              <CopyButton text={product.sensoryProfile} />
                              <button
                                onClick={() => { setInlineEdit("sensoryProfile"); setInlineValue(product.sensoryProfile || ""); }}
                                className="p-2 hover:bg-black/10 rounded-lg transition-colors"
                                title="Upravit"
                              >
                                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <div className="bg-gray-900 rounded-lg p-3 overflow-x-auto">
                            <pre className="text-[10px] text-purple-300 font-mono whitespace-pre leading-tight">{product.sensoryProfile}</pre>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 p-4">
                          <button
                            onClick={() => { setInlineEdit("sensoryProfile"); setInlineValue(""); }}
                            className="flex items-center gap-4 flex-1 text-left hover:opacity-80 transition-opacity"
                          >
                            <div className="relative flex-shrink-0">
                              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                                <span className="text-2xl">👃</span>
                              </div>
                              <span className="absolute -top-1 -left-1 w-5 h-5 bg-foreground text-background text-xs font-bold rounded-full flex items-center justify-center">4</span>
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-foreground">Senzorický profil</p>
                              <p className="text-sm text-muted-foreground">Přidejte senzorický profil produktu</p>
                            </div>
                            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Reference Card Panel Sheet */}
              <Sheet open={openPanel === "referenceCard"} onOpenChange={(open) => !open && setOpenPanel(null)}>
                <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto bg-gray-900 border-gray-700">
                  <SheetHeader className="mb-6">
                    <SheetTitle className="flex items-center gap-2 text-xl text-green-400">
                      <span>📋</span>
                      Quick Reference Card
                    </SheetTitle>
                  </SheetHeader>
                  
                  {product.quickReferenceCard ? (
                    <div className="space-y-4">
                      <div className="flex justify-end">
                        <CopyButton text={product.quickReferenceCard} />
                      </div>
                      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 overflow-x-auto">
                        <pre className="text-xs text-green-400 font-mono whitespace-pre leading-tight">
                          {product.quickReferenceCard}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
                      <span className="text-4xl mb-4 block">📝</span>
                      <h3 className="text-lg font-semibold text-gray-300 mb-2">Karta není vyplněna</h3>
                      <p className="text-gray-500">Vyplňte Quick Reference Card v administraci (/sprava).</p>
                    </div>
                  )}
                </SheetContent>
              </Sheet>

              {/* Social Panel Sheet */}
              <Sheet open={openPanel === "social"} onOpenChange={(open) => !open && setOpenPanel(null)}>
                <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
                  <SheetHeader className="mb-6">
                    <SheetTitle className="flex items-center gap-2 text-xl">
                      <span>📢</span>
                      Propagovat na sítích
                    </SheetTitle>
                  </SheetHeader>
                  
                  <div className="space-y-6">
                    {!hasSocialData ? (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                        <span className="text-3xl mb-3 block">⚠️</span>
                        <h3 className="font-semibold text-amber-800 mb-1">Příspěvky nejsou připraveny</h3>
                        <p className="text-sm text-amber-700">Pro tento produkt zatím nebyly připraveny texty.</p>
                      </div>
                    ) : (
                      <>
                        {/* Facebook */}
                        {product.socialFacebook && (
                          <div className="space-y-3">
                            <h3 className="font-semibold text-foreground flex items-center gap-2">
                              <span>📘</span> Facebook post
                            </h3>
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                              <pre className="whitespace-pre-wrap text-blue-800 font-sans text-sm mb-4">{product.socialFacebook}</pre>
                              <CopyButton text={product.socialFacebook} />
                            </div>
                          </div>
                        )}

                        {/* Instagram */}
                        {product.socialInstagram && (
                          <div className="space-y-3">
                            <h3 className="font-semibold text-foreground flex items-center gap-2">
                              <span>📸</span> Instagram post
                            </h3>
                            <div className="p-4 bg-pink-50 border border-pink-200 rounded-lg">
                              <pre className="whitespace-pre-wrap text-pink-800 font-sans text-sm mb-4">{product.socialInstagram}</pre>
                              <CopyButton text={product.socialInstagram} />
                            </div>
                          </div>
                        )}

                        {/* Hashtags */}
                        {product.hashtags && product.hashtags.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="font-semibold text-foreground flex items-center gap-2">
                              <span>#️⃣</span> Hashtagy
                            </h3>
                            <div className="p-4 bg-muted/50 rounded-lg">
                              <div className="flex flex-wrap gap-2 mb-4">
                                {product.hashtags.map((tag, index) => (
                                  <span key={index} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                              <CopyButton text={product.hashtags.map(t => `#${t}`).join(" ")} />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </SheetContent>
              </Sheet>

              {/* Materials Panel Sheet */}
              <Sheet open={openPanel === "materials"} onOpenChange={(open) => !open && setOpenPanel(null)}>
                <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
                  <SheetHeader className="mb-6">
                    <SheetTitle className="flex items-center gap-2 text-xl">
                      <span>📥</span>
                      Materiály ke stažení
                    </SheetTitle>
                  </SheetHeader>
                  
                  <div className="space-y-6">
                    {/* PDF */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <span>📄</span> Produktový list
                      </h3>
                      {product.pdfUrl ? (
                        <div className="p-4 bg-muted/50 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4z" />
                              </svg>
                            </div>
                            <span className="text-sm font-medium">PDF produktový list</span>
                          </div>
                          <a href={product.pdfUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90">
                            Stáhnout
                          </a>
                        </div>
                      ) : (
                        <div className="p-4 bg-muted/30 rounded-lg text-center text-muted-foreground text-sm">
                          PDF není k dispozici
                        </div>
                      )}
                    </div>

                    {/* Banners */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <span>🖼️</span> Bannery
                      </h3>
                      {product.bannerUrls && product.bannerUrls.length > 0 ? (
                        <div className="grid gap-3">
                          {product.bannerUrls.map((banner, index) => (
                            <div key={index} className="p-3 bg-muted/50 rounded-lg flex items-center justify-between">
                              <span className="text-sm">{banner.size}</span>
                              <a href={banner.url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90">
                                Stáhnout
                              </a>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 bg-muted/30 rounded-lg text-center text-muted-foreground text-sm">
                          Bannery nejsou k dispozici
                        </div>
                      )}
                    </div>

                    {/* Product Image */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <span>📷</span> Produktová fotka
                      </h3>
                      {product.image ? (
                        <div className="space-y-3">
                          <div className="aspect-square w-full max-w-[200px] mx-auto rounded-lg overflow-hidden bg-muted">
                            <Image src={product.image} alt={product.name} width={200} height={200} className="w-full h-full object-cover" />
                          </div>
                          <a href={product.image} target="_blank" rel="noopener noreferrer" className="block text-center px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90">
                            Stáhnout originál
                          </a>
                        </div>
                      ) : (
                        <div className="p-4 bg-muted/30 rounded-lg text-center text-muted-foreground text-sm">
                          Fotka není k dispozici
                        </div>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              {/* Edit Panel Sheet */}
              <Sheet open={openPanel === "edit"} onOpenChange={(open) => !open && setOpenPanel(null)}>
                <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
                  <SheetHeader className="mb-6">
                    <SheetTitle className="flex items-center gap-2 text-xl">
                      <span>✏️</span>
                      Rychlá úprava
                    </SheetTitle>
                  </SheetHeader>
                  
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Pro kompletní editaci přejděte do sekce &quot;Editovat&quot; v levém menu.
                    </p>
                    
                    <div className="space-y-4">
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Aktuální kategorie</p>
                        <p className="font-medium">{product.category || "Nenastaveno"}</p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Tier priorita</p>
                        <p className="font-medium">{product.tier || "Nenastaveno"}</p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Brand Pillar</p>
                        <p className="font-medium">{product.brandPillar || "Nenastaveno"}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => { setOpenPanel(null); setActiveSection("edit"); }}
                      className="w-full mt-4 px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                    >
                      Otevřít plnou editaci →
                    </button>
                  </div>
                </SheetContent>
              </Sheet>

              {/* Gallery Panel Sheet */}
              <Sheet open={openPanel === "gallery"} onOpenChange={(open) => !open && setOpenPanel(null)}>
                <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
                  <SheetHeader className="mb-6">
                    <SheetTitle className="flex items-center gap-2 text-xl">
                      <span>🖼️</span>
                      Galerie produktu
                    </SheetTitle>
                  </SheetHeader>
                  
                  <div className="space-y-4">
                    {/* Upload Section */}
                    <div className="border-2 border-dashed border-border rounded-xl p-4">
                      <div className="flex items-center gap-4">
                        <Input
                          type="text"
                          placeholder="Tagy (oddělte čárkou)"
                          value={newImageTags}
                          onChange={(e) => setNewImageTags(e.target.value)}
                          className="flex-1"
                        />
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            
                            setIsUploading(true);
                            try {
                              console.log("Starting upload for:", file.name);
                              const uploadUrl = await generateUploadUrl();
                              const result = await fetch(uploadUrl, {
                                method: "POST",
                                headers: { "Content-Type": file.type },
                                body: file,
                              });
                              const { storageId } = await result.json();
                              
                              const tags = newImageTags.split(",").map(t => t.trim()).filter(Boolean);
                              await saveImage({
                                productId,
                                storageId,
                                filename: file.name,
                                contentType: file.type,
                                size: file.size,
                                tags,
                              });
                              console.log("Image saved successfully");
                              setNewImageTags("");
                            } catch (error) {
                              console.error("Upload failed:", error);
                            } finally {
                              setIsUploading(false);
                              if (fileInputRef.current) {
                                fileInputRef.current.value = "";
                              }
                            }
                          }}
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          {isUploading ? "Nahrávám..." : "Nahrát obrázek"}
                        </button>
                      </div>
                    </div>

                    {/* Tags Filter */}
                    {galleryTags && galleryTags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setSelectedGalleryTag(undefined)}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                            !selectedGalleryTag
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          Vše
                        </button>
                        {galleryTags.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => setSelectedGalleryTag(tag)}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                              selectedGalleryTag === tag
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Images Grid */}
                    {galleryImages && galleryImages.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {galleryImages.map((img) => (
                          <div key={img._id} className="relative group aspect-square rounded-lg overflow-hidden bg-muted">
                            {img.url ? (
                              <Image
                                src={img.url}
                                alt={img.filename || "Gallery image"}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                Načítám...
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                onClick={() => deleteImage({ id: img._id })}
                                className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600"
                              >
                                Smazat
                              </button>
                            </div>
                            {img.tags && img.tags.length > 0 && (
                              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                                <div className="flex flex-wrap gap-1">
                                  {img.tags.slice(0, 2).map((tag, i) => (
                                    <span key={i} className="text-xs bg-white/20 text-white px-2 py-0.5 rounded">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-muted-foreground bg-muted/30 rounded-xl">
                        <span className="text-4xl mb-3 block">🖼️</span>
                        <p>Zatím žádné obrázky</p>
                        <p className="text-sm">Nahrajte první obrázek výše</p>
                      </div>
                    )}

                    <button
                      onClick={() => { setOpenPanel(null); setActiveSection("gallery"); }}
                      className="w-full mt-4 px-4 py-3 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors"
                    >
                      Otevřít plnou galerii →
                    </button>
                  </div>
                </SheetContent>
              </Sheet>

              {/* Promotion History Panel Sheet */}
              <Sheet open={openPanel === "promotionHistory"} onOpenChange={(open) => !open && setOpenPanel(null)}>
                <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
                  <SheetHeader className="mb-6">
                    <SheetTitle className="flex items-center gap-2 text-xl">
                      <span>📜</span>
                      Historie propagace
                    </SheetTitle>
                  </SheetHeader>
                  
                  {/* Add new log form */}
                  <div className="bg-muted/30 border border-border rounded-xl p-4 mb-6">
                    <h3 className="font-semibold text-sm mb-3">Přidat záznam</h3>
                    <div className="space-y-3">
                      <Input
                        placeholder="Název (např. TV Reklama, Facebook Ads)"
                        value={newLogTitle}
                        onChange={(e) => setNewLogTitle(e.target.value)}
                        className="w-full"
                      />
                      <Input
                        type="date"
                        value={newLogDate}
                        onChange={(e) => setNewLogDate(e.target.value)}
                        className="w-full"
                      />
                      <Input
                        placeholder="URL odkaz (volitelné)"
                        value={newLogUrl}
                        onChange={(e) => setNewLogUrl(e.target.value)}
                        className="w-full"
                      />
                      <button
                        onClick={async () => {
                          if (!newLogTitle.trim() || !newLogDate) return;
                          await addPromotionLog({
                            productId,
                            title: newLogTitle.trim(),
                            date: new Date(newLogDate).getTime(),
                            url: newLogUrl.trim() || undefined,
                          });
                          setNewLogTitle("");
                          setNewLogDate("");
                          setNewLogUrl("");
                        }}
                        disabled={!newLogTitle.trim() || !newLogDate}
                        className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                      >
                        Přidat záznam
                      </button>
                    </div>
                  </div>
                  
                  {/* Log list - GitHub style */}
                  <div className="space-y-0">
                    {promotionLogs && promotionLogs.length > 0 ? (
                      <div className="border border-border rounded-xl overflow-hidden">
                        {promotionLogs.map((log, index) => (
                          <div 
                            key={log._id}
                            className={`flex items-center gap-3 p-3 ${
                              index !== promotionLogs.length - 1 ? "border-b border-border" : ""
                            } hover:bg-muted/30`}
                          >
                            {/* Commit dot */}
                            <div className="w-3 h-3 rounded-full bg-indigo-500 flex-shrink-0" />
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-foreground truncate">{log.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(log.date).toLocaleDateString("cs-CZ", { 
                                  day: "numeric", 
                                  month: "short", 
                                  year: "numeric" 
                                })}
                              </p>
                            </div>
                            
                            {/* Actions */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {log.url && (
                                <a
                                  href={log.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground"
                                  title="Otevřít odkaz"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              )}
                              <button
                                onClick={() => removePromotionLog({ id: log._id })}
                                className="p-1.5 hover:bg-red-100 rounded-lg text-muted-foreground hover:text-red-600"
                                title="Smazat"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <span className="text-4xl mb-3 block">📭</span>
                        <p className="text-sm">Zatím žádné záznamy propagace.</p>
                        <p className="text-xs mt-1">Přidejte první záznam výše.</p>
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>

              {/* Quick Stats - Below the two columns */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{product.hashtags?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Hashtagů</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{product.bannerUrls?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Bannerů</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{product.whyBuy?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Důvodů ke koupi</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{product.pdfUrl ? "1" : "0"}</p>
                  <p className="text-sm text-muted-foreground">PDF materiálů</p>
                </div>
              </div>

              {/* To-Do List Section */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-5 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <span className="text-xl">📝</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Marketingové úkoly</h3>
                        <p className="text-sm text-muted-foreground">
                          {completedCount} z {totalTodos} splněno
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-primary">{progressPercent}%</span>
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-border">
                  {todoItems.map((todo) => (
                    <div 
                      key={todo.id}
                      className={`flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors ${
                        completedTodos.has(todo.id) ? "bg-muted/30" : ""
                      }`}
                    >
                      <Checkbox
                        id={todo.id}
                        checked={completedTodos.has(todo.id)}
                        onCheckedChange={() => toggleTodo(todo.id)}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <label 
                        htmlFor={todo.id}
                        className={`flex-1 text-sm cursor-pointer ${
                          completedTodos.has(todo.id) 
                            ? "text-muted-foreground line-through" 
                            : "text-foreground"
                        }`}
                      >
                        {todo.label}
                      </label>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        todo.priority === "high" 
                          ? "bg-red-100 text-red-700"
                          : todo.priority === "medium"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {todo.priority === "high" ? "Vysoká" : todo.priority === "medium" ? "Střední" : "Nízká"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === "eshop" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Data z e-shopu</h1>
                <p className="text-muted-foreground">Automaticky synchronizovaná data z XML feedu</p>
              </div>

              {/* Product Image & Basic Info */}
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="w-full md:w-48 aspect-square rounded-xl bg-muted overflow-hidden flex-shrink-0">
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.name}
                        width={192}
                        height={192}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <span className="text-6xl">🍵</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        product.availability === "in_stock" 
                          ? "bg-green-100 text-green-700" 
                          : "bg-red-100 text-red-700"
                      }`}>
                        {product.availability === "in_stock" ? "Skladem" : "Vyprodáno"}
                      </span>
                      {product.brand && (
                        <span className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-sm">
                          {product.brand}
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-foreground mb-2">{product.name}</h2>
                    <p className="text-3xl font-bold text-primary mb-4">{product.price} Kč</p>
                    
                    {product.productUrl && (
                      <a 
                        href={product.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        Zobrazit na e-shopu
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Description from feed */}
              {product.description && (
                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <span className="text-xl">📝</span>
                    Popis produktu
                  </h3>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-foreground whitespace-pre-wrap">{product.description}</p>
                  </div>
                </div>
              )}

              {/* Technical Info */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <span className="text-xl">🔧</span>
                  Technické informace
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">External ID</p>
                    <p className="font-mono text-foreground">{product.externalId}</p>
                  </div>
                  {product.gtin && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">GTIN / EAN</p>
                      <p className="font-mono text-foreground">{product.gtin}</p>
                    </div>
                  )}
                  {product.productType && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Kategorie (feed)</p>
                      <p className="text-foreground">{product.productType}</p>
                    </div>
                  )}
                  {product.lastSyncedAt && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Poslední synchronizace</p>
                      <p className="text-foreground">{new Date(product.lastSyncedAt).toLocaleString("cs-CZ")}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSection === "marketing" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Marketingová data</h1>
                <p className="text-muted-foreground">Ručně přidaná data pro prodejce</p>
              </div>

              {!hasMarketingData ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
                  <span className="text-4xl mb-4 block">⚠️</span>
                  <h3 className="text-lg font-semibold text-amber-800 mb-2">Marketingová data nejsou vyplněna</h3>
                  <p className="text-amber-700">Pro tento produkt zatím nebyla přidána marketingová data.</p>
                </div>
              ) : (
                <>
                  {/* Sales Claim */}
                  {product.salesClaim && (
                    <div className="bg-card border border-border rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <span className="text-xl">💬</span>
                        Prodejní claim
                      </h3>
                      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                        <p className="font-semibold text-primary text-lg">{product.salesClaim}</p>
                        {product.salesClaimSubtitle && (
                          <p className="text-muted-foreground mt-2">{product.salesClaimSubtitle}</p>
                        )}
                        <div className="mt-3">
                          <CopyButton text={product.salesClaim} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Why Buy */}
                  {product.whyBuy && product.whyBuy.length > 0 && (
                    <div className="bg-card border border-border rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <span className="text-xl">✨</span>
                        Proč koupit
                      </h3>
                      <div className="grid gap-3">
                        {product.whyBuy.map((item, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg"
                          >
                            <span className="text-2xl flex-shrink-0">{item.icon}</span>
                            <p className="text-foreground">{item.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Target Audience */}
                  {product.targetAudience && (
                    <div className="bg-card border border-border rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <span className="text-xl">🎯</span>
                        Cílová skupina
                      </h3>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-foreground">{product.targetAudience}</p>
                      </div>
                    </div>
                  )}

                  {/* Brand Info */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {product.brandPillar && (
                      <div className="bg-card border border-border rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                          <span className="text-xl">🏛️</span>
                          Brand Pillar
                        </h3>
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <BrandPillarBadge pillar={product.brandPillar} />
                          <p className="text-sm text-muted-foreground mt-3">
                            {product.brandPillar === "Věda" && "Produkt je podpořen vědeckými studiemi a výzkumem."}
                            {product.brandPillar === "BIO" && "Certifikovaná BIO kvalita z ekologického zemědělství."}
                            {product.brandPillar === "Funkce" && "Funkční čaj s konkrétním zdravotním benefitem."}
                            {product.brandPillar === "Tradice" && "Tradiční české bylinky a receptury."}
                            {product.brandPillar === "Rodina" && "Vhodné pro celou rodinu včetně dětí."}
                          </p>
                        </div>
                      </div>
                    )}

                    {product.tier && (
                      <div className="bg-card border border-border rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                          <span className="text-xl">⭐</span>
                          Tier priorita
                        </h3>
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3 mb-3">
                            <TierBadge tier={product.tier} className="w-12 h-12 text-lg" />
                            <span className="text-foreground font-semibold text-lg">
                              {product.tier === "A" ? "Vysoká priorita" : product.tier === "B" ? "Střední priorita" : "Nízká priorita"}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {product.tier === "A" && "Klíčový produkt pro aktivní propagaci a kampaně."}
                            {product.tier === "B" && "Standardní produkt pro běžnou komunikaci."}
                            {product.tier === "C" && "Doplňkový produkt, nižší priorita v marketingu."}
                          </p>
                        </div>
                      </div>
                    )}

                    {product.category && (
                      <div className="bg-card border border-border rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                          <span className="text-xl">📂</span>
                          Kategorie
                        </h3>
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <CategoryBadge category={product.category} />
                          <p className="text-sm text-muted-foreground mt-3">
                            {product.category === "Bylinný" && "Klasické bylinné čaje z přírodních ingrediencí."}
                            {product.category === "Funkční" && "Čaje s konkrétním funkčním účinkem na zdraví."}
                            {product.category === "Dětský" && "Speciálně vyvinuté čaje bezpečné pro děti."}
                            {product.category === "BIO" && "Certifikované BIO čaje z ekologického zemědělství."}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeSection === "social" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Sociální sítě</h1>
                <p className="text-muted-foreground">Připravené texty pro příspěvky</p>
              </div>

              {!hasSocialData ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
                  <span className="text-4xl mb-4 block">⚠️</span>
                  <h3 className="text-lg font-semibold text-amber-800 mb-2">Příspěvky nejsou připraveny</h3>
                  <p className="text-amber-700">Pro tento produkt zatím nebyly připraveny texty pro sociální sítě.</p>
                </div>
              ) : (
                <>
                  {/* Facebook */}
                  {product.socialFacebook && (
                    <div className="bg-card border border-border rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <span className="text-xl">📘</span>
                        Facebook post
                      </h3>
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <pre className="whitespace-pre-wrap text-blue-800 font-sans text-sm mb-4">
                          {product.socialFacebook}
                        </pre>
                        <CopyButton text={product.socialFacebook} />
                      </div>
                    </div>
                  )}

                  {/* Instagram */}
                  {product.socialInstagram && (
                    <div className="bg-card border border-border rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <span className="text-xl">📸</span>
                        Instagram post
                      </h3>
                      <div className="p-4 bg-pink-50 border border-pink-200 rounded-lg">
                        <pre className="whitespace-pre-wrap text-pink-800 font-sans text-sm mb-4">
                          {product.socialInstagram}
                        </pre>
                        <CopyButton text={product.socialInstagram} />
                      </div>
                    </div>
                  )}

                  {/* Hashtags */}
                  {product.hashtags && product.hashtags.length > 0 && (
                    <div className="bg-card border border-border rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <span className="text-xl">#️⃣</span>
                        Doporučené hashtagy
                      </h3>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <div className="flex flex-wrap gap-2 mb-4">
                          {product.hashtags.map((tag, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                        <CopyButton text={product.hashtags.map(t => `#${t}`).join(" ")} />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeSection === "materials" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Materiály ke stažení</h1>
                <p className="text-muted-foreground">PDF a bannery pro marketing</p>
              </div>

              {/* PDF Download */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <span className="text-xl">📄</span>
                  Produktový list
                </h3>
                {product.pdfUrl ? (
                  <div className="p-4 bg-muted/50 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zm-3 9v6h2v-2h1a2 2 0 000-4h-3zm2 2h1v-1h-1v1z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Produktový list PDF</p>
                        <p className="text-sm text-muted-foreground">Kompletní informace o produktu</p>
                      </div>
                    </div>
                    <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Stáhnout
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-muted/50 rounded-lg text-center text-muted-foreground">
                    PDF materiál není k dispozici
                  </div>
                )}
              </div>

              {/* Banners */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <span className="text-xl">🖼️</span>
                  Bannery
                </h3>
                {product.bannerUrls && product.bannerUrls.length > 0 ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {product.bannerUrls.map((banner, index) => (
                      <div
                        key={index}
                        className="p-4 bg-muted/50 rounded-lg"
                      >
                        <div className="aspect-video bg-muted rounded-lg mb-3 flex items-center justify-center text-muted-foreground">
                          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">{banner.size}</span>
                          <button className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Stáhnout
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-muted/50 rounded-lg text-center text-muted-foreground">
                    Žádné bannery nejsou k dispozici
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === "gallery" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Galerie produktu</h1>
                <p className="text-muted-foreground">Obrázky a marketingové materiály k tomuto produktu</p>
              </div>

              {/* Upload Section */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <span className="text-xl">📤</span>
                  Nahrát nový obrázek
                </h3>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      disabled={isUploading}
                      className="cursor-pointer"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (!file.type.startsWith("image/")) {
                          alert("Prosím vyberte obrázek");
                          return;
                        }
                        try {
                          setIsUploading(true);
                          console.log("Starting upload for:", file.name);
                          const uploadUrl = await generateUploadUrl();
                          const uploadResponse = await fetch(uploadUrl, {
                            method: "POST",
                            headers: { "Content-Type": file.type },
                            body: file,
                          });
                          if (!uploadResponse.ok) {
                            throw new Error(`Upload failed: ${uploadResponse.statusText}`);
                          }
                          const { storageId } = await uploadResponse.json();
                          if (!storageId) {
                            throw new Error("No storage ID returned");
                          }
                          const tags = newImageTags.split(",").map(t => t.trim()).filter(t => t.length > 0);
                          await saveImage({
                            productId,
                            storageId,
                            filename: file.name,
                            contentType: file.type,
                            size: file.size,
                            tags,
                          });
                          console.log("Image saved successfully");
                          setNewImageTags("");
                          if (fileInputRef.current) {
                            fileInputRef.current.value = "";
                          }
                        } catch (error) {
                          console.error("Upload error:", error);
                          alert("Chyba při nahrávání: " + (error as Error).message);
                        } finally {
                          setIsUploading(false);
                        }
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      type="text"
                      placeholder="Tagy (oddělené čárkou, např: banner, social, produkt)"
                      value={newImageTags}
                      onChange={(e) => setNewImageTags(e.target.value)}
                      disabled={isUploading}
                    />
                  </div>
                </div>
                {isUploading && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span>Nahrávám...</span>
                  </div>
                )}
              </div>

              {/* Tag Filters */}
              {galleryTags && galleryTags.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Filtrovat podle tagu:</h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedGalleryTag(undefined)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        selectedGalleryTag === undefined
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      Všechny
                    </button>
                    {galleryTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setSelectedGalleryTag(tag)}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                          selectedGalleryTag === tag
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Gallery Grid */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <span className="text-xl">🖼️</span>
                  Obrázky ({galleryImages?.length || 0})
                </h3>
                {galleryImages === undefined ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : galleryImages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="text-4xl mb-3">📷</div>
                    <p>Zatím žádné obrázky. Nahrajte první pomocí formuláře výše.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {galleryImages.map((image, index) => (
                      <div
                        key={image._id}
                        className="relative group rounded-xl overflow-hidden bg-muted aspect-square cursor-pointer"
                        onClick={() => image.url && handleOpenLightbox(index)}
                      >
                        {image.url ? (
                          <img
                            src={image.url}
                            alt={image.filename}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            Načítám...
                          </div>
                        )}
                        {/* Click hint overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <svg className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                          </svg>
                        </div>
                        {/* Tags & delete - bottom overlay */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-white text-xs truncate">{image.filename}</p>
                          {image.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {image.tags.slice(0, 2).map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {tag}
                                </Badge>
                              ))}
                              {image.tags.length > 2 && (
                                <span className="text-white/70 text-[10px]">+{image.tags.length - 2}</span>
                              )}
                            </div>
                          )}
                        </div>
                        {/* Delete button - top right */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Smazat tento obrázek?")) {
                              deleteImage({ id: image._id });
                            }
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          title="Smazat"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === "edit" && (
            <EditMarketingForm 
              product={product} 
              productId={productId}
              updateMarketingData={updateMarketingData}
              isSaving={isSaving}
              setIsSaving={setIsSaving}
              saveMessage={saveMessage}
              setSaveMessage={setSaveMessage}
            />
          )}
          </div>
        </div>
      </main>

      {/* Floating Sales Kit Panel */}
      {showSalesKit && (
        <div className="fixed bottom-4 right-4 w-80 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="p-3 bg-primary text-primary-foreground flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>🎒</span>
              <span className="font-semibold">Sales Kit</span>
              {salesKitItems.length > 0 && (
                <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full">{salesKitItems.length}</span>
              )}
            </div>
            <button onClick={() => setShowSalesKit(false)} className="hover:bg-white/20 rounded p-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {salesKitItems.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                <p>Klikněte na <span className="inline-flex items-center justify-center w-5 h-5 bg-primary text-primary-foreground rounded text-xs font-bold">+</span> u položky pro přidání do kitu</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {salesKitItems.map(item => (
                  <div key={item.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg group">
                    <span className="text-xs">{
                      item.type === "claim" ? "💬" :
                      item.type === "reference" ? "📋" :
                      item.type === "gallery" ? "🖼️" :
                      item.type === "social" ? "📢" :
                      item.type === "materials" ? "📥" :
                      "📄"
                    }</span>
                    <span className="flex-1 text-sm truncate">{item.label}</span>
                    <button 
                      onClick={() => removeFromSalesKit(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-100 rounded p-1 transition-opacity"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {salesKitItems.length > 0 && (
            <div className="p-3 border-t border-border grid grid-cols-3 gap-2">
              <button
                onClick={exportSalesKitToTxt}
                className="flex items-center justify-center gap-1 px-2 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                TXT
              </button>
              <button
                onClick={exportSalesKitToPdf}
                className="flex items-center justify-center gap-1 px-2 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                PDF
              </button>
              <button
                onClick={() => setShowEmailDialog(true)}
                className="flex items-center justify-center gap-1 px-2 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Minimized Sales Kit Button */}
      {!showSalesKit && salesKitItems.length > 0 && (
        <button
          onClick={() => setShowSalesKit(true)}
          className="fixed bottom-4 right-4 flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl shadow-lg hover:bg-primary/90 transition-colors z-50"
        >
          <span>🎒</span>
          <span className="font-semibold">Sales Kit</span>
          <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full">{salesKitItems.length}</span>
        </button>
      )}

      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Odeslat Sales Kit emailem
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email příjemce
              </label>
              <Input
                type="email"
                placeholder="kolega@apotheke.cz"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
              />
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm text-muted-foreground mb-2">Bude odesláno:</p>
              <ul className="text-sm space-y-1">
                {salesKitItems.map((item) => (
                  <li key={item.id} className="flex items-center gap-2">
                    <span className="text-xs">
                      {item.type === "claim" ? "💬" :
                       item.type === "reference" ? "📋" :
                       item.type === "gallery" ? "🖼️" :
                       item.type === "social" ? "📢" :
                       item.type === "materials" ? "📥" : "📄"}
                    </span>
                    {item.label}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowEmailDialog(false)}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Zrušit
              </button>
              <button
                onClick={async () => {
                  if (!emailTo || !product) return;
                  setIsSendingEmail(true);
                  try {
                    // Build email content
                    const contentLines = [
                      `PRODEJNÍ MATERIÁLY - ${product.name}`,
                      ``,
                      `Produkt: ${product.name}`,
                      `Kód: ${product.externalId || productId}`,
                      `Cena: ${product.price} Kč`,
                      ``,
                      `---`,
                      ``,
                    ];
                    salesKitItems.forEach((item) => {
                      contentLines.push(`▸ ${item.label.toUpperCase()}`);
                      contentLines.push(``);
                      contentLines.push(item.content);
                      contentLines.push(``);
                      contentLines.push(`---`);
                      contentLines.push(``);
                    });
                    contentLines.push(`Vygenerováno: ${new Date().toLocaleString("cs-CZ")}`);
                    
                    await sendSalesKitEmail({
                      email: emailTo,
                      subject: `Sales Kit: ${product.name}`,
                      content: contentLines.join("\n"),
                    });
                    setShowEmailDialog(false);
                    setEmailTo("");
                    setSaveMessage("Email odeslán!");
                    setTimeout(() => setSaveMessage(null), 3000);
                  } catch (error) {
                    console.error("Error sending email:", error);
                    setSaveMessage("Chyba při odesílání emailu");
                    setTimeout(() => setSaveMessage(null), 3000);
                  } finally {
                    setIsSendingEmail(false);
                  }
                }}
                disabled={!emailTo || isSendingEmail}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSendingEmail ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Odesílám...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Odeslat
                  </>
                )}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Gallery Lightbox */}
      {lightboxOpen && lightboxImages.length > 0 && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Image counter */}
          <div className="absolute top-4 left-4 text-white/70 text-sm font-medium">
            {lightboxIndex + 1} / {lightboxImages.length}
          </div>

          {/* Previous button */}
          {lightboxImages.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); handleLightboxPrev(); }}
              className="absolute left-4 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
            >
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Main image */}
          <div 
            className="max-w-[90vw] max-h-[85vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImages[lightboxIndex]}
              alt=""
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
          </div>

          {/* Next button */}
          {lightboxImages.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); handleLightboxNext(); }}
              className="absolute right-4 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
            >
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Thumbnail strip */}
          {lightboxImages.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-black/50 rounded-full max-w-[90vw] overflow-x-auto">
              {lightboxImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(idx); }}
                  className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                    idx === lightboxIndex 
                      ? "border-white scale-110" 
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Edit Marketing Form Component
interface EditMarketingFormProps {
  product: NonNullable<ReturnType<typeof useQuery<typeof api.products.getById>>>;
  productId: Id<"products">;
  updateMarketingData: ReturnType<typeof useMutation<typeof api.products.updateMarketingData>>;
  isSaving: boolean;
  setIsSaving: (value: boolean) => void;
  saveMessage: string | null;
  setSaveMessage: (value: string | null) => void;
}

function EditMarketingForm({ 
  product, 
  productId, 
  updateMarketingData, 
  isSaving, 
  setIsSaving, 
  saveMessage, 
  setSaveMessage 
}: EditMarketingFormProps) {
  const [formData, setFormData] = useState({
    category: product.category || "",
    salesClaim: product.salesClaim || "",
    salesClaimSubtitle: product.salesClaimSubtitle || "",
    targetAudience: product.targetAudience || "",
    brandPillar: product.brandPillar || "",
    tier: product.tier || "",
    socialFacebook: product.socialFacebook || "",
    socialInstagram: product.socialInstagram || "",
    hashtags: product.hashtags?.join(", ") || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);

    try {
      await updateMarketingData({
        id: productId,
        category: formData.category ? formData.category as "Bylinný" | "Funkční" | "Dětský" | "BIO" : null,
        salesClaim: formData.salesClaim || undefined,
        salesClaimSubtitle: formData.salesClaimSubtitle || undefined,
        targetAudience: formData.targetAudience || undefined,
        brandPillar: formData.brandPillar ? formData.brandPillar as "Věda" | "BIO" | "Funkce" | "Tradice" | "Rodina" : null,
        tier: formData.tier ? formData.tier as "A" | "B" | "C" : null,
        socialFacebook: formData.socialFacebook || undefined,
        socialInstagram: formData.socialInstagram || undefined,
        hashtags: formData.hashtags ? formData.hashtags.split(",").map(t => t.trim().replace(/^#/, "")).filter(Boolean) : undefined,
      });
      setSaveMessage("✓ Uloženo!");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error("Error saving:", error);
      setSaveMessage("❌ Chyba při ukládání");
    } finally {
      setIsSaving(false);
    }
  };

  const categories = ["", "Bylinný", "Funkční", "Dětský", "BIO"];
  const brandPillars = ["", "Věda", "BIO", "Funkce", "Tradice", "Rodina"];
  const tiers = ["", "A", "B", "C"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Editovat marketingová data</h1>
          <p className="text-muted-foreground">Upravte informace pro prodejce</p>
        </div>
        {saveMessage && (
          <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
            saveMessage.includes("✓") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}>
            {saveMessage}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <span className="text-xl">📋</span>
            Základní informace
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Kategorie</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat || "-- Vyberte --"}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Brand Pillar</label>
              <select
                value={formData.brandPillar}
                onChange={(e) => setFormData({ ...formData, brandPillar: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {brandPillars.map((bp) => (
                  <option key={bp} value={bp}>{bp || "-- Vyberte --"}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Tier priorita</label>
              <select
                value={formData.tier}
                onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {tiers.map((t) => (
                  <option key={t} value={t}>{t ? `Tier ${t}` : "-- Vyberte --"}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Sales Claim */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <span className="text-xl">💬</span>
            Prodejní claim
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Hlavní claim</label>
              <input
                type="text"
                value={formData.salesClaim}
                onChange={(e) => setFormData({ ...formData, salesClaim: e.target.value })}
                placeholder="např. Přírodní klid v každém šálku"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Podtitulek</label>
              <input
                type="text"
                value={formData.salesClaimSubtitle}
                onChange={(e) => setFormData({ ...formData, salesClaimSubtitle: e.target.value })}
                placeholder="Rozšířený popis claimu"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Cílová skupina</label>
              <textarea
                value={formData.targetAudience}
                onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                placeholder="Popište cílovou skupinu produktu"
                rows={3}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
          </div>
        </div>

        {/* Social Media */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <span className="text-xl">📱</span>
            Sociální sítě
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Facebook post</label>
              <textarea
                value={formData.socialFacebook}
                onChange={(e) => setFormData({ ...formData, socialFacebook: e.target.value })}
                placeholder="Text příspěvku pro Facebook"
                rows={5}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Instagram post</label>
              <textarea
                value={formData.socialInstagram}
                onChange={(e) => setFormData({ ...formData, socialInstagram: e.target.value })}
                placeholder="Text příspěvku pro Instagram"
                rows={5}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Hashtagy (oddělené čárkou)</label>
              <input
                type="text"
                value={formData.hashtags}
                onChange={(e) => setFormData({ ...formData, hashtags: e.target.value })}
                placeholder="apotheke, biocaj, zdravi"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                Ukládám...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Uložit změny
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
