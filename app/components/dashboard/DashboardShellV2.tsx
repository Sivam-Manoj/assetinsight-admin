"use client";

import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
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
import Link from "next/link";
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

const statCards: Array<{ key: "totalUsers" | "totalAdmins" | "totalReports"; label: string; icon: ReactNode; color: string }> = [
  { key: "totalUsers", label: "Users", icon: <GroupRoundedIcon />, color: "#2563eb" },
  { key: "totalAdmins", label: "Admins", icon: <ManageAccountsRoundedIcon />, color: "#7c3aed" },
  { key: "totalReports", label: "Total Reports", icon: <AssessmentRoundedIcon />, color: "#d97706" },
];

const reportCards: Array<{ key: "Asset" | "RealEstate" | "Salvage"; label: string; icon: ReactNode; color: string }> = [
  { key: "Asset", label: "Asset Reports", icon: <WarehouseRoundedIcon />, color: "#0ea5e9" },
  { key: "RealEstate", label: "Real Estate Reports", icon: <DashboardRoundedIcon />, color: "#10b981" },
  { key: "Salvage", label: "Salvage Reports", icon: <CheckCircleRoundedIcon />, color: "#f59e0b" },
];

type QuickAction = {
  href: string;
  label: string;
  color: "primary" | "success" | "secondary";
  icon: ReactNode;
};

const creditStatusMeta: Record<OpenAICreditsStatus, { label: string; color: string }> = {
  ok: { label: "Healthy", color: "#10b981" },
  low: { label: "Low", color: "#f59e0b" },
  depleted: { label: "Depleted", color: "#ef4444" },
  unavailable: { label: "Unavailable", color: "#64748b" },
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

const raisedCardSx = (color = "#2563eb") => ({
  height: "100%",
  overflow: "hidden",
  borderRadius: 3,
  border: "1px solid",
  borderColor: alpha(color, 0.22),
  backgroundImage: (theme: any) =>
    theme.palette.mode === "dark"
      ? `linear-gradient(145deg, ${alpha("#15243a", 0.96)}, ${alpha("#08111f", 0.98)})`
      : `linear-gradient(145deg, rgba(255,255,255,0.98), ${alpha(color, 0.045)})`,
  boxShadow: (theme: any) =>
    theme.palette.mode === "dark"
      ? `0 18px 36px ${alpha("#020617", 0.42)}, inset 0 1px 0 ${alpha("#fff", 0.04)}`
      : `0 16px 32px ${alpha(color, 0.12)}, inset 0 1px 0 ${alpha("#fff", 0.95)}`,
  transform: "translateZ(0)",
  transition: "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
  "&:hover": {
    transform: "translateY(-2px)",
    borderColor: alpha(color, 0.36),
    boxShadow: (theme: any) =>
      theme.palette.mode === "dark"
        ? `0 22px 44px ${alpha("#020617", 0.54)}, inset 0 1px 0 ${alpha("#fff", 0.05)}`
        : `0 20px 40px ${alpha(color, 0.17)}, inset 0 1px 0 ${alpha("#fff", 1)}`,
  },
});

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

  const quickActions = useMemo<QuickAction[]>(() => {
    const actions: QuickAction[] = [
      { href: "/reports", label: "Reports", color: "primary", icon: <AssessmentRoundedIcon /> },
    ];

    if (me?.role === "admin" || me?.role === "superadmin") {
      actions.push({
        href: "/approvals",
        label: "Approvals",
        color: "success",
        icon: <CheckCircleRoundedIcon />,
      });
    }

    if (me?.role === "superadmin") {
      actions.push({
        href: "/admins",
        label: "Admins",
        color: "secondary",
        icon: <ManageAccountsRoundedIcon />,
      });
    }

    return actions;
  }, [me?.role]);

  const creditMeta = creditStatusMeta[credits?.status || "unavailable"];
  const creditSpentPercent = useMemo(() => {
    if (!credits || !credits.budgetCredits || credits.spentCredits === null) return 0;
    return Math.min(100, Math.max(0, (credits.spentCredits / credits.budgetCredits) * 100));
  }, [credits]);

  const allMetricCards = [
    ...statCards.map((card) => ({
      key: card.key,
      label: card.label,
      value: stats?.[card.key] ?? 0,
      icon: card.icon,
      color: card.color,
    })),
    ...reportCards.map((card) => ({
      key: card.key,
      label: card.label,
      value: stats?.byType?.[card.key] ?? 0,
      icon: card.icon,
      color: card.color,
    })),
  ];

  return (
    <Box sx={{ pb: { xs: 1.5, md: 2 }, minHeight: "calc(100vh - 64px)" }}>
      <Container
        maxWidth={false}
        sx={{
          px: { xs: 1, md: 1.5 },
          py: { xs: 1, md: 1.5 },
          maxWidth: "1800px",
        }}
      >
        <Grid container spacing={1.5} alignItems="stretch">
          <Grid size={{ xs: 12, lg: 8 }}>
            <Card sx={raisedCardSx("#2563eb")}>
              <CardContent sx={{ p: { xs: 2, md: 2.25 } }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between">
                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 900, letterSpacing: "0.08em", lineHeight: 1 }}>
                        Operations
                      </Typography>
                      {me?.role ? <Chip size="small" label={me.role} color="primary" variant="outlined" /> : null}
                    </Stack>
                    <Typography variant="h4" sx={{ mt: 0.75, fontWeight: 900 }}>
                      {greeting}{me ? `, ${me.username || me.email}` : ""}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 760 }}>
                      Reports, approvals, users, CRM and OpenAI credits in one dense control surface.
                    </Typography>
                  </Box>
                  <Stack spacing={1} alignItems={{ xs: "flex-start", md: "flex-end" }}>
                    <Typography variant="caption" color="text.secondary" suppressHydrationWarning>
                      {now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} - {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Typography>
                    <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" justifyContent={{ xs: "flex-start", md: "flex-end" }}>
                      {quickActions.map((action) => (
                        <Button
                          key={action.href}
                          component={Link}
                          href={action.href}
                          variant="contained"
                          color={action.color}
                          size="small"
                          startIcon={action.icon}
                          sx={{ minHeight: 36, px: 1.5 }}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </Stack>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <Card sx={raisedCardSx(creditMeta.color)}>
              <CardContent sx={{ p: { xs: 2, md: 2.25 } }}>
                <Stack spacing={1.35}>
                  <Stack direction="row" spacing={1.25} alignItems="center" justifyContent="space-between">
                    <Stack direction="row" spacing={1.25} alignItems="center" minWidth={0}>
                      <Box
                        sx={{
                          width: 42,
                          height: 42,
                          borderRadius: 2.25,
                          display: "grid",
                          placeItems: "center",
                          bgcolor: alpha(creditMeta.color, 0.12),
                          color: creditMeta.color,
                          boxShadow: `inset 0 1px 0 ${alpha("#fff", 0.35)}`,
                        }}
                      >
                        <PaidRoundedIcon />
                      </Box>
                      <Box minWidth={0}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
                          OpenAI Credits
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          10 second refresh
                        </Typography>
                      </Box>
                    </Stack>
                    <Chip
                      size="small"
                      label={creditMeta.label}
                      sx={{
                        bgcolor: alpha(creditMeta.color, 0.12),
                        color: creditMeta.color,
                        border: `1px solid ${alpha(creditMeta.color, 0.24)}`,
                        fontWeight: 800,
                      }}
                    />
                  </Stack>

                  <Stack direction="row" spacing={1.25} alignItems="flex-end" justifyContent="space-between">
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Remaining
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 950, lineHeight: 1.05 }} suppressHydrationWarning>
                        {creditsLoading && !credits ? "..." : formatCredits(credits?.remainingCredits, "Set budget")}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<RefreshRoundedIcon />}
                      onClick={() => loadOpenAICredits(true)}
                      disabled={creditsLoading}
                      sx={{ minHeight: 34, px: 1.25 }}
                    >
                      Refresh
                    </Button>
                  </Stack>

                  <Box>
                    <LinearProgress
                      variant="determinate"
                      value={creditSpentPercent}
                      sx={{
                        height: 7,
                        borderRadius: 999,
                        bgcolor: alpha(creditMeta.color, 0.14),
                        "& .MuiLinearProgress-bar": {
                          borderRadius: 999,
                          bgcolor: creditMeta.color,
                        },
                      }}
                    />
                    <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">Spent {formatCredits(credits?.spentCredits)}</Typography>
                      <Typography variant="caption" color="text.secondary">Budget {formatCredits(credits?.budgetCredits, "Set budget")}</Typography>
                    </Stack>
                  </Box>

                  <Divider />

                  <Grid container spacing={1}>
                    {[
                      ["Live used", formatCreditsFromUsd(credits?.localLedgerSpentUsd, credits?.creditMultiplier)],
                      ["OpenAI used", formatCreditsFromUsd(credits?.officialOpenAISpentUsd, credits?.creditMultiplier)],
                      ["Requests", credits ? numberFormatter.format(credits.requestCount) : "--"],
                      ["Web searches", credits ? numberFormatter.format(credits.webSearchCalls) : "--"],
                    ].map(([label, value]) => (
                      <Grid key={label} size={6}>
                        <Typography variant="caption" color="text.secondary">{label}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 850 }}>{value}</Typography>
                      </Grid>
                    ))}
                  </Grid>

                  {credits?.modelBreakdown?.length ? (
                    <Stack spacing={0.5}>
                      {credits.modelBreakdown.slice(0, 2).map((item) => (
                        <Stack key={item.model} direction="row" justifyContent="space-between" spacing={1.25}>
                          <Typography variant="caption" sx={{ fontWeight: 800, minWidth: 0 }} noWrap>
                            {item.model}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                            {formatCredits(item.creditsDeducted)} cr
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  ) : null}

                  <Typography variant="caption" color="text.secondary">
                    Last call {formatDateTime(credits?.lastOpenAICallAt)} - updated {formatDateTime(credits?.asOf)}
                  </Typography>
                  {creditsError || credits?.warnings?.length ? (
                    <Typography variant="caption" sx={{ color: creditMeta.color, fontWeight: 800 }}>
                      {creditsError || credits?.warnings?.[0]}
                    </Typography>
                  ) : null}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={12}>
            <Grid container spacing={1.5}>
              {allMetricCards.map((card) => (
                <Grid key={card.key} size={{ xs: 6, md: 4, xl: 2 }}>
                  <Card sx={raisedCardSx(card.color)}>
                    <CardContent sx={{ p: { xs: 1.5, md: 1.75 } }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.25}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {card.label}
                          </Typography>
                          <Typography variant="h5" suppressHydrationWarning sx={{ mt: 0.25, fontWeight: 950, lineHeight: 1.08 }}>
                            {statsLoading ? "..." : card.value}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 2.25,
                            display: "grid",
                            placeItems: "center",
                            bgcolor: alpha(card.color, 0.12),
                            color: card.color,
                            flexShrink: 0,
                            boxShadow: `inset 0 1px 0 ${alpha("#fff", 0.35)}`,
                          }}
                        >
                          {card.icon}
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>

          <Grid size={12}>
            <MonthlyCharts />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
