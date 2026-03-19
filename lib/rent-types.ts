export type RentSnapshot = {
  date: string;
  price: number;
  isThursday: boolean;
};

export type RentUnit = {
  id: string;
  buildingId: string;
  layoutId: string;
  typeLabel: string;
  unitNumber: string;
  availabilityDate: string | null;
  status: "active" | "inactive";
  firstSeen: string | null;
  lastSeen: string | null;
  currentPrice: number | null;
  initialPrice: number | null;
  changeSinceFirst: number | null;
  snapshotCount: number;
  snapshots: RentSnapshot[];
};

export type RentDataset = {
  generatedAt: string;
  sourceFile: string;
  sourceUrl: string;
  latestSnapshotDate: string | null;
  snapshotDates: string[];
  totals: {
    units: number;
    activeUnits: number;
    inactiveUnits: number;
    snapshots: number;
  };
  units: RentUnit[];
};
