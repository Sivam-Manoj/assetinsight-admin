import type { ReportPreviewPayload } from "@/app/components/reports/reportPreviewTypes";

export type PreviewWorkflowStage =
  | "preparing_preview"
  | "preview_ready"
  | "generating_files"
  | "awaiting_approval"
  | "awaiting_release"
  | "error";

export type PreviewReportCreator = {
  id: string;
  username: string;
  email: string;
  companyName: string;
  isBlocked: boolean;
  displayName?: string;
};

export type PreviewReportSummary = {
  id: string;
  reportType: "Asset" | "LotListing";
  title: string;
  contractNo: string;
  clientName: string;
  creator: PreviewReportCreator | null;
  creatorDisplay: string;
  lotCount: number;
  imageCount: number;
  lotNumbers: Array<string | number>;
  lotNumberSummary: string;
  thumbnailUrl: string | null;
  status: string;
  releaseStatus: string;
  createdAt: string;
  updatedAt: string;
  previewSubmittedAt: string | null;
  workflowStage: PreviewWorkflowStage;
  workflowMessage: string;
  workflowProgressPercent: number;
  generationState: string;
  filesReady: boolean;
  jobStatus: string;
  jobError: string;
};

export type PreviewReportsResponse = {
  items: PreviewReportSummary[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  stageCounts: Record<PreviewWorkflowStage, number>;
  creators: PreviewReportCreator[];
  truncated?: boolean;
};

export type PreviewReportDetailResponse = {
  report: {
    id: string;
    reportType: "Asset" | "LotListing";
    contractNo: string;
    creator: PreviewReportCreator | null;
    status: string;
    releaseStatus: string;
    createdAt: string;
    updatedAt: string;
    previewSubmittedAt: string | null;
    generation_state: string;
    workflow_stage: PreviewWorkflowStage;
    workflow_message: string;
    workflow_progress_percent: number;
    files_ready: boolean;
    job_status: string;
    job_error: string;
  };
  preview: ReportPreviewPayload;
};
