"use client";

import { useState, useRef, useCallback } from "react";
import JSZip from "jszip";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Hardcoded built-in defaults; overridable per-row via the posmTypes table.
// product_list is reserved for the virtual "Produktové listy" cards and is
// not creatable manually via the Add Item dialog.
type PosmTypeDef = {
  label: string;
  color: string;
  order: number;
  isBuiltIn: boolean;
  isHidden?: boolean;
  reserved?: boolean; // not user-creatable / not deletable in management UI
};
const POSM_TYPE_DEFAULTS: Record<string, PosmTypeDef> = {
  letak: { label: "Letak", color: "bg-blue-100 text-blue-700", order: 10, isBuiltIn: true },
  stojan: { label: "Stojan", color: "bg-green-100 text-green-700", order: 20, isBuiltIn: true },
  plakat: { label: "Plakat", color: "bg-purple-100 text-purple-700", order: 30, isBuiltIn: true },
  wobler: { label: "Wobler", color: "bg-yellow-100 text-yellow-700", order: 40, isBuiltIn: true },
  display: { label: "Display", color: "bg-orange-100 text-orange-700", order: 50, isBuiltIn: true },
  cenovka: { label: "Cenovka", color: "bg-pink-100 text-pink-700", order: 60, isBuiltIn: true },
  product_list: { label: "Produktové listy", color: "bg-rose-100 text-rose-700", order: 70, isBuiltIn: true, reserved: true },
  other: { label: "Jine", color: "bg-gray-100 text-gray-700", order: 80, isBuiltIn: true },
};

// Color palette for new custom types and recoloring built-ins.
const POSM_COLOR_PALETTE: { name: string; value: string }[] = [
  { name: "Modra", value: "bg-blue-100 text-blue-700" },
  { name: "Zelena", value: "bg-green-100 text-green-700" },
  { name: "Fialova", value: "bg-purple-100 text-purple-700" },
  { name: "Zluta", value: "bg-yellow-100 text-yellow-700" },
  { name: "Oranzova", value: "bg-orange-100 text-orange-700" },
  { name: "Ruzova", value: "bg-pink-100 text-pink-700" },
  { name: "Ruzova tmava", value: "bg-rose-100 text-rose-700" },
  { name: "Tyrkysova", value: "bg-teal-100 text-teal-700" },
  { name: "Modrozelena", value: "bg-emerald-100 text-emerald-700" },
  { name: "Indigo", value: "bg-indigo-100 text-indigo-700" },
  { name: "Hneda", value: "bg-amber-100 text-amber-700" },
  { name: "Seda", value: "bg-gray-100 text-gray-700" },
];

const FALLBACK_TYPE_COLOR = "bg-gray-100 text-gray-700";

const ORDER_STATUSES = {
  new: { label: "Nova", color: "bg-blue-100 text-blue-700" },
  processing: { label: "Zpracovava se", color: "bg-yellow-100 text-yellow-700" },
  shipped: { label: "Odeslano", color: "bg-purple-100 text-purple-700" },
  delivered: { label: "Doruceno", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Zruseno", color: "bg-red-100 text-red-700" },
} as const;

const DISTRIBUTION_TYPES = {
  download: { label: "Ke stazeni", icon: "DL", color: "bg-emerald-100 text-emerald-700" },
  order: { label: "K objednani", icon: "OB", color: "bg-amber-100 text-amber-700" },
} as const;

type PosmType = string;
type OrderStatus = keyof typeof ORDER_STATUSES;
type DistributionType = keyof typeof DISTRIBUTION_TYPES;

type PosmKitItem = {
  id: string;
  itemId: Id<"posmItems">;
  name: string;
  type: PosmType;
  distributionType?: DistributionType;
  imageUrl?: string;
  downloadUrl?: string;
  quantity: number;
  selectedSize?: string;
};

function sanitizeFilename(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[\/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "_")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "soubor";
}

function getFilenameForKitItem(item: PosmKitItem, url: string): string {
  let extFromUrl = "";
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").filter(Boolean).pop() || "";
    const m = last.match(/\.([a-zA-Z0-9]{1,8})$/);
    if (m) extFromUrl = `.${m[1].toLowerCase()}`;
  } catch {}
  const base = sanitizeFilename(item.name);
  if (extFromUrl && !base.toLowerCase().endsWith(extFromUrl)) return `${base}${extFromUrl}`;
  return base;
}

function uniqueFilename(name: string, used: Set<string>): string {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  let i = 2;
  while (used.has(`${stem}_${i}${ext}`)) i++;
  const final = `${stem}_${i}${ext}`;
  used.add(final);
  return final;
}

export function PosmPageContent() {
  const items = useQuery(api.posm.listItems, {});
  const orders = useQuery(api.posm.listOrders, {});
  const stats = useQuery(api.posm.getStats);
  const productsWithPdf = useQuery(api.products.list, { withPdf: true });
  const productSheetNames = useQuery(api.posm.listProductSheetNames, {});
  const setProductSheetName = useMutation(api.posm.setProductSheetName);
  const dbPosmTypes = useQuery(api.posm.listTypes, {});
  const upsertPosmType = useMutation(api.posm.upsertType);
  const deletePosmType = useMutation(api.posm.deleteType);

  // Resolve effective types: built-in defaults overridden by DB rows;
  // plus any fully custom types from the DB.
  const typesByKey: Record<string, PosmTypeDef> = (() => {
    const map: Record<string, PosmTypeDef> = {};
    for (const [key, def] of Object.entries(POSM_TYPE_DEFAULTS)) {
      map[key] = { ...def };
    }
    for (const row of dbPosmTypes ?? []) {
      const baseline = map[row.key];
      map[row.key] = {
        label: row.label,
        color: row.color,
        order: row.order ?? baseline?.order ?? 1000,
        isBuiltIn: baseline?.isBuiltIn ?? row.isBuiltIn ?? false,
        isHidden: row.isHidden,
        reserved: baseline?.reserved,
      };
    }
    return map;
  })();

  const getTypeDef = (key: string): PosmTypeDef => {
    return typesByKey[key] ?? {
      label: key,
      color: FALLBACK_TYPE_COLOR,
      order: 9999,
      isBuiltIn: false,
    };
  };

  // Visible (non-hidden) types, sorted by order for chip rendering.
  const visibleTypeEntries: [string, PosmTypeDef][] = Object.entries(typesByKey)
    .filter(([, def]) => !def.isHidden)
    .sort((a, b) => a[1].order - b[1].order);

  // Types selectable in the Add Item dialog: visible, non-reserved.
  const manualTypeEntries: [string, PosmTypeDef][] = visibleTypeEntries.filter(
    ([, def]) => !def.reserved,
  );

  const createItem = useMutation(api.posm.createItem);
  const updateItem = useMutation(api.posm.updateItem);
  const deleteItem = useMutation(api.posm.deleteItem);
  const createOrder = useMutation(api.posm.createOrder);
  const updateOrderStatus = useMutation(api.posm.updateOrderStatus);

  const [showAddItem, setShowAddItem] = useState(false);
  const [showOrder, setShowOrder] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Id<"posmItems"> | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterSize, setFilterSize] = useState<string>("all");
  const [filterDistribution, setFilterDistribution] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showManageTypes, setShowManageTypes] = useState(false);

  // Add item form
  const [newItem, setNewItem] = useState({
    name: "",
    description: "",
    type: "letak" as PosmType,
    distributionType: "order" as DistributionType,
    downloadUrl: "",
    imageUrl: "",
    sizes: "",
  });

  // Upload state
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedStorageId, setUploadedStorageId] = useState<string | null>(null);
  const [uploadedFileType, setUploadedFileType] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.gallery.generateUploadUrl);

  // POSM KIT state
  const [posmKit, setPosmKit] = useState<PosmKitItem[]>([]);
  const [showPosmKit, setShowPosmKit] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [shareCopied, setShareCopied] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

  // Inline name editing in the detail dialog
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Handle file upload
  const handleFileUpload = useCallback(async (file: File) => {
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Povolene typy souboru: PDF, PNG, JPEG, WEBP');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Maximalni velikost souboru je 10MB');
      return;
    }

    setUploadingFile(true);
    try {
      const uploadUrl = await generateUploadUrl();

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!response.ok) throw new Error('Upload failed');

      const { storageId } = await response.json();

      setUploadedStorageId(storageId);
      setUploadedFileName(file.name);
      setUploadedFileType(file.type);
      // Clear the manual URL since we have a storage file
      setNewItem(prev => ({ ...prev, imageUrl: '' }));
    } catch (error) {
      console.error('Upload error:', error);
      alert('Chyba pri nahravani souboru');
    } finally {
      setUploadingFile(false);
    }
  }, [generateUploadUrl]);

  // Drag handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  // Order form
  const [orderForm, setOrderForm] = useState({
    quantity: 1,
    selectedSize: "",
    note: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    deliveryAddress: "",
  });

  const handleCreateItem = async () => {
    if (!newItem.name.trim()) {
      alert("Zadejte nazev materialu");
      return;
    }

    const sizesArray = newItem.sizes
      .split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0);

    await createItem({
      name: newItem.name,
      description: newItem.description || undefined,
      type: newItem.type,
      imageUrl: newItem.imageUrl || undefined,
      storageId: uploadedStorageId ? (uploadedStorageId as Id<"_storage">) : undefined,
      fileType:
        uploadedFileType ||
        (newItem.downloadUrl.toLowerCase().includes(".pdf") || newItem.imageUrl.toLowerCase().includes(".pdf")
          ? "application/pdf"
          : undefined),
      downloadUrl: newItem.downloadUrl || undefined,
      distributionType: newItem.distributionType,
      sizes: sizesArray.length > 0 ? sizesArray : undefined,
    });

    setNewItem({ name: "", description: "", type: "letak", distributionType: "order", downloadUrl: "", imageUrl: "", sizes: "" });
    setUploadedFileName(null);
    setUploadedStorageId(null);
    setUploadedFileType(null);
    setShowAddItem(false);
  };

  const handleOrder = async () => {
    if (!selectedItem) return;
    if (!orderForm.contactName.trim() || !orderForm.contactEmail.trim()) {
      alert("Vyplnte jmeno a email");
      return;
    }

    const selectedItemData = items?.find(i => i._id === selectedItem);
    if (selectedItemData?.sizes && selectedItemData.sizes.length > 0 && !orderForm.selectedSize) {
      alert("Vyberte velikost");
      return;
    }

    await createOrder({
      itemId: selectedItem,
      quantity: orderForm.quantity,
      selectedSize: orderForm.selectedSize || undefined,
      note: orderForm.note || undefined,
      contactName: orderForm.contactName,
      contactEmail: orderForm.contactEmail,
      contactPhone: orderForm.contactPhone || undefined,
      deliveryAddress: orderForm.deliveryAddress || undefined,
    });

    setOrderForm({
      quantity: 1,
      selectedSize: "",
      note: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      deliveryAddress: "",
    });
    setSelectedItem(null);
    setShowOrder(false);
    alert("Objednavka byla odeslana!");
  };

  // POSM KIT functions
  const addToPosmKit = (item: typeof items extends (infer T)[] | undefined ? NonNullable<T> : never) => {
    setPosmKit(prev => {
      if (prev.find(k => k.itemId === item._id)) return prev;
      return [...prev, {
        id: item._id,
        itemId: item._id,
        name: item.name,
        type: item.type as PosmType,
        distributionType: (item.distributionType as DistributionType) || undefined,
        imageUrl: item.imageUrl || undefined,
        downloadUrl: item.downloadUrl || undefined,
        quantity: 1,
        selectedSize: item.sizes?.[0] || undefined,
      }];
    });
    setShowPosmKit(true);
  };

  const removeFromPosmKit = (itemId: string) => {
    setPosmKit(prev => prev.filter(k => k.id !== itemId));
  };

  const updatePosmKitQuantity = (itemId: string, quantity: number) => {
    setPosmKit(prev => prev.map(k => k.id === itemId ? { ...k, quantity: Math.max(1, quantity) } : k));
  };

  const updatePosmKitSize = (itemId: string, size: string) => {
    setPosmKit(prev => prev.map(k => k.id === itemId ? { ...k, selectedSize: size } : k));
  };

  const downloadKitItems = async () => {
    if (isDownloadingZip) return;
    const downloadItems = posmKit.filter(k => k.distributionType === "download");
    const targets = downloadItems
      .map(item => ({ item, url: item.downloadUrl || item.imageUrl }))
      .filter((t): t is { item: PosmKitItem; url: string } => Boolean(t.url));

    if (targets.length === 0) return;

    // Single file: keep the original direct-download behavior so the user
    // gets the file as-is instead of a one-file zip.
    if (targets.length === 1) {
      const { item, url } = targets[0];
      const a = document.createElement("a");
      a.href = url;
      a.download = getFilenameForKitItem(item, url);
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    setIsDownloadingZip(true);
    try {
      const zip = new JSZip();
      const usedNames = new Set<string>();
      const failed: string[] = [];

      for (const { item, url } of targets) {
        try {
          const res = await fetch(url, { mode: "cors" });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const blob = await res.blob();
          const name = uniqueFilename(getFilenameForKitItem(item, url), usedNames);
          zip.file(name, blob);
        } catch (e) {
          console.error("Failed to fetch", url, e);
          failed.push(item.name);
        }
      }

      if (Object.keys(zip.files).length === 0) {
        alert("Materiály se nepodařilo stáhnout (CORS/síť). Zkuste je stáhnout jednotlivě z detailu.");
        return;
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zipUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = zipUrl;
      a.download = `posm_kit_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(zipUrl);

      if (failed.length > 0) {
        alert(`ZIP připraven, ale tyto materiály se nepodařilo přibalit:\n- ${failed.join("\n- ")}`);
      }
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const generatePosmKitShareUrl = (): string => {
    if (posmKit.length === 0 || typeof window === "undefined") return "";
    try {
      const payload = {
        generatedAt: new Date().toISOString(),
        items: posmKit.map((k) => {
          const def = getTypeDef(k.type);
          return {
            name: k.name,
            typeLabel: def.label,
            typeColor: def.color,
            distributionType: k.distributionType,
            imageUrl: k.imageUrl,
            downloadUrl: k.downloadUrl,
            quantity: k.quantity,
            selectedSize: k.selectedSize,
          };
        }),
      };
      const json = JSON.stringify(payload);
      const utf8 = unescape(encodeURIComponent(json));
      const base64 = btoa(utf8).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      return `${window.location.origin}/posm-kit?data=${base64}`;
    } catch (error) {
      console.error("Failed to generate POSM kit share URL:", error);
      return "";
    }
  };

  const openShareDialog = () => {
    const url = generatePosmKitShareUrl();
    if (!url) return;
    setShareUrl(url);
    setShareCopied(false);
    setShowShareDialog(true);
  };

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const exportPosmKitToTxt = () => {
    if (posmKit.length === 0) return;
    const lines: string[] = [
      "=======================================",
      "POSM KIT - Objednavka materialu",
      "=======================================",
      "",
      `Datum: ${new Date().toLocaleDateString("cs-CZ")}`,
      "",
      "---------------------------------------",
      ""
    ];

    const orderItems = posmKit.filter(k => k.distributionType === "order");
    const downloadItemsList = posmKit.filter(k => k.distributionType === "download");

    if (orderItems.length > 0) {
      lines.push("K OBJEDNANI:");
      lines.push("");
      orderItems.forEach(item => {
        lines.push(`  - ${item.name}`);
        lines.push(`    Typ: ${getTypeDef(item.type).label}`);
        lines.push(`    Mnozstvi: ${item.quantity} ks`);
        if (item.selectedSize) lines.push(`    Velikost: ${item.selectedSize}`);
        lines.push("");
      });
      lines.push("---------------------------------------");
      lines.push("");
    }

    if (downloadItemsList.length > 0) {
      lines.push("KE STAZENI:");
      lines.push("");
      downloadItemsList.forEach(item => {
        lines.push(`  - ${item.name}`);
        lines.push(`    Typ: ${getTypeDef(item.type).label}`);
        const url = item.downloadUrl || item.imageUrl;
        if (url) lines.push(`    Odkaz: ${url}`);
        lines.push("");
      });
      lines.push("---------------------------------------");
      lines.push("");
    }

    lines.push("Vygenerovano: " + new Date().toLocaleString("cs-CZ"));

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `posm_kit_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Virtual POSM items synthesized from product sheets (pdfUrl).
  // One product sheet (PDF) is typically shared by many products, so we
  // deduplicate by pdfUrl and show the sheet itself, not the products.
  type DisplayItem = NonNullable<typeof items>[number] & {
    isVirtual?: boolean;
    productCount?: number;
    sheetPdfUrl?: string;
  };

  const deriveSheetName = (pdfUrl: string): string => {
    try {
      const raw = pdfUrl.split("?")[0].split("#")[0].split("/").pop() || "produktovy-list.pdf";
      const decoded = decodeURIComponent(raw).replace(/\.pdf$/i, "");
      const cleaned = decoded.replace(/[-_]+/g, " ").trim();
      return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : "Produktový list";
    } catch {
      return "Produktový list";
    }
  };

  const productSheetGroups = new Map<
    string,
    { pdfUrl: string; products: NonNullable<typeof productsWithPdf>[number][] }
  >();
  (productsWithPdf ?? []).forEach((p) => {
    if (!p.pdfUrl) return;
    const existing = productSheetGroups.get(p.pdfUrl);
    if (existing) {
      existing.products.push(p);
    } else {
      productSheetGroups.set(p.pdfUrl, { pdfUrl: p.pdfUrl, products: [p] });
    }
  });

  const productSheetNameMap = new Map<string, string>(
    (productSheetNames ?? []).map((n) => [n.pdfUrl, n.displayName]),
  );

  const virtualProductSheetItems: DisplayItem[] = Array.from(productSheetGroups.values()).map(
    ({ pdfUrl, products }) => {
      const first = products[0];
      const description = products.length > 1
        ? `Použito u ${products.length} produktů`
        : first.brand
          ? `${first.brand}${first.feedCategory ? " – " + first.feedCategory : ""}`
          : first.feedCategory;
      const overrideName = productSheetNameMap.get(pdfUrl);
      return {
        _id: (`virtual-sheet-${pdfUrl}`) as unknown as Id<"posmItems">,
        _creationTime: first._creationTime,
        name: overrideName || deriveSheetName(pdfUrl),
        description,
        type: "product_list" as PosmType,
        imageUrl: pdfUrl,
        fileType: "application/pdf",
        downloadUrl: pdfUrl,
        distributionType: "download" as DistributionType,
        sizes: undefined,
        storageId: undefined,
        isActive: true,
        createdAt: first._creationTime,
        isVirtual: true,
        productCount: products.length,
        sheetPdfUrl: pdfUrl,
      };
    },
  );

  const allItems: DisplayItem[] | undefined = items
    ? [...virtualProductSheetItems, ...items]
    : undefined;

  // Get all unique sizes from items
  const allSizes: string[] = allItems
    ? Array.from(new Set(allItems.flatMap(item => item.sizes || [])) as Set<string>).sort()
    : [];

  const normalizedQuery = searchQuery.trim().toLocaleLowerCase("cs");
  const filteredItems = allItems?.filter(item => {
    const matchesType = filterType === "all" || item.type === filterType;
    const matchesSize = filterSize === "all" || (item.sizes && item.sizes.includes(filterSize));
    const matchesDistribution = filterDistribution === "all" || item.distributionType === filterDistribution;
    const matchesSearch = normalizedQuery === "" || item.name.toLocaleLowerCase("cs").includes(normalizedQuery);
    return matchesType && matchesSize && matchesDistribution && matchesSearch;
  });

  const selectedItemData = allItems?.find(i => i._id === selectedItem);

  if (items === undefined || orders === undefined) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-48" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-muted rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">POSM Materialy</h1>
            <p className="text-muted-foreground mt-1">
              Katalog prodejnich materialu a objednavky
            </p>
          </div>
          <Button onClick={() => {
              setNewItem({ name: "", description: "", type: "letak", distributionType: "order", downloadUrl: "", imageUrl: "", sizes: "" });
              setUploadedFileName(null);
              setUploadedStorageId(null);
              setUploadedFileType(null);
              setShowAddItem(true);
            }} className="gap-2">
            <span>+</span>
            Pridat material
          </Button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{stats.activeItems}</div>
                <div className="text-sm text-muted-foreground">Aktivnich materialu</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-emerald-600">{stats.downloadItems}</div>
                <div className="text-sm text-muted-foreground">Ke stazeni</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-amber-600">{stats.orderItems}</div>
                <div className="text-sm text-muted-foreground">K objednani</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{stats.totalOrders}</div>
                <div className="text-sm text-muted-foreground">Celkem objednavek</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-blue-600">{stats.newOrders}</div>
                <div className="text-sm text-muted-foreground">Novych objednavek</div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="catalog" className="space-y-6">
          <TabsList>
            <TabsTrigger value="catalog">Katalog</TabsTrigger>
            <TabsTrigger value="orders">Objednavky ({orders.length})</TabsTrigger>
          </TabsList>

          {/* CATALOG TAB */}
          <TabsContent value="catalog" className="space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-medium text-muted-foreground mr-1">Typ:</span>
                <button
                  onClick={() => setFilterType("all")}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    filterType === "all"
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  Vse
                </button>
                <button
                  type="button"
                  onClick={() => setShowManageTypes(true)}
                  className="px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors inline-flex items-center gap-1"
                  title="Spravovat typy"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Spravovat
                </button>
                {visibleTypeEntries.map(([key, { label, color }]) => (
                  <button
                    key={key}
                    onClick={() => setFilterType(filterType === key ? "all" : key)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      filterType === key
                        ? color
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-muted-foreground mr-1">Distribuce:</span>
                <button
                  onClick={() => setFilterDistribution("all")}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    filterDistribution === "all"
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  Vse
                </button>
                {Object.entries(DISTRIBUTION_TYPES).map(([key, { label, color }]) => (
                  <button
                    key={key}
                    onClick={() => setFilterDistribution(filterDistribution === key ? "all" : key)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      filterDistribution === key
                        ? color
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {allSizes.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-muted-foreground mr-1">Velikost:</span>
                  <button
                    onClick={() => setFilterSize("all")}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      filterSize === "all"
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    Vse
                  </button>
                  {allSizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setFilterSize(filterSize === size ? "all" : size)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        filterSize === size
                          ? "bg-violet-100 text-violet-700"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              )}

              <div className="relative ml-auto w-full sm:w-64">
                <svg
                  className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 18a7 7 0 110-14 7 7 0 010 14z" />
                </svg>
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Hledat podle nazvu..."
                  className="h-8 pl-8 pr-8 text-sm"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    title="Vymazat"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Items Grid */}
            {filteredItems && filteredItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredItems.map((item) => (
                  <Card key={item._id} className="overflow-hidden hover:shadow-lg transition-shadow group">
                    {/* Click to open detail */}
                    <div
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedItem(item._id);
                        setShowDetail(true);
                      }}
                    >
                      {item.imageUrl ? (
                        <div className="aspect-video bg-muted relative">
                          {(item.fileType === "application/pdf" ||
                            item.imageUrl.toLowerCase().includes(".pdf") ||
                            (item.downloadUrl || "").toLowerCase().includes(".pdf")) ? (
                            <iframe
                              src={`${item.imageUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                              title={item.name}
                              className="w-full h-full bg-white"
                            />
                          ) : (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          )}
                          {/* Distribution type badge overlay */}
                          {item.distributionType && (
                            <div className="absolute top-2 right-2">
                              <Badge className={DISTRIBUTION_TYPES[item.distributionType as DistributionType]?.color || "bg-gray-100 text-gray-700"}>
                                {DISTRIBUTION_TYPES[item.distributionType as DistributionType]?.label || item.distributionType}
                              </Badge>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center relative">
                          <span className="text-4xl opacity-50">
                            {item.type === "letak" ? "DL" : item.type === "stojan" ? "ST" : item.type === "plakat" ? "PL" : item.type === "wobler" ? "WB" : item.type === "display" ? "DS" : item.type === "cenovka" ? "CN" : "?"}
                          </span>
                          {item.distributionType && (
                            <div className="absolute top-2 right-2">
                              <Badge className={DISTRIBUTION_TYPES[item.distributionType as DistributionType]?.color || "bg-gray-100 text-gray-700"}>
                                {DISTRIBUTION_TYPES[item.distributionType as DistributionType]?.label || item.distributionType}
                              </Badge>
                            </div>
                          )}
                        </div>
                      )}
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-foreground line-clamp-2 mb-2">{item.name}</h3>
                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                          <Badge className={getTypeDef(item.type).color}>
                            {getTypeDef(item.type).label}
                          </Badge>
                          {item.distributionType && (
                            <Badge className={DISTRIBUTION_TYPES[item.distributionType as DistributionType]?.color || "bg-gray-100 text-gray-700"}>
                              {DISTRIBUTION_TYPES[item.distributionType as DistributionType]?.label || item.distributionType}
                            </Badge>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {item.description}
                          </p>
                        )}
                        {item.sizes && item.sizes.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            <span className="text-xs text-muted-foreground mr-1">Vel.:</span>
                            {item.sizes.map((size) => (
                              <span key={size} className="text-xs bg-violet-50 text-violet-600 px-2 py-0.5 rounded border border-violet-200">
                                {size}
                              </span>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </div>
                    {/* Actions - outside of the clickable area */}
                    <div className="px-4 pb-4 flex items-center gap-2">
                      {/* Add to POSM KIT */}
                      <Button
                        variant="outline"
                        size="sm"
                        className={`flex-1 ${posmKit.find(k => k.itemId === item._id) ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (posmKit.find(k => k.itemId === item._id)) {
                            removeFromPosmKit(item._id);
                          } else {
                            addToPosmKit(item);
                          }
                        }}
                      >
                        {posmKit.find(k => k.itemId === item._id) ? "V kitu" : "+ Do kitu"}
                      </Button>

                      {/* Quick action based on distribution type */}
                      {item.distributionType === "download" ? (
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            const url = item.downloadUrl || item.imageUrl;
                            if (url) {
                              const a = document.createElement("a");
                              a.href = url;
                              a.target = "_blank";
                              a.rel = "noopener noreferrer";
                              a.click();
                            }
                          }}
                        >
                          Stahnout
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItem(item._id);
                            setShowOrder(true);
                          }}
                        >
                          Objednat
                        </Button>
                      )}

                      {!item.isVirtual && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Opravdu chcete tento material smazat?")) {
                              deleteItem({ id: item._id });
                            }
                          }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <h3 className="text-lg font-semibold mb-2">Zadne materialy</h3>
                <p className="text-muted-foreground mb-4">
                  Pridejte prvni POSM material do katalogu
                </p>
                <Button onClick={() => setShowAddItem(true)}>
                  + Pridat material
                </Button>
              </Card>
            )}
          </TabsContent>

          {/* ORDERS TAB */}
          <TabsContent value="orders" className="space-y-6">
            {orders.length > 0 ? (
              <div className="space-y-4">
                {orders.map((order) => (
                  <Card key={order._id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{order.item?.name || "Neznamy material"}</h3>
                          <Badge className={ORDER_STATUSES[order.status].color}>
                            {ORDER_STATUSES[order.status].label}
                          </Badge>
                          {order.item && (
                            <Badge variant="outline" className={getTypeDef(order.item.type).color}>
                              {getTypeDef(order.item.type).label}
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Mnozstvi:</span>
                            <span className="ml-2 font-medium">{order.quantity} ks</span>
                          </div>
                          {order.selectedSize && (
                            <div>
                              <span className="text-muted-foreground">Velikost:</span>
                              <span className="ml-2 font-medium">{order.selectedSize}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-muted-foreground">Kontakt:</span>
                            <span className="ml-2">{order.contactName}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Email:</span>
                            <span className="ml-2">{order.contactEmail}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Vytvoreno:</span>
                            <span className="ml-2">{new Date(order.createdAt).toLocaleDateString("cs-CZ")}</span>
                          </div>
                        </div>
                        {order.note && (
                          <p className="text-sm text-muted-foreground mt-2">
                            <span className="font-medium">Poznamka:</span> {order.note}
                          </p>
                        )}
                        {order.deliveryAddress && (
                          <p className="text-sm text-muted-foreground mt-1">
                            <span className="font-medium">Adresa:</span> {order.deliveryAddress}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={order.status}
                          onValueChange={(value) => {
                            updateOrderStatus({
                              id: order._id,
                              status: value as OrderStatus
                            });
                          }}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ORDER_STATUSES).map(([key, { label }]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <h3 className="text-lg font-semibold mb-2">Zadne objednavky</h3>
                <p className="text-muted-foreground">
                  Zatim nebyly vytvoreny zadne objednavky
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Add Item Dialog */}
        <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Pridat POSM material</DialogTitle>
              <DialogDescription>
                Pridejte novy material do katalogu
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nazev *</Label>
                <Input
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="napr. Letak Apotheke BIO caje"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Typ</Label>
                  <Select
                    value={newItem.type}
                    onValueChange={(value) => setNewItem({ ...newItem, type: value as PosmType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {manualTypeEntries.map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Distribuce *</Label>
                  <Select
                    value={newItem.distributionType}
                    onValueChange={(value) => setNewItem({ ...newItem, distributionType: value as DistributionType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="download">Ke stazeni</SelectItem>
                      <SelectItem value="order">K objednani</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Popis</Label>
                <Textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="Kratky popis materialu..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Obrazek / PDF (nahled)</Label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-primary bg-primary/5'
                      : uploadedFileName
                        ? 'border-green-400 bg-green-50'
                        : 'border-border hover:border-primary/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    className="hidden"
                  />

                  {uploadingFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-muted-foreground">Nahravam...</p>
                    </div>
                  ) : uploadedFileName ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-green-700">{uploadedFileName}</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadedFileName(null);
                          setUploadedStorageId(null);
                          setUploadedFileType(null);
                          setNewItem(prev => ({ ...prev, imageUrl: '' }));
                        }}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Odebrat
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Pretahnete soubor sem
                        </p>
                        <p className="text-xs text-muted-foreground">
                          nebo kliknete pro vyber (PDF, PNG, JPEG, max 10MB)
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Manual URL input as fallback */}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-muted-foreground">nebo zadejte URL:</span>
                  <Input
                    value={newItem.imageUrl}
                    onChange={(e) => {
                      setNewItem({ ...newItem, imageUrl: e.target.value });
                      setUploadedFileName(null);
                      setUploadedStorageId(null);
                      setUploadedFileType(null);
                    }}
                    placeholder="https://..."
                    className="text-sm h-8"
                  />
                </div>
              </div>

              {/* Download URL - only for download distribution type */}
              {newItem.distributionType === "download" && (
                <div className="space-y-2">
                  <Label>URL ke stazeni</Label>
                  <Input
                    value={newItem.downloadUrl}
                    onChange={(e) => setNewItem({ ...newItem, downloadUrl: e.target.value })}
                    placeholder="https://... (odkaz na soubor ke stazeni)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Zadejte odkaz, odkud si uzivatele mohou material stahnout. Pokud neni vyplneno, pouzije se nahrany soubor.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Dostupne velikosti</Label>
                <Input
                  value={newItem.sizes}
                  onChange={(e) => setNewItem({ ...newItem, sizes: e.target.value })}
                  placeholder="A4, A5, A3, 50x70cm..."
                />
                <p className="text-xs text-muted-foreground">
                  Oddelte velikosti carkou. Nechte prazdne, pokud material nema ruzne velikosti.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddItem(false)}>
                Zrusit
              </Button>
              <Button onClick={handleCreateItem}>
                Pridat
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Item Detail Dialog */}
        <Dialog open={showDetail} onOpenChange={(open) => {
          setShowDetail(open);
          if (!open) setEditingName(false);
        }}>
          <DialogContent className="max-w-2xl">
            {selectedItemData && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3 flex-wrap">
                    {editingName ? (
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Input
                          autoFocus
                          value={nameDraft}
                          onChange={(e) => setNameDraft(e.target.value)}
                          onKeyDown={async (e) => {
                            if (e.key === "Enter") {
                              const trimmed = nameDraft.trim();
                              if (!trimmed) return;
                              setSavingName(true);
                              try {
                                if (selectedItemData.isVirtual && selectedItemData.sheetPdfUrl) {
                                  await setProductSheetName({
                                    pdfUrl: selectedItemData.sheetPdfUrl,
                                    displayName: trimmed,
                                  });
                                } else {
                                  await updateItem({ id: selectedItemData._id, name: trimmed });
                                }
                                setEditingName(false);
                              } finally {
                                setSavingName(false);
                              }
                            } else if (e.key === "Escape") {
                              setEditingName(false);
                              setNameDraft(selectedItemData.name);
                            }
                          }}
                          className="text-base h-9"
                          disabled={savingName}
                        />
                        <Button
                          size="sm"
                          onClick={async () => {
                            const trimmed = nameDraft.trim();
                            if (!trimmed) return;
                            setSavingName(true);
                            try {
                              if (selectedItemData.isVirtual && selectedItemData.sheetPdfUrl) {
                                await setProductSheetName({
                                  pdfUrl: selectedItemData.sheetPdfUrl,
                                  displayName: trimmed,
                                });
                              } else {
                                await updateItem({ id: selectedItemData._id, name: trimmed });
                              }
                              setEditingName(false);
                            } finally {
                              setSavingName(false);
                            }
                          }}
                          disabled={savingName || !nameDraft.trim() || nameDraft.trim() === selectedItemData.name}
                        >
                          {savingName ? "Ukladam..." : "Ulozit"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingName(false);
                            setNameDraft(selectedItemData.name);
                          }}
                          disabled={savingName}
                        >
                          Zrusit
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span>{selectedItemData.name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setNameDraft(selectedItemData.name);
                            setEditingName(true);
                          }}
                          className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Upravit nazev"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <Badge className={getTypeDef(selectedItemData.type).color}>
                          {getTypeDef(selectedItemData.type).label}
                        </Badge>
                        {selectedItemData.distributionType && (
                          <Badge className={DISTRIBUTION_TYPES[selectedItemData.distributionType as DistributionType]?.color || ""}>
                            {DISTRIBUTION_TYPES[selectedItemData.distributionType as DistributionType]?.label || selectedItemData.distributionType}
                          </Badge>
                        )}
                      </>
                    )}
                  </DialogTitle>
                  <DialogDescription>
                    Detail materialu
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {/* Preview image */}
                  {selectedItemData.imageUrl && (
                    <div className="rounded-lg overflow-hidden bg-muted">
                      {(selectedItemData.fileType === "application/pdf" ||
                        selectedItemData.imageUrl.toLowerCase().includes(".pdf") ||
                        (selectedItemData.downloadUrl || "").toLowerCase().includes(".pdf")) ? (
                        <iframe
                          src={`${selectedItemData.imageUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                          title={selectedItemData.name}
                          className="w-full h-80 bg-white"
                        />
                      ) : (
                        <img
                          src={selectedItemData.imageUrl}
                          alt={selectedItemData.name}
                          className="w-full max-h-80 object-contain"
                        />
                      )}
                    </div>
                  )}

                  {selectedItemData.description && (
                    <p className="text-muted-foreground">{selectedItemData.description}</p>
                  )}

                  {/* Metadata grid */}
                  <div className="grid grid-cols-2 gap-3 bg-muted/30 rounded-lg p-4">
                    <div>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Typ</span>
                      <div className="mt-1">
                        <Badge className={getTypeDef(selectedItemData.type).color}>
                          {getTypeDef(selectedItemData.type).label}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Distribuce</span>
                      <div className="mt-1">
                        {selectedItemData.isVirtual ? (
                          <Badge className={DISTRIBUTION_TYPES[selectedItemData.distributionType as DistributionType]?.color || ""}>
                            {DISTRIBUTION_TYPES[selectedItemData.distributionType as DistributionType]?.label || selectedItemData.distributionType}
                          </Badge>
                        ) : (
                          <Select
                            value={selectedItemData.distributionType || "order"}
                            onValueChange={async (value) => {
                              await updateItem({
                                id: selectedItemData._id,
                                distributionType: value as DistributionType
                              });
                            }}
                          >
                            <SelectTrigger className="h-7 w-auto text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="download">Ke stazeni</SelectItem>
                              <SelectItem value="order">K objednani</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                    {selectedItemData.sizes && selectedItemData.sizes.length > 0 && (
                      <div className="col-span-2">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Velikost</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {selectedItemData.sizes.map((size) => (
                            <Badge key={size} variant="outline" className="bg-violet-50 text-violet-600 border-violet-200">{size}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="col-span-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Vytvoreno</span>
                      <div className="text-sm mt-1">{new Date(selectedItemData.createdAt).toLocaleDateString("cs-CZ")}</div>
                    </div>
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (posmKit.find(k => k.itemId === selectedItemData._id)) {
                        removeFromPosmKit(selectedItemData._id);
                      } else {
                        addToPosmKit(selectedItemData);
                      }
                    }}
                  >
                    {posmKit.find(k => k.itemId === selectedItemData._id) ? "Odebrat z kitu" : "+ Pridat do POSM kitu"}
                  </Button>

                  {selectedItemData.distributionType === "download" ? (
                    <Button
                      onClick={() => {
                        const url = selectedItemData.downloadUrl || selectedItemData.imageUrl;
                        if (url) {
                          const a = document.createElement("a");
                          a.href = url;
                          a.target = "_blank";
                          a.rel = "noopener noreferrer";
                          a.click();
                        }
                      }}
                    >
                      Stahnout material
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        setShowDetail(false);
                        setShowOrder(true);
                      }}
                    >
                      Objednat
                    </Button>
                  )}
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Order Dialog */}
        <Dialog open={showOrder} onOpenChange={setShowOrder}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Objednat material</DialogTitle>
              <DialogDescription>
                Vyplnte udaje pro objednavku
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {(() => {
                const itemData = items?.find(i => i._id === selectedItem);
                if (itemData?.sizes && itemData.sizes.length > 0) {
                  return (
                    <div className="space-y-2">
                      <Label>Velikost *</Label>
                      <Select
                        value={orderForm.selectedSize}
                        onValueChange={(value) => setOrderForm({ ...orderForm, selectedSize: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Vyberte velikost" />
                        </SelectTrigger>
                        <SelectContent>
                          {itemData.sizes.map((size) => (
                            <SelectItem key={size} value={size}>{size}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="space-y-2">
                <Label>Mnozstvi *</Label>
                <Input
                  type="number"
                  min={1}
                  value={orderForm.quantity}
                  onChange={(e) => setOrderForm({ ...orderForm, quantity: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Jmeno *</Label>
                <Input
                  value={orderForm.contactName}
                  onChange={(e) => setOrderForm({ ...orderForm, contactName: e.target.value })}
                  placeholder="Jan Novak"
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={orderForm.contactEmail}
                  onChange={(e) => setOrderForm({ ...orderForm, contactEmail: e.target.value })}
                  placeholder="jan@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input
                  value={orderForm.contactPhone}
                  onChange={(e) => setOrderForm({ ...orderForm, contactPhone: e.target.value })}
                  placeholder="+420 123 456 789"
                />
              </div>
              <div className="space-y-2">
                <Label>Dorucovaci adresa</Label>
                <Textarea
                  value={orderForm.deliveryAddress}
                  onChange={(e) => setOrderForm({ ...orderForm, deliveryAddress: e.target.value })}
                  placeholder="Ulice, mesto, PSC..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Poznamka</Label>
                <Textarea
                  value={orderForm.note}
                  onChange={(e) => setOrderForm({ ...orderForm, note: e.target.value })}
                  placeholder="Dalsi informace k objednavce..."
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowOrder(false)}>
                Zrusit
              </Button>
              <Button onClick={handleOrder}>
                Odeslat objednavku
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Floating POSM KIT Panel */}
        {showPosmKit && (
          <div className="fixed bottom-4 right-4 w-96 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="p-3 bg-primary text-primary-foreground flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold">POSM KIT</span>
                {posmKit.length > 0 && (
                  <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full">{posmKit.length}</span>
                )}
              </div>
              <button onClick={() => setShowPosmKit(false)} className="hover:bg-white/20 rounded p-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto">
              {posmKit.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  <p>Kliknete na "+ Do kitu" u materialu pro pridani</p>
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {posmKit.map(item => {
                    const itemData = items?.find(i => i._id === item.itemId);
                    return (
                      <div key={item.id} className="p-2 bg-muted/50 rounded-lg space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium truncate">{item.name}</span>
                              {item.distributionType && (
                                <Badge className={`text-[10px] px-1.5 py-0 ${DISTRIBUTION_TYPES[item.distributionType]?.color || ""}`}>
                                  {item.distributionType === "download" ? "DL" : "OBJ"}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => removeFromPosmKit(item.id)}
                            className="text-red-500 hover:bg-red-100 rounded p-1 transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        {/* Quantity for orderable items */}
                        {item.distributionType === "order" && (
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Ks:</Label>
                            <Input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => updatePosmKitQuantity(item.id, parseInt(e.target.value) || 1)}
                              className="h-7 w-20 text-xs"
                            />
                            {/* Size selector if applicable */}
                            {itemData?.sizes && itemData.sizes.length > 0 && (
                              <Select
                                value={item.selectedSize || ""}
                                onValueChange={(v) => updatePosmKitSize(item.id, v)}
                              >
                                <SelectTrigger className="h-7 w-24 text-xs">
                                  <SelectValue placeholder="Vel." />
                                </SelectTrigger>
                                <SelectContent>
                                  {itemData.sizes.map(s => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {posmKit.length > 0 && (
              <div className="p-3 border-t border-border space-y-2">
                {/* Download items if any are downloadable */}
                {posmKit.some(k => k.distributionType === "download") && (() => {
                  const dlCount = posmKit.filter(k => k.distributionType === "download").length;
                  const asZip = dlCount > 1;
                  return (
                    <button
                      onClick={downloadKitItems}
                      disabled={isDownloadingZip}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isDownloadingZip ? (
                        <div className="w-4 h-4 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      )}
                      {isDownloadingZip
                        ? "Připravuji ZIP…"
                        : asZip
                          ? `Stahnout materialy v ZIPu (${dlCount})`
                          : `Stahnout materialy (${dlCount})`}
                    </button>
                  );
                })()}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={exportPosmKitToTxt}
                    className="flex items-center justify-center gap-1 px-2 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export TXT
                  </button>
                  <button
                    onClick={openShareDialog}
                    className="flex items-center justify-center gap-1 px-2 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Sdílet odkaz
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Minimized POSM KIT Button */}
        {!showPosmKit && posmKit.length > 0 && (
          <button
            onClick={() => setShowPosmKit(true)}
            className="fixed bottom-4 right-4 flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl shadow-lg hover:bg-primary/90 transition-colors z-50"
          >
            <span className="font-semibold">POSM KIT</span>
            <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full">{posmKit.length}</span>
          </button>
        )}

        {/* Manage Types Dialog */}
        <ManageTypesDialog
          open={showManageTypes}
          onOpenChange={setShowManageTypes}
          typeEntries={Object.entries(typesByKey).sort((a, b) => a[1].order - b[1].order)}
          colorPalette={POSM_COLOR_PALETTE}
          fallbackColor={FALLBACK_TYPE_COLOR}
          onUpsert={async (input) => { await upsertPosmType(input); }}
          onDelete={async (key) => { await deletePosmType({ key }); }}
        />

        {/* Share-link Dialog for POSM Kit */}
        <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Sdílet POSM KIT
              </DialogTitle>
              <DialogDescription>
                Veřejný odkaz – příjemce nemusí být přihlášený. Materiály ke stažení jsou k dispozici přímo z odkazu.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label className="block text-sm font-medium text-foreground mb-2">Odkaz</Label>
                <div className="flex gap-2">
                  <Input value={shareUrl} readOnly onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
                  <Button onClick={copyShareUrl} className="bg-green-600 hover:bg-green-700 whitespace-nowrap">
                    {shareCopied ? "Zkopírováno" : "Kopírovat"}
                  </Button>
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground mb-2">Obsah:</p>
                <ul className="text-sm space-y-1">
                  {posmKit.map((item) => (
                    <li key={item.id} className="flex items-center gap-2">
                      <Badge className={`text-[10px] px-1.5 py-0 ${item.distributionType === "download" ? DISTRIBUTION_TYPES.download.color : DISTRIBUTION_TYPES.order.color}`}>
                        {item.distributionType === "download" ? "DL" : "OBJ"}
                      </Badge>
                      <span>{item.name}</span>
                      {item.distributionType === "order" && <span className="text-muted-foreground">({item.quantity} ks)</span>}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowShareDialog(false)}>
                  Zavřít
                </Button>
                {shareUrl && (
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium"
                  >
                    Otevřít
                  </a>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

type ManageTypesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  typeEntries: [string, PosmTypeDef][];
  colorPalette: { name: string; value: string }[];
  fallbackColor: string;
  onUpsert: (input: { key: string; label: string; color: string; order?: number; isHidden?: boolean; isBuiltIn?: boolean }) => Promise<void>;
  onDelete: (key: string) => Promise<void>;
};

function ManageTypesDialog({ open, onOpenChange, typeEntries, colorPalette, fallbackColor, onUpsert, onDelete }: ManageTypesDialogProps) {
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState(colorPalette[0]?.value || fallbackColor);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slugify = (s: string): string => {
    const base = s
      .normalize("NFD")
      // strip combining diacritical marks (U+0300–U+036F)
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
    return base || `custom-${Math.random().toString(36).slice(2, 8)}`;
  };

  const handleCreate = async () => {
    const label = newLabel.trim();
    if (!label) return;
    setSaving(true);
    setError(null);
    try {
      const existingKeys = new Set(typeEntries.map(([k]) => k));
      let key = slugify(label);
      let i = 2;
      while (existingKeys.has(key)) {
        key = `${slugify(label)}-${i++}`;
      }
      await onUpsert({ key, label, color: newColor, isBuiltIn: false, order: 100 + typeEntries.length });
      setNewLabel("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba pri ukladani");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Spravovat typy POSM</DialogTitle>
          <DialogDescription>
            Prejmenovani / prebarveni vychozich typu, pridani vlastnich. Vestavene typy nelze smazat, jen skryt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Existing types list */}
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {typeEntries.map(([key, def]) => (
              <ManageTypeRow
                key={key}
                typeKey={key}
                def={def}
                colorPalette={colorPalette}
                onUpsert={onUpsert}
                onDelete={onDelete}
              />
            ))}
          </div>

          {/* Add new type */}
          <div className="border-t pt-4 space-y-2">
            <Label className="text-sm font-medium">Pridat novy typ</Label>
            <div className="flex flex-wrap gap-2 items-center">
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Nazev typu..."
                className="flex-1 min-w-[180px] h-9"
                disabled={saving}
              />
              <Select value={newColor} onValueChange={setNewColor} disabled={saving}>
                <SelectTrigger className="w-44 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colorPalette.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <span className={`inline-block w-3 h-3 rounded-full mr-2 align-middle ${c.value.split(" ")[0]}`} />
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleCreate} disabled={saving || !newLabel.trim()}>
                {saving ? "Ukladam..." : "Pridat"}
              </Button>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div>
              <Badge className={newColor}>
                {newLabel.trim() || "Nahled"}
              </Badge>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Zavrit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ManageTypeRowProps = {
  typeKey: string;
  def: PosmTypeDef;
  colorPalette: { name: string; value: string }[];
  onUpsert: (input: { key: string; label: string; color: string; order?: number; isHidden?: boolean; isBuiltIn?: boolean }) => Promise<void>;
  onDelete: (key: string) => Promise<void>;
};

function ManageTypeRow({ typeKey, def, colorPalette, onUpsert, onDelete }: ManageTypeRowProps) {
  const [label, setLabel] = useState(def.label);
  const [color, setColor] = useState(def.color);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset local state when underlying def changes (e.g. after upsert refresh)
  useRefSync(def.label, setLabel);
  useRefSync(def.color, setColor);

  const dirty = label.trim() !== def.label || color !== def.color;

  const handleSave = async () => {
    const trimmed = label.trim();
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    try {
      await onUpsert({
        key: typeKey,
        label: trimmed,
        color,
        order: def.order,
        isHidden: def.isHidden,
        isBuiltIn: def.isBuiltIn,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleHidden = async () => {
    setSaving(true);
    setError(null);
    try {
      await onUpsert({
        key: typeKey,
        label: def.label,
        color: def.color,
        order: def.order,
        isHidden: !def.isHidden,
        isBuiltIn: def.isBuiltIn,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (def.isBuiltIn) return;
    if (!confirm(`Opravdu smazat typ "${def.label}"? Pokud je nekde pouzity, smazani selze.`)) return;
    setDeleting(true);
    setError(null);
    try {
      await onDelete(typeKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nelze smazat");
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg border bg-card">
      <Badge className={`${color} flex-shrink-0`}>{label || typeKey}</Badge>
      <Input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className="flex-1 min-w-[140px] h-8 text-sm"
        disabled={saving || deleting}
      />
      <Select value={color} onValueChange={setColor} disabled={saving || deleting}>
        <SelectTrigger className="w-40 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {colorPalette.map((c) => (
            <SelectItem key={c.value} value={c.value}>
              <span className={`inline-block w-3 h-3 rounded-full mr-2 align-middle ${c.value.split(" ")[0]}`} />
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" onClick={handleSave} disabled={!dirty || saving || deleting || !label.trim()}>
        {saving ? "..." : "Ulozit"}
      </Button>
      <Button size="sm" variant="outline" onClick={handleToggleHidden} disabled={saving || deleting} title={def.isHidden ? "Zobrazit" : "Skryt"}>
        {def.isHidden ? "Zobrazit" : "Skryt"}
      </Button>
      {!def.isBuiltIn && (
        <Button
          size="sm"
          variant="outline"
          className="text-red-600 hover:text-red-700"
          onClick={handleDelete}
          disabled={saving || deleting}
        >
          {deleting ? "..." : "Smazat"}
        </Button>
      )}
      {def.isBuiltIn && (
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">vestaveny</span>
      )}
      {error && <span className="text-xs text-red-600 w-full">{error}</span>}
    </div>
  );
}

// Sync local state with prop changes (used to refresh row state when DB updates).
function useRefSync<T>(value: T, setter: (v: T) => void) {
  const prev = useRef(value);
  if (prev.current !== value) {
    prev.current = value;
    setter(value);
  }
}
