import jackpotHistoryFile from "./jackpot-history.json";

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

export const jackpotHistoryData = jackpotHistoryFile as JackpotHistoryFile;
export const jackpotHistory = jackpotHistoryData.entries;
