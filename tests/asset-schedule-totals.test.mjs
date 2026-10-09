import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  deriveAssetScheduleSummary,
  formatCurrencyCell,
  recalculateAssetScheduleSheet,
} from "../app/components/reports/assetScheduleSheetUtils.ts";

function sheet(values, evaluatorIds = ["riley", "femi", "jay"]) {
  return recalculateAssetScheduleSheet({
    evaluator_columns: evaluatorIds.map((id) => ({ id, name: id })),
    rows: values.map((evaluator_values, index) => ({
      lot_id: `lot-${index}`, asset_id: String(index + 1), evaluator_values,
      market_check: {},
    })),
    file_summary: {},
  });
}

test("all-lot totals sum each evaluator and existing per-row average, high, low and capped premium", () => {
  const data = sheet([
    { riley: 10000, femi: 20000, jay: null },
    { riley: 50000, femi: null, jay: 40000 },
    { riley: null, femi: null, jay: null },
  ]);
  const totals = deriveAssetScheduleSummary(data);
  assert.deepEqual(totals.evaluator_totals, { riley: 60000, femi: 20000, jay: 40000 });
  assert.equal(totals.total_asset_value, 60000); // 15000 + 45000, not mean of evaluator totals
  assert.equal(totals.total_low_est_value, 50000);
  assert.equal(totals.total_high_est_value, 70000);
  assert.equal(totals.total_capped_bp, 4000); // Sum of each capped amount, not cap of aggregate or sum of rates
  assert.equal(totals.total_expected_gross, 74000);
  assert.equal(totals.total_allocated_value, 74000);
  assert.equal(totals.total_cleaning, 700);
  assert.equal(totals.total_lotting_fee, 700);
  assert.equal(totals.total_advertising, 700);
  assert.equal(totals.capped.avg, totals.total_asset_value);
  assert.equal(totals.capped.low, totals.total_low_est_value);
  assert.equal(totals.capped.high, totals.total_high_est_value);
  assert.equal(totals.capped.bp, totals.total_capped_bp);
});

test("pagination cannot limit aggregates and every row contributes once", () => {
  const data = sheet(Array.from({ length: 26 }, (_, i) => ({ riley: i === 25 ? 1000 : 10 })), ["riley"]);
  const before = JSON.stringify(data);
  const totals = deriveAssetScheduleSummary(data);
  assert.equal(totals.evaluator_totals.riley, 1250);
  assert.equal(totals.total_asset_value, 1250);
  assert.equal(totals.total_capped_bp, 187.5);
  assert.equal(totals.total_expected_gross, 1437.5);
  assert.equal(totals.total_allocated_value, 1437.5);
  assert.equal(totals.total_cleaning, 12.5);
  assert.equal(totals.total_lotting_fee, 12.5);
  assert.equal(totals.total_advertising, 12.5);
  assert.equal(JSON.stringify(data), before, "totals must not mutate the saved sheet");
});

test("all-blank and empty sheets display zero totals without replacing blank row values", () => {
  for (const values of [[], [{}], [{ riley: null, femi: null, jay: null }]]) {
    const data = sheet(values);
    const totals = deriveAssetScheduleSummary(data);
    assert.deepEqual(totals.evaluator_totals, { riley: 0, femi: 0, jay: 0 });
    assert.equal(totals.total_asset_value, 0);
    assert.equal(totals.total_high_est_value, 0);
    assert.equal(totals.total_low_est_value, 0);
    assert.equal(totals.total_capped_bp, 0);
    assert.equal(totals.total_expected_gross, 0);
    assert.equal(totals.total_allocated_value, 0);
    for (const key of ["total_cleaning", "total_lien_search", "total_video_cost", "total_lotting_fee", "total_advertising"]) {
      assert.equal(totals[key], 0);
    }
    if (data.rows.length) {
      assert.equal(data.rows[0].evaluator_values.riley, null);
      assert.equal(data.rows[0].high_est_sale_value, null);
      assert.equal(data.rows[0].buyer_premium_amount, null);
      assert.equal(data.rows[0].total_expected_gross, null);
      assert.equal(data.rows[0].allocated_value, null);
    }
  }
});

test("evaluator IDs, not names or removed entries, own totals", () => {
  const data = sheet([{ left: 12, right: 30, removed: 99999 }], ["right", "left", "new"]);
  data.evaluator_columns.forEach((column) => { column.name = "Same name"; });
  const totals = deriveAssetScheduleSummary(data);
  assert.deepEqual(totals.evaluator_totals, { right: 30, left: 12, new: 0 });
  assert.equal(totals.total_asset_value, 21);
  assert.equal(totals.total_high_est_value, 30);
});

test("precision is preserved until display, including explicit zero and existing negative-value formulas", () => {
  const data = sheet([{ riley: 0.004, femi: 0 }, { riley: 0.004, femi: -0.002 }], ["riley", "femi"]);
  const totals = deriveAssetScheduleSummary(data);
  assert.equal(totals.evaluator_totals.riley, 0.008);
  assert.equal(formatCurrencyCell(totals.evaluator_totals.riley), "0.01");
  assert.equal(totals.evaluator_totals.femi, -0.002);
  assert.equal(totals.total_asset_value, 0.003);
  assert.equal(totals.total_low_est_value, -0.002);
  assert.equal(totals.total_high_est_value, 0.008);
  assert.equal(totals.total_expected_gross, 0.0092);
  assert.equal(totals.total_allocated_value, 0.0092);
  assert.equal(formatCurrencyCell(totals.total_expected_gross), "0.01");
});

test("canonical parsing ignores unavailable/nonfinite values and honours entered zero", () => {
  const data = sheet([
    { riley: "1,250.50", femi: "", jay: Number.NaN },
    { riley: Number.POSITIVE_INFINITY, femi: 0, jay: null },
  ]);
  const totals = deriveAssetScheduleSummary(data);
  assert.deepEqual(totals.evaluator_totals, { riley: 1250.5, femi: 0, jay: 0 });
  assert.equal(totals.total_asset_value, 1250.5);
});

test("editing an evaluator value recalculates totals from the same updated row formulas", () => {
  const data = sheet([{ riley: 100, femi: 200 }]);
  const updated = recalculateAssetScheduleSheet({
    ...data, rows: data.rows.map((row) => ({ ...row, evaluator_values: { ...row.evaluator_values, femi: 300 } })),
  });
  const totals = deriveAssetScheduleSummary(updated);
  assert.deepEqual(totals.evaluator_totals, { riley: 100, femi: 300, jay: 0 });
  assert.equal(totals.total_asset_value, 200);
  assert.equal(totals.total_high_est_value, 300);
  assert.equal(totals.total_capped_bp, 45);
  assert.equal(totals.total_expected_gross, 345);
  assert.equal(totals.total_allocated_value, 345);
});

test("gross and allocated totals sum the displayed finite row amounts independently", () => {
  const data = sheet([{ riley: 100 }, {}, {}]);
  data.rows[0].total_expected_gross = 123.45;
  data.rows[0].allocated_value = 120.25;
  data.rows[1].total_expected_gross = Number.NaN;
  data.rows[1].allocated_value = Number.POSITIVE_INFINITY;
  data.rows[2].total_expected_gross = null;
  data.rows[2].allocated_value = 0;
  const before = structuredClone(data);
  const totals = deriveAssetScheduleSummary(data);
  assert.equal(totals.total_expected_gross, 123.45);
  assert.equal(totals.total_allocated_value, 120.25);
  assert.deepEqual(data, before);
});

test("cost totals reflect edits, blanks and zero without changing the existing projected cost formula", () => {
  const data = sheet([{ riley: 100 }, { riley: 200 }]);
  data.rows[0].lien_search = 12.25;
  data.rows[0].video_cost = 0;
  data.rows[1].video_cost = 3.5;
  const updated = recalculateAssetScheduleSheet(data);
  const totals = deriveAssetScheduleSummary(updated);
  assert.equal(totals.total_cleaning, 3);
  assert.equal(totals.total_lien_search, 12.25);
  assert.equal(totals.total_video_cost, 3.5);
  assert.equal(totals.total_lotting_fee, 3);
  assert.equal(totals.total_advertising, 3);
  assert.equal(totals.total_projected_costs, 24.75);
  assert.equal(updated.rows[0].video_cost, 0);
  assert.equal(updated.rows[1].lien_search, null);
});

test("loaded and edited sheets use recomputed row amounts rather than stale derived values", () => {
  const data = sheet([{ riley: 100, femi: 200 }]);
  Object.assign(data.rows[0], {
    total_expected_gross: 99999, allocated_value: 99999,
    cleaning: 99999, lotting_fee: 99999, advertising: 99999,
  });
  const totals = deriveAssetScheduleSummary(recalculateAssetScheduleSheet(data));
  assert.equal(totals.total_expected_gross, 230);
  assert.equal(totals.total_allocated_value, 230);
  assert.equal(totals.total_cleaning, 2);
  assert.equal(totals.total_lotting_fee, 2);
  assert.equal(totals.total_advertising, 2);
});

test("desktop and mobile render the same all-sheet totals with amount-only premium", () => {
  const source = readFileSync(new URL("../app/components/reports/AssetScheduleSheet.tsx", import.meta.url), "utf8");
  assert.match(source, /deriveAssetScheduleSummary\(sheet\)/);
  assert.match(source, /<TableFooter aria-label=\{`Totals across all \$\{sheet.rows.length\} lots`\}>/);
  assert.match(source, /const total = allLotTotals\[column.id\]/);
  assert.match(source, /Object.entries\(allLotTotals\).map/);
  assert.match(source, /buyer_premium_amount: \{ label: "B.P. amount \(\$\)", value: derivedSummary.total_capped_bp \}/);
  assert.match(source, /total_expected_gross: \{ label: "Total Expected Gross \(\$\)", value: derivedSummary.total_expected_gross \}/);
  assert.match(source, /allocated_value: \{ label: "Allocated Value \(\$\)", value: derivedSummary.total_allocated_value \}/);
  for (const field of ["cleaning", "lien_search", "video_cost", "lotting_fee", "advertising"]) {
    assert.match(source, new RegExp(`${field}: \\{ label: "[^"]+", value: derivedSummary.total_${field} \\}`));
  }
  assert.doesNotMatch(source, /buyer_premium_percent: \{ label:/);
});
