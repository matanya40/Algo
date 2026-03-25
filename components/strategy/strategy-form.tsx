"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  createStrategy,
  updateStrategy,
  type MetricsFormState,
  type StrategyFormState,
} from "@/app/actions/strategy-actions";
import type {
  StrategyDirection,
  StrategyMetricsRow,
  StrategyRow,
  StrategyStatus,
} from "@/lib/types";
import { STRATEGY_FILE_INPUT_ACCEPT } from "@/lib/strategy-upload-mime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { FileIcon, ImageIcon, Trash2 } from "lucide-react";

const STATUSES: StrategyStatus[] = [
  "idea",
  "research",
  "testing",
  "live",
  "archived",
];

const DIRECTIONS: (StrategyDirection | "none")[] = [
  "none",
  "long",
  "short",
  "both",
];

const FILE_INPUT_ACCEPT = STRATEGY_FILE_INPUT_ACCEPT;

function pendingFileIcon(file: File) {
  return file.type.startsWith("image/") ? ImageIcon : FileIcon;
}

function emptyStrategy(): StrategyFormState {
  return {
    name: "",
    description: "",
    status: "idea",
    market: "",
    instrument: "",
    timeframe: "",
    session: "",
    direction: "",
    concept: "",
    notes: "",
    installationGuide: "",
  };
}

function emptyMetrics(): MetricsFormState {
  return {
    winRate: "",
    totalTrades: "",
    winningTrades: "",
    losingTrades: "",
    netProfit: "",
    maxDrawdown: "",
    profitFactor: "",
    averageTrade: "",
  };
}

function fromRow(
  s: StrategyRow,
  m: StrategyMetricsRow | null
): { form: StrategyFormState; metrics: MetricsFormState } {
  const form: StrategyFormState = {
    name: s.name,
    description: s.description ?? "",
    status: s.status,
    market: s.market ?? "",
    instrument: s.instrument ?? "",
    timeframe: s.timeframe ?? "",
    session: s.session ?? "",
    direction: (s.direction as StrategyDirection | null) ?? "",
    concept: s.concept ?? "",
    notes: s.notes ?? "",
    installationGuide: s.installation_guide ?? "",
  };
  const metrics: MetricsFormState = m
    ? {
        winRate: m.win_rate != null ? String(m.win_rate) : "",
        totalTrades: m.total_trades != null ? String(m.total_trades) : "",
        winningTrades: m.winning_trades != null ? String(m.winning_trades) : "",
        losingTrades: m.losing_trades != null ? String(m.losing_trades) : "",
        netProfit: m.net_profit != null ? String(m.net_profit) : "",
        maxDrawdown: m.max_drawdown != null ? String(m.max_drawdown) : "",
        profitFactor: m.profit_factor != null ? String(m.profit_factor) : "",
        averageTrade: m.average_trade != null ? String(m.average_trade) : "",
      }
    : emptyMetrics();
  return { form, metrics };
}

export function StrategyForm({
  mode,
  strategyId,
  initialStrategy,
  initialMetrics,
}: {
  mode: "create" | "edit";
  strategyId?: string;
  initialStrategy?: StrategyRow;
  initialMetrics?: StrategyMetricsRow | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingFiles, setPendingFiles] = React.useState<File[]>([]);
  const initial = initialStrategy
    ? fromRow(initialStrategy, initialMetrics ?? null)
    : { form: emptyStrategy(), metrics: emptyMetrics() };

  function submit(form: StrategyFormState, metrics: MetricsFormState) {
    startTransition(async () => {
      try {
        if (mode === "create") {
          const filesFd = new FormData();
          for (const file of pendingFiles) filesFd.append("files", file);
          const res = await createStrategy(
            form,
            metrics,
            pendingFiles.length > 0 ? filesFd : undefined
          );
          if (res?.ok) {
            const expected = pendingFiles.length;
            const { uploaded, errors } = res;
            if (expected > 0 && uploaded === 0 && errors.length > 0) {
              toast.error(`Files not saved: ${errors[0]}`);
            } else if (expected > 0 && errors.length > 0) {
              toast.warning(
                `Strategy saved. ${uploaded}/${expected} file(s) uploaded. ${errors[0]}`
              );
            } else if (uploaded > 0) {
              toast.success(
                uploaded === 1
                  ? "Strategy created and file uploaded"
                  : `Strategy created and ${uploaded} files uploaded`
              );
            } else {
              toast.success("Strategy created");
            }
            setPendingFiles([]);
            router.push(`/strategies/${res.id}`);
            router.refresh();
          }
        } else if (strategyId) {
          await updateStrategy(strategyId, form, metrics);
          toast.success("Saved");
          router.push(`/strategies/${strategyId}`);
          router.refresh();
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Save failed");
      }
    });
  }

  function addPendingFiles(list: FileList | null) {
    if (!list?.length) return;
    setPendingFiles((prev) => [...prev, ...Array.from(list)]);
  }

  function removePendingFile(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <FormInner
      key={initialStrategy?.id ?? "new"}
      initialForm={initial.form}
      initialMetrics={initial.metrics}
      pending={pending}
      submitLabel={mode === "create" ? "Create strategy" : "Save changes"}
      onSubmit={submit}
      createAttachments={
        mode === "create"
          ? {
              files: pendingFiles,
              onAdd: addPendingFiles,
              onRemove: removePendingFile,
            }
          : undefined
      }
    />
  );
}

function FormInner({
  initialForm,
  initialMetrics,
  pending,
  submitLabel,
  onSubmit,
  createAttachments,
}: {
  initialForm: StrategyFormState;
  initialMetrics: MetricsFormState;
  pending: boolean;
  submitLabel: string;
  onSubmit: (f: StrategyFormState, m: MetricsFormState) => void;
  createAttachments?: {
    files: File[];
    onAdd: (list: FileList | null) => void;
    onRemove: (index: number) => void;
  };
}) {
  const [form, setForm] = React.useState(initialForm);
  const [metrics, setMetrics] = React.useState(initialMetrics);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <form
      className="mx-auto max-w-3xl space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        if (!form.name.trim()) {
          toast.error("Name is required");
          return;
        }
        onSubmit(form, metrics);
      }}
    >
      <section className="space-y-4 rounded-lg border border-border bg-card p-6">
        <h2 className="font-mono text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) =>
                setForm({ ...form, status: v as StrategyStatus })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Direction</Label>
            <Select
              value={form.direction === "" ? "none" : form.direction}
              onValueChange={(v) =>
                setForm({
                  ...form,
                  direction: v === "none" ? "" : (v as StrategyDirection),
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {DIRECTIONS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d === "none" ? "—" : d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="market">Market</Label>
            <Input
              id="market"
              value={form.market}
              onChange={(e) => setForm({ ...form, market: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instrument">Instrument</Label>
            <Input
              id="instrument"
              value={form.instrument}
              onChange={(e) => setForm({ ...form, instrument: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timeframe">Timeframe</Label>
            <Input
              id="timeframe"
              value={form.timeframe}
              onChange={(e) => setForm({ ...form, timeframe: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="session">Session</Label>
            <Input
              id="session"
              value={form.session}
              onChange={(e) => setForm({ ...form, session: e.target.value })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="concept">Concept</Label>
            <Textarea
              id="concept"
              value={form.concept}
              onChange={(e) => setForm({ ...form, concept: e.target.value })}
              rows={4}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={4}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="installationGuide">Installation guide</Label>
            <Textarea
              id="installationGuide"
              value={form.installationGuide}
              onChange={(e) =>
                setForm({ ...form, installationGuide: e.target.value })
              }
              rows={6}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-border bg-card p-6">
        <h2 className="font-mono text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Metrics
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricField
            label="Win rate (%)"
            value={metrics.winRate}
            onChange={(v) => setMetrics({ ...metrics, winRate: v })}
          />
          <MetricField
            label="Total trades"
            value={metrics.totalTrades}
            onChange={(v) => setMetrics({ ...metrics, totalTrades: v })}
          />
          <MetricField
            label="Winning trades"
            value={metrics.winningTrades}
            onChange={(v) => setMetrics({ ...metrics, winningTrades: v })}
          />
          <MetricField
            label="Losing trades"
            value={metrics.losingTrades}
            onChange={(v) => setMetrics({ ...metrics, losingTrades: v })}
          />
          <MetricField
            label="Net profit"
            value={metrics.netProfit}
            onChange={(v) => setMetrics({ ...metrics, netProfit: v })}
          />
          <MetricField
            label="Max drawdown"
            value={metrics.maxDrawdown}
            onChange={(v) => setMetrics({ ...metrics, maxDrawdown: v })}
          />
          <MetricField
            label="Profit factor"
            value={metrics.profitFactor}
            onChange={(v) => setMetrics({ ...metrics, profitFactor: v })}
          />
          <MetricField
            label="Average trade"
            value={metrics.averageTrade}
            onChange={(v) => setMetrics({ ...metrics, averageTrade: v })}
          />
        </div>
      </section>

      {createAttachments ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-base">Files &amp; screenshots</CardTitle>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                accept={FILE_INPUT_ACCEPT}
                onChange={(e) => {
                  createAttachments.onAdd(e.target.files);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={pending}
                onClick={() => fileInputRef.current?.click()}
              >
                Add files
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {createAttachments.files.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Optional — attach charts, exports, or PDFs. They upload when you
                create the strategy.
              </p>
            ) : (
              <ul className="space-y-2">
                {createAttachments.files.map((file, index) => {
                  const Icon = pendingFileIcon(file);
                  return (
                    <li
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface/50 px-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate font-mono text-xs">
                          {file.name}
                        </span>
                        <span className="hidden shrink-0 text-[10px] text-muted-foreground sm:inline">
                          {(file.size / 1024).toFixed(0)} KB
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        disabled={pending}
                        onClick={() => createAttachments.onRemove(index)}
                        aria-label={`Remove ${file.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="text-[10px] text-muted-foreground">
              Images, CSV, PDF, ZIP, Excel. Max 50MB per file.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Separator />

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending
            ? submitLabel === "Create strategy"
              ? createAttachments?.files.length
                ? "Creating & uploading…"
                : "Creating…"
              : "Saving…"
            : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function MetricField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="font-mono text-xs text-muted-foreground">{label}</Label>
      <Input
        className="font-mono"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="decimal"
      />
    </div>
  );
}
