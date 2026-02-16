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
  letak: { label: "📄 Leták", color: "bg-blue-100 text-blue-700" },
  stojan: { label: "🧍 Stojan", color: "bg-green-100 text-green-700" },
  plakat: { label: "🖼️ Plakát", color: "bg-purple-100 text-purple-700" },
  wobler: { label: "💫 Wobler", color: "bg-yellow-100 text-yellow-700" },
  display: { label: "📦 Display", color: "bg-orange-100 text-orange-700" },
  cenovka: { label: "🏷️ Cenovka", color: "bg-pink-100 text-pink-700" },
  other: { label: "📎 Jiné", color: "bg-gray-100 text-gray-700" },
} as const;

const ORDER_STATUSES = {
  new: { label: "Nová", color: "bg-blue-100 text-blue-700" },
  processing: { label: "Zpracovává se", color: "bg-yellow-100 text-yellow-700" },
  shipped: { label: "Odesláno", color: "bg-purple-100 text-purple-700" },
  delivered: { label: "Doručeno", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Zrušeno", color: "bg-red-100 text-red-700" },
} as const;

type PosmType = keyof typeof POSM_TYPES;
type OrderStatus = keyof typeof ORDER_STATUSES;

export function PosmPageContent() {
  const items = useQuery(api.posm.listItems, {});
  const orders = useQuery(api.posm.listOrders, {});
  const stats = useQuery(api.posm.getStats);
  
  const createItem = useMutation(api.posm.createItem);
  const updateItem = useMutation(api.posm.updateItem);
  const deleteItem = useMutation(api.posm.deleteItem);
  const createOrder = useMutation(api.posm.createOrder);
  const updateOrderStatus = useMutation(api.posm.updateOrderStatus);
  
  const [showAddItem, setShowAddItem] = useState(false);
  const [showOrder, setShowOrder] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Id<"posmItems"> | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterSize, setFilterSize] = useState<string>("all");
  
  // Add item form
  const [newItem, setNewItem] = useState({
    name: "",
    description: "",
    type: "letak" as PosmType,
    imageUrl: "",
    sizes: "",  // comma-separated sizes e.g. "A4, A5, A3"
  });
  
  // Drag & drop state
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const generateUploadUrl = useMutation(api.gallery.generateUploadUrl);
  
  // Handle file upload
  const handleFileUpload = useCallback(async (file: File) => {
    // Validate file type
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Povolené typy souborů: PDF, PNG, JPEG, WEBP');
      return;
    }
    
    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      alert('Maximální velikost souboru je 10MB');
      return;
    }
    
    setUploadingFile(true);
    try {
      // Get upload URL
      const uploadUrl = await generateUploadUrl();
      
      // Upload file
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      
      if (!response.ok) throw new Error('Upload failed');
      
      const { storageId } = await response.json();
      
      // For now, we'll use a placeholder URL - in production you'd get the actual URL
      // The storageId could be stored and resolved later
      const fileUrl = `https://storage.convex.cloud/${storageId}`;
      
      setNewItem(prev => ({ ...prev, imageUrl: fileUrl }));
      setUploadedFileName(file.name);
      console.log('File uploaded:', file.name, storageId);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Chyba při nahrávání souboru');
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
      alert("Zadejte název materiálu");
      return;
    }
    
    // Parse sizes from comma-separated string
    const sizesArray = newItem.sizes
      .split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    await createItem({
      name: newItem.name,
      description: newItem.description || undefined,
      type: newItem.type,
      imageUrl: newItem.imageUrl || undefined,
      sizes: sizesArray.length > 0 ? sizesArray : undefined,
    });
    
    setNewItem({ name: "", description: "", type: "letak", imageUrl: "", sizes: "" });
    setShowAddItem(false);
  };

  const handleOrder = async () => {
    if (!selectedItem) return;
    if (!orderForm.contactName.trim() || !orderForm.contactEmail.trim()) {
      alert("Vyplňte jméno a email");
      return;
    }
    
    // Check if size is required but not selected
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
    alert("Objednávka byla odeslána!");
  };

  // Get all unique sizes from items
  const allSizes: string[] = items
    ? Array.from(new Set(items.flatMap(item => item.sizes || [])) as Set<string>).sort()
    : [];

  const filteredItems = items?.filter(item => {
    const matchesType = filterType === "all" || item.type === filterType;
    const matchesSize = filterSize === "all" || (item.sizes && item.sizes.includes(filterSize));
    return matchesType && matchesSize;
  });

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
            <h1 className="text-3xl font-bold text-foreground">POSM Materiály</h1>
            <p className="text-muted-foreground mt-1">
              Katalog prodejních materiálů a objednávky
            </p>
          </div>
          <Button onClick={() => {
              setNewItem({ name: "", description: "", type: "letak", imageUrl: "", sizes: "" });
              setUploadedFileName(null);
              setShowAddItem(true);
            }} className="gap-2">
            <span>+</span>
            Přidat materiál
          </Button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{stats.activeItems}</div>
                <div className="text-sm text-muted-foreground">Aktivních materiálů</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{stats.totalOrders}</div>
                <div className="text-sm text-muted-foreground">Celkem objednávek</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-blue-600">{stats.newOrders}</div>
                <div className="text-sm text-muted-foreground">Nových objednávek</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-yellow-600">{stats.processingOrders}</div>
                <div className="text-sm text-muted-foreground">Zpracovává se</div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="catalog" className="space-y-6">
          <TabsList>
            <TabsTrigger value="catalog">📦 Katalog</TabsTrigger>
            <TabsTrigger value="orders">📋 Objednávky ({orders.length})</TabsTrigger>
          </TabsList>

          {/* CATALOG TAB */}
          <TabsContent value="catalog" className="space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Typ:</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Všechny typy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Všechny typy</SelectItem>
                    {Object.entries(POSM_TYPES).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {allSizes.length > 0 && (
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Velikost:</Label>
                  <Select value={filterSize} onValueChange={setFilterSize}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Všechny velikosti" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Všechny velikosti</SelectItem>
                      {allSizes.map((size) => (
                        <SelectItem key={size} value={size}>{size}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {(filterType !== "all" || filterSize !== "all") && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setFilterType("all");
                    setFilterSize("all");
                  }}
                >
                  ✕ Zrušit filtry
                </Button>
              )}
            </div>

            {/* Items Grid */}
            {filteredItems && filteredItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredItems.map((item) => (
                  <Card key={item._id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    {item.imageUrl ? (
                      <div className="aspect-video bg-muted relative">
                        <img 
                          src={item.imageUrl} 
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                        <span className="text-4xl opacity-50">
                          {POSM_TYPES[item.type].label.split(" ")[0]}
                        </span>
                      </div>
                    )}
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-foreground line-clamp-2">{item.name}</h3>
                        <Badge className={POSM_TYPES[item.type].color}>
                          {POSM_TYPES[item.type].label}
                        </Badge>
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {item.description}
                        </p>
                      )}
                      {item.sizes && item.sizes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {item.sizes.map((size) => (
                            <span key={size} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                              {size}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Button 
                          className="flex-1"
                          onClick={() => {
                            setSelectedItem(item._id);
                            setShowOrder(true);
                          }}
                        >
                          Objednat
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={async () => {
                            if (confirm("Opravdu chcete tento materiál smazat?")) {
                              await deleteItem({ id: item._id });
                            }
                          }}
                        >
                          🗑️
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <div className="text-4xl mb-4">📦</div>
                <h3 className="text-lg font-semibold mb-2">Žádné materiály</h3>
                <p className="text-muted-foreground mb-4">
                  Přidejte první POSM materiál do katalogu
                </p>
                <Button onClick={() => setShowAddItem(true)}>
                  + Přidat materiál
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
                          <h3 className="font-semibold">{order.item?.name || "Neznámý materiál"}</h3>
                          <Badge className={ORDER_STATUSES[order.status].color}>
                            {ORDER_STATUSES[order.status].label}
                          </Badge>
                          {order.item && (
                            <Badge variant="outline" className={POSM_TYPES[order.item.type].color}>
                              {POSM_TYPES[order.item.type].label}
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Množství:</span>
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
                            <span className="text-muted-foreground">Vytvořeno:</span>
                            <span className="ml-2">{new Date(order.createdAt).toLocaleDateString("cs-CZ")}</span>
                          </div>
                        </div>
                        {order.note && (
                          <p className="text-sm text-muted-foreground mt-2">
                            <span className="font-medium">Poznámka:</span> {order.note}
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
                <div className="text-4xl mb-4">📋</div>
                <h3 className="text-lg font-semibold mb-2">Žádné objednávky</h3>
                <p className="text-muted-foreground">
                  Zatím nebyly vytvořeny žádné objednávky
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Add Item Dialog */}
        <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Přidat POSM materiál</DialogTitle>
              <DialogDescription>
                Přidejte nový materiál do katalogu
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Název *</Label>
                <Input
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="např. Leták Apotheke BIO čaje"
                />
              </div>
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
                <Label>Popis</Label>
                <Textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="Krátký popis materiálu..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Obrázek / PDF</Label>
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
                      <p className="text-sm text-muted-foreground">Nahrávám...</p>
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
                          Přetáhněte soubor sem
                        </p>
                        <p className="text-xs text-muted-foreground">
                          nebo klikněte pro výběr (PDF, PNG, JPEG, max 10MB)
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
                    }}
                    placeholder="https://..."
                    className="text-sm h-8"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Dostupné velikosti</Label>
                <Input
                  value={newItem.sizes}
                  onChange={(e) => setNewItem({ ...newItem, sizes: e.target.value })}
                  placeholder="A4, A5, A3, 50x70cm..."
                />
                <p className="text-xs text-muted-foreground">
                  Oddělte velikosti čárkou. Nechte prázdné, pokud materiál nemá různé velikosti.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddItem(false)}>
                Zrušit
              </Button>
              <Button onClick={handleCreateItem}>
                Přidat
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Order Dialog */}
        <Dialog open={showOrder} onOpenChange={setShowOrder}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Objednat materiál</DialogTitle>
              <DialogDescription>
                Vyplňte údaje pro objednávku
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Size selector - show only if item has sizes */}
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
                <Label>Množství *</Label>
                <Input
                  type="number"
                  min={1}
                  value={orderForm.quantity}
                  onChange={(e) => setOrderForm({ ...orderForm, quantity: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Jméno *</Label>
                <Input
                  value={orderForm.contactName}
                  onChange={(e) => setOrderForm({ ...orderForm, contactName: e.target.value })}
                  placeholder="Jan Novák"
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
                <Label>Doručovací adresa</Label>
                <Textarea
                  value={orderForm.deliveryAddress}
                  onChange={(e) => setOrderForm({ ...orderForm, deliveryAddress: e.target.value })}
                  placeholder="Ulice, město, PSČ..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Poznámka</Label>
                <Textarea
                  value={orderForm.note}
                  onChange={(e) => setOrderForm({ ...orderForm, note: e.target.value })}
                  placeholder="Další informace k objednávce..."
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowOrder(false)}>
                Zrušit
              </Button>
              <Button onClick={handleOrder}>
                Odeslat objednávku
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
