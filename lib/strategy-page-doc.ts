import type { JSONContent } from "@tiptap/core";

/** Default empty Tiptap document. */
export const EMPTY_STRATEGY_PAGE_DOC: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};
