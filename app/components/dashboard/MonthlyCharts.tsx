"use client";

import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import { alpha, Box, Card, CardContent, Chip, Stack, Typography, useTheme } from "@mui/material";
import { useEffect, useMemo, useState } from "react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler
);

type MonthlyResponse = {
  months: string[];
  reports: { totals: number[]; byType: { Asset: number[]; RealEstate: number[]; Salvage: number[] } };
  users: { totals: number[] };
  deltas: {
    reports: { total: number; delta: number; percent: number };
    users: { total: number; delta: number; percent: number };
  };
};

const surfaceSx = {
  height: "100%",
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
  transition: "transform 170ms ease, box-shadow 170ms ease",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: (theme: any) =>
      theme.palette.mode === "dark"
        ? `0 22px 52px ${alpha("#020617", 0.58)}, inset 0 1px 0 ${alpha("#fff", 0.05)}`
        : `0 20px 46px ${alpha("#0f172a", 0.13)}, inset 0 1px 0 ${alpha("#fff", 1)}`,
  },
};

export default function MonthlyCharts() {
  const theme = useTheme();
  const [data, setData] = useState<MonthlyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/stats/monthly", { cache: "no-store" });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.message || "Failed to load monthly stats");
        setData(j);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Failed to load monthly stats";
        setError(message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const months = useMemo(() => data?.months || [], [data]);
  const reportTotals = useMemo(() => data?.reports?.totals || [], [data]);
  const userTotals = useMemo(() => data?.users?.totals || [], [data]);
  const byType = useMemo(() => data?.reports?.byType, [data]);
  const reportKpi = data?.deltas?.reports || { total: 0, delta: 0, percent: 0 };
  const reportTrendUp = reportKpi.delta >= 0;

  const chartText = theme.palette.mode === "dark" ? "#dbeafe" : "#1f2a44";
  const mutedText = theme.palette.mode === "dark" ? "#93a9c8" : "#52637a";
  const gridColor = theme.palette.mode === "dark" ? "rgba(147,169,200,0.15)" : "rgba(31,42,68,0.10)";

  const lineData = useMemo(() => {
    return {
      labels: months,
      datasets: [
        {
          label: "Reports",
          data: reportTotals,
          borderColor: "#f43f5e",
          backgroundColor: "rgba(244,63,94,0.16)",
          pointBackgroundColor: "#f43f5e",
          pointBorderColor: "#f43f5e",
          fill: true,
          tension: 0.36,
          pointRadius: 3,
          pointHoverRadius: 5,
          borderWidth: 2,
        },
        {
          label: "New Users",
          data: userTotals,
          borderColor: "#2563eb",
          backgroundColor: "rgba(37,99,235,0.10)",
          pointBackgroundColor: "#2563eb",
          pointBorderColor: "#2563eb",
          fill: true,
          tension: 0.36,
          pointRadius: 3,
          pointHoverRadius: 5,
          borderWidth: 2,
        },
      ],
    };
  }, [months, reportTotals, userTotals]);

  const lineOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index" as const, intersect: false },
      plugins: {
        legend: {
          position: "top" as const,
          align: "end" as const,
          labels: {
            color: chartText,
            boxWidth: 8,
            boxHeight: 8,
            usePointStyle: true,
            pointStyle: "circle",
            padding: 18,
            font: { size: 12, weight: 600 },
          },
        },
        tooltip: { mode: "index" as const, intersect: false },
      },
      scales: {
        x: {
          ticks: { color: mutedText, maxRotation: 0 },
          grid: { display: false },
          border: { color: gridColor },
        },
        y: {
          ticks: { color: mutedText, precision: 0 },
          grid: { color: gridColor },
          border: { color: gridColor },
        },
      },
    }),
    [chartText, gridColor, mutedText]
  );

  const barData = useMemo(() => {
    return {
      labels: months,
      datasets: [
        {
          label: "Asset",
          data: byType?.Asset || [],
          backgroundColor: "#2f80ed",
          borderColor: "#2f80ed",
          borderWidth: 1,
          borderRadius: 2,
        },
        {
          label: "RealEstate",
          data: byType?.RealEstate || [],
          backgroundColor: "#16a34a",
          borderColor: "#16a34a",
          borderWidth: 1,
          borderRadius: 2,
        },
        {
          label: "Salvage",
          data: byType?.Salvage || [],
          backgroundColor: "#f59e0b",
          borderColor: "#f59e0b",
          borderWidth: 1,
          borderRadius: 2,
        },
      ],
    };
  }, [months, byType]);

  const barOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top" as const,
          align: "end" as const,
          labels: {
            color: chartText,
            boxWidth: 10,
            boxHeight: 10,
            padding: 18,
            font: { size: 12, weight: 600 },
          },
        },
        tooltip: { mode: "index" as const, intersect: false },
      },
      scales: {
        x: {
          stacked: true,
          ticks: { color: mutedText, maxRotation: 0 },
          grid: { display: false },
          border: { color: gridColor },
        },
        y: {
          stacked: true,
          ticks: { color: mutedText, precision: 0 },
          grid: { color: gridColor },
          border: { color: gridColor },
        },
      },
    }),
    [chartText, gridColor, mutedText]
  );

  return (
    <Box
      component="section"
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          lg: "minmax(220px, 0.75fr) minmax(0, 1.45fr) minmax(0, 1.35fr)",
        },
        gap: 1.5,
      }}
    >
      <Card sx={surfaceSx}>
        <CardContent sx={{ p: { xs: 2, md: 2.75 }, height: "100%", "&:last-child": { pb: { xs: 2, md: 2.75 } } }}>
          <Stack spacing={2.4} sx={{ height: "100%" }}>
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1.5}>
              <Box minWidth={0}>
                <Typography component="h3" sx={{ fontSize: 20, fontWeight: 950, lineHeight: 1.1 }}>
                  Reports <Typography component="span" color="text.secondary" sx={{ fontSize: 17, fontWeight: 650 }}>(this month)</Typography>
                </Typography>
                <Typography variant="h3" sx={{ mt: 2.25, fontWeight: 950, lineHeight: 1 }} suppressHydrationWarning>
                  {loading ? "..." : reportKpi.total}
                </Typography>
              </Box>
              {!loading ? (
                <Chip
                  size="small"
                  icon={<TrendingUpRoundedIcon />}
                  label={`${Math.abs(reportKpi.percent).toFixed(1)}%`}
                  sx={{
                    height: 40,
                    borderRadius: "10px",
                    px: 0.8,
                    bgcolor: reportTrendUp ? alpha("#16a34a", 0.13) : alpha("#dc2626", 0.13),
                    color: reportTrendUp ? "#16a34a" : "#dc2626",
                    fontWeight: 850,
                    "& .MuiChip-icon": {
                      color: "inherit",
                      transform: reportTrendUp ? "none" : "rotate(180deg)",
                    },
                  }}
                />
              ) : null}
            </Stack>

            <Box sx={{ flex: 1, display: "flex", alignItems: "center" }}>
              <Box
                sx={{
                  width: 76,
                  height: 76,
                  borderRadius: "999px",
                  display: "grid",
                  placeItems: "center",
                  bgcolor: (muiTheme) => (muiTheme.palette.mode === "dark" ? alpha("#2563eb", 0.18) : "#eff6ff"),
                  color: "#2563eb",
                  "& svg": { fontSize: 40 },
                }}
              >
                <AssessmentRoundedIcon />
              </Box>
            </Box>

            <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 520, lineHeight: 1.55 }}>
              {reportTrendUp ? "Monthly report generation is trending upward." : "Monthly report generation remains steady."}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={surfaceSx}>
        <CardContent sx={{ p: { xs: 2, md: 2.6 }, "&:last-child": { pb: { xs: 2, md: 2.6 } } }}>
          <Typography component="h3" sx={{ fontSize: 20, fontWeight: 950, mb: 1 }}>
            Reports & Users
          </Typography>
          <Box sx={{ height: { xs: 280, md: 320, xl: 340 } }}>
            {error ? (
              <Box sx={{ color: "error.main", bgcolor: alpha(theme.palette.error.main, 0.08), borderRadius: "8px", p: 1.5 }}>
                {error}
              </Box>
            ) : (
              <Line data={lineData} options={lineOptions} />
            )}
          </Box>
        </CardContent>
      </Card>

      <Card sx={surfaceSx}>
        <CardContent sx={{ p: { xs: 2, md: 2.6 }, "&:last-child": { pb: { xs: 2, md: 2.6 } } }}>
          <Typography component="h3" sx={{ fontSize: 20, fontWeight: 950, mb: 1 }}>
            Reports by Type
          </Typography>
          <Box sx={{ height: { xs: 280, md: 320, xl: 340 } }}>
            {error ? (
              <Box sx={{ color: "error.main", bgcolor: alpha(theme.palette.error.main, 0.08), borderRadius: "8px", p: 1.5 }}>
                {error}
              </Box>
            ) : (
              <Bar data={barData} options={barOptions} />
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
