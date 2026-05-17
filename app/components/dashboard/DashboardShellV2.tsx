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
  Divider,
  Grid,
  LinearProgress,
  Stack,
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
  byType: { Asset: number; RealEstate: number; Salvage: number };
} | null;

type OpenAICreditsStatus = "ok" | "low" | "depleted" | "unavailable";

type OpenAICreditsState = {
  budgetUsd: number | null;
  spentUsd: number | null;
  localLedgerSpentUsd: number;
  officialOpenAISpentUsd: number | null;
  remainingUsd: number | null;
  creditMultiplier: number;
  budgetCredits: number | null;
  spentCredits: number | null;
  remainingCredits: number | null;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  totalTokens: number;
  requestCount: number;
  webSearchCalls: number;
  unpricedCount: number;
  fallbackEstimateCount: number;
  lastOpenAICallAt: string | null;
  modelBreakdown: Array<{
    model: string;
    requests: number;
    spentUsd: number;
    creditsDeducted: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    webSearchCalls: number;
    unpricedCount: number;
  }>;
  warnings: string[];
  status: OpenAICreditsStatus;
  asOf: string;
  periodStart: string;
  periodEnd: string;
  source: string;
  message: string;
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
  key: "Asset" | "RealEstate" | "Salvage";
  label: string;
  icon: ReactNode;
  color: string;
  iconBg: string;
}> = [
  { key: "Asset", label: "Asset Reports", icon: <WarehouseRoundedIcon />, color: "#2563eb", iconBg: "#dbeafe" },
  { key: "RealEstate", label: "Real Estate Reports", icon: <DashboardRoundedIcon />, color: "#16a34a", iconBg: "#dcfce7" },
  { key: "Salvage", label: "Salvage Reports", icon: <CheckCircleRoundedIcon />, color: "#f59e0b", iconBg: "#ffedd5" },
];

const creditStatusMeta: Record<OpenAICreditsStatus, { label: string; color: string; bg: string }> = {
  ok: { label: "Healthy", color: "#16a34a", bg: "#dcfce7" },
  low: { label: "Low", color: "#d97706", bg: "#fef3c7" },
  depleted: { label: "Depleted", color: "#dc2626", bg: "#fee2e2" },
  unavailable: { label: "Unavailable", color: "#64748b", bg: "#e2e8f0" },
};

const numberFormatter = new Intl.NumberFormat("en-US");
const creditFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

function formatCredits(value: number | null | undefined, fallback = "--") {
  return typeof value === "number" ? creditFormatter.format(value) : fallback;
}

function formatCreditsFromUsd(value: number | null | undefined, multiplier: number | null | undefined) {
  if (typeof value !== "number" || typeof multiplier !== "number") return "--";
  return creditFormatter.format(value * multiplier);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDashboardDate(value: Date) {
  const weekday = value.toLocaleDateString(undefined, { weekday: "short" });
  const dayMonth = value.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
  const time = value.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${weekday} ${dayMonth} - ${time}`;
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
  if (key === "Asset" || key === "RealEstate" || key === "Salvage") {
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
  const [credits, setCredits] = useState<OpenAICreditsState>(null);
  const [creditsLoading, setCreditsLoading] = useState(true);
  const [creditsError, setCreditsError] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
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

  const loadOpenAICredits = useCallback(async (refresh = false) => {
    try {
      setCreditsLoading(true);
      setCreditsError(null);
      const res = await fetch(`/api/admin/openai-credits${refresh ? "?refresh=1" : ""}`, {
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        throw new Error(data.message || "Failed to load OpenAI credits");
      }
      setCredits(data as NonNullable<OpenAICreditsState>);
    } catch (e) {
      setCreditsError(e instanceof Error ? e.message : "Failed to load OpenAI credits");
    } finally {
      setCreditsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOpenAICredits();
    const id = window.setInterval(() => {
      loadOpenAICredits();
    }, 10_000);
    return () => window.clearInterval(id);
  }, [loadOpenAICredits]);

  const greeting = useMemo(() => {
    const hours = now.getHours();
    if (hours < 12) return "Good morning";
    if (hours < 18) return "Good afternoon";
    return "Good evening";
  }, [now]);

  const creditMeta = creditStatusMeta[credits?.status || "unavailable"];
  const creditSpentPercent = useMemo(() => {
    if (!credits || !credits.budgetCredits || credits.spentCredits === null) return 0;
    return Math.min(100, Math.max(0, (credits.spentCredits / credits.budgetCredits) * 100));
  }, [credits]);

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
          <Grid size={{ xs: 12, lg: 6 }}>
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
                      Reports, approvals, users, CRM and OpenAI credits in one dense control surface.
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

          <Grid size={{ xs: 12, lg: 6 }}>
            <Card sx={{ ...surfaceSx, ...compactHoverSx }}>
              <CardContent sx={{ p: { xs: 2, md: 3 }, height: "100%" }}>
                <Stack spacing={1.75} sx={{ height: "100%" }}>
                  <Stack direction="row" spacing={1.5} alignItems="flex-start" justifyContent="space-between">
                    <Stack direction="row" spacing={1.75} alignItems="center" minWidth={0}>
                      <Box
                        sx={{
                          width: 60,
                          height: 60,
                          borderRadius: "999px",
                          display: "grid",
                          placeItems: "center",
                          bgcolor: (theme) => (theme.palette.mode === "dark" ? alpha("#16a34a", 0.18) : "#dcfce7"),
                          color: "#16a34a",
                        }}
                      >
                        <Box
                          sx={{
                            width: 42,
                            height: 42,
                            borderRadius: "999px",
                            display: "grid",
                            placeItems: "center",
                            bgcolor: "#16a34a",
                            color: "#fff",
                            boxShadow: `0 10px 22px ${alpha("#16a34a", 0.28)}`,
                          }}
                        >
                          <PaidRoundedIcon />
                        </Box>
                      </Box>
                      <Box minWidth={0}>
                        <Typography variant="h5" sx={{ fontWeight: 950, lineHeight: 1.08 }}>
                          OpenAI Credits
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          10 second refresh
                        </Typography>
                      </Box>
                    </Stack>

                    <Stack spacing={1} alignItems="flex-end">
                      <Chip
                        label={creditMeta.label}
                        sx={{
                          height: 40,
                          px: 1.25,
                          borderRadius: "10px",
                          bgcolor: (theme) => (theme.palette.mode === "dark" ? alpha(creditMeta.color, 0.15) : creditMeta.bg),
                          color: creditMeta.color,
                          border: `1px solid ${alpha(creditMeta.color, 0.24)}`,
                          fontSize: 16,
                          fontWeight: 850,
                        }}
                      />
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<RefreshRoundedIcon />}
                        onClick={() => loadOpenAICredits(true)}
                        disabled={creditsLoading}
                        sx={{
                          minHeight: 38,
                          borderRadius: "9px",
                          px: 1.5,
                          color: "text.primary",
                          borderColor: (theme) =>
                            theme.palette.mode === "dark" ? alpha("#93a9c8", 0.28) : alpha("#94a3b8", 0.45),
                          bgcolor: (theme) => (theme.palette.mode === "dark" ? alpha("#0f172a", 0.25) : "#fff"),
                        }}
                      >
                        Refresh
                      </Button>
                    </Stack>
                  </Stack>

                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 650 }}>
                      Remaining
                    </Typography>
                    <Typography
                      variant="h3"
                      sx={{ mt: 0.25, fontWeight: 950, lineHeight: 1, fontSize: { xs: 34, md: 42 } }}
                      suppressHydrationWarning
                    >
                      {creditsLoading && !credits ? "..." : formatCredits(credits?.remainingCredits, "Set budget")}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={creditSpentPercent}
                      sx={{
                        mt: 1.25,
                        height: 8,
                        borderRadius: 999,
                        bgcolor: alpha("#16a34a", 0.16),
                        "& .MuiLinearProgress-bar": {
                          borderRadius: 999,
                          bgcolor: "#16a34a",
                        },
                      }}
                    />
                    <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.75 }}>
                      <Typography variant="body2" color="text.secondary">
                        Spent {formatCredits(credits?.spentCredits)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Budget {formatCredits(credits?.budgetCredits, "Set budget")}
                      </Typography>
                    </Stack>
                  </Box>

                  <Divider />

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "1fr 1fr 1.2fr" },
                      gap: { xs: 1.5, md: 2 },
                      alignItems: "stretch",
                    }}
                  >
                    <Stack spacing={1.35}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Live used
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 950, lineHeight: 1.1 }}>
                          {formatCreditsFromUsd(credits?.localLedgerSpentUsd, credits?.creditMultiplier)}
                        </Typography>
                      </Box>
                      <Divider />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Requests
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 950, lineHeight: 1.1 }}>
                          {credits ? numberFormatter.format(credits.requestCount) : "--"}
                        </Typography>
                      </Box>
                    </Stack>

                    <Stack
                      spacing={1.35}
                      sx={{
                        pl: { sm: 2 },
                        borderLeft: { sm: "1px solid" },
                        borderColor: "divider",
                      }}
                    >
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          OpenAI used
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 950, lineHeight: 1.1 }}>
                          {formatCreditsFromUsd(credits?.officialOpenAISpentUsd, credits?.creditMultiplier)}
                        </Typography>
                      </Box>
                      <Divider />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Web searches
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 950, lineHeight: 1.1 }}>
                          {credits ? numberFormatter.format(credits.webSearchCalls) : "--"}
                        </Typography>
                      </Box>
                    </Stack>

                    <Stack
                      spacing={1}
                      sx={{
                        gridColumn: { xs: "1 / -1", sm: "auto" },
                        pl: { sm: 2 },
                        borderLeft: { sm: "1px solid" },
                        borderColor: "divider",
                      }}
                    >
                      {credits?.modelBreakdown?.length ? (
                        credits.modelBreakdown.slice(0, 2).map((item) => (
                          <Stack key={item.model} direction="row" spacing={1.5} justifyContent="space-between">
                            <Typography variant="body2" sx={{ fontWeight: 900, minWidth: 0 }} noWrap>
                              {item.model}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
                              {formatCredits(item.creditsDeducted)} cr
                            </Typography>
                          </Stack>
                        ))
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No model usage yet
                        </Typography>
                      )}
                      <Divider />
                      <Typography variant="body2" color="text.secondary">
                        Last call {formatDateTime(credits?.lastOpenAICallAt)} - updated {formatDateTime(credits?.asOf)}
                      </Typography>
                      {creditsError || credits?.warnings?.length ? (
                        <Typography variant="caption" sx={{ color: creditMeta.color, fontWeight: 850 }}>
                          {creditsError || credits?.warnings?.[0]}
                        </Typography>
                      ) : null}
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
    </Box>
  );
}
