"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  LinearProgress,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import {
  Boxes,
  Clock3,
  Database,
  ExternalLink,
  FileJson,
  Image as ImageIcon,
  UserRound,
  X,
} from "lucide-react";
import type { PreviewReportDetailResponse } from "./previewReportTypes";

type Props = {
  open: boolean;
  reportId: string | null;
  onClose: () => void;
};

type JsonRecord = Record<string, unknown>;

const IMAGE_KEY = /(image|photo|thumbnail|picture|cover)/i;
const IMAGE_URL = /\.(avif|bmp|gif|jpe?g|png|webp)(?:\?|#|$)/i;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isHttpUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function isImageValue(value: unknown, key = ""): value is string {
  return isHttpUrl(value) && (IMAGE_KEY.test(key) || IMAGE_URL.test(value));
}

function humanizeKey(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function displayDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function collectImages(value: unknown, key = "", output = new Set<string>()): string[] {
  if (isImageValue(value, key)) output.add(value);
  else if (Array.isArray(value)) value.forEach((entry) => collectImages(entry, key, output));
  else if (isRecord(value)) Object.entries(value).forEach(([childKey, entry]) => collectImages(entry, childKey, output));
  return Array.from(output);
}

function PrimitiveValue({ value, fieldKey = "" }: { value: unknown; fieldKey?: string }) {
  if (value === null || value === undefined || value === "") {
    return <Typography sx={{ color: "text.disabled", fontSize: 13 }}>Not provided</Typography>;
  }
  if (typeof value === "boolean") return <Chip size="small" label={value ? "Yes" : "No"} variant="outlined" />;
  if (isImageValue(value, fieldKey)) {
    return (
      <Box
        component="a"
        href={value}
        target="_blank"
        rel="noreferrer"
        sx={{ display: "block", width: "100%", maxWidth: 260 }}
      >
        <Box
          component="img"
          src={value}
          alt={humanizeKey(fieldKey) || "Report image"}
          loading="lazy"
          sx={{ display: "block", width: "100%", aspectRatio: "4 / 3", objectFit: "cover", border: "1px solid", borderColor: "divider", borderRadius: "4px" }}
        />
      </Box>
    );
  }
  if (isHttpUrl(value)) {
    return (
      <Stack component="a" href={value} target="_blank" rel="noreferrer" direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0, color: "primary.main", textDecoration: "none" }}>
        <Typography sx={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", fontSize: 13 }}>{value}</Typography>
        <ExternalLink size={13} />
      </Stack>
    );
  }
  return (
    <Typography sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", color: "text.primary", fontSize: 13.5, lineHeight: 1.55 }}>
      {String(value)}
    </Typography>
  );
}

function DataValue({ value, fieldKey = "", depth = 0 }: { value: unknown; fieldKey?: string; depth?: number }) {
  if (Array.isArray(value)) {
    if (!value.length) return <PrimitiveValue value={null} />;
    if (value.every((entry) => isImageValue(entry, fieldKey))) {
      return (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(132px, 1fr))", gap: 1 }}>
          {value.map((entry, index) => <PrimitiveValue key={`${String(entry)}-${index}`} value={entry} fieldKey={fieldKey} />)}
        </Box>
      );
    }
    return (
      <Stack spacing={1}>
        {value.map((entry, index) => (
          <Box key={index} sx={{ borderLeft: "2px solid", borderColor: "divider", pl: 1.25 }}>
            <Typography sx={{ mb: 0.5, color: "text.secondary", fontSize: 11.5, fontWeight: 700 }}>Item {index + 1}</Typography>
            <DataValue value={entry} fieldKey={fieldKey} depth={depth + 1} />
          </Box>
        ))}
      </Stack>
    );
  }

  if (isRecord(value)) {
    const entries = Object.entries(value);
    if (!entries.length) return <PrimitiveValue value={null} />;
    return (
      <Box sx={{ display: "grid", gridTemplateColumns: depth > 1 ? "1fr" : { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" }, gap: "1px", bgcolor: "divider", border: "1px solid", borderColor: "divider" }}>
        {entries.map(([key, entry]) => (
          <Box key={key} sx={{ minWidth: 0, bgcolor: "background.paper", p: 1.25 }}>
            <Typography sx={{ mb: 0.6, color: "text.secondary", fontSize: 11.5, fontWeight: 750 }}>{humanizeKey(key)}</Typography>
            <DataValue value={entry} fieldKey={key} depth={depth + 1} />
          </Box>
        ))}
      </Box>
    );
  }

  return <PrimitiveValue value={value} fieldKey={fieldKey} />;
}

export default function PreviewReportDrawer({ open, reportId, onClose }: Props) {
  const [payload, setPayload] = useState<PreviewReportDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState(0);
  const [selectedLot, setSelectedLot] = useState(0);

  useEffect(() => {
    if (!open || !reportId) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setPayload(null);
    setTab(0);
    setSelectedLot(0);

    fetch(`/api/admin/preview-reports/${encodeURIComponent(reportId)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body?.message || "Unable to load preview report details.");
        return body as PreviewReportDetailResponse;
      })
      .then(setPayload)
      .catch((reason) => {
        if (reason?.name !== "AbortError") setError(reason instanceof Error ? reason.message : "Unable to load preview report details.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [open, reportId]);

  const lots = useMemo(() => {
    const candidate = payload?.preview?.data?.lots;
    return Array.isArray(candidate) ? candidate.filter(isRecord) : [];
  }, [payload]);
  const activeLot = lots[selectedLot] || null;
  const activeImages = useMemo(() => collectImages(activeLot), [activeLot]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100vw", sm: "min(96vw, 1180px)" },
          maxWidth: "100vw",
          overflow: "hidden",
          bgcolor: "background.default",
        },
      }}
    >
      <Box sx={{ display: "flex", height: "100dvh", minWidth: 0, flexDirection: "column" }}>
        <Box sx={{ flexShrink: 0, borderBottom: "1px solid", borderColor: "divider", bgcolor: "background.paper", px: { xs: 2, md: 3 }, py: 2 }}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Database size={20} />
                <Typography variant="h5" sx={{ fontSize: { xs: 20, md: 24 }, fontWeight: 750 }}>Preview report details</Typography>
              </Stack>
              <Typography sx={{ mt: 0.5, color: "text.secondary", fontSize: 13.5 }}>
                Complete sanitized report data, workflow state, lots, and images.
              </Typography>
            </Box>
            <IconButton aria-label="Close preview report details" onClick={onClose} sx={{ border: "1px solid", borderColor: "divider", borderRadius: "4px" }}>
              <X size={19} />
            </IconButton>
          </Stack>
        </Box>

        {loading ? (
          <Box sx={{ display: "grid", flex: 1, placeItems: "center" }}><CircularProgress size={30} /></Box>
        ) : error ? (
          <Box sx={{ p: 3 }}><Alert severity="error">{error}</Alert></Box>
        ) : payload ? (
          <>
            <Box sx={{ flexShrink: 0, borderBottom: "1px solid", borderColor: "divider", bgcolor: "background.paper", px: { xs: 2, md: 3 }, py: 1.5 }}>
              <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between" spacing={1.5}>
                <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip size="small" label={payload.report.reportType === "Asset" ? "Asset" : "Lot Listing"} color="primary" />
                  <Typography sx={{ fontWeight: 750 }}>{payload.preview.title}</Typography>
                  <Chip size="small" variant="outlined" label={payload.report.workflow_stage.replaceAll("_", " ")} sx={{ textTransform: "capitalize" }} />
                </Stack>
                <Typography sx={{ color: "text.secondary", fontSize: 12.5 }}>Updated {displayDate(payload.report.updatedAt)}</Typography>
              </Stack>
              <LinearProgress variant="determinate" value={Math.max(0, Math.min(100, payload.report.workflow_progress_percent || 0))} sx={{ mt: 1.25, height: 4 }} />
              <Typography sx={{ mt: 0.65, color: "text.secondary", fontSize: 12.5 }}>{payload.report.workflow_message}</Typography>
              <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mt: 0.75, minHeight: 38, "& .MuiTab-root": { minHeight: 38, px: 1.5, fontSize: 12.5 } }}>
                <Tab icon={<Boxes size={15} />} iconPosition="start" label="Overview" />
                <Tab icon={<Database size={15} />} iconPosition="start" label="All data" />
                <Tab icon={<FileJson size={15} />} iconPosition="start" label="Raw JSON" />
              </Tabs>
            </Box>

            <Box sx={{ minHeight: 0, flex: 1, overflowY: "auto", overflowX: "hidden" }}>
              {tab === 0 ? (
                <Box sx={{ p: { xs: 2, md: 3 } }}>
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" }, border: "1px solid", borderColor: "divider", bgcolor: "divider", gap: "1px" }}>
                    {[
                      ["Contract", payload.report.contractNo || "Not provided"],
                      ["Created by", payload.report.creator?.username || payload.report.creator?.companyName || payload.report.creator?.email || "Deleted user"],
                      ["Created", displayDate(payload.report.createdAt)],
                      ["Submitted", displayDate(payload.report.previewSubmittedAt)],
                    ].map(([label, value]) => (
                      <Box key={label} sx={{ bgcolor: "background.paper", p: 1.5 }}>
                        <Typography sx={{ color: "text.secondary", fontSize: 11.5, fontWeight: 750 }}>{label}</Typography>
                        <Typography sx={{ mt: 0.5, overflowWrap: "anywhere", fontSize: 13.5, fontWeight: 600 }}>{value}</Typography>
                      </Box>
                    ))}
                  </Box>

                  {payload.report.job_error ? <Alert severity="error" sx={{ mt: 2 }}>{payload.report.job_error}</Alert> : null}

                  {lots.length ? (
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "240px minmax(0, 1fr)" }, gap: 2, mt: 2 }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ mb: 1, color: "text.secondary", fontSize: 11.5, fontWeight: 750, textTransform: "uppercase" }}>Lots ({lots.length})</Typography>
                        <Stack direction={{ xs: "row", md: "column" }} spacing={0.75} sx={{ overflowX: { xs: "auto", md: "visible" }, pb: { xs: 1, md: 0 } }}>
                          {lots.map((lot, index) => {
                            const lotNumber = String(lot.lot_number || index + 1);
                            const title = String(lot.title || lot.description || "Untitled lot");
                            return (
                              <Box
                                component="button"
                                type="button"
                                key={`${lotNumber}-${index}`}
                                onClick={() => setSelectedLot(index)}
                                sx={{ minWidth: { xs: 190, md: 0 }, width: { md: "100%" }, border: "1px solid", borderColor: selectedLot === index ? "primary.main" : "divider", borderRadius: "4px", bgcolor: selectedLot === index ? "action.selected" : "background.paper", color: "text.primary", cursor: "pointer", p: 1.25, textAlign: "left" }}
                              >
                                <Typography sx={{ fontSize: 13, fontWeight: 750 }}>Lot {lotNumber}</Typography>
                                <Typography noWrap sx={{ mt: 0.25, color: "text.secondary", fontSize: 11.5 }}>{title}</Typography>
                              </Box>
                            );
                          })}
                        </Stack>
                      </Box>

                      <Box sx={{ minWidth: 0 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <ImageIcon size={18} />
                          <Typography sx={{ fontSize: 19, fontWeight: 750 }}>Lot {String(activeLot?.lot_number || selectedLot + 1)}</Typography>
                        </Stack>
                        <Typography sx={{ mt: 0.25, color: "text.secondary", fontSize: 13.5 }}>{String(activeLot?.title || activeLot?.description || "Untitled lot")}</Typography>
                        {activeImages.length ? (
                          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 1, mt: 1.5 }}>
                            {activeImages.map((url, index) => (
                              <Box component="a" href={url} target="_blank" rel="noreferrer" key={url} sx={{ position: "relative", display: "block", minWidth: 0 }}>
                                <Box component="img" src={url} alt={`Lot image ${index + 1}`} loading="lazy" sx={{ display: "block", width: "100%", aspectRatio: "4 / 3", objectFit: "cover", border: "1px solid", borderColor: "divider", borderRadius: "4px" }} />
                              </Box>
                            ))}
                          </Box>
                        ) : <Alert severity="info" sx={{ mt: 1.5 }}>No image URLs are stored for this lot.</Alert>}
                        <Box sx={{ mt: 2 }}><DataValue value={activeLot} /></Box>
                      </Box>
                    </Box>
                  ) : (
                    <Alert severity="info" sx={{ mt: 2 }}>This preview does not contain a saved lot array.</Alert>
                  )}
                </Box>
              ) : null}

              {tab === 1 ? <Box sx={{ p: { xs: 2, md: 3 } }}><DataValue value={payload.preview.data} /></Box> : null}

              {tab === 2 ? (
                <Box sx={{ p: { xs: 2, md: 3 } }}>
                  <Box component="pre" sx={{ m: 0, maxWidth: "100%", overflowX: "auto", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", p: 2, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12, lineHeight: 1.55, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                    {JSON.stringify(payload.preview.data, null, 2)}
                  </Box>
                </Box>
              ) : null}
            </Box>

            <Divider />
            <Box sx={{ flexShrink: 0, bgcolor: "background.paper", px: { xs: 2, md: 3 }, py: 1.25 }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between">
                <Stack direction="row" alignItems="center" spacing={0.75}><UserRound size={15} /><Typography sx={{ color: "text.secondary", fontSize: 12.5 }}>{payload.report.creator?.email || "Owner unavailable"}</Typography></Stack>
                <Stack direction="row" alignItems="center" spacing={0.75}><Clock3 size={15} /><Typography sx={{ color: "text.secondary", fontSize: 12.5 }}>Last activity {displayDate(payload.report.updatedAt)}</Typography></Stack>
              </Stack>
            </Box>
          </>
        ) : null}
      </Box>
    </Drawer>
  );
}
