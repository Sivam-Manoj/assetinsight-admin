"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Braces, FileText, Image as ImageIcon, X } from "lucide-react";
import {
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import AssetScheduleSheet from "@/app/components/reports/AssetScheduleSheet";
import type {
  AssetAdminScheduleSheet,
  ReportPreviewPayload,
} from "@/app/components/reports/reportPreviewTypes";

type ReportPreviewModalProps = {
  open: boolean;
  loading: boolean;
  error: string | null;
  preview: ReportPreviewPayload | null;
  titleOverride?: string;
  onClose: () => void;
  savingAssetSheet?: boolean;
  assetSheetSaveError?: string | null;
  assetSheetSaveSuccess?: string | null;
  onSaveAssetSheet?: (sheet: AssetAdminScheduleSheet) => Promise<void>;
};

type PreviewTab = "data" | "schedule" | "raw";

const HIDDEN_REPORT_DATA_KEYS = new Set(["conditionreportspecsdeleted"]);
const IMAGE_FIELD = /(image|photo|thumbnail|picture|media)/i;
const IMAGE_URL = /\.(?:avif|bmp|gif|heic|jpe?g|png|webp)(?:[?#].*)?$/i;

function formatLabel(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function shouldHideReportDataKey(key: string) {
  return HIDDEN_REPORT_DATA_KEYS.has(key.replace(/[^a-z0-9]/gi, "").toLowerCase());
}

function isWebUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim());
}

function isImageValue(value: unknown, fieldName = ""): value is string {
  return isWebUrl(value) && (IMAGE_FIELD.test(fieldName) || IMAGE_URL.test(value));
}

function getImageUrl(value: unknown, fieldName: string) {
  if (isImageValue(value, fieldName)) return value;
  if (value && typeof value === "object" && isImageValue((value as { url?: unknown }).url, fieldName)) {
    return String((value as { url: unknown }).url);
  }
  return null;
}

function ImageGallery({ values }: { values: string[] }) {
  const unique = Array.from(new Set(values));
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" }, gap: 1 }}>
      {unique.map((url) => (
        <Box
          key={url}
          component="a"
          href={url}
          target="_blank"
          rel="noreferrer"
          sx={{ display: "block", minWidth: 0, overflow: "hidden", border: "1px solid #dedfe1", bgcolor: "#f4f5f5", aspectRatio: "4 / 3" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Report media" loading="lazy" decoding="async" style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }} />
        </Box>
      ))}
    </Box>
  );
}

function DataValue({ value, name, depth = 0 }: { value: unknown; name: string; depth?: number }): ReactNode {
  if (value === null || typeof value === "undefined" || value === "") {
    return <Box component="span" sx={{ color: "#737773" }}>-</Box>;
  }

  if (isImageValue(value, name)) return <ImageGallery values={[value]} />;
  if (isWebUrl(value)) {
    return <Box component="a" href={value} target="_blank" rel="noreferrer" sx={{ color: "#c91019", overflowWrap: "anywhere", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>{value}</Box>;
  }
  if (["string", "number", "boolean"].includes(typeof value)) {
    return <Box component="span" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}</Box>;
  }

  if (Array.isArray(value)) {
    const imageValues = value.map((entry) => getImageUrl(entry, name)).filter((entry): entry is string => Boolean(entry));
    if (imageValues.length === value.length && imageValues.length > 0) return <ImageGallery values={imageValues} />;
    if (!value.length) return <Box component="span" sx={{ color: "#737773" }}>Empty list</Box>;
    return (
      <Stack spacing={1}>
        {value.map((entry, index) => (
          <Box key={`${name}-${index}`} sx={{ borderLeft: "2px solid #dedfe1", pl: 1.5 }}>
            <DataValue value={entry} name={`${name} ${index + 1}`} depth={depth + 1} />
          </Box>
        ))}
      </Stack>
    );
  }

  const entries = Object.entries(value as Record<string, unknown>).filter(([key]) => !shouldHideReportDataKey(key));
  if (!entries.length) return <Box component="span" sx={{ color: "#737773" }}>No values</Box>;

  return (
    <Box component="dl" sx={{ display: "grid", gridTemplateColumns: depth > 1 ? "1fr" : { xs: "1fr", xl: "repeat(2, minmax(0, 1fr))" }, columnGap: 2.5, m: 0 }}>
      {entries.map(([key, entry]) => {
        const complex = entry !== null && typeof entry === "object";
        return (
          <Box
            key={key}
            sx={{
              minWidth: 0,
              display: complex ? "block" : "grid",
              gridTemplateColumns: complex ? undefined : "minmax(120px, 160px) minmax(0, 1fr)",
              gap: complex ? 0 : 1.5,
              gridColumn: complex ? "1 / -1" : undefined,
              borderBottom: "1px solid #e5e6e7",
              py: 1.25,
            }}
          >
            <Box component="dt" sx={{ mb: complex ? 1 : 0, color: "#737773", fontSize: 12, fontWeight: 600 }}>{formatLabel(key)}</Box>
            <Box component="dd" sx={{ minWidth: 0, m: 0, color: "#17191d", fontSize: 13 }}><DataValue value={entry} name={key} depth={depth + 1} /></Box>
          </Box>
        );
      })}
    </Box>
  );
}

function lotNumber(lot: Record<string, unknown>, index: number) {
  return String(lot.lot_number || lot.lotNumber || index + 1);
}

function lotTitle(lot: Record<string, unknown>) {
  return String(lot.title || lot.description || "Untitled");
}

export type { ReportPreviewPayload } from "@/app/components/reports/reportPreviewTypes";

export default function ReportPreviewModal({
  open,
  loading,
  error,
  preview,
  titleOverride,
  onClose,
  savingAssetSheet = false,
  assetSheetSaveError = null,
  assetSheetSaveSuccess = null,
  onSaveAssetSheet,
}: ReportPreviewModalProps) {
  const [activeTab, setActiveTab] = useState<PreviewTab>("data");
  const [selectedLot, setSelectedLot] = useState(0);
  const reportData = useMemo(
    () => (preview?.data && typeof preview.data === "object" ? preview.data : {}),
    [preview?.data]
  );
  const lots = useMemo(
    () => (Array.isArray(reportData.lots) ? reportData.lots.filter((lot): lot is Record<string, unknown> => Boolean(lot) && typeof lot === "object") : []),
    [reportData]
  );
  const summary = useMemo(
    () => Object.fromEntries(Object.entries(reportData).filter(([key]) => key !== "lots" && !shouldHideReportDataKey(key))),
    [reportData]
  );
  const activeLot = selectedLot >= 0 ? lots[Math.min(selectedLot, Math.max(0, lots.length - 1))] : null;
  const hasSchedule = Boolean(preview?.assetScheduleSheet && onSaveAssetSheet);

  useEffect(() => {
    if (!open) return;
    setSelectedLot(0);
    setActiveTab(preview?.variant === "assetScheduleSheet" ? "schedule" : "data");
  }, [open, preview?.reportId, preview?.variant]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={false}
      slotProps={{ backdrop: { sx: { bgcolor: "rgba(0,0,0,0.10)", backdropFilter: "blur(2px)" } } }}
      PaperProps={{
        sx: {
          width: { xs: "calc(100vw - 16px)", sm: "min(1480px, calc(100vw - 32px))" },
          height: { xs: "94vh", sm: "92vh" },
          maxHeight: { xs: "94vh", sm: "92vh" },
          m: { xs: 1, sm: 2 },
          borderRadius: "4px",
          overflow: "hidden",
          bgcolor: "#fff",
          backgroundImage: "none",
        },
      }}
    >
      <DialogTitle sx={{ position: "relative", flex: "0 0 auto", borderBottom: "1px solid #dedfe1", px: { xs: 2, sm: 3 }, pt: { xs: 2, sm: 2.5 }, pb: { xs: 2, sm: 2.25 } }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography component="h2" sx={{ color: "#17191d", fontSize: 16, fontWeight: 500, lineHeight: 1 }}>{titleOverride || preview?.title || "Report Data"}</Typography>
            <Typography sx={{ mt: 1, color: "#737773", fontSize: 14, lineHeight: "20px" }}>Complete saved report data, organized lot by lot.</Typography>
          </Box>
          <IconButton aria-label="Close report data" onClick={onClose} sx={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, border: "1px solid #dedfe1", borderRadius: "3px", color: "#555955" }}><X size={16} /></IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ display: "flex", minHeight: 0, flex: 1, flexDirection: "column", overflow: "hidden", p: 0 }}>
        {loading ? <Box sx={{ display: "grid", minHeight: 0, flex: 1, placeItems: "center" }}><CircularProgress size={26} sx={{ color: "#df111b" }} /></Box> : null}
        {error ? <Alert severity="error" sx={{ m: 3, borderRadius: "3px" }}>{error}</Alert> : null}
        {!loading && !error && preview ? (
          <>
            <Box sx={{ flex: "0 0 auto", borderBottom: "1px solid #dedfe1", px: { xs: 1.5, sm: 3 }, py: 1 }}>
              <Tabs
                value={activeTab}
                onChange={(_, value: PreviewTab) => setActiveTab(value)}
                aria-label="Report data sections"
                TabIndicatorProps={{ sx: { display: "none" } }}
                sx={{ minHeight: 32, "& .MuiTab-root": { minHeight: 32, minWidth: 0, mr: 0.5, border: "1px solid transparent", borderRadius: "3px", px: 1.25, py: 0.5, color: "#555955", fontSize: 12, fontWeight: 600, textTransform: "none" }, "& .Mui-selected": { borderColor: "#df111b", color: "#17191d !important", bgcolor: "#fff" } }}
              >
                <Tab value="data" icon={<FileText size={16} />} iconPosition="start" label="Data" />
                {hasSchedule ? <Tab value="schedule" label="Schedule A" /> : null}
                <Tab value="raw" icon={<Braces size={16} />} iconPosition="start" label="Raw JSON" />
              </Tabs>
            </Box>

            <Box sx={{ display: activeTab === "data" ? { xs: "block", lg: "grid" } : "none", gridTemplateColumns: "260px minmax(0, 1fr)", minHeight: 0, flex: 1, overflow: "hidden" }}>
              <Box component="aside" sx={{ minHeight: 0, maxHeight: { xs: 190, lg: "none" }, overflowY: "auto", borderRight: { lg: "1px solid #dedfe1" }, borderBottom: { xs: "1px solid #dedfe1", lg: 0 }, bgcolor: "#f7f8f8", p: 1.5 }}>
                <Stack spacing={0.75}>
                  <Box component="button" type="button" onClick={() => setSelectedLot(-1)} sx={{ width: "100%", border: selectedLot < 0 ? "1px solid #df111b" : "1px solid #dedfe1", borderRadius: "3px", bgcolor: selectedLot < 0 ? "rgba(223,17,27,0.06)" : "#fff", px: 1.5, py: 1.1, color: "#17191d", textAlign: "left", font: "inherit", fontSize: 13, fontWeight: 650, cursor: "pointer" }}>Report Summary</Box>
                  {lots.map((lot, index) => (
                    <Box key={String(lot.lot_id || lot.lot_number || index)} component="button" type="button" onClick={() => setSelectedLot(index)} sx={{ width: "100%", border: selectedLot === index ? "1px solid #df111b" : "1px solid #dedfe1", borderRadius: "3px", bgcolor: selectedLot === index ? "rgba(223,17,27,0.06)" : "#fff", px: 1.5, py: 1, color: "#17191d", textAlign: "left", font: "inherit", cursor: "pointer" }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 650 }}>Lot {lotNumber(lot, index)}</Typography>
                      <Typography noWrap sx={{ mt: 0.25, color: "#737773", fontSize: 11 }}>{lotTitle(lot)}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>

              <Box sx={{ minHeight: 0, overflowX: "hidden", overflowY: "auto" }}>
                <Box sx={{ minWidth: 0, p: { xs: 2, sm: 3 } }}>
                  {selectedLot < 0 || !activeLot ? (
                    <Box component="section">
                      <Typography component="h3" sx={{ mb: 2, color: "#17191d", fontSize: 17, fontWeight: 650 }}>Report Summary</Typography>
                      {preview.meta.length ? (
                        <Box component="dl" sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }, gap: 0, mb: 2, border: "1px solid #dedfe1", m: 0 }}>
                          {preview.meta.map((field) => <Box key={`${field.label}-${field.value}`} sx={{ minWidth: 0, borderRight: { md: "1px solid #dedfe1" }, p: 1.5 }}><Box component="dt" sx={{ color: "#737773", fontSize: 11, fontWeight: 600 }}>{field.label}</Box><Box component="dd" sx={{ mt: 0.5, m: 0, color: "#17191d", fontSize: 13, fontWeight: 600, overflowWrap: "anywhere" }}>{field.value}</Box></Box>)}
                        </Box>
                      ) : null}
                      <DataValue value={summary} name="summary" />
                    </Box>
                  ) : (
                    <Box component="section">
                      <Stack direction="row" alignItems="flex-start" spacing={1.5} sx={{ mb: 2 }}>
                        <Box sx={{ display: "grid", width: 40, height: 40, flexShrink: 0, placeItems: "center", border: "1px solid #dedfe1", bgcolor: "#f4f5f5" }}><ImageIcon size={24} /></Box>
                        <Box sx={{ minWidth: 0 }}><Typography component="h3" sx={{ color: "#17191d", fontSize: 18, fontWeight: 600, lineHeight: "24px" }}>Lot {lotNumber(activeLot, selectedLot)}</Typography><Typography sx={{ color: "#737773", fontSize: 14, lineHeight: "20px" }}>{lotTitle(activeLot)}</Typography></Box>
                      </Stack>
                      <DataValue value={activeLot} name="lot" />
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>

            {hasSchedule && preview.assetScheduleSheet ? (
              <Box sx={{ display: activeTab === "schedule" ? "block" : "none", minHeight: 0, flex: 1, overflow: "auto", p: { xs: 1.5, sm: 3 } }}>
                <AssetScheduleSheet preview={preview} saving={savingAssetSheet} saveError={assetSheetSaveError} saveSuccess={assetSheetSaveSuccess} onSave={onSaveAssetSheet!} onClose={onClose} />
              </Box>
            ) : null}

            <Box component="pre" sx={{ display: activeTab === "raw" ? "block" : "none", minHeight: 0, flex: 1, overflow: "auto", m: 0, p: 3, color: "#17191d", bgcolor: "#fff", fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{JSON.stringify(preview, null, 2)}</Box>
          </>
        ) : null}
        {!loading && !error && !preview ? <Box sx={{ display: "grid", minHeight: 0, flex: 1, placeItems: "center", color: "#737773", fontSize: 13 }}>No report data available.</Box> : null}
      </DialogContent>
    </Dialog>
  );
}
