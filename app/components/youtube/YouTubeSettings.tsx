"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider, FormControlLabel, Link, Paper, Stack, Typography } from "@mui/material";
import { ExternalLink, Link2, RefreshCw, Unlink, Video } from "lucide-react";
import { parseYouTubeAuthorization, parseYouTubeStatus, type YouTubeStatus } from "@/lib/youtube";
import YouTubeVideos from "@/app/components/youtube/YouTubeVideos";

async function responseBody(response: Response): Promise<unknown> {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body && typeof body === "object" && "message" in body && typeof body.message === "string" ? body.message : "The connection could not be confirmed.";
    throw new Error(response.status === 401 ? "Your admin session expired. Sign in again, then restart the connection." : message);
  }
  return body;
}

export default function YouTubeSettings() {
  const [status, setStatus] = useState<YouTubeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [fresh, setFresh] = useState(false);
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const read = useRef<AbortController | null>(null);
  const mutation = useRef(false);
  const mounted = useRef(true);
  const refresh = useCallback(async () => {
    read.current?.abort();
    const controller = new AbortController();
    read.current = controller;
    setLoading(true); setFresh(false); setError("");
    const timer = window.setTimeout(() => controller.abort(), 20_000);
    try {
      const result = await responseBody(await fetch("/api/admin/youtube/status", { cache: "no-store", signal: controller.signal }));
      if (read.current !== controller || !mounted.current) return;
      setStatus(parseYouTubeStatus(result)); setFresh(true); setCheckedAt(new Date());
    } catch (cause) {
      if (read.current === controller && mounted.current) setError(controller.signal.aborted ? "The connection check timed out. Refresh to try again." : cause instanceof Error ? cause.message : "The connection could not be loaded.");
    } finally {
      window.clearTimeout(timer);
      if (read.current === controller && mounted.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => { mounted.current = false; read.current?.abort(); read.current = null; };
  }, [refresh]);

  async function connect() {
    if (mutation.current || !fresh || !status?.configured || !consent) return;
    mutation.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const body = await responseBody(await fetch("/api/admin/youtube/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ publicationConsent: true }), signal: AbortSignal.timeout(30_000) }));
      const target = parseYouTubeAuthorization(body, window.location.origin);
      if (mounted.current) window.location.assign(target.authorizationUrl);
    } catch (cause) {
      if (mounted.current) { setError(cause instanceof Error && cause.name !== "TimeoutError" ? cause.message : "The connection request could not be confirmed. Refresh the status before trying again."); setFresh(false); setConsent(false); }
    } finally { mutation.current = false; if (mounted.current) setBusy(false); }
  }

  async function disconnect() {
    if (mutation.current || !fresh || !status?.connected) return;
    mutation.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const body = await responseBody(await fetch("/api/admin/youtube/disconnect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision: status.revision }), signal: AbortSignal.timeout(30_000) }));
      const next = parseYouTubeStatus(body);
      if (mounted.current) { setStatus(next); setCheckedAt(new Date()); setConsent(false); setNotice("Channel disconnected. Existing YouTube videos and report originals have not been deleted."); }
    } catch (cause) {
      if (mounted.current) { setError(cause instanceof Error && cause.name !== "TimeoutError" ? cause.message : "Disconnection could not be confirmed. Refresh the status before trying again."); setFresh(false); }
    } finally { mutation.current = false; if (mounted.current) { setBusy(false); setDisconnectOpen(false); } }
  }

  return <Box component="main" sx={{ p: { xs: 2, md: 3 }, maxWidth: 1120, mx: "auto", width: "100%" }}>
    <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} justifyContent="space-between" gap={1.5} mb={2}>
      <Box><Typography component="h1" variant="h5" fontWeight={700} display="flex" alignItems="center" gap={1}><Video size={24} aria-hidden />YouTube Videos</Typography><Typography color="text.secondary" variant="body2" mt={0.5}>Connect one channel for Asset and Lot Listing videos.</Typography></Box>
      <Button variant="outlined" startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <RefreshCw size={16} />} disabled={loading || busy} onClick={() => void refresh()}>Refresh status</Button>
    </Stack>
    <Stack gap={2}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {notice ? <Alert severity="success">{notice}</Alert> : null}
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }} aria-busy={loading || busy}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} flexWrap="wrap" mb={1.5}>
          <Typography component="h2" variant="h6" fontSize={18}>Channel connection</Typography>
          <Chip size="small" variant="outlined" sx={{ color: "text.primary" }} color={fresh && status?.connected ? "success" : "default"} label={loading ? "Checking" : !fresh ? "Status unavailable" : status?.connected ? "Connected" : status?.configured ? "Not connected" : "Setup required"} />
        </Stack>
        {loading && !status ? <Typography color="text.secondary" role="status">Checking the channel configuration…</Typography> : null}
        {status?.channel ? <Box sx={{ overflowWrap: "anywhere" }}><Typography fontWeight={650}>{status.channel.title}</Typography><Link color="inherit" href={status.channel.url} target="_blank" rel="noopener noreferrer" sx={{ display: "inline-flex", gap: 0.5, alignItems: "center", my: 0.5 }}>View YouTube channel <ExternalLink size={14} /></Link><Typography color="text.secondary" variant="caption" display="block">Channel ID: {status.channel.id}</Typography></Box> : <Typography color="text.secondary" variant="body2">An authorized channel owner must approve access through Google. No Google password or token is stored in this browser.</Typography>}
        {status && !status.configured ? <Alert severity="info" sx={{ mt: 2 }}><Typography variant="body2" fontWeight={600}>Google setup is required on the backend</Typography><Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>{status.configurationIssue || "Ask your server administrator to configure the YouTube OAuth client, callback URL and encrypted credential storage."}</Typography><Typography variant="body2" mt={0.5}>Callback path: /youtube/callback</Typography></Alert> : null}
        {status?.needsReconnect ? <Alert severity="warning" sx={{ mt: 2 }}>Google access needs to be renewed. Disconnect this channel, then connect with Google again. Existing videos will not be deleted.</Alert> : null}
        {status?.configured && !status.connected ? <Box mt={2}>
          <FormControlLabel sx={{ alignItems: "flex-start", ml: -1, mr: 0 }} control={<Checkbox checked={consent} disabled={!fresh || busy} onChange={event => setConsent(event.target.checked)} />} label={<Typography variant="body2" pt={1}>I authorize public publication of future reviewed Asset and Lot Listing videos on the selected channel after each report is released. Public videos can be viewed and found by anyone.</Typography>} />
          <Button sx={{ mt: 1, bgcolor: "primary.dark" }} variant="contained" startIcon={<Link2 size={16} />} disabled={!fresh || !consent || busy} onClick={() => void connect()}>{busy ? "Opening Google…" : "Connect with Google"}</Button>
        </Box> : null}
        {status?.connected ? <Button sx={{ mt: 2 }} color="inherit" variant="outlined" startIcon={<Unlink size={16} />} disabled={!fresh || busy} onClick={() => setDisconnectOpen(true)}>Disconnect channel</Button> : null}
        <Typography color="text.secondary" variant="caption" display="block" mt={2}>Last checked: {checkedAt ? checkedAt.toLocaleString() : "Not yet checked"}{!fresh && checkedAt ? " · Previous snapshot; refresh before making changes." : ""}</Typography>
      </Paper>
      <YouTubeVideos />
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Typography component="h2" variant="h6" fontSize={18} mb={1.5}>Publication and report files</Typography>
        <Stack gap={1.5} divider={<Divider />}>
          <Box><Typography variant="body2" fontWeight={650}>Reviewed first, public after release</Typography><Typography variant="body2" color="text.secondary">After a reviewed preview is submitted, videos are prepared privately. Public publication follows the report’s existing approval and release rules.</Typography></Box>
          <Box><Typography variant="body2" fontWeight={650}>Originals and Excel links stay with the report</Typography><Typography variant="body2" color="text.secondary">Original videos remain in R2 storage and the media ZIP. Excel exports include YouTube links, with titles and descriptions based on reviewed lot details.</Typography></Box>
          <Box><Typography variant="body2" fontWeight={650}>No historical uploads or automatic deletion</Typography><Typography variant="body2" color="text.secondary">Connecting does not upload existing reports. Disconnecting stops new publishing work; it does not remove videos already on YouTube or delete any report media.</Typography></Box>
        </Stack>
      </Paper>
      <Alert severity="warning"><Typography variant="body2" fontWeight={650}>YouTube may require an API compliance audit</Typography><Typography variant="body2">Google restricts uploads from certain unverified API projects to private visibility. Public publication cannot be guaranteed until the project is eligible. A requested Public setting is not proof that a video is public.</Typography><Link href="https://developers.google.com/youtube/v3/docs/videos/insert" target="_blank" rel="noopener noreferrer" sx={{ fontSize: 14 }}>Read Google’s upload requirements</Link></Alert>
    </Stack>
    <Dialog open={disconnectOpen} onClose={() => { if (!busy) setDisconnectOpen(false); }} fullWidth maxWidth="xs" aria-labelledby="youtube-disconnect-title">
      <DialogTitle id="youtube-disconnect-title">Disconnect this channel?</DialogTitle>
      <DialogContent><DialogContentText>New uploading and publishing work will stop. Existing YouTube videos, R2 originals and report ZIP files will not be deleted.</DialogContentText></DialogContent>
      <DialogActions><Button color="inherit" disabled={busy} onClick={() => setDisconnectOpen(false)}>Cancel</Button><Button variant="contained" sx={{ bgcolor: "primary.dark" }} disabled={busy || !fresh} onClick={() => void disconnect()}>{busy ? "Disconnecting…" : "Confirm disconnect"}</Button></DialogActions>
    </Dialog>
  </Box>;
}
