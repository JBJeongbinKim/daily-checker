"use client";
import { useRouter } from "next/navigation";
import { useDeferredValue, useState, useTransition } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RentDataset, RentUnit } from "@/lib/rent-types";
import styles from "./rent-dashboard.module.css";

type RentDashboardProps = {
  dataset: RentDataset;
};

type SortKey =
  | "buildingId"
  | "layoutId"
  | "unitNumber"
  | "availabilityDate"
  | "currentPrice"
  | "changeSinceFirst"
  | "lastSeen"
  | "status";

type SortDirection = "asc" | "desc";
type RangeKey = "2y" | "1y" | "6m" | "3m";

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const compactMoneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const linePalette = [
  "#b35a2c",
  "#3a7f7a",
  "#7657a8",
  "#ca8b2f",
  "#5e7cb5",
  "#ad4f6b",
  "#4f8f4f",
  "#8c5e3c",
  "#4d6d9a",
  "#9a6a1d",
  "#2d6f8f",
  "#a24d4d",
];

function formatMoney(value: number | null) {
  if (value === null) {
    return "N/A";
  }

  return moneyFormatter.format(value);
}

function formatCompactMoney(value: number | null) {
  if (value === null) {
    return "N/A";
  }

  return compactMoneyFormatter.format(value);
}

function formatDate(value: string | null) {
  if (!value) {
    return "N/A";
  }

  return dateFormatter.format(new Date(`${value}T00:00:00`));
}

function formatChange(value: number | null) {
  if (value === null) {
    return "N/A";
  }

  if (value === 0) {
    return "$0";
  }

  const prefix = value > 0 ? "+" : "-";
  return `${prefix}${moneyFormatter.format(Math.abs(value))}`;
}

function normalizeTooltipValue(value: number | string | ReadonlyArray<number | string> | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (Array.isArray(value)) {
    return normalizeTooltipValue(value[0]);
  }

  return null;
}

function compareNullableStrings(left: string | null, right: string | null, direction: SortDirection) {
  const leftValue = left ?? "";
  const rightValue = right ?? "";
  return direction === "asc" ? leftValue.localeCompare(rightValue) : rightValue.localeCompare(leftValue);
}

function compareNullableNumbers(left: number | null, right: number | null, direction: SortDirection) {
  const leftValue = left ?? Number.NEGATIVE_INFINITY;
  const rightValue = right ?? Number.NEGATIVE_INFINITY;
  return direction === "asc" ? leftValue - rightValue : rightValue - leftValue;
}

function sortUnits(units: RentUnit[], sortKey: SortKey, sortDirection: SortDirection) {
  return [...units].sort((left, right) => {
    switch (sortKey) {
      case "buildingId":
        return compareNullableStrings(left.buildingId, right.buildingId, sortDirection);
      case "layoutId":
        return compareNullableStrings(left.layoutId, right.layoutId, sortDirection);
      case "unitNumber":
        return sortDirection === "asc"
          ? left.unitNumber.localeCompare(right.unitNumber, undefined, { numeric: true })
          : right.unitNumber.localeCompare(left.unitNumber, undefined, { numeric: true });
      case "availabilityDate":
        return compareNullableStrings(left.availabilityDate, right.availabilityDate, sortDirection);
      case "currentPrice":
        return compareNullableNumbers(left.currentPrice, right.currentPrice, sortDirection);
      case "changeSinceFirst":
        return compareNullableNumbers(left.changeSinceFirst, right.changeSinceFirst, sortDirection);
      case "lastSeen":
        return compareNullableStrings(left.lastSeen, right.lastSeen, sortDirection);
      case "status":
        return compareNullableStrings(left.status, right.status, sortDirection);
      default:
        return 0;
    }
  });
}

export function RentDashboard({ dataset }: RentDashboardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [buildingFilter, setBuildingFilter] = useState("all");
  const [layoutFilter, setLayoutFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [thursdayOnly, setThursdayOnly] = useState(false);
  const [rangeKey, setRangeKey] = useState<RangeKey>("2y");
  const [unitQuery, setUnitQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("unitNumber");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const deferredQuery = useDeferredValue(unitQuery.trim().toLowerCase());

  const buildingOptions = Array.from(new Set(dataset.units.map((unit) => unit.buildingId))).sort();

  const layoutOptions = Array.from(
    new Set(
      dataset.units
        .filter((unit) => buildingFilter === "all" || unit.buildingId === buildingFilter)
        .map((unit) => unit.layoutId),
    ),
  ).sort();

  const filteredUnits = dataset.units
    .filter((unit) => buildingFilter === "all" || unit.buildingId === buildingFilter)
    .filter((unit) => layoutFilter === "all" || unit.layoutId === layoutFilter)
    .filter((unit) => statusFilter === "all" || unit.status === statusFilter)
    .filter((unit) => {
      if (!deferredQuery) {
        return true;
      }

      const haystack = `${unit.unitNumber} ${unit.typeLabel} ${unit.buildingId}`.toLowerCase();
      return haystack.includes(deferredQuery);
    });

  const sortedUnits = sortUnits(filteredUnits, sortKey, sortDirection);
  const chartUnits = sortedUnits.slice(0, 12);

  const chartDates = new Set<string>();
  for (const unit of chartUnits) {
    for (const snapshot of unit.snapshots) {
      if (!thursdayOnly || snapshot.isThursday) {
        chartDates.add(snapshot.date);
      }
    }
  }

  const rawChartData = [...chartDates].sort().map((date) => {
    const point: Record<string, string | number | null> = {
      date,
      label: formatDate(date),
    };

    for (const unit of chartUnits) {
      const snapshot = unit.snapshots.find((entry) => entry.date === date && (!thursdayOnly || entry.isThursday));
      point[unit.id] = snapshot?.price ?? null;
    }

    return point;
  });

  const latestChartDate = rawChartData.at(-1)?.date;
  const rangeStart = (() => {
    if (!latestChartDate) {
      return null;
    }

    const anchor = new Date(`${latestChartDate}T00:00:00`);
    const next = new Date(anchor);

    if (rangeKey === "2y") {
      next.setFullYear(next.getFullYear() - 2);
    } else if (rangeKey === "1y") {
      next.setFullYear(next.getFullYear() - 1);
    } else if (rangeKey === "6m") {
      next.setMonth(next.getMonth() - 6);
    } else {
      next.setMonth(next.getMonth() - 3);
    }

    return next.toISOString().slice(0, 10);
  })();

  const chartData = rawChartData.filter((point) => {
    const pointDate = typeof point.date === "string" ? point.date : null;
    return !rangeStart || (pointDate !== null && pointDate >= rangeStart);
  });

  const visibleValues = chartData.flatMap((point) =>
    chartUnits
      .map((unit) => point[unit.id])
      .filter((value): value is number => typeof value === "number"),
  );

  const yDomain: [number, number] | ["auto", "auto"] = (() => {
    if (!visibleValues.length) {
      return ["auto", "auto"];
    }

    const minValue = Math.min(...visibleValues);
    const maxValue = Math.max(...visibleValues);

    if (minValue === maxValue) {
      return [Math.max(0, minValue - 100), maxValue + 100];
    }

    const padding = Math.max(50, Math.round((maxValue - minValue) * 0.12));
    return [Math.max(0, minValue - padding), maxValue + padding];
  })();

  const toggleSort = (nextKey: SortKey) => {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "currentPrice" || nextKey === "changeSinceFirst" || nextKey === "lastSeen" ? "desc" : "asc");
  };

  const handleRefresh = async () => {
    setStatusMessage("Refreshing rent data from Veris...");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/rent/refresh", {
        method: "POST",
      });

      const result = (await response.json()) as
        | { ok: true; snapshotDate: string; scrapedUnitCount: number }
        | { ok: false; error: string };

      if (!response.ok || !result.ok) {
        throw new Error("error" in result ? result.error : "Rent refresh failed");
      }

      setStatusMessage(
        `Refresh complete. Captured ${result.scrapedUnitCount} units for ${formatDate(result.snapshotDate)}.`,
      );
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Rent refresh failed");
      setStatusMessage(null);
    }
  };

  return (
    <section className={styles.shell}>
      <div className={styles.panel}>
        <div className={styles.toolbar}>
          <button className={styles.refreshButton} disabled={isPending} onClick={handleRefresh} type="button">
            {isPending ? "Refreshing..." : "Refresh from Veris"}
          </button>

          <div className={styles.toolbarMeta}>
            <span>Latest snapshot: {formatDate(dataset.latestSnapshotDate)}</span>
            <a className={styles.sourceLink} href={dataset.sourceUrl} rel="noreferrer" target="_blank">
              Source site
            </a>
          </div>
        </div>

        <div className={styles.status}>
          {statusMessage ? <span>{statusMessage}</span> : null}
          {errorMessage ? <span className={styles.error}>{errorMessage}</span> : null}
        </div>

        <article className={styles.card}>
          {chartUnits.length ? (
            <>
              <div className={styles.chartControls}>
                <div className={styles.rangeGroup}>
                  {([
                    { key: "2y", label: "2 Years" },
                    { key: "1y", label: "1 Year" },
                    { key: "6m", label: "6 Months" },
                    { key: "3m", label: "3 Months" },
                  ] as const).map((option) => (
                    <button
                      className={`${styles.rangeButton} ${rangeKey === option.key ? styles.rangeButtonActive : ""}`.trim()}
                      key={option.key}
                      onClick={() => setRangeKey(option.key)}
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.chartWrap}>
                <ResponsiveContainer width="100%" height={420}>
                  <LineChart data={chartData}>
                    <CartesianGrid stroke="rgba(60, 48, 33, 0.08)" strokeDasharray="4 4" vertical={false} />
                    <XAxis dataKey="label" minTickGap={28} stroke="#8a7358" tick={{ fontSize: 12 }} />
                    <YAxis
                      domain={yDomain}
                      tickFormatter={(value) => formatCompactMoney(Number(value))}
                      stroke="#8a7358"
                      tick={{ fontSize: 12 }}
                      width={72}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 18,
                        border: "1px solid rgba(60, 48, 33, 0.10)",
                        boxShadow: "0 18px 40px rgba(42, 33, 20, 0.14)",
                      }}
                      formatter={(value, name) => {
                        const normalizedValue = normalizeTooltipValue(value);
                        const unit = chartUnits.find((entry) => entry.id === name);
                        return [formatMoney(normalizedValue), unit ? `${unit.unitNumber} - ${unit.layoutId}` : String(name)];
                      }}
                      labelFormatter={(value) => `Snapshot: ${value}`}
                    />
                    <Legend />
                    {chartUnits.map((unit, index) => (
                      <Line
                        key={unit.id}
                        connectNulls={false}
                        dataKey={unit.id}
                        dot={false}
                        name={`${unit.unitNumber} - ${unit.layoutId}`}
                        stroke={linePalette[index % linePalette.length]}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.2}
                        type="monotone"
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className={styles.chartCaption}>
                {chartUnits.length < sortedUnits.length
                  ? `The chart shows the first ${chartUnits.length} filtered units so it stays readable. The table below still shows all ${sortedUnits.length} matching units.`
                  : `The chart shows all ${sortedUnits.length} filtered units.`}
              </div>
            </>
          ) : (
            <div className={styles.empty}>No units match the current filters yet.</div>
          )}
        </article>

        <article className={styles.card}>
          <div className={styles.filtersRow}>
            <label className={styles.field}>
              <span>Building</span>
              <select value={buildingFilter} onChange={(event) => setBuildingFilter(event.target.value)}>
                <option value="all">All buildings</option>
                {buildingOptions.map((building) => (
                  <option key={building} value={building}>
                    {building}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Apartment type</span>
              <select value={layoutFilter} onChange={(event) => setLayoutFilter(event.target.value)}>
                <option value="all">All types</option>
                {layoutOptions.map((layout) => (
                  <option key={layout} value={layout}>
                    {layout}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "inactive")}
              >
                <option value="all">All units</option>
                <option value="active">Active only</option>
                <option value="inactive">Unavailable only</option>
              </select>
            </label>

            <label className={styles.field}>
              <span>Search unit</span>
              <input
                placeholder="2203N, B1, B475N..."
                type="search"
                value={unitQuery}
                onChange={(event) => setUnitQuery(event.target.value)}
              />
            </label>

            <label className={styles.toggle}>
              <input
                checked={thursdayOnly}
                type="checkbox"
                onChange={(event) => setThursdayOnly(event.target.checked)}
              />
              <span>Thursday only</span>
            </label>

            <button
              className={styles.resetButton}
              onClick={() => {
                setBuildingFilter("all");
                setLayoutFilter("all");
                setStatusFilter("all");
                setThursdayOnly(false);
                setUnitQuery("");
              }}
              type="button"
            >
              Reset
            </button>
          </div>

          {sortedUnits.length ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th><button className={styles.sortButton} onClick={() => toggleSort("buildingId")} type="button">Building</button></th>
                    <th><button className={styles.sortButton} onClick={() => toggleSort("layoutId")} type="button">Type</button></th>
                    <th><button className={styles.sortButton} onClick={() => toggleSort("unitNumber")} type="button">Unit</button></th>
                    <th><button className={styles.sortButton} onClick={() => toggleSort("availabilityDate")} type="button">Variable Date</button></th>
                    <th><button className={styles.sortButton} onClick={() => toggleSort("currentPrice")} type="button">Current Price</button></th>
                    <th><button className={styles.sortButton} onClick={() => toggleSort("changeSinceFirst")} type="button">Change</button></th>
                    <th><button className={styles.sortButton} onClick={() => toggleSort("lastSeen")} type="button">Last Seen</button></th>
                    <th><button className={styles.sortButton} onClick={() => toggleSort("status")} type="button">Status</button></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUnits.map((unit) => (
                    <tr key={unit.id}>
                      <td>{unit.buildingId}</td>
                      <td>{unit.layoutId}</td>
                      <td>{unit.unitNumber}</td>
                      <td>{formatDate(unit.availabilityDate)}</td>
                      <td>{formatMoney(unit.currentPrice)}</td>
                      <td>{formatChange(unit.changeSinceFirst)}</td>
                      <td>{formatDate(unit.lastSeen)}</td>
                      <td>{unit.status === "active" ? "Available" : "Unavailable"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.empty}>Try clearing one of the filters to bring units back into view.</div>
          )}
        </article>
      </div>
    </section>
  );
}
