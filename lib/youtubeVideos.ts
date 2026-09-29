export type YouTubeVideo = {
  id: string; reportType: "asset" | "lotListing"; reportId: string; lotNumber: string;
  status: "uploading" | "private" | "public" | "needs_attention";
  url: string | null; lastError: string | null; updatedAt: string; retryEligible: boolean;
};
export type YouTubeVideoPage = { items: YouTubeVideo[]; page: number; total: number; totalPages: number };
const invalid = () => new Error("Video status could not be verified. Refresh to try again.");
export const isYouTubeVideoId = (value: string) => /^[a-f0-9]{64}$/.test(value);
export function youtubeVideoQuery(params: URLSearchParams): string {
  if ([...params.keys()].some(key => key !== "page") || params.getAll("page").length > 1) throw invalid();
  const page = params.get("page") || "1";
  if (!/^[1-9]\d{0,4}$/.test(page) || Number(page) > 10_000) throw invalid();
  return `page=${page}`;
}
export function youtubeVideoRetryBody(input: Record<string, unknown>): { updatedAt: string } {
  if (Object.keys(input).length !== 1 || typeof input.updatedAt !== "string" || input.updatedAt.length > 50 || !/^\d{4}-\d\d-\d\dT/.test(input.updatedAt) || !Number.isFinite(Date.parse(input.updatedAt))) throw new Error("Refresh this video before retrying publication.");
  return { updatedAt: input.updatedAt };
}
export function parseYouTubeVideoPage(value: unknown): YouTubeVideoPage {
  if (!value || typeof value !== "object") throw invalid();
  const data = value as Record<string, unknown>;
  if (!Array.isArray(data.items) || data.items.length > 20 || !Number.isSafeInteger(data.page) || (data.page as number) < 1 || !Number.isSafeInteger(data.total) || (data.total as number) < 0 || !Number.isSafeInteger(data.totalPages) || (data.totalPages as number) < 0) throw invalid();
  const items = data.items.map((item): YouTubeVideo => {
    if (!item || typeof item !== "object") throw invalid();
    const row = item as Record<string, unknown>;
    if (typeof row.id !== "string" || !isYouTubeVideoId(row.id) || !["asset", "lotListing"].includes(String(row.reportType)) || typeof row.reportId !== "string" || !/^[a-f\d]{24}$/i.test(row.reportId) || typeof row.lotNumber !== "string" || row.lotNumber.length > 200 || !["uploading", "private", "public", "needs_attention"].includes(String(row.status)) || typeof row.retryEligible !== "boolean") throw invalid();
    const updatedAt = youtubeVideoRetryBody({ updatedAt: row.updatedAt }).updatedAt;
    if (row.url !== null && (typeof row.url !== "string" || !/^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}$/.test(row.url) || row.status !== "public")) throw invalid();
    if (row.lastError !== null && (typeof row.lastError !== "string" || row.lastError.length > 2000 || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(row.lastError))) throw invalid();
    return { id: row.id, reportType: row.reportType as YouTubeVideo["reportType"], reportId: row.reportId, lotNumber: row.lotNumber, status: row.status as YouTubeVideo["status"], url: row.url as string | null, lastError: row.lastError as string | null, updatedAt, retryEligible: row.retryEligible };
  });
  return { items, page: data.page as number, total: data.total as number, totalPages: data.totalPages as number };
}
