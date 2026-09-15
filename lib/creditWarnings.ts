const TOKEN_RATE_NOTICE =
  "GPT-6 usage fallback uses standard token rates; long-context and cache-write surcharges require the official Costs endpoint for exact reconciliation.";
const MODEL_RATE_NOTICE =
  /^Usage model "[^"\r\n]*" was priced with [\w.-]+ defaults\. Set OPENAI_PRICE_[A-Z0-9_]+, OPENAI_PRICE_[A-Z0-9_]+, and OPENAI_PRICE_[A-Z0-9_]+ to override\.$/;

// Presentation only: keep provider/accounting data intact and retain operational
// warnings. The credit service and its multiplier are intentionally unchanged.
export function visibleCreditWarnings(warnings: unknown): string[] {
  if (!Array.isArray(warnings)) return [];
  return warnings.filter((warning): warning is string => {
    if (typeof warning !== "string" || !warning.trim()) return false;
    const message = warning.trim();
    return message !== TOKEN_RATE_NOTICE && !MODEL_RATE_NOTICE.test(message);
  });
}
