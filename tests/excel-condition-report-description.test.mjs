import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { excelConditionReportDescription, excelConditionReportDescriptionHelp } from "../lib/excelConditionReportDescription.ts";

test("Title and Description remain independent, including long multiline descriptions", () => {
  const description = `Reviewed description\n${"Detailed specification. ".repeat(30)}`;
  const row = { title: "Lot title TEST", description };
  assert.deepEqual(excelConditionReportDescription(row), { description });
  assert.equal(row.title, "Lot title TEST");
  assert.deepEqual(excelConditionReportDescription({ ...row, title: "Different title" }), { description });
});

test("explicit blank Description is sent, not replaced by the Title", () => {
  assert.deepEqual(excelConditionReportDescription({ title: "Original title", description: "" }), { description: "" });
  assert.deepEqual(excelConditionReportDescription({ description: "  " }), { description: "  " });
});

test("old or malformed DTOs omit Description rather than clearing saved content", () => {
  for (const row of [{ title: "Title TEST" }, { description: undefined }, { description: null }, { description: 123 }]) {
    assert.deepEqual(excelConditionReportDescription(row), {});
    assert.equal(Object.hasOwn(excelConditionReportDescription(row), "description"), false);
  }
});

test("editor normalizes and saves separate descriptions through the existing atomic request", () => {
  const source = readFileSync(new URL("../app/components/reports/ExcelConditionReportEditorDialog.tsx", import.meta.url), "utf8");
  assert.equal(source.match(/\.\.\.excelConditionReportDescription\(row\)/g)?.length, 2);
  assert.match(source, /label="Title"/);
  assert.match(source, /label="Description"/);
  assert.match(source, /description: event\.target\.value/);
  assert.match(source, /row\.description,/);
  assert.match(source, /disabled=\{saving \|\| typeof activeRow\.description !== "string"\}/);
  assert.match(source, /Changing the title does not change the saved description/);
  assert.match(source, /excelConditionReportDescriptionHelp\(activeRow\.descriptionScope\)/);
  assert.match(source, /descriptionScope: row\.descriptionScope === "lot" \|\| row\.descriptionScope === "item"/);
  assert.doesNotMatch(source.slice(source.indexOf("const editorBody ="), source.indexOf("const acceptSavedEditor")), /descriptionScope/);
  assert.match(source, /Description is blank; generated files use the title/);
  assert.match(source, /title="Lot content preview"/);
  assert.doesNotMatch(source, /title="Final Excel preview"/);
  assert.match(source, /\/rerun-excel-cr`/);
  assert.match(source, /body: JSON\.stringify\(editorBody\)/);
  assert.match(source, /revision: payload\.revision/);
  assert.match(source, /The server queued file regeneration without confirming the saved editor snapshot/);
  assert.doesNotMatch(source, /description: row\.title|description: activeRow\.title/);
});

test("output scope distinguishes lot CR documents from nested Excel item rows", () => {
  assert.match(excelConditionReportDescriptionHelp("lot"), /Used in Excel, CR PDF and CR DOCX/);
  assert.match(excelConditionReportDescriptionHelp("lot"), /If blank, the title is used/);
  assert.match(excelConditionReportDescriptionHelp("item"), /this item's Excel row/);
  assert.match(excelConditionReportDescriptionHelp("item"), /parent lot's description; edit it in the full report preview/);
  assert.match(excelConditionReportDescriptionHelp(), /parent lot's description/);
  assert.doesNotMatch(excelConditionReportDescriptionHelp("item"), /Used in Excel, CR PDF and CR DOCX/);
});
