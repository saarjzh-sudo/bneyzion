/**
 * RichTextEditor — עורך התוכן של שיעורי בני ציון (רמה 11).
 *
 * TipTap v3, HTML נטיבי (אותו HTML ש-LessonPage מציג דרך sanitizeHtml — בלי המרות מאבדות-מידע).
 * RTL מלא, כותרות H2-H4 בזהב כמו בעמוד השיעור, וגרירת קבצים לתוך העורך:
 *   תמונה  → עולה ל-Storage ומשתבצת בגוף המאמר בנקודת הסמן
 *   שמע / וידאו / PDF → עולים ל-Storage ומדווחים ל-onMediaUploaded כדי למלא את שדות השיעור
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import ImageExt from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold, Italic, Underline as UnderlineIcon, Heading2, Heading3, Heading4,
  List, ListOrdered, Quote, Link2, Link2Off, ImagePlus, Undo2, Redo2,
  Loader2, UploadCloud, Minus, Highlighter, RemoveFormatting,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export interface UploadedMedia {
  kind: "audio" | "video" | "pdf";
  url: string;
  name: string;
}

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  /** נקרא כשגוררים לעורך קובץ שמע/וידאו/PDF — כדי שהטופס ימלא את שדות השיעור */
  onMediaUploaded?: (media: UploadedMedia) => void;
  placeholder?: string;
  minHeight?: number;
  className?: string;
}

// ── "טקסט מודגש" — פסקת הדגשה בגופן המיוחד של האתר הישן (יואב 20.7) ──
// שומר/קורא את class על פסקאות, כך שהדגשות מיובאות (<p class="mudgash">)
// שורדות עריכה, וכפתור-הטולבר מדליק/מכבה את אותו class בדיוק.
const ParagraphClass = Extension.create({
  name: "paragraphClass",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph"],
        attributes: {
          class: {
            default: null,
            parseHTML: (el: HTMLElement) => el.getAttribute("class"),
            renderHTML: (attrs: { class?: string | null }) =>
              attrs.class ? { class: attrs.class } : {},
          },
        },
      },
    ];
  },
});

// ── Storage upload (אותו bucket ואותו דפוס כמו אשף ההעלאה) ──────────
const uploadToStorage = async (file: File, folder: string): Promise<string> => {
  const ext = file.name.split(".").pop();
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from("lesson-files").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("lesson-files").getPublicUrl(path);
  return data.publicUrl;
};

const classifyFile = (file: File): "image" | "audio" | "video" | "pdf" | null => {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("video/")) return "video";
  if (file.type === "application/pdf" || /\.(pdf|docx?)$/i.test(file.name)) return "pdf";
  return null;
};

// ── toolbar button ───────────────────────────────────────────────────
const TB = ({ onClick, active, disabled, title, children }: {
  onClick: () => void; active?: boolean; disabled?: boolean; title: string;
  children: React.ReactNode;
}) => (
  <Button
    type="button"
    variant="ghost"
    size="icon"
    title={title}
    disabled={disabled}
    onMouseDown={e => e.preventDefault() /* לא לאבד פוקוס מהעורך */}
    onClick={onClick}
    className={cn(
      "h-8 w-8 rounded-md",
      active && "bg-amber-100 text-amber-900 hover:bg-amber-100",
    )}
  >
    {children}
  </Button>
);

export function RichTextEditor({
  value,
  onChange,
  onMediaUploaded,
  placeholder = "כתבו כאן את תוכן המאמר… אפשר גם לגרור לכאן קובץ שמע, וידאו, PDF או תמונה",
  minHeight = 260,
  className,
}: RichTextEditorProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["right", "center", "left"],
        defaultAlignment: "right",
      }),
      ImageExt.configure({ inline: false }),
      Placeholder.configure({ placeholder }),
      ParagraphClass,
    ],
    content: value || "",
    editorProps: {
      attributes: {
        dir: "rtl",
        class: "bz-rte-content focus:outline-none",
        style: `min-height:${minHeight}px`,
      },
      handleDrop: (_view, event) => {
        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
          event.preventDefault();
          void handleFiles(Array.from(files));
          return true;
        }
        return false;
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []);
        if (files.length > 0) {
          event.preventDefault();
          void handleFiles(files);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.isEmpty ? "" : editor.getHTML());
    },
  });

  // סנכרון ערך חיצוני (פתיחת שיעור אחר לעריכה באותו דיאלוג)
  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? "" : editor.getHTML();
    if ((value || "") !== current) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  const handleFiles = useCallback(async (files: File[]) => {
    if (!editor) return;
    setUploading(true);
    try {
      for (const file of files) {
        const kind = classifyFile(file);
        if (!kind) {
          toast({ title: `סוג קובץ לא נתמך: ${file.name}`, variant: "destructive" });
          continue;
        }
        if (kind === "image") {
          const url = await uploadToStorage(file, "content-images");
          editor.chain().focus().setImage({ src: url, alt: file.name }).run();
          toast({ title: "התמונה הועלתה ושובצה במאמר" });
        } else {
          const folder = kind === "audio" ? "audio" : kind === "video" ? "video" : "pdf";
          const url = await uploadToStorage(file, folder);
          if (onMediaUploaded) {
            onMediaUploaded({ kind, url, name: file.name });
            const label = kind === "audio" ? "השמע" : kind === "video" ? "הווידאו" : "הקובץ המצורף";
            toast({ title: `קובץ ${label} הועלה וחובר לשיעור`, description: file.name });
          } else {
            toast({ title: "הקובץ הועלה", description: url });
          }
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "שגיאה לא ידועה";
      toast({ title: "שגיאה בהעלאת קובץ", description: msg, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }, [editor, onMediaUploaded, toast]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("כתובת הקישור:", prev ?? "https://");
    if (url === null) return;
    if (url === "" || url === "https://") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div
      className={cn(
        // בלי overflow-hidden — הוא שובר position:sticky של סרגל-הכלים (יואב 21.7)
        "rounded-xl border bg-white transition-colors",
        dragging ? "border-amber-500 ring-2 ring-amber-200" : "border-border",
        className,
      )}
      onDragEnter={e => { e.preventDefault(); dragDepth.current += 1; setDragging(true); }}
      onDragOver={e => e.preventDefault()}
      onDragLeave={e => {
        e.preventDefault();
        dragDepth.current -= 1;
        if (dragDepth.current <= 0) { dragDepth.current = 0; setDragging(false); }
      }}
      onDrop={e => {
        e.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        const files = Array.from(e.dataTransfer.files ?? []);
        if (files.length > 0) void handleFiles(files);
      }}
    >
      {/* ── toolbar — דביק: נשאר גלוי גם בגלילה בתוך טקסט ארוך (יואב 21.7) ── */}
      <div
        className="sticky top-0 z-20 flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border rounded-t-[inherit]"
        style={{ background: "linear-gradient(hsl(var(--muted) / 0.4), hsl(var(--muted) / 0.4)), #fff" }}
        dir="rtl"
      >
        <TB title="ביטול" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
          <Undo2 className="h-4 w-4" />
        </TB>
        <TB title="חזרה" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
          <Redo2 className="h-4 w-4" />
        </TB>
        <Separator orientation="vertical" className="h-6 mx-1" />
        <TB title="כותרת ראשית" active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="h-4 w-4" />
        </TB>
        <TB title="כותרת משנה" active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="h-4 w-4" />
        </TB>
        <TB title="כותרת קטנה" active={editor.isActive("heading", { level: 4 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}>
          <Heading4 className="h-4 w-4" />
        </TB>
        <Separator orientation="vertical" className="h-6 mx-1" />
        <TB title="מודגש" active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </TB>
        <TB title="נטוי" active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </TB>
        <TB title="קו תחתון" active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="h-4 w-4" />
        </TB>
        <TB title="טקסט מודגש — גופן ההדגשה של האתר" active={editor.isActive("paragraph", { class: "mudgash" })}
          onClick={() => {
            const on = editor.isActive("paragraph", { class: "mudgash" });
            editor.chain().focus().updateAttributes("paragraph", { class: on ? null : "mudgash" }).run();
          }}>
          <Highlighter className="h-4 w-4" />
        </TB>
        {/* יואב 21.7: החזרת כותרת/הדגשה/מודגש לטקסט רגיל ופשוט בלחיצה אחת */}
        <TB title="טקסט רגיל — ניקוי כל העיצוב"
          onClick={() => {
            editor.chain().focus()
              .clearNodes()
              .unsetAllMarks()
              .updateAttributes("paragraph", { class: null })
              .run();
          }}>
          <RemoveFormatting className="h-4 w-4" />
        </TB>
        <Separator orientation="vertical" className="h-6 mx-1" />
        <TB title="רשימה" active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="h-4 w-4" />
        </TB>
        <TB title="רשימה ממוספרת" active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-4 w-4" />
        </TB>
        <TB title="ציטוט" active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote className="h-4 w-4" />
        </TB>
        <TB title="קו מפריד" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="h-4 w-4" />
        </TB>
        <Separator orientation="vertical" className="h-6 mx-1" />
        <TB title="קישור" active={editor.isActive("link")} onClick={setLink}>
          <Link2 className="h-4 w-4" />
        </TB>
        {editor.isActive("link") && (
          <TB title="הסרת קישור" onClick={() => editor.chain().focus().unsetLink().run()}>
            <Link2Off className="h-4 w-4" />
          </TB>
        )}
        <TB title="הוספת תמונה" onClick={() => imageInputRef.current?.click()}>
          <ImagePlus className="h-4 w-4" />
        </TB>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*,audio/*,video/*,.pdf,.doc,.docx"
          multiple
          className="hidden"
          onChange={e => {
            const files = Array.from(e.target.files ?? []);
            if (files.length > 0) void handleFiles(files);
            e.target.value = "";
          }}
        />
        {uploading && (
          <span className="flex items-center gap-1.5 text-xs text-amber-700 mr-auto pl-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            מעלה קובץ…
          </span>
        )}
      </div>

      {/* ── editing surface ── */}
      <div className="relative overflow-hidden rounded-b-[inherit]">
        <EditorContent editor={editor} />
        {dragging && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-amber-50/90 pointer-events-none">
            <UploadCloud className="h-8 w-8 text-amber-600" />
            <p className="font-display text-sm text-amber-800">
              שחררו כאן — תמונה תשתבץ במאמר, שמע/וידאו/PDF יחוברו לשיעור
            </p>
          </div>
        )}
      </div>

      {/* עיצוב גוף העריכה — מראה זהה לעמוד השיעור הציבורי */}
      <style>{`
        .bz-rte-content {
          padding: 1rem 1.25rem 1.5rem;
          font-size: 1rem;
          line-height: 1.85;
          color: hsl(var(--foreground));
        }
        .bz-rte-content p { margin: 0.5em 0; }
        .bz-rte-content h2 {
          font-size: 1.5rem; font-weight: 700; color: hsl(var(--primary));
          margin: 1.25em 0 0.4em;
        }
        .bz-rte-content h3 {
          font-size: 1.25rem; font-weight: 700; color: hsl(var(--primary));
          margin: 1.1em 0 0.35em;
        }
        .bz-rte-content h4 {
          font-size: 1.1rem; font-weight: 700;
          margin: 1em 0 0.3em;
        }
        .bz-rte-content strong { font-weight: 700; }
        .bz-rte-content blockquote {
          border-inline-start: 3px solid #C4A265;
          padding-inline-start: 1rem;
          margin: 0.75em 0;
          color: hsl(var(--muted-foreground));
        }
        .bz-rte-content ul { list-style: disc; padding-inline-start: 1.5rem; margin: 0.5em 0; }
        .bz-rte-content ol { list-style: decimal; padding-inline-start: 1.5rem; margin: 0.5em 0; }
        .bz-rte-content a { color: hsl(var(--primary)); text-decoration: underline; }
        .bz-rte-content img {
          max-width: 100%; border-radius: 0.75rem; margin: 0.75em 0;
        }
        .bz-rte-content hr {
          border: none; border-top: 1px solid #C4A26555; margin: 1.25em 0;
        }
        .bz-rte-content p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          float: right;
          height: 0;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}

export default RichTextEditor;
