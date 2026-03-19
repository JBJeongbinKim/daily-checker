export type MercorJob = {
  jobKey: string;
  title: string;
  hourlyRate: string;
  url: string;
};

export type StoredMercorJob = MercorJob & {
  firstSeen: string;
  lastSeen: string;
};

export type MercorStore = {
  lastScrapedAt: string | null;
  jobs: StoredMercorJob[];
};

export type MercorSnapshot = {
  lastScrapedAt: string | null;
  totalJobs: number;
  newTodayCount: number;
  jobs: StoredMercorJob[];
  newToday: StoredMercorJob[];
};
