import { buildMercorJobUrl } from "@/lib/mercor-links";
import type { MercorJob, StoredMercorJob } from "@/lib/mercor-types";

function normalizeSpacing(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeMercorTitle(title: string) {
  if (!title) {
    return "";
  }

  return normalizeSpacing(
    title
      .replace(/Apply(?:\s+Talent\s+network)?(?:\s+\d+\s+hired\s+this\s+month)?$/i, "")
      .replace(/\s+Talent\s+network$/i, "")
  );
}

export function normalizeMercorRate(rate: string) {
  if (!rate) {
    return "";
  }

  const cleaned = normalizeSpacing(rate);
  const hourlyMatch = cleaned.match(/(\$\s*[\d,]+(?:\s*-\s*\$?\s*[\d,]+)?)\s*\/\s*(?:hr|hour)\b/i);

  if (hourlyMatch) {
    return normalizeSpacing(hourlyMatch[1] ?? "");
  }

  const taskMatch = cleaned.match(/(\$\s*[\d,]+(?:\s*-\s*\$?\s*[\d,]+)?)\s*(?:\/\s*task|\bby\s+task\b)/i);

  if (taskMatch) {
    const amount = normalizeSpacing(taskMatch[1] ?? "");
    return amount ? `${amount} by task` : "";
  }

  const plainAmountMatch = cleaned.match(/^\$\s*[\d,]+(?:\s*-\s*\$?\s*[\d,]+)?$/);
  return plainAmountMatch ? normalizeSpacing(plainAmountMatch[0]) : "";
}

export function normalizeMercorJob<T extends MercorJob | StoredMercorJob>(job: T): T {
  return {
    ...job,
    title: normalizeMercorTitle(job.title),
    hourlyRate: normalizeMercorRate(job.hourlyRate),
    url: buildMercorJobUrl(job.jobKey)
  };
}
