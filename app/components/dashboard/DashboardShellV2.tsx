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
        label: "Manage Admins",
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

  return (
    <Box sx={{ pb: 6 }}>
      <Container maxWidth="xl" sx={{ px: { xs: 2, md: 3 }, py: { xs: 3, md: 4 } }}>
        <Card sx={{ overflow: "hidden", position: "relative" }}>
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              background: "radial-gradient(circle at top left, rgba(37,99,235,0.18), transparent 28%), radial-gradient(circle at top right, rgba(124,58,237,0.16), transparent 24%)",
              pointerEvents: "none",
            }}
          />
          <CardContent sx={{ p: { xs: 3, md: 4 }, position: "relative" }}>
            <Stack spacing={2.5}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }}>
                <Box>
                  <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 800, letterSpacing: "0.12em" }}>
                    Operations Overview
                  </Typography>
                  <Typography variant="h3" sx={{ mt: 0.5 }}>
                    {greeting}{me ? `, ${me.username || me.email}` : ""}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 760 }}>
                    Manage reports, users, approvals, and CRM workflows from a unified control center with live visibility into team activity.
                  </Typography>
                </Box>
                <Stack spacing={1.25} alignItems={{ xs: "flex-start", md: "flex-end" }}>
                  {me?.role ? <Chip label={me.role} color="primary" variant="outlined" /> : null}
                  <Typography variant="body2" color="text.secondary" suppressHydrationWarning>
                    {now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} - {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Typography>
                </Stack>
              </Stack>

              <Grid container spacing={2.5}>
                {statCards.map((card) => (
                  <Grid key={card.key} size={{ xs: 12, sm: 6, lg: 4 }}>
                    <Card sx={{ height: "100%" }}>
                      <CardContent>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                          <Box>
                            <Typography variant="body2" color="text.secondary">{card.label}</Typography>
                            <Typography variant="h4" suppressHydrationWarning sx={{ mt: 0.75 }}>
                              {statsLoading ? "..." : stats?.[card.key] ?? 0}
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              width: 54,
                              height: 54,
                              borderRadius: 4,
                              display: "grid",
                              placeItems: "center",
                              bgcolor: alpha(card.color, 0.12),
                              color: card.color,
                              boxShadow: `inset 0 1px 0 ${alpha("#fff", 0.3)}`,
                            }}
                          >
                            {card.icon}
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}

                {reportCards.map((card) => (
                  <Grid key={card.key} size={{ xs: 12, sm: 6, lg: 4 }}>
                    <Card sx={{ height: "100%" }}>
                      <CardContent>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                          <Box>
                            <Typography variant="body2" color="text.secondary">{card.label}</Typography>
                            <Typography variant="h4" suppressHydrationWarning sx={{ mt: 0.75 }}>
                              {statsLoading ? "..." : stats?.byType?.[card.key] ?? 0}
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              width: 54,
                              height: 54,
                              borderRadius: 4,
                              display: "grid",
                              placeItems: "center",
                              bgcolor: alpha(card.color, 0.12),
                              color: card.color,
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
            </Stack>
          </CardContent>
        </Card>

        <Grid container spacing={2.5} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Quick Actions
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, mb: 2.5 }}>
                  Jump into the most common operational workflows.
                </Typography>
                <Stack direction="row" spacing={1.25} useFlexGap flexWrap="wrap">
                  {quickActions.map((action) => (
                    <Button
                      key={action.href}
                      component={Link}
                      href={action.href}
                      variant="contained"
                      color={action.color}
                      startIcon={action.icon}
                    >
                      {action.label}
                    </Button>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            <Card
              sx={{
                height: "100%",
                border: "1px solid",
                borderColor: alpha(creditMeta.color, credits?.status === "unavailable" ? 0.2 : 0.45),
                boxShadow: `0 18px 50px ${alpha(creditMeta.color, 0.08)}`,
              }}
            >
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box
                        sx={{
                          width: 46,
                          height: 46,
                          borderRadius: 3,
                          display: "grid",
                          placeItems: "center",
                          bgcolor: alpha(creditMeta.color, 0.12),
                          color: creditMeta.color,
                        }}
                      >
                        <PaidRoundedIcon />
                      </Box>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                          OpenAI Credits
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Updates every 10 seconds
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

                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Remaining
                    </Typography>
                    <Typography variant="h4" sx={{ mt: 0.5, fontWeight: 900 }} suppressHydrationWarning>
                      {creditsLoading && !credits ? "..." : formatCredits(credits?.remainingCredits, "Set budget")}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {typeof credits?.remainingCredits === "number"
                        ? "Available credits"
                        : creditsError || credits?.message || "Configure OpenAI budget settings on the server."}
                    </Typography>
                  </Box>

                  <Box>
                    <LinearProgress
                      variant="determinate"
                      value={creditSpentPercent}
                      sx={{
                        height: 8,
                        borderRadius: 999,
                        bgcolor: alpha(creditMeta.color, 0.14),
                        "& .MuiLinearProgress-bar": {
                          borderRadius: 999,
                          bgcolor: creditMeta.color,
                        },
                      }}
                    />
                    <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.75 }}>
                      <Typography variant="caption" color="text.secondary">
                        Spent {formatCredits(credits?.spentCredits)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Budget {formatCredits(credits?.budgetCredits, "Set budget")}
                      </Typography>
                    </Stack>
                  </Box>

                  <Divider />

                  <Grid container spacing={1.5}>
                    <Grid size={6}>
                      <Typography variant="caption" color="text.secondary">
                        Live credits used
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        {formatCreditsFromUsd(credits?.localLedgerSpentUsd, credits?.creditMultiplier)}
                      </Typography>
                    </Grid>
                    <Grid size={6}>
                      <Typography variant="caption" color="text.secondary">
                        OpenAI credits used
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        {formatCreditsFromUsd(credits?.officialOpenAISpentUsd, credits?.creditMultiplier)}
                      </Typography>
                    </Grid>
                    <Grid size={6}>
                      <Typography variant="caption" color="text.secondary">
                        Requests
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        {credits ? numberFormatter.format(credits.requestCount) : "--"}
                      </Typography>
                    </Grid>
                    <Grid size={6}>
                      <Typography variant="caption" color="text.secondary">
                        Web searches
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        {credits ? numberFormatter.format(credits.webSearchCalls) : "--"}
                      </Typography>
                    </Grid>
                    <Grid size={6}>
                      <Typography variant="caption" color="text.secondary">
                        Input tokens
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        {credits ? numberFormatter.format(credits.inputTokens) : "--"}
                      </Typography>
                    </Grid>
                    <Grid size={6}>
                      <Typography variant="caption" color="text.secondary">
                        Output tokens
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        {credits ? numberFormatter.format(credits.outputTokens) : "--"}
                      </Typography>
                    </Grid>
                  </Grid>

                  {credits?.modelBreakdown?.length ? (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Top model spend
                      </Typography>
                      <Stack spacing={0.75} sx={{ mt: 0.75 }}>
                        {credits.modelBreakdown.slice(0, 3).map((item) => (
                          <Stack key={item.model} direction="row" justifyContent="space-between" spacing={1.5}>
                            <Typography variant="caption" sx={{ fontWeight: 800, minWidth: 0 }} noWrap>
                              {item.model}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                              {formatCredits(item.creditsDeducted)} cr
                            </Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </Box>
                  ) : null}

                  {credits?.warnings?.length ? (
                    <Typography variant="caption" sx={{ color: creditMeta.color, fontWeight: 700 }}>
                      {credits.warnings[0]}
                    </Typography>
                  ) : null}

                  <Stack direction="row" spacing={1.25} justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary">
                      Last call {formatDateTime(credits?.lastOpenAICallAt)} - updated {formatDateTime(credits?.asOf)}
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<RefreshRoundedIcon />}
                      onClick={() => loadOpenAICredits(true)}
                      disabled={creditsLoading}
                    >
                      Refresh
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3 }}>
          <MonthlyCharts />
        </Box>
      </Container>
    </Box>
  );
}
