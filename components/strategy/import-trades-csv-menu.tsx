"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { importTradesCsv } from "@/app/actions/trade-import-actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileSpreadsheet, Loader2 } from "lucide-react";

type Props = {
  strategyId: string;
  /** Narrow trigger for table cells */
  compact?: boolean;
};

export function ImportTradesCsvMenu({ strategyId, compact }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceNextRef = useRef(false);
  const [pending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);

  const runImport = useCallback(
    (file: File) => {
      startTransition(async () => {
        const replace = replaceNextRef.current;
        replaceNextRef.current = false;
        const fd = new FormData();
        fd.set("file", file);
        if (replace) fd.set("replace", "true");
        const res = await importTradesCsv(strategyId, fd);
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        toast.success(
          replace
            ? `Replaced with ${res.inserted} trade${res.inserted === 1 ? "" : "s"}`
            : `Imported ${res.inserted} trade${res.inserted === 1 ? "" : "s"}`
        );
        router.refresh();
      });
    },
    [router, strategyId]
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      const lower = file.name.toLowerCase();
      if (!lower.endsWith(".csv") && file.type !== "text/csv") {
        toast.error("Please choose a .csv file.");
        return;
      }
      runImport(file);
    },
    [runImport]
  );

  function openPicker(replace: boolean) {
    replaceNextRef.current = replace;
    setMenuOpen(false);
    window.setTimeout(() => inputRef.current?.click(), 0);
  }

  return (
    <div className={compact ? "inline-flex" : "flex flex-col gap-1"}>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={onFileChange}
        disabled={pending}
      />
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant={compact ? "ghost" : "outline"}
            size={compact ? "sm" : "default"}
            className={compact ? "h-8 gap-1 px-2 font-mono text-xs" : "gap-2"}
            disabled={pending}
            title="Import trades from CSV (pnl column; optional date)"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />
            )}
            {compact ? "CSV" : "Import trades"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            onSelect={(ev) => {
              ev.preventDefault();
              openPicker(false);
            }}
          >
            Append from CSV…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={(ev) => {
              ev.preventDefault();
              openPicker(true);
            }}
          >
            Replace all trades (CSV)…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {!compact ? (
        <p className="text-[11px] leading-snug text-muted-foreground">
          Columns: <span className="font-mono">profit</span> /{" "}
          <span className="font-mono">pnl</span>
          , optional <span className="font-mono">date</span> or{" "}
          <span className="font-mono">exit time</span>.
        </p>
      ) : null}
    </div>
  );
}
