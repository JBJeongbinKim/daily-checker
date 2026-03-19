import chromiumBundle from "@sparticuz/chromium";
import { buildMercorJobUrl } from "@/lib/mercor-links";
import { normalizeMercorJob, normalizeMercorRate, normalizeMercorTitle } from "@/lib/mercor-normalize";
import type { MercorJob } from "@/lib/mercor-types";
import { chromium as playwrightChromium } from "playwright";
import { chromium as playwrightCoreChromium } from "playwright-core";

const BASE_URL = "https://work.mercor.com";
const EXPLORE_URL = `${BASE_URL}/explore`;

function isHostedRuntime() {
  return Boolean(process.env.VERCEL || process.env.AWS_REGION || process.env.AWS_EXECUTION_ENV);
}

async function launchMercorBrowser() {
  if (isHostedRuntime()) {
    const executablePath = await chromiumBundle.executablePath();

    return playwrightCoreChromium.launch({
      args: chromiumBundle.args,
      executablePath,
      headless: true
    });
  }

  return playwrightChromium.launch({ headless: true });
}

function cleanTitle(text: string) {
  if (!text) {
    return "";
  }

  const firstLine = text.split("\n")[0]?.trim() ?? "";
  const beforeRate = firstLine.split(/\$\s*[\d,]+/, 1)[0] ?? firstLine;
  return normalizeMercorTitle(beforeRate);
}

function listingIdFromHref(href: string) {
  try {
    const url = new URL(href, BASE_URL);
    return url.searchParams.get("listingId") ?? "";
  } catch {
    return "";
  }
}

function extractRate(text: string) {
  return normalizeMercorRate(text);
}

export async function scrapeMercorJobs(): Promise<MercorJob[]> {
  const browser = await launchMercorBrowser();
  const context = await browser.newContext({
    userAgent: [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "AppleWebKit/537.36 (KHTML, like Gecko)",
      "Chrome/122.0.0.0 Safari/537.36"
    ].join(" ")
  });
  const page = await context.newPage();
  const jobs = new Map<string, MercorJob>();

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

      const rawText = ((await card.evaluate((element) => element.textContent || "")) as string).trim();
      const hourlyRate = extractRate(rawText);

      jobs.set(jobKey, normalizeMercorJob({
        jobKey,
        title: cleanTitle(rawText),
        hourlyRate,
        url: buildMercorJobUrl(jobKey)
      }));
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
