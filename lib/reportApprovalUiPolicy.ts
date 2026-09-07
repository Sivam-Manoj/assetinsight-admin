type ReportFamily = { reportType?: string; isRealEstateReport?: boolean };

export function releasesWithApproval(report: ReportFamily): boolean {
  return Boolean(report.isRealEstateReport) || ["realestate", "salvage"].includes(String(report.reportType || "").toLowerCase().replace(/[\s_-]/g, ""));
}

export function pendingApprovalBlockReason(report: {
  files_generating?: boolean; files_regenerating?: boolean; files_ready?: boolean;
  generation_state?: string; workflow_stage?: string; job_status?: string;
}): string | null {
  if (report.files_generating || report.files_regenerating || ["queued", "processing"].includes(report.generation_state || "") || ["queued", "processing"].includes(report.job_status || "") || ["preparing_preview", "generating_files"].includes(report.workflow_stage || "")) {
    return "Files are being generated. Refresh when processing finishes before approving.";
  }
  if (report.files_ready === false || report.generation_state === "error" || report.workflow_stage === "error" || ["error", "failed"].includes(report.job_status || "")) {
    return "The current report files are incomplete. The creator must regenerate them before approval.";
  }
  return null;
}

export function groupPendingApprovalRows<T extends { _id: string; report?: string; createdAt: string; updatedAt?: string }>(items: T[]): (T & { actionId: string })[] {
  const grouped = new Map<string, T & { actionId: string }>();
  for (const item of items) {
    const groupId = String(item.report || item._id);
    const current = grouped.get(groupId);
    // PdfReport rows group by parent, but decisions/previews address an artifact
    // _id. Modern Asset/Real Estate preview rows already use the parent as _id.
    if (!current || new Date(item.updatedAt || item.createdAt).getTime() > new Date(current.updatedAt || current.createdAt).getTime()) {
      grouped.set(groupId, { ...item, actionId: item._id });
    }
  }
  return Array.from(grouped.values()).sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
}
