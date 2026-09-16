import assert from "node:assert/strict";
import test from "node:test";
import { visibleCreditWarnings } from "../lib/creditWarnings.ts";

const tokenNotice = "GPT-6 usage fallback uses standard token rates; long-context and cache-write surcharges require the official Costs endpoint for exact reconciliation.";
const modelNotice = 'Usage model "gpt-4o-mini-2024-07-18" was priced with gpt-5.6-terra defaults. Set OPENAI_PRICE_GPT_5_6_TERRA_INPUT_PER_1M, OPENAI_PRICE_GPT_5_6_TERRA_CACHED_INPUT_PER_1M, and OPENAI_PRICE_GPT_5_6_TERRA_OUTPUT_PER_1M to override.';

test("hides the two model-pricing notices from the credit UI", () => {
  assert.deepEqual(visibleCreditWarnings([tokenNotice, modelNotice]), []);
  assert.deepEqual(visibleCreditWarnings([` ${tokenNotice} `, `\n${modelNotice}\n`]), []);
});

test("hides the reported label when notices arrive bundled together", () => {
  assert.deepEqual(visibleCreditWarnings([`${tokenNotice} ${modelNotice}`]), []);
  assert.deepEqual(visibleCreditWarnings([`${modelNotice}\n${tokenNotice}`]), []);
  assert.deepEqual(visibleCreditWarnings([`${tokenNotice} ${modelNotice} ${tokenNotice}`]), []);
});

test("hides notices with line wrapping and non-breaking spaces", () => {
  const wrapped = `${tokenNotice} ${modelNotice}`.replaceAll(" ", "\n\u00a0");
  assert.deepEqual(visibleCreditWarnings([wrapped]), []);
});

test("removes only pricing notices from a combined operational warning", () => {
  const operational = "OpenAI organization cost sync failed (403).";
  assert.deepEqual(visibleCreditWarnings([`${tokenNotice} ${operational} ${modelNotice}`]), [operational]);
  assert.deepEqual(visibleCreditWarnings([`${operational} ${modelNotice}`]), [operational]);
  assert.deepEqual(visibleCreditWarnings([`${tokenNotice}\n${operational}`]), [operational]);
});

test("retains genuine sync, configuration and missing-usage warnings", () => {
  const operational = [
    "OpenAI organization cost sync failed (403).",
    "OPENAI_ADMIN_API_KEY is not configured.",
    "OPENAI_CREDIT_BUDGET_CREDITS is not configured.",
    "OpenAI usage sync returned no model usage rows for this period.",
  ];
  assert.deepEqual(visibleCreditWarnings([tokenNotice, ...operational, modelNotice]), operational);
});

test("does not hide other errors merely mentioning model or pricing terms", () => {
  const warnings = [
    "OpenAI organization cost sync failed: token rates unavailable.",
    'Usage model "gpt-4o-mini" could not be loaded.',
  ];
  assert.deepEqual(visibleCreditWarnings(warnings), warnings);
});

test("does not mutate the backend response or accept malformed warnings", () => {
  const warnings = Object.freeze([tokenNotice, modelNotice, "Connection failed"]);
  assert.deepEqual(visibleCreditWarnings(warnings), ["Connection failed"]);
  assert.deepEqual(warnings, [tokenNotice, modelNotice, "Connection failed"]);
  assert.deepEqual(visibleCreditWarnings([null, 1, {}, "", "  "]), []);
  for (const value of [undefined, null, {}, "warning"]) {
    assert.deepEqual(visibleCreditWarnings(value), []);
  }
});
