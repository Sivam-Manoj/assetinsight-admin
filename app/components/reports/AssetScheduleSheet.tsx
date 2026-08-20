"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import PhotoLibraryOutlinedIcon from "@mui/icons-material/PhotoLibraryOutlined";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  FormControl,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import type {
  AssetAdminScheduleBuyersPremiumBasis,
  AssetAdminScheduleEvaluatorColumn,
  AssetAdminScheduleFileSummary,
  AssetAdminScheduleRow,
  AssetAdminScheduleSheet,
  ReportPreviewPayload,
} from "@/app/components/reports/reportPreviewTypes";
import {
  cloneAssetScheduleSheet,
  deriveAssetScheduleSummary,
  formatCurrencyCell,
  formatPercentCell,
  getRowAppraiserAverage,
  makeEvaluatorColumnId,
  recalculateAssetScheduleSheet,
} from "@/app/components/reports/assetScheduleSheetUtils";

type AssetScheduleSheetProps = {
  preview: ReportPreviewPayload;
  saving: boolean;
  saveError: string | null;
  saveSuccess: string | null;
  onSave: (sheet: AssetAdminScheduleSheet) => Promise<void>;
  onClose?: () => void;
  pageMode?: boolean;
};

type AssetSheetTab = "scheduleA" | "fileSummary";

type SummaryRow = {
  label: string;
  value: React.ReactNode;
};

function readOnlyValue(value: string | number | null | undefined) {
  return value === null || value === undefined || value === "" ? "-" : String(value);
}

function mobileLotNumber(row: AssetAdminScheduleRow, index: number) {
  const match = String(row.lot_id || "").match(/(\d+)$/);
  return match?.[1] || String(index + 1).padStart(3, "0");
}

function CompactReadOnlyCell({
  value,
  align = "left",
  accent = false,
}: {
  value: string | number | null | undefined;
  align?: "left" | "right";
  accent?: boolean;
}) {
  const displayValue = readOnlyValue(value);

  return (
    <Tooltip title={displayValue === "-" ? "" : displayValue} arrow enterDelay={500}>
      <Box
        sx={{
          width: "100%",
          overflow: "hidden",
          color: accent ? "primary.main" : "text.primary",
          fontSize: 13,
          fontWeight: accent ? 650 : 450,
          lineHeight: 1.45,
          textAlign: align,
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {displayValue}
      </Box>
    </Tooltip>
  );
}

function numericDraftValue(value: number | null) {
  return value === null ? "" : String(value);
}

function parseNumericDraft(value: string): number | null | undefined {
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized === "-" || normalized === "." || normalized === "-.") return undefined;

  const unsigned = normalized.startsWith("-") ? normalized.slice(1) : normalized;
  const integerPart = unsigned.split(".")[0];
  if (integerPart.includes(",") && !/^\d{1,3}(?:,\d{3})+$/.test(integerPart)) {
    return undefined;
  }

  const parsed = Number(normalized.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

const NumericDraftField = memo(function NumericDraftField({
  value,
  onCommit,
  ariaLabel,
  suffix,
  minWidth = 112,
}: {
  value: number | null;
  onCommit: (next: number | null) => void;
  ariaLabel: string;
  suffix?: string;
  minWidth?: number | string;
}) {
  const [draft, setDraft] = useState(() => numericDraftValue(value));
  const [focused, setFocused] = useState(false);
  const revertOnBlurRef = useRef(false);

  useEffect(() => {
    if (!focused) setDraft(numericDraftValue(value));
  }, [focused, value]);

  const commitDraft = useCallback(() => {
    setFocused(false);
    if (revertOnBlurRef.current) {
      revertOnBlurRef.current = false;
      setDraft(numericDraftValue(value));
      return;
    }
    const parsed = parseNumericDraft(draft);
    if (parsed === undefined) {
      setDraft(numericDraftValue(value));
      return;
    }
    setDraft(numericDraftValue(parsed));
    if (parsed !== value) onCommit(parsed);
  }, [draft, onCommit, value]);

  return (
    <TextField
      type="text"
      size="small"
      value={draft}
      onFocus={() => {
        revertOnBlurRef.current = false;
        setFocused(true);
      }}
      onChange={(event) => {
        const next = event.target.value;
        if (/^-?[\d,]*(?:\.\d*)?$/.test(next)) setDraft(next);
      }}
      onBlur={commitDraft}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          revertOnBlurRef.current = true;
          setDraft(numericDraftValue(value));
          event.currentTarget.blur();
        }
      }}
      placeholder="0.00"
      autoComplete="off"
      inputProps={{
        inputMode: "decimal",
        "aria-label": ariaLabel,
        style: { textAlign: "right" },
      }}
      InputProps={{
        endAdornment: suffix ? (
          <Typography sx={{ ml: 1, color: "text.secondary", fontSize: 12 }}>
            {suffix}
          </Typography>
        ) : undefined,
      }}
      sx={{
        width: "100%",
        minWidth,
        "& .MuiOutlinedInput-root": {
          minHeight: 44,
          borderRadius: 1,
          bgcolor: "background.paper",
        },
        "& .MuiOutlinedInput-input": {
          px: 1.25,
          py: 1,
          fontSize: { xs: 16, md: 13 },
          fontWeight: 550,
          fontVariantNumeric: "tabular-nums",
        },
      }}
    />
  );
});

const EvaluatorNameField = memo(function EvaluatorNameField({
  value,
  onCommit,
  ariaLabel,
}: {
  value: string;
  onCommit: (next: string) => void;
  ariaLabel: string;
}) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  const revertOnBlurRef = useRef(false);

  useEffect(() => {
    if (!focused) setDraft(value);
  }, [focused, value]);

  const commitDraft = useCallback(() => {
    setFocused(false);
    if (revertOnBlurRef.current) {
      revertOnBlurRef.current = false;
      setDraft(value);
      return;
    }

    const next = draft.trim();
    setDraft(next);
    if (next !== value) onCommit(next);
  }, [draft, onCommit, value]);

  return (
    <TextField
      value={draft}
      onFocus={() => {
        revertOnBlurRef.current = false;
        setFocused(true);
      }}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commitDraft}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          revertOnBlurRef.current = true;
          setDraft(value);
          event.currentTarget.blur();
        }
      }}
      size="small"
      fullWidth
      autoComplete="off"
      inputProps={{ "aria-label": ariaLabel }}
      sx={{
        "& .MuiOutlinedInput-root": {
          minHeight: 44,
          borderRadius: 1,
          bgcolor: "background.paper",
        },
        "& .MuiOutlinedInput-input": {
          px: 1,
          py: 0.75,
          fontSize: { xs: 16, md: 13 },
        },
      }}
    />
  );
});

const TextDraftField = memo(function TextDraftField({
  value,
  onCommit,
  ariaLabel,
  placeholder,
  multiline = false,
  minRows = 1,
  minWidth = 0,
}: {
  value: string;
  onCommit: (next: string) => void;
  ariaLabel: string;
  placeholder?: string;
  multiline?: boolean;
  minRows?: number;
  minWidth?: number | string;
}) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  const revertOnBlurRef = useRef(false);

  useEffect(() => {
    if (!focused) setDraft(value);
  }, [focused, value]);

  const commitDraft = useCallback(() => {
    setFocused(false);
    if (revertOnBlurRef.current) {
      revertOnBlurRef.current = false;
      setDraft(value);
      return;
    }

    if (draft !== value) onCommit(draft);
  }, [draft, onCommit, value]);

  return (
    <TextField
      value={draft}
      onFocus={() => {
        revertOnBlurRef.current = false;
        setFocused(true);
      }}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commitDraft}
      onKeyDown={(event) => {
        if (!multiline && event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          revertOnBlurRef.current = true;
          setDraft(value);
          event.currentTarget.blur();
        }
      }}
      multiline={multiline}
      minRows={multiline ? minRows : undefined}
      maxRows={multiline ? Math.max(minRows, 4) : undefined}
      placeholder={placeholder}
      size="small"
      fullWidth
      autoComplete="off"
      inputProps={{ "aria-label": ariaLabel }}
      sx={{
        minWidth,
        "& .MuiOutlinedInput-root": {
          minHeight: multiline ? undefined : 40,
          borderRadius: 1,
          bgcolor: "background.paper",
        },
        "& .MuiOutlinedInput-input": {
          px: 1.25,
          py: 0.9,
          fontSize: { xs: 16, md: 13 },
        },
      }}
    />
  );
});

function useStableEvaluatorColumns(columns: AssetAdminScheduleEvaluatorColumn[]) {
  const stableRef = useRef(columns);
  const current = stableRef.current;
  const unchanged =
    current.length === columns.length &&
    current.every(
      (column, index) =>
        column.id === columns[index]?.id && column.name === columns[index]?.name
    );

  if (!unchanged) stableRef.current = columns.map((column) => ({ ...column }));
  return stableRef.current;
}

function LabeledValue({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        component="dt"
        sx={{ mb: 0.5, color: "text.secondary", fontSize: 12, fontWeight: 600 }}
      >
        {label}
      </Typography>
      <Typography
        component="dd"
        sx={{
          m: 0,
          minHeight: 44,
          px: 1.25,
          py: 1.15,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          bgcolor: "action.hover",
          color: "text.primary",
          fontSize: 14,
          lineHeight: 1.4,
          wordBreak: "break-word",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {readOnlyValue(value)}
      </Typography>
    </Box>
  );
}

function MobileSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      component="section"
      sx={{
        px: { xs: 2, sm: 2.5 },
        py: 2,
        borderTop: "1px solid",
        borderColor: "divider",
      }}
    >
      <Typography sx={{ mb: 1.5, fontSize: 15, fontWeight: 700 }}>{title}</Typography>
      {children}
    </Box>
  );
}

type UpdateRowField = <T extends keyof AssetAdminScheduleRow>(
  lotId: string,
  key: T,
  value: AssetAdminScheduleRow[T]
) => void;

const MobileLotCard = memo(function MobileLotCard({
  row,
  index,
  evaluatorColumns,
  onUpdateRow,
  onOpenGallery,
}: {
  row: AssetAdminScheduleRow;
  index: number;
  evaluatorColumns: AssetAdminScheduleEvaluatorColumn[];
  onUpdateRow: UpdateRowField;
  onOpenGallery: (title: string, urls: string[]) => void;
}) {
  const pictureCount = row.picture_urls.length || row.pictures;

  return (
    <Accordion
      defaultExpanded={index === 0}
      disableGutters
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: "8px !important",
        overflow: "hidden",
        bgcolor: "background.paper",
        "&::before": { display: "none" },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreRoundedIcon />}
        sx={{
          minHeight: 68,
          px: 2,
          "& .MuiAccordionSummary-content": { my: 1.25 },
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 17, fontWeight: 700 }}>{row.asset_id || row.lot_id}</Typography>
          <Typography noWrap sx={{ color: "text.secondary", fontSize: 13 }}>
            {row.asset_category || "Uncategorized asset"}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 0 }}>
        <MobileSection title="Asset details">
          <Box
            component="dl"
            sx={{
              m: 0,
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 1.25,
            }}
          >
            {([
              ["Asset Category", "asset_category"],
              ["Year", "year"],
              ["Make", "make"],
              ["Model", "model"],
              ["Serial Number", "serial_number"],
              ["Condition (1-5)", "condition_score"],
            ] as const).map(([label, key]) => (
              <Box key={key} sx={{ minWidth: 0 }}>
                <Typography sx={{ mb: 0.5, color: "text.secondary", fontSize: 12, fontWeight: 600 }}>
                  {label}
                </Typography>
                <TextDraftField
                  value={row[key]}
                  onCommit={(next) => onUpdateRow(row.lot_id, key, next)}
                  ariaLabel={`${label} for ${row.asset_id || row.lot_id}`}
                />
              </Box>
            ))}
          </Box>
          <Box sx={{ mt: 1.25 }}>
            <Typography sx={{ mb: 0.5, color: "text.secondary", fontSize: 12, fontWeight: 600 }}>
              CR Details
            </Typography>
            <TextDraftField
              value={row.cr_details}
              onCommit={(next) => onUpdateRow(row.lot_id, "cr_details", next)}
              ariaLabel={`CR details for ${row.asset_id || row.lot_id}`}
              multiline
              minRows={3}
            />
          </Box>
          <Box sx={{ mt: 1.25 }}>
            <Typography sx={{ mb: 0.5, color: "text.secondary", fontSize: 12, fontWeight: 600 }}>
              Location (City, State/Prov)
            </Typography>
            <TextDraftField
              value={row.location}
              onCommit={(next) => onUpdateRow(row.lot_id, "location", next)}
              placeholder="City, State/Prov"
              ariaLabel={`Location for ${row.asset_id || row.lot_id}`}
            />
          </Box>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<PhotoLibraryOutlinedIcon />}
            disabled={!row.picture_urls.length}
            onClick={() => onOpenGallery(`Lot ${row.asset_id}`, row.picture_urls)}
            fullWidth
            sx={{ mt: 1.25, minHeight: 44, borderRadius: 1, textTransform: "none" }}
          >
            {pictureCount
              ? `View ${pictureCount} picture${pictureCount === 1 ? "" : "s"}`
              : "No pictures"}
          </Button>
          {row.asset_insight ? (
            <Box sx={{ mt: 1.25 }}>
              <LabeledValue label="Asset Insight" value={row.asset_insight} />
            </Box>
          ) : null}
        </MobileSection>

        <MobileSection title="Evaluator values">
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 1.25,
            }}
          >
            {evaluatorColumns.map((column) => (
              <Box key={column.id} sx={{ minWidth: 0 }}>
                <Typography sx={{ mb: 0.5, color: "text.secondary", fontSize: 12, fontWeight: 600 }}>
                  {column.name || "Evaluator"}
                </Typography>
                <NumericDraftField
                  value={row.evaluator_values[column.id] ?? null}
                  onCommit={(next) =>
                    onUpdateRow(row.lot_id, "evaluator_values", {
                      ...row.evaluator_values,
                      [column.id]: next,
                    })
                  }
                  ariaLabel={`${column.name || "Evaluator"} value for ${row.asset_id || row.lot_id}`}
                  minWidth={0}
                />
              </Box>
            ))}
            <LabeledValue
              label="Average"
              value={formatCurrencyCell(getRowAppraiserAverage(row, evaluatorColumns))}
            />
          </Box>
        </MobileSection>

        <MobileSection title="Estimated values">
          <Box
            component="dl"
            sx={{
              m: 0,
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 1.25,
            }}
          >
            <LabeledValue label="Low Est. Sale Value ($)" value={formatCurrencyCell(row.low_est_sale_value)} />
            <LabeledValue label="High Est. Sale Value ($)" value={formatCurrencyCell(row.high_est_sale_value)} />
            <LabeledValue label="Buyer Premium %" value={`${row.buyer_premium_percent}%`} />
            <LabeledValue label="Buyer Premium ($)" value={formatCurrencyCell(row.buyer_premium_amount)} />
            <LabeledValue label="Total Expected Gross ($)" value={formatCurrencyCell(row.total_expected_gross)} />
            <LabeledValue label="Allocated Value ($)" value={formatCurrencyCell(row.allocated_value)} />
          </Box>
        </MobileSection>

        <MobileSection title="Costs & notes">
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 1.25,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ mb: 0.5, color: "text.secondary", fontSize: 12, fontWeight: 600 }}>
                Lien Search
              </Typography>
              <NumericDraftField
                value={row.lien_search}
                onCommit={(next) => onUpdateRow(row.lot_id, "lien_search", next)}
                ariaLabel={`Lien search cost for ${row.asset_id || row.lot_id}`}
                minWidth={0}
              />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ mb: 0.5, color: "text.secondary", fontSize: 12, fontWeight: 600 }}>
                Video Cost
              </Typography>
              <NumericDraftField
                value={row.video_cost}
                onCommit={(next) => onUpdateRow(row.lot_id, "video_cost", next)}
                ariaLabel={`Video cost for ${row.asset_id || row.lot_id}`}
                minWidth={0}
              />
            </Box>
            <LabeledValue label="Cleaning" value={formatCurrencyCell(row.cleaning)} />
            <LabeledValue label="Lotting Fee" value={formatCurrencyCell(row.lotting_fee)} />
            <LabeledValue label="Advertising" value={formatCurrencyCell(row.advertising)} />
          </Box>
          <Box sx={{ mt: 1.25 }}>
            <Typography sx={{ mb: 0.5, color: "text.secondary", fontSize: 12, fontWeight: 600 }}>
              Notes
            </Typography>
            <TextDraftField
              value={row.notes}
              onCommit={(next) => onUpdateRow(row.lot_id, "notes", next)}
              placeholder="Notes"
              ariaLabel={`Notes for ${row.asset_id || row.lot_id}`}
              multiline
              minRows={3}
            />
          </Box>
        </MobileSection>
      </AccordionDetails>
    </Accordion>
  );
});

function SummaryTable({
  title,
  rows,
}: {
  title: string;
  rows: SummaryRow[];
}) {
  return (
    <Paper
      variant="outlined"
      sx={{ minWidth: 0, overflow: "hidden", borderRadius: 1, bgcolor: "background.paper" }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "action.hover",
        }}
      >
        <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{title}</Typography>
      </Box>
      <TableContainer>
        <Table size="small">
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.label}>
                <TableCell sx={{ width: "52%", px: 2, py: 1.25, fontSize: 13, fontWeight: 600, borderColor: "divider" }}>
                  {row.label}
                </TableCell>
                <TableCell sx={{ px: 2, py: 1.25, fontSize: 13, borderColor: "divider", fontVariantNumeric: "tabular-nums" }}>
                  {row.value}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

function SummaryInput({
  value,
  onChange,
  ariaLabel,
  suffix,
}: {
  value: number | null;
  onChange: (next: number | null) => void;
  ariaLabel: string;
  suffix?: string;
}) {
  return (
    <NumericDraftField
      value={value}
      onCommit={onChange}
      ariaLabel={ariaLabel}
      suffix={suffix}
      minWidth={0}
    />
  );
}

export default function AssetScheduleSheet({
  preview,
  saving,
  saveError,
  saveSuccess,
  onSave,
  onClose,
  pageMode = false,
}: AssetScheduleSheetProps) {
  const theme = useTheme();
  const isCompactLayout = useMediaQuery(theme.breakpoints.down("lg"), { noSsr: true });
  const [sheet, setSheet] = useState<AssetAdminScheduleSheet | null>(
    preview.assetScheduleSheet ? cloneAssetScheduleSheet(preview.assetScheduleSheet) : null
  );
  const [gallery, setGallery] = useState<{ title: string; urls: string[]; index: number } | null>(null);
  const [activeTab, setActiveTab] = useState<AssetSheetTab>("scheduleA");
  const [selectedMobileLot, setSelectedMobileLot] = useState(0);
  const sheetRef = useRef(sheet);
  const reportIdRef = useRef(preview.reportId);
  const dirtyRef = useRef(false);

  useEffect(() => {
    const reportChanged = reportIdRef.current !== preview.reportId;
    if (reportChanged || !dirtyRef.current) {
      const nextSheet = preview.assetScheduleSheet
        ? cloneAssetScheduleSheet(preview.assetScheduleSheet)
        : null;
      sheetRef.current = nextSheet;
      setSheet(nextSheet);
    }
    if (reportChanged) {
      reportIdRef.current = preview.reportId;
      dirtyRef.current = false;
      setActiveTab("scheduleA");
      setSelectedMobileLot(0);
    }
  }, [preview.assetScheduleSheet, preview.reportId]);

  const derivedSummary = useMemo(() => (sheet ? deriveAssetScheduleSummary(sheet) : null), [sheet]);
  const stableEvaluatorColumns = useStableEvaluatorColumns(sheet?.evaluator_columns ?? []);

  const updateSheet = useCallback((mutator: (draft: AssetAdminScheduleSheet) => AssetAdminScheduleSheet) => {
    const current = sheetRef.current;
    if (!current) return;

    dirtyRef.current = true;
    // Keep the ref current synchronously so a Save click immediately following
    // an input blur always includes that field's last edit.
    const nextSheet = recalculateAssetScheduleSheet(mutator(cloneAssetScheduleSheet(current)));
    sheetRef.current = nextSheet;
    setSheet(nextSheet);
  }, []);

  const updateEvaluatorName = useCallback((columnId: string, name: string) => {
    updateSheet((draft) => ({
      ...draft,
      evaluator_columns: draft.evaluator_columns.map((column) =>
        column.id === columnId ? { ...column, name } : column
      ),
    }));
  }, [updateSheet]);

  const addEvaluator = useCallback(() => {
    updateSheet((draft) => {
      const nextColumn: AssetAdminScheduleEvaluatorColumn = {
        id: makeEvaluatorColumnId(),
        name: `Evaluator ${draft.evaluator_columns.length + 1}`,
      };
      return {
        ...draft,
        evaluator_columns: [...draft.evaluator_columns, nextColumn],
        rows: draft.rows.map((row) => ({
          ...row,
          evaluator_values: { ...row.evaluator_values, [nextColumn.id]: null },
        })),
      };
    });
  }, [updateSheet]);

  const removeEvaluator = useCallback((columnId: string) => {
    updateSheet((draft) => {
      if (draft.evaluator_columns.length <= 1) return draft;
      return {
        ...draft,
        evaluator_columns: draft.evaluator_columns.filter((column) => column.id !== columnId),
        rows: draft.rows.map((row) => {
          const nextValues = { ...row.evaluator_values };
          delete nextValues[columnId];
          return { ...row, evaluator_values: nextValues };
        }),
      };
    });
  }, [updateSheet]);

  const updateRowField = useCallback(<T extends keyof AssetAdminScheduleRow>(
    lotId: string,
    key: T,
    value: AssetAdminScheduleRow[T]
  ) => {
    updateSheet((draft) => ({
      ...draft,
      rows: draft.rows.map((row) => (row.lot_id === lotId ? { ...row, [key]: value } : row)),
    }));
  }, [updateSheet]);

  const updateFileSummaryField = useCallback(<T extends keyof AssetAdminScheduleFileSummary>(
    key: T,
    value: AssetAdminScheduleFileSummary[T]
  ) => {
    updateSheet((draft) => ({
      ...draft,
      file_summary: {
        ...draft.file_summary,
        [key]: value,
      },
    }));
  }, [updateSheet]);

  async function handleSave() {
    const current = sheetRef.current;
    if (!current) return;
    const payload = recalculateAssetScheduleSheet(current);
    await onSave(payload);
    dirtyRef.current = false;
    sheetRef.current = payload;
    setSheet(payload);
  }

  const openGallery = useCallback((title: string, urls: string[]) => {
    if (!urls.length) return;
    setGallery({ title, urls, index: 0 });
  }, []);

  const closeGallery = useCallback(() => {
    setGallery(null);
  }, []);

  const showPreviousImage = useCallback(() => {
    setGallery((current) => {
      if (!current || current.urls.length <= 1) return current;
      return {
        ...current,
        index: current.index === 0 ? current.urls.length - 1 : current.index - 1,
      };
    });
  }, []);

  const showNextImage = useCallback(() => {
    setGallery((current) => {
      if (!current || current.urls.length <= 1) return current;
      return {
        ...current,
        index: current.index === current.urls.length - 1 ? 0 : current.index + 1,
      };
    });
  }, []);

  const scheduleColumns = useMemo<ColumnDef<AssetAdminScheduleRow>[]>(() => {
    const staticColumns: ColumnDef<AssetAdminScheduleRow>[] = [
      { id: "asset_id", accessorKey: "asset_id", header: "Asset ID", size: 120, minSize: 120, maxSize: 120, cell: ({ row }) => <CompactReadOnlyCell value={row.original.asset_id} /> },
      {
        id: "asset_category",
        accessorKey: "asset_category",
        header: "Asset Category",
        size: 184,
        minSize: 184,
        maxSize: 184,
        cell: ({ row }) => (
          <TextDraftField
            value={row.original.asset_category}
            onCommit={(next) => updateRowField(row.original.lot_id, "asset_category", next)}
            ariaLabel={`Asset category for ${row.original.asset_id || row.original.lot_id}`}
          />
        ),
      },
      {
        id: "year",
        accessorKey: "year",
        header: "Year",
        size: 104,
        minSize: 104,
        maxSize: 104,
        cell: ({ row }) => (
          <TextDraftField
            value={row.original.year}
            onCommit={(next) => updateRowField(row.original.lot_id, "year", next)}
            ariaLabel={`Year for ${row.original.asset_id || row.original.lot_id}`}
          />
        ),
      },
      {
        id: "make",
        accessorKey: "make",
        header: "Make",
        size: 136,
        minSize: 136,
        maxSize: 136,
        cell: ({ row }) => (
          <TextDraftField
            value={row.original.make}
            onCommit={(next) => updateRowField(row.original.lot_id, "make", next)}
            ariaLabel={`Make for ${row.original.asset_id || row.original.lot_id}`}
          />
        ),
      },
      {
        id: "model",
        accessorKey: "model",
        header: "Model",
        size: 152,
        minSize: 152,
        maxSize: 152,
        cell: ({ row }) => (
          <TextDraftField
            value={row.original.model}
            onCommit={(next) => updateRowField(row.original.lot_id, "model", next)}
            ariaLabel={`Model for ${row.original.asset_id || row.original.lot_id}`}
          />
        ),
      },
      {
        id: "serial_number",
        accessorKey: "serial_number",
        header: "Serial Number",
        size: 184,
        minSize: 184,
        maxSize: 184,
        cell: ({ row }) => (
          <TextDraftField
            value={row.original.serial_number}
            onCommit={(next) => updateRowField(row.original.lot_id, "serial_number", next)}
            ariaLabel={`Serial number for ${row.original.asset_id || row.original.lot_id}`}
          />
        ),
      },
      {
        id: "cr_details",
        accessorKey: "cr_details",
        header: "CR Details",
        size: 280,
        minSize: 280,
        maxSize: 280,
        cell: ({ row }) => (
          <TextDraftField
            value={row.original.cr_details}
            onCommit={(next) => updateRowField(row.original.lot_id, "cr_details", next)}
            ariaLabel={`CR details for ${row.original.asset_id || row.original.lot_id}`}
            multiline
            minRows={2}
          />
        ),
      },
      {
        id: "condition_score",
        accessorKey: "condition_score",
        header: "Condition (1-5)",
        size: 144,
        minSize: 144,
        maxSize: 144,
        cell: ({ row }) => (
          <TextDraftField
            value={row.original.condition_score}
            onCommit={(next) => updateRowField(row.original.lot_id, "condition_score", next)}
            ariaLabel={`Condition for ${row.original.asset_id || row.original.lot_id}`}
          />
        ),
      },
      {
        id: "location",
        accessorKey: "location",
        header: "Location (City, State/Prov)",
        size: 220,
        minSize: 220,
        maxSize: 220,
        cell: ({ row }) => (
          <TextDraftField
            value={row.original.location}
            onCommit={(next) => updateRowField(row.original.lot_id, "location", next)}
            placeholder="City, State/Prov"
            ariaLabel={`Location for ${row.original.asset_id || row.original.lot_id}`}
          />
        ),
      },
      {
        id: "pictures",
        accessorKey: "pictures",
        header: "Pictures",
        size: 120,
        minSize: 120,
        maxSize: 120,
        cell: ({ row }) => {
          const pictureCount = row.original.picture_urls.length || row.original.pictures;
          if (!pictureCount) {
            return <CompactReadOnlyCell value={null} />;
          }

          const pictureLabel = `${pictureCount} picture${pictureCount === 1 ? "" : "s"}`;

          return (
            <Button
              variant="text"
              color="primary"
              onClick={() => openGallery(`Lot ${row.original.asset_id}`, row.original.picture_urls)}
              disabled={row.original.picture_urls.length === 0}
              sx={{
                minWidth: 0,
                minHeight: 36,
                px: 0.5,
                py: 0.5,
                borderRadius: 1,
                textTransform: "none",
                fontSize: 13,
                fontWeight: 500,
                justifyContent: "flex-start",
              }}
            >
              {pictureLabel}
            </Button>
          );
        },
      },
      { id: "asset_insight", accessorKey: "asset_insight", header: "Asset Insight", size: 176, minSize: 176, maxSize: 176, cell: ({ row }) => <CompactReadOnlyCell value={row.original.asset_insight} accent /> },
    ];

    const evaluatorColumns: ColumnDef<AssetAdminScheduleRow>[] = stableEvaluatorColumns.map((column) => ({
      id: `eval_${column.id}`,
      header: column.name || "Evaluator",
      size: 152,
      minSize: 152,
      maxSize: 152,
      cell: ({ row }) => (
        <NumericDraftField
          value={row.original.evaluator_values[column.id] ?? null}
          onCommit={(next) =>
            updateRowField(row.original.lot_id, "evaluator_values", {
              ...row.original.evaluator_values,
              [column.id]: next,
            })
          }
          ariaLabel={`${column.name || "Evaluator"} value for ${row.original.asset_id || row.original.lot_id}`}
        />
      ),
    }));

    const evaluatorAverageColumn: ColumnDef<AssetAdminScheduleRow> = {
      id: "evaluator_average",
      header: "Average",
      size: 144,
      minSize: 144,
      maxSize: 144,
      cell: ({ row }) => (
        <CompactReadOnlyCell
          value={formatCurrencyCell(getRowAppraiserAverage(row.original, stableEvaluatorColumns))}
          align="right"
        />
      ),
    };

    const resultColumns: ColumnDef<AssetAdminScheduleRow>[] = [
      { id: "low_est_sale_value", accessorKey: "low_est_sale_value", header: "Low Est. Sale Value ($)", size: 160, minSize: 160, maxSize: 160, cell: ({ row }) => <CompactReadOnlyCell value={formatCurrencyCell(row.original.low_est_sale_value)} align="right" /> },
      { id: "high_est_sale_value", accessorKey: "high_est_sale_value", header: "High Est. Sale Value ($)", size: 160, minSize: 160, maxSize: 160, cell: ({ row }) => <CompactReadOnlyCell value={formatCurrencyCell(row.original.high_est_sale_value)} align="right" /> },
      { id: "buyer_premium_percent", accessorKey: "buyer_premium_percent", header: "Buyer Premium %", size: 128, minSize: 128, maxSize: 128, cell: ({ row }) => <CompactReadOnlyCell value={`${row.original.buyer_premium_percent}%`} align="right" /> },
      { id: "buyer_premium_amount", accessorKey: "buyer_premium_amount", header: "Buyer Premium ($)", size: 152, minSize: 152, maxSize: 152, cell: ({ row }) => <CompactReadOnlyCell value={formatCurrencyCell(row.original.buyer_premium_amount)} align="right" /> },
      { id: "total_expected_gross", accessorKey: "total_expected_gross", header: "Total Expected Gross ($)", size: 176, minSize: 176, maxSize: 176, cell: ({ row }) => <CompactReadOnlyCell value={formatCurrencyCell(row.original.total_expected_gross)} align="right" /> },
      { id: "allocated_value", accessorKey: "allocated_value", header: "Allocated Value ($)", size: 152, minSize: 152, maxSize: 152, cell: ({ row }) => <CompactReadOnlyCell value={formatCurrencyCell(row.original.allocated_value)} align="right" /> },
      {
        id: "notes",
        accessorKey: "notes",
        header: "Notes",
        size: 220,
        minSize: 220,
        maxSize: 220,
        cell: ({ row }) => (
          <TextDraftField
            value={row.original.notes}
            onCommit={(next) => updateRowField(row.original.lot_id, "notes", next)}
            placeholder="Notes"
            ariaLabel={`Notes for ${row.original.asset_id || row.original.lot_id}`}
            multiline
            minRows={2}
          />
        ),
      },
      { id: "cleaning", accessorKey: "cleaning", header: "Cleaning", size: 120, minSize: 120, maxSize: 120, cell: ({ row }) => <CompactReadOnlyCell value={formatCurrencyCell(row.original.cleaning)} align="right" /> },
      {
        id: "lien_search",
        accessorKey: "lien_search",
        header: "Lien Search",
        size: 136,
        minSize: 136,
        maxSize: 136,
        cell: ({ row }) => (
          <NumericDraftField
            value={row.original.lien_search ?? null}
            onCommit={(next) => updateRowField(row.original.lot_id, "lien_search", next)}
            ariaLabel={`Lien search cost for ${row.original.asset_id || row.original.lot_id}`}
          />
        ),
      },
      {
        id: "video_cost",
        accessorKey: "video_cost",
        header: "Video Cost",
        size: 136,
        minSize: 136,
        maxSize: 136,
        cell: ({ row }) => (
          <NumericDraftField
            value={row.original.video_cost ?? null}
            onCommit={(next) => updateRowField(row.original.lot_id, "video_cost", next)}
            ariaLabel={`Video cost for ${row.original.asset_id || row.original.lot_id}`}
          />
        ),
      },
      { id: "lotting_fee", accessorKey: "lotting_fee", header: "Lotting Fee", size: 132, minSize: 132, maxSize: 132, cell: ({ row }) => <CompactReadOnlyCell value={formatCurrencyCell(row.original.lotting_fee)} align="right" /> },
      { id: "advertising", accessorKey: "advertising", header: "Advertising", size: 132, minSize: 132, maxSize: 132, cell: ({ row }) => <CompactReadOnlyCell value={formatCurrencyCell(row.original.advertising)} align="right" /> },
    ];

    return [
      {
        id: "identity",
        header: "Identity",
        columns: staticColumns.slice(0, 2),
      },
      {
        id: "asset_details",
        header: "Asset details",
        columns: staticColumns.slice(2),
      },
      {
        id: "evaluator_values",
        header: "Evaluator values",
        columns: [...evaluatorColumns, evaluatorAverageColumn],
      },
      {
        id: "estimated_values",
        header: "Estimated sale values",
        columns: resultColumns.slice(0, 2),
      },
      {
        id: "buyer_premium",
        header: "Buyer premium",
        columns: resultColumns.slice(2, 4),
      },
      {
        id: "totals",
        header: "Totals",
        columns: resultColumns.slice(4, 6),
      },
      {
        id: "costs_notes",
        header: "Costs & notes",
        columns: resultColumns.slice(6),
      },
    ];
  }, [openGallery, stableEvaluatorColumns, updateRowField]);

  const scheduleTable = useReactTable({
    data: sheet?.rows ?? [],
    columns: scheduleColumns,
    getCoreRowModel: getCoreRowModel(),
  });
  const scheduleTableWidth = scheduleTable
    .getAllLeafColumns()
    .reduce((total, column) => total + column.getSize(), 0);

  const metricRows = useMemo<SummaryRow[]>(() => {
    if (!sheet || !derivedSummary) return [];

    return [
      {
        label: "Buyers Premium Basis",
        value: (
          <FormControl size="small" fullWidth>
            <Select
              value={sheet.file_summary.buyers_premium_basis}
              onChange={(event) =>
                updateFileSummaryField(
                  "buyers_premium_basis",
                  event.target.value as AssetAdminScheduleBuyersPremiumBasis
                )
              }
              sx={{ borderRadius: 0, fontSize: 13 }}
            >
              <MenuItem value="uncapped">Uncapped</MenuItem>
              <MenuItem value="capped">Capped</MenuItem>
            </Select>
          </FormControl>
        ),
      },
      { label: "Total Asset Value ($)", value: formatCurrencyCell(derivedSummary.total_asset_value) || "-" },
      {
        label: "Total Risk-Weighted Value ($)",
        value: (
          <SummaryInput
            value={sheet.file_summary.total_risk_weighted_value}
            onChange={(next) => updateFileSummaryField("total_risk_weighted_value", next)}
            ariaLabel="Total risk-weighted value"
          />
        ),
      },
      {
        label: "File Risk Multiplier",
        value: (
          <SummaryInput
            value={sheet.file_summary.file_risk_multiplier}
            onChange={(next) => updateFileSummaryField("file_risk_multiplier", next)}
            ariaLabel="File risk multiplier"
          />
        ),
      },
      { label: "% Low Risk Value", value: formatPercentCell(derivedSummary.low_risk_percent) || "-" },
      { label: "% Medium Risk Value", value: formatPercentCell(derivedSummary.medium_risk_percent) || "-" },
      { label: "% High Risk Value", value: formatPercentCell(derivedSummary.high_risk_percent) || "-" },
      { label: "Overall File Risk Rating", value: derivedSummary.overall_file_risk_rating },
      { label: "NMG", value: formatCurrencyCell(derivedSummary.selected_nmg) || "-" },
      { label: "Cash Purchase Price", value: formatCurrencyCell(derivedSummary.selected_cash_purchase_price) || "-" },
      { label: "Total Projected Costs", value: formatCurrencyCell(derivedSummary.total_projected_costs) || "-" },
      {
        label: "Commission % No Guarantee",
        value: (
          <SummaryInput
            value={sheet.file_summary.commission_percent_no_guarantee}
            onChange={(next) => updateFileSummaryField("commission_percent_no_guarantee", next)}
            ariaLabel="Commission percent with no guarantee"
            suffix="%"
          />
        ),
      },
      {
        label: "Offer #2 NMG / Overage %",
        value: (
          <SummaryInput
            value={sheet.file_summary.offer2_nmg_percent * 100}
            onChange={(next) =>
              updateFileSummaryField(
                "offer2_nmg_percent",
                Math.max(0, Math.min(100, next ?? 78.5)) / 100
              )
            }
            ariaLabel="Offer 2 NMG percent"
            suffix="%"
          />
        ),
      },
      {
        label: "Capped Threshold %",
        value: (
          <SummaryInput
            value={sheet.file_summary.capped_threshold_percent * 100}
            onChange={(next) =>
              updateFileSummaryField(
                "capped_threshold_percent",
                Math.max(0, Math.min(100, next ?? 10)) / 100
              )
            }
            ariaLabel="Capped threshold percent"
            suffix="%"
          />
        ),
      },
    ];
  }, [derivedSummary, sheet, updateFileSummaryField]);

  const uncappedRows = useMemo<SummaryRow[]>(() => {
    if (!sheet || !derivedSummary) return [];
    const offer2PercentLabel = new Intl.NumberFormat("en-CA", {
      maximumFractionDigits: 2,
    }).format(sheet.file_summary.offer2_nmg_percent * 100);
    const commissionLabel =
      sheet.file_summary.commission_percent_no_guarantee === null
        ? "Offer #3 Commission"
        : `Offer #3 Commission (${sheet.file_summary.commission_percent_no_guarantee}%)`;

    return [
      { label: "Get", value: formatCurrencyCell(derivedSummary.uncapped.get) || "-" },
      { label: "Costs", value: formatCurrencyCell(derivedSummary.uncapped.costs) || "-" },
      { label: "Get After Costs", value: formatCurrencyCell(derivedSummary.uncapped.get_after_costs) || "-" },
      { label: "Adjusted Get", value: formatCurrencyCell(derivedSummary.uncapped.adjusted_get) || "-" },
      { label: "15% B.P.", value: formatCurrencyCell(derivedSummary.uncapped.bp_15) || "-" },
      { label: "Potential Get", value: formatCurrencyCell(derivedSummary.uncapped.potential_get) || "-" },
      { label: "Adjusted Potential Get", value: formatCurrencyCell(derivedSummary.uncapped.adjusted_potential_get) || "-" },
      { label: "Potential 15% B.P.", value: formatCurrencyCell(derivedSummary.uncapped.potential_bp_15) || "-" },
      { label: "Offer #1 Cash Offer (90%)", value: formatCurrencyCell(derivedSummary.uncapped.offer1_cash_offer) || "-" },
      { label: "Offer #1 Total Costs", value: formatCurrencyCell(derivedSummary.uncapped.offer1_total_costs) || "-" },
      { label: "Offer #1 McD Take", value: formatCurrencyCell(derivedSummary.uncapped.offer1_mcd_take) || "-" },
      { label: "Offer #1 ROI", value: formatPercentCell(derivedSummary.uncapped.offer1_roi) || "-" },
      { label: "Offer #1 Risk", value: formatCurrencyCell(derivedSummary.uncapped.offer1_risk) || "-" },
      { label: `Offer #2 NMG (${offer2PercentLabel}%)`, value: formatCurrencyCell(derivedSummary.uncapped.offer2_nmg) || "-" },
      { label: "Offer #2 Threshold", value: formatCurrencyCell(derivedSummary.uncapped.offer2_threshold) || "-" },
      { label: "Offer #2 Upper Value", value: formatCurrencyCell(derivedSummary.uncapped.offer2_upper_value) || "-" },
      { label: "Offer #2 Total Costs", value: formatCurrencyCell(derivedSummary.uncapped.offer2_total_costs) || "-" },
      { label: "Offer #2 Aquajet's Take", value: formatCurrencyCell(derivedSummary.uncapped.offer2_aquajets_take) || "-" },
      { label: "Offer #2 Overage", value: formatCurrencyCell(derivedSummary.uncapped.offer2_overage) || "-" },
      { label: "Offer #2 McD Take", value: formatCurrencyCell(derivedSummary.uncapped.offer2_mcd_take) || "-" },
      { label: "Offer #2 ROI", value: formatPercentCell(derivedSummary.uncapped.offer2_roi) || "-" },
      { label: "Offer #2 Risk", value: formatCurrencyCell(derivedSummary.uncapped.offer2_risk) || "-" },
      { label: "Aquajet's Potential Take", value: formatCurrencyCell(derivedSummary.uncapped.aquajets_potential_take) || "-" },
      { label: "McD Potential Take", value: formatCurrencyCell(derivedSummary.uncapped.mcd_potential_take) || "-" },
      { label: "Potential ROI", value: formatPercentCell(derivedSummary.uncapped.potential_roi) || "-" },
      { label: commissionLabel, value: formatCurrencyCell(derivedSummary.uncapped.offer3_mcd_take) || "-" },
    ];
  }, [derivedSummary, sheet]);

  const cappedRows = useMemo<SummaryRow[]>(() => {
    if (!derivedSummary) return [];
    return [
      { label: "AVG", value: formatCurrencyCell(derivedSummary.capped.avg) || "-" },
      { label: "HIGH", value: formatCurrencyCell(derivedSummary.capped.high) || "-" },
      { label: "LOW", value: formatCurrencyCell(derivedSummary.capped.low) || "-" },
      { label: "BP", value: formatCurrencyCell(derivedSummary.capped.bp) || "-" },
      { label: "Sale Total Inc BP", value: formatCurrencyCell(derivedSummary.capped.sale_total_inc_bp) || "-" },
      { label: "Ads", value: formatCurrencyCell(derivedSummary.capped.ads) || "-" },
      { label: "SVR", value: formatCurrencyCell(derivedSummary.capped.svr) || "-" },
      { label: "Refurb", value: formatCurrencyCell(derivedSummary.capped.refurb) || "-" },
      { label: "Total Cost", value: formatCurrencyCell(derivedSummary.capped.total_cost) || "-" },
      { label: "NMG", value: formatCurrencyCell(derivedSummary.capped.nmg) || "-" },
      { label: "Threshold", value: formatCurrencyCell(derivedSummary.capped.threshold) || "-" },
      { label: "Risk", value: formatPercentCell(derivedSummary.capped.risk) || "-" },
    ];
  }, [derivedSummary]);

  if (!sheet || !derivedSummary) {
    return <Box sx={{ py: 6, textAlign: "center", color: "text.secondary" }}>No asset schedule sheet available.</Box>;
  }

  return (
    <Box
      sx={{
        display: "flex",
        height: "100%",
        minHeight: 0,
        flexDirection: "column",
        bgcolor: "background.paper",
      }}
    >
      <Box
        sx={{
          flexShrink: 0,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, next) => setActiveTab(next)}
          variant="standard"
          sx={{
            px: { xs: 1.5, sm: 2.5 },
            minHeight: 48,
            "& .MuiTabs-indicator": { height: 3 },
            "& .MuiTab-root": {
              flex: { xs: "1 1 0", sm: "0 0 auto" },
              minHeight: 48,
              minWidth: { xs: 0, sm: 168 },
              px: 1.5,
              textTransform: "none",
              fontSize: { xs: 14, sm: 15 },
              fontWeight: 650,
            },
          }}
        >
          <Tab value="scheduleA" label={pageMode ? "Lots" : "Schedule A"} />
          <Tab value="fileSummary" label="File Summary" />
        </Tabs>

        <Box
          sx={{
            display: { xs: "none", lg: "flex" },
            minHeight: 72,
            px: 2.5,
            py: 1.5,
            borderTop: "1px solid",
            borderColor: "divider",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          {activeTab === "scheduleA" ? (
            <Stack
              direction="row"
              spacing={1.25}
              alignItems="center"
              sx={{ minWidth: 0, flex: "1 1 auto" }}
            >
              <Typography
                sx={{
                  flex: "0 0 auto",
                  color: "text.secondary",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                Evaluators
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  minWidth: 0,
                  maxWidth: "min(760px, 100%)",
                  gap: 1,
                  overflowX: "auto",
                  scrollbarWidth: "thin",
                }}
              >
                {sheet.evaluator_columns.map((column) => (
                  <Stack
                    key={column.id}
                    direction="row"
                    spacing={0.5}
                    alignItems="center"
                    sx={{ width: 220, flex: "0 0 220px" }}
                  >
                    <EvaluatorNameField
                      value={column.name}
                      onCommit={(next) => updateEvaluatorName(column.id, next)}
                      ariaLabel={`Name for ${column.name || "evaluator"}`}
                    />
                    <Tooltip title="Remove evaluator" arrow>
                      <span>
                        <IconButton
                          aria-label={`Remove ${column.name || "evaluator"}`}
                          disabled={sheet.evaluator_columns.length <= 1}
                          onClick={() => removeEvaluator(column.id)}
                          sx={{
                            width: 40,
                            height: 40,
                            border: "1px solid",
                            borderColor: "divider",
                            borderRadius: 1,
                          }}
                        >
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                ))}
              </Box>
            </Stack>
          ) : (
            <Box />
          )}

          <Stack direction="row" spacing={1} sx={{ flex: "0 0 auto" }}>
            {activeTab === "scheduleA" ? (
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<AddRoundedIcon />}
                onClick={addEvaluator}
                sx={{ minHeight: 44, borderRadius: 1, textTransform: "none", whiteSpace: "nowrap" }}
              >
                Add Evaluator
              </Button>
            ) : null}
            <Button
              variant="contained"
              color="primary"
              startIcon={<SaveRoundedIcon />}
              disabled={saving}
              onPointerDown={() => {
                if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
              }}
              onClick={() => void handleSave()}
              sx={{ minHeight: 44, borderRadius: 1, textTransform: "none", whiteSpace: "nowrap" }}
            >
              {saving ? "Saving..." : pageMode ? "Save changes" : "Save"}
            </Button>
            {!pageMode && onClose ? (
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<CloseRoundedIcon />}
                onClick={onClose}
                sx={{ minHeight: 44, borderRadius: 1, textTransform: "none" }}
              >
                Close
              </Button>
            ) : null}
          </Stack>
        </Box>

        {saveError ? (
          <Alert severity="error" sx={{ mx: 2, my: 1, borderRadius: 1 }}>
            {saveError}
          </Alert>
        ) : null}
        {saveSuccess ? (
          <Alert severity="success" sx={{ mx: 2, my: 1, borderRadius: 1 }}>
            {saveSuccess}
          </Alert>
        ) : null}
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          bgcolor: pageMode ? "background.paper" : "background.default",
        }}
      >
        {activeTab === "scheduleA" ? (
          <>
            {!isCompactLayout ? (
              <TableContainer
                component={Paper}
                variant="outlined"
                elevation={0}
                sx={{
                  width: "calc(100% - 32px)",
                  height: "calc(100% - 32px)",
                  m: 2,
                  overflow: "auto",
                  overscrollBehavior: "contain",
                  scrollbarGutter: "stable",
                  borderColor: "#d9dde3",
                  borderRadius: 1.5,
                  bgcolor: "background.paper",
                }}
              >
                <Table
                  stickyHeader
                  size="small"
                  aria-label="Asset schedule lots"
                  sx={{
                    width: scheduleTableWidth,
                    tableLayout: "fixed",
                    borderCollapse: "separate",
                    borderSpacing: 0,
                  }}
                >
                <colgroup>
                  {scheduleTable.getAllLeafColumns().map((column) => (
                    <col key={column.id} style={{ width: column.getSize() }} />
                  ))}
                </colgroup>
                <TableHead>
                  {scheduleTable.getHeaderGroups().map((headerGroup) => (
                    <TableRow
                      key={headerGroup.id}
                      sx={{
                        height: headerGroup.depth === 0 ? 36 : 54,
                      }}
                    >
                      {headerGroup.headers.map((header) => {
                        const stickyAssetId = header.column.id === "asset_id";
                        const isGroupHeader = headerGroup.depth === 0;
                        return (
                          <TableCell
                            key={header.id}
                            colSpan={header.colSpan}
                            sx={{
                              position: "sticky",
                              top: isGroupHeader ? 0 : 36,
                              left: stickyAssetId ? 0 : "auto",
                              zIndex: stickyAssetId ? 8 : isGroupHeader ? 6 : 7,
                              ...(!isGroupHeader
                                ? {
                                    width: header.getSize(),
                                    minWidth: header.getSize(),
                                    maxWidth: header.getSize(),
                                  }
                                : null),
                              height: isGroupHeader ? 36 : 54,
                              minHeight: isGroupHeader ? 36 : 54,
                              maxHeight: isGroupHeader ? 36 : 54,
                              boxSizing: "border-box",
                              overflow: "hidden",
                              bgcolor: isGroupHeader ? "#f2f4f7" : "#f8f9fb",
                              color: "text.primary",
                              borderBottom: "1px solid",
                              borderRight: "1px solid",
                              borderColor: "#d9dde3",
                              fontWeight: 700,
                              fontSize: isGroupHeader ? 12 : 12.5,
                              lineHeight: 1.25,
                              letterSpacing: isGroupHeader ? "0.01em" : 0,
                              textAlign: isGroupHeader ? "center" : "left",
                              verticalAlign: "middle",
                              p: 0,
                              ...(stickyAssetId
                                ? {
                                    boxShadow: "5px 0 10px -8px rgba(15, 23, 42, 0.7)",
                                  }
                                : null),
                            }}
                          >
                            <Box
                              sx={{
                                display: isGroupHeader ? "block" : "-webkit-box",
                                width: "100%",
                                px: isGroupHeader ? 1 : 1.5,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: isGroupHeader ? "nowrap" : "normal",
                                WebkitBoxOrient: "vertical",
                                WebkitLineClamp: isGroupHeader ? 1 : 2,
                              }}
                            >
                              {header.isPlaceholder
                                ? null
                                : flexRender(header.column.columnDef.header, header.getContext())}
                            </Box>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableHead>
                <TableBody>
                  {scheduleTable.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      sx={{
                        height: 96,
                        "& > .MuiTableCell-root": {
                          bgcolor: row.index % 2 === 0 ? "background.paper" : "#fbfcfd",
                        },
                        "&:hover > .MuiTableCell-root": {
                          bgcolor: "#f5f7fa",
                        },
                      }}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const stickyAssetId = cell.column.id === "asset_id";
                        return (
                          <TableCell
                            key={cell.id}
                            sx={{
                              position: stickyAssetId ? "sticky" : "static",
                              left: stickyAssetId ? 0 : "auto",
                              zIndex: stickyAssetId ? 2 : "auto",
                              width: cell.column.getSize(),
                              minWidth: cell.column.getSize(),
                              maxWidth: cell.column.getSize(),
                              height: 96,
                              maxHeight: 96,
                              boxSizing: "border-box",
                              overflow: "hidden",
                              borderBottom: "1px solid",
                              borderRight: "1px solid",
                              borderColor: "#e2e5e9",
                              verticalAlign: "middle",
                              py: 1,
                              px: 1.5,
                              ...(stickyAssetId
                                ? {
                                    fontWeight: 700,
                                    boxShadow: "5px 0 10px -8px rgba(15, 23, 42, 0.7)",
                                  }
                                : null),
                            }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
                </Table>
              </TableContainer>
            ) : null}

            {isCompactLayout ? (
              <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
                {sheet.rows.length ? (
                  <Box
                    component="nav"
                    aria-label="Schedule lots"
                    sx={{
                      display: "flex",
                      gap: 1,
                      mx: { xs: -1.5, sm: -2.5 },
                      mb: 1.5,
                      px: { xs: 1.5, sm: 2.5 },
                      pb: 0.5,
                      overflowX: "auto",
                      scrollbarWidth: "none",
                      "&::-webkit-scrollbar": { display: "none" },
                    }}
                  >
                    {sheet.rows.map((row, index) => {
                      const selected = selectedMobileLot === index;
                      return (
                        <Button
                          key={row.lot_id}
                          aria-pressed={selected}
                          variant={selected ? "outlined" : "text"}
                          color={selected ? "primary" : "inherit"}
                          onClick={() => setSelectedMobileLot(index)}
                          sx={{
                            minWidth: 104,
                            minHeight: 44,
                            flex: "0 0 auto",
                            borderRadius: 1,
                            borderColor: selected ? "primary.main" : "divider",
                            color: selected ? "primary.main" : "text.secondary",
                            bgcolor: selected ? "background.paper" : "transparent",
                            fontSize: 13,
                            fontWeight: selected ? 700 : 600,
                            textTransform: "none",
                          }}
                        >
                          Lot {mobileLotNumber(row, index)}
                        </Button>
                      );
                    })}
                  </Box>
                ) : null}

                <Paper
                  variant="outlined"
                  sx={{
                    mb: 1.5,
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: "background.paper",
                  }}
                >
                  <Typography sx={{ mb: 1, fontSize: 13, fontWeight: 700 }}>
                    Evaluators
                  </Typography>
                  <Stack spacing={1}>
                    {sheet.evaluator_columns.map((column) => (
                      <Stack key={column.id} direction="row" spacing={1} alignItems="center">
                        <EvaluatorNameField
                          value={column.name}
                          onCommit={(next) => updateEvaluatorName(column.id, next)}
                          ariaLabel={`Name for ${column.name || "evaluator"}`}
                        />
                        <IconButton
                          aria-label={`Remove ${column.name || "evaluator"}`}
                          disabled={sheet.evaluator_columns.length <= 1}
                          onClick={() => removeEvaluator(column.id)}
                          sx={{ width: 44, height: 44, border: "1px solid", borderColor: "divider", borderRadius: 1 }}
                        >
                          <DeleteOutlineRoundedIcon />
                        </IconButton>
                      </Stack>
                    ))}
                  </Stack>
                </Paper>

                {sheet.rows[selectedMobileLot] ? (
                  <MobileLotCard
                    key={sheet.rows[selectedMobileLot].lot_id}
                    row={sheet.rows[selectedMobileLot]}
                    index={selectedMobileLot}
                    evaluatorColumns={stableEvaluatorColumns}
                    onUpdateRow={updateRowField}
                    onOpenGallery={openGallery}
                  />
                ) : null}
              </Box>
            ) : null}
          </>
        ) : null}

        {activeTab === "fileSummary" ? (
          <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "minmax(0, 1fr)",
                  md: "repeat(2, minmax(0, 1fr))",
                  xl: "repeat(3, minmax(0, 1fr))",
                },
                gap: 2,
                alignItems: "start",
              }}
            >
              <SummaryTable title="Metric" rows={metricRows} />
              <SummaryTable title="Uncapped Buyers Premium Scenario" rows={uncappedRows} />
              <SummaryTable title="Capped Buyers Premium Scenario" rows={cappedRows} />
            </Box>
          </Box>
        ) : null}
      </Box>

      <Stack
        direction="row"
        spacing={1}
        sx={{
          display: { xs: "flex", lg: "none" },
          flexShrink: 0,
          p: 1.25,
          borderTop: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          boxShadow: "0 -8px 24px rgba(15, 23, 42, 0.08)",
        }}
      >
        {activeTab === "scheduleA" ? (
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<AddRoundedIcon />}
            onClick={addEvaluator}
            sx={{
              minWidth: 0,
              minHeight: 46,
              flex: 1,
              borderRadius: 1,
              px: 1,
              fontSize: 12,
              textTransform: "none",
              whiteSpace: "nowrap",
              "& .MuiButton-startIcon": { ml: 0, mr: 0.5 },
              "& .MuiSvgIcon-root": { fontSize: 18 },
            }}
          >
            Add Evaluator
          </Button>
        ) : null}
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveRoundedIcon />}
          disabled={saving}
          onPointerDown={() => {
            if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
          }}
          onClick={() => void handleSave()}
          sx={{
            minWidth: 0,
            minHeight: 46,
            flex: 1,
            borderRadius: 1,
            px: 1,
            fontSize: 13,
            textTransform: "none",
            whiteSpace: "nowrap",
            "& .MuiButton-startIcon": { ml: 0, mr: 0.5 },
            "& .MuiSvgIcon-root": { fontSize: 18 },
          }}
        >
          {saving ? "Saving..." : pageMode ? "Save changes" : "Save"}
        </Button>
        {!pageMode && onClose ? (
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<CloseRoundedIcon />}
            onClick={onClose}
            sx={{
              minWidth: 0,
              minHeight: 46,
              flex: 1,
              borderRadius: 1,
              px: 1,
              fontSize: 13,
              textTransform: "none",
              whiteSpace: "nowrap",
              "& .MuiButton-startIcon": { ml: 0, mr: 0.5 },
              "& .MuiSvgIcon-root": { fontSize: 18 },
            }}
          >
            Close
          </Button>
        ) : null}
      </Stack>

      <Dialog
        open={Boolean(gallery)}
        onClose={closeGallery}
        fullWidth
        maxWidth="lg"
        PaperProps={{ sx: { borderRadius: { xs: 0, sm: 2 }, overflow: "hidden" } }}
      >
        <DialogContent sx={{ p: 0, bgcolor: "#111827" }}>
          {gallery ? (
            <Box sx={{ position: "relative", minHeight: { xs: 320, md: 560 }, bgcolor: "#111827" }}>
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  zIndex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  px: 2,
                  py: 1.5,
                  color: "common.white",
                  bgcolor: "rgba(17, 24, 39, 0.72)",
                }}
              >
                <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                  {gallery.title} ({gallery.index + 1} / {gallery.urls.length})
                </Typography>
                <IconButton onClick={closeGallery} sx={{ color: "common.white", borderRadius: 1 }}>
                  <CloseRoundedIcon />
                </IconButton>
              </Box>

              <Box
                component="img"
                src={gallery.urls[gallery.index]}
                alt={`${gallery.title} ${gallery.index + 1}`}
                sx={{
                  display: "block",
                  width: "100%",
                  height: { xs: 320, md: 560 },
                  objectFit: "contain",
                  bgcolor: "#111827",
                }}
              />

              {gallery.urls.length > 1 ? (
                <>
                  <IconButton
                    onClick={showPreviousImage}
                    sx={{
                      position: "absolute",
                      left: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "common.white",
                      bgcolor: "rgba(17, 24, 39, 0.72)",
                      borderRadius: 1,
                      "&:hover": { bgcolor: "rgba(17, 24, 39, 0.88)" },
                    }}
                  >
                    <ChevronLeftRoundedIcon />
                  </IconButton>
                  <IconButton
                    onClick={showNextImage}
                    sx={{
                      position: "absolute",
                      right: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "common.white",
                      bgcolor: "rgba(17, 24, 39, 0.72)",
                      borderRadius: 1,
                      "&:hover": { bgcolor: "rgba(17, 24, 39, 0.88)" },
                    }}
                  >
                    <ChevronRightRoundedIcon />
                  </IconButton>
                </>
              ) : null}
            </Box>
          ) : null}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
