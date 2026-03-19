"use client";

import { useEffect, useState } from "react";
import type { WorkoutDay, WorkoutProgram } from "@/lib/workout-types";
import styles from "./workout-dashboard.module.css";

type WorkoutDashboardProps = {
  program: WorkoutProgram;
};

type PaceDisplayMode = "pace" | "velocity";
type StretchTableState = Record<string, boolean>;

const stretchRows = [
  {
    label: "등",
    cells: ["Pull-up", "Neutral", "Chin-up"],
  },
  {
    label: "가슴",
    cells: ["Push-up", "Incline"],
  },
  {
    label: "어깨",
    cells: ["Arnold", "Lateral", "Front", "Rear", "OHP/BTN"],
  },
] as const;

const stretchHeaderCells = ["Odd - opposite", "Even - regular", "", "", ""] as const;
const stretchStorageKey = "workout-stretch-highlights";
const weekStorageKey = "workout-last-week-index";

function parseLapCount(value: WorkoutDay["segments"][number]["laps"]) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function formatDistance(value: number) {
  return `${value.toFixed(2)} km`;
}

function formatDurationMinutes(value: number) {
  return `${Math.round(value)} min`;
}

function paceToVelocity(pace: string) {
  const [minutesPart, secondsPart = "0"] = pace.split(":");
  const minutes = Number(minutesPart);
  const seconds = Number(secondsPart);

  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) {
    return null;
  }

  const totalMinutes = minutes + seconds / 60;
  if (totalMinutes <= 0) {
    return null;
  }

  return 60 / totalMinutes;
}

function formatVelocity(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return rounded.toFixed(1);
}

function formatPaceDisplay(pace: string | null, mode: PaceDisplayMode) {
  if (!pace) {
    return "-";
  }

  if (mode === "pace") {
    return `${pace}/km`;
  }

  const velocity = paceToVelocity(pace);
  return velocity === null ? "-" : `${formatVelocity(velocity)}`;
}

function formatPrimaryMetric(day: WorkoutDay) {
  if (day.primaryMetric.kind === "distance" && day.primaryMetric.distanceKm !== null) {
    return formatDistance(day.primaryMetric.distanceKm);
  }

  return formatDurationMinutes(day.primaryMetric.durationMinutes ?? day.totalDurationMinutes);
}

function createSegmentMetricFormatter(day: WorkoutDay) {
  return (segment: WorkoutDay["segments"][number]) => {
    if (segment.distanceKm !== null) {
      return formatDistance(segment.distanceKm);
    }

    if (segment.duration) {
      return segment.duration;
    }

    if (day.primaryMetric.kind === "duration") {
      return formatDurationMinutes(segment.durationMinutes);
    }

    return "As listed";
  };
}

function formatSegmentTitle(segment: WorkoutDay["segments"][number]) {
  const lapsPrefix = segment.laps ? `${segment.laps} x ` : "";
  return `${lapsPrefix}${segment.category ?? "Run"}`;
}

function isVisibleSegment(segment: WorkoutDay["segments"][number]) {
  return segment.category?.toLowerCase() !== "warm-up";
}

function getEffectiveSegments(day: WorkoutDay) {
  const visibleSegments = day.segments.filter(isVisibleSegment);
  let activeLaps = 1;

  return visibleSegments.map((segment) => {
    const explicitLaps = parseLapCount(segment.laps);
    if (explicitLaps !== null) {
      activeLaps = explicitLaps;
    }

    const effectiveLaps = explicitLaps ?? activeLaps;
    const effectiveDistanceKm = segment.distanceKm !== null ? segment.distanceKm * effectiveLaps : null;
    const effectiveDurationMinutes = segment.durationMinutes * effectiveLaps;

    return {
      ...segment,
      effectiveLaps,
      effectiveDurationMinutes,
      effectiveDistanceKm,
    };
  });
}

function formatDayTitle(day: WorkoutDay) {
  const effectiveSegments = getEffectiveSegments(day);
  const totalDistanceKm = effectiveSegments.reduce((sum, segment) => sum + (segment.effectiveDistanceKm ?? 0), 0);
  const focus = day.focus.toLowerCase();
  return `Day ${day.order} - ${focus} (${totalDistanceKm.toFixed(2)}km)`;
}

function shouldShowLaps(segment: ReturnType<typeof getEffectiveSegments>[number]) {
  return segment.category?.toLowerCase() !== "recovery";
}

function getCategoryClassName(category: string | null | undefined, stylesObject: typeof styles) {
  switch (category?.toLowerCase()) {
    case "10k":
      return stylesObject.category10k;
    case "mile":
      return stylesObject.categoryMile;
    case "5k":
      return stylesObject.category5k;
    case "best":
      return stylesObject.categoryBest;
    case "tempo":
      return stylesObject.categoryTempo;
    default:
      return "";
  }
}

export function WorkoutDashboard({ program }: WorkoutDashboardProps) {
  const [weekIndex, setWeekIndex] = useState(0);
  const [paceDisplayMode, setPaceDisplayMode] = useState<PaceDisplayMode>("pace");
  const [isStretchModalOpen, setIsStretchModalOpen] = useState(false);
  const [stretchHighlights, setStretchHighlights] = useState<StretchTableState>({});
  const currentWeek = program.weeks[weekIndex];

  useEffect(() => {
    try {
      const storedWeekIndex = window.localStorage.getItem(weekStorageKey);
      if (!storedWeekIndex) {
        return;
      }

      const parsedIndex = Number(storedWeekIndex);
      if (Number.isInteger(parsedIndex) && parsedIndex >= 0 && parsedIndex < program.weeks.length) {
        setWeekIndex(parsedIndex);
      }
    } catch {
      setWeekIndex(0);
    }
  }, [program.weeks.length]);

  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(stretchStorageKey);
      if (storedValue) {
        setStretchHighlights(JSON.parse(storedValue) as StretchTableState);
      }
    } catch {
      setStretchHighlights({});
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(stretchStorageKey, JSON.stringify(stretchHighlights));
    } catch {
      // Ignore storage errors so the page still works without persistence.
    }
  }, [stretchHighlights]);

  useEffect(() => {
    try {
      window.localStorage.setItem(weekStorageKey, String(weekIndex));
    } catch {
      // Ignore storage errors so the page still works without persistence.
    }
  }, [weekIndex]);

  if (!currentWeek) {
    return (
      <section className={styles.shell}>
        <div className={styles.panel}>
          <div className={styles.empty}>No running weeks were exported from the workbook yet.</div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.shell}>
      <div className={styles.panel}>
        <article className={styles.weekCard}>
          <div className={styles.weekHeader}>
            <h2 className={styles.weekTitle}>
              {currentWeek.label} / {program.weeks.length}
            </h2>

            <div className={styles.navGroup}>
              <button
                className={styles.navButton}
                disabled={weekIndex === 0}
                onClick={() => setWeekIndex((value) => Math.max(0, value - 1))}
                type="button"
              >
                Previous
              </button>
              <button
                className={styles.navButton}
                disabled={weekIndex === program.weeks.length - 1}
                onClick={() => setWeekIndex((value) => Math.min(program.weeks.length - 1, value + 1))}
                type="button"
              >
                Next
              </button>
            </div>
          </div>

          <div className={styles.dayGrid}>
            {currentWeek.days.map((day) => {
              const effectiveSegments = getEffectiveSegments(day);

              return (
                <article className={styles.dayCard} key={day.id}>
                  <div className={styles.daySummary}>
                    <span className={styles.daySummaryText}>{formatDayTitle(day)}</span>
                  </div>

                  <div className={styles.segmentTable}>
                    {effectiveSegments.map((segment, index) => (
                      <div className={styles.segmentRow} key={`${day.id}-${index}`}>
                        <span className={styles.segmentLaps}>{shouldShowLaps(segment) ? segment.effectiveLaps : ""}</span>
                        <span
                          className={`${styles.segmentCategory} ${getCategoryClassName(segment.category, styles)}`.trim()}
                        >
                          {segment.category ?? "Run"}
                        </span>
                        <button
                          className={styles.segmentPace}
                          disabled={!segment.pace}
                          onClick={() =>
                            setPaceDisplayMode((value) => (value === "pace" ? "velocity" : "pace"))
                          }
                          type="button"
                        >
                          {formatPaceDisplay(segment.pace, paceDisplayMode)}
                        </button>
                        <span className={styles.segmentMetric}>
                          {segment.distanceKm !== null
                            ? formatDistance(segment.distanceKm)
                            : segment.duration
                              ? segment.duration
                              : formatDurationMinutes(segment.effectiveDurationMinutes)}
                        </span>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </article>

        <div className={styles.footerActions}>
          <button className={styles.popupButton} onClick={() => setIsStretchModalOpen(true)} type="button">
            Workout
          </button>
        </div>
      </div>

      {isStretchModalOpen ? (
        <div className={styles.modalOverlay} onClick={() => setIsStretchModalOpen(false)} role="presentation">
          <div
            aria-modal="true"
            className={styles.modal}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className={styles.modalHeader}>
              <button className={styles.modalClose} onClick={() => setIsStretchModalOpen(false)} type="button">
                Close
              </button>
            </div>

            <div className={styles.modalTable}>
              <div className={`${styles.tableRow} ${styles.tableHeaderRow}`.trim()}>
                <span className={styles.tableLabel}>스트레칭</span>
                {stretchHeaderCells.map((cell, index) => {
                  const cellKey = `header-${index}-${cell}`;
                  const isHighlighted = cell ? stretchHighlights[cellKey] ?? true : false;

                  return cell ? (
                    <button
                      className={`${styles.tableCell} ${isHighlighted ? styles.tableCellActive : ""}`.trim()}
                      key={cellKey}
                      onClick={() =>
                        setStretchHighlights((current) => ({
                          ...current,
                          [cellKey]: !(current[cellKey] ?? true),
                        }))
                      }
                      type="button"
                    >
                      {cell}
                    </button>
                  ) : (
                    <span className={styles.tableCellEmpty} key={cellKey} />
                  );
                })}
              </div>

              {stretchRows.map((row) => (
                <div className={styles.tableRow} key={row.label}>
                  <span className={styles.tableLabel}>{row.label}</span>
                  {Array.from({ length: 5 }, (_, index) => {
                    const cell = row.cells[index] ?? "";
                    const cellKey = `${row.label}-${index}-${cell}`;
                    const isHighlighted = cell ? stretchHighlights[cellKey] ?? true : false;

                    return cell ? (
                      <button
                        className={`${styles.tableCell} ${isHighlighted ? styles.tableCellActive : ""}`.trim()}
                        key={cellKey}
                        onClick={() =>
                          setStretchHighlights((current) => ({
                            ...current,
                            [cellKey]: !(current[cellKey] ?? true),
                          }))
                        }
                        type="button"
                      >
                        {cell}
                      </button>
                    ) : (
                      <span className={styles.tableCellEmpty} key={cellKey} />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
