import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ParamItem = {
  key?: string;
  label?: string;
  labelHe?: string;
  labelEn?: string;
  value?: string;
};

type ParamGroup = {
  id?: string;
  title?: string;
  titleHe?: string;
  titleEn?: string;
  items?: ParamItem[];
};

type UserGuideStep = {
  n?: number;
  title?: string;
  body?: string;
};

type UserGuide = {
  title?: string;
  intro?: string;
  steps?: UserGuideStep[];
  license?: {
    title?: string;
    steps?: string[];
    note?: string;
  };
};

type PerformanceMetricRow = { label?: string; value?: string };

type PerformanceSummary = {
  title?: string;
  period?: string;
  basis?: string;
  metrics?: PerformanceMetricRow[];
};

type CoreLogicRow = { en?: string; text?: string; he?: string };

type BacktestRow = {
  label?: string;
  instrument?: string;
  timeframe?: string;
  period?: string;
  periodExactEn?: string;
  runMode?: string;
  totalProfitUsd?: number;
  maxDrawdownUsd?: number;
  totalProfitExact?: string;
  maxDrawdownExact?: string;
  runReleaseVersion?: string;
  release?: string;
  riskPerTradeUsd?: number;
  takeProfitRatioLabel?: string;
  note?: string;
  noteHe?: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function groupTitle(g: ParamGroup): string {
  return g.titleEn ?? g.title ?? g.titleHe ?? g.id ?? "Group";
}

function itemLabel(it: ParamItem): string {
  return it.labelEn ?? it.label ?? it.labelHe ?? it.key ?? "—";
}

export function StrategyParametersSection({
  parametersJson,
}: {
  parametersJson: Record<string, unknown> | null | undefined;
}) {
  if (!parametersJson || Object.keys(parametersJson).length === 0) {
    return null;
  }

  const summary =
    (typeof parametersJson.summary === "string" ? parametersJson.summary : null) ??
    (typeof parametersJson.summaryEn === "string" ? parametersJson.summaryEn : null);
  const refUrl =
    typeof parametersJson.referenceUrl === "string" ? parametersJson.referenceUrl : null;

  const pageMeta = isRecord(parametersJson.pageMeta) ? parametersJson.pageMeta : null;
  const published =
    pageMeta && typeof pageMeta.published === "string" ? pageMeta.published : null;
  const updated =
    pageMeta && typeof pageMeta.updated === "string" ? pageMeta.updated : null;
  const chartNote =
    pageMeta && typeof pageMeta.noteOnCharts === "string" ? pageMeta.noteOnCharts : null;

  const methodology = Array.isArray(parametersJson.vendorMethodology)
    ? (parametersJson.vendorMethodology as string[])
    : [];

  const chartExample = isRecord(parametersJson.chartExampleMes1Exact)
    ? parametersJson.chartExampleMes1Exact
    : null;

  const performanceSummary = isRecord(parametersJson.performanceSummary)
    ? (parametersJson.performanceSummary as PerformanceSummary)
    : null;

  const userGuide = isRecord(parametersJson.userGuide)
    ? (parametersJson.userGuide as UserGuide)
    : null;

  const coreLogic = Array.isArray(parametersJson.coreLogic)
    ? (parametersJson.coreLogic as CoreLogicRow[])
    : [];

  const groups = Array.isArray(parametersJson.groups)
    ? (parametersJson.groups as ParamGroup[])
    : [];

  const backtests = Array.isArray(parametersJson.vendorBacktestsExamples)
    ? (parametersJson.vendorBacktestsExamples as BacktestRow[])
    : [];

  const disc =
    (typeof parametersJson.disclaimerEn === "string" ? parametersJson.disclaimerEn : null) ??
    (typeof parametersJson.disclaimer === "string" ? parametersJson.disclaimer : null);

  return (
    <section className="space-y-4">
      <h2 className="font-mono text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Parameter reference
      </h2>

      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p className="whitespace-pre-wrap">{summary}</p>
            {refUrl ? (
              <p>
                <a
                  href={refUrl}
                  className="font-mono text-xs text-primary underline-offset-4 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {refUrl}
                </a>
              </p>
            ) : null}
          </CardContent>
        </Card>
      )}

      {performanceSummary &&
        (performanceSummary.metrics?.length ?? 0) > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {performanceSummary.title ?? "Performance summary"}
              </CardTitle>
              {performanceSummary.period ? (
                <p className="font-mono text-xs text-muted-foreground">
                  {performanceSummary.period}
                </p>
              ) : null}
              {performanceSummary.basis ? (
                <p className="text-xs text-muted-foreground">
                  Basis: {performanceSummary.basis}
                </p>
              ) : null}
            </CardHeader>
            <CardContent>
              <dl className="grid gap-2 sm:grid-cols-2">
                {(performanceSummary.metrics ?? []).map((row, i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-0.5 rounded-md border border-border/50 bg-muted/15 px-3 py-2"
                  >
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {row.label}
                    </dt>
                    <dd className="font-mono text-sm text-foreground">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        )}

      {userGuide && (userGuide.title || (userGuide.steps && userGuide.steps.length > 0)) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {userGuide.title ?? "User guide"}
            </CardTitle>
            {userGuide.intro ? (
              <p className="text-sm text-muted-foreground">{userGuide.intro}</p>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal space-y-3 ps-5 text-sm text-muted-foreground">
              {(userGuide.steps ?? []).map((s, i) => (
                <li key={i} className="space-y-1">
                  {s.title ? (
                    <span className="font-medium text-foreground">{s.title}</span>
                  ) : null}
                  {s.body ? <p className="whitespace-pre-wrap leading-relaxed">{s.body}</p> : null}
                </li>
              ))}
            </ol>
            {userGuide.license ? (
              <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-3">
                <p className="font-medium text-foreground">
                  {userGuide.license.title ?? "License"}
                </p>
                <ol className="mt-2 list-decimal space-y-1 ps-5 text-sm text-muted-foreground">
                  {(userGuide.license.steps ?? []).map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ol>
                {userGuide.license.note ? (
                  <p className="mt-2 text-xs text-muted-foreground">{userGuide.license.note}</p>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {(published || updated || chartNote) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vendor page (source)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 font-mono text-xs text-muted-foreground">
            {published ? <p>Published: {published}</p> : null}
            {updated ? <p>Updated: {updated}</p> : null}
            {chartNote ? <p className="text-[11px] leading-relaxed">{chartNote}</p> : null}
          </CardContent>
        </Card>
      )}

      {methodology.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Backtest methodology (vendor)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 ps-5 text-xs text-muted-foreground">
              {methodology.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {chartExample && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {typeof chartExample.title === "string" ? chartExample.title : "Chart example"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 font-mono text-xs text-muted-foreground">
            {typeof chartExample.openingRange === "string" ? (
              <p>Opening range: {chartExample.openingRange}</p>
            ) : null}
            {typeof chartExample.entryLogic === "string" ? (
              <p>Entry: {chartExample.entryLogic}</p>
            ) : null}
            {typeof chartExample.stopLoss === "string" ? (
              <p>Stop loss: {chartExample.stopLoss}</p>
            ) : null}
            {typeof chartExample.takeProfit === "string" ? (
              <p>Take profit: {chartExample.takeProfit}</p>
            ) : null}
          </CardContent>
        </Card>
      )}

      {coreLogic.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Core logic</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 ps-5 text-sm text-muted-foreground">
              {coreLogic.map((row, i) => {
                const line =
                  typeof row.text === "string"
                    ? row.text
                    : typeof row.en === "string"
                      ? row.en
                      : typeof row.he === "string"
                        ? row.he
                        : null;
                if (!line) return null;
                return <li key={i}>{line}</li>;
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {groups.map((g) => (
        <Card key={g.id ?? groupTitle(g)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{groupTitle(g)}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              {(g.items ?? []).map((it, idx) => (
                <div
                  key={it.key ?? idx}
                  className="border-b border-border/50 pb-3 last:border-0 last:pb-0"
                >
                  <dt className="text-xs font-medium text-foreground">{itemLabel(it)}</dt>
                  {it.value ? (
                    <dd className="mt-1 font-mono text-xs text-muted-foreground">{it.value}</dd>
                  ) : null}
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      ))}

      {backtests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vendor backtest cards (exact figures)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {backtests.map((b, i) => (
              <div
                key={i}
                className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs"
              >
                <div className="font-medium text-foreground">{b.label}</div>
                <div className="mt-1 font-mono text-muted-foreground">
                  {[b.instrument, b.timeframe].filter(Boolean).join(" · ")}
                </div>
                {b.periodExactEn ? (
                  <div className="mt-1 font-mono text-muted-foreground">
                    Period: {b.periodExactEn}
                  </div>
                ) : b.period ? (
                  <div className="mt-1 font-mono text-muted-foreground">{b.period}</div>
                ) : null}
                {b.runMode ? (
                  <div className="mt-1 font-mono text-muted-foreground">Run mode: {b.runMode}</div>
                ) : null}
                {b.riskPerTradeUsd != null ? (
                  <div className="mt-1 font-mono text-muted-foreground">
                    Risk per trade: ${b.riskPerTradeUsd}
                  </div>
                ) : null}
                {b.takeProfitRatioLabel ? (
                  <div className="mt-1 font-mono text-muted-foreground">
                    {b.takeProfitRatioLabel}
                  </div>
                ) : null}
                <div className="mt-1 font-mono text-foreground">
                  Total profit:{" "}
                  {b.totalProfitExact ??
                    (b.totalProfitUsd != null ? `${b.totalProfitUsd} USD` : "—")}
                </div>
                <div className="font-mono text-foreground">
                  Max drawdown:{" "}
                  {b.maxDrawdownExact ??
                    (b.maxDrawdownUsd != null ? `${b.maxDrawdownUsd} USD` : "—")}
                </div>
                <div className="mt-1 font-mono text-muted-foreground">
                  Release: {b.runReleaseVersion ?? b.release ?? "—"}
                </div>
                {b.noteHe || b.note ? (
                  <p className="mt-1 text-muted-foreground">{b.note ?? b.noteHe}</p>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {disc && <p className="text-xs text-muted-foreground">{disc}</p>}
    </section>
  );
}
