"use client";

import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import WarehouseRoundedIcon from "@mui/icons-material/WarehouseRounded";
import {
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  LinearProgress,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import MonthlyCharts from "@/app/components/dashboard/MonthlyCharts";

type MeState = {
  email?: string;
  username?: string;
  role?: string;
} | null;

type StatsState = {
  totalUsers: number;
  totalAdmins: number;
  totalReports: number;
  byType: { Asset: number; LotListing: number; RealEstate: number; Salvage: number };
} | null;

type SpecWebSearchState = {
  enabled: boolean;
  message?: string;
} | null;

type AssetApprovalThresholdState = {
  threshold: number;
  defaultThreshold: number;
  message?: string;
} | null;

type WeeklyCreditRecharge = {
  id: string;
  source: "initial_balance" | "auto_recharge";
  ordinal: number;
  amountCredits: number;
  thresholdCredits: number;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
};

type WeeklyCreditsState = {
  weekStart: string;
  weekEnd: string;
  openAIUsageUsd: number;
  deductionMultiplier: number;
  deductedCredits: number;
  addedCredits: number;
  remainingCredits: number;
  thresholdCredits: number;
  rechargeAmount: number;
  rechargeTotal: number;
  usageSourceAvailable: boolean;
  status: "synced" | "unavailable" | "error";
  warnings: string[];
  syncedAt: string;
  recharges: WeeklyCreditRecharge[];
} | null;

type MetricCard = {
  key: string;
  label: string;
  value: number;
  icon: ReactNode;
  color: string;
  iconBg: string;
  progress: number;
};

const statCards: Array<{
  key: "totalUsers" | "totalAdmins" | "totalReports";
  label: string;
  icon: ReactNode;
  color: string;
  iconBg: string;
}> = [
  { key: "totalUsers", label: "Users", icon: <GroupRoundedIcon />, color: "#2563eb", iconBg: "#dbeafe" },
  { key: "totalAdmins", label: "Admins", icon: <ManageAccountsRoundedIcon />, color: "#6d28d9", iconBg: "#ede9fe" },
  { key: "totalReports", label: "Total Reports", icon: <AssessmentRoundedIcon />, color: "#f59e0b", iconBg: "#ffedd5" },
];

const reportCards: Array<{
  key: "Asset" | "LotListing" | "RealEstate" | "Salvage";
  label: string;
  icon: ReactNode;
  color: string;
  iconBg: string;
}> = [
  { key: "Asset", label: "Asset Reports", icon: <WarehouseRoundedIcon />, color: "#2563eb", iconBg: "#dbeafe" },
  { key: "LotListing", label: "Lot Listing Reports", icon: <AssessmentRoundedIcon />, color: "#7c3aed", iconBg: "#ede9fe" },
  { key: "RealEstate", label: "Real Estate Reports", icon: <DashboardRoundedIcon />, color: "#16a34a", iconBg: "#dcfce7" },
  { key: "Salvage", label: "Salvage Reports", icon: <CheckCircleRoundedIcon />, color: "#f59e0b", iconBg: "#ffedd5" },
];

const numberFormatter = new Intl.NumberFormat("en-US");
const moneyFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

function formatMoney(value: number | null | undefined, fallback = "--") {
  return typeof value === "number" ? moneyFormatter.format(value) : fallback;
}

function formatDashboardDate(value: Date) {
  const weekday = value.toLocaleDateString(undefined, { weekday: "short" });
  const dayMonth = value.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
  const time = value.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${weekday} ${dayMonth} - ${time}`;
}

function formatShortDateTime(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString([], {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatWeekRange(start?: string, end?: string) {
  if (!start || !end) return "Current week";
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return "Current week";
  }
  return `${startDate.toLocaleDateString([], { month: "short", day: "2-digit" })} - ${endDate.toLocaleDateString([], {
    month: "short",
    day: "2-digit",
  })}`;
}

function getNextMinuteDelay() {
  const now = new Date();
  return Math.max(1000, 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds()));
}

const surfaceSx = {
  height: "100%",
  overflow: "hidden",
  borderRadius: "12px",
  border: "1px solid",
  borderColor: (theme: any) =>
    theme.palette.mode === "dark" ? alpha("#93a9c8", 0.18) : alpha("#94a3b8", 0.28),
  background: (theme: any) =>
    theme.palette.mode === "dark"
      ? `linear-gradient(180deg, ${alpha("#132238", 0.96)}, ${alpha("#0b1728", 0.98)})`
      : "rgba(255,255,255,0.94)",
  boxShadow: (theme: any) =>
    theme.palette.mode === "dark"
      ? `0 18px 46px ${alpha("#020617", 0.46)}, inset 0 1px 0 ${alpha("#fff", 0.04)}`
      : `0 16px 38px ${alpha("#0f172a", 0.10)}, inset 0 1px 0 ${alpha("#fff", 0.95)}`,
  transform: "translateZ(0)",
};

const compactHoverSx = {
  transition: "transform 170ms ease, box-shadow 170ms ease, border-color 170ms ease",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: (theme: any) =>
      theme.palette.mode === "dark"
        ? `0 22px 52px ${alpha("#020617", 0.58)}, inset 0 1px 0 ${alpha("#fff", 0.05)}`
        : `0 20px 46px ${alpha("#0f172a", 0.13)}, inset 0 1px 0 ${alpha("#fff", 1)}`,
  },
};

function metricProgress(value: number, stats: StatsState, key: string) {
  if (!value) return 0;
  if (key === "Asset" || key === "LotListing" || key === "RealEstate" || key === "Salvage") {
    const totalReports = stats?.totalReports || 1;
    return Math.min(100, Math.max(28, (value / totalReports) * 100));
  }
  const maxMetric = Math.max(stats?.totalUsers || 0, stats?.totalReports || 0, stats?.totalAdmins || 0, 1);
  return Math.min(88, Math.max(34, (value / maxMetric) * 88));
}

export default function DashboardShellV2() {
  const [now, setNow] = useState<Date>(() => new Date());
  const [me, setMe] = useState<MeState>(null);
  const [stats, setStats] = useState<StatsState>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [specWebSearch, setSpecWebSearch] = useState<SpecWebSearchState>(null);
  const [specWebSearchLoading, setSpecWebSearchLoading] = useState(true);
  const [specWebSearchSaving, setSpecWebSearchSaving] = useState(false);
  const [specWebSearchError, setSpecWebSearchError] = useState<string | null>(null);
  const [approvalThreshold, setApprovalThreshold] = useState<AssetApprovalThresholdState>(null);
  const [approvalThresholdInput, setApprovalThresholdInput] = useState("");
  const [approvalThresholdLoading, setApprovalThresholdLoading] = useState(true);
  const [approvalThresholdSaving, setApprovalThresholdSaving] = useState(false);
  const [approvalThresholdError, setApprovalThresholdError] = useState<string | null>(null);
  const [weeklyCredits, setWeeklyCredits] = useState<WeeklyCreditsState>(null);
  const [weeklyCreditsLoading, setWeeklyCreditsLoading] = useState(true);
  const [weeklyCreditsRefreshing, setWeeklyCreditsRefreshing] = useState(false);
  const [rechargesOpen, setRechargesOpen] = useState(false);

  useEffect(() => {
    let intervalId: number | undefined;
    const timeoutId = window.setTimeout(() => {
      setNow(new Date());
      intervalId = window.setInterval(() => setNow(new Date()), 60_000);
    }, getNextMinuteDelay());

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/me", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        setMe(data?.user || null);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setStatsLoading(true);
        const res = await fetch("/api/admin/stats", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (res.ok) setStats(data);
      } finally {
        setStatsLoading(false);
      }
    })();
  }, []);

  const loadSpecWebSearch = useCallback(async () => {
    try {
      setSpecWebSearchLoading(true);
      setSpecWebSearchError(null);
      const res = await fetch("/api/admin/spec-web-search", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as { enabled?: boolean; message?: string };
      if (!res.ok) {
        throw new Error(data.message || "Failed to load spec web search setting");
      }
      setSpecWebSearch({ enabled: data.enabled === true, message: data.message });
    } catch (e) {
      setSpecWebSearchError(e instanceof Error ? e.message : "Failed to load spec web search setting");
    } finally {
      setSpecWebSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSpecWebSearch();
  }, [loadSpecWebSearch]);

  const toggleSpecWebSearch = useCallback(async () => {
    const nextEnabled = !(specWebSearch?.enabled === true);
    try {
      setSpecWebSearchSaving(true);
      setSpecWebSearchError(null);
      const res = await fetch("/api/admin/spec-web-search", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextEnabled }),
      });
      const data = (await res.json().catch(() => ({}))) as { enabled?: boolean; message?: string };
      if (!res.ok) {
        throw new Error(data.message || "Failed to update spec web search setting");
      }
      setSpecWebSearch({ enabled: data.enabled === true, message: data.message });
    } catch (e) {
      setSpecWebSearchError(e instanceof Error ? e.message : "Failed to update spec web search setting");
    } finally {
      setSpecWebSearchSaving(false);
    }
  }, [specWebSearch?.enabled]);

  const loadApprovalThreshold = useCallback(async () => {
    try {
      setApprovalThresholdLoading(true);
      setApprovalThresholdError(null);
      const res = await fetch("/api/admin/asset-approval-threshold", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as {
        threshold?: number;
        defaultThreshold?: number;
        message?: string;
      };
      if (!res.ok) {
        throw new Error(data.message || "Failed to load asset approval threshold");
      }
      const threshold = Number(data.threshold);
      const defaultThreshold = Number(data.defaultThreshold || 500000);
      const next = {
        threshold: Number.isFinite(threshold) ? threshold : defaultThreshold,
        defaultThreshold: Number.isFinite(defaultThreshold) ? defaultThreshold : 500000,
        message: data.message,
      };
      setApprovalThreshold(next);
      setApprovalThresholdInput(String(next.threshold));
    } catch (e) {
      setApprovalThresholdError(e instanceof Error ? e.message : "Failed to load asset approval threshold");
    } finally {
      setApprovalThresholdLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApprovalThreshold();
  }, [loadApprovalThreshold]);

  const loadWeeklyCredits = useCallback(async (sync = false) => {
    try {
      if (sync) {
        setWeeklyCreditsRefreshing(true);
      } else {
        setWeeklyCreditsLoading(true);
      }
      const res = await fetch(
        sync ? "/api/admin/openai-weekly-credits/sync" : "/api/admin/openai-weekly-credits",
        {
          method: sync ? "POST" : "GET",
          cache: "no-store",
        }
      );
      const payload = (await res.json().catch(() => ({}))) as {
        data?: WeeklyCreditsState;
        message?: string;
      };
      if (!res.ok || !payload.data) {
        throw new Error(payload.message || "Failed to load weekly OpenAI credits");
      }
      setWeeklyCredits(payload.data);
    } catch (e) {
      console.error(e instanceof Error ? e.message : "Failed to load weekly OpenAI credits");
    } finally {
      setWeeklyCreditsLoading(false);
      setWeeklyCreditsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadWeeklyCredits();
  }, [loadWeeklyCredits]);

  const saveApprovalThreshold = useCallback(async () => {
    const threshold = Number.parseFloat(approvalThresholdInput.replace(/,/g, ""));
    if (!Number.isFinite(threshold) || threshold < 0) {
      setApprovalThresholdError("Enter a non-negative approval limit.");
      return;
    }

    try {
      setApprovalThresholdSaving(true);
      setApprovalThresholdError(null);
      const res = await fetch("/api/admin/asset-approval-threshold", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threshold }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        threshold?: number;
        defaultThreshold?: number;
        message?: string;
      };
      if (!res.ok) {
        throw new Error(data.message || "Failed to update asset approval threshold");
      }
      const savedThreshold = Number(data.threshold);
      const defaultThreshold = Number(data.defaultThreshold || approvalThreshold?.defaultThreshold || 500000);
      const next = {
        threshold: Number.isFinite(savedThreshold) ? savedThreshold : threshold,
        defaultThreshold: Number.isFinite(defaultThreshold) ? defaultThreshold : 500000,
        message: data.message,
      };
      setApprovalThreshold(next);
      setApprovalThresholdInput(String(next.threshold));
    } catch (e) {
      setApprovalThresholdError(e instanceof Error ? e.message : "Failed to update asset approval threshold");
    } finally {
      setApprovalThresholdSaving(false);
    }
  }, [approvalThreshold?.defaultThreshold, approvalThresholdInput]);

  const greeting = useMemo(() => {
    const hours = now.getHours();
    if (hours < 12) return "Good morning";
    if (hours < 18) return "Good afternoon";
    return "Good evening";
  }, [now]);

  const allMetricCards = useMemo<MetricCard[]>(() => {
    const base = [
      ...statCards.map((card) => ({
        key: card.key,
        label: card.label,
        value: stats?.[card.key] ?? 0,
        icon: card.icon,
        color: card.color,
        iconBg: card.iconBg,
      })),
      ...reportCards.map((card) => ({
        key: card.key,
        label: card.label,
        value: stats?.byType?.[card.key] ?? 0,
        icon: card.icon,
        color: card.color,
        iconBg: card.iconBg,
      })),
    ];

    return base.map((card) => ({
      ...card,
      progress: statsLoading ? 0 : metricProgress(card.value, stats, card.key),
    }));
  }, [stats, statsLoading]);

  return (
    <Box
      sx={{
        minHeight: "calc(100vh - 64px)",
        pb: { xs: 1.5, md: 2 },
        bgcolor: (theme) => (theme.palette.mode === "dark" ? "#07111f" : "#f3f6fb"),
      }}
    >
      <Container
        maxWidth={false}
        sx={{
          px: { xs: 1.25, md: 1.75 },
          py: { xs: 1.25, md: 1.75 },
          maxWidth: "1800px",
        }}
      >
        <Grid container spacing={1.5} alignItems="stretch">
          <Grid size={{ xs: 12, lg: 8 }}>
            <Card sx={{ ...surfaceSx, ...compactHoverSx }}>
              <CardContent sx={{ p: { xs: 2, md: 3 }, height: "100%" }}>
                <Stack spacing={2.25} sx={{ height: "100%" }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                    <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Typography
                        variant="overline"
                        sx={{
                          color: "#1458f5",
                          fontSize: { xs: 17, sm: 20 },
                          fontWeight: 950,
                          letterSpacing: "0.02em",
                          lineHeight: 1,
                        }}
                      >
                        OPERATIONS
                      </Typography>
                      {me?.role ? (
                        <Chip
                          size="small"
                          label={me.role}
                          variant="outlined"
                          sx={{
                            height: 28,
                            borderColor: alpha("#1458f5", 0.42),
                            color: "#1458f5",
                            fontWeight: 850,
                            bgcolor: (theme) => (theme.palette.mode === "dark" ? alpha("#1458f5", 0.12) : "#eff6ff"),
                          }}
                        />
                      ) : null}
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ color: "text.primary", flexShrink: 0 }}>
                      <CalendarMonthRoundedIcon sx={{ fontSize: 22 }} />
                      <Typography variant="body2" sx={{ fontWeight: 750 }} suppressHydrationWarning>
                        {formatDashboardDate(now)}
                      </Typography>
                    </Stack>
                  </Stack>

                  <Box>
                    <Typography
                      variant="h3"
                      sx={{
                        fontSize: { xs: 30, sm: 38, md: 42 },
                        lineHeight: 1.03,
                        fontWeight: 950,
                        color: "text.primary",
                      }}
                    >
                      {greeting}{me ? `, ${me.username || me.email}` : ""}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 760, fontWeight: 500 }}>
                    Reports, approvals, users, CRM and operational settings in one dense control surface.
                    </Typography>
                  </Box>

                  <Grid container spacing={1.25}>
                    {allMetricCards.map((card) => (
                      <Grid key={card.key} size={{ xs: 6, sm: 4 }}>
                        <Card
                          sx={{
                            height: "100%",
                            borderRadius: "10px",
                            border: "1px solid",
                            borderColor: (theme) =>
                              theme.palette.mode === "dark" ? alpha("#93a9c8", 0.14) : alpha("#94a3b8", 0.28),
                            bgcolor: (theme) =>
                              theme.palette.mode === "dark" ? alpha("#0f1b2d", 0.72) : alpha("#ffffff", 0.82),
                            boxShadow: (theme) =>
                              theme.palette.mode === "dark"
                                ? `0 12px 26px ${alpha("#020617", 0.32)}, inset 0 1px 0 ${alpha("#fff", 0.04)}`
                                : `0 10px 22px ${alpha("#0f172a", 0.08)}, inset 0 1px 0 ${alpha("#fff", 0.9)}`,
                          }}
                        >
                          <CardContent sx={{ p: { xs: 1.15, sm: 1.35 }, "&:last-child": { pb: { xs: 1.15, sm: 1.35 } } }}>
                            <Stack spacing={1}>
                              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={0.75}>
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }} noWrap>
                                    {card.label}
                                  </Typography>
                                  <Typography
                                    variant="h5"
                                    suppressHydrationWarning
                                    sx={{ mt: 0.25, fontWeight: 950, lineHeight: 1, fontSize: { xs: 22, sm: 25 } }}
                                  >
                                    {statsLoading ? "..." : numberFormatter.format(card.value)}
                                  </Typography>
                                </Box>
                                <Box
                                  sx={{
                                    width: { xs: 36, sm: 40 },
                                    height: { xs: 36, sm: 40 },
                                    borderRadius: "11px",
                                    display: "grid",
                                    placeItems: "center",
                                    bgcolor: (theme) => (theme.palette.mode === "dark" ? alpha(card.color, 0.18) : card.iconBg),
                                    color: card.color,
                                    flexShrink: 0,
                                    boxShadow: `inset 0 1px 0 ${alpha("#fff", 0.55)}`,
                                    "& svg": { fontSize: { xs: 24, sm: 26 } },
                                  }}
                                >
                                  {card.icon}
                                </Box>
                              </Stack>
                              <LinearProgress
                                variant="determinate"
                                value={card.progress}
                                sx={{
                                  height: 4,
                                  borderRadius: 999,
                                  bgcolor: alpha(card.color, 0.13),
                                  "& .MuiLinearProgress-bar": {
                                    borderRadius: 999,
                                    bgcolor: card.color,
                                  },
                                }}
                              />
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <Card sx={{ ...surfaceSx, ...compactHoverSx }}>
              <CardContent sx={{ p: { xs: 2, md: 2.25 }, height: "100%" }}>
                <Stack spacing={1.35} sx={{ height: "100%" }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 950, lineHeight: 1.08 }}>
                      Operations Settings
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: "block", fontWeight: 650 }}>
                      Controls for report generation behavior.
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      border: "1px solid",
                      borderColor: (theme) =>
                        theme.palette.mode === "dark" ? alpha("#16a34a", 0.2) : alpha("#16a34a", 0.22),
                      borderRadius: "10px",
                      p: { xs: 1, sm: 1.15 },
                      bgcolor: (theme) => (theme.palette.mode === "dark" ? alpha("#052e16", 0.18) : alpha("#f0fdf4", 0.72)),
                    }}
                  >
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                        <Stack direction="row" spacing={1} alignItems="center" minWidth={0}>
                          <Box
                            sx={{
                              width: 34,
                              height: 34,
                              borderRadius: "10px",
                              display: "grid",
                              placeItems: "center",
                              color: "#15803d",
                              bgcolor: alpha("#16a34a", 0.14),
                              flexShrink: 0,
                            }}
                          >
                            <PaidRoundedIcon sx={{ fontSize: 22 }} />
                          </Box>
                          <Box minWidth={0}>
                            <Typography variant="body1" sx={{ fontWeight: 950 }} noWrap>
                              Weekly OpenAI credits
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                              {formatWeekRange(weeklyCredits?.weekStart, weeklyCredits?.weekEnd)}
                            </Typography>
                          </Box>
                        </Stack>
                        <Stack direction="row" spacing={0.75} alignItems="center" flexShrink={0}>
                          <Chip
                            size="small"
                            label={weeklyCredits?.status === "synced" ? "Synced" : weeklyCredits?.status === "error" ? "Error" : "Unavailable"}
                            sx={{
                              height: 24,
                              bgcolor:
                                weeklyCredits?.status === "synced" ? alpha("#16a34a", 0.14) : alpha("#f59e0b", 0.14),
                              color: weeklyCredits?.status === "synced" ? "#15803d" : "#b45309",
                              fontWeight: 850,
                            }}
                          />
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => void loadWeeklyCredits(true)}
                            disabled={weeklyCreditsLoading || weeklyCreditsRefreshing}
                            sx={{
                              minWidth: 36,
                              height: 32,
                              px: 0.75,
                              borderRadius: "8px",
                            }}
                          >
                            <RefreshRoundedIcon sx={{ fontSize: 18 }} />
                          </Button>
                        </Stack>
                      </Stack>

                      <Stack direction="row" spacing={1.5} alignItems="flex-end" flexWrap="wrap" useFlexGap>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 750 }}>
                            Remaining
                          </Typography>
                          <Typography variant="h4" sx={{ fontWeight: 950, lineHeight: 1 }}>
                            {weeklyCreditsLoading ? "..." : formatMoney(weeklyCredits?.remainingCredits, "0")}
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => setRechargesOpen(true)}
                          sx={{ ml: "auto", fontWeight: 900, borderRadius: "8px" }}
                        >
                          +{formatMoney(weeklyCredits?.rechargeTotal, "0")} this week
                        </Button>
                      </Stack>

                      <LinearProgress
                        variant="determinate"
                        value={
                          weeklyCredits
                            ? Math.max(0, Math.min(100, (weeklyCredits.remainingCredits / Math.max(weeklyCredits.rechargeAmount, 1)) * 100))
                            : 0
                        }
                        sx={{
                          height: 5,
                          borderRadius: 999,
                          bgcolor: alpha("#16a34a", 0.12),
                          "& .MuiLinearProgress-bar": { borderRadius: 999, bgcolor: "#16a34a" },
                        }}
                      />

                      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35 }}>
                        Usage is deducted automatically. Auto-adds {weeklyCredits?.rechargeAmount || 200} credits below{" "}
                        {weeklyCredits?.thresholdCredits || 20}. Last sync {formatShortDateTime(weeklyCredits?.syncedAt)}.
                      </Typography>
                    </Stack>
                  </Box>

                  <Box
                    sx={{
                      border: "1px solid",
                      borderColor: (theme) =>
                        theme.palette.mode === "dark" ? alpha("#93a9c8", 0.18) : alpha("#94a3b8", 0.28),
                      borderRadius: "10px",
                      p: { xs: 1, sm: 1.15 },
                      bgcolor: (theme) => (theme.palette.mode === "dark" ? alpha("#0f172a", 0.28) : alpha("#f8fafc", 0.8)),
                    }}
                  >
                    <Stack direction="row" spacing={1.5} justifyContent="space-between" alignItems="center">
                      <Box minWidth={0}>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                          <Typography variant="body1" sx={{ fontWeight: 950 }}>
                            Spec web search
                          </Typography>
                          <Chip
                            size="small"
                            label={specWebSearch?.enabled ? "Enabled" : "Off"}
                            sx={{
                              height: 24,
                              bgcolor: specWebSearch?.enabled ? alpha("#16a34a", 0.14) : alpha("#64748b", 0.12),
                              color: specWebSearch?.enabled ? "#15803d" : "#475569",
                              border: `1px solid ${specWebSearch?.enabled ? alpha("#16a34a", 0.24) : alpha("#64748b", 0.18)}`,
                              fontWeight: 850,
                            }}
                          />
                        </Stack>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.35, display: "block", lineHeight: 1.35 }}>
                          Off uses uploaded images and provided data only.
                        </Typography>
                        {specWebSearchError ? (
                          <Typography variant="caption" sx={{ mt: 0.75, display: "block", color: "#dc2626", fontWeight: 800 }}>
                            {specWebSearchError}
                          </Typography>
                        ) : null}
                      </Box>
                      <Switch
                        checked={specWebSearch?.enabled === true}
                        onChange={toggleSpecWebSearch}
                        disabled={specWebSearchLoading || specWebSearchSaving}
                        color="success"
                        inputProps={{ "aria-label": "Toggle spec web search" }}
                        sx={{ flexShrink: 0 }}
                      />
                    </Stack>
                  </Box>

                  <Box
                    sx={{
                      border: "1px solid",
                      borderColor: (theme) =>
                        theme.palette.mode === "dark" ? alpha("#93a9c8", 0.18) : alpha("#94a3b8", 0.28),
                      borderRadius: "10px",
                      p: { xs: 1, sm: 1.15 },
                      bgcolor: (theme) => (theme.palette.mode === "dark" ? alpha("#0f172a", 0.28) : alpha("#f8fafc", 0.8)),
                    }}
                  >
                    <Stack spacing={1}>
                      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
                        <Box minWidth={0}>
                          <Typography variant="body1" sx={{ fontWeight: 950 }}>
                            Asset approval limit
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: "block", lineHeight: 1.35 }}>
                            Asset reports above this value require manager approval.
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={`Saved ${formatMoney(approvalThreshold?.threshold, approvalThresholdLoading ? "..." : "--")}`}
                          sx={{
                            height: 24,
                            bgcolor: alpha("#2563eb", 0.12),
                            color: "#2563eb",
                            border: `1px solid ${alpha("#2563eb", 0.18)}`,
                            fontWeight: 850,
                          }}
                        />
                      </Stack>

                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
                        <TextField
                          size="small"
                          value={approvalThresholdInput}
                          onChange={(event) => setApprovalThresholdInput(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              void saveApprovalThreshold();
                            }
                          }}
                          disabled={approvalThresholdLoading || approvalThresholdSaving}
                          placeholder="500000"
                          inputProps={{ inputMode: "decimal", "aria-label": "Asset approval limit" }}
                          sx={{
                            flex: 1,
                            "& .MuiOutlinedInput-root": {
                              borderRadius: "8px",
                              bgcolor: (theme) => (theme.palette.mode === "dark" ? alpha("#020617", 0.32) : "#fff"),
                            },
                          }}
                        />
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => void saveApprovalThreshold()}
                          disabled={approvalThresholdLoading || approvalThresholdSaving}
                          sx={{
                            minHeight: 38,
                            borderRadius: "8px",
                            px: 1.5,
                            fontWeight: 850,
                            bgcolor: "#2563eb",
                            boxShadow: `0 10px 20px ${alpha("#2563eb", 0.18)}`,
                            "&:hover": { bgcolor: "#1d4ed8" },
                          }}
                        >
                          {approvalThresholdSaving ? "Saving" : "Save"}
                        </Button>
                      </Stack>

                      {approvalThresholdError ? (
                        <Typography variant="caption" sx={{ color: "#dc2626", fontWeight: 800 }}>
                          {approvalThresholdError}
                        </Typography>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Current rule: {formatMoney(approvalThreshold?.threshold, "--")} and below auto-approves.
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={12}>
            <MonthlyCharts />
          </Grid>
        </Grid>
      </Container>

      <Dialog
        open={rechargesOpen}
        onClose={() => setRechargesOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: "12px" } }}
      >
        <DialogTitle sx={{ fontWeight: 950 }}>
          Weekly Recharges
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {formatWeekRange(weeklyCredits?.weekStart, weeklyCredits?.weekEnd)}
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.25}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 750 }}>
                Total added this week
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 950 }}>
                {formatMoney(weeklyCredits?.rechargeTotal, "0")} credits
              </Typography>
            </Stack>
            <Divider />
            {weeklyCredits?.recharges?.length ? (
              weeklyCredits.recharges.map((recharge) => (
                <Box
                  key={recharge.id}
                  sx={{
                    border: "1px solid",
                    borderColor: (theme) =>
                      theme.palette.mode === "dark" ? alpha("#93a9c8", 0.18) : alpha("#94a3b8", 0.28),
                    borderRadius: "10px",
                    p: 1.25,
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" spacing={1.5} alignItems="center">
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 900 }}>
                        {recharge.source === "initial_balance"
                          ? "Initial weekly credits"
                          : `Auto recharge #${recharge.ordinal}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatShortDateTime(recharge.createdAt)} · balance {formatMoney(recharge.balanceBefore)} to{" "}
                        {formatMoney(recharge.balanceAfter)}
                      </Typography>
                    </Box>
                    <Chip
                      label={`+${formatMoney(recharge.amountCredits)} cr`}
                      sx={{
                        bgcolor: alpha("#16a34a", 0.14),
                        color: "#15803d",
                        fontWeight: 900,
                        flexShrink: 0,
                      }}
                    />
                  </Stack>
                </Box>
              ))
            ) : (
              <Box
                sx={{
                  border: "1px dashed",
                  borderColor: alpha("#94a3b8", 0.42),
                  borderRadius: "10px",
                  p: 2,
                  textAlign: "center",
                }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                  No automatic recharges have been added this week.
                </Typography>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 1.5 }}>
          <Button onClick={() => setRechargesOpen(false)} variant="contained" sx={{ borderRadius: "8px", fontWeight: 900 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
