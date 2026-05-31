"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type PaginationState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import ConfirmModal from "@/app/components/common/ConfirmModal";
import ReportPreviewModal, {
  type ReportPreviewPayload,
} from "@/app/components/reports/ReportPreviewModal";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ArchiveRoundedIcon from "@mui/icons-material/ArchiveRounded";
import CollectionsRoundedIcon from "@mui/icons-material/CollectionsRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import RestoreRoundedIcon from "@mui/icons-material/RestoreRounded";
import TableChartRoundedIcon from "@mui/icons-material/TableChartRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";

type ReportItem = {
  _id: string;
  filename: string;
  address: string;
  fairMarketValue: string;
  user?: { email?: string; username?: string } | null;
  reportType: "RealEstate" | "Salvage" | "Asset" | "LotListing" | string;
  createdAt: string;
  reportModel?: string;
  fileType?: "pdf" | "spec_pdf" | "docx" | "xlsx" | "images";
  approvalStatus?: "pending" | "approved" | "rejected";
  report?: string;
  contract_no?: string;
  preview_files?: { pdf?: string; spec_pdf?: string; docx?: string; excel?: string; images?: string };
  isRealEstateReport?: boolean;
  isLotListingReport?: boolean;
  property_type?: string;
  language?: string;
  adminArchivedAt?: string | null;
};

type ApiResponse = {
  items: ReportItem[];
  total: number;
  page: number;
  limit: number;
};

type ReportGroup = {
  key: string;
  title: string;
  contract_no?: string;
  reportType: string;
  createdAt: string;
  fairMarketValue: string;
  userEmail?: string;
  variants: { pdf?: ReportItem; specPdf?: ReportItem; docx?: ReportItem; xlsx?: ReportItem; images?: ReportItem };
  isAssetReport?: boolean;
  isRealEstateReport?: boolean;
  isLotListingReport?: boolean;
  preview_files?: { pdf?: string; spec_pdf?: string; docx?: string; excel?: string; images?: string };
  adminArchivedAt?: string | null;
};

type ReportFileLink = {
  label: string;
  href?: string;
};

const ALL_PAGE_SIZE = 100000;

function formatFMV(value: string) {
  return value || "N/A";
}

function getReportTypeLabel(reportType: string) {
  return reportType === "LotListing" ? "Lot Listing" : reportType;
}

function getPreviewTargetId(group: ReportGroup) {
  return (
    group.variants.pdf?._id ||
    group.variants.specPdf?._id ||
    group.variants.docx?._id ||
    group.variants.xlsx?._id ||
    group.variants.images?._id ||
    group.key
  );
}

function buildFileLinks(group: ReportGroup): ReportFileLink[] {
  if (group.isLotListingReport) {
    return [
      { label: "Conditional Report", href: `/api/admin/reports/${group.key}/spec-pdf` },
      { label: "Excel", href: group.preview_files?.excel },
      { label: "Images", href: group.preview_files?.images },
    ];
  }

  if ((group.isAssetReport || group.isRealEstateReport) && group.preview_files) {
    return [
      {
        label: group.isAssetReport ? "Conditional Report" : "PDF",
        href: group.isAssetReport
          ? `/api/admin/reports/${group.key}/spec-pdf`
          : group.preview_files.spec_pdf || group.preview_files.pdf,
      },
      { label: "DOCX", href: group.preview_files.docx },
      { label: "Excel", href: group.preview_files.excel },
      { label: "Images", href: group.preview_files.images },
    ];
  }

  if (group.isAssetReport) {
    return [
      { label: "Conditional Report", href: `/api/admin/reports/${group.key}/spec-pdf` },
      {
        label: "DOCX",
        href: group.variants.docx ? `/api/admin/reports/${group.variants.docx._id}/download` : undefined,
      },
      {
        label: "Excel",
        href: group.variants.xlsx ? `/api/admin/reports/${group.variants.xlsx._id}/download` : undefined,
      },
      {
        label: "Images",
        href: group.variants.images ? `/api/admin/reports/${group.variants.images._id}/download` : undefined,
      },
    ];
  }

  return [
    {
      label: "PDF",
      href: group.variants.specPdf
        ? `/api/admin/reports/${group.variants.specPdf._id}/download`
        : group.variants.pdf
          ? `/api/admin/reports/${group.variants.pdf._id}/download`
          : undefined,
    },
    {
      label: "DOCX",
      href: group.variants.docx ? `/api/admin/reports/${group.variants.docx._id}/download` : undefined,
    },
    {
      label: "Excel",
      href:
        group.variants.xlsx && group.variants.xlsx.approvalStatus === "approved"
          ? `/api/admin/reports/${group.variants.xlsx._id}/download`
          : undefined,
    },
    {
      label: "Images",
      href:
        group.variants.images && group.variants.images.approvalStatus === "approved"
          ? `/api/admin/reports/${group.variants.images._id}/download`
          : undefined,
    },
  ];
}

function getFileActionIcon(label: string) {
  const key = label.toLowerCase();
  if (key.includes("pdf") || key.includes("conditional report")) return <PictureAsPdfRoundedIcon />;
  if (key.includes("excel")) return <TableChartRoundedIcon />;
  if (key.includes("image")) return <CollectionsRoundedIcon />;
  return undefined;
}

const actionButtonSx = {
  minWidth: "auto",
  height: 26,
  px: 0.85,
  py: 0,
  borderRadius: 999,
  textTransform: "none",
  fontSize: "0.64rem",
  fontWeight: 800,
  lineHeight: 1,
  boxShadow: "none",
  whiteSpace: "nowrap",
  "&:hover": { boxShadow: "0 8px 18px rgba(15, 23, 42, 0.12)" },
  "& .MuiButton-startIcon": { mr: 0.28, ml: -0.22 },
  "& .MuiSvgIcon-root": { fontSize: "0.82rem" },
};

export default function AdminReports() {
  // Filters
  const [q, setQ] = useState("");
  const [reportType, setReportType] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 });
  const [pageSizeMode, setPageSizeMode] = useState<"20" | "50" | "100" | "all" | "custom">("20");
  const [customPageSizeInput, setCustomPageSizeInput] = useState("150");
  const [archiveMode, setArchiveMode] = useState<"active" | "archived">("active");

  // Data
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<ReportPreviewPayload | null>(null);
  const [previewTargetId, setPreviewTargetId] = useState<string | null>(null);
  const [previewSaving, setPreviewSaving] = useState(false);
  const [previewSaveError, setPreviewSaveError] = useState<string | null>(null);
  const [previewSaveSuccess, setPreviewSaveSuccess] = useState<string | null>(null);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (reportType) p.set("reportType", reportType);
    p.set("approvalStatus", "approved");
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (userEmail) p.set("userEmail", userEmail.trim());
    if (archiveMode === "archived") p.set("archived", "true");
    p.set("page", String(pagination.pageIndex + 1));
    p.set("limit", String(pagination.pageSize));
    return p.toString();
  }, [q, reportType, from, to, userEmail, archiveMode, pagination.pageIndex, pagination.pageSize]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reports?${queryString}&_t=${Date.now()}`, {
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to load reports");
      setData(json as ApiResponse);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load reports";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  function openDelete(id: string) {
    setPendingDeleteId(id);
    setConfirmOpen(true);
  }

  async function openPreview(id: string) {
    setPreviewTargetId(id);
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewData(null);
    setPreviewSaveError(null);
    setPreviewSaveSuccess(null);
    try {
      const res = await fetch(`/api/admin/reports/${id}/preview`, {
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((json as { message?: string })?.message || "Failed to load report data");
      }
      setPreviewData(json as ReportPreviewPayload);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load report data";
      setPreviewError(message);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function saveAssetScheduleSheet(assetScheduleSheet: NonNullable<ReportPreviewPayload["assetScheduleSheet"]>) {
    if (!previewTargetId) return;
    try {
      setPreviewSaving(true);
      setPreviewSaveError(null);
      setPreviewSaveSuccess(null);
      const res = await fetch(`/api/admin/reports/${previewTargetId}/asset-schedule-sheet`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ assetScheduleSheet }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((json as { message?: string })?.message || "Failed to save asset schedule sheet");
      }
      setPreviewData(json as ReportPreviewPayload);
      setPreviewSaveSuccess("Changes saved.");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to save asset schedule sheet";
      setPreviewSaveError(message);
    } finally {
      setPreviewSaving(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/admin/reports/${pendingDeleteId}`, {
        method: "DELETE",
      });
      if (!(res.ok || res.status === 204)) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || "Failed to delete");
      }
      setConfirmOpen(false);
      setPendingDeleteId(null);
      await load();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to delete report";
      setError(message);
    } finally {
      setDeleting(false);
    }
  }

  async function setReportArchived(id: string, archived: boolean) {
    try {
      setActionBusyId(id);
      setError(null);
      const res = await fetch(`/api/admin/reports/${id}/${archived ? "archive" : "restore"}`, {
        method: "PATCH",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.message || (archived ? "Failed to complete report" : "Failed to restore report"));
      }
      await load();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : archived ? "Failed to complete report" : "Failed to restore report";
      setError(message);
    } finally {
      setActionBusyId(null);
    }
  }

  function onReset() {
    setQ("");
    setReportType("");
    setFrom("");
    setTo("");
    setUserEmail("");
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }

  const totalPages = useMemo(() => {
    return data
      ? Math.max(1, Math.ceil((data.total || 0) / pagination.pageSize))
      : 1;
  }, [data, pagination.pageSize]);

  function applyPageSize(nextSize: number, nextMode: "20" | "50" | "100" | "all" | "custom") {
    const safeSize = Math.max(1, Math.floor(nextSize));
    setPageSizeMode(nextMode);
    setPagination((prev) => ({
      ...prev,
      pageIndex: 0,
      pageSize: safeSize,
    }));
  }

  function commitCustomPageSize() {
    const parsed = Number(customPageSizeInput);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    applyPageSize(parsed, "custom");
  }

  const groups = useMemo<ReportGroup[]>(() => {
    const map = new Map<string, ReportGroup>();
    const items = (data?.items || []) as ReportItem[];
    for (const r of items) {
      const key = String((r.report as string | undefined) || r._id);
      let g = map.get(key);
      if (!g) {
        const base = r.reportType === "RealEstate" ? "Real Estate" : r.reportType === "Salvage" ? "Salvage" : r.reportType === "LotListing" ? "Lot Listing" : "Asset";
        const title = r.contract_no ? `${base} - ${r.contract_no}` : (r.address || base);
        g = {
          key,
          title,
          contract_no: r.contract_no,
          reportType: r.reportType,
          createdAt: r.createdAt,
          fairMarketValue: r.fairMarketValue,
          userEmail: r.user?.email || undefined,
          variants: {},
          isAssetReport: r.reportType === 'Asset',
          isRealEstateReport: r.reportType === 'RealEstate' || (r as any).isRealEstateReport,
          isLotListingReport: r.reportType === 'LotListing' || (r as any).isLotListingReport || (r as any).isLotListing,
          preview_files: (r as any).preview_files,
          adminArchivedAt: r.adminArchivedAt || null,
        };
        map.set(key, g);
      }
      if (new Date(r.createdAt).getTime() > new Date(g.createdAt).getTime()) g.createdAt = r.createdAt;
      const ft = ((r.fileType || r.filename.split(".").pop() || "") as string).toLowerCase();
      if (ft === "pdf") g.variants.pdf = r;
      else if (ft === "spec_pdf") g.variants.specPdf = r;
      else if (ft === "docx") g.variants.docx = r;
      else if (ft === "xlsx") g.variants.xlsx = r;
      else if (ft === "images" || ft === "zip") g.variants.images = r;
    }
    // Sort by newest first regardless of report type
    return Array.from(map.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [data]);

  function renderReportActions(group: ReportGroup) {
    const previewId = getPreviewTargetId(group);
    const archiveLabel = archiveMode === "archived" ? "Restore" : "Done";
    const archiveTooltip =
      archiveMode === "archived" ? "Restore report to active list" : "Move report to archived list";

    return (
      <Stack
        direction="row"
        flexWrap="nowrap"
        useFlexGap
        spacing={0.42}
        sx={{
          alignItems: "center",
          minWidth: 0,
          width: "max-content",
          maxWidth: "100%",
          overflow: "visible",
        }}
      >
        <Tooltip title="Open report data">
          <span>
            <Button
              size="small"
              variant="contained"
              startIcon={<VisibilityRoundedIcon />}
              sx={{
                ...actionButtonSx,
                bgcolor: "#0284c7",
                color: "#fff",
                "&:hover": { bgcolor: "#0369a1", boxShadow: "0 8px 18px rgba(2, 132, 199, 0.22)" },
              }}
              onClick={() => {
                if (previewId) void openPreview(previewId);
              }}
            >
              Data
            </Button>
          </span>
        </Tooltip>

        {buildFileLinks(group).map((link) => {
          const isPdf = link.label.toLowerCase().includes("pdf");
          const isExcel = link.label.toLowerCase().includes("excel");
          const color = isPdf ? "#4f46e5" : isExcel ? "#2563eb" : "#7c3aed";
          const hover = isPdf ? "#4338ca" : isExcel ? "#1d4ed8" : "#6d28d9";
          return (
            <Tooltip key={`${group.key}-${link.label}`} title={link.href ? link.label : `${link.label} unavailable`}>
              <span>
                <Button
                  size="small"
                  variant="contained"
                  disabled={!link.href}
                  startIcon={getFileActionIcon(link.label)}
                  sx={{
                    ...actionButtonSx,
                    bgcolor: color,
                    color: "#fff",
                    "&:hover": { bgcolor: hover, boxShadow: `0 8px 18px ${color}33` },
                    "&.Mui-disabled": {
                      bgcolor: "#e5e7eb",
                      color: "#94a3b8",
                    },
                  }}
                  {...(link.href
                    ? {
                        href: link.href,
                        target: "_blank",
                        rel: "noopener noreferrer",
                      }
                    : {})}
                >
                  {link.label}
                </Button>
              </span>
            </Tooltip>
          );
        })}

        <Tooltip title={archiveTooltip}>
          <span>
            <Button
              size="small"
              variant="outlined"
              disabled={actionBusyId === group.key}
              startIcon={archiveMode === "archived" ? <RestoreRoundedIcon /> : <ArchiveRoundedIcon />}
              sx={{
                ...actionButtonSx,
                borderColor: archiveMode === "archived" ? "#16a34a" : "#f59e0b",
                color: archiveMode === "archived" ? "#15803d" : "#b45309",
                bgcolor: archiveMode === "archived" ? "#f0fdf4" : "#fffbeb",
                "&:hover": {
                  borderColor: archiveMode === "archived" ? "#15803d" : "#d97706",
                  bgcolor: archiveMode === "archived" ? "#dcfce7" : "#fef3c7",
                },
              }}
              onClick={() => void setReportArchived(group.key, archiveMode !== "archived")}
            >
              {archiveLabel}
            </Button>
          </span>
        </Tooltip>

        <Tooltip title="Delete report">
          <span>
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<DeleteOutlineRoundedIcon />}
              sx={{
                ...actionButtonSx,
                borderColor: "#f87171",
                color: "#dc2626",
                bgcolor: "#fff7f7",
                "&:hover": {
                  borderColor: "#ef4444",
                  bgcolor: "#fee2e2",
                },
              }}
              onClick={() => openDelete(group.key)}
            >
              Delete
            </Button>
          </span>
        </Tooltip>
      </Stack>
    );
  }

  const columns: ColumnDef<ReportGroup>[] = [
      {
        id: "title",
        accessorKey: "title",
        header: "Report",
        cell: ({ row }) => (
          <Stack spacing={0.25} minWidth={0} sx={{ maxWidth: 240 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 700,
                lineHeight: 1.25,
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {row.original.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              Contract: {row.original.contract_no || "-"}
            </Typography>
          </Stack>
        ),
      },
      {
        id: "fairMarketValue",
        accessorFn: (row) => row.fairMarketValue || "",
        header: "FMV",
        cell: ({ row }) => (
          <Chip size="small" color="success" label={formatFMV(row.original.fairMarketValue)} sx={{ height: 24, fontWeight: 700, maxWidth: 110 }} />
        ),
      },
      {
        id: "reportType",
        accessorFn: (row) => getReportTypeLabel(row.reportType),
        header: "Type",
        cell: ({ row }) => (
          <Chip size="small" variant="outlined" color="secondary" label={getReportTypeLabel(row.original.reportType)} sx={{ height: 24 }} />
        ),
      },
      {
        id: "createdAt",
        accessorFn: (row) => new Date(row.createdAt).getTime(),
        header: "Created",
        cell: ({ row }) => (
          <Stack spacing={0.25} minWidth={0} sx={{ maxWidth: 190 }}>
            <Typography variant="body2" sx={{ lineHeight: 1.2 }}>
              {new Date(row.original.createdAt).toLocaleDateString()}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {row.original.userEmail || "-"}
            </Typography>
          </Stack>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        header: "Actions",
        cell: ({ row }) => renderReportActions(row.original),
      },
    ];

  const table = useReactTable({
    data: groups,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: totalPages,
    rowCount: data?.total ?? groups.length,
  });

  const rows = table.getRowModel().rows;

  return (
    <div className="admin-page-shell">
      <main className="max-w-6xl mx-auto space-y-6">
        {/* Hero Summary */}
        <section className="admin-glass-surface rounded-3xl p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
                {archiveMode === "archived" ? "Archived Reports" : "Approved Reports"}
              </h1>
              <p className="text-gray-600">
                Search, download, refresh, and complete approved reports.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="rounded-xl border border-rose-200 bg-white/70 px-4 py-2 shadow-sm">
                <div className="text-xs text-gray-600">{archiveMode === "archived" ? "Archived" : "Approved"}</div>
                <div className="text-lg font-semibold text-gray-900">
                  {data?.total ?? 0}
                </div>
              </div>
              <div className="rounded-xl border border-rose-200 bg-white/70 px-4 py-2 shadow-sm hidden sm:block">
                <div className="text-xs text-gray-600">Page</div>
                <div className="text-lg font-semibold text-gray-900">
                  {pagination.pageIndex + 1}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="admin-glass-surface rounded-3xl p-4 md:p-6">
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button
                  variant={archiveMode === "active" ? "contained" : "outlined"}
                  color="primary"
                  onClick={() => {
                    setArchiveMode("active");
                    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                  }}
                >
                  Active
                </Button>
                <Button
                  variant={archiveMode === "archived" ? "contained" : "outlined"}
                  color="secondary"
                  onClick={() => {
                    setArchiveMode("archived");
                    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                  }}
                >
                  Archived
                </Button>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="Search"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                }}
                placeholder="Filename or address"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select
                  value={reportType}
                  label="Type"
                  onChange={(e) => {
                    setReportType(e.target.value);
                    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="RealEstate">Real Estate</MenuItem>
                  <MenuItem value="Salvage">Salvage</MenuItem>
                  <MenuItem value="Asset">Asset</MenuItem>
                  <MenuItem value="LotListing">Lot Listing</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="From"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                }}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="To"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                }}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                fullWidth
                size="small"
                label="Created By"
                value={userEmail}
                onChange={(e) => {
                  setUserEmail(e.target.value);
                  setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                }}
                placeholder="user@example.com"
              />
            </Grid>
          </Grid>
          <Stack
            direction={{ xs: "column", xl: "row" }}
            spacing={1.5}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", xl: "center" }}
            sx={{ mt: 2 }}
          >
            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
              <Button variant="contained" onClick={() => load()}>Apply</Button>
              <Button variant="outlined" onClick={() => load()} disabled={loading}>
                {loading ? "Refreshing..." : "Refresh"}
              </Button>
              <Button variant="outlined" color="secondary" onClick={onReset}>Reset</Button>
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} alignItems={{ xs: "stretch", sm: "center" }}>
              <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 150 } }}>
                <InputLabel>Rows</InputLabel>
                <Select
                  value={pageSizeMode}
                  label="Rows"
                  onChange={(e) => {
                    const value = e.target.value as "20" | "50" | "100" | "all" | "custom";
                    if (value === "20" || value === "50" || value === "100") {
                      applyPageSize(Number(value), value);
                      return;
                    }
                    if (value === "all") {
                      applyPageSize(ALL_PAGE_SIZE, "all");
                      return;
                    }
                    setPageSizeMode("custom");
                    commitCustomPageSize();
                  }}
                >
                  <MenuItem value="20">20</MenuItem>
                  <MenuItem value="50">50</MenuItem>
                  <MenuItem value="100">100</MenuItem>
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="custom">Custom</MenuItem>
                </Select>
              </FormControl>

              {pageSizeMode === "custom" ? (
                <TextField
                  size="small"
                  label="Custom rows"
                  value={customPageSizeInput}
                  onChange={(e) => setCustomPageSizeInput(e.target.value)}
                  onBlur={commitCustomPageSize}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      commitCustomPageSize();
                    }
                  }}
                  inputProps={{ inputMode: "numeric", min: 1 }}
                  sx={{ width: { xs: "100%", sm: 132 } }}
                />
              ) : null}

              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Button variant="outlined" color="secondary" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                  Prev
                </Button>
                <Typography variant="body2" sx={{ minWidth: 112, textAlign: "center" }}>
                  Page {pagination.pageIndex + 1} of {table.getPageCount()}
                </Typography>
                <Button variant="outlined" color="secondary" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                  Next
                </Button>
              </Stack>
            </Stack>
          </Stack>
        </section>

        {/* List */}
        <section className="admin-glass-surface rounded-3xl p-4 md:p-6">
          {loading ? (
            <Typography color="text.secondary">Loading...</Typography>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            <>
              {/* Table on md+ */}
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="h6" fontWeight={700}>{archiveMode === "archived" ? "Archived Reports" : "Approved Reports"}</Typography>
                <Chip size="small" color="secondary" variant="outlined" label={`${rows.length} visible`} />
              </Stack>
              <TableContainer sx={{ display: { xs: "none", md: "block" } }}>
                <Table
                  size="small"
                  sx={{
                    tableLayout: "fixed",
                    width: "100%",
                    "& .MuiTableCell-root": {
                      px: 1.5,
                      py: 1.25,
                      fontSize: "0.8rem",
                      verticalAlign: "middle",
                    },
                  }}
                >
                  <TableHead>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableCell
                            key={header.id}
                            align="left"
                            sx={{
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                              width:
                                header.column.id === "title"
                                  ? "22%"
                                  : header.column.id === "fairMarketValue"
                                  ? "9%"
                                  : header.column.id === "reportType"
                                  ? "9%"
                                  : header.column.id === "createdAt"
                                  ? "14%"
                                  : header.column.id === "actions"
                                  ? "46%"
                                  : "auto",
                            }}
                          >
                            {header.isPlaceholder ? null : header.column.getCanSort() ? (
                              <TableSortLabel
                                active={!!header.column.getIsSorted()}
                                direction={header.column.getIsSorted() === "desc" ? "desc" : "asc"}
                                onClick={header.column.getToggleSortingHandler()}
                              >
                                {flexRender(header.column.columnDef.header, header.getContext())}
                              </TableSortLabel>
                            ) : (
                              flexRender(header.column.columnDef.header, header.getContext())
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableHead>
                  <TableBody>
                    {rows.length ? (
                      rows.map((row) => (
                        <TableRow key={row.id} hover>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell
                              key={cell.id}
                              align="left"
                              sx={{
                                overflow: cell.column.id === "actions" ? "visible" : "hidden",
                              }}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length}>
                          <Typography color="text.secondary">No {archiveMode === "archived" ? "archived" : "approved"} reports match the current filters.</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Cards on mobile */}
              <Stack spacing={2} sx={{ display: { xs: "flex", md: "none" } }}>
                {rows.length ? (
                  rows.map((row) => {
                    const g = row.original;
                    return (
                      <Card key={g.key} variant="outlined">
                        <CardContent>
                          <Stack spacing={1.5}>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
                              <Stack spacing={0.5} minWidth={0}>
                                <Typography variant="subtitle2" sx={{ wordBreak: "break-word" }}>{g.title}</Typography>
                                <Typography variant="body2" color="text.secondary">Contract: {g.contract_no || "-"}</Typography>
                              </Stack>
                              <Chip size="small" variant="outlined" color="secondary" label={getReportTypeLabel(g.reportType)} />
                            </Stack>
                            <Grid container spacing={1.5}>
                              <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" color="text.secondary">FMV</Typography>
                                <Stack sx={{ mt: 0.5 }}>
                                  <Chip size="small" color="success" label={formatFMV(g.fairMarketValue)} sx={{ alignSelf: "flex-start" }} />
                                </Stack>
                              </Grid>
                              <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" color="text.secondary">Created</Typography>
                                <Typography variant="body2">{new Date(g.createdAt).toLocaleString()}</Typography>
                              </Grid>
                              <Grid size={{ xs: 12 }}>
                                <Typography variant="caption" color="text.secondary">Created By</Typography>
                                <Typography variant="body2">{g.userEmail || "-"}</Typography>
                              </Grid>
                            </Grid>
                            {renderReportActions(g)}
                          </Stack>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <Card variant="outlined">
                    <CardContent>
                      <Typography color="text.secondary">No {archiveMode === "archived" ? "archived" : "approved"} reports match the current filters.</Typography>
                    </CardContent>
                  </Card>
                )}
              </Stack>

              {/* Pagination */}
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} sx={{ mt: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  {data ? (
                    <>
                      Showing {rows.length} of {data.total} {archiveMode === "archived" ? "archived" : "approved"} reports
                    </>
                  ) : null}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button variant="outlined" color="secondary" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                    Prev
                  </Button>
                  <Typography variant="body2" sx={{ minWidth: 100, textAlign: "center" }}>
                    Page {pagination.pageIndex + 1} of {table.getPageCount()}
                  </Typography>
                  <Button variant="outlined" color="secondary" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                    Next
                  </Button>
                </Stack>
              </Stack>
            </>
          )}
        </section>
      </main>
      <ConfirmModal
        open={confirmOpen}
        title="Delete this report?"
        description={
          <>
            This action cannot be undone. The report file (if present) and its
            record will be permanently removed.
          </>
        }
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => {
          setConfirmOpen(false);
          setPendingDeleteId(null);
        }}
        loading={deleting}
      />
      <ReportPreviewModal
        open={previewOpen}
        loading={previewLoading}
        error={previewError}
        preview={previewData}
        savingAssetSheet={previewSaving}
        assetSheetSaveError={previewSaveError}
        assetSheetSaveSuccess={previewSaveSuccess}
        onSaveAssetSheet={saveAssetScheduleSheet}
        onClose={() => {
          setPreviewOpen(false);
          setPreviewLoading(false);
          setPreviewError(null);
          setPreviewData(null);
          setPreviewTargetId(null);
          setPreviewSaving(false);
          setPreviewSaveError(null);
          setPreviewSaveSuccess(null);
        }}
      />
    </div>
  );
}
