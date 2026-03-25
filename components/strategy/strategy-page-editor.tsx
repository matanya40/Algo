"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { EditorContent, useEditor } from "@tiptap/react";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import type { JSONContent } from "@tiptap/core";
import { toast } from "sonner";
import {
  ensureStrategyPage,
  saveStrategyPage,
  uploadStrategyPageAsset,
  deleteStrategyPageAsset,
} from "@/app/actions/strategy-page-actions";
import { EMPTY_STRATEGY_PAGE_DOC } from "@/lib/strategy-page-doc";
import { STRATEGY_FILE_INPUT_ACCEPT } from "@/lib/strategy-upload-mime";
import type { StrategyPageAssetRow, StrategyPageRow } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Paperclip,
  Redo2,
  Save,
  Strikethrough,
  Trash2,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";

function asDoc(content: unknown): JSONContent {
  if (
    content &&
    typeof content === "object" &&
    "type" in content &&
    (content as JSONContent).type === "doc"
  ) {
    return content as JSONContent;
  }
  return EMPTY_STRATEGY_PAGE_DOC;
}

export function StrategyPageEditor({
  strategyId,
  initialPage,
  initialAssets,
}: {
  strategyId: string;
  initialPage: StrategyPageRow | null;
  initialAssets: StrategyPageAssetRow[];
}) {
  const router = useRouter();
  const [pageId, setPageId] = React.useState<string | null>(initialPage?.id ?? null);
  const [title, setTitle] = React.useState(
    initialPage?.title?.trim() || "Strategy page"
  );
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      Image.configure({
        HTMLAttributes: {
          class: "max-h-[min(480px,70vh)] max-w-full rounded-md border border-border",
        },
      }),
      Placeholder.configure({
        placeholder:
          "Documentation, screenshots, context, and guidelines live here — separate from structured metrics.",
      }),
    ],
    content: asDoc(initialPage?.content_json),
    editorProps: {
      attributes: {
        class: "focus:outline-none",
      },
    },
  });

  const handleUploadImageFile = React.useCallback(
    async (file: File) => {
      const pid = pageId ?? (await ensureStrategyPage(strategyId)).id;
      if (!pageId) setPageId(pid);
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const { url } = await uploadStrategyPageAsset(strategyId, pid, fd);
        const inlineUrl = `${url}?view=1`;
        editor?.chain().focus().setImage({ src: inlineUrl }).run();
        router.refresh();
        toast.success("Image added");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [strategyId, pageId, editor, router]
  );

  const handleUploadAttachment = React.useCallback(
    async (file: File) => {
      const pid = pageId ?? (await ensureStrategyPage(strategyId)).id;
      if (!pageId) setPageId(pid);
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const { url } = await uploadStrategyPageAsset(strategyId, pid, fd);
        if (file.type.startsWith("image/")) {
          const inlineUrl = `${url}?view=1`;
          editor?.chain().focus().setImage({ src: inlineUrl }).run();
        }
        router.refresh();
        toast.success("File uploaded");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [strategyId, pageId, editor, router]
  );

  React.useEffect(() => {
    if (initialPage?.id) setPageId(initialPage.id);
  }, [initialPage?.id]);

  React.useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom as HTMLElement;
    const onPaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            event.preventDefault();
            void handleUploadImageFile(file);
            break;
          }
        }
      }
    };
    dom.addEventListener("paste", onPaste);
    return () => dom.removeEventListener("paste", onPaste);
  }, [editor, handleUploadImageFile]);

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) void handleUploadImageFile(f);
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    e.target.value = "";
    if (!list?.length) return;
    for (const f of Array.from(list)) void handleUploadAttachment(f);
  }

  function onDropZoneDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files ?? []);
    if (!files.length) return;
    for (const f of files) void handleUploadAttachment(f);
  }

  async function onSave() {
    if (!editor) return;
    setSaving(true);
    try {
      await saveStrategyPage(strategyId, title, editor.getJSON());
      toast.success("Documentation saved");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function setLink() {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  async function onDeleteAsset(assetId: string) {
    try {
      await deleteStrategyPageAsset(strategyId, assetId);
      toast.success("Removed");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Remove failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2 sm:max-w-md">
          <Label htmlFor="strategy-page-title">Page title</Label>
          <Input
            id="strategy-page-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Strategy page"
          />
        </div>
        <Button
          type="button"
          onClick={() => void onSave()}
          disabled={saving || !editor}
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving…" : "Save documentation"}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-normal text-muted-foreground">
            Editor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {editor ? (
            <div className="flex flex-wrap gap-1 rounded-md border border-border bg-muted/40 p-1">
              <ToolbarIcon
                label="Bold"
                active={editor.isActive("bold")}
                onClick={() => editor.chain().focus().toggleBold().run()}
              >
                <Bold className="h-4 w-4" />
              </ToolbarIcon>
              <ToolbarIcon
                label="Italic"
                active={editor.isActive("italic")}
                onClick={() => editor.chain().focus().toggleItalic().run()}
              >
                <Italic className="h-4 w-4" />
              </ToolbarIcon>
              <ToolbarIcon
                label="Strike"
                active={editor.isActive("strike")}
                onClick={() => editor.chain().focus().toggleStrike().run()}
              >
                <Strikethrough className="h-4 w-4" />
              </ToolbarIcon>
              <Separator orientation="vertical" className="mx-1 h-7" />
              <ToolbarIcon
                label="Heading 2"
                active={editor.isActive("heading", { level: 2 })}
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 2 }).run()
                }
              >
                <Heading2 className="h-4 w-4" />
              </ToolbarIcon>
              <ToolbarIcon
                label="Heading 3"
                active={editor.isActive("heading", { level: 3 })}
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 3 }).run()
                }
              >
                <Heading3 className="h-4 w-4" />
              </ToolbarIcon>
              <Separator orientation="vertical" className="mx-1 h-7" />
              <ToolbarIcon
                label="Bullet list"
                active={editor.isActive("bulletList")}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
              >
                <List className="h-4 w-4" />
              </ToolbarIcon>
              <ToolbarIcon
                label="Ordered list"
                active={editor.isActive("orderedList")}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
              >
                <ListOrdered className="h-4 w-4" />
              </ToolbarIcon>
              <Separator orientation="vertical" className="mx-1 h-7" />
              <ToolbarIcon label="Link" onClick={setLink}>
                <Link2 className="h-4 w-4" />
              </ToolbarIcon>
              <ToolbarIcon
                label="Image"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploading}
              >
                <ImagePlus className="h-4 w-4" />
              </ToolbarIcon>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPickImage}
              />
              <ToolbarIcon
                label="Attach file"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Paperclip className="h-4 w-4" />
              </ToolbarIcon>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                accept={STRATEGY_FILE_INPUT_ACCEPT}
                onChange={onPickFile}
              />
              <Separator orientation="vertical" className="mx-1 h-7" />
              <ToolbarIcon
                label="Undo"
                onClick={() => editor.chain().focus().undo().run()}
              >
                <Undo2 className="h-4 w-4" />
              </ToolbarIcon>
              <ToolbarIcon
                label="Redo"
                onClick={() => editor.chain().focus().redo().run()}
              >
                <Redo2 className="h-4 w-4" />
              </ToolbarIcon>
            </div>
          ) : null}

          <div
            className={cn(
              "strategy-page-editor rounded-md border border-border bg-background",
              uploading && "pointer-events-none opacity-70"
            )}
          >
            {editor ? <EditorContent editor={editor} /> : null}
          </div>

          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={onDropZoneDrop}
            className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground transition hover:bg-muted/40"
            onClick={() => fileInputRef.current?.click()}
          >
            <p className="font-medium text-foreground">Drop files here</p>
            <p className="mt-1 text-xs">
              Images are inserted into the page; other files appear as attachments below.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Attachments</CardTitle>
        </CardHeader>
        <CardContent>
          {initialAssets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No files yet. Use the toolbar, paste a screenshot, or drop files above.
            </p>
          ) : (
            <ul className="space-y-2">
              {initialAssets.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface/50 px-3 py-2 font-mono text-xs"
                >
                  <a
                    href={`/api/strategy-page-asset/${strategyId}/${a.id}`}
                    className="min-w-0 truncate text-primary underline-offset-2 hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {a.file_name}
                  </a>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {a.type}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => void onDeleteAsset(a.id)}
                    aria-label={`Remove ${a.file_name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

    </div>
  );
}

function ToolbarIcon({
  children,
  label,
  onClick,
  active,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant={active ? "secondary" : "ghost"}
      className="h-8 w-8"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {children}
    </Button>
  );
}
