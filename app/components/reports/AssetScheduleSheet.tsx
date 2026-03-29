"use client";

import { useEffect, useMemo, useState } from "react";
import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";
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
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  InputLabel,
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
  useMediaQuery,
  useTheme,
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

function readOnlyCell(value: string | number | null | undefined) {
  const text = value === null || value === undefined || value === "" ? "-" : String(value);
  return (
    <Box
      sx={{
        minHeight: 42,
        display: "flex",
        alignItems: "center",
        px: 1.5,
        py: 1,
        borderRadius: 2,
        bgcolor: "grey.50",
        border: "1px solid",
        borderColor: "grey.200",
        color: "text.secondary",
        fontSize: 13,
        lineHeight: 1.35,
      }}
    >
      {text}
    </Box>
  );
}

function MarketCheckEditor({
  value,
  onChange,
  compact = false,
}: {
  value: AssetAdminScheduleMarketCheck;
  onChange: (next: AssetAdminScheduleMarketCheck) => void;
  compact?: boolean;
}) {
  return (
    <Stack spacing={compact ? 1 : 1.25} sx={{ minWidth: compact ? 220 : 250 }}>
      {marketCheckFields.map((field) => (
        <Stack
          key={field.key}
          direction={compact ? "column" : "row"}
          spacing={compact ? 0.75 : 1}
          alignItems={compact ? "stretch" : "center"}
        >
          <Typography
            variant="caption"
            sx={{
              minWidth: compact ? 0 : 128,
              color: "text.secondary",
              fontWeight: 600,
              lineHeight: 1.25,
            }}
          >
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
              sx={{ bgcolor: "common.white", borderRadius: 2, minHeight: 36 }}
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
    </Stack>
  );
}

function SummaryStat({ label, value }: { label: string; value: string | number }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        px: 2,
        py: 1.5,
        borderRadius: 3,
        minWidth: 140,
        bgcolor: "rgba(255,255,255,0.78)",
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
        {label}
      </Typography>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {value}
      </Typography>
    </Paper>
  );
}

function MobileField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Stack spacing={0.75}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
        {label}
      </Typography>
      {children}
    </Stack>
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

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

  function updateSheet(mutator: (draft: AssetAdminScheduleSheet) => AssetAdminScheduleSheet) {
    setSheet((current) => {
      if (!current) return current;
      return recalculateAssetScheduleSheet(mutator(cloneAssetScheduleSheet(current)));
    });
  }

  function updateEvaluatorName(columnId: string, name: string) {
    updateSheet((draft) => ({
      ...draft,
      evaluator_columns: draft.evaluator_columns.map((column) =>
        column.id === columnId ? { ...column, name } : column
      ),
    }));
  }

  function addEvaluator() {
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
  }

  function removeEvaluator(columnId: string) {
    updateSheet((draft) => {
      if (draft.evaluator_columns.length <= 1) return draft;
      return {
        evaluator_columns: draft.evaluator_columns.filter((column) => column.id !== columnId),
        rows: draft.rows.map((row) => {
          const nextValues = { ...row.evaluator_values };
          delete nextValues[columnId];
          return {
            ...row,
            evaluator_values: nextValues,
          };
        }),
      };
    });
  }

  function updateRowField<T extends keyof AssetAdminScheduleRow>(
    lotId: string,
    key: T,
    value: AssetAdminScheduleRow[T]
  ) {
    updateSheet((draft) => ({
      ...draft,
      rows: draft.rows.map((row) => (row.lot_id === lotId ? { ...row, [key]: value } : row)),
    }));
  }

  async function handleSave() {
    if (!sheet) return;
    await onSave(recalculateAssetScheduleSheet(sheet));
  }

  const totalRows = sheet?.rows.length ?? 0;
  const evaluatorCount = sheet?.evaluator_columns.length ?? 0;

  const columns = useMemo<ColumnDef<AssetAdminScheduleRow>[]>(() => {
    if (!sheet) return [];

    const baseColumns: ColumnDef<AssetAdminScheduleRow>[] = [
      {
        id: "asset_id",
        accessorKey: "asset_id",
        header: "Asset ID",
        cell: ({ row }) => readOnlyCell(row.original.asset_id),
      },
      {
        id: "asset_category",
        accessorKey: "asset_category",
        header: "Asset Category",
        cell: ({ row }) => readOnlyCell(row.original.asset_category),
      },
      {
        id: "year",
        accessorKey: "year",
        header: "Year",
        cell: ({ row }) => readOnlyCell(row.original.year),
      },
      {
        id: "make",
        accessorKey: "make",
        header: "Make",
        cell: ({ row }) => readOnlyCell(row.original.make),
      },
      {
        id: "model",
        accessorKey: "model",
        header: "Model",
        cell: ({ row }) => readOnlyCell(row.original.model),
      },
      {
        id: "serial_number",
        accessorKey: "serial_number",
        header: "Serial Number",
        cell: ({ row }) => readOnlyCell(row.original.serial_number),
      },
      {
        id: "cr_details",
        accessorKey: "cr_details",
        header: "CR Details",
        cell: ({ row }) => readOnlyCell(row.original.cr_details),
      },
      {
        id: "condition_score",
        accessorKey: "condition_score",
        header: "Condition (1-5)",
        cell: ({ row }) => readOnlyCell(row.original.condition_score),
      },
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
            fullWidth
            sx={{ minWidth: 220 }}
          />
        ),
      },
      {
        id: "pictures",
        accessorKey: "pictures",
        header: "Pictures",
        cell: ({ row }) => readOnlyCell(row.original.pictures),
      },
      {
        id: "market_check",
        accessorKey: "market_check",
        header: "Market Check",
        cell: ({ row }) => (
          <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 3, minWidth: 270, bgcolor: "grey.50" }}>
            <MarketCheckEditor
              value={row.original.market_check}
              onChange={(next) => updateRowField(row.original.lot_id, "market_check", next)}
            />
          </Paper>
        ),
      },
      {
        id: "asset_insight",
        accessorKey: "asset_insight",
        header: "Asset Insight",
        cell: ({ row }) => readOnlyCell(row.original.asset_insight),
      },
    ];

    const evaluatorColumns: ColumnDef<AssetAdminScheduleRow>[] = sheet.evaluator_columns.map((column) => ({
      id: `eval_${column.id}`,
      header: () => (
        <Stack spacing={1} sx={{ minWidth: 150 }}>
          <TextField
            value={column.name}
            onChange={(event) => updateEvaluatorName(column.id, event.target.value)}
            size="small"
            variant="outlined"
            sx={{
              "& .MuiOutlinedInput-root": {
                bgcolor: "rgba(255,255,255,0.1)",
                borderRadius: 2,
              },
              "& .MuiOutlinedInput-input": {
                color: "common.white",
                fontWeight: 700,
                py: 1,
              },
            }}
          />
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            startIcon={<DeleteOutlineRoundedIcon fontSize="small" />}
            disabled={sheet.evaluator_columns.length <= 1}
            onClick={() => removeEvaluator(column.id)}
            sx={{
              borderColor: "rgba(255,255,255,0.28)",
              color: "common.white",
              borderRadius: 2,
              "&:hover": {
                borderColor: "rgba(255,255,255,0.48)",
                bgcolor: "rgba(255,255,255,0.08)",
              },
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
          sx={{ minWidth: 140 }}
        />
      ),
    }));

    const resultColumns: ColumnDef<AssetAdminScheduleRow>[] = [
      {
        id: "low_est_sale_value",
        accessorKey: "low_est_sale_value",
        header: "Low Est. Sale Value ($)",
        cell: ({ row }) => readOnlyCell(formatCurrencyCell(row.original.low_est_sale_value)),
      },
      {
        id: "high_est_sale_value",
        accessorKey: "high_est_sale_value",
        header: "High Est. Sale Value ($)",
        cell: ({ row }) => readOnlyCell(formatCurrencyCell(row.original.high_est_sale_value)),
      },
      {
        id: "buyer_premium_percent",
        accessorKey: "buyer_premium_percent",
        header: "Buyer Premium %",
        cell: ({ row }) => readOnlyCell(`${row.original.buyer_premium_percent}%`),
      },
      {
        id: "buyer_premium_amount",
        accessorKey: "buyer_premium_amount",
        header: "Buyer Premium ($)",
        cell: ({ row }) => readOnlyCell(formatCurrencyCell(row.original.buyer_premium_amount)),
      },
      {
        id: "total_expected_gross",
        accessorKey: "total_expected_gross",
        header: "Total Expected Gross ($)",
        cell: ({ row }) => readOnlyCell(formatCurrencyCell(row.original.total_expected_gross)),
      },
      {
        id: "allocated_value",
        accessorKey: "allocated_value",
        header: "Allocated Value ($)",
        cell: ({ row }) => readOnlyCell(formatCurrencyCell(row.original.allocated_value)),
      },
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
            sx={{ minWidth: 190 }}
          />
        ),
      },
      {
        id: "cleaning",
        accessorKey: "cleaning",
        header: "Cleaning",
        cell: ({ row }) => readOnlyCell(formatCurrencyCell(row.original.cleaning)),
      },
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
            sx={{ minWidth: 130 }}
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
            sx={{ minWidth: 130 }}
          />
        ),
      },
      {
        id: "lotting_fee",
        accessorKey: "lotting_fee",
        header: "Lotting Fee",
        cell: ({ row }) => readOnlyCell(formatCurrencyCell(row.original.lotting_fee)),
      },
      {
        id: "advertising",
        accessorKey: "advertising",
        header: "Advertising",
        cell: ({ row }) => readOnlyCell(formatCurrencyCell(row.original.advertising)),
      },
    ];

    return [...baseColumns, ...evaluatorColumns, ...resultColumns];
  }, [sheet]);

  const table = useReactTable({
    data: sheet?.rows ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!sheet) {
    return <Box sx={{ py: 10, textAlign: "center", color: "text.secondary" }}>No asset schedule sheet available.</Box>;
  }

  return (
    <Box sx={{ display: "flex", height: "100%", flexDirection: "column", bgcolor: "#f5f7fb" }}>
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 4,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "rgba(248,250,252,0.92)",
          backdropFilter: "blur(14px)",
          px: { xs: 2, md: 3 },
          py: 2,
        }}
      >
        <Stack spacing={2}>
          <Stack
            direction={{ xs: "column", lg: "row" }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", lg: "center" }}
          >
            <Stack spacing={0.5}>
              <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 800, letterSpacing: "0.14em" }}>
                Asset Schedule Sheet
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: "text.primary" }}>
                {preview.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Spreadsheet-style editor for asset review, evaluator pricing, and sale calculations.
              </Typography>
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ width: { xs: "100%", lg: "auto" } }}>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<AddCircleOutlineRoundedIcon />}
                onClick={addEvaluator}
                sx={{ borderRadius: 999 }}
              >
                Add Evaluator
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<SaveRoundedIcon />}
                disabled={saving || !isDirty}
                onClick={() => void handleSave()}
                sx={{ borderRadius: 999, px: 2.25 }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button variant="text" color="inherit" onClick={onClose} sx={{ borderRadius: 999 }}>
                Close
              </Button>
            </Stack>
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} flexWrap="wrap">
            <SummaryStat label="Rows" value={totalRows} />
            <SummaryStat label="Evaluators" value={evaluatorCount} />
            <SummaryStat label="Unsaved Changes" value={isDirty ? "Yes" : "No"} />
          </Stack>

          {saveError ? <Alert severity="error" sx={{ borderRadius: 3 }}>{saveError}</Alert> : null}
          {saveSuccess ? <Alert severity="success" sx={{ borderRadius: 3 }}>{saveSuccess}</Alert> : null}
        </Stack>
      </Box>

      <Box sx={{ flex: 1, overflow: "auto", px: { xs: 2, md: 3 }, py: 2.5 }}>
        {!isMobile ? (
          <Paper
            elevation={0}
            sx={{
              overflow: "hidden",
              borderRadius: 4,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
              boxShadow: "0 18px 48px rgba(15,23,42,0.08)",
            }}
          >
            <TableContainer sx={{ maxHeight: "calc(100vh - 250px)" }}>
              <Table stickyHeader size="small" sx={{ minWidth: 2600 }}>
                <TableHead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableCell
                          key={header.id}
                          sx={{
                            verticalAlign: "top",
                            bgcolor: "grey.900",
                            color: "common.white",
                            borderBottomColor: "rgba(255,255,255,0.08)",
                            minWidth: 120,
                            py: 1.5,
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
                    <TableRow
                      key={row.id}
                      hover
                      sx={{
                        "&:nth-of-type(even)": { bgcolor: "rgba(148,163,184,0.05)" },
                        "& td": { borderBottomColor: "divider", verticalAlign: "top", py: 1.5 },
                      }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        ) : (
          <Stack spacing={2}>
            {sheet.rows.map((row, index) => (
              <Card
                key={row.lot_id}
                variant="outlined"
                sx={{
                  borderRadius: 4,
                  borderColor: "divider",
                  boxShadow: "0 12px 36px rgba(15,23,42,0.06)",
                }}
              >
                <CardContent sx={{ p: 2.25 }}>
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                          Lot {row.asset_id}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {row.asset_category || "Uncategorized asset"}
                        </Typography>
                      </Box>
                      <Chip size="small" color="primary" variant="outlined" label={`#${index + 1}`} />
                    </Stack>

                    <Divider />

                    <Stack spacing={1.5}>
                      <MobileField label="Year">{readOnlyCell(row.year)}</MobileField>
                      <MobileField label="Make">{readOnlyCell(row.make)}</MobileField>
                      <MobileField label="Model">{readOnlyCell(row.model)}</MobileField>
                      <MobileField label="Serial Number">{readOnlyCell(row.serial_number)}</MobileField>
                      <MobileField label="CR Details">{readOnlyCell(row.cr_details)}</MobileField>
                      <MobileField label="Location (City, State/Prov)">
                        <TextField
                          fullWidth
                          size="small"
                          value={row.location}
                          onChange={(event) => updateRowField(row.lot_id, "location", event.target.value)}
                          placeholder="City, State/Prov"
                        />
                      </MobileField>
                      <MobileField label="Pictures">{readOnlyCell(row.pictures)}</MobileField>
                      <MobileField label="Market Check">
                        <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 3, bgcolor: "grey.50" }}>
                          <MarketCheckEditor
                            value={row.market_check}
                            onChange={(next) => updateRowField(row.lot_id, "market_check", next)}
                            compact
                          />
                        </Paper>
                      </MobileField>
                      <MobileField label="Asset Insight">{readOnlyCell(row.asset_insight)}</MobileField>
                    </Stack>

                    <Divider />

                    <Stack spacing={1.25}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        Evaluator Values
                      </Typography>
                      {sheet.evaluator_columns.map((column) => (
                        <MobileField key={`${row.lot_id}-${column.id}`} label={column.name}>
                          <TextField
                            type="number"
                            size="small"
                            fullWidth
                            value={row.evaluator_values[column.id] ?? ""}
                            onChange={(event) =>
                              updateRowField(row.lot_id, "evaluator_values", {
                                ...row.evaluator_values,
                                [column.id]: parseNumberInput(event.target.value),
                              })
                            }
                            placeholder="0.00"
                            inputProps={{ step: "0.01" }}
                          />
                        </MobileField>
                      ))}
                    </Stack>

                    <Divider />

                    <Stack spacing={1.5}>
                      <MobileField label="Low Est. Sale Value ($)">{readOnlyCell(formatCurrencyCell(row.low_est_sale_value))}</MobileField>
                      <MobileField label="High Est. Sale Value ($)">{readOnlyCell(formatCurrencyCell(row.high_est_sale_value))}</MobileField>
                      <MobileField label="Buyer Premium %">{readOnlyCell(`${row.buyer_premium_percent}%`)}</MobileField>
                      <MobileField label="Buyer Premium ($)">{readOnlyCell(formatCurrencyCell(row.buyer_premium_amount))}</MobileField>
                      <MobileField label="Total Expected Gross ($)">{readOnlyCell(formatCurrencyCell(row.total_expected_gross))}</MobileField>
                      <MobileField label="Allocated Value ($)">{readOnlyCell(formatCurrencyCell(row.allocated_value))}</MobileField>
                      <MobileField label="Notes">
                        <TextField
                          multiline
                          minRows={3}
                          fullWidth
                          size="small"
                          value={row.notes}
                          onChange={(event) => updateRowField(row.lot_id, "notes", event.target.value)}
                          placeholder="Notes"
                        />
                      </MobileField>
                      <MobileField label="Cleaning">{readOnlyCell(formatCurrencyCell(row.cleaning))}</MobileField>
                      <MobileField label="Lien Search">
                        <TextField
                          type="number"
                          size="small"
                          fullWidth
                          value={row.lien_search ?? ""}
                          onChange={(event) => updateRowField(row.lot_id, "lien_search", parseNumberInput(event.target.value))}
                          placeholder="0.00"
                          inputProps={{ step: "0.01" }}
                        />
                      </MobileField>
                      <MobileField label="Video Cost">
                        <TextField
                          type="number"
                          size="small"
                          fullWidth
                          value={row.video_cost ?? ""}
                          onChange={(event) => updateRowField(row.lot_id, "video_cost", parseNumberInput(event.target.value))}
                          placeholder="0.00"
                          inputProps={{ step: "0.01" }}
                        />
                      </MobileField>
                      <MobileField label="Lotting Fee">{readOnlyCell(formatCurrencyCell(row.lotting_fee))}</MobileField>
                      <MobileField label="Advertising">{readOnlyCell(formatCurrencyCell(row.advertising))}</MobileField>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
