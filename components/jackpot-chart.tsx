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
import { jackpotHistory, type JackpotPoint } from "@/data/jackpots";
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

type DisplayMode = (typeof displayModes)[number]["id"];

type ChartPoint = JackpotPoint & {
  shortDate: string;
  megamillionsDisplay: number;
  powerballDisplay: number;
};

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

type TooltipContentProps = {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    color: string;
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
      {payload.map((entry) => (
        <div className={styles.tooltipRow} key={entry.name}>
          <span className={styles.tooltipLabel}>
            <span className={styles.tooltipDot} style={{ backgroundColor: entry.color }} />
            <span>{entry.name}</span>
          </span>
          <strong>{currency.format(entry.value * 1000000)}</strong>
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
      shortDate: dateFormatter.format(new Date(point.date))
    }));
  }, [activeState.rate, displayMode, selectedRange]);

  const latest = chartData[chartData.length - 1];
  const activeMode = displayModes.find((mode) => mode.id === displayMode);

  return (
    <section className={styles.shell}>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Phase 2 ? Payout views</p>
          <h1>Lottery jackpots at a glance</h1>
          <p className={styles.subhead}>
            Switch between headline jackpot, estimated cash value, and after-tax payout using the
            selected state. Live official scraping comes in a later branch.
          </p>
        </div>
        <div className={styles.snapshot}>
          <span>Latest sample</span>
          <strong>{dateFormatter.format(new Date(latest.date))}</strong>
          <em>{activeMode?.label}</em>
        </div>
      </div>

      <div className={styles.panel}>
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
                tickLine={false}
                tickFormatter={formatMillions}
                tickMargin={10}
                stroke="#5f544e"
                width={78}
              />
              <Tooltip content={<TooltipContent />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="megamillionsDisplay"
                name="Mega Millions"
                stroke="var(--megamillions)"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="powerballDisplay"
                name="Powerball"
                stroke="var(--powerball)"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
