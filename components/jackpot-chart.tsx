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
import styles from "./jackpot-chart.module.css";

const ranges = [
  { label: "7D", days: 7, description: "Latest daily movement" },
  { label: "4W", days: 28, description: "Recent month view" },
  { label: "3M", days: 90, description: "Quarterly trend" }
] as const;

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric"
});

function formatMillions(value: number) {
  return `$${value}M`;
}

function filterRange(points: JackpotPoint[], days: number) {
  const latestDate = new Date(points[points.length - 1].date);
  const cutoff = new Date(latestDate);
  cutoff.setDate(latestDate.getDate() - (days - 1));

  return points.filter((point) => new Date(point.date) >= cutoff);
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
          <span className={styles.tooltipDot} style={{ backgroundColor: entry.color }} />
          <span>{entry.name}</span>
          <strong>{currency.format(entry.value * 1000000)}</strong>
        </div>
      ))}
    </div>
  );
}

export function JackpotChart() {
  const [selectedRange, setSelectedRange] = useState<(typeof ranges)[number]["days"]>(7);

  const chartData = useMemo(
    () =>
      filterRange(jackpotHistory, selectedRange).map((point) => ({
        ...point,
        shortDate: dateFormatter.format(new Date(point.date))
      })),
    [selectedRange]
  );

  const latest = chartData[chartData.length - 1];

  return (
    <section className={styles.shell}>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Phase 1 ? Mocked data</p>
          <h1>Lottery jackpots at a glance</h1>
          <p className={styles.subhead}>
            Initial view for daily Mega Millions and Powerball tracking. The next increment will
            add cash value and after-tax views.
          </p>
        </div>
        <div className={styles.snapshot}>
          <span>Latest sample</span>
          <strong>{dateFormatter.format(new Date(latest.date))}</strong>
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

        <div className={styles.summaryRow}>
          <article className={styles.summaryCard}>
            <span>Mega Millions</span>
            <strong>{formatMillions(latest.megamillions)}</strong>
          </article>
          <article className={styles.summaryCard}>
            <span>Powerball</span>
            <strong>{formatMillions(latest.powerball)}</strong>
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
                width={72}
              />
              <Tooltip content={<TooltipContent />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="megamillions"
                name="Mega Millions"
                stroke="var(--megamillions)"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="powerball"
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
