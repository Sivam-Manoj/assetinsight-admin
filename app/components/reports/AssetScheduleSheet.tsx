"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
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
  Typography,
} from "@mui/material";
import type {
  AssetAdminScheduleBuyersPremiumBasis,
  AssetAdminScheduleEvaluatorColumn,
  AssetAdminScheduleFileSummary,
  AssetAdminScheduleMarketCheck,
  AssetAdminScheduleRow,
  AssetAdminScheduleSheet,
  ReportPreviewPayload,
} from "@/app/components/reports/reportPreviewTypes";
import {
  cloneAssetScheduleSheet,
  deriveAssetScheduleSummary,
  formatCurrencyCell,
  formatPercentCell,
  makeEvaluatorColumnId,
  recalculateAssetScheduleSheet,
} from "@/app/components/reports/assetScheduleSheetUtils";

type AssetScheduleSheetProps = {
  preview: ReportPreviewPayload;
  saving: boolean;
  saveError: string | null;
  saveSuccess: string | null;
  onSave: (sheet: AssetAdminScheduleSheet) => Promise<void>;
  onClose: () => void;
};

type AssetSheetTab = "scheduleA" | "marketCheck" | "fileSummary";

type SummaryRow = {
  label: string;
  value: React.ReactNode;
};

const marketCheckFields: Array<{
  key: Exclude<keyof AssetAdminScheduleMarketCheck, "notes">;
  label: string;
  options: string[];
}> = [
  { key: "comparable_count", label: "Comparable Count", options: ["", "High", "Moderate", "Low"] },
  { key: "avg_retail_asking_price", label: "Avg Retail Asking Price ($)", options: ["", "High", "Moderate", "Low"] },
  { key: "market_saturation", label: "Market Saturation", options: ["", "Low", "Moderate", "High"] },
  { key: "market_velocity", label: "Market Velocity", options: ["", "Fast", "Normal", "Slow"] },
  { key: "regional_demand", label: "Regional Demand", options: ["", "Strong", "Average", "Weak"] },
];

function parseNumberInput(value: string) {
  if (!value.trim()) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readOnlyValue(value: string | number | null | undefined) {
  return value === null || value === undefined || value === "" ? "-" : String(value);
}

function marketCheckEditor(
  value: AssetAdminScheduleMarketCheck,
  onChange: (next: AssetAdminScheduleMarketCheck) => void
) {
  return (
    <Box sx={{ minWidth: 220 }}>
      {marketCheckFields.map((field, index) => (
        <Stack
          key={field.key}
          direction="row"
          spacing={0.75}
          alignItems="center"
          sx={{
            py: 0.5,
            borderBottom: index === marketCheckFields.length - 1 ? "none" : "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="caption" sx={{ minWidth: 110, color: "text.secondary", fontWeight: 600 }}>
            {field.label}
          </Typography>
          <FormControl size="small" fullWidth>
            <Select
              value={value[field.key]}
              displayEmpty
              onChange={(event) =>
                onChange({
                  ...value,
                  [field.key]: event.target.value as AssetAdminScheduleMarketCheck[typeof field.key],
                })
              }
              sx={{
                borderRadius: 0,
                bgcolor: "common.white",
                fontSize: 12,
                minHeight: 32,
                "& .MuiSelect-select": { py: 0.75 },
              }}
            >
              {field.options.map((option) => (
                <MenuItem key={option || "blank"} value={option}>
                  {option || "-"}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      ))}
    </Box>
  );
}

function CompactReadOnlyCell({ value }: { value: string | number | null | undefined }) {
  return (
    <Box
      sx={{
        fontSize: 13,
        lineHeight: 1.35,
        color: "text.primary",
        whiteSpace: "normal",
        wordBreak: "break-word",
      }}
    >
      {readOnlyValue(value)}
    </Box>
  );
}

function SummaryTable({
  title,
  rows,
}: {
  title: string;
  rows: SummaryRow[];
}) {
  return (
    <Box sx={{ minWidth: 340, flex: 1 }}>
      <Box
        sx={{
          px: 1.5,
          py: 1,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "#f3f4f6",
        }}
      >
        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{title}</Typography>
      </Box>
      <TableContainer component={Paper} square elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderTop: "none" }}>
        <Table size="small">
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.label}>
                <TableCell sx={{ width: "56%", fontSize: 13, fontWeight: 600, borderColor: "divider" }}>
                  {row.label}
                </TableCell>
                <TableCell sx={{ fontSize: 13, borderColor: "divider" }}>{row.value}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

function SummaryInput({
  value,
  onChange,
  suffix,
}: {
  value: number | null;
  onChange: (next: number | null) => void;
  suffix?: string;
}) {
  return (
    <TextField
      type="number"
      size="small"
      value={value ?? ""}
      onChange={(event) => onChange(parseNumberInput(event.target.value))}
      placeholder="0.00"
      inputProps={{ step: "0.01" }}
      InputProps={{
        endAdornment: suffix ? (
          <Typography sx={{ fontSize: 12, color: "text.secondary", ml: 1 }}>{suffix}</Typography>
        ) : undefined,
      }}
      sx={{
        width: "100%",
        "& .MuiOutlinedInput-root": { borderRadius: 0 },
        "& .MuiOutlinedInput-input": { px: 1.25, py: 0.85, fontSize: 13 },
      }}
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
}: AssetScheduleSheetProps) {
  const [sheet, setSheet] = useState<AssetAdminScheduleSheet | null>(
    preview.assetScheduleSheet ? cloneAssetScheduleSheet(preview.assetScheduleSheet) : null
  );
  const [gallery, setGallery] = useState<{ title: string; urls: string[]; index: number } | null>(null);
  const [activeTab, setActiveTab] = useState<AssetSheetTab>("scheduleA");

  useEffect(() => {
    setSheet(preview.assetScheduleSheet ? cloneAssetScheduleSheet(preview.assetScheduleSheet) : null);
    setActiveTab("scheduleA");
  }, [preview]);

  const serializedInitial = useMemo(
    () => JSON.stringify(preview.assetScheduleSheet || null),
    [preview.assetScheduleSheet]
  );
  const serializedCurrent = useMemo(() => JSON.stringify(sheet || null), [sheet]);
  const isDirty = serializedCurrent !== serializedInitial;
  const derivedSummary = useMemo(() => (sheet ? deriveAssetScheduleSummary(sheet) : null), [sheet]);

  const updateSheet = useCallback((mutator: (draft: AssetAdminScheduleSheet) => AssetAdminScheduleSheet) => {
    setSheet((current) => {
      if (!current) return current;
      return recalculateAssetScheduleSheet(mutator(cloneAssetScheduleSheet(current)));
    });
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
    if (!sheet) return;
    await onSave(recalculateAssetScheduleSheet(sheet));
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
    if (!sheet) return [];

    const staticColumns: ColumnDef<AssetAdminScheduleRow>[] = [
      { id: "asset_id", accessorKey: "asset_id", header: "Asset ID", cell: ({ row }) => <CompactReadOnlyCell value={row.original.asset_id} /> },
      { id: "asset_category", accessorKey: "asset_category", header: "Asset Category", cell: ({ row }) => <CompactReadOnlyCell value={row.original.asset_category} /> },
      { id: "year", accessorKey: "year", header: "Year", cell: ({ row }) => <CompactReadOnlyCell value={row.original.year} /> },
      { id: "make", accessorKey: "make", header: "Make", cell: ({ row }) => <CompactReadOnlyCell value={row.original.make} /> },
      { id: "model", accessorKey: "model", header: "Model", cell: ({ row }) => <CompactReadOnlyCell value={row.original.model} /> },
      { id: "serial_number", accessorKey: "serial_number", header: "Serial Number", cell: ({ row }) => <CompactReadOnlyCell value={row.original.serial_number} /> },
      { id: "cr_details", accessorKey: "cr_details", header: "CR Details", cell: ({ row }) => <CompactReadOnlyCell value={row.original.cr_details} /> },
      { id: "condition_score", accessorKey: "condition_score", header: "Condition (1-5)", cell: ({ row }) => <CompactReadOnlyCell value={row.original.condition_score} /> },
      {
        id: "location",
        accessorKey: "location",
        header: "Location (City, State/Prov)",
        cell: ({ row }) => (
          <TextField
            value={row.original.location}
            onChange={(event) => updateRowField(row.original.lot_id, "location", event.target.value)}
            placeholder="City, State/Prov"
            size="small"
            variant="outlined"
            fullWidth
            sx={{
              minWidth: 180,
              "& .MuiOutlinedInput-root": { borderRadius: 0 },
              "& .MuiOutlinedInput-input": { px: 1.25, py: 0.9, fontSize: 13 },
            }}
          />
        ),
      },
      {
        id: "pictures",
        accessorKey: "pictures",
        header: "Pictures",
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
                px: 0,
                py: 0,
                borderRadius: 0,
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
      {
        id: "market_check",
        accessorKey: "market_check",
        header: "Market Check",
        cell: ({ row }) =>
          marketCheckEditor(row.original.market_check, (next) =>
            updateRowField(row.original.lot_id, "market_check", {
              ...next,
              notes: row.original.market_check.notes,
            })
          ),
      },
      { id: "asset_insight", accessorKey: "asset_insight", header: "Asset Insight", cell: ({ row }) => <CompactReadOnlyCell value={row.original.asset_insight} /> },
    ];

    const evaluatorColumns: ColumnDef<AssetAdminScheduleRow>[] = sheet.evaluator_columns.map((column) => ({
      id: `eval_${column.id}`,
      header: () => (
        <Stack spacing={0.75} sx={{ minWidth: 120 }}>
          <TextField
            value={column.name}
            onChange={(event) => updateEvaluatorName(column.id, event.target.value)}
            size="small"
            variant="outlined"
            sx={{
              "& .MuiOutlinedInput-root": { borderRadius: 0, bgcolor: "common.white" },
              "& .MuiOutlinedInput-input": { px: 1, py: 0.75, fontSize: 13 },
            }}
          />
          <Button
            size="small"
            variant="text"
            color="inherit"
            startIcon={<DeleteOutlineRoundedIcon fontSize="small" />}
            disabled={sheet.evaluator_columns.length <= 1}
            onClick={() => removeEvaluator(column.id)}
            sx={{
              justifyContent: "flex-start",
              minWidth: 0,
              px: 0,
              py: 0,
              borderRadius: 0,
              color: "inherit",
              textTransform: "none",
              fontSize: 12,
            }}
          >
            Remove
          </Button>
        </Stack>
      ),
      cell: ({ row }) => (
        <TextField
          type="number"
          size="small"
          value={row.original.evaluator_values[column.id] ?? ""}
          onChange={(event) =>
            updateRowField(row.original.lot_id, "evaluator_values", {
              ...row.original.evaluator_values,
              [column.id]: parseNumberInput(event.target.value),
            })
          }
          placeholder="0.00"
          inputProps={{ step: "0.01" }}
          sx={{
            minWidth: 110,
            "& .MuiOutlinedInput-root": { borderRadius: 0 },
            "& .MuiOutlinedInput-input": { px: 1.25, py: 0.9, fontSize: 13 },
          }}
        />
      ),
    }));

    const resultColumns: ColumnDef<AssetAdminScheduleRow>[] = [
      { id: "low_est_sale_value", accessorKey: "low_est_sale_value", header: "Low Est. Sale Value ($)", cell: ({ row }) => <CompactReadOnlyCell value={formatCurrencyCell(row.original.low_est_sale_value)} /> },
      { id: "high_est_sale_value", accessorKey: "high_est_sale_value", header: "High Est. Sale Value ($)", cell: ({ row }) => <CompactReadOnlyCell value={formatCurrencyCell(row.original.high_est_sale_value)} /> },
      { id: "buyer_premium_percent", accessorKey: "buyer_premium_percent", header: "Buyer Premium %", cell: ({ row }) => <CompactReadOnlyCell value={`${row.original.buyer_premium_percent}%`} /> },
      { id: "buyer_premium_amount", accessorKey: "buyer_premium_amount", header: "Buyer Premium ($)", cell: ({ row }) => <CompactReadOnlyCell value={formatCurrencyCell(row.original.buyer_premium_amount)} /> },
      { id: "total_expected_gross", accessorKey: "total_expected_gross", header: "Total Expected Gross ($)", cell: ({ row }) => <CompactReadOnlyCell value={formatCurrencyCell(row.original.total_expected_gross)} /> },
      { id: "allocated_value", accessorKey: "allocated_value", header: "Allocated Value ($)", cell: ({ row }) => <CompactReadOnlyCell value={formatCurrencyCell(row.original.allocated_value)} /> },
      {
        id: "notes",
        accessorKey: "notes",
        header: "Notes",
        cell: ({ row }) => (
          <TextField
            multiline
            minRows={2}
            value={row.original.notes}
            onChange={(event) => updateRowField(row.original.lot_id, "notes", event.target.value)}
            placeholder="Notes"
            size="small"
            fullWidth
            sx={{
              minWidth: 160,
              "& .MuiOutlinedInput-root": { borderRadius: 0 },
              "& .MuiOutlinedInput-input": { px: 1.25, py: 0.9, fontSize: 13 },
            }}
          />
        ),
      },
      { id: "cleaning", accessorKey: "cleaning", header: "Cleaning", cell: ({ row }) => <CompactReadOnlyCell value={formatCurrencyCell(row.original.cleaning)} /> },
      {
        id: "lien_search",
        accessorKey: "lien_search",
        header: "Lien Search",
        cell: ({ row }) => (
          <TextField
            type="number"
            size="small"
            value={row.original.lien_search ?? ""}
            onChange={(event) => updateRowField(row.original.lot_id, "lien_search", parseNumberInput(event.target.value))}
            placeholder="0.00"
            inputProps={{ step: "0.01" }}
            sx={{
              minWidth: 110,
              "& .MuiOutlinedInput-root": { borderRadius: 0 },
              "& .MuiOutlinedInput-input": { px: 1.25, py: 0.9, fontSize: 13 },
            }}
          />
        ),
      },
      {
        id: "video_cost",
        accessorKey: "video_cost",
        header: "Video Cost",
        cell: ({ row }) => (
          <TextField
            type="number"
            size="small"
            value={row.original.video_cost ?? ""}
            onChange={(event) => updateRowField(row.original.lot_id, "video_cost", parseNumberInput(event.target.value))}
            placeholder="0.00"
            inputProps={{ step: "0.01" }}
            sx={{
              minWidth: 110,
              "& .MuiOutlinedInput-root": { borderRadius: 0 },
              "& .MuiOutlinedInput-input": { px: 1.25, py: 0.9, fontSize: 13 },
            }}
          />
        ),
      },
      { id: "lotting_fee", accessorKey: "lotting_fee", header: "Lotting Fee", cell: ({ row }) => <CompactReadOnlyCell value={formatCurrencyCell(row.original.lotting_fee)} /> },
      { id: "advertising", accessorKey: "advertising", header: "Advertising", cell: ({ row }) => <CompactReadOnlyCell value={formatCurrencyCell(row.original.advertising)} /> },
    ];

    return [...staticColumns, ...evaluatorColumns, ...resultColumns];
  }, [openGallery, removeEvaluator, sheet, updateEvaluatorName, updateRowField]);

  const scheduleTable = useReactTable({
    data: sheet?.rows ?? [],
    columns: scheduleColumns,
    getCoreRowModel: getCoreRowModel(),
  });

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
          />
        ),
      },
      {
        label: "File Risk Multiplier",
        value: (
          <SummaryInput
            value={sheet.file_summary.file_risk_multiplier}
            onChange={(next) => updateFileSummaryField("file_risk_multiplier", next)}
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
              updateFileSummaryField("capped_threshold_percent", (next ?? 0) / 100)
            }
            suffix="%"
          />
        ),
      },
    ];
  }, [derivedSummary, sheet, updateFileSummaryField]);

  const uncappedRows = useMemo<SummaryRow[]>(() => {
    if (!sheet || !derivedSummary) return [];
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
      { label: "Offer #2 NMG (78.5%)", value: formatCurrencyCell(derivedSummary.uncapped.offer2_nmg) || "-" },
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
    <Box sx={{ display: "flex", height: "100%", flexDirection: "column", bgcolor: "common.white" }}>
      <Box
        sx={{
          borderBottom: "1px solid",
          borderColor: "divider",
          px: 2,
          py: 1.25,
          bgcolor: "common.white",
        }}
      >
        <Stack spacing={1.5}>
          <Stack
            direction={{ xs: "column", lg: "row" }}
            spacing={1.5}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", lg: "center" }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: 18, md: 20 } }}>
              {preview.title}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {activeTab === "scheduleA" ? (
                <Button
                  variant="outlined"
                  color="inherit"
                  startIcon={<AddRoundedIcon />}
                  onClick={addEvaluator}
                  sx={{ borderRadius: 0, textTransform: "none" }}
                >
                  Add Evaluator
                </Button>
              ) : null}
              <Button
                variant="contained"
                color="primary"
                startIcon={<SaveRoundedIcon />}
                disabled={saving || !isDirty}
                onClick={() => void handleSave()}
                sx={{ borderRadius: 0, textTransform: "none" }}
              >
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button
                variant="text"
                color="inherit"
                startIcon={<CloseRoundedIcon />}
                onClick={onClose}
                sx={{ borderRadius: 0, textTransform: "none" }}
              >
                Close
              </Button>
            </Stack>
          </Stack>

          <Tabs
            value={activeTab}
            onChange={(_, next) => setActiveTab(next)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 40,
              "& .MuiTab-root": {
                minHeight: 40,
                px: 1.5,
                textTransform: "none",
                borderRadius: 0,
                fontSize: 13,
                fontWeight: 600,
                alignItems: "flex-start",
              },
            }}
          >
            <Tab value="scheduleA" label="Schedule A" />
            <Tab value="marketCheck" label="Market Check" />
            <Tab value="fileSummary" label="File Summary" />
          </Tabs>
        </Stack>

        {saveError ? <Alert severity="error" sx={{ mt: 1, borderRadius: 0 }}>{saveError}</Alert> : null}
        {saveSuccess ? <Alert severity="success" sx={{ mt: 1, borderRadius: 0 }}>{saveSuccess}</Alert> : null}
      </Box>

      <Box sx={{ flex: 1, overflow: "hidden", p: 0 }}>
        {activeTab === "scheduleA" ? (
          <TableContainer
            component={Paper}
            square
            elevation={0}
            sx={{
              height: "100%",
              maxHeight: "calc(100vh - 196px)",
              borderRadius: 0,
              border: "none",
            }}
          >
            <Table stickyHeader size="small" sx={{ minWidth: 2200 }}>
              <TableHead>
                {scheduleTable.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableCell
                        key={header.id}
                        sx={{
                          bgcolor: "#f3f4f6",
                          color: "text.primary",
                          borderBottom: "1px solid",
                          borderColor: "divider",
                          fontWeight: 700,
                          fontSize: 13,
                          verticalAlign: "top",
                          py: 1,
                          px: 1.25,
                          minWidth: 90,
                        }}
                      >
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableHead>
              <TableBody>
                {scheduleTable.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} hover>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        sx={{
                          borderBottom: "1px solid",
                          borderColor: "divider",
                          verticalAlign: "top",
                          py: 1,
                          px: 1.25,
                          bgcolor: "common.white",
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : null}

        {activeTab === "marketCheck" ? (
          <TableContainer
            component={Paper}
            square
            elevation={0}
            sx={{
              height: "100%",
              maxHeight: "calc(100vh - 196px)",
              borderRadius: 0,
              border: "none",
            }}
          >
            <Table stickyHeader size="small" sx={{ minWidth: 1120 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ bgcolor: "#f3f4f6", fontSize: 13, fontWeight: 700, minWidth: 100 }}>Asset ID</TableCell>
                  {marketCheckFields.map((field) => (
                    <TableCell key={field.key} sx={{ bgcolor: "#f3f4f6", fontSize: 13, fontWeight: 700, minWidth: 190 }}>
                      {field.label}
                    </TableCell>
                  ))}
                  <TableCell sx={{ bgcolor: "#f3f4f6", fontSize: 13, fontWeight: 700, minWidth: 260 }}>Market Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sheet.rows.map((row) => (
                  <TableRow key={row.lot_id} hover>
                    <TableCell sx={{ borderColor: "divider", verticalAlign: "top", fontSize: 13, fontWeight: 600 }}>
                      {row.asset_id}
                    </TableCell>
                    {marketCheckFields.map((field) => (
                      <TableCell key={field.key} sx={{ borderColor: "divider", verticalAlign: "top" }}>
                        <FormControl size="small" fullWidth>
                          <Select
                            value={row.market_check[field.key]}
                            displayEmpty
                            onChange={(event) =>
                              updateRowField(row.lot_id, "market_check", {
                                ...row.market_check,
                                [field.key]: event.target.value as AssetAdminScheduleMarketCheck[typeof field.key],
                              })
                            }
                            sx={{ borderRadius: 0, fontSize: 13 }}
                          >
                            {field.options.map((option) => (
                              <MenuItem key={option || "blank"} value={option}>
                                {option || "-"}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                    ))}
                    <TableCell sx={{ borderColor: "divider", verticalAlign: "top" }}>
                      <TextField
                        value={row.market_check.notes}
                        onChange={(event) =>
                          updateRowField(row.lot_id, "market_check", {
                            ...row.market_check,
                            notes: event.target.value,
                          })
                        }
                        multiline
                        minRows={2}
                        fullWidth
                        placeholder="Market notes"
                        size="small"
                        sx={{
                          "& .MuiOutlinedInput-root": { borderRadius: 0 },
                          "& .MuiOutlinedInput-input": { px: 1.25, py: 0.9, fontSize: 13 },
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : null}

        {activeTab === "fileSummary" ? (
          <Box sx={{ height: "100%", overflow: "auto", p: 2 }}>
            <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start", minWidth: 1080 }}>
              <SummaryTable title="Metric" rows={metricRows} />
              <SummaryTable title="Uncapped Buyers Premium Scenario" rows={uncappedRows} />
              <SummaryTable title="Capped Buyers Premium Scenario" rows={cappedRows} />
            </Box>
          </Box>
        ) : null}
      </Box>

      <Dialog
        open={Boolean(gallery)}
        onClose={closeGallery}
        fullWidth
        maxWidth="lg"
        PaperProps={{ sx: { borderRadius: 0 } }}
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
                <IconButton onClick={closeGallery} sx={{ color: "common.white", borderRadius: 0 }}>
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
                      borderRadius: 0,
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
                      borderRadius: 0,
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
