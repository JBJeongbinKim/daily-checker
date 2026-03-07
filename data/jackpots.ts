export type JackpotPoint = {
  date: string;
  megamillions: number;
  megamillionsCash: number;
  powerball: number;
  powerballCash: number;
};

export const jackpotHistory: JackpotPoint[] = [
  { date: "2025-12-12", megamillions: 165, megamillionsCash: 74, powerball: 110, powerballCash: 49 },
  { date: "2025-12-19", megamillions: 197, megamillionsCash: 88, powerball: 139, powerballCash: 61 },
  { date: "2025-12-26", megamillions: 228, megamillionsCash: 101, powerball: 174, powerballCash: 76 },
  { date: "2026-01-02", megamillions: 262, megamillionsCash: 116, powerball: 201, powerballCash: 88 },
  { date: "2026-01-09", megamillions: 301, megamillionsCash: 134, powerball: 236, powerballCash: 103 },
  { date: "2026-01-16", megamillions: 338, megamillionsCash: 151, powerball: 267, powerballCash: 116 },
  { date: "2026-01-23", megamillions: 382, megamillionsCash: 171, powerball: 306, powerballCash: 133 },
  { date: "2026-01-30", megamillions: 421, megamillionsCash: 188, powerball: 348, powerballCash: 152 },
  { date: "2026-02-06", megamillions: 460, megamillionsCash: 205, powerball: 392, powerballCash: 171 },
  { date: "2026-02-13", megamillions: 515, megamillionsCash: 230, powerball: 430, powerballCash: 188 },
  { date: "2026-02-20", megamillions: 578, megamillionsCash: 258, powerball: 472, powerballCash: 207 },
  { date: "2026-02-27", megamillions: 644, megamillionsCash: 288, powerball: 516, powerballCash: 226 },
  { date: "2026-03-01", megamillions: 668, megamillionsCash: 299, powerball: 531, powerballCash: 232 },
  { date: "2026-03-02", megamillions: 684, megamillionsCash: 306, powerball: 544, powerballCash: 238 },
  { date: "2026-03-03", megamillions: 703, megamillionsCash: 315, powerball: 559, powerballCash: 245 },
  { date: "2026-03-04", megamillions: 728, megamillionsCash: 326, powerball: 571, powerballCash: 251 },
  { date: "2026-03-05", megamillions: 751, megamillionsCash: 336, powerball: 588, powerballCash: 258 },
  { date: "2026-03-06", megamillions: 779, megamillionsCash: 349, powerball: 603, powerballCash: 265 }
];
