"use client";

import {
  Activity,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileCheck2,
  Gavel,
  RefreshCcw,
  Search,
  Settings2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArcElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip as ChartTooltip,
} from "chart.js";
import { Doughnut, Line } from "react-chartjs-2";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, ChartTooltip, Legend);

type PersonRef = { username?: string; companyName?: string; email?: string };
type DashboardMetric = { value: number; percent?: number };
type DashboardRecentReport = {
  _id: string;
  title: string;
  contractNo?: string;
  type: string;
  lotCount: number;
  lotNumberSummary?: string;
  thumbnailUrl?: string | null;
  owner?: PersonRef | string;
  createdAt: string;
  status?: string;
  releaseStatus?: string;
};
type DesktopDashboard = {
  range: { from: string; to: string };
  kpis: {
    reports: DashboardMetric;
    lotListings: DashboardMetric;
    users: DashboardMetric;
    pending: number;
    released: number;
  };
  activity: Array<{ date: string; value: number }>;
  byType: Array<{ type: string; value: number }>;
  queue: { pendingReview: number; inReview: number; readyForRelease: number; releasedToday: number };
  recentReports: DashboardRecentReport[];
};
type WeeklyCredits = {
  weekStart?: string;
  weekEnd?: string;
  remainingCredits?: number;
  totalAvailableCredits?: number;
  rechargeAmount?: number;
  autoRechargeTotal?: number;
  autoRenewEnabled?: boolean;
  requestCount?: number;
  webSearchCount?: number;
  thresholdCredits?: number;
  status?: string;
  syncedAt?: string;
  recharges?: Array<{ id?: string; createdAt: string; amountCredits: number; balanceBefore: number; balanceAfter: number }>;
};
type SettingState = { enabled: boolean } | null;
type ThresholdState = { threshold: number; defaultThreshold: number } | null;

const TYPE_COLORS: Record<string, string> = {
  Asset: "#df111b",
  LotListing: "#171817",
  RealEstate: "#777a7d",
  Salvage: "#c8c9ca",
};

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);
const number = (value: unknown) => Number(value || 0).toLocaleString();
const money = (value: unknown) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const formatDate = (value?: string) => {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "--" : date.toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" });
};
const ownerLabel = (owner: DashboardRecentReport["owner"]) => {
  if (!owner || typeof owner === "string") return owner || "-";
  return owner.username || owner.companyName || owner.email || "-";
};

function Delta({ value }: { value?: number }) {
  if (typeof value !== "number") return null;
  return <span style={{ color: value >= 0 ? "#087f5b" : "#b35b00" }}>{value >= 0 ? "+" : ""}{value.toFixed(1)}%</span>;
}

export default function DashboardShellV2() {
  const router = useRouter();
  const [from, setFrom] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 29);
    return toIsoDate(date);
  });
  const [to, setTo] = useState(() => toIsoDate(new Date()));
  const [data, setData] = useState<DesktopDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateDialogOpen, setDateDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rechargesOpen, setRechargesOpen] = useState(false);
  const [weeklyCredits, setWeeklyCredits] = useState<WeeklyCredits | null>(null);
  const [weeklyCreditsLoading, setWeeklyCreditsLoading] = useState(true);
  const [specWebSearch, setSpecWebSearch] = useState<SettingState>(null);
  const [specSaving, setSpecSaving] = useState(false);
  const [threshold, setThreshold] = useState<ThresholdState>(null);
  const [thresholdInput, setThresholdInput] = useState("");
  const [thresholdSaving, setThresholdSaving] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/admin/stats/desktop-dashboard?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || "Failed to load dashboard");
      setData(payload);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  const loadWeeklyCredits = useCallback(async (sync = false) => {
    try {
      setWeeklyCreditsLoading(true);
      const response = await fetch(sync ? "/api/admin/openai-weekly-credits/sync" : "/api/admin/openai-weekly-credits", { method: sync ? "POST" : "GET", cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) setWeeklyCredits(payload?.data || payload || null);
    } finally {
      setWeeklyCreditsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    void loadWeeklyCredits();
    void (async () => {
      const [searchResponse, thresholdResponse] = await Promise.all([
        fetch("/api/admin/spec-web-search", { cache: "no-store" }),
        fetch("/api/admin/asset-approval-threshold", { cache: "no-store" }),
      ]);
      const [searchPayload, thresholdPayload] = await Promise.all([
        searchResponse.json().catch(() => ({})),
        thresholdResponse.json().catch(() => ({})),
      ]);
      if (searchResponse.ok) setSpecWebSearch({ enabled: searchPayload?.enabled === true });
      if (thresholdResponse.ok) {
        const nextThreshold = Number(thresholdPayload?.threshold ?? thresholdPayload?.defaultThreshold ?? 500000);
        const nextDefault = Number(thresholdPayload?.defaultThreshold ?? 500000);
        setThreshold({ threshold: nextThreshold, defaultThreshold: nextDefault });
        setThresholdInput(String(nextThreshold));
      }
    })();
  }, [loadWeeklyCredits]);

  async function toggleSpecSearch() {
    const enabled = !(specWebSearch?.enabled === true);
    try {
      setSpecSaving(true);
      const response = await fetch("/api/admin/spec-web-search", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }) });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) setSpecWebSearch({ enabled: payload?.enabled === true });
    } finally {
      setSpecSaving(false);
    }
  }

  async function saveThreshold() {
    const value = Number.parseFloat(thresholdInput.replace(/,/g, ""));
    if (!Number.isFinite(value) || value < 0) return;
    try {
      setThresholdSaving(true);
      const response = await fetch("/api/admin/asset-approval-threshold", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ threshold: value }) });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) setThreshold({ threshold: Number(payload?.threshold ?? value), defaultThreshold: Number(payload?.defaultThreshold ?? threshold?.defaultThreshold ?? 500000) });
    } finally {
      setThresholdSaving(false);
    }
  }

  const activityLabels = data?.activity.map((point) => formatDate(point.date).replace(/, \d{4}$/, "")) || [];
  const activityValues = data?.activity.map((point) => point.value) || [];
  const typeValues = useMemo(() => {
    const map = new Map((data?.byType || []).map((item) => [item.type, item.value]));
    return ["Asset", "LotListing", "RealEstate", "Salvage"].map((type) => map.get(type) || 0);
  }, [data?.byType]);
  const creditTotal = Math.max(weeklyCredits?.totalAvailableCredits || weeklyCredits?.rechargeAmount || 1, 1);
  const creditPercent = Math.max(0, Math.min(100, ((weeklyCredits?.remainingCredits || 0) / creditTotal) * 100));

  const kpis = [
    { label: "Reports", value: number(data?.kpis.reports.value), delta: data?.kpis.reports.percent, note: "vs previous period", icon: FileCheck2 },
    { label: "Lot Listings", value: number(data?.kpis.lotListings.value), delta: data?.kpis.lotListings.percent, note: "vs previous period", icon: Gavel },
    { label: "Users", value: number(data?.kpis.users.value), note: "active directory", icon: Users },
    { label: "Pending / Released", value: `${number(data?.kpis.pending)} / ${number(data?.kpis.released)}`, note: "current workflow", icon: Clock3 },
  ];
  const queueItems: Array<{ label: string; value: number; icon: LucideIcon }> = [
    { label: "Pending Review", value: data?.queue.pendingReview || 0, icon: Clock3 },
    { label: "In Review", value: data?.queue.inReview || 0, icon: Search },
    { label: "Ready for Release", value: data?.queue.readyForRelease || 0, icon: CheckCircle2 },
    { label: "Released Today", value: data?.queue.releasedToday || 0, icon: Activity },
  ];

  return (
    <Box className="desktop-admin-page" sx={{ p: { xs: 2, lg: 3.5 } }}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "flex-start" }} spacing={2} sx={{ mb: 3 }}>
        <Box>
          <h1 className="desktop-page-title">Dashboard</h1>
          <p className="desktop-page-subtitle">Overview of report operations and system activity.</p>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button variant="outlined" startIcon={<CalendarDays size={17} />} onClick={() => setDateDialogOpen(true)}>
            {formatDate(from)} - {formatDate(to)}
          </Button>
          <Button variant="outlined" startIcon={<RefreshCcw size={17} />} disabled={loading} onClick={() => void loadDashboard()}>
            Refresh
          </Button>
          <IconButton aria-label="Operations settings" onClick={() => setSettingsOpen(true)} sx={{ width: 36, height: 36, border: "1px solid", borderColor: "divider", borderRadius: "4px" }}>
            <Settings2 size={17} />
          </IconButton>
        </Stack>
      </Stack>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0,1fr))", xl: "repeat(4, minmax(0,1fr))" }, gap: 1.5, mb: 1.5 }}>
        {kpis.map(({ label, value, delta, note, icon: Icon }) => (
          <Box key={label} className="desktop-flat-panel" sx={{ display: "flex", minHeight: 148, alignItems: "center", gap: 2, p: 2.5 }}>
            <Box sx={{ display: "grid", width: 48, height: 48, flexShrink: 0, placeItems: "center", border: "1px solid", borderColor: "divider", bgcolor: "action.hover" }}>
              <Icon size={25} strokeWidth={2} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ color: "text.secondary", fontSize: 14, fontWeight: 500 }}>{label}</Typography>
              <Typography sx={{ mt: 0.25, fontSize: 28, fontWeight: 650, lineHeight: 1.05, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
                {loading && !data ? "..." : value}
              </Typography>
              <Typography component="div" sx={{ mt: 1, color: "text.secondary", fontSize: 12 }}>
                <Delta value={delta} />{typeof delta === "number" ? "  " : ""}{note}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "minmax(0,7fr) minmax(280px,4fr) minmax(220px,2fr)" }, gap: 1.5, alignItems: "stretch" }}>
        <Box className="desktop-flat-panel" sx={{ minHeight: 430, p: 2.5 }}>
          <Typography sx={{ fontSize: 17, fontWeight: 600 }}>Report Activity</Typography>
          <Typography sx={{ mt: 0.5, mb: 2, color: "text.secondary", fontSize: 14 }}>Reports created per day</Typography>
          <Box sx={{ height: 330 }}>
            <Line
              data={{ labels: activityLabels, datasets: [{ data: activityValues, borderColor: "#c8232c", backgroundColor: "#c8232c", pointBackgroundColor: "#fff", pointBorderColor: "#c8232c", pointBorderWidth: 2, pointRadius: 3, tension: 0.2, borderWidth: 2 }] }}
              options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 8, color: "#62666c" } }, y: { beginAtZero: true, grid: { color: "#dedfe1" }, ticks: { color: "#62666c", precision: 0 } } } }}
            />
          </Box>
        </Box>

        <Box className="desktop-flat-panel" sx={{ minHeight: 430, p: 2.5 }}>
          <Typography sx={{ fontSize: 17, fontWeight: 600 }}>Reports by Type</Typography>
          <Typography sx={{ mt: 0.5, color: "text.secondary", fontSize: 14 }}>Share of reports in the selected period</Typography>
          <Box sx={{ display: "grid", minHeight: 335, gridTemplateColumns: { xs: "1fr", sm: "minmax(150px,1fr) 145px", xl: "1fr" }, alignItems: "center", gap: 2 }}>
            <Box sx={{ mx: "auto", width: "min(220px, 100%)", height: 220 }}>
              <Doughnut
                data={{ labels: ["Asset", "Lot Listing", "Real Estate", "Salvage"], datasets: [{ data: typeValues, backgroundColor: [TYPE_COLORS.Asset, TYPE_COLORS.LotListing, TYPE_COLORS.RealEstate, TYPE_COLORS.Salvage], borderWidth: 0 }] }}
                options={{ responsive: true, maintainAspectRatio: false, cutout: "64%", plugins: { legend: { display: false } } }}
              />
            </Box>
            <Stack spacing={1.2} sx={{ minWidth: 140 }}>
              {["Asset", "LotListing", "RealEstate", "Salvage"].map((type, index) => (
                <Stack key={type} direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ width: 10, height: 10, bgcolor: TYPE_COLORS[type] }} />
                  <Typography sx={{ flex: 1, fontSize: 12 }}>{type === "LotListing" ? "Lot Listing" : type === "RealEstate" ? "RealEstate" : type}</Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 650 }}>{number(typeValues[index])}</Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
        </Box>

        <Stack spacing={1.5}>
          <Box className="desktop-flat-panel" sx={{ overflow: "hidden" }}>
            <Box sx={{ p: 2 }}><Typography sx={{ fontSize: 16, fontWeight: 600 }}>Processing / Release Queue</Typography></Box>
            {queueItems.map(({ label, value, icon: Icon }) => (
              <Button key={label} fullWidth onClick={() => router.push("/reports")} endIcon={<ChevronRight size={15} />} sx={{ minHeight: 44, justifyContent: "flex-start", borderTop: "1px solid", borderColor: "divider", borderRadius: 0, color: "text.primary", px: 2, fontSize: 12 }}>
                <Icon size={15} style={{ marginRight: 10 }} /><span style={{ flex: 1, textAlign: "left" }}>{label}</span><strong>{number(value)}</strong>
              </Button>
            ))}
            <Button fullWidth onClick={() => router.push("/reports")} sx={{ minHeight: 38, justifyContent: "flex-start", borderTop: "1px solid", borderColor: "divider", borderRadius: 0, color: "primary.main", fontSize: 12, px: 2 }}>View full queue</Button>
          </Box>

          <Box className="desktop-flat-panel" sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" spacing={1}>
              <Box>
                <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Weekly Credits</Typography>
                <Typography sx={{ mt: 0.25, color: "text.secondary", fontSize: 11 }}>{formatDate(weeklyCredits?.weekStart)} - {formatDate(weeklyCredits?.weekEnd)}</Typography>
              </Box>
              <IconButton aria-label="Refresh credits" size="small" disabled={weeklyCreditsLoading} onClick={() => void loadWeeklyCredits(true)} sx={{ border: "1px solid", borderColor: "divider", borderRadius: "3px" }}><RefreshCcw size={15} /></IconButton>
            </Stack>
            <Typography sx={{ mt: 2, color: "text.secondary", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Remaining</Typography>
            <Typography sx={{ mt: 0.25, fontSize: 26, fontWeight: 650, lineHeight: 1 }}>{weeklyCreditsLoading && !weeklyCredits ? "..." : money(weeklyCredits?.remainingCredits)}</Typography>
            <Typography sx={{ mt: 1.5, color: "text.secondary", fontSize: 11 }}>{number(weeklyCredits?.requestCount)} requests</Typography>
            <Typography sx={{ color: "text.secondary", fontSize: 11 }}>{number(weeklyCredits?.webSearchCount)} web searches</Typography>
            <Typography sx={{ color: "text.secondary", fontSize: 11 }}>
              {weeklyCredits?.autoRenewEnabled === false
                ? "Renewal off · 0 credits added"
                : `${number(weeklyCredits?.autoRechargeTotal)} credits renewed this week`}
            </Typography>
            <LinearProgress variant="determinate" value={creditPercent} sx={{ mt: 1.5, height: 5, bgcolor: "#ececed", "& .MuiLinearProgress-bar": { bgcolor: "#df111b" } }} />
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.5 }}>
              <Chip size="small" label={weeklyCredits?.status === "synced" ? "Synced" : "Unavailable"} sx={{ height: 22, bgcolor: "#eef0f1", fontSize: 10 }} />
              <Button size="small" onClick={() => setRechargesOpen(true)} sx={{ minHeight: 28, px: 0, color: "text.primary", fontSize: 10 }}>Recharge history</Button>
            </Stack>
          </Box>
        </Stack>
      </Box>

      <Box className="desktop-flat-panel" sx={{ mt: 1.5, overflow: "hidden" }}>
        <Box sx={{ px: 2.5, py: 2 }}><Typography sx={{ fontSize: 17, fontWeight: 600 }}>Recent Reports</Typography></Box>
        <Box sx={{ overflowX: "auto" }}>
          <Box component="table" sx={{ width: "100%", minWidth: 860, borderCollapse: "collapse", "& th": { px: 2, py: 1.25, borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider", textAlign: "left", fontSize: 11, fontWeight: 650 }, "& td": { px: 2, py: 1.2, borderBottom: "1px solid", borderColor: "divider", fontSize: 12 } }}>
            <Box component="thead"><Box component="tr"><Box component="th">Report</Box><Box component="th">Type</Box><Box component="th">Lot / Asset</Box><Box component="th">Created</Box><Box component="th">Status</Box><Box component="th">Action</Box></Box></Box>
            <Box component="tbody">
              {(data?.recentReports || []).map((report) => (
                <Box component="tr" key={report._id}>
                  <Box component="td"><Stack direction="row" spacing={1.25} alignItems="center">{report.thumbnailUrl ? <Box component="img" src={report.thumbnailUrl} alt="" sx={{ width: 52, height: 44, objectFit: "cover", border: "1px solid", borderColor: "divider" }} /> : null}<Box><Typography sx={{ fontSize: 12, fontWeight: 650 }}>{report.title}</Typography><Typography sx={{ color: "text.secondary", fontSize: 11 }}>{report.contractNo || report._id.slice(-6)}</Typography></Box></Stack></Box>
                  <Box component="td">{report.type === "LotListing" ? "Lot Listing" : report.type}</Box>
                  <Box component="td">{report.lotNumberSummary || `${number(report.lotCount)} lot${report.lotCount === 1 ? "" : "s"}`}</Box>
                  <Box component="td"><Typography sx={{ fontSize: 12 }}>{formatDate(report.createdAt)}</Typography><Typography sx={{ color: "text.secondary", fontSize: 11 }}>{ownerLabel(report.owner)}</Typography></Box>
                  <Box component="td"><Chip size="small" label={report.releaseStatus === "released" || report.status === "released" ? "Released" : report.status || "Approved"} sx={{ height: 22, bgcolor: "#e9f7f2", color: "#087f5b", fontSize: 10 }} /></Box>
                  <Box component="td"><IconButton aria-label="Open report" size="small" onClick={() => router.push(`/reports?search=${encodeURIComponent(report.contractNo || report.title)}`)} sx={{ border: "1px solid", borderColor: "divider", borderRadius: "3px" }}><ChevronRight size={15} /></IconButton></Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>

      <Dialog open={dateDialogOpen} onClose={() => setDateDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Date range</DialogTitle>
        <DialogContent sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, pt: "12px !important" }}>
          <TextField type="date" label="From" value={from} onChange={(event) => setFrom(event.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField type="date" label="To" value={to} onChange={(event) => setTo(event.target.value)} InputLabelProps={{ shrink: true }} />
        </DialogContent>
        <DialogActions><Button onClick={() => setDateDialogOpen(false)}>Cancel</Button><Button variant="contained" onClick={() => { setDateDialogOpen(false); void loadDashboard(); }}>Apply</Button></DialogActions>
      </Dialog>

      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Operations settings</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
              <Box><Typography sx={{ fontWeight: 650 }}>Spec web search</Typography><Typography sx={{ color: "text.secondary", fontSize: 12 }}>Off uses uploaded images and provided data only.</Typography></Box>
              <Switch checked={specWebSearch?.enabled === true} onChange={() => void toggleSpecSearch()} disabled={specSaving} color="success" />
            </Stack>
            <Divider />
            <Box>
              <Typography sx={{ fontWeight: 650 }}>Asset approval limit</Typography>
              <Typography sx={{ mb: 1.5, color: "text.secondary", fontSize: 12 }}>Asset reports above this value require manager approval.</Typography>
              <Stack direction="row" spacing={1}><TextField fullWidth size="small" value={thresholdInput} onChange={(event) => setThresholdInput(event.target.value)} inputProps={{ inputMode: "decimal" }} /><Button variant="contained" onClick={() => void saveThreshold()} disabled={thresholdSaving}>Save</Button></Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions><Button variant="contained" onClick={() => setSettingsOpen(false)}>Close</Button></DialogActions>
      </Dialog>

      <Dialog open={rechargesOpen} onClose={() => setRechargesOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Weekly recharge history</DialogTitle>
        <DialogContent dividers>
          {weeklyCredits?.autoRenewEnabled === false ? (
            <Typography sx={{ color: "text.secondary" }}>
              Automatic renewal is off. No credits were added this week.
            </Typography>
          ) : weeklyCredits?.recharges?.length ? (
            weeklyCredits.recharges.map((recharge, index) => (
              <Stack key={recharge.id || `${recharge.createdAt}-${index}`} direction="row" justifyContent="space-between" sx={{ py: 1.25, borderBottom: "1px solid", borderColor: "divider" }}>
                <Box><Typography sx={{ fontSize: 13, fontWeight: 600 }}>Recharge {index + 1}</Typography><Typography sx={{ color: "text.secondary", fontSize: 11 }}>{new Date(recharge.createdAt).toLocaleString()}</Typography></Box>
                <Box sx={{ textAlign: "right" }}><Typography sx={{ color: "success.main", fontSize: 13, fontWeight: 650 }}>+{money(recharge.amountCredits)}</Typography><Typography sx={{ color: "text.secondary", fontSize: 11 }}>{money(recharge.balanceBefore)} → {money(recharge.balanceAfter)}</Typography></Box>
              </Stack>
            ))
          ) : (
            <Typography sx={{ color: "text.secondary" }}>No automatic recharges have been added this week.</Typography>
          )}
        </DialogContent>
        <DialogActions><Button variant="contained" onClick={() => setRechargesOpen(false)}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
