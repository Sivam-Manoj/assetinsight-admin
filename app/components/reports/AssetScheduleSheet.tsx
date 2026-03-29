"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type {
  AssetAdminScheduleEvaluatorColumn,
  AssetAdminScheduleMarketCheck,
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

function CellValue({ children }: { children: ReactNode }) {
  return <div className="min-h-[42px] rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">{children}</div>;
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

  function updateRowField<T extends keyof AssetAdminScheduleSheet["rows"][number]>(
    lotId: string,
    key: T,
    value: AssetAdminScheduleSheet["rows"][number][T]
  ) {
    updateSheet((draft) => ({
      ...draft,
      rows: draft.rows.map((row) => (row.lot_id === lotId ? { ...row, [key]: value } : row)),
    }));
  }

  function updateMarketCheck(
    lotId: string,
    key: keyof AssetAdminScheduleMarketCheck,
    value: AssetAdminScheduleMarketCheck[keyof AssetAdminScheduleMarketCheck]
  ) {
    updateSheet((draft) => ({
      ...draft,
      rows: draft.rows.map((row) =>
        row.lot_id === lotId
          ? {
              ...row,
              market_check: {
                ...row.market_check,
                [key]: value,
              },
            }
          : row
      ),
    }));
  }

  async function handleSave() {
    if (!sheet) return;
    await onSave(recalculateAssetScheduleSheet(sheet));
  }

  if (!sheet) {
    return <div className="py-10 text-center text-sm text-gray-500">No asset schedule sheet available.</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-[3] border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Asset Schedule Sheet</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">{preview.title}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={addEvaluator}
              className="cursor-pointer rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-100"
            >
              Add Evaluator
            </button>
            <button
              onClick={() => void handleSave()}
              disabled={saving || !isDirty}
              className="cursor-pointer rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={onClose}
              className="cursor-pointer rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
        {saveError ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {saveError}
          </div>
        ) : null}
        {saveSuccess ? (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {saveSuccess}
          </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-auto px-4 py-4 md:px-6">
        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-[2600px] w-full border-collapse text-sm">
            <thead className="sticky top-0 z-[2] bg-slate-900 text-white">
              <tr>
                {[
                  "Asset ID",
                  "Asset Category",
                  "Year",
                  "Make",
                  "Model",
                  "Serial Number",
                  "CR Details",
                  "Condition (1-5)",
                  "Location (City, State/Prov)",
                  "Pictures",
                  "Market Check",
                  "Asset Insight",
                ].map((label) => (
                  <th key={label} className="border-b border-slate-700 px-3 py-3 text-left font-semibold">
                    {label}
                  </th>
                ))}
                {sheet.evaluator_columns.map((column) => (
                  <th key={column.id} className="border-b border-slate-700 px-3 py-3 text-left font-semibold">
                    <div className="space-y-2">
                      <input
                        value={column.name}
                        onChange={(event) => updateEvaluatorName(column.id, event.target.value)}
                        className="w-full rounded-lg border border-slate-500 bg-slate-800 px-2 py-1 text-sm font-semibold text-white outline-none focus:border-sky-300"
                      />
                      <button
                        onClick={() => removeEvaluator(column.id)}
                        disabled={sheet.evaluator_columns.length <= 1}
                        className="cursor-pointer rounded-lg border border-slate-500 px-2 py-1 text-xs text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Remove
                      </button>
                    </div>
                  </th>
                ))}
                {[
                  "Low Est. Sale Value ($)",
                  "High Est. Sale Value ($)",
                  "Buyer Premium %",
                  "Buyer Premium ($)",
                  "Total Expected Gross ($)",
                  "Allocated Value ($)",
                  "Notes",
                  "Cleaning",
                  "Lien Search",
                  "Video Cost",
                  "Lotting Fee",
                  "Advertising",
                ].map((label) => (
                  <th key={label} className="border-b border-slate-700 px-3 py-3 text-left font-semibold">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sheet.rows.map((row) => (
                <tr key={row.lot_id} className="align-top odd:bg-white even:bg-slate-50/80">
                  <td className="border-b border-slate-200 px-3 py-3"><CellValue>{row.asset_id}</CellValue></td>
                  <td className="border-b border-slate-200 px-3 py-3"><CellValue>{row.asset_category || "-"}</CellValue></td>
                  <td className="border-b border-slate-200 px-3 py-3"><CellValue>{row.year || "-"}</CellValue></td>
                  <td className="border-b border-slate-200 px-3 py-3"><CellValue>{row.make || "-"}</CellValue></td>
                  <td className="border-b border-slate-200 px-3 py-3"><CellValue>{row.model || "-"}</CellValue></td>
                  <td className="border-b border-slate-200 px-3 py-3"><CellValue>{row.serial_number || "-"}</CellValue></td>
                  <td className="border-b border-slate-200 px-3 py-3"><CellValue>{row.cr_details || "-"}</CellValue></td>
                  <td className="border-b border-slate-200 px-3 py-3"><CellValue>{row.condition_score || "-"}</CellValue></td>
                  <td className="border-b border-slate-200 px-3 py-3">
                    <input
                      value={row.location}
                      onChange={(event) => updateRowField(row.lot_id, "location", event.target.value)}
                      className="min-w-[190px] rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-sky-400"
                      placeholder="City, State/Prov"
                    />
                  </td>
                  <td className="border-b border-slate-200 px-3 py-3"><CellValue>{row.pictures}</CellValue></td>
                  <td className="border-b border-slate-200 px-3 py-3">
                    <div className="min-w-[240px] space-y-2 rounded-xl border border-gray-200 bg-white p-3">
                      {marketCheckFields.map((field) => (
                        <label key={field.key} className="grid grid-cols-[1fr_120px] items-center gap-2">
                          <span className="text-xs font-medium text-gray-700">{field.label}</span>
                          <select
                            value={row.market_check[field.key]}
                            onChange={(event) =>
                              updateMarketCheck(
                                row.lot_id,
                                field.key,
                                event.target.value as AssetAdminScheduleMarketCheck[typeof field.key]
                              )
                            }
                            className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-900 outline-none focus:border-sky-400"
                          >
                            {field.options.map((option) => (
                              <option key={option || "blank"} value={option}>
                                {option || "-"}
                              </option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                  </td>
                  <td className="border-b border-slate-200 px-3 py-3"><CellValue>{row.asset_insight || "-"}</CellValue></td>
                  {sheet.evaluator_columns.map((column) => (
                    <td key={`${row.lot_id}-${column.id}`} className="border-b border-slate-200 px-3 py-3">
                      <input
                        type="number"
                        step="0.01"
                        value={row.evaluator_values[column.id] ?? ""}
                        onChange={(event) =>
                          updateRowField(row.lot_id, "evaluator_values", {
                            ...row.evaluator_values,
                            [column.id]: parseNumberInput(event.target.value),
                          })
                        }
                        className="w-[130px] rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-sky-400"
                        placeholder="0.00"
                      />
                    </td>
                  ))}
                  <td className="border-b border-slate-200 px-3 py-3"><CellValue>{formatCurrencyCell(row.low_est_sale_value) || "-"}</CellValue></td>
                  <td className="border-b border-slate-200 px-3 py-3"><CellValue>{formatCurrencyCell(row.high_est_sale_value) || "-"}</CellValue></td>
                  <td className="border-b border-slate-200 px-3 py-3"><CellValue>{row.buyer_premium_percent}%</CellValue></td>
                  <td className="border-b border-slate-200 px-3 py-3"><CellValue>{formatCurrencyCell(row.buyer_premium_amount) || "-"}</CellValue></td>
                  <td className="border-b border-slate-200 px-3 py-3"><CellValue>{formatCurrencyCell(row.total_expected_gross) || "-"}</CellValue></td>
                  <td className="border-b border-slate-200 px-3 py-3"><CellValue>{formatCurrencyCell(row.allocated_value) || "-"}</CellValue></td>
                  <td className="border-b border-slate-200 px-3 py-3">
                    <textarea
                      value={row.notes}
                      onChange={(event) => updateRowField(row.lot_id, "notes", event.target.value)}
                      rows={3}
                      className="min-w-[180px] rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-sky-400"
                      placeholder="Notes"
                    />
                  </td>
                  <td className="border-b border-slate-200 px-3 py-3"><CellValue>{formatCurrencyCell(row.cleaning) || "-"}</CellValue></td>
                  <td className="border-b border-slate-200 px-3 py-3">
                    <input
                      type="number"
                      step="0.01"
                      value={row.lien_search ?? ""}
                      onChange={(event) => updateRowField(row.lot_id, "lien_search", parseNumberInput(event.target.value))}
                      className="w-[120px] rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-sky-400"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="border-b border-slate-200 px-3 py-3">
                    <input
                      type="number"
                      step="0.01"
                      value={row.video_cost ?? ""}
                      onChange={(event) => updateRowField(row.lot_id, "video_cost", parseNumberInput(event.target.value))}
                      className="w-[120px] rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-sky-400"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="border-b border-slate-200 px-3 py-3"><CellValue>{formatCurrencyCell(row.lotting_fee) || "-"}</CellValue></td>
                  <td className="border-b border-slate-200 px-3 py-3"><CellValue>{formatCurrencyCell(row.advertising) || "-"}</CellValue></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
