"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
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
  FormControl,
  MenuItem,
  Paper,
  Select,
  Stack,
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
  AssetAdminScheduleEvaluatorColumn,
  AssetAdminScheduleMarketCheck,
  AssetAdminScheduleRow,
  AssetAdminScheduleSheet,
  ReportPreviewPayload,
} from "@/app/components/reports/reportPreviewTypes";
import {
  cloneAssetScheduleSheet,
  formatCurrencyCell,
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

const marketCheckFields: Array<{
  key: keyof AssetAdminScheduleMarketCheck;
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

  useEffect(() => {
    setSheet(preview.assetScheduleSheet ? cloneAssetScheduleSheet(preview.assetScheduleSheet) : null);
  }, [preview]);

  const serializedInitial = useMemo(
    () => JSON.stringify(preview.assetScheduleSheet || null),
    [preview.assetScheduleSheet]
  );
  const serializedCurrent = useMemo(() => JSON.stringify(sheet || null), [sheet]);
  const isDirty = serializedCurrent !== serializedInitial;

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

  async function handleSave() {
    if (!sheet) return;
    await onSave(recalculateAssetScheduleSheet(sheet));
  }

  const columns = useMemo<ColumnDef<AssetAdminScheduleRow>[]>(() => {
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
      { id: "pictures", accessorKey: "pictures", header: "Pictures", cell: ({ row }) => <CompactReadOnlyCell value={row.original.pictures} /> },
      {
        id: "market_check",
        accessorKey: "market_check",
        header: "Market Check",
        cell: ({ row }) =>
          marketCheckEditor(row.original.market_check, (next) =>
            updateRowField(row.original.lot_id, "market_check", next)
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
  }, [removeEvaluator, sheet, updateEvaluatorName, updateRowField]);

  const table = useReactTable({
    data: sheet?.rows ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!sheet) {
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
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<AddRoundedIcon />}
              onClick={addEvaluator}
              sx={{ borderRadius: 0, textTransform: "none" }}
            >
              Add Evaluator
            </Button>
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
        {saveError ? <Alert severity="error" sx={{ mt: 1, borderRadius: 0 }}>{saveError}</Alert> : null}
        {saveSuccess ? <Alert severity="success" sx={{ mt: 1, borderRadius: 0 }}>{saveSuccess}</Alert> : null}
      </Box>

      <Box sx={{ flex: 1, overflow: "hidden" }}>
        <TableContainer
          component={Paper}
          square
          elevation={0}
          sx={{
            height: "100%",
            maxHeight: "calc(100vh - 150px)",
            borderRadius: 0,
            border: "none",
          }}
        >
          <Table stickyHeader size="small" sx={{ minWidth: 2200 }}>
            <TableHead>
              {table.getHeaderGroups().map((headerGroup) => (
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
              {table.getRowModel().rows.map((row) => (
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
      </Box>
    </Box>
  );
}
