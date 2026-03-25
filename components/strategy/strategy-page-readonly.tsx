"use client";

import * as React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import type { JSONContent } from "@tiptap/core";
import { EMPTY_STRATEGY_PAGE_DOC } from "@/lib/strategy-page-doc";
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

export function StrategyPageReadonly({
  contentJson,
  className,
}: {
  contentJson: unknown;
  className?: string;
}) {
  const doc = React.useMemo(() => asDoc(contentJson), [contentJson]);

  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: true,
        autolink: true,
        HTMLAttributes: { class: "text-primary underline underline-offset-2" },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "max-h-[min(480px,70vh)] max-w-full rounded-md border border-border",
        },
      }),
    ],
    content: doc,
  });

  React.useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(doc);
  }, [editor, doc]);

  if (!editor) {
    return (
      <div className="rounded-md border border-border bg-muted/30 px-4 py-8 text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className={cn("strategy-page-editor readonly", className)}>
      <EditorContent editor={editor} />
    </div>
  );
}
