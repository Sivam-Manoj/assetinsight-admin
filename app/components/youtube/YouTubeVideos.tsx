"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Box, Button, Chip, Divider, Link, Paper, Stack, Typography } from "@mui/material";
import { RefreshCw } from "lucide-react";
import { parseYouTubeVideoPage, type YouTubeVideo, type YouTubeVideoPage } from "@/lib/youtubeVideos";

const labels = { uploading: "Uploading", private: "Private", public: "Public", needs_attention: "Needs attention" } as const;
export default function YouTubeVideos() {
  const [data, setData] = useState<YouTubeVideoPage | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [fresh, setFresh] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const read = useRef<AbortController | null>(null);
  const pending = useRef(false);
  const mounted = useRef(true);
  const load = useCallback(async () => {
    read.current?.abort(); const controller = new AbortController(); read.current = controller;
    setLoading(true); setFresh(false); setError("");
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch(`/api/admin/youtube/videos?page=${page}`, { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error("Video status is unavailable. Refresh to try again.");
      const value = parseYouTubeVideoPage(await response.json());
      if (mounted.current && read.current === controller) { setData(value); setCheckedAt(new Date()); setFresh(true); }
    } catch (cause) {
      if (mounted.current && read.current === controller) setError(cause instanceof Error && cause.name !== "AbortError" ? cause.message : "The video status check timed out. Refresh to try again.");
    } finally { window.clearTimeout(timeout); if (mounted.current && read.current === controller) setLoading(false); }
  }, [page]);
  useEffect(() => { mounted.current = true; void load(); return () => { mounted.current = false; read.current?.abort(); read.current = null; }; }, [load]);
  async function retry(video: YouTubeVideo) {
    if (pending.current || !fresh || !video.retryEligible) return;
    pending.current = true; setBusyId(video.id); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/admin/youtube/videos/${video.id}/retry-publication`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ updatedAt: video.updatedAt }), signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error("Publication retry was not accepted. Refresh and check the report release and channel connection.");
      if (mounted.current) { setNotice("Publication retry requested. Refresh video status to see the confirmed outcome."); await load(); }
    } catch (cause) {
      if (mounted.current) { setFresh(false); setError(cause instanceof Error && cause.name !== "TimeoutError" ? cause.message : "The retry response could not be confirmed. Refresh before trying again."); }
    } finally { pending.current = false; if (mounted.current) setBusyId(""); }
  }
  return <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }} aria-busy={loading || Boolean(busyId)}>
    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} flexWrap="wrap" mb={1}>
      <Typography component="h2" variant="h6" fontSize={18}>Video publication</Typography>
      <Button size="small" color="inherit" startIcon={<RefreshCw size={15} />} disabled={loading || Boolean(busyId)} onClick={() => void load()}>Refresh videos</Button>
    </Stack>
    <Typography variant="body2" color="text.secondary" mb={1.5}>Public means confirmed by YouTube. Private videos may be awaiting release or Google eligibility. Publication retry updates an existing video; it never uploads a second copy.</Typography>
    {error ? <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert> : null}
    {notice ? <Alert severity="info" sx={{ mb: 1.5 }}>{notice}</Alert> : null}
    {loading && !data ? <Typography role="status" color="text.secondary">Loading video status…</Typography> : data?.items.length === 0 ? <Typography color="text.secondary" variant="body2">No report videos have been prepared for YouTube.</Typography> : null}
    <Stack component="ul" sx={{ listStyle: "none", p: 0, m: 0 }} divider={<Divider component="li" aria-hidden />}>
      {data?.items.map(video => <Box component="li" key={video.id} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0,1fr) 110px minmax(0,1.6fr) auto" }, gap: { xs: 1, md: 2 }, py: 1.5, alignItems: "start", minWidth: 0 }}>
        <Box sx={{ minWidth: 0, overflowWrap: "anywhere" }}><Typography fontWeight={650} variant="body2">{video.lotNumber ? `Lot ${video.lotNumber}` : "Report video"}</Typography><Typography variant="caption" color="text.secondary" display="block">{video.reportType === "asset" ? "Asset" : "Lot Listing"} · {video.reportId}</Typography></Box>
        <Chip size="small" variant="outlined" sx={{ justifySelf: "start", color: "text.primary" }} color={video.status === "needs_attention" ? "warning" : video.status === "public" ? "success" : "default"} label={labels[video.status]} />
        <Box sx={{ minWidth: 0, overflowWrap: "anywhere" }}><Typography variant="body2">{video.lastError || (video.status === "public" ? "Publication confirmed." : video.status === "private" ? "Not publicly available yet." : "Status will update after processing.")}</Typography>{video.status === "needs_attention" && !video.retryEligible ? <Typography variant="caption" color="text.secondary">Review the report before resubmitting an upload. If the final upload result is uncertain, check YouTube Studio before attempting another upload.</Typography> : null}<Typography variant="caption" color="text.secondary" display="block">Updated {new Date(video.updatedAt).toLocaleString()}</Typography></Box>
        <Box>{video.url ? <Link href={video.url} color="inherit" rel="noopener noreferrer" target="_blank" fontSize={14}>Open video</Link> : video.retryEligible ? <Button size="small" color="inherit" variant="outlined" disabled={!fresh || Boolean(busyId)} onClick={() => void retry(video)}>{busyId === video.id ? "Requesting…" : "Retry publication"}</Button> : null}</Box>
      </Box>)}
    </Stack>
    <Stack mt={1.5} gap={1} direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} justifyContent="space-between">
      <Typography variant="caption" color="text.secondary">Last checked: {checkedAt ? checkedAt.toLocaleString() : "Not yet checked"}{!fresh && checkedAt ? " · Previous snapshot" : ""}{data ? ` · ${data.total} videos` : ""}</Typography>
      {data && data.totalPages > 1 ? <Stack direction="row" alignItems="center" gap={1}><Button size="small" color="inherit" disabled={loading || Boolean(busyId) || page <= 1} onClick={() => setPage(value => value - 1)}>Previous</Button><Typography variant="caption">{data.page} / {data.totalPages}</Typography><Button size="small" color="inherit" disabled={loading || Boolean(busyId) || page >= data.totalPages} onClick={() => setPage(value => value + 1)}>Next</Button></Stack> : null}
    </Stack>
  </Paper>;
}
