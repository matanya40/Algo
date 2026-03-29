-- -----------------------------------------------------------------------------
-- Catalog seed: Opening Range Breakout (vendor documentation summary)
-- Idempotent: safe to re-run.
insert into public.strategy_templates (
  slug,
  sort_order,
  name,
  description,
  status,
  market,
  instrument,
  timeframe,
  session,
  direction,
  concept,
  notes,
  installation_guide,
  parameters_json,
  source_url,
  is_auto_provision,
  win_rate,
  total_trades,
  winning_trades,
  losing_trades,
  net_profit,
  max_drawdown,
  profit_factor,
  average_trade
) values (
  'atch-open-range-breakout',
  10,
  'Opening Range Breakout (NT8)',
  'NinjaTrader 8 Opening Range Breakout: import the add-on, enable Tick Replay on a 1-minute chart, configure ORB times and entry mode, activate your license. Vault documentation only.',
  'testing',
  'CME / futures',
  'MES',
  '1 Minute',
  'Example session: ORB 09:30–09:35 EST · allow trading until 11:00 EST (adjust in strategy)',
  'both',
  'Breakout of the defined opening range. Optional FVG entry. Risk-adjusted sizing. License required for live orders.',
  'Vendor pages may label times in UTC+1 (CET). Align time zone and parameters with your instrument.',
  'Tools → Import → NinjaScript Add-On (restart if prompted). Chart: 1m, e.g. MES, Tick Replay + global historical tick data (Tools → Options → Market Data). Add ORB_STRATEGY to the chart, set parameters, enable. Chart Trader: correct account, ATM None, size to risk. Enter license on the chart panel.',
  $orb${
  "schemaVersion": 3,
  "vendor": "automated-trading.ch",
  "product": "Opening Range Breakout",
  "platform": "NinjaTrader 8",
  "referenceUrl": "https://automated-trading.ch/NT8/strategies/opening-range-breakout",
  "performanceSummary": {
    "title": "Example — NinjaTrader 8 Strategy Performance (Summary $)",
    "period": "04/03/2024 12:00 AM → 13/03/2026 12:00 AM",
    "basis": "All trades",
    "metrics": [
      { "label": "Total net profit", "value": "$56,000.70" },
      { "label": "Gross profit", "value": "$129,572.35" },
      { "label": "Gross loss", "value": "-$73,571.65" },
      { "label": "Commission", "value": "$5,864.30" },
      { "label": "Profit factor", "value": "1.76" },
      { "label": "Max. drawdown", "value": "-$3,443.05" },
      { "label": "Sharpe ratio", "value": "0.53" },
      { "label": "Sortino ratio", "value": "1.96" },
      { "label": "Total # of trades", "value": "340" },
      { "label": "Percent profitable", "value": "45.29%" },
      { "label": "# of winning trades", "value": "154" },
      { "label": "# of losing trades", "value": "186" },
      { "label": "Avg. trade", "value": "$164.71" },
      { "label": "Avg. winning trade", "value": "$841.38" },
      { "label": "Avg. losing trade", "value": "-$395.55" },
      { "label": "Ratio avg. win / avg. loss", "value": "2.13" }
    ]
  },
  "summary": "Opening Range Breakout (ORB) for NinjaTrader 8: define an opening range window, trade the breakout (often with a retest), optionally require a Fair Value Gap (FVG) for entry, size risk with Risk Adjusted quantity, and use Tick Replay for realistic tests. A valid license is required before the strategy will trade.",
  "userGuide": {
    "title": "Opening Range Breakout Strategy – User Guide (NinjaTrader 8)",
    "intro": "How to install, configure, and run the Opening Range Breakout strategy in NinjaTrader 8. Follow the same workflow as on the official strategy page; add screenshots after each step if you document locally.",
    "steps": [
      {
        "n": 1,
        "title": "Import the strategy",
        "body": "Open NinjaTrader 8. Go to Tools → Import → NinjaScript Add-On. Select the strategy package you received and complete the import. Restart NinjaTrader if prompted."
      },
      {
        "n": 2,
        "title": "Configure the chart data series",
        "body": "Open a new chart. Set the instrument (e.g. MES), 1-minute timeframe, Price based on Last, and enable Tick Replay. Use a Custom Range for historical testing. Keep Trading Hours on Use instrument settings."
      },
      {
        "n": 3,
        "title": "Enable global Tick Replay",
        "body": "Go to Tools → Options → Market Data. Under Historical, enable Show Tick Replay and Get data from server. Required for accurate historical fills and strategy behavior."
      },
      {
        "n": 4,
        "title": "Add the strategy to the chart",
        "body": "Right-click the chart → Strategies. Select ORB_STRATEGY (or the installed strategy name), click Add. It appears under Configured strategies."
      },
      {
        "n": 5,
        "title": "Strategy parameters",
        "body": "Set Time Zone to EST, Open Range Time to 09:30–09:35, Allow Trading Until 11:00, Entry Mode to Wait For FVG, and Quantity Strategy to Risk Adjusted. Match risk and order settings to your account."
      },
      {
        "n": 6,
        "title": "Enable the strategy",
        "body": "After reviewing parameters, check Enabled, then OK to activate the strategy on the chart."
      },
      {
        "n": 7,
        "title": "Chart Trader",
        "body": "Enable Chart Trader on the toolbar. Confirm the correct account, ATM Strategy set to None, and order quantity matches your risk plan."
      },
      {
        "n": 8,
        "title": "Strategy control panel",
        "body": "When the strategy runs, the on-chart control panel appears: arm long/short, close positions, adjust quantity, move stop to breakeven. License status and expiration show at the top."
      }
    ],
    "license": {
      "title": "License activation",
      "steps": [
        "Enable Chart Trader on the chart.",
        "Open the strategy license panel on the chart.",
        "Enter your License Key.",
        "Click Check License.",
        "When valid, a green message confirms the license is active and shows the expiration date."
      ],
      "note": "The strategy does not execute trades until the license is valid."
    }
  },
  "coreLogic": [
    { "en": "Defines an opening range in a configurable time window (example: 09:30–09:35 EST)." },
    { "en": "Trades a breakout of that range; a retest is often part of the setup." },
    { "en": "Entry can use Wait For FVG or other modes your build supports." },
    { "en": "You can cap the session with an end time (example: 11:00 EST)." }
  ],
  "groups": [
    {
      "id": "guide_parameters",
      "titleEn": "Parameters (from the guide)",
      "items": [
        { "key": "timeZone", "labelEn": "Time Zone", "value": "EST" },
        { "key": "openRangeTime", "labelEn": "Open Range Time", "value": "09:30–09:35" },
        { "key": "allowTradingUntil", "labelEn": "Allow Trading Until", "value": "11:00" },
        { "key": "entryMode", "labelEn": "Entry Mode", "value": "Wait For FVG" },
        { "key": "quantityStrategy", "labelEn": "Quantity Strategy", "value": "Risk Adjusted" }
      ]
    },
    {
      "id": "chart_setup",
      "titleEn": "Chart & data (from the guide)",
      "items": [
        { "key": "instrument", "labelEn": "Instrument (example)", "value": "MES" },
        { "key": "timeframe", "labelEn": "Timeframe", "value": "1 minute" },
        { "key": "priceBasedOn", "labelEn": "Price based on", "value": "Last" },
        { "key": "tickReplay", "labelEn": "Tick Replay", "value": "On (chart); global historical tick data in Tools → Options → Market Data" },
        { "key": "tradingHours", "labelEn": "Trading hours", "value": "Use instrument settings" }
      ]
    }
  ],
  "disclaimerEn": "The metrics card on this strategy mirrors the NinjaTrader Summary ($) example above when loaded from the catalog. Past performance does not guarantee future results. Not investment advice."
}$orb$::jsonb,
  'https://automated-trading.ch/NT8/strategies/opening-range-breakout',
  true,
  45.29,
  340,
  154,
  186,
  56000.70,
  -3443.05,
  1.76,
  164.71
)
on conflict (slug) do update set
  sort_order = excluded.sort_order,
  name = excluded.name,
  description = excluded.description,
  status = excluded.status,
  market = excluded.market,
  instrument = excluded.instrument,
  timeframe = excluded.timeframe,
  session = excluded.session,
  direction = excluded.direction,
  concept = excluded.concept,
  notes = excluded.notes,
  installation_guide = excluded.installation_guide,
  parameters_json = excluded.parameters_json,
  source_url = excluded.source_url,
  is_auto_provision = excluded.is_auto_provision,
  win_rate = excluded.win_rate,
  total_trades = excluded.total_trades,
  winning_trades = excluded.winning_trades,
  losing_trades = excluded.losing_trades,
  net_profit = excluded.net_profit,
  max_drawdown = excluded.max_drawdown,
  profit_factor = excluded.profit_factor,
  average_trade = excluded.average_trade,
  updated_at = now();
