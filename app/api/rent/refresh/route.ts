import { NextResponse } from "next/server";
import { scrapeRentUnits } from "@/lib/rent-scraper";
import { mergeRentSnapshot } from "@/lib/rent-storage";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const units = await scrapeRentUnits();
    const result = await mergeRentSnapshot(units);

    return NextResponse.json({
      ok: true,
      snapshotDate: result.snapshotDate,
      scrapedUnitCount: result.scrapedUnitCount,
      activeUnits: result.activeUnits,
      latestSnapshotDate: result.dataset.latestSnapshotDate,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown rent refresh error",
      },
      { status: 500 },
    );
  }
}
