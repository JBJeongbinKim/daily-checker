import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const BASE_URL = "https://work.mercor.com";
const EXPLORE_URL = `${BASE_URL}/explore`;
const STORE_PATH = new URL("../data/mercor-jobs.json", import.meta.url);

function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

function buildMercorJobUrl(jobKey) {
  return `${EXPLORE_URL}?listingId=${encodeURIComponent(jobKey)}`;
}

function normalizeSpacing(value) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeMercorTitle(title) {
  if (!title) {
    return "";
  }

  return normalizeSpacing(
    title
      .replace(/Apply(?:\s+Talent\s+network)?(?:\s+\d+\s+hired\s+this\s+month)?$/i, "")
      .replace(/\s+Talent\s+network$/i, "")
  );
}

function normalizeMercorRate(rate) {
  if (!rate) {
    return "";
  }

  const cleaned = normalizeSpacing(rate);
  const hourlyMatch = cleaned.match(/(\$\s*[\d,]+(?:\s*-\s*\$?\s*[\d,]+)?)\s*\/\s*(?:hr|hour)\b/i);
  if (hourlyMatch) {
    return normalizeSpacing(hourlyMatch[1] ?? "");
  }

  const taskMatch = cleaned.match(/(\$\s*[\d,]+(?:\s*-\s*\$?\s*[\d,]+)?)\s*(?:\/\s*task|\bby\s+task\b)/i);
  if (taskMatch) {
    const amount = normalizeSpacing(taskMatch[1] ?? "");
    return amount ? `${amount} by task` : "";
  }

  const plainAmountMatch = cleaned.match(/^\$\s*[\d,]+(?:\s*-\s*\$?\s*[\d,]+)?$/);
  return plainAmountMatch ? normalizeSpacing(plainAmountMatch[0]) : "";
}

function normalizeMercorJob(job) {
  return {
    ...job,
    title: normalizeMercorTitle(job.title),
    hourlyRate: normalizeMercorRate(job.hourlyRate),
    url: buildMercorJobUrl(job.jobKey)
  };
}

function sortJobs(jobs) {
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

async function readStore() {
  const raw = await readFile(STORE_PATH, "utf8");
  const parsed = JSON.parse(raw);

  return {
    lastScrapedAt: parsed.lastScrapedAt ?? null,
    jobs: Array.isArray(parsed.jobs) ? parsed.jobs.map(normalizeMercorJob) : []
  };
}

async function writeStore(store) {
  await writeFile(
    STORE_PATH,
    `${JSON.stringify({ ...store, jobs: sortJobs(store.jobs) }, null, 2)}\n`,
    "utf8"
  );
}

function cleanTitle(text) {
  if (!text) {
    return "";
  }

  const firstLine = text.split("\n")[0]?.trim() ?? "";
  const beforeRate = firstLine.split(/\$\s*[\d,]+/, 1)[0] ?? firstLine;
  return normalizeMercorTitle(beforeRate);
}

function extractRate(text) {
  return normalizeMercorRate(text);
}

function listingIdFromHref(href) {
  try {
    const url = new URL(href, BASE_URL);
    return url.searchParams.get("listingId") ?? "";
  } catch {
    return "";
  }
}

async function scrapeMercorJobs() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "AppleWebKit/537.36 (KHTML, like Gecko)",
      "Chrome/122.0.0.0 Safari/537.36"
    ].join(" ")
  });
  const page = await context.newPage();
  const jobs = new Map();

  const collectCurrentView = async () => {
    const cards = page.locator('a[href^="/explore?listingId="]');
    const count = await cards.count();

    for (let index = 0; index < count; index += 1) {
      const card = cards.nth(index);
      const href = await card.getAttribute("href");
      if (!href) {
        continue;
      }

      const jobKey = listingIdFromHref(href);
      if (!jobKey || jobs.has(jobKey)) {
        continue;
      }

      const rawText = ((await card.evaluate((element) => element.textContent || "")) ?? "").trim();

      jobs.set(
        jobKey,
        normalizeMercorJob({
          jobKey,
          title: cleanTitle(rawText),
          hourlyRate: extractRate(rawText),
          url: buildMercorJobUrl(jobKey)
        })
      );
    }
  };

  const scrollToLoadMore = async (maxRounds = 30) => {
    let previousCount = -1;
    let stableRounds = 0;

    for (let round = 0; round < maxRounds; round += 1) {
      await collectCurrentView();
      const visibleCount = await page.locator('a[href^="/explore?listingId="]').count();

      if (visibleCount === previousCount) {
        stableRounds += 1;
      } else {
        stableRounds = 0;
      }

      if (stableRounds >= 3) {
        break;
      }

      previousCount = visibleCount;
      await page.mouse.wheel(0, 3000);
      await page.waitForTimeout(700);
    }
  };

  const clickNextIfPossible = async () => {
    const candidates = [
      page.getByRole("button", { name: /^next$/i }),
      page.getByRole("button", { name: /next/i }),
      page.locator('button:has-text("Next")'),
      page.locator('[aria-label*="Next" i]')
    ];

    for (const candidate of candidates) {
      if ((await candidate.count()) === 0) {
        continue;
      }

      const button = candidate.first();

      try {
        if (await button.isDisabled()) {
          return false;
        }

        await button.click();
        await page.waitForLoadState("networkidle", { timeout: 60_000 });
        await page.waitForTimeout(1_200);
        return true;
      } catch {
        continue;
      }
    }

    return false;
  };

  try {
    await page.goto(EXPLORE_URL, { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForTimeout(1_500);

    for (let pageIndex = 0; pageIndex < 200; pageIndex += 1) {
      await scrollToLoadMore();
      if (!(await clickNextIfPossible())) {
        break;
      }
    }

    await collectCurrentView();
    return [...jobs.values()];
  } finally {
    await browser.close();
  }
}

async function main() {
  const today = getTodayIso();
  const store = await readStore();
  const scrapedJobs = await scrapeMercorJobs();
  const existingJobs = new Map(store.jobs.map((job) => [job.jobKey, job]));
  const newToday = [];

  for (const job of scrapedJobs) {
    const existing = existingJobs.get(job.jobKey);

    if (existing) {
      existingJobs.set(job.jobKey, {
        ...existing,
        ...job,
        lastSeen: today
      });
      continue;
    }

    const created = {
      ...job,
      firstSeen: today,
      lastSeen: today
    };

    existingJobs.set(job.jobKey, created);
    newToday.push(created);
  }

  const nextStore = {
    lastScrapedAt: new Date().toISOString(),
    jobs: sortJobs([...existingJobs.values()].map(normalizeMercorJob))
  };

  await writeStore(nextStore);

  console.log(JSON.stringify({
    totalJobs: nextStore.jobs.length,
    newTodayCount: newToday.length,
    lastScrapedAt: nextStore.lastScrapedAt
  }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
