import { NextResponse } from "next/server";
import { scrapeMercorJobs } from "@/lib/mercor-scraper";
import { getMercorSnapshot, upsertMercorJobs } from "@/lib/mercor-storage";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    if (process.env.VERCEL || process.env.AWS_REGION || process.env.AWS_EXECUTION_ENV) {
      const snapshot = await getMercorSnapshot();

      return NextResponse.json({
        ok: true,
        totalJobs: snapshot.jobs.length,
        newTodayCount: snapshot.newTodayCount,
        lastScrapedAt: snapshot.lastScrapedAt,
        snapshot,
        message: "Mercor refresh runs automatically every day at 06:00 ET in production."
      });
    }

    const jobs = await scrapeMercorJobs();
    const { newToday } = await upsertMercorJobs(jobs);
    const snapshot = await getMercorSnapshot();

    return NextResponse.json({
      ok: true,
      totalJobs: snapshot.jobs.length,
      newTodayCount: newToday.length,
      lastScrapedAt: snapshot.lastScrapedAt,
      snapshot,
      message: null
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Mercor refresh error";

    return NextResponse.json(
      {
        ok: false,
        error: message
      },
      { status: 500 }
    );
  }
}
