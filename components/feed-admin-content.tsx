"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Database, CheckCircle, AlertCircle, ExternalLink, Trash2, Archive, RotateCcw, Search, Link2 } from "lucide-react";

const DEFAULT_FEED_URL = "https://www.apotheke.cz/xml-feeds/apotheke-luigisbox-products.xml";

export function FeedAdminContent() {
  const [feedUrl, setFeedUrl] = useState(DEFAULT_FEED_URL);
  const [limit, setLimit] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
    details?: { created: number; updated: number; total: number };
  } | null>(null);

  const syncStatus = useQuery(api.feedImport.getSyncStatus);
  const feedCategories = useQuery(api.products.getFeedCategories);
  const backupStats = useQuery(api.feedImport.getBackupStats);
  const marketingBackups = useQuery(api.feedImport.listMarketingBackups);
  const deleteOrphaned = useMutation(api.feedImport.deleteOrphanedProducts);
  const restoreBackup = useMutation(api.feedImport.restoreBackupToProduct);

  // State for orphaned products cleanup
  const [isCheckingOrphans, setIsCheckingOrphans] = useState(false);
  const [orphanedProducts, setOrphanedProducts] = useState<{
    _id: string;
    externalId: string;
    name: string;
    hasMarketingData: boolean;
  }[] | null>(null);
  const [isDeletingOrphans, setIsDeletingOrphans] = useState(false);
  const [deleteResult, setDeleteResult] = useState<string | null>(null);

  // State for backup restoration
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{
    _id: string;
    name: string;
    externalId?: string;
  }[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedBackupSku, setSelectedBackupSku] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<string | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);

    try {
      const response = await fetch("/api/sync-feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedUrl,
          ...(limit ? { limit: parseInt(limit) } : {}),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSyncResult({
          success: true,
          message: "Synchronizace dokončena úspěšně",
          details: {
            created: data.created,
            updated: data.updated,
            total: data.totalProducts,
          },
        });
      } else {
        setSyncResult({
          success: false,
          message: data.error || "Synchronizace selhala",
        });
      }
    } catch (error) {
      setSyncResult({
        success: false,
        message: `Chyba: ${error}`,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">Správa XML Feedu</h1>
          <p className="text-muted-foreground">
            Konfigurace a synchronizace produktového feedu
          </p>
        </div>

        {/* Current Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Stav databáze
            </CardTitle>
          </CardHeader>
          <CardContent>
            {syncStatus ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-primary">{syncStatus.totalProducts}</div>
                  <div className="text-sm text-muted-foreground">Celkem produktů</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">{syncStatus.withMarketingData}</div>
                  <div className="text-sm text-muted-foreground">S marketingovými daty</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-sm font-medium">
                    {syncStatus.lastSync 
                      ? new Date(syncStatus.lastSync).toLocaleString("cs-CZ")
                      : "Nikdy"}
                  </div>
                  <div className="text-sm text-muted-foreground">Poslední synchronizace</div>
                </div>
              </div>
            ) : (
              <div className="animate-pulse flex gap-4">
                <div className="h-20 bg-muted rounded-lg flex-1"></div>
                <div className="h-20 bg-muted rounded-lg flex-1"></div>
                <div className="h-20 bg-muted rounded-lg flex-1"></div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Backup Stats & Restore */}
        {backupStats && (backupStats.marketingBackups > 0 || backupStats.galleryBackups > 0) && (
          <Card className="mb-6 border-amber-200 bg-amber-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-amber-800">
                <Archive className="w-5 h-5" />
                Zálohovaná data
              </CardTitle>
              <CardDescription>
                Marketingová data a obrázky ze smazaných produktů. Můžete je ručně přiřadit k produktům.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/60 rounded-lg p-4 border border-amber-200">
                  <div className="text-2xl font-bold text-amber-700">{backupStats.skusWithBackup}</div>
                  <div className="text-sm text-amber-600">SKU se zálohou</div>
                </div>
                <div className="bg-white/60 rounded-lg p-4 border border-amber-200">
                  <div className="text-2xl font-bold text-amber-700">{backupStats.marketingBackups}</div>
                  <div className="text-sm text-amber-600">Marketing. dat</div>
                </div>
                <div className="bg-white/60 rounded-lg p-4 border border-amber-200">
                  <div className="text-2xl font-bold text-amber-700">{backupStats.galleryBackups}</div>
                  <div className="text-sm text-amber-600">Obrázků v galerii</div>
                </div>
              </div>

              {/* Backup list and restore UI */}
              {marketingBackups && marketingBackups.length > 0 && (
                <div className="border border-amber-200 rounded-lg bg-white/60">
                  <div className="p-3 border-b border-amber-200 bg-amber-100/50">
                    <h4 className="font-medium text-amber-800 flex items-center gap-2">
                      <RotateCcw className="w-4 h-4" />
                      Obnovit marketingová data
                    </h4>
                    <p className="text-sm text-amber-600">
                      Vyberte zálohu a vyhledejte produkt, ke kterému ji chcete přiřadit
                    </p>
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-amber-100/50 sticky top-0">
                        <tr>
                          <th className="text-left p-2">Původní SKU</th>
                          <th className="text-left p-2">Původní název</th>
                          <th className="text-left p-2">Top?</th>
                          <th className="text-left p-2">Claim</th>
                          <th className="text-left p-2">Akce</th>
                        </tr>
                      </thead>
                      <tbody>
                        {marketingBackups.map((backup) => (
                          <tr 
                            key={backup._id} 
                            className={`border-t border-amber-200 ${
                              selectedBackupSku === backup.sku ? "bg-amber-200/50" : ""
                            }`}
                          >
                            <td className="p-2 font-mono text-xs">{backup.sku}</td>
                            <td className="p-2 truncate max-w-[200px]" title={backup.originalProductName}>
                              {backup.originalProductName}
                            </td>
                            <td className="p-2">
                              {backup.isTop && (
                                <span className="text-amber-700 font-medium">
                                  #{backup.topOrder}
                                </span>
                              )}
                            </td>
                            <td className="p-2 truncate max-w-[150px]" title={backup.salesClaim || ""}>
                              {backup.salesClaim || "-"}
                            </td>
                            <td className="p-2">
                              <Button
                                size="sm"
                                variant={selectedBackupSku === backup.sku ? "default" : "outline"}
                                onClick={() => {
                                  setSelectedBackupSku(backup.sku);
                                  setSearchResults(null);
                                  setRestoreResult(null);
                                }}
                                className="h-7 text-xs"
                              >
                                {selectedBackupSku === backup.sku ? "Vybráno" : "Vybrat"}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Search and assign UI */}
                  {selectedBackupSku && (
                    <div className="p-4 border-t border-amber-200 bg-white">
                      <div className="flex items-center gap-2 mb-3">
                        <Link2 className="w-4 h-4 text-amber-700" />
                        <span className="font-medium">
                          Přiřadit zálohu SKU <code className="bg-amber-100 px-1 rounded">{selectedBackupSku}</code> k produktu:
                        </span>
                      </div>
                      
                      <div className="flex gap-2 mb-3">
                        <Input
                          placeholder="Vyhledat produkt podle názvu..."
                          value={productSearchQuery}
                          onChange={(e) => setProductSearchQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && productSearchQuery.trim()) {
                              setIsSearching(true);
                              fetch("/api/sync-feed", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ 
                                  action: "searchProducts",
                                  query: productSearchQuery 
                                }),
                              })
                                .then((res) => res.json())
                                .then((data) => setSearchResults(data.products || []))
                                .catch(() => setSearchResults([]))
                                .finally(() => setIsSearching(false));
                            }
                          }}
                          className="flex-1"
                        />
                        <Button
                          onClick={() => {
                            if (!productSearchQuery.trim()) return;
                            setIsSearching(true);
                            fetch("/api/sync-feed", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ 
                                action: "searchProducts",
                                query: productSearchQuery 
                              }),
                            })
                              .then((res) => res.json())
                              .then((data) => setSearchResults(data.products || []))
                              .catch(() => setSearchResults([]))
                              .finally(() => setIsSearching(false));
                          }}
                          disabled={isSearching || !productSearchQuery.trim()}
                        >
                          {isSearching ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Search className="w-4 h-4" />
                          )}
                        </Button>
                      </div>

                      {searchResults && (
                        <div className="border rounded-lg max-h-48 overflow-y-auto">
                          {searchResults.length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground">
                              Žádné produkty nenalezeny
                            </div>
                          ) : (
                            <table className="w-full text-sm">
                              <thead className="bg-muted sticky top-0">
                                <tr>
                                  <th className="text-left p-2">Název</th>
                                  <th className="text-left p-2">SKU</th>
                                  <th className="text-left p-2">Akce</th>
                                </tr>
                              </thead>
                              <tbody>
                                {searchResults.map((product) => (
                                  <tr key={product._id} className="border-t">
                                    <td className="p-2 truncate max-w-[250px]">{product.name}</td>
                                    <td className="p-2 font-mono text-xs">{product.externalId || "-"}</td>
                                    <td className="p-2">
                                      <Button
                                        size="sm"
                                        variant="default"
                                        onClick={async () => {
                                          setIsRestoring(true);
                                          try {
                                            const result = await restoreBackup({
                                              productId: product._id as Id<"products">,
                                              backupSku: selectedBackupSku,
                                            });
                                            if (result.restored) {
                                              setRestoreResult(`✅ Úspěšně obnoveno! (${result.galleryImages} obrázků)`);
                                              setSelectedBackupSku(null);
                                              setSearchResults(null);
                                              setProductSearchQuery("");
                                            } else {
                                              setRestoreResult(`❌ ${result.reason}`);
                                            }
                                          } catch (error) {
                                            setRestoreResult(`❌ Chyba: ${error}`);
                                          } finally {
                                            setIsRestoring(false);
                                          }
                                        }}
                                        disabled={isRestoring}
                                        className="h-7 text-xs"
                                      >
                                        {isRestoring ? (
                                          <RefreshCw className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <>
                                            <RotateCcw className="w-3 h-3 mr-1" />
                                            Obnovit sem
                                          </>
                                        )}
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      )}

                      {restoreResult && (
                        <div className={`mt-3 p-3 rounded-lg ${
                          restoreResult.startsWith("✅") 
                            ? "bg-green-50 border border-green-200 text-green-800"
                            : "bg-red-50 border border-red-200 text-red-800"
                        }`}>
                          {restoreResult}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Feed Categories */}
        {feedCategories && feedCategories.categories.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Kategorie z feedu</CardTitle>
              <CardDescription>
                Nalezeno {feedCategories.categories.length} hlavních kategorií
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {feedCategories.categories.map((cat) => {
                  const subCount = feedCategories.subcategoryData?.find((d) => d.category === cat)?.subcategories?.length || 0;
                  return (
                    <div
                      key={cat}
                      className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm"
                    >
                      {cat}
                      {subCount > 0 && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({subCount} podkat.)
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sync Configuration */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Synchronizace feedu
            </CardTitle>
            <CardDescription>
              Načte produkty z XML feedu a aktualizuje databázi. Existující marketingová data zůstanou zachována.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">URL XML feedu</label>
              <div className="flex gap-2">
                <Input
                  value={feedUrl}
                  onChange={(e) => setFeedUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(feedUrl, "_blank")}
                  title="Otevřít feed v novém okně"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Výchozí: LuigisBox formát (apotheke-luigisbox-products.xml)
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Limit produktů (volitelné)</label>
              <Input
                type="number"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                placeholder="Prázdné = všechny produkty"
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Pro testování můžete omezit počet importovaných produktů
              </p>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <Button
                onClick={handleSync}
                disabled={isSyncing || !feedUrl}
                className="min-w-[160px]"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Synchronizuji...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Spustit synchronizaci
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => setFeedUrl(DEFAULT_FEED_URL)}
                disabled={feedUrl === DEFAULT_FEED_URL}
              >
                Obnovit výchozí URL
              </Button>
            </div>

            {/* Sync Result */}
            {syncResult && (
              <div
                className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${
                  syncResult.success
                    ? "bg-green-50 border border-green-200"
                    : "bg-red-50 border border-red-200"
                }`}
              >
                {syncResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <div className={`font-medium ${syncResult.success ? "text-green-800" : "text-red-800"}`}>
                    {syncResult.message}
                  </div>
                  {syncResult.details && (
                    <div className="text-sm text-muted-foreground mt-1">
                      Celkem: {syncResult.details.total} produktů • 
                      Vytvořeno: {syncResult.details.created} • 
                      Aktualizováno: {syncResult.details.updated}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cleanup Orphaned Products */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Srovnání s feedem
            </CardTitle>
            <CardDescription>
              Najde a smaže produkty, které již nejsou ve feedu. <strong className="text-amber-600">Marketingová data a obrázky se automaticky zálohují</strong> a obnoví se při příštím importu.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={async () => {
                  setIsCheckingOrphans(true);
                  setOrphanedProducts(null);
                  setDeleteResult(null);
                  try {
                    // Call API to fetch feed and check orphans (server-side to avoid CORS)
                    const res = await fetch("/api/sync-feed", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "checkOrphans", feedUrl }),
                    });
                    const data = await res.json();
                    
                    if (data.error) {
                      throw new Error(data.details || data.error);
                    }
                    
                    console.log(`Feed has ${data.feedSkusCount} SKUs, found ${data.orphanedProducts?.length || 0} orphaned`);
                    setOrphanedProducts(data.orphanedProducts || []);
                  } catch (error) {
                    console.error("Error checking orphans:", error);
                    setDeleteResult(`Chyba: ${error}`);
                  } finally {
                    setIsCheckingOrphans(false);
                  }
                }}
                disabled={isCheckingOrphans}
              >
                {isCheckingOrphans ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Kontroluji...
                  </>
                ) : (
                  <>Zkontrolovat rozdíly</>
                )}
              </Button>
            </div>

            {orphanedProducts !== null && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-medium">
                      Nalezeno {orphanedProducts.length} produktů k odstranění
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {orphanedProducts.filter(p => p.hasMarketingData).length} z nich má marketingová data
                    </p>
                  </div>
                  {orphanedProducts.length > 0 && (
                    <Button
                      variant="destructive"
                      onClick={async () => {
                        if (!confirm(`Opravdu smazat ${orphanedProducts.length} produktů?`)) return;
                        setIsDeletingOrphans(true);
                        try {
                          const result = await deleteOrphaned({
                            productIds: orphanedProducts.map(p => p._id as Id<"products">),
                          });
                          setDeleteResult(`Smazáno ${result.deleted} produktů${result.backedUp > 0 ? `, zálohováno ${result.backedUp} s marketingovými daty` : ""}`);
                          setOrphanedProducts(null);
                        } catch (error) {
                          setDeleteResult(`Chyba: ${error}`);
                        } finally {
                          setIsDeletingOrphans(false);
                        }
                      }}
                      disabled={isDeletingOrphans}
                    >
                      {isDeletingOrphans ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Mažu...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Smazat {orphanedProducts.length} produktů
                        </>
                      )}
                    </Button>
                  )}
                </div>
                
                {orphanedProducts.length > 0 && (
                  <div className="max-h-64 overflow-y-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="text-left p-2">SKU</th>
                          <th className="text-left p-2">Název</th>
                          <th className="text-left p-2">Marketing</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orphanedProducts.slice(0, 100).map((p) => (
                          <tr key={p._id} className="border-t">
                            <td className="p-2 font-mono text-xs">{p.externalId}</td>
                            <td className="p-2 truncate max-w-xs">{p.name}</td>
                            <td className="p-2">
                              {p.hasMarketingData ? (
                                <span className="text-amber-600">⚠️ Ano</span>
                              ) : (
                                <span className="text-muted-foreground">Ne</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {orphanedProducts.length > 100 && (
                          <tr className="border-t">
                            <td colSpan={3} className="p-2 text-center text-muted-foreground">
                              ... a dalších {orphanedProducts.length - 100} produktů
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {deleteResult && (
              <div className={`p-4 rounded-lg ${
                deleteResult.startsWith("Chyba") 
                  ? "bg-red-50 border border-red-200 text-red-800"
                  : "bg-green-50 border border-green-200 text-green-800"
              }`}>
                {deleteResult}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feed Format Info */}
        <Card>
          <CardHeader>
            <CardTitle>Formát feedu</CardTitle>
            <CardDescription>
              Podporovaný formát XML feedu (LuigisBox)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-lg p-4 font-mono text-xs overflow-x-auto">
              <pre>{`<item>
  <title>Název produktu</title>
  <description>Popis...</description>
  <image_link_l>https://...</image_link_l>
  <price_level_1>99 Kč</price_level_1>
  <brand>Značka</brand>
  <ean>1234567890123</ean>
  <url>https://...</url>
  <product_code_2>SKU123</product_code_2>  ← Klíč pro párování
  <category primary="true">Čaje | Sypané čaje</category>
</item>`}</pre>
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              <p><strong>Klíčová pole:</strong></p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><code>product_code_2</code> - SKU pro párování produktů</li>
                <li><code>category primary="true"</code> - hlavní kategorie (rozděleno podle |)</li>
                <li><code>price_level_1</code> - maloobchodní cena</li>
                <li><code>image_link_l</code> - velký obrázek</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
