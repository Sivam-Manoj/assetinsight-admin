import assert from "node:assert/strict";
import test from "node:test";
import { groupPendingApprovalRows, pendingApprovalBlockReason, releasesWithApproval } from "../lib/reportApprovalUiPolicy.ts";

test("only Real Estate and Salvage release with approval", () => {
  for (const reportType of ["RealEstate", "Real Estate", "Salvage"]) assert.equal(releasesWithApproval({ reportType }), true);
  for (const reportType of ["Asset", "LotListing", "", undefined]) assert.equal(releasesWithApproval({ reportType }), false);
});

test("Pdf siblings group once but retain an actionable artifact id", () => {
  const rows = groupPendingApprovalRows([
    { _id: "salvage-pdf", report: "salvage-parent", createdAt: "2026-09-07", reportType: "Salvage" },
    { _id: "salvage-docx", report: "salvage-parent", createdAt: "2026-09-07", reportType: "Salvage" },
    { _id: "re-preview", report: "re-preview", createdAt: "2026-09-06", reportType: "RealEstate" },
    { _id: "legacy-re-docx", report: "legacy-re-parent", createdAt: "2026-09-05", reportType: "RealEstate" },
  ]);
  assert.deepEqual(rows.map(row => row.actionId), ["salvage-pdf", "re-preview", "legacy-re-docx"]);
});

test("incomplete/processing files cannot be approved; legacy absent flags remain server-authorized", () => {
  for (const state of [{ files_generating: true }, { files_regenerating: true }, { files_ready: false }, { generation_state: "processing" }, { generation_state: "ready", job_status: "queued" }, { workflow_stage: "error" }]) {
    assert.ok(pendingApprovalBlockReason(state));
  }
  assert.equal(pendingApprovalBlockReason({ files_ready: true, generation_state: "ready" }), null);
  assert.equal(pendingApprovalBlockReason({}), null);
});
