/**
 * A missing Description is an older server DTO, not an instruction to clear it.
 * Keep explicit empty strings and do not infer a Description from the Title.
 */
export function excelConditionReportDescription(
  row: { description?: unknown }
): { description?: string } {
  return typeof row.description === "string" ? { description: row.description } : {};
}

export function excelConditionReportDescriptionHelp(scope?: "lot" | "item"): string {
  if (scope === "lot") {
    return "Used in Excel, CR PDF and CR DOCX after Save & regenerate files. If blank, the title is used.";
  }
  if (scope === "item") {
    return "Used for this item's Excel row. CR PDF and CR DOCX use the parent lot's description; edit it in the full report preview. If blank, the existing title/parent fallback is used.";
  }
  return "Used in Excel after Save & regenerate files. CR PDF and CR DOCX use the parent lot's description; edit parent-lot text in the full report preview.";
}
