"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { jackpotHistory, type JackpotPoint } from "@/data/jackpots";
import { federalTaxRate, stateTaxRates } from "@/data/state-tax-rates";
import styles from "./jackpot-chart.module.css";

const ranges = [
  { label: "7D", days: 7 },
  { label: "4W", days: 28 },
  { label: "3M", days: 90 }
] as const;

const displayModes = [
  { id: "jackpot", label: "Jackpot" },
  { id: "cash", label: "Cash Value" },
  { id: "afterTax", label: "After Tax" }
] as const;

type DisplayMode = (typeof displayModes)[number]["id"];

type ChartPoint = JackpotPoint & {
  shortDate: string;
  megamillionsDisplay: number;
  powerballDisplay: number;
};

type AxisConfig = {
  domain: [number, number];
  ticks: number[];
};

const millionsFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0
});

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC"
});

const fullDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC"
});

const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  timeZone: "UTC"
});

function parseDate(date: string) {
  return new Date(`${date}T00:00:00Z`);
}

function formatMillions(value: number) {
  return `$${millionsFormatter.format(value)}M`;
}

function formatTooltipDate(date: string) {
  const parsedDate = parseDate(date);

  return `${fullDateFormatter.format(parsedDate)} (${weekdayFormatter.format(parsedDate)})`;
}

function filterRange(points: JackpotPoint[], days: number) {
  const latestDate = parseDate(points[points.length - 1].date);
  const cutoff = new Date(latestDate);
  cutoff.setUTCDate(latestDate.getUTCDate() - (days - 1));

  return points.filter((point) => parseDate(point.date) >= cutoff);
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

function buildAxisConfig(values: number[]): AxisConfig {
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const padding = rawMin === rawMax ? Math.max(25, rawMax * 0.2) : Math.max(25, (rawMax - rawMin) * 0.12);
  const minValue = Math.max(0, rawMin - padding);
  const maxValue = rawMax + padding;
  const roughStep = (maxValue - minValue) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const step = ([1, 2, 2.5, 5, 10].find((factor) => factor * magnitude >= roughStep) ?? 10) * magnitude;
  const lower = Math.floor(minValue / step) * step;
  const upper = Math.ceil(maxValue / step) * step;
  const ticks = Array.from(
    { length: Math.round((upper - lower) / step) + 1 },
    (_, index) => lower + index * step
  );

  return {
    domain: [Math.min(...ticks), Math.max(...ticks)],
    ticks
  };
}

type TooltipContentProps = {
  active?: boolean;
  payload?: Array<{
    color: string;
    name: string;
    payload: ChartPoint;
    value: number;
  }>;
};

function TooltipContent({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const chartPoint = payload[0].payload;
  const sortedPayload = [...payload].sort((left, right) => right.value - left.value);

  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipDate}>{formatTooltipDate(chartPoint.date)}</p>
      {sortedPayload.map((entry) => (
        <div className={styles.tooltipRow} key={entry.name}>
          <span className={styles.tooltipLabel}>
            <span className={styles.tooltipDot} style={{ backgroundColor: entry.color }} />
            <span>{entry.name}</span>
          </span>
          <strong>{formatMillions(entry.value)}</strong>
        </div>
      ))}
    </div>
  );
}

export function JackpotChart() {
  const [selectedRange, setSelectedRange] = useState<(typeof ranges)[number]["days"]>(7);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("jackpot");
  const [selectedState, setSelectedState] = useState("New Jersey");

  const activeState = stateTaxRates.find((state) => state.name === selectedState) ?? stateTaxRates[0];

  const chartData = useMemo<ChartPoint[]>(() => {
    return filterRange(jackpotHistory, selectedRange).map((point) => ({
      ...point,
      ...getDisplayValue(point, displayMode, activeState.rate),
      shortDate: shortDateFormatter.format(parseDate(point.date))
    }));
  }, [activeState.rate, displayMode, selectedRange]);

  const latest = chartData[chartData.length - 1];
  const axisConfig = useMemo(() => {
    const values = chartData.flatMap((point) => [point.megamillionsDisplay, point.powerballDisplay]);
    return buildAxisConfig(values);
  }, [chartData]);

  return (
    <main className={styles.shell}>
      <div className={styles.panel}>
        <header className={styles.header}>
          <h1>Jackpot tracker</h1>
          <p>Latest snapshot: {formatTooltipDate(latest.date)}</p>
        </header>
        <div className={styles.summaryRow}>
          <a
            className={styles.summaryCard}
            href="https://www.megamillions.com/"
            rel="noreferrer"
            target="_blank"
          >
            <span className={styles.summaryLabel}>
              <span className={`${styles.summaryDot} ${styles.summaryMega}`} />
              Mega Millions
            </span>
            <strong>{formatMillions(latest.megamillionsDisplay)}</strong>
          </a>
          <a
            className={styles.summaryCard}
            href="https://www.powerball.com/"
            rel="noreferrer"
            target="_blank"
          >
            <span className={styles.summaryLabel}>
              <span className={`${styles.summaryDot} ${styles.summaryPowerball}`} />
              Powerball
            </span>
            <strong>{formatMillions(latest.powerballDisplay)}</strong>
          </a>
        </div>

        <div className={styles.controlStack}>
          <div className={styles.segmentedGroup}>
            {displayModes.map((mode) => (
              <button
                key={mode.id}
                className={displayMode === mode.id ? styles.segmentActive : styles.segmentButton}
                aria-pressed={displayMode === mode.id}
                onClick={() => setDisplayMode(mode.id)}
                type="button"
              >
                {mode.label}
              </button>
            ))}
          </div>

          <div className={styles.taxRow}>
            <label className={styles.statePicker}>
              <select aria-label="State for estimated after-tax value" value={selectedState} onChange={(event) => setSelectedState(event.target.value)}>
                {stateTaxRates.map((state) => (
                  <option key={state.name} value={state.name}>
                    {state.name}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.inlineTax}>
              <strong>{((federalTaxRate + activeState.rate) * 100).toFixed(2)}%</strong>
            </div>
          </div>

          <div className={styles.segmentedGroup}>
            {ranges.map((range) => (
              <button
                key={range.days}
                className={selectedRange === range.days ? styles.segmentActive : styles.segmentButton}
                aria-pressed={selectedRange === range.days}
                onClick={() => setSelectedRange(range.days)}
                type="button"
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.chartHeading}>
          <h2>{displayModes.find((mode) => mode.id === displayMode)?.label} trend</h2>
          <p>USD millions ($M)</p>
        </div>
        <div className={styles.legend} aria-label="Chart legend">
          <span><i className={styles.megaLine} />Mega Millions</span>
          <span><i className={styles.powerballLine} />Powerball</span>
        </div>
        <div className={styles.chartWrap}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart accessibilityLayer data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid vertical={false} stroke="#d9dfe7" strokeDasharray="4 4" />
              <XAxis
                dataKey="shortDate"
                axisLine={false}
                tick={{ fill: "#475569", fontSize: 12 }}
                minTickGap={32}
                interval="preserveStartEnd"
                padding={{ left: 8, right: 8 }}
                tickLine={false}
                tickMargin={8}
              />
              <YAxis
                axisLine={false}
                domain={axisConfig.domain}
                tick={{ fill: "#475569", fontSize: 12 }}
                tickFormatter={formatMillions}
                tickLine={false}
                ticks={axisConfig.ticks}
                tickMargin={8}
                width={66}
              />
              <Tooltip content={<TooltipContent />} cursor={{ stroke: "#94a3b8", strokeDasharray: "4 4" }} />
              <Line
                type="linear"
                dataKey="megamillionsDisplay"
                name="Mega Millions"
                stroke="var(--megamillions)"
                strokeWidth={3}
                dot={selectedRange === 7 ? { r: 4, fill: "var(--megamillions)", stroke: "#fff", strokeWidth: 2 } : false}
                activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }}
                isAnimationActive={false}
              />
              <Line
                type="linear"
                dataKey="powerballDisplay"
                name="Powerball"
                stroke="var(--powerball)"
                strokeWidth={3}
                strokeDasharray="8 4"
                dot={selectedRange === 7 ? { r: 4, fill: "var(--powerball)", stroke: "#fff", strokeWidth: 2 } : false}
                activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className={styles.chartHint}>Tap or hover on the chart to compare values by date.</p>
      </div>
    </main>
  );
}
