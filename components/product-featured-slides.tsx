"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";

interface ProductFeaturedSlidesProps {
  productId: Id<"products">;
  productName: string;
  productImage?: string;
}

const formatDate = (ts: number) =>
  new Date(ts).toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export function ProductFeaturedSlides({
  productId,
  productName,
  productImage,
}: ProductFeaturedSlidesProps) {
  const slides = useQuery(api.featuredSlides.listByProduct, { productId });
  const createSlide = useMutation(api.featuredSlides.create);
  const removeSlide = useMutation(api.featuredSlides.remove);
  const generateUploadUrl = useMutation(api.featuredSlides.generateUploadUrl);

  type Badge = "novinka" | "redesign";
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [badge, setBadge] = useState<Badge>("novinka");

  const resetForm = () => {
    setTitle("");
    setDate(new Date());
    setImageFile(null);
    setImagePreview(null);
    setBadge("novinka");
  };

  const badgeLabel = (b: Badge) => (b === "redesign" ? "Redesign" : "Novinka");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      let imageStorageId: Id<"_storage"> | undefined;

      if (imageFile) {
        const uploadUrl = await generateUploadUrl();
        const uploadRes = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": imageFile.type },
          body: imageFile,
        });
        if (!uploadRes.ok) throw new Error("Nahrání obrázku selhalo");
        const { storageId } = (await uploadRes.json()) as {
          storageId: Id<"_storage">;
        };
        imageStorageId = storageId;
      }

      await createSlide({
        productId,
        title: title.trim(),
        date: date.getTime(),
        imageStorageId,
        imageUrl: !imageStorageId ? productImage : undefined,
        badge,
      });

      resetForm();
      setOpen(false);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Nepodařilo se uložit slide");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (id: Id<"featuredSlides">) => {
    if (!confirm("Smazat tento slide z dashboardu?")) return;
    await removeSlide({ id });
  };

  const existing = slides ?? [];

  return (
    <div className="w-full rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center bg-blue-500 text-white flex-shrink-0">
            <span className="text-xl sm:text-2xl">📰</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground">Novinka na dashboardu</p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Přidat tento produkt do slideru nahoře na hlavní stránce
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setTitle(productName);
            setOpen(true);
          }}
          size="sm"
          className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white"
        >
          + Přidat do slideru
        </Button>
      </div>

      {existing.length > 0 && (
        <div className="mt-3 space-y-2">
          {existing.map((slide) => (
            <div
              key={slide._id}
              className="flex items-center gap-3 bg-white rounded-lg border border-blue-100 p-2"
            >
              <div className="w-14 h-14 rounded-md overflow-hidden bg-muted flex-shrink-0">
                {slide.imageResolvedUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={slide.imageResolvedUrl}
                    alt={slide.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl">
                    📰
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide text-white ${
                      (slide.badge ?? "novinka") === "redesign"
                        ? "bg-orange-500"
                        : "bg-blue-500"
                    }`}
                  >
                    {(slide.badge ?? "novinka") === "redesign"
                      ? "Redesign"
                      : "Novinka"}
                  </span>
                  <p className="text-sm font-medium text-foreground truncate">
                    {slide.title}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDate(slide.date)}
                </p>
              </div>
              <button
                onClick={() => handleRemove(slide._id)}
                className="text-muted-foreground hover:text-red-600 p-1"
                title="Smazat slide"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Přidat novinku do slideru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Stav</Label>
              <div className="mt-1 flex gap-2">
                {(["novinka", "redesign"] as const).map((b) => {
                  const active = badge === b;
                  const activeColor =
                    b === "redesign" ? "bg-orange-500" : "bg-blue-500";
                  return (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBadge(b)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border transition-colors ${
                        active
                          ? `${activeColor} text-white border-transparent`
                          : "bg-white text-foreground border-input hover:bg-muted"
                      }`}
                    >
                      {badgeLabel(b)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label htmlFor="slide-title">Název produktu</Label>
              <Input
                id="slide-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="např. Harmonie – nová příchuť"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Prefix „{badgeLabel(badge)}: " není potřeba – zobrazí se jako
                badge na kartě.
              </p>
            </div>

            <div>
              <Label>Datum (podle něj se řadí sestupně)</Label>
              <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal mt-1"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formatDate(date.getTime())}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => {
                      if (d) setDate(d);
                      setDatePopoverOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="slide-image">Obrázek (volitelně)</Label>
              <Input
                id="slide-image"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Pokud nenahrajete obrázek, použije se hlavní obrázek produktu.
              </p>
              {(imagePreview || productImage) && (
                <div className="mt-2 aspect-[16/9] rounded-lg overflow-hidden bg-muted border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview ?? productImage ?? ""}
                    alt="Náhled"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Zrušit
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!title.trim() || submitting}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {submitting ? "Ukládám…" : "Přidat do slideru"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
