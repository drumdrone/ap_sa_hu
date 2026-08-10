"use client";

import { useEffect, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export type FaqRichItem = { question: string; answerHtml: string };

type Uploader = (file: File) => Promise<string | null>;

type AnswerEditorProps = {
  html: string;
  onChange: (html: string) => void;
  uploadImage: Uploader;
  placeholder?: string;
};

function AnswerEditor({ html, onChange, uploadImage, placeholder }: AnswerEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
    ],
    content: html || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "tiptap-answer min-h-[120px] focus:outline-none text-sm text-foreground/85",
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (item.kind === "file" && item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (!file) continue;
            event.preventDefault();
            uploadImage(file).then((url) => {
              if (url) {
                view.dispatch(
                  view.state.tr.replaceSelectionWith(
                    view.state.schema.nodes.image.create({ src: url, alt: file.name })
                  )
                );
              }
            });
            return true;
          }
        }
        return false;
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;
        const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
        if (imageFiles.length === 0) return false;
        event.preventDefault();
        Promise.all(imageFiles.map(uploadImage)).then((urls) => {
          for (const url of urls) {
            if (!url) continue;
            view.dispatch(
              view.state.tr.replaceSelectionWith(
                view.state.schema.nodes.image.create({ src: url })
              )
            );
          }
        });
        return true;
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Sync incoming html on change of the underlying item (e.g. after add/remove).
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== (html || "<p></p>")) {
      editor.commands.setContent(html || "", { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  if (!editor) {
    return (
      <div className="min-h-[120px] rounded-md border border-input bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
        Načítám editor…
      </div>
    );
  }

  return (
    <div className="rounded-md border border-input bg-white">
      <Toolbar editor={editor} onInsertImage={uploadImage} />
      <div className="px-3 py-2">
        <EditorContent editor={editor} />
        {editor.isEmpty && placeholder && (
          <p className="pointer-events-none -mt-[1.15rem] text-sm text-muted-foreground/60">{placeholder}</p>
        )}
      </div>
    </div>
  );
}

function Toolbar({ editor, onInsertImage }: { editor: Editor; onInsertImage: Uploader }) {
  const btn = "px-2 py-1 rounded text-xs font-medium hover:bg-muted transition-colors";
  const active = "bg-muted text-foreground";
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-input px-2 py-1.5 bg-muted/30">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`${btn} ${editor.isActive("bold") ? active : "text-muted-foreground"}`}
        aria-label="Tučně"
        title="Tučně (Ctrl+B)"
      >
        <strong>B</strong>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`${btn} ${editor.isActive("italic") ? active : "text-muted-foreground"}`}
        aria-label="Kurzíva"
        title="Kurzíva (Ctrl+I)"
      >
        <em>I</em>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`${btn} ${editor.isActive("bulletList") ? active : "text-muted-foreground"}`}
        title="Odrážky"
      >
        • Seznam
      </button>
      <div className="mx-1 h-4 w-px bg-border" />
      <button
        type="button"
        onClick={() => {
          const prev = editor.getAttributes("link").href as string | undefined;
          const url = window.prompt("URL odkazu:", prev ?? "https://");
          if (url === null) return;
          if (url === "") {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            return;
          }
          editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
        }}
        className={`${btn} ${editor.isActive("link") ? active : "text-muted-foreground"}`}
        title="Odkaz"
      >
        🔗 Odkaz
      </button>
      <label className={`${btn} cursor-pointer text-muted-foreground`} title="Vložit obrázek (nebo Ctrl+V)">
        🖼 Obrázek
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            const url = await onInsertImage(file);
            if (url) {
              editor.chain().focus().setImage({ src: url, alt: file.name }).run();
            }
          }}
        />
      </label>
      <div className="ml-auto text-[10px] text-muted-foreground/70 pr-1">
        Ctrl+V pro vložení obrázku
      </div>
    </div>
  );
}

type FaqEditorProps = {
  productId: Id<"products">;
  initialItems: FaqRichItem[];
  isSaving: boolean;
  onSave: (items: FaqRichItem[]) => void | Promise<void>;
  onCancel: () => void;
};

export function FaqEditor({ productId: _productId, initialItems, isSaving, onSave, onCancel }: FaqEditorProps) {
  const [items, setItems] = useState<FaqRichItem[]>(
    initialItems.length > 0 ? initialItems : [{ question: "", answerHtml: "" }]
  );
  const [uploadingCount, setUploadingCount] = useState(0);

  const generateUploadUrl = useMutation(api.gallery.generateUploadUrl);
  const getStorageUrl = useMutation(api.gallery.getStorageUrl);

  const uploadImage: Uploader = async (file) => {
    setUploadingCount((n) => n + 1);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const { storageId } = await res.json();
      const url = await getStorageUrl({ storageId });
      return url ?? null;
    } catch (err) {
      console.error("FAQ image upload failed", err);
      return null;
    } finally {
      setUploadingCount((n) => n - 1);
    }
  };

  const updateQuestion = (idx: number, question: string) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, question } : it)));
  };
  const updateAnswer = (idx: number, answerHtml: string) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, answerHtml } : it)));
  };
  const addItem = () => setItems((prev) => [...prev, { question: "", answerHtml: "" }]);
  const removeItem = (idx: number) =>
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  const moveItem = (idx: number, dir: -1 | 1) => {
    setItems((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  };

  const handleSave = async () => {
    const cleaned = items
      .map((it) => ({
        question: it.question.trim(),
        answerHtml: it.answerHtml.trim(),
      }))
      .filter((it) => it.question || it.answerHtml);
    await onSave(cleaned);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        WYSIWYG editor. Podpora tučného textu, kurzívy, seznamů, odkazů a obrázků. Obrázek můžeš
        vložit pomocí <kbd className="rounded border px-1">Ctrl</kbd>+<kbd className="rounded border px-1">V</kbd>,
        přetažením nebo tlačítkem 🖼.
      </p>

      <div className="space-y-4">
        {items.map((item, idx) => (
          <div key={idx} className="rounded-lg border border-border bg-muted/10 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground w-6 shrink-0">#{idx + 1}</span>
              <input
                type="text"
                value={item.question}
                onChange={(e) => updateQuestion(idx, e.target.value)}
                placeholder="Otázka…"
                className="flex-1 rounded-md border border-input bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => moveItem(idx, -1)}
                  disabled={idx === 0}
                  className="px-1.5 py-1 rounded text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent"
                  title="Posunout nahoru"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(idx, 1)}
                  disabled={idx === items.length - 1}
                  className="px-1.5 py-1 rounded text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent"
                  title="Posunout dolů"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  disabled={items.length <= 1}
                  className="px-1.5 py-1 rounded text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent"
                  title="Smazat otázku"
                >
                  ✕
                </button>
              </div>
            </div>
            <AnswerEditor
              html={item.answerHtml}
              onChange={(html) => updateAnswer(idx, html)}
              uploadImage={uploadImage}
              placeholder="Odpověď…"
            />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={addItem}
          className="px-3 py-2 rounded-lg text-sm font-medium border border-dashed border-border text-muted-foreground hover:bg-muted"
        >
          + Přidat otázku
        </button>
        <div className="flex-1" />
        {uploadingCount > 0 && (
          <span className="text-xs text-muted-foreground">Nahrávám {uploadingCount} obrázek…</span>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted"
          disabled={isSaving}
        >
          Zrušit
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || uploadingCount > 0}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
        >
          {isSaving ? "Ukládám…" : "Uložit"}
        </button>
      </div>
    </div>
  );
}
