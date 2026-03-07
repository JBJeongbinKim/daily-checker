"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  jackpotHistory,
  jackpotHistoryData,
  jackpotStatusData,
  type JackpotPoint,
  type JackpotRefreshState
} from "@/data/jackpots";
import { federalTaxRate, stateTaxRates } from "@/data/state-tax-rates";
import styles from "./jackpot-chart.module.css";

const ranges = [
  { label: "7D", days: 7, description: "Latest daily movement" },
  { label: "4W", days: 28, description: "Recent month view" },
  { label: "3M", days: 90, description: "Quarterly trend" }
] as const;

const displayModes = [
  { id: "jackpot", label: "Jackpot", description: "Advertised annuity jackpot" },
  { id: "cash", label: "Cash Value", description: "Estimated one-time cash option" },
  { id: "afterTax", label: "After Tax", description: "Cash option after federal and state tax" }
] as const;

const axisModes = [
  { id: "compressed", label: "Compressed Axis" },
  { id: "linear", label: "Linear Axis" }
] as const;

type DisplayMode = (typeof displayModes)[number]["id"];
type AxisMode = (typeof axisModes)[number]["id"];

type ChartPoint = JackpotPoint & {
  shortDate: string;
  megamillionsDisplay: number;
  powerballDisplay: number;
  megamillionsPlot: number;
  powerballPlot: number;
};

type AxisConfig = {
  domain: [number, number];
  ticks: number[];
  formatTick: (value: number) => string;
  note: string;
};

type HealthState = JackpotRefreshState | "stale";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

const millionsFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric"
});

const updateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit"
});

function formatMillions(value: number) {
  return `$${millionsFormatter.format(value)}M`;
}

function filterRange(points: JackpotPoint[], days: number) {
  const latestDate = new Date(points[points.length - 1].date);
  const cutoff = new Date(latestDate);
  cutoff.setDate(latestDate.getDate() - (days - 1));

  return points.filter((point) => new Date(point.date) >= cutoff);
}

function getDisplayValue(point: JackpotPoint, mode: DisplayMode, stateRate: number) {
  if (mode === "jackpot") {
    return {
      megamillionsDisplay: point.megamillions,
      powerballDisplay: point.powerball
    };
  }

  if (mode === "cash") {
    return {
      megamillionsDisplay: point.megamillionsCash,
      powerballDisplay: point.powerballCash
    };
  }

  const combinedRate = federalTaxRate + stateRate;

  return {
    megamillionsDisplay: point.megamillionsCash * (1 - combinedRate),
    powerballDisplay: point.powerballCash * (1 - combinedRate)
  };
}

function roundTick(value: number) {
  return Math.round(value / 25) * 25;
}

function buildLinearTicks(minValue: number, maxValue: number) {
  const stepCount = 4;
  return Array.from({ length: stepCount + 1 }, (_, index) => {
    const raw = minValue + ((maxValue - minValue) * index) / stepCount;
    return roundTick(raw);
  }).filter((tick, index, ticks) => ticks.indexOf(tick) === index);
}

function buildAxisConfig(values: number[], axisMode: AxisMode): AxisConfig {
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  if (axisMode === "linear") {
    const ticks = buildLinearTicks(minValue, maxValue);

    return {
      domain: [Math.min(...ticks), Math.max(...ticks)],
      ticks,
      formatTick: formatMillions,
      note: "Linear Y-axis uses evenly spaced dollar increments."
    };
  }

  const actualTicks = buildLinearTicks(minValue, maxValue);
  const transformedTicks = actualTicks.map((tick) => Math.sqrt(tick));
  const tickLabels = new Map(transformedTicks.map((tick, index) => [tick, actualTicks[index]]));

  return {
    domain: [Math.sqrt(minValue), Math.sqrt(maxValue)],
    ticks: transformedTicks,
    formatTick: (value) => formatMillions(tickLabels.get(value) ?? value * value),
    note: "Compressed Y-axis uses a non-linear scale so larger jackpots sit closer together while preserving order."
  };
}

function getRefreshHealth(): { state: HealthState; label: string; note: string } {
  const lastSuccess = new Date(jackpotStatusData.lastSuccessfulAt).getTime();
  const ageHours = (Date.now() - lastSuccess) / (1000 * 60 * 60);

  if (jackpotStatusData.state === "failed") {
    return {
      state: "failed",
      label: "Refresh failed",
      note: jackpotStatusData.errorMessage ?? "Latest fetch attempt failed. Showing last successful data."
    };
  }

  if (ageHours > 36) {
    return {
      state: "stale",
      label: "Data stale",
      note: "The last successful refresh is older than 36 hours. Showing the latest stored snapshot."
    };
  }

  return {
    state: "success",
    label: "Refresh healthy",
    note: "Daily refresh is healthy and the latest stored snapshot is current."
  };
}

type TooltipContentProps = {
  active?: boolean;
  payload?: Array<{
    color: string;
    dataKey: string;
    name: string;
    payload: ChartPoint;
  }>;
  label?: string;
};

function TooltipContent({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length || !label) {
    return null;
  }

  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipDate}>
        {new Intl.DateTimeFormat("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric"
        }).format(new Date(label))}
      </p>
      {payload.map((entry) => {
        const rawValue =
          entry.dataKey === "megamillionsPlot"
            ? entry.payload.megamillionsDisplay
            : entry.payload.powerballDisplay;

        return (
          <div className={styles.tooltipRow} key={entry.name}>
            <span className={styles.tooltipLabel}>
              <span className={styles.tooltipDot} style={{ backgroundColor: entry.color }} />
              <span>{entry.name}</span>
            </span>
            <strong>{currency.format(rawValue * 1000000)}</strong>
          </div>
        );
      })}
    </div>
  );
}

export function JackpotChart() {
  const [selectedRange, setSelectedRange] = useState<(typeof ranges)[number]["days"]>(7);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("jackpot");
  const [axisMode, setAxisMode] = useState<AxisMode>("compressed");
  const [selectedState, setSelectedState] = useState("New Jersey");

  const activeState = stateTaxRates.find((state) => state.name === selectedState) ?? stateTaxRates[0];
  const refreshHealth = getRefreshHealth();
  const hasEnoughHistory = jackpotHistory.length >= 2;

  const baseData = useMemo(() => {
    return filterRange(jackpotHistory, selectedRange).map((point) => ({
      ...point,
      ...getDisplayValue(point, displayMode, activeState.rate),
      shortDate: dateFormatter.format(new Date(point.date))
    }));
  }, [activeState.rate, displayMode, selectedRange]);

  const axisConfig = useMemo(() => {
    const values = baseData.flatMap((point) => [point.megamillionsDisplay, point.powerballDisplay]);
    return buildAxisConfig(values, axisMode);
  }, [axisMode, baseData]);

  const chartData = useMemo<ChartPoint[]>(() => {
    return baseData.map((point) => ({
      ...point,
      megamillionsPlot:
        axisMode === "compressed" ? Math.sqrt(point.megamillionsDisplay) : point.megamillionsDisplay,
      powerballPlot:
        axisMode === "compressed" ? Math.sqrt(point.powerballDisplay) : point.powerballDisplay
    }));
  }, [axisMode, baseData]);

  const latest = chartData[chartData.length - 1];
  const activeMode = displayModes.find((mode) => mode.id === displayMode);
  const latestSourceLabel = latest.source === "official" ? "Official snapshot" : "Seed history";

  return (
    <section className={styles.shell}>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Phase 6 - Start from today</p>
          <h1>Lottery jackpots at a glance</h1>
          <p className={styles.subhead}>
            The stored timeline now starts from the first official snapshot only. As daily refreshes run,
            this chart will naturally grow into the 7-day, 4-week, and 3-month views.
          </p>
        </div>
        <div className={styles.snapshot}>
          <span>Latest point</span>
          <strong>{dateFormatter.format(new Date(latest.date))}</strong>
          <em>{activeMode?.label}</em>
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.dataStatus}>
          <div>
            <div className={styles.badgeRow}>
              <span className={styles.dataBadge}>{latestSourceLabel}</span>
              <span className={`${styles.healthBadge} ${styles[`health${refreshHealth.state[0].toUpperCase()}${refreshHealth.state.slice(1)}`]}`}>
                {refreshHealth.label}
              </span>
            </div>
            <p className={styles.dataNote}>
              History updated {updateFormatter.format(new Date(jackpotHistoryData.updatedAt))}. Last
              successful refresh {updateFormatter.format(new Date(jackpotStatusData.lastSuccessfulAt))}.
            </p>
            <p className={styles.healthNote}>{refreshHealth.note}</p>
          </div>
        </div>

        <div className={styles.controls}>
          <div className={styles.rangeGroup}>
            {ranges.map((range) => (
              <button
                key={range.days}
                className={selectedRange === range.days ? styles.rangeActive : styles.rangeButton}
                onClick={() => setSelectedRange(range.days)}
                type="button"
              >
                {range.label}
              </button>
            ))}
          </div>
          <p className={styles.rangeDescription}>
            {ranges.find((range) => range.days === selectedRange)?.description}
          </p>
        </div>

        <div className={styles.modePanel}>
          <div className={styles.modeGroup}>
            {displayModes.map((mode) => (
              <button
                key={mode.id}
                className={displayMode === mode.id ? styles.modeActive : styles.modeButton}
                onClick={() => setDisplayMode(mode.id)}
                type="button"
              >
                {mode.label}
              </button>
            ))}
          </div>
          <div className={styles.taxControls}>
            <label className={styles.statePicker}>
              <span>State</span>
              <select value={selectedState} onChange={(event) => setSelectedState(event.target.value)}>
                {stateTaxRates.map((state) => (
                  <option key={state.name} value={state.name}>
                    {state.name}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.taxBadge}>
              <span>Tax applied</span>
              <strong>{((federalTaxRate + activeState.rate) * 100).toFixed(2)}%</strong>
            </div>
          </div>
        </div>

        <div className={styles.axisPanel}>
          <div className={styles.modeGroup}>
            {axisModes.map((mode) => (
              <button
                key={mode.id}
                className={axisMode === mode.id ? styles.modeActive : styles.modeButton}
                onClick={() => setAxisMode(mode.id)}
                type="button"
              >
                {mode.label}
              </button>
            ))}
          </div>
          <p className={styles.axisNote}>{axisConfig.note}</p>
        </div>

        <p className={styles.modeDescription}>{activeMode?.description}</p>

        <div className={styles.summaryRow}>
          <article className={styles.summaryCard}>
            <span>Mega Millions</span>
            <strong>{formatMillions(latest.megamillionsDisplay)}</strong>
          </article>
          <article className={styles.summaryCard}>
            <span>Powerball</span>
            <strong>{formatMillions(latest.powerballDisplay)}</strong>
          </article>
        </div>

        {hasEnoughHistory ? (
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={chartData} margin={{ top: 10, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid stroke="rgba(51, 35, 20, 0.12)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="shortDate"
                  axisLine={false}
                  tickLine={false}
                  tickMargin={10}
                  stroke="#5f544e"
                />
                <YAxis
                  axisLine={false}
                  domain={axisConfig.domain}
                  tickCount={axisConfig.ticks.length}
                  tickFormatter={axisConfig.formatTick}
                  tickLine={false}
                  ticks={axisConfig.ticks}
                  tickMargin={10}
                  stroke="#5f544e"
                  width={84}
                />
                <Tooltip content={<TooltipContent />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="megamillionsPlot"
                  name="Mega Millions"
                  stroke="var(--megamillions)"
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="powerballPlot"
                  name="Powerball"
                  stroke="var(--powerball)"
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <strong>Not enough history yet</strong>
            <p>
              The app is now collecting from today forward only. Once the next daily refresh lands,
              the line chart will begin showing movement over time.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
