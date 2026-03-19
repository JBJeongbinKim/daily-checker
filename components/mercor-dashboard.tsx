"use client";

import { useMemo, useState } from "react";
import { buildMercorJobUrl } from "@/lib/mercor-links";
import { normalizeMercorRate, normalizeMercorTitle } from "@/lib/mercor-normalize";
import type { MercorSnapshot, StoredMercorJob } from "@/lib/mercor-types";
import styles from "./mercor-dashboard.module.css";

type MercorDashboardProps = {
  snapshot: MercorSnapshot;
};

type RefreshResult =
  | {
      ok: true;
      totalJobs: number;
      newTodayCount: number;
      lastScrapedAt: string | null;
      snapshot: MercorSnapshot;
      message: string | null;
    }
  | {
      ok: false;
      error: string;
    };

const PAGE_SIZE = 20;

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Not refreshed yet";
  }

  const date = new Date(value);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${hours}:${minutes} ${month}/${day}`;
}

function formatShortDate(value: string) {
  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${month}/${day}`;
}

function rateValue(rate: string) {
  const matches = [...rate.matchAll(/\$?\s*([\d,]+)/g)].map((match) => Number(match[1].replace(/,/g, "")));
  return matches.length ? Math.max(...matches) : -1;
}

function compareDesc(left: string, right: string) {
  return right.localeCompare(left);
}

function sortJobs(jobs: StoredMercorJob[], today: string) {
  return [...jobs].sort((left, right) => {
    const leftIsNew = left.firstSeen === today ? 1 : 0;
    const rightIsNew = right.firstSeen === today ? 1 : 0;

    if (leftIsNew !== rightIsNew) {
      return rightIsNew - leftIsNew;
    }

    const lastSeenOrder = compareDesc(left.lastSeen, right.lastSeen);
    if (lastSeenOrder !== 0) {
      return lastSeenOrder;
    }

    const firstSeenOrder = compareDesc(left.firstSeen, right.firstSeen);
    if (firstSeenOrder !== 0) {
      return firstSeenOrder;
    }

    const hourlyRateOrder = rateValue(right.hourlyRate) - rateValue(left.hourlyRate);
    if (hourlyRateOrder !== 0) {
      return hourlyRateOrder;
    }

    return left.title.localeCompare(right.title);
  });
}

export function MercorDashboard({ snapshot }: MercorDashboardProps) {
  const [currentSnapshot, setCurrentSnapshot] = useState(snapshot);
  const [page, setPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  const sortedJobs = useMemo(() => sortJobs(currentSnapshot.jobs, today), [currentSnapshot.jobs, today]);
  const totalPages = Math.max(1, Math.ceil(sortedJobs.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedJobs = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return sortedJobs.slice(startIndex, startIndex + PAGE_SIZE);
  }, [currentPage, sortedJobs]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setStatusMessage("Refreshing Mercor listings...");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/mercor/refresh", {
        method: "POST"
      });

      const result = (await response.json()) as RefreshResult;

      if (!response.ok || !result.ok) {
        throw new Error("error" in result ? result.error : "Mercor refresh failed");
      }

      setCurrentSnapshot(result.snapshot);
      setPage(1);
      setStatusMessage(result.message ?? `Refresh complete. ${result.newTodayCount} new Mercor jobs found today.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Mercor refresh failed");
      setStatusMessage(null);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <section className={styles.shell}>
      <div className={styles.panel}>
        <div className={styles.toolbar}>
          <button className={styles.refreshButton} disabled={isRefreshing} onClick={handleRefresh} type="button">
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
          <div className={styles.metaRow}>
            <span>{formatTimestamp(currentSnapshot.lastScrapedAt)}</span>
          </div>
        </div>

        <div className={styles.status}>
          {statusMessage ? <span>{statusMessage}</span> : null}
          {errorMessage ? <span className={styles.error}>{errorMessage}</span> : null}
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Job</th>
                <th>Hourly rate</th>
                <th>First</th>
                <th>Last</th>
              </tr>
            </thead>
            <tbody>
              {pagedJobs.length ? (
                pagedJobs.map((job) => {
                  const isNewToday = job.firstSeen === today;

                  return (
                    <tr className={isNewToday ? styles.newRow : undefined} key={job.jobKey}>
                      <td>
                        <a
                          className={styles.jobLink}
                          href={buildMercorJobUrl(job.jobKey)}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {normalizeMercorTitle(job.title) || "Untitled listing"}
                        </a>
                      </td>
                      <td>{normalizeMercorRate(job.hourlyRate) || "Rate unavailable"}</td>
                      <td>{formatShortDate(job.firstSeen)}</td>
                      <td>{formatShortDate(job.lastSeen)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className={styles.empty} colSpan={4}>
                    Click Refresh to load jobs.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {sortedJobs.length ? (
          <div className={styles.pagination}>
            <button
              className={styles.pageButton}
              disabled={currentPage === 1}
              onClick={() => setPage((previous) => Math.max(1, previous - 1))}
              type="button"
            >
              Previous
            </button>
            <span className={styles.pageLabel}>
              {currentPage} / {totalPages}
            </span>
            <button
              className={styles.pageButton}
              disabled={currentPage === totalPages}
              onClick={() => setPage((previous) => Math.min(totalPages, previous + 1))}
              type="button"
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
