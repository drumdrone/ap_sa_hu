"use client";

import { useState, useRef, useCallback } from "react";
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

const POSM_TYPES = {
  letak: { label: "Letak", color: "bg-blue-100 text-blue-700" },
  stojan: { label: "Stojan", color: "bg-green-100 text-green-700" },
  plakat: { label: "Plakat", color: "bg-purple-100 text-purple-700" },
  wobler: { label: "Wobler", color: "bg-yellow-100 text-yellow-700" },
  display: { label: "Display", color: "bg-orange-100 text-orange-700" },
  cenovka: { label: "Cenovka", color: "bg-pink-100 text-pink-700" },
  other: { label: "Jine", color: "bg-gray-100 text-gray-700" },
} as const;

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

type PosmType = keyof typeof POSM_TYPES;
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

export function PosmPageContent() {
  const items = useQuery(api.posm.listItems, {});
  const orders = useQuery(api.posm.listOrders, {});
  const stats = useQuery(api.posm.getStats);

  const createItem = useMutation(api.posm.createItem);
  const updateItem = useMutation(api.posm.updateItem);
  const deleteItem = useMutation(api.posm.deleteItem);
  const createOrder = useMutation(api.posm.createOrder);
  const updateOrderStatus = useMutation(api.posm.updateOrderStatus);
  const sendSalesKitEmail = useMutation(api.emails.sendSalesKitEmail);

  const [showAddItem, setShowAddItem] = useState(false);
  const [showOrder, setShowOrder] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Id<"posmItems"> | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterSize, setFilterSize] = useState<string>("all");
  const [filterDistribution, setFilterDistribution] = useState<string>("all");

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.gallery.generateUploadUrl);

  // POSM KIT state
  const [posmKit, setPosmKit] = useState<PosmKitItem[]>([]);
  const [showPosmKit, setShowPosmKit] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);

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
      downloadUrl: newItem.downloadUrl || undefined,
      distributionType: newItem.distributionType,
      sizes: sizesArray.length > 0 ? sizesArray : undefined,
    });

    setNewItem({ name: "", description: "", type: "letak", distributionType: "order", downloadUrl: "", imageUrl: "", sizes: "" });
    setUploadedFileName(null);
    setUploadedStorageId(null);
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

  const downloadKitItems = () => {
    const downloadItems = posmKit.filter(k => k.distributionType === "download");
    downloadItems.forEach(item => {
      const url = item.downloadUrl || item.imageUrl;
      if (url) {
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.click();
      }
    });
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
        lines.push(`    Typ: ${POSM_TYPES[item.type].label}`);
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
        lines.push(`    Typ: ${POSM_TYPES[item.type].label}`);
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

  const sendPosmKitEmail = async () => {
    if (!emailTo || posmKit.length === 0) return;
    setIsSendingEmail(true);
    try {
      const lines = [
        "POSM KIT - Objednavka materialu",
        "",
        `Datum: ${new Date().toLocaleDateString("cs-CZ")}`,
        "",
        "---",
        "",
      ];

      const orderItems = posmKit.filter(k => k.distributionType === "order");
      const downloadItemsList = posmKit.filter(k => k.distributionType === "download");

      if (orderItems.length > 0) {
        lines.push("K OBJEDNANI:");
        lines.push("");
        orderItems.forEach(item => {
          lines.push(`  - ${item.name}`);
          lines.push(`    Typ: ${POSM_TYPES[item.type].label}`);
          lines.push(`    Mnozstvi: ${item.quantity} ks`);
          if (item.selectedSize) lines.push(`    Velikost: ${item.selectedSize}`);
          lines.push("");
        });
        lines.push("---");
        lines.push("");
      }

      if (downloadItemsList.length > 0) {
        lines.push("KE STAZENI:");
        lines.push("");
        downloadItemsList.forEach(item => {
          lines.push(`  - ${item.name}`);
          const url = item.downloadUrl || item.imageUrl;
          if (url) lines.push(`    Odkaz: ${url}`);
          lines.push("");
        });
        lines.push("---");
        lines.push("");
      }

      lines.push(`Vygenerovano: ${new Date().toLocaleString("cs-CZ")}`);

      await sendSalesKitEmail({
        email: emailTo,
        subject: "POSM KIT - Objednavka materialu",
        content: lines.join("\n"),
      });
      setShowEmailDialog(false);
      setEmailTo("");
      alert("Email odeslan!");
    } catch (error) {
      console.error("Error sending email:", error);
      alert("Chyba pri odesilani emailu");
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Get all unique sizes from items
  const allSizes: string[] = items
    ? Array.from(new Set(items.flatMap(item => item.sizes || [])) as Set<string>).sort()
    : [];

  const filteredItems = items?.filter(item => {
    const matchesType = filterType === "all" || item.type === filterType;
    const matchesSize = filterSize === "all" || (item.sizes && item.sizes.includes(filterSize));
    const matchesDistribution = filterDistribution === "all" || item.distributionType === filterDistribution;
    return matchesType && matchesSize && matchesDistribution;
  });

  const selectedItemData = items?.find(i => i._id === selectedItem);

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
              <div className="flex items-center gap-1.5">
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
                {Object.entries(POSM_TYPES).map(([key, { label, color }]) => (
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
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
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
                          <Badge className={POSM_TYPES[item.type as PosmType]?.color || "bg-gray-100"}>
                            {POSM_TYPES[item.type as PosmType]?.label || item.type}
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
                            <Badge variant="outline" className={POSM_TYPES[order.item.type as PosmType]?.color || ""}>
                              {POSM_TYPES[order.item.type as PosmType]?.label || order.item.type}
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
                      {Object.entries(POSM_TYPES).map(([key, { label }]) => (
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
        <Dialog open={showDetail} onOpenChange={setShowDetail}>
          <DialogContent className="max-w-2xl">
            {selectedItemData && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    {selectedItemData.name}
                    <Badge className={POSM_TYPES[selectedItemData.type as PosmType]?.color || ""}>
                      {POSM_TYPES[selectedItemData.type as PosmType]?.label || selectedItemData.type}
                    </Badge>
                    {selectedItemData.distributionType && (
                      <Badge className={DISTRIBUTION_TYPES[selectedItemData.distributionType as DistributionType]?.color || ""}>
                        {DISTRIBUTION_TYPES[selectedItemData.distributionType as DistributionType]?.label || selectedItemData.distributionType}
                      </Badge>
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
                      <img
                        src={selectedItemData.imageUrl}
                        alt={selectedItemData.name}
                        className="w-full max-h-80 object-contain"
                      />
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
                        <Badge className={POSM_TYPES[selectedItemData.type as PosmType]?.color || "bg-gray-100"}>
                          {POSM_TYPES[selectedItemData.type as PosmType]?.label || selectedItemData.type}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Distribuce</span>
                      <div className="mt-1">
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
                {posmKit.some(k => k.distributionType === "download") && (
                  <button
                    onClick={downloadKitItems}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Stahnout materialy ({posmKit.filter(k => k.distributionType === "download").length})
                  </button>
                )}

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
                    onClick={() => setShowEmailDialog(true)}
                    className="flex items-center justify-center gap-1 px-2 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email
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

        {/* Email Dialog for POSM Kit */}
        <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Odeslat POSM KIT emailem
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email prijemce
                </label>
                <Input
                  type="email"
                  placeholder="kolega@apotheke.cz"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                />
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground mb-2">Bude odeslano:</p>
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
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowEmailDialog(false)}
                >
                  Zrusit
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={sendPosmKitEmail}
                  disabled={!emailTo || isSendingEmail}
                >
                  {isSendingEmail ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Odesilam...
                    </>
                  ) : (
                    "Odeslat"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
