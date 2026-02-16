"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Header } from "@/components/header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { Id, Doc } from "@/convex/_generated/dataModel";

// Business Opportunities data
const businessOpportunities = [
  {
    id: "ucitele-den",
    date: "28. března",
    event: "Den učitelů",
    description: "Dárek pro učitele",
    icon: "👩‍🏫",
    color: "from-rose-400 to-rose-500",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200",
    products: ["Děkuji", "Bylinný čaj Harmonie", "Relaxace"],
    tip: "Čaj 'Děkuji' jako poděkování pro učitele"
  },
  {
    id: "valentyn",
    date: "14. února",
    event: "Valentýn",
    description: "Dárek pro partnera",
    icon: "💕",
    color: "from-pink-400 to-pink-500",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200",
    products: ["Láska", "Pro dva", "Romantika"],
    tip: "Dárkové balení s romantickými čaji"
  },
  {
    id: "matky-den",
    date: "11. května",
    event: "Den matek",
    description: "Dárek pro maminku",
    icon: "💐",
    color: "from-fuchsia-400 to-fuchsia-500",
    bgColor: "bg-fuchsia-50",
    borderColor: "border-fuchsia-200",
    products: ["Pro maminku", "Harmonie", "Klid"],
    tip: "Wellness čaje pro odpočinek"
  },
  {
    id: "velikonoce",
    date: "20. dubna",
    event: "Velikonoce",
    description: "Jarní dárek",
    icon: "🐣",
    color: "from-yellow-400 to-yellow-500",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    products: ["Jarní čaj", "Detox", "Energie"],
    tip: "Jarní očista a nová energie"
  },
  {
    id: "vanoce",
    date: "24. prosince",
    event: "Vánoce",
    description: "Vánoční dárek",
    icon: "🎄",
    color: "from-emerald-500 to-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    products: ["Vánoční čaj", "Skořice a hřebíček", "Punč"],
    tip: "Dárkové balení vánočních čajů"
  },
  {
    id: "novy-rok",
    date: "1. ledna",
    event: "Nový rok",
    description: "Novoroční předsevzetí",
    icon: "🎊",
    color: "from-indigo-400 to-indigo-500",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
    products: ["Detox", "Hubnutí", "Energie"],
    tip: "Podpora novoročních předsevzetí"
  }
];

// Sales Kit types
interface SalesKitItem {
  id: string;
  type: "opportunity" | "posm";
  label: string;
  content: string;
  imageUrl?: string;
}

type NewsType = "product" | "company" | "materials";

// News item type with imageUrl
type NewsItemWithImage = Doc<"news"> & { imageUrl?: string | null };

// Component to display news item as a card
function NewsItemCard({ 
  item, 
  formatRelativeTime, 
  onDelete,
  onEdit,
  onImageClick,
}: { 
  item: NewsItemWithImage; 
  formatRelativeTime: (ts: number) => string;
  onDelete: (id: Id<"news">) => void;
  onEdit: (item: NewsItemWithImage) => void;
  onImageClick?: (imageUrl: string) => void;
}) {
  const matchedProducts = useQuery(
    api.news.findProductsBySkus, 
    item.skus && item.skus.length > 0 ? { skus: item.skus } : "skip"
  );

  // Extract tag prefix from title if exists (e.g., "Upgrade: Nové obrázky")
  const titleParts = item.title.split(": ");
  const hasTagPrefix = titleParts.length > 1;
  const tagPrefix = hasTagPrefix ? titleParts[0] : null;
  const displayTitle = hasTagPrefix ? titleParts.slice(1).join(": ") : item.title;

  // Get card style based on type
  const getCardStyle = () => {
    switch (item.type) {
      case "product": return "bg-blue-50";
      case "company": return "bg-purple-50";
      case "materials": return "bg-amber-50";
    }
  };

  const getIconStyle = () => {
    switch (item.type) {
      case "product": return "bg-blue-100 text-blue-600";
      case "company": return "bg-purple-100 text-purple-600";
      case "materials": return "bg-amber-100 text-amber-600";
    }
  };

  const getCategoryIcon = () => {
    switch (item.type) {
      case "product": return "📦";
      case "company": return "🏢";
      case "materials": return "🎨";
    }
  };

  return (
    <div className={`group relative p-4 rounded-xl ${getCardStyle()} hover:shadow-md transition-all`}>
      {/* Action buttons - top right */}
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
        <button
          onClick={() => onEdit(item)}
          className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-white/80 rounded-lg transition-all"
          title="Upravit"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button
          onClick={() => onDelete(item._id)}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white/80 rounded-lg transition-all"
          title="Smazat"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Custom image or Icon */}
      {item.imageUrl ? (
        <div 
          className="relative w-full h-24 rounded-xl overflow-visible bg-muted mb-3 -mt-1 -mx-1 group/image cursor-pointer" 
          style={{ width: 'calc(100% + 8px)' }}
          onClick={() => onImageClick?.(item.imageUrl!)}
        >
          <img
            src={item.imageUrl}
            alt=""
            className="w-full h-full object-cover rounded-xl"
          />
          {/* Click hint */}
          <div className="absolute inset-0 rounded-xl bg-black/0 group-hover/image:bg-black/20 transition-all flex items-center justify-center">
            <svg className="w-8 h-8 text-white opacity-0 group-hover/image:opacity-100 transition-opacity drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
          </div>
        </div>
      ) : (
        <div className={`w-10 h-10 rounded-xl ${getIconStyle()} flex items-center justify-center text-lg mb-3`}>
          {getCategoryIcon()}
        </div>
      )}

      {/* Title with tag */}
      <div className="mb-1">
        <h3 className="font-semibold text-foreground text-sm leading-tight">{displayTitle}</h3>
        {tagPrefix && (
          <span className="text-xs text-muted-foreground">{tagPrefix}</span>
        )}
      </div>

      {/* Content/Description or date */}
      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
        {item.content || formatRelativeTime(item.createdAt)}
      </p>

      {/* Matched products with all gallery images */}
      {matchedProducts && matchedProducts.length > 0 && (() => {
        // Collect all images: product main image + all gallery images
        const allImages: { url: string; productName: string; productId: string }[] = [];
        
        matchedProducts.forEach((product) => {
          // Add main product image
          if (product.image) {
            allImages.push({ 
              url: product.image, 
              productName: product.name,
              productId: product._id 
            });
          }
          // Add all gallery images
          if (product.galleryImages) {
            product.galleryImages.forEach((img: { url?: string | null }) => {
              if (img.url) {
                allImages.push({ 
                  url: img.url, 
                  productName: product.name,
                  productId: product._id 
                });
              }
            });
          }
        });
        
        return allImages.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-black/5">
            {allImages.map((img, idx) => (
              <div
                key={`${img.productId}-${idx}`}
                className="relative group/img"
              >
                <Link
                  href={`/product/${img.productId}`}
                  className="block w-8 h-8 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md hover:scale-105 transition-all"
                  title={img.productName}
                >
                  <img
                    src={img.url}
                    alt={img.productName}
                    className="w-full h-full object-cover"
                  />
                </Link>
                {/* Hover preview */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/img:opacity-100 pointer-events-none transition-opacity z-50">
                  <div className="bg-white rounded-xl shadow-xl border border-border p-1 w-40">
                    <img
                      src={img.url}
                      alt={img.productName}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <p className="text-xs text-center text-muted-foreground mt-1 truncate px-1">{img.productName}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null;
      })()}
    </div>
  );
}

export function DashboardPageContent() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [salesKitItems, setSalesKitItems] = useState<SalesKitItem[]>([]);
  const [showSalesKit, setShowSalesKit] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  
  // News filter state
  const [activeNewsFilter, setActiveNewsFilter] = useState<NewsType | null>(null);
  const [newsDateFilter, setNewsDateFilter] = useState<number | null>(null); // days: 7, 14, 30, or null for all
  const [showAddNews, setShowAddNews] = useState(false);
  const [newNewsTitle, setNewNewsTitle] = useState("");
  const [newNewsContent, setNewNewsContent] = useState("");
  const [newNewsType, setNewNewsType] = useState<NewsType>("product");
  const [newNewsTag, setNewNewsTag] = useState("");
  const [customTag, setCustomTag] = useState("");
  const [addingNews, setAddingNews] = useState(false);
  
  // Predefined tags
  const predefinedTags = ["Upgrade", "Novinka", "Akce", "Update", "Změna", "Info"];
  
  // Product search for news
  const [productSearch, setProductSearch] = useState("");
  const [debouncedProductSearch, setDebouncedProductSearch] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<Array<{ id: string; name: string; image?: string }>>([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [skuInput, setSkuInput] = useState("");
  const [skuLoading, setSkuLoading] = useState(false);
  
  // Edit news state
  const [editingNewsId, setEditingNewsId] = useState<Id<"news"> | null>(null);
  
  // Lightbox state for image viewing
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  
  const sendSalesKitEmail = useMutation(api.emails.sendSalesKitEmail);
  const createNews = useMutation(api.news.create);
  const removeNews = useMutation(api.news.remove);
  const updateNews = useMutation(api.news.update);
  const generateUploadUrl = useMutation(api.news.generateUploadUrl);
  
  // Image upload state for news
  const [newsImageFile, setNewsImageFile] = useState<File | null>(null);
  const [newsImagePreview, setNewsImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

  // Sales Kit functions
  const addToSalesKit = (item: SalesKitItem) => {
    if (!salesKitItems.find(i => i.id === item.id)) {
      setSalesKitItems([...salesKitItems, item]);
      setShowSalesKit(true);
    }
  };

  const removeFromSalesKit = (id: string) => {
    setSalesKitItems(salesKitItems.filter(i => i.id !== id));
  };

  const exportSalesKitToTxt = () => {
    const content = salesKitItems.map((item, index) => 
      `${index + 1}. ${item.label}\n${item.content}\n`
    ).join("\n---\n\n");
    
    const header = `OBCHODNÍ PŘÍLEŽITOSTI - APOTHEKE\n${"=".repeat(40)}\nVygenerováno: ${new Date().toLocaleDateString("cs-CZ")}\n\n`;
    const blob = new Blob([header + content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `apotheke-prilezitosti-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const makeLinksClickable = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, '<a href="$1" style="color: #2563eb; text-decoration: underline;">$1</a>');
  };

  const exportSalesKitToPdf = () => {
    const content = salesKitItems.map((item, index) => 
      `<div style="margin-bottom: 20px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h3 style="margin: 0 0 10px 0; color: #166534; font-size: 14px;">${index + 1}. ${item.label}</h3>
        <p style="margin: 0; font-size: 12px; white-space: pre-wrap; color: #374151;">${makeLinksClickable(item.content)}</p>
      </div>`
    ).join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Obchodní příležitosti - Apotheke</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 30px; max-width: 800px; margin: 0 auto; }
          h1 { color: #166534; border-bottom: 2px solid #166534; padding-bottom: 10px; }
          .meta { color: #6b7280; font-size: 12px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <h1>📅 Obchodní příležitosti - Apotheke</h1>
        <p class="meta">Vygenerováno: ${new Date().toLocaleDateString("cs-CZ")}</p>
        ${content}
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Debounce product search for news dialog
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedProductSearch(productSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch]);

  const stats = useQuery(api.products.getStats);
  const recentActivity = useQuery(api.products.getRecentActivity, { limit: 10 });
  const recentImages = useQuery(api.gallery.getRecentImages, { limit: 6 });
  const productsNeedingAttention = useQuery(api.products.getProductsNeedingAttention);
  const topProducts = useQuery(api.products.getTopProducts);
  const searchResults = useQuery(api.products.list, {
    search: debouncedSearch || undefined,
  });
  const posmItems = useQuery(api.posm.listItems, {});
  const newsStats = useQuery(api.news.getStats);
  const productNews = useQuery(api.news.listByType, { type: "product", limit: 20 });
  const companyNews = useQuery(api.news.listByType, { type: "company", limit: 20 });
  const materialsNews = useQuery(api.news.listByType, { type: "materials", limit: 20 });
  
  // Product search for news dialog
  const newsProductSearch = useQuery(
    api.products.list, 
    debouncedProductSearch.length >= 2 ? { search: debouncedProductSearch } : "skip"
  );
  
  // SKU lookup for pasted SKUs
  const findProductsBySkus = useMutation(api.products.findBySkus);
  
  // Email sending function
  const handleSendEmail = async () => {
    if (!emailTo.trim()) {
      alert("Zadejte email");
      return;
    }
    
    setSendingEmail(true);
    try {
      const content = salesKitItems.map((item, index) => 
        `${index + 1}. ${item.label}\n${item.content}\n`
      ).join("\n---\n\n");
      
      const header = `OBCHODNÍ PŘÍLEŽITOSTI & MATERIÁLY - APOTHEKE\n${"=".repeat(50)}\nVygenerováno: ${new Date().toLocaleDateString("cs-CZ")}\n\n`;
      
      await sendSalesKitEmail({
        email: emailTo,
        subject: `Sales Kit - Apotheke (${new Date().toLocaleDateString("cs-CZ")})`,
        content: header + content,
      });
      
      alert("Email byl odeslán!");
      setShowEmailDialog(false);
      setEmailTo("");
    } catch (error) {
      console.error("Error sending email:", error);
      alert("Chyba při odesílání emailu");
    } finally {
      setSendingEmail(false);
    }
  };

  // News handling
  const handleAddNews = async () => {
    if (!newNewsTitle.trim()) return;
    setAddingNews(true);
    try {
      // Use selected product IDs as SKUs
      const skusArray = selectedProducts.length > 0 
        ? selectedProducts.map(p => p.id)
        : undefined;
      
      // Build title with tag prefix
      const finalTag = customTag.trim() || newNewsTag;
      const finalTitle = finalTag 
        ? `${finalTag}: ${newNewsTitle.trim()}`
        : newNewsTitle.trim();
      
      await createNews({
        type: newNewsType,
        title: finalTitle,
        content: newNewsContent.trim() || undefined,
        skus: skusArray,
      });
      setNewNewsTitle("");
      setNewNewsContent("");
      setSelectedProducts([]);
      setProductSearch("");
      setNewNewsType("product");
      setNewNewsTag("");
      setCustomTag("");
      setShowAddNews(false);
    } catch (error) {
      console.error("Error creating news:", error);
    } finally {
      setAddingNews(false);
    }
  };

  const handleDeleteNews = async (id: Id<"news">) => {
    if (!confirm("Opravdu smazat tuto položku?")) return;
    try {
      await removeNews({ id });
    } catch (error) {
      console.error("Error deleting news:", error);
    }
  };

  // Start editing a news item
  const handleStartEdit = (item: Doc<"news"> & { imageUrl?: string | null }) => {
    // Extract tag prefix from title if exists
    const titleParts = item.title.split(": ");
    const hasTagPrefix = titleParts.length > 1;
    const tagPrefix = hasTagPrefix ? titleParts[0] : "";
    const displayTitle = hasTagPrefix ? titleParts.slice(1).join(": ") : item.title;
    
    setEditingNewsId(item._id);
    setNewNewsType(item.type);
    setNewNewsTitle(displayTitle);
    setNewNewsContent(item.content || "");
    
    // Set tag - check if it's predefined or custom
    if (tagPrefix && predefinedTags.includes(tagPrefix)) {
      setNewNewsTag(tagPrefix);
      setCustomTag("");
    } else if (tagPrefix) {
      setNewNewsTag("");
      setCustomTag(tagPrefix);
    } else {
      setNewNewsTag("");
      setCustomTag("");
    }
    
    // Set selected products from skus
    if (item.skus && item.skus.length > 0) {
      // Products will be loaded via useQuery in the dialog
      setSelectedProducts(item.skus.map(sku => ({ id: sku, name: "Načítání...", image: undefined })));
    } else {
      setSelectedProducts([]);
    }
    
    // Set existing image
    setExistingImageUrl(item.imageUrl || null);
    setNewsImageFile(null);
    setNewsImagePreview(null);
    
    setShowAddNews(true);
  };

  // Save edited news
  const handleSaveNews = async () => {
    if (!newNewsTitle.trim()) return;
    setAddingNews(true);
    try {
      const skusArray = selectedProducts.length > 0 
        ? selectedProducts.map(p => p.id)
        : undefined;
      
      const finalTag = customTag.trim() || newNewsTag;
      const finalTitle = finalTag 
        ? `${finalTag}: ${newNewsTitle.trim()}`
        : newNewsTitle.trim();
      
      // Upload image if selected
      let imageStorageId: Id<"_storage"> | undefined;
      if (newsImageFile) {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": newsImageFile.type },
          body: newsImageFile,
        });
        const { storageId } = await result.json();
        imageStorageId = storageId;
      }
      
      if (editingNewsId) {
        // Update existing news
        await updateNews({
          id: editingNewsId,
          title: finalTitle,
          content: newNewsContent.trim() || undefined,
          skus: skusArray,
          ...(imageStorageId && { imageStorageId }),
        });
      } else {
        // Create new news
        await createNews({
          type: newNewsType,
          title: finalTitle,
          content: newNewsContent.trim() || undefined,
          skus: skusArray,
          imageStorageId,
        });
      }
      
      // Reset form
      setNewNewsTitle("");
      setNewNewsContent("");
      setSelectedProducts([]);
      setProductSearch("");
      setNewNewsType("product");
      setNewNewsTag("");
      setCustomTag("");
      setEditingNewsId(null);
      setNewsImageFile(null);
      setNewsImagePreview(null);
      setExistingImageUrl(null);
      setShowAddNews(false);
    } catch (error) {
      console.error("Error saving news:", error);
    } finally {
      setAddingNews(false);
    }
  };

  const getFilteredNews = () => {
    let news: Doc<"news">[] | undefined;
    
    if (activeNewsFilter === null) {
      // Show all news combined and sorted by date
      const all = [
        ...(productNews ?? []),
        ...(companyNews ?? []),
        ...(materialsNews ?? []),
      ];
      news = all.sort((a, b) => b.createdAt - a.createdAt);
    } else {
      switch (activeNewsFilter) {
        case "product": news = productNews; break;
        case "company": news = companyNews; break;
        case "materials": news = materialsNews; break;
      }
    }
    
    // Apply date filter
    if (news && newsDateFilter !== null) {
      const cutoff = Date.now() - (newsDateFilter * 24 * 60 * 60 * 1000);
      news = news.filter(item => item.createdAt >= cutoff);
    }
    
    return news;
  };

  const getTagLabel = (type: NewsType) => {
    switch (type) {
      case "product": return "📦 Produkty";
      case "company": return "🏢 Firma";
      case "materials": return "🎨 Materiály";
    }
  };

  const getTagColor = (type: NewsType) => {
    switch (type) {
      case "product": return "bg-blue-100 text-blue-700 border-blue-200";
      case "company": return "bg-purple-100 text-purple-700 border-purple-200";
      case "materials": return "bg-amber-100 text-amber-700 border-amber-200";
    }
  };

  const getTagCount = (type: NewsType) => {
    if (!newsStats) return 0;
    switch (type) {
      case "product": return newsStats.product;
      case "company": return newsStats.company;
      case "materials": return newsStats.materials;
    }
  };

  const isLoading = stats === undefined || recentActivity === undefined;
  
  // Get all news images for lightbox navigation
  const getAllNewsImages = (): string[] => {
    const filteredNews = getFilteredNews();
    if (!filteredNews) return [];
    return filteredNews
      .filter((item): item is NewsItemWithImage & { imageUrl: string } => 
        !!(item as NewsItemWithImage).imageUrl
      )
      .map(item => (item as NewsItemWithImage).imageUrl as string);
  };
  
  // Open lightbox with specific image
  const handleOpenLightbox = (imageUrl: string) => {
    const images = getAllNewsImages();
    const index = images.indexOf(imageUrl);
    setLightboxImages(images);
    setLightboxIndex(index >= 0 ? index : 0);
    setLightboxOpen(true);
  };
  
  // Lightbox navigation
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

  // Format relative time
  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "právě teď";
    if (minutes < 60) return `před ${minutes} min`;
    if (hours < 24) return `před ${hours} hod`;
    if (days < 7) return `před ${days} dny`;
    return new Date(timestamp).toLocaleDateString("cs-CZ");
  };

  // Get icon for activity type
  const getActivityIcon = (field?: string) => {
    switch (field) {
      case "salesClaim":
      case "salesClaimSubtitle":
        return "💬";
      case "socialFacebook":
        return "📘";
      case "socialInstagram":
        return "📸";
      case "hashtags":
        return "#️⃣";
      case "tier":
        return "⭐";
      case "brandPillar":
        return "🏷️";
      case "category":
        return "📁";
      case "targetAudience":
        return "🎯";
      default:
        return "✏️";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search bar */}
        <div className="mb-8">
          <div className="relative max-w-xl">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <Input
              type="text"
              placeholder="Hledat produkty..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-12 text-base"
            />
          </div>
          
          {/* Search Results */}
          {debouncedSearch && searchResults && (
            <div className="mt-4 bg-card rounded-xl border border-border p-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Výsledky vyhledávání ({searchResults.length})
              </h3>
              {searchResults.length === 0 ? (
                <p className="text-muted-foreground">Žádné produkty nenalezeny</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {searchResults.slice(0, 9).map((product) => (
                    <Link
                      key={product._id}
                      href={`/product/${product._id}`}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      {product.image && (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.price} Kč</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground">Načítám dashboard...</p>
            </div>
          </div>
        ) : (
          <>
          {/* News Tabs Panel */}
          <div className="bg-card rounded-2xl border border-border shadow-sm mb-8 overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">📰</span>
                </div>
                <h2 className="text-lg font-semibold text-foreground">Novinky</h2>
                <Badge className="bg-primary/10 text-primary hover:bg-primary/10 text-xs">
                  {newsStats?.total ?? 0}
                </Badge>
              </div>
              <Button
                onClick={() => setShowAddNews(true)}
                size="sm"
                className="bg-primary hover:bg-primary/90"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Přidat
              </Button>
            </div>

            {/* Tag Filters */}
            <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-border bg-muted/30">
              <span className="text-sm text-muted-foreground mr-1">Filtr:</span>
              <button
                onClick={() => setActiveNewsFilter(null)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                  activeNewsFilter === null
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-muted-foreground border-border hover:border-primary hover:text-primary"
                }`}
              >
                Vše ({newsStats?.total ?? 0})
              </button>
              {(["product", "company", "materials"] as NewsType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setActiveNewsFilter(activeNewsFilter === type ? null : type)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                    activeNewsFilter === type
                      ? getTagColor(type) + " border-current"
                      : "bg-white text-muted-foreground border-border hover:border-current hover:" + getTagColor(type).split(" ")[1]
                  }`}
                >
                  {getTagLabel(type)} ({getTagCount(type)})
                </button>
              ))}
              
              {/* Date separator */}
              <div className="w-px h-5 bg-border mx-2" />
              
              {/* Date filter */}
              {([
                { days: 7, label: "7 dní" },
                { days: 14, label: "14 dní" },
                { days: 30, label: "30 dní" },
              ] as const).map(({ days, label }) => (
                <button
                  key={days}
                  onClick={() => setNewsDateFilter(newsDateFilter === days ? null : days)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                    newsDateFilter === days
                      ? "bg-gray-800 text-white border-gray-800"
                      : "bg-white text-muted-foreground border-border hover:border-gray-400 hover:text-gray-700"
                  }`}
                >
                  {label}
                </button>
              ))}
              <button
                onClick={() => setNewsDateFilter(null)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                  newsDateFilter === null
                    ? "bg-gray-800 text-white border-gray-800"
                    : "bg-white text-muted-foreground border-border hover:border-gray-400 hover:text-gray-700"
                }`}
              >
                Vše
              </button>
            </div>

            {/* News List */}
            <div className="max-h-[500px] overflow-y-auto">
              {getFilteredNews() === undefined ? (
                <div className="p-8 text-center">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : getFilteredNews()?.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-muted-foreground">Zatím žádné novinky</p>
                  <Button
                    onClick={() => setShowAddNews(true)}
                    variant="outline"
                    size="sm"
                    className="mt-3"
                  >
                    Přidat první novinku
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
                  {getFilteredNews()?.map((item) => (
                    <NewsItemCard
                      key={item._id}
                      item={item}
                      formatRelativeTime={formatRelativeTime}
                      onDelete={handleDeleteNews}
                      onEdit={handleStartEdit}
                      onImageClick={handleOpenLightbox}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top 10 Products */}
          {topProducts && topProducts.length > 0 && (
            <div className="bg-card rounded-2xl border border-border shadow-sm mb-8 overflow-hidden">
              <div className="p-5 border-b border-border bg-gradient-to-r from-amber-50 to-yellow-50">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">⭐</span>
                  </div>
                  Top 10 produktů
                  <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-xs ml-2">
                    {topProducts.length}/10
                  </Badge>
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Prioritní produkty pro prodejce
                </p>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5 gap-3">
                  {topProducts.map((product) => (
                    <Link
                      key={product._id}
                      href={`/product/${product._id}`}
                      className="group relative bg-white rounded-xl border border-border p-3 hover:shadow-lg hover:border-amber-300 transition-all"
                    >
                      <div className="absolute -top-2 -left-2 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md z-10">
                        {product.topOrder ?? "?"}
                      </div>
                      <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-2">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl text-muted-foreground">
                            🍵
                          </div>
                        )}
                      </div>
                      <h3 className="text-sm font-medium text-foreground line-clamp-2 leading-tight">
                        {product.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {product.price} Kč
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Business Opportunities */}
          <div className="bg-card rounded-2xl border border-border shadow-sm mb-8 overflow-hidden">
            <div className="p-5 border-b border-border bg-gradient-to-r from-indigo-50 to-purple-50">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">📅</span>
                </div>
                Obchodní příležitosti
                <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 text-xs ml-2">
                  {businessOpportunities.length} akcí
                </Badge>
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Kalendářní příležitosti pro prodej čajů jako dárků
              </p>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {businessOpportunities.map((opp, index) => {
                  const isInKit = salesKitItems.find(i => i.id === opp.id);
                  return (
                    <Link
                      key={opp.id}
                      href={`/prilezitost/${opp.id}`}
                      className={`relative rounded-xl border p-4 ${opp.bgColor} ${opp.borderColor} transition-all hover:shadow-md block`}
                    >
                      <div className="absolute -top-2 -left-2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md z-10">
                        {index + 1}
                      </div>
                      <div className="flex items-start justify-between mb-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${opp.color} flex items-center justify-center text-2xl shadow-sm`}>
                          {opp.icon}
                        </div>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            addToSalesKit({
                              id: opp.id,
                              type: "opportunity",
                              label: `${opp.event} (${opp.date})`,
                              content: `📅 ${opp.event} - ${opp.date}\n📌 ${opp.description}\n\n💡 TIP: ${opp.tip}\n\n🍵 Doporučené produkty:\n${opp.products.map(p => `   • ${p}`).join("\n")}`
                            });
                          }}
                          className={`p-2 rounded-lg transition-colors ${
                            isInKit
                              ? "bg-green-500 text-white"
                              : "bg-white/80 hover:bg-white text-gray-600"
                          }`}
                          title="Přidat do Sales Kit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                      <div className="mb-2">
                        <p className="font-semibold text-foreground">{opp.event}</p>
                        <p className="text-sm text-muted-foreground">{opp.date}</p>
                      </div>
                      <p className="text-sm text-foreground mb-3">{opp.description}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {opp.products.slice(0, 3).map(product => (
                          <span
                            key={product}
                            className="px-2 py-0.5 bg-white/70 rounded-full text-xs text-muted-foreground"
                          >
                            {product}
                          </span>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-current/10">
                        <p className="text-xs text-muted-foreground italic">
                          💡 {opp.tip}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left column - News Feed */}
            <div className="lg:col-span-2 space-y-6">
              {/* Recent Activity */}
              <div className="bg-card rounded-2xl border border-border shadow-sm">
                <div className="p-5 border-b border-border">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </div>
                    Novinky
                    {recentActivity && recentActivity.length > 0 && (
                      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs">
                        {recentActivity.length}
                      </Badge>
                    )}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Poslední změny v marketingových datech
                  </p>
                </div>
                
                <div className="divide-y divide-border">
                  {recentActivity && recentActivity.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="text-4xl mb-3">🎯</div>
                      <p className="text-muted-foreground">
                        Zatím žádná aktivita. Začněte přidávat marketingová data k produktům!
                      </p>
                    </div>
                  ) : (
                    recentActivity?.map((activity) => (
                      <Link
                        key={`${activity._id}-${activity.timestamp}`}
                        href={`/product/${activity.productId}`}
                        className="flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-xl">
                          {getActivityIcon(activity.field)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-foreground truncate">
                              {activity.productName}
                            </span>
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {formatRelativeTime(activity.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Aktualizováno: <span className="text-foreground">{activity.fieldLabel}</span>
                          </p>
                          {activity.value && (
                            <p className="text-sm text-foreground mt-1 line-clamp-2 italic">
                              &ldquo;{activity.value}&rdquo;
                            </p>
                          )}
                        </div>
                        {activity.productImage && (
                          <img
                            src={activity.productImage}
                            alt=""
                            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                          />
                        )}
                      </Link>
                    ))
                  )}
                </div>
              </div>

              {/* Recent Images */}
              {recentImages && recentImages.length > 0 && (
                <div className="bg-card rounded-2xl border border-border shadow-sm">
                  <div className="p-5 border-b border-border">
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      Poslední nahrané obrázky
                    </h2>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {recentImages.map((image) => (
                        <Link
                          key={image._id}
                          href={`/product/${image.productId}`}
                          className="group relative aspect-square rounded-xl overflow-hidden bg-muted shadow-sm"
                        >
                          {image.url && (
                            <img
                              src={image.url}
                              alt={image.filename}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="absolute bottom-0 left-0 right-0 p-2">
                              <p className="text-white text-xs truncate">{image.productName}</p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right column - Stats & Todos */}
            <div className="space-y-6">
              {/* Progress Overview */}
              <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  Přehled plnění
                </h2>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Produkty s claimem</span>
                      <span className="font-semibold text-blue-600">{stats?.claimPercent ?? 0}%</span>
                    </div>
                    <div className="h-3 bg-blue-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all"
                        style={{ width: `${stats?.claimPercent ?? 0}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Sociální sítě</span>
                      <span className="font-semibold text-cyan-600">{stats?.socialPercent ?? 0}%</span>
                    </div>
                    <div className="h-3 bg-cyan-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-400 to-cyan-500 rounded-full transition-all"
                        style={{ width: `${stats?.socialPercent ?? 0}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="h-px bg-border my-4" />
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl">
                    <div className="text-xl font-bold text-amber-600">{stats?.tierA ?? 0}</div>
                    <div className="text-xs text-amber-700 font-medium">Tier A</div>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl">
                    <div className="text-xl font-bold text-cyan-600">{stats?.tierB ?? 0}</div>
                    <div className="text-xs text-cyan-700 font-medium">Tier B</div>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
                    <div className="text-xl font-bold text-gray-600">{stats?.tierC ?? 0}</div>
                    <div className="text-xs text-gray-700 font-medium">Tier C</div>
                  </div>
                </div>
              </div>

              {/* Products needing attention */}
              {productsNeedingAttention && productsNeedingAttention.length > 0 && (
                <div className="bg-card rounded-2xl border border-border shadow-sm">
                  <div className="p-5 border-b border-border">
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      Vyžadují pozornost
                      <Badge className="bg-pink-100 text-pink-700 hover:bg-pink-100 text-xs">
                        {productsNeedingAttention.length}
                      </Badge>
                    </h2>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    <div className="divide-y divide-border">
                      {productsNeedingAttention.slice(0, 10).map((product) => (
                        <Link
                          key={product._id}
                          href={`/product/${product._id}`}
                          className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                        >
                          {product.image ? (
                            <img
                              src={product.image}
                              alt=""
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center text-pink-400">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {product.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              Chybí: {product.missing.join(", ")}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                  {productsNeedingAttention.length > 10 && (
                    <div className="p-3 border-t border-border text-center">
                      <span className="text-sm text-muted-foreground">
                        A dalších {productsNeedingAttention.length - 10} produktů...
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Dostupné materiály (POSM) */}
              {posmItems && posmItems.length > 0 && (
                <div className="bg-card rounded-2xl border border-border shadow-sm">
                  <div className="p-5 border-b border-border">
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      Dostupné materiály
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">
                        {posmItems.length}
                      </Badge>
                    </h2>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <div className="p-3 grid grid-cols-2 gap-2">
                      {posmItems.slice(0, 8).map((item) => {
                        const isInKit = salesKitItems.find(i => i.id === `posm-${item._id}`);
                        return (
                          <div
                            key={item._id}
                            className="relative rounded-lg border border-border p-2 bg-white hover:border-green-300 transition-colors"
                          >
                            {item.imageUrl && (
                              <div className="aspect-video rounded overflow-hidden bg-muted mb-2">
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <p className="text-xs font-medium text-foreground truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{item.type}</p>
                            <button
                              onClick={() => addToSalesKit({
                                id: `posm-${item._id}`,
                                type: "posm",
                                label: item.name,
                                content: `📦 ${item.name}\nTyp: ${item.type}${item.description ? `\nPopis: ${item.description}` : ""}${item.sizes?.length ? `\nDostupné velikosti: ${item.sizes.join(", ")}` : ""}`,
                                imageUrl: item.imageUrl,
                              })}
                              className={`absolute top-1 right-1 p-1 rounded transition-colors ${
                                isInKit
                                  ? "bg-green-500 text-white"
                                  : "bg-white/90 hover:bg-green-100 text-green-600 shadow-sm"
                              }`}
                              title="Přidat do Sales Kit"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {posmItems.length > 8 && (
                    <div className="p-3 border-t border-border">
                      <Link
                        href="/posm"
                        className="text-sm text-green-600 hover:text-green-700 font-medium"
                      >
                        Zobrazit všechny ({posmItems.length}) →
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Quick links */}
              <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  Rychlé odkazy
                </h2>
                <div className="space-y-2">
                  <Link
                    href="/katalog"
                    className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 transition-colors"
                  >
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                    </div>
                    <span className="font-medium text-foreground">Katalog produktů</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
          </>
        )}
      </main>

      {/* Floating Sales Kit Panel */}
      {salesKitItems.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          {showSalesKit ? (
            <div className="bg-white rounded-2xl shadow-2xl border border-border w-80 max-h-[70vh] overflow-hidden flex flex-col">
              <div className="p-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📅</span>
                  <span className="font-semibold">Obchodní příležitosti</span>
                  <Badge className="bg-white/20 text-white hover:bg-white/30 text-xs">
                    {salesKitItems.length}
                  </Badge>
                </div>
                <button
                  onClick={() => setShowSalesKit(false)}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-60">
                {salesKitItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-2 p-2 bg-indigo-50 rounded-lg text-sm"
                  >
                    <span className="w-5 h-5 bg-indigo-200 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {index + 1}
                    </span>
                    <span className="flex-1 text-foreground line-clamp-2">{item.label}</span>
                    <button
                      onClick={() => removeFromSalesKit(item.id)}
                      className="p-1 text-red-500 hover:bg-red-100 rounded transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="p-3 border-t border-border space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={exportSalesKitToTxt}
                    className="flex items-center justify-center gap-1 px-2 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                    title="Stáhnout jako TXT"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    TXT
                  </button>
                  <button
                    onClick={exportSalesKitToPdf}
                    className="flex items-center justify-center gap-1 px-2 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg text-sm font-medium transition-colors"
                    title="Vytisknout jako PDF"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    PDF
                  </button>
                  <button
                    onClick={() => setShowEmailDialog(true)}
                    className="flex items-center justify-center gap-1 px-2 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-medium transition-colors"
                    title="Odeslat emailem"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email
                  </button>
                </div>
                <button
                  onClick={() => setSalesKitItems([])}
                  className="w-full px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
                >
                  Vymazat vše
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowSalesKit(true)}
              className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all"
            >
              <span className="text-xl">📅</span>
              <span className="font-semibold">Příležitosti</span>
              <Badge className="bg-white/20 text-white hover:bg-white/30">
                {salesKitItems.length}
              </Badge>
            </button>
          )}
        </div>
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
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email adresa</Label>
              <Input
                id="email"
                type="email"
                placeholder="vas@email.cz"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
              />
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm text-muted-foreground">
                Bude odesláno {salesKitItems.length} položek:
              </p>
              <ul className="mt-2 space-y-1">
                {salesKitItems.slice(0, 3).map((item, i) => (
                  <li key={item.id} className="text-sm text-foreground flex items-center gap-2">
                    <span className="w-4 h-4 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs">
                      {i + 1}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </li>
                ))}
                {salesKitItems.length > 3 && (
                  <li className="text-sm text-muted-foreground">
                    ... a dalších {salesKitItems.length - 3}
                  </li>
                )}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
              Zrušit
            </Button>
            <Button 
              onClick={handleSendEmail} 
              disabled={sendingEmail || !emailTo.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              {sendingEmail ? (
                <>
                  <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Odesílám...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Odeslat
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit News Dialog */}
      <Dialog open={showAddNews} onOpenChange={(open) => {
        setShowAddNews(open);
        if (!open) {
          // Reset form when closing
          setEditingNewsId(null);
          setNewNewsTitle("");
          setNewNewsContent("");
          setSelectedProducts([]);
          setProductSearch("");
          setNewNewsType("product");
          setNewNewsTag("");
          setCustomTag("");
          setNewsImageFile(null);
          setNewsImagePreview(null);
          setExistingImageUrl(null);
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">{editingNewsId ? "✏️" : "📰"}</span>
              {editingNewsId ? "Upravit novinku" : "Přidat novinku"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Category Selection */}
            <div className="space-y-2">
              <Label>Kategorie *{editingNewsId && <span className="text-xs text-muted-foreground ml-2">(nelze změnit)</span>}</Label>
              <div className="flex gap-2">
                {(["product", "company", "materials"] as NewsType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => !editingNewsId && setNewNewsType(type)}
                    disabled={!!editingNewsId}
                    className={`flex-1 px-3 py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${
                      newNewsType === type
                        ? type === "product" 
                          ? "bg-blue-100 text-blue-700 border-blue-400"
                          : type === "company"
                          ? "bg-purple-100 text-purple-700 border-purple-400"
                          : "bg-amber-100 text-amber-700 border-amber-400"
                        : "bg-white text-muted-foreground border-border hover:border-gray-300"
                    } ${editingNewsId ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    {type === "product" && "📦 Produkty"}
                    {type === "company" && "🏢 Firma"}
                    {type === "materials" && "🎨 Materiály"}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Tag Selection for Title */}
            <div className="space-y-2">
              <Label>Tag do nadpisu (volitelný)</Label>
              <div className="flex flex-wrap gap-1.5">
                {predefinedTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      setNewNewsTag(newNewsTag === tag ? "" : tag);
                      setCustomTag("");
                    }}
                    className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-all ${
                      newNewsTag === tag
                        ? "bg-primary text-white border-primary"
                        : "bg-white text-muted-foreground border-border hover:border-gray-400"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-muted-foreground">nebo vlastní:</span>
                <Input
                  placeholder="Vlastní tag..."
                  value={customTag}
                  onChange={(e) => {
                    setCustomTag(e.target.value);
                    setNewNewsTag("");
                  }}
                  className="h-8 text-sm flex-1"
                />
              </div>
              {(newNewsTag || customTag) && (
                <p className="text-xs text-muted-foreground">
                  Náhled: <span className="font-medium text-foreground">{customTag || newNewsTag}: {newNewsTitle || "..."}</span>
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="news-title">Titulek *</Label>
              <Input
                id="news-title"
                placeholder="např. Nové obrázky produktů"
                value={newNewsTitle}
                onChange={(e) => setNewNewsTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="news-content">Popis (volitelný)</Label>
              <Textarea
                id="news-content"
                placeholder="Detailnější popis novinky..."
                value={newNewsContent}
                onChange={(e) => setNewNewsContent(e.target.value)}
                rows={3}
              />
            </div>
            {newNewsType === "product" && (
              <div className="space-y-2">
                <Label>Přiřazené produkty (volitelné)</Label>
                
                {/* Selected products chips */}
                {selectedProducts.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-2 bg-muted/50 rounded-lg">
                    {selectedProducts.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center gap-1.5 bg-white border border-border rounded-full pl-1 pr-2 py-1"
                      >
                        {product.image && (
                          <img
                            src={product.image}
                            alt=""
                            className="w-5 h-5 rounded-full object-cover"
                          />
                        )}
                        <span className="text-xs font-medium truncate max-w-[150px]">
                          {product.name}
                        </span>
                        <button
                          onClick={() => setSelectedProducts(selectedProducts.filter(p => p.id !== product.id))}
                          className="text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Product search input */}
                <div className="relative">
                  <Input
                    placeholder="Hledat produkt podle názvu..."
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setShowProductDropdown(true);
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                  />
                  
                  {/* Search results dropdown */}
                  {showProductDropdown && debouncedProductSearch.length >= 2 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {newsProductSearch === undefined ? (
                        <div className="p-3 text-center text-sm text-muted-foreground">
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                        </div>
                      ) : newsProductSearch.length === 0 ? (
                        <div className="p-3 text-center text-sm text-muted-foreground">
                          Žádné produkty nenalezeny
                        </div>
                      ) : (
                        newsProductSearch.slice(0, 10).map((product) => {
                          const isSelected = selectedProducts.some(p => p.id === product._id);
                          return (
                            <button
                              key={product._id}
                              onClick={() => {
                                if (!isSelected) {
                                  setSelectedProducts([...selectedProducts, {
                                    id: product._id,
                                    name: product.name,
                                    image: product.image,
                                  }]);
                                }
                                setProductSearch("");
                                setShowProductDropdown(false);
                              }}
                              disabled={isSelected}
                              className={`w-full flex items-center gap-2 p-2 text-left transition-colors ${
                                isSelected 
                                  ? "bg-primary/5 text-muted-foreground cursor-not-allowed" 
                                  : "hover:bg-muted"
                              }`}
                            >
                              {product.image && (
                                <img
                                  src={product.image}
                                  alt=""
                                  className="w-8 h-8 rounded object-cover flex-shrink-0"
                                />
                              )}
                              <span className="text-sm truncate flex-1">{product.name}</span>
                              {isSelected && (
                                <svg className="w-4 h-4 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Začněte psát název produktu a vyberte ze seznamu
                </p>
                
                {/* SKU paste input */}
                <div className="mt-3 pt-3 border-t border-border">
                  <Label className="text-xs text-muted-foreground">Nebo vložte SKU oddělená čárkou:</Label>
                  <div className="flex gap-2 mt-1.5">
                    <Input
                      placeholder="004083, ZV0254, ZV0241..."
                      className="text-sm font-mono"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const input = e.currentTarget;
                          const value = input.value.trim();
                          if (value) {
                            const skus = value.split(/[,\s]+/).map(s => s.trim()).filter(s => s.length > 0);
                            const newProducts = skus
                              .filter(sku => !selectedProducts.some(p => p.id === sku))
                              .map(sku => ({ id: sku, name: sku, image: undefined }));
                            if (newProducts.length > 0) {
                              setSelectedProducts([...selectedProducts, ...newProducts]);
                            }
                            input.value = "";
                          }
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={skuLoading}
                      onClick={async (e) => {
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                        const value = input?.value?.trim();
                        if (value) {
                          setSkuLoading(true);
                          try {
                            const skus = value.split(/[,\s]+/).map(s => s.trim()).filter(s => s.length > 0);
                            const foundProducts = await findProductsBySkus({ skus });
                            console.log("Found products for SKUs:", foundProducts);
                            
                            const newProducts = foundProducts
                              .filter((p: { _id: string }) => !selectedProducts.some(sp => sp.id === p._id))
                              .map((p: { _id: string; name: string; image?: string }) => ({ 
                                id: p._id, 
                                name: p.name, 
                                image: p.image 
                              }));
                            
                            if (newProducts.length > 0) {
                              setSelectedProducts([...selectedProducts, ...newProducts]);
                            }
                            
                            if (newProducts.length < skus.length) {
                              const notFound = skus.length - newProducts.length;
                              alert(`${newProducts.length} produktů nalezeno, ${notFound} SKU nenalezeno v databázi.`);
                            }
                          } catch (error) {
                            console.error("Error finding products:", error);
                          } finally {
                            setSkuLoading(false);
                          }
                          input.value = "";
                        }
                      }}
                    >
                      {skuLoading ? "Hledám..." : "Přidat"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Obrázek (volitelný)</Label>
              <div className="flex items-start gap-3">
                {/* Preview */}
                {(newsImagePreview || existingImageUrl) && (
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    <img
                      src={newsImagePreview || existingImageUrl || ""}
                      alt="Náhled"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setNewsImageFile(null);
                        setNewsImagePreview(null);
                        setExistingImageUrl(null);
                      }}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
                
                {/* Upload button */}
                <label className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors">
                    <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-muted-foreground">
                      {newsImagePreview || existingImageUrl ? "Změnit obrázek" : "Nahrát obrázek"}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setNewsImageFile(file);
                        setNewsImagePreview(URL.createObjectURL(file));
                        setExistingImageUrl(null);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddNews(false)}>
              Zrušit
            </Button>
            <Button 
              onClick={handleSaveNews} 
              disabled={addingNews || !newNewsTitle.trim()}
              className="bg-primary hover:bg-primary/90"
            >
              {addingNews ? (
                <>
                  <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Ukládám...
                </>
              ) : editingNewsId ? (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Uložit změny
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Přidat
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Lightbox */}
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
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-black/50 rounded-full">
              {lightboxImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(idx); }}
                  className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
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
