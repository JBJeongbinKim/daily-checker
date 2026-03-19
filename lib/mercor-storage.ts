import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { normalizeMercorJob } from "@/lib/mercor-normalize";
import type { MercorJob, MercorSnapshot, MercorStore, StoredMercorJob } from "@/lib/mercor-types";

const STORE_PATH = path.join(process.cwd(), "data", "mercor-jobs.json");

function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

function sortJobs(jobs: StoredMercorJob[]) {
  return [...jobs].sort((left, right) => {
    if (left.firstSeen !== right.firstSeen) {
      return right.firstSeen.localeCompare(left.firstSeen);
    }

    if (left.lastSeen !== right.lastSeen) {
      return right.lastSeen.localeCompare(left.lastSeen);
    }

    return left.title.localeCompare(right.title);
  });
}

function normalizeStoredJobs(jobs: StoredMercorJob[]) {
  return jobs.map((job) => normalizeMercorJob(job));
}

async function ensureStoreFile() {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });

  try {
    await readFile(STORE_PATH, "utf8");
  } catch {
    const emptyStore: MercorStore = {
      lastScrapedAt: null,
      jobs: []
    };

    await writeFile(STORE_PATH, `${JSON.stringify(emptyStore, null, 2)}\n`, "utf8");
  }
}

export async function readMercorStore(): Promise<MercorStore> {
  await ensureStoreFile();

  const raw = await readFile(STORE_PATH, "utf8");
  const parsed = JSON.parse(raw) as Partial<MercorStore>;

  return {
    lastScrapedAt: parsed.lastScrapedAt ?? null,
    jobs: normalizeStoredJobs(Array.isArray(parsed.jobs) ? parsed.jobs : [])
  };
}

export async function writeMercorStore(store: MercorStore) {
  await ensureStoreFile();
  await writeFile(
    STORE_PATH,
    `${JSON.stringify(
      {
        ...store,
        jobs: sortJobs(store.jobs)
      },
      null,
      2
    )}\n`,
    "utf8"
  );
}

export async function upsertMercorJobs(scrapedJobs: MercorJob[]) {
  const today = getTodayIso();
  const store = await readMercorStore();
  const normalizedScrapedJobs = scrapedJobs.map((job) => normalizeMercorJob(job));
  const existingJobs = new Map(store.jobs.map((job) => [job.jobKey, job]));
  const newToday: StoredMercorJob[] = [];

  for (const job of normalizedScrapedJobs) {
    const existing = existingJobs.get(job.jobKey);

    if (existing) {
      existingJobs.set(job.jobKey, {
        ...existing,
        ...job,
        lastSeen: today
      });
      continue;
    }

    const created: StoredMercorJob = {
      ...job,
      firstSeen: today,
      lastSeen: today
    };

    existingJobs.set(job.jobKey, created);
    newToday.push(created);
  }

  const nextStore: MercorStore = {
    lastScrapedAt: new Date().toISOString(),
    jobs: sortJobs(normalizeStoredJobs([...existingJobs.values()]))
  };

  await writeMercorStore(nextStore);

  return {
    store: nextStore,
    newToday
  };
}

export async function getMercorSnapshot(): Promise<MercorSnapshot> {
  const store = await readMercorStore();
  const today = getTodayIso();
  const jobs = sortJobs(store.jobs);
  const newToday = jobs.filter((job) => job.firstSeen === today);

  return {
    lastScrapedAt: store.lastScrapedAt,
    totalJobs: jobs.length,
    newTodayCount: newToday.length,
    jobs,
    newToday
  };
}
