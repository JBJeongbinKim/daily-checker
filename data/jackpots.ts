import jackpotHistoryFile from "./jackpot-history.json";
import jackpotStatusFile from "./jackpot-status.json";

export type JackpotPoint = {
  date: string;
  megamillions: number;
  megamillionsCash: number;
  powerball: number;
  powerballCash: number;
  source: "seed" | "official";
};

export type JackpotHistoryFile = {
  updatedAt: string;
  entries: JackpotPoint[];
};

export type JackpotRefreshState = "success" | "failed";

export type JackpotStatusFile = {
  state: JackpotRefreshState;
  lastAttemptedAt: string;
  lastSuccessfulAt: string;
  latestEntryDate: string | null;
  errorMessage: string | null;
};

export const jackpotHistoryData = jackpotHistoryFile as JackpotHistoryFile;
export const jackpotStatusData = jackpotStatusFile as JackpotStatusFile;
export const jackpotHistory = jackpotHistoryData.entries;
