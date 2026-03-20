import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RentDataset, RentUnit } from "@/lib/rent-types";

const rentDataPath = path.join(process.cwd(), "data", "rent-history.json");
const rentSourceFile = "data/Rent.xlsx";
const rentSourceUrl = "https://verisresidential.com/jersey-city-nj-apartments/the-blvd-collection/";

type ScrapedRentUnit = {
  buildingId: string;
  layoutId: string;
  typeLabel: string;
  unitNumber: string;
  availabilityDate: string | null;
  price: number;
};

function getTodayInNewYork() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function createUnitId(buildingId: string, unitNumber: string) {
  return `${buildingId}-${unitNumber}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function normalizeUnitNumber(unitNumber: string) {
  return unitNumber.trim().replace(/^(MN|MS)-/i, "");
}

function normalizeLayoutId(layoutId: string) {
  const candidates = layoutId
    .split(",")
    .map((part) => part.trim().replace(/^B\d+\s+/i, ""))
    .filter(Boolean);

  for (const candidate of candidates) {
    const normalizedCandidate = candidate.replace(/^M(?=[A-Z]\d+)/i, "");
    const match = normalizedCandidate.match(/^([A-Z]\d+)/i);
    if (match) {
      return match[1].toUpperCase();
    }
  }

  return layoutId.trim().toUpperCase();
}

function isThursday(snapshotDate: string) {
  return new Date(`${snapshotDate}T00:00:00`).getDay() === 4;
}

function sortUnits(units: RentUnit[]) {
  return [...units].sort((left, right) => {
    if (left.buildingId !== right.buildingId) {
      return left.buildingId.localeCompare(right.buildingId);
    }

    if (left.layoutId !== right.layoutId) {
      return left.layoutId.localeCompare(right.layoutId);
    }

    return left.unitNumber.localeCompare(right.unitNumber, undefined, { numeric: true });
  });
}

function ensureSnapshot(dataset: RentDataset, snapshotDate: string) {
  if (!dataset.snapshotDates.includes(snapshotDate)) {
    dataset.snapshotDates = [...dataset.snapshotDates, snapshotDate].sort();
  }
}

function canonicalizeUnits(units: RentUnit[]) {
  const merged = new Map<string, RentUnit>();

  for (const unit of units) {
    const normalizedUnitNumber = normalizeUnitNumber(unit.unitNumber);
    const normalizedId = createUnitId(unit.buildingId, normalizedUnitNumber);
    const existing = merged.get(normalizedId);

    if (!existing) {
      merged.set(normalizedId, {
        ...unit,
        id: normalizedId,
        layoutId: normalizeLayoutId(unit.layoutId),
        unitNumber: normalizedUnitNumber,
      });
      continue;
    }

    const snapshotsByDate = new Map(existing.snapshots.map((snapshot) => [snapshot.date, snapshot]));
    for (const snapshot of unit.snapshots) {
      snapshotsByDate.set(snapshot.date, snapshot);
    }

    merged.set(normalizedId, {
      ...existing,
      ...unit,
      id: normalizedId,
      layoutId: normalizeLayoutId(unit.layoutId),
      unitNumber: normalizedUnitNumber,
      availabilityDate: existing.availabilityDate ?? unit.availabilityDate,
      snapshots: [...snapshotsByDate.values()],
    });
  }

  return [...merged.values()];
}

function recalculateDataset(dataset: RentDataset) {
  const units = sortUnits(
    canonicalizeUnits(dataset.units).map((unit) => {
      const snapshots = [...unit.snapshots].sort((left, right) => left.date.localeCompare(right.date));
      const firstSnapshot = snapshots[0] ?? null;
      const lastSnapshot = snapshots.at(-1) ?? null;
      const currentPrice = lastSnapshot?.price ?? null;
      const initialPrice = firstSnapshot?.price ?? null;
      const availabilityDate = unit.availabilityDate ?? firstSnapshot?.date ?? null;

      return {
        ...unit,
        availabilityDate,
        firstSeen: firstSnapshot?.date ?? null,
        lastSeen: lastSnapshot?.date ?? null,
        currentPrice,
        initialPrice,
        changeSinceFirst:
          currentPrice !== null && initialPrice !== null ? currentPrice - initialPrice : null,
        snapshotCount: snapshots.length,
        status: lastSnapshot && dataset.latestSnapshotDate && lastSnapshot.date === dataset.latestSnapshotDate ? "active" : "inactive",
        snapshots,
      };
    }),
  );

  return {
    ...dataset,
    units,
    totals: {
      units: units.length,
      activeUnits: units.filter((unit) => unit.status === "active").length,
      inactiveUnits: units.filter((unit) => unit.status === "inactive").length,
      snapshots: units.reduce((sum, unit) => sum + unit.snapshotCount, 0),
    },
  };
}

export async function getRentDataset(): Promise<RentDataset> {
  const raw = await readFile(rentDataPath, "utf-8");
  return JSON.parse(raw) as RentDataset;
}

export async function writeRentDataset(dataset: RentDataset) {
  await mkdir(path.dirname(rentDataPath), { recursive: true });
  await writeFile(rentDataPath, `${JSON.stringify(recalculateDataset(dataset), null, 2)}\n`, "utf8");
}

export async function mergeRentSnapshot(scrapedUnits: ScrapedRentUnit[], snapshotDate = getTodayInNewYork()) {
  const dataset = await getRentDataset();
  const unitsById = new Map(
    canonicalizeUnits(dataset.units).map((unit) => [
      createUnitId(unit.buildingId, normalizeUnitNumber(unit.unitNumber)),
      unit,
    ]),
  );

  ensureSnapshot(dataset, snapshotDate);
  dataset.latestSnapshotDate = snapshotDate;
  dataset.generatedAt = new Date().toISOString();
  dataset.sourceFile = rentSourceFile;
  dataset.sourceUrl = rentSourceUrl;

  for (const scrapedUnit of scrapedUnits) {
    const normalizedUnitNumber = normalizeUnitNumber(scrapedUnit.unitNumber);
    const unitId = createUnitId(scrapedUnit.buildingId, normalizedUnitNumber);
    const existingUnit = unitsById.get(unitId);

    if (!existingUnit) {
      unitsById.set(unitId, {
        id: unitId,
        buildingId: scrapedUnit.buildingId,
        layoutId: normalizeLayoutId(scrapedUnit.layoutId),
        typeLabel: scrapedUnit.typeLabel,
        unitNumber: normalizedUnitNumber,
        availabilityDate: scrapedUnit.availabilityDate,
        status: "active",
        firstSeen: snapshotDate,
        lastSeen: snapshotDate,
        currentPrice: scrapedUnit.price,
        initialPrice: scrapedUnit.price,
        changeSinceFirst: 0,
        snapshotCount: 1,
        snapshots: [
          {
            date: snapshotDate,
            price: scrapedUnit.price,
            isThursday: isThursday(snapshotDate),
          },
        ],
      });
      continue;
    }

    const snapshots = existingUnit.snapshots.filter((snapshot) => snapshot.date !== snapshotDate);
    snapshots.push({
      date: snapshotDate,
      price: scrapedUnit.price,
      isThursday: isThursday(snapshotDate),
    });

    unitsById.set(unitId, {
      ...existingUnit,
      buildingId: scrapedUnit.buildingId,
      layoutId: normalizeLayoutId(scrapedUnit.layoutId),
      typeLabel: scrapedUnit.typeLabel,
      unitNumber: normalizedUnitNumber,
      availabilityDate: scrapedUnit.availabilityDate,
      snapshots,
    });
  }

  const nextDataset = recalculateDataset({
    ...dataset,
    units: [...unitsById.values()],
  });

  await writeRentDataset(nextDataset);

  return {
    dataset: nextDataset,
    snapshotDate,
    scrapedUnitCount: scrapedUnits.length,
    activeUnits: nextDataset.totals.activeUnits,
  };
}
