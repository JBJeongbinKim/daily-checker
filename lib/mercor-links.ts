const MERCOR_EXPLORE_BASE_URL = "https://work.mercor.com/explore";

export function buildMercorJobUrl(jobKey: string) {
  return `${MERCOR_EXPLORE_BASE_URL}?listingId=${encodeURIComponent(jobKey)}`;
}
