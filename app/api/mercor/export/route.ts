import { NextRequest, NextResponse } from "next/server";
import { getMercorSnapshot } from "@/lib/mercor-storage";
import type { StoredMercorJob } from "@/lib/mercor-types";

function escapeCsvCell(value: string) {
  const normalized = value.replace(/"/g, '""');
  return `"${normalized}"`;
}

function toCsv(jobs: StoredMercorJob[]) {
  const header = ["jobKey", "title", "hourlyRate", "url", "firstSeen", "lastSeen"];
  const rows = jobs.map((job) =>
    [job.jobKey, job.title, job.hourlyRate, job.url, job.firstSeen, job.lastSeen].map(escapeCsvCell).join(",")
  );

  return [header.join(","), ...rows].join("\n");
}

export async function GET(request: NextRequest) {
  const snapshot = await getMercorSnapshot();
  const scope = request.nextUrl.searchParams.get("scope") === "new" ? "new" : "all";
  const jobs = scope === "new" ? snapshot.newToday : snapshot.jobs;
  const filename = scope === "new" ? "mercor-jobs-new-today.csv" : "mercor-jobs-all.csv";

  return new NextResponse(toCsv(jobs), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
