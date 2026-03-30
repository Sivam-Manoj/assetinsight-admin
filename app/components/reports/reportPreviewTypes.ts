export type ReportPreviewField = {
  label: string;
  value: string;
};

export type AssetAdminScheduleMarketCheck = {
  comparable_count: "" | "High" | "Moderate" | "Low";
  avg_retail_asking_price: "" | "High" | "Moderate" | "Low";
  market_saturation: "" | "Low" | "Moderate" | "High";
  market_velocity: "" | "Fast" | "Normal" | "Slow";
  regional_demand: "" | "Strong" | "Average" | "Weak";
  notes: string;
};

export type AssetAdminScheduleBuyersPremiumBasis = "uncapped" | "capped";

export type AssetAdminScheduleFileSummary = {
  buyers_premium_basis: AssetAdminScheduleBuyersPremiumBasis;
  total_risk_weighted_value: number | null;
  file_risk_multiplier: number | null;
  commission_percent_no_guarantee: number | null;
  capped_threshold_percent: number;
};

export type AssetAdminScheduleEvaluatorColumn = {
  id: string;
  name: string;
};

export type AssetAdminScheduleRow = {
  lot_id: string;
  asset_id: string;
  asset_category: string;
  year: string;
  make: string;
  model: string;
  serial_number: string;
  cr_details: string;
  condition_score: string;
  location: string;
  pictures: number;
  picture_urls: string[];
  market_check: AssetAdminScheduleMarketCheck;
  asset_insight: string;
  evaluator_values: Record<string, number | null>;
  low_est_sale_value: number | null;
  high_est_sale_value: number | null;
  buyer_premium_percent: number;
  buyer_premium_amount: number | null;
  total_expected_gross: number | null;
  allocated_value: number | null;
  notes: string;
  cleaning: number | null;
  lien_search: number | null;
  video_cost: number | null;
  lotting_fee: number | null;
  advertising: number | null;
};

export type AssetAdminScheduleSheet = {
  evaluator_columns: AssetAdminScheduleEvaluatorColumn[];
  rows: AssetAdminScheduleRow[];
  file_summary: AssetAdminScheduleFileSummary;
};

export type ReportPreviewPayload = {
  title: string;
  meta: ReportPreviewField[];
  data: Record<string, unknown>;
  variant?: "assetScheduleSheet";
  currencyCode?: string;
  assetScheduleSheet?: AssetAdminScheduleSheet;
};
