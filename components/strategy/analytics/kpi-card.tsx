import { cn } from "@/lib/utils";

export type KpiTone = "positive" | "negative" | "neutral";

const toneStyles: Record<
  KpiTone,
  { border: string; value: string; label: string }
> = {
  positive: {
    border: "border-emerald-500/25 shadow-emerald-500/5",
    value: "text-emerald-400",
    label: "text-emerald-500/80",
  },
  negative: {
    border: "border-rose-500/25 shadow-rose-500/5",
    value: "text-rose-400",
    label: "text-rose-500/80",
  },
  neutral: {
    border: "border-amber-500/25 shadow-amber-500/5",
    value: "text-amber-400",
    label: "text-amber-500/80",
  },
};

type KpiCardProps = {
  label: string;
  value: string;
  tone: KpiTone;
  className?: string;
};

export function KpiCard({ label, value, tone, className }: KpiCardProps) {
  const s = toneStyles[tone];
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card/80 p-6 shadow-lg backdrop-blur-sm",
        s.border,
        className
      )}
    >
      <p className={cn("font-mono text-xs font-medium uppercase tracking-wide", s.label)}>
        {label}
      </p>
      <p className={cn("mt-2 font-mono text-3xl font-semibold tabular-nums tracking-tight", s.value)}>
        {value}
      </p>
    </div>
  );
}
