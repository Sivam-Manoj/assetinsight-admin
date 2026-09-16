const TOKEN_RATE_NOTICE =
  /GPT-6\s+usage\s+fallback\s+uses\s+standard\s+token\s+rates;\s+long-context\s+and\s+cache-write\s+surcharges\s+require\s+the\s+official\s+Costs\s+endpoint\s+for\s+exact\s+reconciliation\./g;
const MODEL_RATE_NOTICE =
  /Usage\s+model\s+"[^"\r\n]*"\s+was\s+priced\s+with\s+[\w.-]+\s+defaults\.\s+Set\s+OPENAI_PRICE_[A-Z0-9_]+,\s+OPENAI_PRICE_[A-Z0-9_]+,\s+and\s+OPENAI_PRICE_[A-Z0-9_]+\s+to\s+override\./g;

// Presentation only: keep provider/accounting data intact and retain operational
// warnings. The credit service and its multiplier are intentionally unchanged.
export function visibleCreditWarnings(warnings: unknown): string[] {
  if (!Array.isArray(warnings)) return [];
  return warnings.flatMap((warning): string[] => {
    if (typeof warning !== "string" || !warning.trim()) return [];
    // Notices can arrive joined in one persisted warning. Remove only the known
    // notice sentences so genuine failures in the same entry remain visible.
    const message = warning.replace(TOKEN_RATE_NOTICE, "").replace(MODEL_RATE_NOTICE, "");
    if (!message.trim()) return [];
    return [message === warning ? warning : message.trim()];
  });
}
