"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Braces, FileText, X } from "lucide-react";
import {
  Alert,
  alpha,
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
  useMediaQuery,
  useTheme,
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

const HIDDEN_REPORT_DATA_KEYS = new Set(["conditionreportspecsdeleted", "marketcheck"]);
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
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "repeat(2, minmax(0, 1fr))",
          sm: "repeat(3, minmax(0, 1fr))",
          xl: "repeat(4, minmax(0, 1fr))",
        },
        gap: 1,
      }}
    >
      {unique.map((url) => (
        <Box
          key={url}
          component="a"
          href={url}
          target="_blank"
          rel="noreferrer"
          sx={{
            display: "block",
            minWidth: 0,
            overflow: "hidden",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1.5,
            bgcolor: "action.hover",
            aspectRatio: "4 / 3",
          }}
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
    return <Box component="span" sx={{ color: "text.secondary" }}>-</Box>;
  }

  if (isImageValue(value, name)) return <ImageGallery values={[value]} />;
  if (isWebUrl(value)) {
    return (
      <Box
        component="a"
        href={value}
        target="_blank"
        rel="noreferrer"
        sx={{
          color: "primary.main",
          overflowWrap: "anywhere",
          textDecoration: "none",
          "&:hover": { textDecoration: "underline" },
        }}
      >
        {value}
      </Box>
    );
  }
  if (["string", "number", "boolean"].includes(typeof value)) {
    return <Box component="span" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}</Box>;
  }

  if (Array.isArray(value)) {
    const imageValues = value.map((entry) => getImageUrl(entry, name)).filter((entry): entry is string => Boolean(entry));
    if (imageValues.length === value.length && imageValues.length > 0) return <ImageGallery values={imageValues} />;
    if (!value.length) return <Box component="span" sx={{ color: "text.secondary" }}>Empty list</Box>;
    return (
      <Stack
        spacing={0}
        sx={{
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        {value.map((entry, index) => (
          <Box
            key={`${name}-${index}`}
            sx={{
              borderBottom: "1px solid",
              borderColor: "divider",
              py: 1.5,
              "&:last-child": { borderBottom: 0 },
            }}
          >
            <DataValue value={entry} name={`${name} ${index + 1}`} depth={depth + 1} />
          </Box>
        ))}
      </Stack>
    );
  }

  const entries = Object.entries(value as Record<string, unknown>).filter(([key]) => !shouldHideReportDataKey(key));
  if (!entries.length) return <Box component="span" sx={{ color: "text.secondary" }}>No values</Box>;

  return (
    <Box
      component="dl"
      sx={{
        display: "grid",
        gridTemplateColumns: depth > 1 ? "1fr" : { xs: "1fr", xl: "repeat(2, minmax(0, 1fr))" },
        columnGap: { xl: 4 },
        m: 0,
      }}
    >
      {entries.map(([key, entry]) => {
        const complex = entry !== null && typeof entry === "object";
        return (
          <Box
            key={key}
            sx={{
              minWidth: 0,
              display: complex ? "block" : "grid",
              gridTemplateColumns: complex ? undefined : { xs: "minmax(104px, 38%) minmax(0, 1fr)", sm: "minmax(136px, 180px) minmax(0, 1fr)" },
              gap: complex ? 0 : { xs: 1.25, sm: 2 },
              gridColumn: complex ? "1 / -1" : undefined,
              borderBottom: "1px solid",
              borderColor: "divider",
              py: complex ? 2 : 1.5,
            }}
          >
            <Box
              component="dt"
              sx={{
                mb: complex ? 1.25 : 0,
                color: complex ? "text.primary" : "text.secondary",
                fontSize: complex ? 14 : 12,
                fontWeight: complex ? 700 : 600,
                lineHeight: 1.45,
              }}
            >
              {formatLabel(key)}
            </Box>
            <Box
              component="dd"
              sx={{
                minWidth: 0,
                m: 0,
                color: "text.primary",
                fontSize: 13,
                lineHeight: 1.55,
              }}
            >
              <DataValue value={entry} name={key} depth={depth + 1} />
            </Box>
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

type LotNavigationProps = {
  lots: Record<string, unknown>[];
  selectedLot: number;
  mobile?: boolean;
  onSelect: (index: number) => void;
};

function LotNavigation({
  lots,
  selectedLot,
  mobile = false,
  onSelect,
}: LotNavigationProps) {
  const navigationItems = [
    { key: "summary", index: -1, title: "Report Summary", description: "" },
    ...lots.map((lot, index) => ({
      key: `lot-${String(lot.lot_id || lot.lot_number || index)}-${index}`,
      index,
      title: `Lot ${lotNumber(lot, index)}`,
      description: lotTitle(lot),
    })),
  ];

  return (
    <Box
      component="nav"
      aria-label="Report lots"
      sx={{
        display: mobile ? "flex" : "block",
        minWidth: 0,
        overflowX: mobile ? "auto" : "visible",
        scrollbarWidth: "thin",
        gap: mobile ? 1 : 0,
        px: mobile ? 2 : 0,
        py: mobile ? 1.5 : 0,
      }}
    >
      {navigationItems.map((item) => {
        const selected = selectedLot === item.index;
        return (
          <Box
            key={item.key}
            component="button"
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(item.index)}
            sx={(theme) => ({
              width: mobile ? "auto" : "100%",
              minWidth: mobile ? 152 : 0,
              minHeight: mobile ? 52 : 68,
              flex: mobile ? "0 0 auto" : undefined,
              border: mobile ? "1px solid" : 0,
              borderColor: selected ? "primary.main" : "divider",
              borderBottom: mobile ? undefined : "1px solid",
              borderBottomColor: "divider",
              borderLeft: mobile ? undefined : "3px solid",
              borderLeftColor: selected ? "primary.main" : "transparent",
              borderRadius: mobile ? 1.5 : 0,
              bgcolor: selected ? alpha(theme.palette.primary.main, 0.08) : "transparent",
              px: mobile ? 1.5 : 2,
              py: 1.25,
              color: "text.primary",
              font: "inherit",
              textAlign: "left",
              cursor: "pointer",
              transition: "background-color 140ms ease, border-color 140ms ease",
              "&:hover": {
                bgcolor: selected ? alpha(theme.palette.primary.main, 0.1) : "action.hover",
              },
              "&:focus-visible": {
                outline: `2px solid ${theme.palette.primary.main}`,
                outlineOffset: -2,
              },
            })}
          >
            <Typography sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35 }}>
              {item.title}
            </Typography>
            {item.description ? (
              <Typography
                noWrap
                sx={{ mt: 0.25, maxWidth: mobile ? 180 : "none", color: "text.secondary", fontSize: 11.5 }}
              >
                {item.description}
              </Typography>
            ) : null}
          </Box>
        );
      })}
    </Box>
  );
}

type ReportDataPanelProps = {
  preview: ReportPreviewPayload;
  lots: Record<string, unknown>[];
  summary: Record<string, unknown>;
  selectedLot: number;
  onSelectLot: (index: number) => void;
};

function ReportDataPanel({
  preview,
  lots,
  summary,
  selectedLot,
  onSelectLot,
}: ReportDataPanelProps) {
  const activeLotIndex = selectedLot >= 0 && lots.length
    ? Math.min(selectedLot, lots.length - 1)
    : -1;
  const activeLot = activeLotIndex >= 0 ? lots[activeLotIndex] : null;
  const navigationSelection = activeLot ? activeLotIndex : -1;

  return (
    <Box
      sx={{
        display: { xs: "block", md: "grid" },
        gridTemplateColumns: "272px minmax(0, 1fr)",
        minHeight: "100%",
      }}
    >
      <Box
        component="aside"
        sx={{
          display: { xs: "none", md: "block" },
          position: "sticky",
          top: 0,
          alignSelf: "start",
          minHeight: "100%",
          borderRight: "1px solid",
          borderColor: "divider",
          bgcolor: "action.hover",
        }}
      >
        <LotNavigation lots={lots} selectedLot={navigationSelection} onSelect={onSelectLot} />
      </Box>

      <Box sx={{ display: { xs: "block", md: "none" }, borderBottom: "1px solid", borderColor: "divider" }}>
        <LotNavigation mobile lots={lots} selectedLot={navigationSelection} onSelect={onSelectLot} />
      </Box>

      <Box sx={{ minWidth: 0, px: { xs: 2, sm: 3, lg: 4 }, py: { xs: 2.5, sm: 3, lg: 4 } }}>
        {selectedLot < 0 || !activeLot ? (
          <Box component="section" aria-labelledby="report-summary-heading">
            <Typography
              id="report-summary-heading"
              component="h3"
              sx={{ mb: 2.5, color: "text.primary", fontSize: { xs: 20, sm: 22 }, fontWeight: 700 }}
            >
              Report Summary
            </Typography>

            {preview.meta.length ? (
              <Box
                component="dl"
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(3, minmax(0, 1fr))" },
                  m: 0,
                  mb: 3,
                  borderTop: "1px solid",
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              >
                {preview.meta.map((field, index) => (
                  <Box
                    key={`${field.label}-${field.value}`}
                    sx={{
                      minWidth: 0,
                      borderBottom: {
                        xs: index === preview.meta.length - 1 ? 0 : "1px solid",
                        sm: 0,
                      },
                      borderRight: {
                        sm: index % 2 === 0 ? "1px solid" : 0,
                        xl: index % 3 === 2 ? 0 : "1px solid",
                      },
                      borderColor: "divider",
                      px: { xs: 0, sm: 2 },
                      py: 1.75,
                      "&:first-of-type": { pl: 0 },
                    }}
                  >
                    <Box component="dt" sx={{ color: "text.secondary", fontSize: 11, fontWeight: 650 }}>
                      {field.label}
                    </Box>
                    <Box
                      component="dd"
                      sx={{
                        m: 0,
                        mt: 0.5,
                        color: "text.primary",
                        fontSize: 13,
                        fontWeight: 650,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {field.value}
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : null}

            <DataValue value={summary} name="summary" />
          </Box>
        ) : (
          <Box component="section" aria-labelledby="active-lot-heading">
            <Box sx={{ mb: 2.5, pb: 2.5, borderBottom: "1px solid", borderColor: "divider" }}>
              <Typography
                id="active-lot-heading"
                component="h3"
                sx={{
                  color: "text.primary",
                  fontSize: { xs: 20, sm: 22 },
                  fontWeight: 700,
                  lineHeight: 1.25,
                }}
              >
                Lot {lotNumber(activeLot, activeLotIndex)}
              </Typography>
              <Typography sx={{ mt: 0.5, color: "text.secondary", fontSize: 14, lineHeight: 1.5 }}>
                {lotTitle(activeLot)}
              </Typography>
            </Box>
            <DataValue value={activeLot} name="lot" />
          </Box>
        )}
      </Box>
    </Box>
  );
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"), { noSsr: true });
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
      fullScreen={isMobile}
      fullWidth
      maxWidth={false}
      slotProps={{
        backdrop: {
          sx: {
            bgcolor: (activeTheme) => alpha(activeTheme.palette.common.black, 0.5),
            backdropFilter: "blur(3px)",
          },
        },
      }}
      PaperProps={{
        sx: {
          display: "flex",
          width: { xs: "100vw", sm: "min(1480px, calc(100vw - 48px))" },
          height: { xs: "100dvh", sm: "min(920px, calc(100dvh - 48px))" },
          maxHeight: { xs: "100dvh", sm: "calc(100dvh - 48px)" },
          m: { xs: 0, sm: 3 },
          border: { xs: 0, sm: "1px solid" },
          borderColor: "divider",
          borderRadius: { xs: 0, sm: 2.5 },
          overflow: "hidden",
          bgcolor: "background.paper",
          backgroundImage: "none",
          boxShadow: { xs: "none", sm: theme.shadows[8] },
        },
      }}
    >
      <DialogTitle
        component="div"
        sx={{
          flex: "0 0 auto",
          borderBottom: "1px solid",
          borderColor: "divider",
          px: { xs: 2, sm: 4 },
          py: { xs: 2, sm: 2.75 },
        }}
      >
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
          <Box sx={{ minWidth: 0, pt: 0.25 }}>
            <Typography
              component="h2"
              sx={{
                color: "text.primary",
                fontSize: { xs: 20, sm: 24 },
                fontWeight: 700,
                lineHeight: 1.2,
                letterSpacing: "-0.02em",
              }}
            >
              {titleOverride || preview?.title || "Report Data"}
            </Typography>
            <Typography
              sx={{
                mt: 0.75,
                maxWidth: 680,
                color: "text.secondary",
                fontSize: { xs: 13.5, sm: 15 },
                lineHeight: 1.5,
              }}
            >
              Complete saved report data, organized lot by lot.
            </Typography>
          </Box>
          <IconButton
            aria-label="Close report data"
            onClick={onClose}
            sx={{
              width: 44,
              height: 44,
              flexShrink: 0,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1.5,
              color: "text.secondary",
              "&:hover": { bgcolor: "action.hover", color: "text.primary" },
            }}
          >
            <X size={20} strokeWidth={1.8} />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent
        sx={{
          display: "flex",
          minHeight: 0,
          flex: 1,
          flexDirection: "column",
          overflow: "hidden",
          p: 0,
        }}
      >
        {!loading && !error && preview ? (
          <>
            <Box
              sx={{
                flex: "0 0 auto",
                overflow: "hidden",
                borderBottom: "1px solid",
                borderColor: "divider",
                px: { xs: 1, sm: 3.5 },
                bgcolor: "background.paper",
              }}
            >
              <Tabs
                value={activeTab}
                onChange={(_, value: PreviewTab) => setActiveTab(value)}
                aria-label="Report data sections"
                variant="scrollable"
                scrollButtons={false}
                TabIndicatorProps={{ sx: { height: 3, borderRadius: "3px 3px 0 0" } }}
                sx={{
                  minHeight: 58,
                  "& .MuiTab-root": {
                    minHeight: 58,
                    minWidth: 0,
                    px: { xs: 1.5, sm: 2 },
                    color: "text.secondary",
                    fontSize: { xs: 13, sm: 14 },
                    fontWeight: 650,
                    textTransform: "none",
                  },
                  "& .Mui-selected": {
                    color: "text.primary",
                  },
                  "& .MuiTab-iconWrapper": {
                    mr: 0.9,
                  },
                }}
              >
                <Tab value="data" icon={<FileText size={18} strokeWidth={1.8} />} iconPosition="start" label="Data" />
                {hasSchedule ? <Tab value="schedule" label="Schedule A" /> : null}
                <Tab value="raw" icon={<Braces size={18} strokeWidth={1.8} />} iconPosition="start" label="Raw JSON" />
              </Tabs>
            </Box>

            <Box
              sx={{
                minHeight: 0,
                flex: 1,
                overflowX: "hidden",
                overflowY: activeTab === "schedule" ? "hidden" : "auto",
                overscrollBehavior: "contain",
                scrollbarGutter: "stable",
                bgcolor: "background.paper",
              }}
            >
              <Box sx={{ display: activeTab === "data" ? "block" : "none", minHeight: "100%" }}>
                <ReportDataPanel
                  preview={preview}
                  lots={lots}
                  summary={summary}
                  selectedLot={selectedLot}
                  onSelectLot={setSelectedLot}
                />
              </Box>

              {hasSchedule && preview.assetScheduleSheet ? (
                <Box
                  sx={{
                    display: activeTab === "schedule" ? "block" : "none",
                    height: "100%",
                    minHeight: 0,
                    p: { xs: 1.5, sm: 2.5, lg: 3 },
                  }}
                >
                  <AssetScheduleSheet
                    preview={preview}
                    saving={savingAssetSheet}
                    saveError={assetSheetSaveError}
                    saveSuccess={assetSheetSaveSuccess}
                    onSave={onSaveAssetSheet!}
                    onClose={onClose}
                  />
                </Box>
              ) : null}

              <Box
                component="pre"
                sx={{
                  display: activeTab === "raw" ? "block" : "none",
                  minHeight: "100%",
                  m: 0,
                  p: { xs: 2, sm: 3, lg: 4 },
                  color: "text.primary",
                  bgcolor: "background.paper",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  fontSize: { xs: 11.5, sm: 12 },
                  lineHeight: 1.65,
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                }}
              >
                {JSON.stringify(preview, null, 2)}
              </Box>
            </Box>
          </>
        ) : null}

        {loading ? (
          <Box sx={{ display: "grid", minHeight: 0, flex: 1, placeItems: "center" }}>
            <CircularProgress size={28} color="primary" />
          </Box>
        ) : null}

        {error ? (
          <Box sx={{ minHeight: 0, flex: 1, overflowY: "auto", p: { xs: 2, sm: 3 } }}>
            <Alert severity="error" sx={{ borderRadius: 1.5 }}>{error}</Alert>
          </Box>
        ) : null}

        {!loading && !error && !preview ? (
          <Box
            sx={{
              display: "grid",
              minHeight: 0,
              flex: 1,
              placeItems: "center",
              px: 2,
              color: "text.secondary",
              fontSize: 13,
              textAlign: "center",
            }}
          >
            No report data available.
          </Box>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
