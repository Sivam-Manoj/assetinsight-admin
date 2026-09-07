"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  Check,
  ClipboardCheck,
  Eye,
  RefreshCw,
  X,
} from "lucide-react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
} from "@mui/material";
import styles from "./PendingApprovalsWorkspace.module.css";
import { groupPendingApprovalRows, pendingApprovalBlockReason, releasesWithApproval } from "@/lib/reportApprovalUiPolicy";

type PendingReport = {
  _id: string;
  filename?: string;
  address?: string;
  fairMarketValue?: string;
  reportType?: string;
  createdAt: string;
  updatedAt?: string;
  contract_no?: string;
  property_type?: string;
  fileType?: string;
  report?: string;
  isRealEstateReport?: boolean;
  isAssetReport?: boolean;
  files_generating?: boolean;
  files_regenerating?: boolean;
  files_ready?: boolean;
  generation_state?: string;
  workflow_stage?: string;
  job_status?: string;
  user?: { email?: string; username?: string; companyName?: string } | null;
  approval_assigned_to?: {
    email?: string;
    username?: string;
    companyName?: string;
  } | null;
};

type PendingResponse = {
  items: PendingReport[];
  total: number;
  page: number;
  limit: number;
};

type QueueRow = PendingReport & { actionId: string };

const PAGE_SIZE = 50;

function reportTypeLabel(report: PendingReport) {
  if (report.isRealEstateReport || report.reportType === "RealEstate") return "Real Estate";
  if (report.reportType === "Salvage") return "Salvage";
  if (report.reportType === "Asset" || report.isAssetReport) return "Asset";
  return report.reportType || "Report";
}

function reportTitle(report: PendingReport) {
  if (report.isRealEstateReport || report.reportType === "RealEstate") {
    return report.address || report.filename || "Real Estate appraisal";
  }
  const type = reportTypeLabel(report);
  return report.contract_no ? `${type} - ${report.contract_no}` : report.address || report.filename || type;
}

function ownerLabel(report: PendingReport) {
  return report.user?.username || report.user?.companyName || report.user?.email || "Unknown user";
}

function approverLabel(report: PendingReport) {
  const approver = report.approval_assigned_to;
  return approver?.username || approver?.companyName || approver?.email || "Unassigned legacy report";
}

export default function PendingApprovalsWorkspace() {
  const [data, setData] = useState<PendingResponse>({ items: [], total: 0, page: 1, limit: PAGE_SIZE });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [processingId, setProcessingId] = useState("");
  const [rejectTarget, setRejectTarget] = useState<QueueRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [notice, setNotice] = useState<{ severity: "success" | "error"; message: string } | null>(null);
  const decisionBusy = useRef(false);
  const loadVersion = useRef(0);

  const load = useCallback(async (targetPage = page) => {
    const version = ++loadVersion.current;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/reports/pending?page=${targetPage}&limit=${PAGE_SIZE}`, {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as PendingResponse & { message?: string };
      if (!response.ok) throw new Error(payload.message || "Pending approvals could not be loaded.");
      if (version === loadVersion.current) setData({ ...payload, items: Array.isArray(payload.items) ? payload.items : [] });
    } catch (loadError) {
      if (version === loadVersion.current) setError(loadError instanceof Error ? loadError.message : "Pending approvals could not be loaded.");
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load(page);
  }, [load, page]);

  const rows = useMemo(() => groupPendingApprovalRows(data.items), [data.items]);
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesType = type === "all" || reportTypeLabel(row).toLowerCase() === type;
      const matchesSearch = !query || [reportTitle(row), row.address, row.contract_no, ownerLabel(row), row.user?.email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
      return matchesType && matchesSearch;
    });
  }, [rows, search, type]);

  const totalPages = Math.max(1, Math.ceil(data.total / Math.max(1, data.limit || PAGE_SIZE)));

  async function approve(row: QueueRow) {
    if (decisionBusy.current || pendingApprovalBlockReason(row)) return;
    decisionBusy.current = true;
    setProcessingId(row.actionId);
    try {
      const response = await fetch(`/api/admin/reports/${row.actionId}/approve`, { method: "PATCH" });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(payload.message || "The report could not be approved.");
      setNotice({ severity: "success", message: releasesWithApproval(row) ? `${reportTypeLabel(row)} report approved and released. Downloads are now available.` : `${reportTypeLabel(row)} appraisal approved.` });
      await load(page);
    } catch (approveError) {
      setNotice({ severity: "error", message: approveError instanceof Error ? approveError.message : "Approval failed." });
    } finally {
      setProcessingId("");
      decisionBusy.current = false;
    }
  }

  async function reject() {
    if (!rejectTarget || !rejectReason.trim() || decisionBusy.current) return;
    decisionBusy.current = true;
    setProcessingId(rejectTarget.actionId);
    try {
      const response = await fetch(`/api/admin/reports/${rejectTarget.actionId}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: rejectReason.trim(), reason: rejectReason.trim() }),
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(payload.message || "The report could not be rejected.");
      setNotice({ severity: "success", message: "Report returned to the creator with your feedback." });
      setRejectTarget(null);
      setRejectReason("");
      await load(page);
    } catch (rejectError) {
      setNotice({ severity: "error", message: rejectError instanceof Error ? rejectError.message : "Rejection failed." });
    } finally {
      setProcessingId("");
      decisionBusy.current = false;
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Review queue</p>
          <h1 className={styles.title}>Pending Approvals</h1>
          <p className={styles.description}>
            Review Real Estate, Salvage and other pending reports. Real Estate and Salvage approval immediately releases the completed files for download. Asset approval and release remain separate.
          </p>
        </div>
        <div className={styles.count} aria-label={`${data.total} reports awaiting review`}>
          <span className={styles.countLabel}>Awaiting review</span>
          <span className={styles.countValue}>{data.total}</span>
        </div>
      </header>

      <section className={styles.toolbar} aria-label="Approval filters">
        <input
          className={styles.search}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search address, contract, or creator"
          aria-label="Search pending approvals"
        />
        <select className={styles.select} value={type} onChange={(event) => setType(event.target.value)} aria-label="Filter report type">
          <option value="all">All report types</option>
          <option value="real estate">Real Estate</option>
          <option value="asset">Asset</option>
          <option value="salvage">Salvage</option>
        </select>
        <button className={styles.button} onClick={() => void load(page)} disabled={loading || Boolean(processingId)}>
          <RefreshCw size={16} className={loading ? "animate-spin" : undefined} />
          Refresh
        </button>
      </section>

      <section className={styles.list} aria-busy={loading}>
        <div className={styles.columnHeader} aria-hidden="true">
          <span>Report</span>
          <span>Creator / approver</span>
          <span>Value / submitted</span>
          <span>Review actions</span>
        </div>

        {error ? <div role="alert" className={styles.error}>{error}</div> : null}
        {!error && loading && !rows.length ? <div className={styles.empty}>Loading pending approvals...</div> : null}
        {!error && !loading && !filteredRows.length ? (
          <div className={styles.empty}>
            <ClipboardCheck size={26} aria-hidden />
            <p>No pending approvals match these filters.</p>
          </div>
        ) : null}

        {!error && filteredRows.map((row) => {
          const isProcessing = processingId === row.actionId;
          const blockReason = pendingApprovalBlockReason(row);
          const created = new Date(row.createdAt);
          return (
            <article className={styles.row} key={row.actionId}>
              <div>
                <div className={styles.reportTop}>
                  <span className={styles.typeIcon}><Building2 size={20} aria-hidden /></span>
                  <div style={{ minWidth: 0 }}>
                    <h2 className={styles.reportName}>{reportTitle(row)}</h2>
                    <div className={styles.muted}>
                      {reportTypeLabel(row)}{row.property_type ? ` · ${row.property_type}` : ""}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <strong>{ownerLabel(row)}</strong>
                <div className={styles.muted}>{row.user?.email || "No email available"}</div>
                <div className={styles.muted}>Assigned to: {approverLabel(row)}</div>
              </div>

              <div>
                <span className={styles.badge}>{blockReason ? "Files not ready" : "Awaiting approval"}</span>
                {blockReason ? <div className={styles.muted}>{blockReason}</div> : releasesWithApproval(row) ? <div className={styles.muted}>Releases immediately on approval</div> : null}
                <div className={styles.muted}>{row.fairMarketValue || "Value not provided"}</div>
                <div className={styles.muted}>{Number.isNaN(created.getTime()) ? "Date unavailable" : created.toLocaleString()}</div>
              </div>

              <div className={styles.actions}>
                <Link
                  className={`${styles.actionButton} ${styles.review}`}
                  href={`/reports/${row.actionId}/data?from=pending-approvals`}
                >
                  <Eye size={16} aria-hidden />
                  Review
                </Link>
                <button className={`${styles.actionButton} ${styles.approve}`} onClick={() => void approve(row)} disabled={Boolean(processingId) || Boolean(blockReason)} title={blockReason || (releasesWithApproval(row) ? "Approve and release this report" : "Approve this report")}>
                  <Check size={16} aria-hidden />
                  {isProcessing ? "Processing…" : releasesWithApproval(row) ? "Approve & release" : "Approve"}
                </button>
                <button className={`${styles.actionButton} ${styles.reject}`} onClick={() => setRejectTarget(row)} disabled={Boolean(processingId)}>
                  <X size={16} aria-hidden />
                  Return
                </button>
              </div>
            </article>
          );
        })}
      </section>

      <div className={styles.pagination}>
        <span>Showing {filteredRows.length} of {data.total} pending reports</span>
        <div className={styles.paginationActions}>
          <button className={styles.button} disabled={page <= 1 || loading || Boolean(processingId)} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button className={styles.button} disabled={page >= totalPages || loading || Boolean(processingId)} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next</button>
        </div>
      </div>

      <Dialog
        open={Boolean(rejectTarget)}
        onClose={() => {
          if (!processingId) setRejectTarget(null);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Return report to creator</DialogTitle>
        <DialogContent>
          <div className={styles.dialogBody}>
            <p>Explain what must be corrected. The creator will receive this note.</p>
            <textarea
              className={styles.textarea}
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Required corrections"
              aria-label="Required corrections"
              disabled={Boolean(processingId)}
              autoFocus
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectTarget(null)} disabled={Boolean(processingId)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => void reject()} disabled={!rejectReason.trim() || Boolean(processingId)}>
            Return report
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(notice)} autoHideDuration={4500} onClose={() => setNotice(null)}>
        <Alert severity={notice?.severity || "success"} onClose={() => setNotice(null)}>{notice?.message}</Alert>
      </Snackbar>
    </main>
  );
}
