export type WorkoutSegment = {
  laps: number | string | null;
  category: string | null;
  pace: string | null;
  distanceKm: number | null;
  duration: string | null;
  durationMinutes: number;
};

export type WorkoutDay = {
  id: string;
  order: number;
  label: string;
  focus: string;
  paceSummary: string;
  totalDistanceKm: number;
  totalDurationMinutes: number;
  primaryMetric: {
    kind: "distance" | "duration";
    distanceKm: number | null;
    durationMinutes: number | null;
  };
  segments: WorkoutSegment[];
};

export type WorkoutWeek = {
  id: string;
  label: string;
  order: number;
  days: WorkoutDay[];
};

export type WorkoutProgram = {
  generatedAt: string;
  sourceFile: string;
  sheetName: string;
  weekCount: number;
  weeks: WorkoutWeek[];
};
