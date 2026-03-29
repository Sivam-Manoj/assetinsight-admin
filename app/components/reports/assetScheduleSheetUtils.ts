import type {
  AssetAdminScheduleEvaluatorColumn,
  AssetAdminScheduleRow,
  AssetAdminScheduleSheet,
} from "@/app/components/reports/reportPreviewTypes";

export function cloneAssetScheduleSheet(sheet: AssetAdminScheduleSheet): AssetAdminScheduleSheet {
  return JSON.parse(JSON.stringify(sheet)) as AssetAdminScheduleSheet;
}

function toNumberOrNull(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const normalized = String(value).replace(/,/g, "").trim();
  if (!normalized) return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function makeEvaluatorColumnId() {
  return `eval_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function recalculateRow(
  row: AssetAdminScheduleRow,
  evaluatorColumns: AssetAdminScheduleEvaluatorColumn[]
): AssetAdminScheduleRow {
  const evaluatorValues = Object.fromEntries(
    evaluatorColumns.map((column) => [column.id, toNumberOrNull(row.evaluator_values?.[column.id])])
  ) as Record<string, number | null>;

  const filledValues = Object.values(evaluatorValues).filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value)
  );

  const low = filledValues.length ? Math.min(...filledValues) : null;
  const high = filledValues.length ? Math.max(...filledValues) : null;
  const buyerPremiumPercent = 15;
  const buyerPremiumAmount = high === null ? null : Math.min(high * 0.15, 2000);
  const totalExpectedGross =
    high === null || buyerPremiumAmount === null ? null : high + buyerPremiumAmount;
  const allocatedValue = totalExpectedGross;
  const cleaning = high === null ? null : high * 0.01;
  const lottingFee = high === null ? null : high * 0.01;
  const advertising = high === null ? null : high * 0.01;

  return {
    ...row,
    evaluator_values: evaluatorValues,
    low_est_sale_value: low,
    high_est_sale_value: high,
    buyer_premium_percent: buyerPremiumPercent,
    buyer_premium_amount: buyerPremiumAmount,
    total_expected_gross: totalExpectedGross,
    allocated_value: allocatedValue,
    cleaning,
    lotting_fee: lottingFee,
    advertising,
    lien_search: toNumberOrNull(row.lien_search),
    video_cost: toNumberOrNull(row.video_cost),
  };
}

export function recalculateAssetScheduleSheet(sheet: AssetAdminScheduleSheet): AssetAdminScheduleSheet {
  return {
    evaluator_columns: sheet.evaluator_columns.map((column) => ({
      id: column.id,
      name: String(column.name || "").trim() || "Evaluator",
    })),
    rows: sheet.rows.map((row) => recalculateRow(row, sheet.evaluator_columns)),
  };
}

export function formatCurrencyCell(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
