import { readFile, writeFile } from "node:fs/promises";

function parseAmountToMillions(raw, unit) {
  const numeric = Number(raw.replace(/,/g, ""));
  if (Number.isNaN(numeric)) {
    throw new Error(`Unable to parse amount: ${raw}`);
  }

  return unit.toLowerCase().startsWith("b") ? numeric * 1000 : numeric;
}

function getEasternDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

async function fetchPowerball() {
  const response = await fetch("https://www.powerball.com/", {
    headers: {
      "user-agent": "daily-checker-bot/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Powerball request failed: ${response.status}`);
  }

  const html = await response.text();
  const nextDrawingBlock = html.match(/<div class="col" id="next-drawing">[\s\S]*?<div class="col" id="winners">/i);

  if (!nextDrawingBlock) {
    throw new Error("Unable to locate Powerball next drawing block.");
  }

  const block = nextDrawingBlock[0];
  const drawDateMatch = block.match(/title-date">([^<]+)</i);
  const jackpotMatch = block.match(/Estimated Jackpot[\s\S]*?game-jackpot-number[^>]*>\$([\d.,]+)\s*(Million|Billion)</i);
  const cashMatch = block.match(/Cash Value[\s\S]*?game-jackpot-number[^>]*>\$([\d.,]+)\s*(Million|Billion)</i);

  if (!drawDateMatch || !jackpotMatch || !cashMatch) {
    throw new Error("Unable to parse Powerball values from homepage markup.");
  }

  return {
    drawDateLabel: drawDateMatch[1].trim(),
    jackpotMillions: parseAmountToMillions(jackpotMatch[1], jackpotMatch[2]),
    cashMillions: parseAmountToMillions(cashMatch[1], cashMatch[2])
  };
}

async function fetchMegaMillions() {
  const response = await fetch("https://www.megamillions.com/CMSPages/UtilService.asmx/GetLatestDrawData", {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
      "user-agent": "daily-checker-bot/1.0"
    },
    body: "{}"
  });

  if (!response.ok) {
    throw new Error(`Mega Millions request failed: ${response.status}`);
  }

  const payload = await response.json();
  const data = JSON.parse(payload.d);

  if (!data?.Jackpot?.NextPrizePool || !data?.Jackpot?.NextCashValue) {
    throw new Error("Mega Millions response did not include next jackpot values.");
  }

  return {
    drawDateIso: data.NextDrawingDate,
    jackpotMillions: Number(data.Jackpot.NextPrizePool) / 1000000,
    cashMillions: Number(data.Jackpot.NextCashValue) / 1000000
  };
}

function sortEntries(entries) {
  return [...entries].sort((left, right) => left.date.localeCompare(right.date));
}

async function main() {
  const historyPath = new URL("../data/jackpot-history.json", import.meta.url);
  const history = JSON.parse(await readFile(historyPath, "utf8"));
  const [megamillions, powerball] = await Promise.all([fetchMegaMillions(), fetchPowerball()]);
  const today = getEasternDateString();

  const nextEntry = {
    date: today,
    megamillions: Number(megamillions.jackpotMillions.toFixed(1)),
    megamillionsCash: Number(megamillions.cashMillions.toFixed(1)),
    powerball: Number(powerball.jackpotMillions.toFixed(1)),
    powerballCash: Number(powerball.cashMillions.toFixed(1)),
    source: "official"
  };

  const filteredEntries = history.entries.filter((entry) => entry.date !== today);
  const entries = sortEntries([...filteredEntries, nextEntry]);
  const nextHistory = {
    updatedAt: new Date().toISOString(),
    entries
  };

  await writeFile(historyPath, `${JSON.stringify(nextHistory, null, 2)}\n`, "utf8");

  console.log(JSON.stringify({
    status: "ok",
    storedDate: today,
    megamillions,
    powerball
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
