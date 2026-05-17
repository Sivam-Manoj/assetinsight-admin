"use client";

import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import CampaignRoundedIcon from "@mui/icons-material/CampaignRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import RocketLaunchRoundedIcon from "@mui/icons-material/RocketLaunchRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import {
  Alert,
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

type RadarCountry = "Canada" | "United States";

type CategoryOption = {
  id: string;
  label: string;
};

type RadarData = {
  asOf: string;
  filters: {
    country: RadarCountry | "";
    regions: string[];
    categories: string[];
    timeframeDays: number;
  };
  options: {
    countries: RadarCountry[];
    canadaProvinces: string[];
    usStates: string[];
    categories: CategoryOption[];
    timeframeDays: number[];
    maxResults: number;
  };
  kpis: {
    totalLeads: number;
    activePipeline: number;
    won: number;
    lost: number;
    proposalStage: number;
    overdue: number;
    stale: number;
    publicProspects: number;
    duplicateProspects: number;
    conversionRate: number;
  };
  regionBreakdown: Array<{
    country: string;
    region: string;
    totalLeads: number;
    activePipeline: number;
    won: number;
    proposalStage: number;
    overdue: number;
    stale: number;
    autoFound: number;
    importedProspects: number;
    score: number;
    topCategories: Array<{ id: string; label: string; count: number }>;
  }>;
  categoryBreakdown: Array<{
    id: string;
    label: string;
    leads: number;
    won: number;
    activePipeline: number;
    autoFound: number;
    score: number;
  }>;
  sourceBreakdown: Array<{ source: string; count: number }>;
  staleLeads: Array<{
    id: string;
    clientName: string;
    companyName: string;
    status: string;
    dueDate: string | null;
    updatedAt: string | null;
    assignedTo: string;
    location: string;
    overdue: boolean;
    stale: boolean;
  }>;
  recentProspects: ProspectRow[];
  recommendations: {
    country: RadarCountry;
    regions: string[];
    categories: string[];
    keywords: string;
    maxResults: number;
    rationale: string;
  };
  marketSources: Array<{ title: string; url: string; region: string; note: string }>;
  compliance: Array<{ region: string; title: string; url: string; bullets: string[] }>;
};

type ProspectRow = {
  id: string;
  status: string;
  country: string;
  regions: string[];
  category: { id: string; label: string };
  companyName: string;
  clientName: string;
  email: string;
  phoneRaw: string;
  website: string;
  location: string;
  confidence: number;
  sourceUrl: string;
  sourceTitle: string;
  evidence: string;
  suggestedAgent: { id: string; label: string } | null;
  createdAt: string | null;
};

type AutoFindRunItem = {
  searchResultId: string;
  duplicate: boolean;
  duplicateReasons?: string[];
  lead?: {
    companyName?: string;
    clientName?: string;
    companyLocation?: string;
    contactLocation?: string;
    industry?: string;
    evidence?: string;
    confidence?: number;
    sourceUrl?: string;
    sourceTitle?: string;
  };
  draftPreview?: {
    companyName?: string;
    clientName?: string;
    companyLocation?: string;
    industry?: string;
  };
};

type AutoFindRun = {
  runId: string;
  status: "queued" | "running" | "completed" | "failed";
  progress: number;
  message: string;
  items: AutoFindRunItem[];
  searched: number;
  duplicateCount: number;
  error?: string;
};

const numberFormatter = new Intl.NumberFormat("en-US");

function formatNumber(value: number | null | undefined) {
  return numberFormatter.format(Number(value || 0));
}

function formatPercent(value: number | null | undefined) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "--";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "--";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function statusLabel(value: string) {
  return value.replace(/_/g, " ");
}

export default function RevenueRadarDashboard() {
  const theme = useTheme();
  const [data, setData] = useState<RadarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [country, setCountry] = useState<RadarCountry>("Canada");
  const [regions, setRegions] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [timeframeDays, setTimeframeDays] = useState(90);
  const [keywords, setKeywords] = useState("");
  const [maxResults, setMaxResults] = useState(30);
  const [searching, setSearching] = useState(false);
  const [run, setRun] = useState<AutoFindRun | null>(null);
  const [selectedResultIds, setSelectedResultIds] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const surfaceSx = {
    borderRadius: "14px",
    border: "1px solid",
    borderColor: theme.palette.mode === "dark" ? alpha("#93a9c8", 0.18) : alpha("#94a3b8", 0.28),
    background:
      theme.palette.mode === "dark"
        ? `linear-gradient(180deg, ${alpha("#132238", 0.96)}, ${alpha("#0b1728", 0.98)})`
        : "rgba(255,255,255,0.94)",
    boxShadow:
      theme.palette.mode === "dark"
        ? `0 18px 46px ${alpha("#020617", 0.46)}, inset 0 1px 0 ${alpha("#fff", 0.04)}`
        : `0 16px 38px ${alpha("#0f172a", 0.10)}, inset 0 1px 0 ${alpha("#fff", 0.95)}`,
  };

  const loadRadar = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("country", country);
      params.set("timeframeDays", String(timeframeDays));
      if (regions.length) params.set("regions", regions.join(","));
      if (categories.length) params.set("categories", categories.join(","));
      const res = await fetch(`/api/admin/revenue-radar?${params.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to load Revenue Radar");
      setData(json as RadarData);
      if (json?.recommendations?.keywords) {
        setKeywords((current) => current || json.recommendations.keywords);
      }
      if (json?.recommendations?.maxResults) setMaxResults(json.recommendations.maxResults);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load Revenue Radar");
    } finally {
      setLoading(false);
    }
  }, [categories, country, regions, timeframeDays]);

  useEffect(() => {
    loadRadar();
  }, [loadRadar]);

  const pollRun = useCallback(async (runId: string) => {
    const res = await fetch(`/api/admin/crm/leads/auto-find/runs/${encodeURIComponent(runId)}`, { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || "Failed to load prospect search");
    setRun(json as AutoFindRun);
  }, []);

  useEffect(() => {
    if (!run?.runId || run.status === "completed" || run.status === "failed") return;
    const id = window.setInterval(() => {
      pollRun(run.runId).catch((e) => setError(e instanceof Error ? e.message : "Failed to poll prospect search"));
    }, 3000);
    return () => window.clearInterval(id);
  }, [pollRun, run?.runId, run?.status]);

  const regionOptions = useMemo(() => {
    if (!data) return [];
    return country === "Canada" ? data.options.canadaProvinces : data.options.usStates;
  }, [country, data]);

  const selectedCategoryLabels = useMemo(() => {
    const options = data?.options.categories || [];
    return categories.map((id) => options.find((entry) => entry.id === id)?.label || id).join(", ");
  }, [categories, data?.options.categories]);

  function toggleValue(value: string, current: string[], setNext: (next: string[]) => void) {
    setNext(current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value]);
  }

  function applyRecommendation() {
    if (!data) return;
    setCountry(data.recommendations.country);
    setRegions(data.recommendations.regions);
    setCategories(data.recommendations.categories);
    setKeywords(data.recommendations.keywords);
    setMaxResults(data.recommendations.maxResults);
  }

  async function startSearch() {
    try {
      setSearching(true);
      setError(null);
      setToast(null);
      setSelectedResultIds([]);
      const body = {
        country,
        regions,
        categories: categories.length ? categories : data?.recommendations.categories || [],
        keywords,
        maxResults,
      };
      const res = await fetch("/api/admin/revenue-radar/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to start prospect search");
      setRun({
        runId: json.runId,
        status: json.status || "queued",
        progress: Number(json.progress || 0),
        message: json.message || "Queued",
        items: [],
        searched: 0,
        duplicateCount: 0,
      });
      setToast("Prospect search started. Results will appear as batches complete.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start prospect search");
    } finally {
      setSearching(false);
    }
  }

  async function importResults(resultIds: string[]) {
    if (resultIds.length === 0) return;
    try {
      setImporting(true);
      setError(null);
      const res = await fetch("/api/admin/crm/leads/auto-find/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultIds }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to import prospects");
      setSelectedResultIds([]);
      setToast(`Imported ${formatNumber(json?.insertedCount || json?.imported || resultIds.length)} prospect${resultIds.length === 1 ? "" : "s"} to CRM.`);
      await loadRadar();
      if (run?.runId) await pollRun(run.runId).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to import prospects");
    } finally {
      setImporting(false);
    }
  }

  const kpiCards: Array<{ label: string; value: string; icon: ReactNode; color: string }> = [
    { label: "Total leads", value: formatNumber(data?.kpis.totalLeads), icon: <AssessmentRoundedIcon />, color: "#2563eb" },
    { label: "Active pipeline", value: formatNumber(data?.kpis.activePipeline), icon: <TrendingUpRoundedIcon />, color: "#16a34a" },
    { label: "Won / Lost", value: `${formatNumber(data?.kpis.won)} / ${formatNumber(data?.kpis.lost)}`, icon: <CheckCircleRoundedIcon />, color: "#7c3aed" },
    { label: "Proposal stage", value: formatNumber(data?.kpis.proposalStage), icon: <CampaignRoundedIcon />, color: "#f59e0b" },
    { label: "Overdue / stale", value: `${formatNumber(data?.kpis.overdue)} / ${formatNumber(data?.kpis.stale)}`, icon: <ErrorOutlineRoundedIcon />, color: "#ef4444" },
    { label: "Conversion", value: formatPercent(data?.kpis.conversionRate), icon: <RocketLaunchRoundedIcon />, color: "#0ea5e9" },
  ];

  const runImportableIds = (run?.items || [])
    .filter((item) => item.searchResultId && !item.duplicate)
    .map((item) => item.searchResultId);

  return (
    <Box
      sx={{
        minHeight: "calc(100vh - 64px)",
        bgcolor: theme.palette.mode === "dark" ? "#07111f" : "#f3f6fb",
        p: { xs: 1.25, md: 1.75 },
      }}
    >
      <Stack spacing={1.5}>
        <Card sx={surfaceSx}>
          <CardContent sx={{ p: { xs: 2, md: 2.5 }, "&:last-child": { pb: { xs: 2, md: 2.5 } } }}>
            <Stack direction={{ xs: "column", lg: "row" }} spacing={2} alignItems={{ xs: "stretch", lg: "center" }} justifyContent="space-between">
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Chip icon={<PublicRoundedIcon />} label="Canada / US" color="primary" variant="outlined" sx={{ fontWeight: 800 }} />
                  <Chip label={`Updated ${formatDate(data?.asOf)}`} variant="outlined" />
                </Stack>
                <Typography variant="h4" sx={{ mt: 1, fontWeight: 950 }}>
                  Revenue Radar
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5, maxWidth: 920 }}>
                  Prioritize regions, find public-source prospects, and move qualified auction, appraisal, salvage, and equipment opportunities into CRM.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent={{ xs: "flex-start", lg: "flex-end" }}>
                <Button variant="outlined" startIcon={<RefreshRoundedIcon />} onClick={loadRadar} disabled={loading}>
                  Refresh
                </Button>
                <Button variant="contained" startIcon={<RocketLaunchRoundedIcon />} onClick={applyRecommendation} disabled={!data}>
                  Apply recommendation
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {error ? <Alert severity="error">{error}</Alert> : null}
        {toast ? <Alert severity="success" onClose={() => setToast(null)}>{toast}</Alert> : null}

        <Grid container spacing={1.5}>
          {kpiCards.map((card) => (
            <Grid key={card.label} size={{ xs: 6, md: 4, xl: 2 }}>
              <Card sx={{ ...surfaceSx, height: "100%" }}>
                <CardContent sx={{ p: 1.75, "&:last-child": { pb: 1.75 } }}>
                  <Stack direction="row" spacing={1.25} justifyContent="space-between" alignItems="center">
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 750 }} noWrap>
                        {card.label}
                      </Typography>
                      <Typography variant="h5" sx={{ mt: 0.4, fontWeight: 950, lineHeight: 1.05 }}>
                        {loading ? "..." : card.value}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        width: 42,
                        height: 42,
                        borderRadius: "12px",
                        display: "grid",
                        placeItems: "center",
                        color: card.color,
                        bgcolor: alpha(card.color, theme.palette.mode === "dark" ? 0.18 : 0.11),
                        flexShrink: 0,
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

        <Grid container spacing={1.5} alignItems="stretch">
          <Grid size={{ xs: 12, xl: 4 }}>
            <Card sx={{ ...surfaceSx, height: "100%" }}>
              <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  Target controls
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Filters affect analytics and provide defaults for Prospect Scout.
                </Typography>

                <Stack spacing={1.5} sx={{ mt: 2 }}>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    {(["Canada", "United States"] as RadarCountry[]).map((item) => (
                      <Button
                        key={item}
                        variant={country === item ? "contained" : "outlined"}
                        onClick={() => {
                          setCountry(item);
                          setRegions([]);
                        }}
                        size="small"
                      >
                        {item}
                      </Button>
                    ))}
                  </Stack>

                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    {(data?.options.timeframeDays || [30, 60, 90, 180, 365]).map((days) => (
                      <Chip
                        key={days}
                        clickable
                        label={`${days}d`}
                        color={timeframeDays === days ? "primary" : "default"}
                        variant={timeframeDays === days ? "filled" : "outlined"}
                        onClick={() => setTimeframeDays(days)}
                      />
                    ))}
                  </Stack>

                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 750 }}>
                      Regions
                    </Typography>
                    <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 0.75, maxHeight: 132, overflow: "auto", pr: 0.5 }}>
                      {regionOptions.map((region) => (
                        <Chip
                          key={region}
                          clickable
                          size="small"
                          label={region}
                          color={regions.includes(region) ? "primary" : "default"}
                          variant={regions.includes(region) ? "filled" : "outlined"}
                          onClick={() => toggleValue(region, regions, setRegions)}
                        />
                      ))}
                    </Stack>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 750 }}>
                      Revenue categories
                    </Typography>
                    <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 0.75 }}>
                      {(data?.options.categories || []).map((category) => (
                        <Chip
                          key={category.id}
                          clickable
                          size="small"
                          label={category.label}
                          color={categories.includes(category.id) ? "secondary" : "default"}
                          variant={categories.includes(category.id) ? "filled" : "outlined"}
                          onClick={() => toggleValue(category.id, categories, setCategories)}
                        />
                      ))}
                    </Stack>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, xl: 8 }}>
            <Card sx={{ ...surfaceSx, height: "100%" }}>
              <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between">
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>
                      Opportunity map
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Score blends CRM volume, proposals, wins, public prospects, overdue work, and stale follow-ups.
                    </Typography>
                  </Box>
                  <Chip label={data?.recommendations.rationale || "Loading recommendation"} color="primary" variant="outlined" sx={{ maxWidth: { md: 480 } }} />
                </Stack>

                <Grid container spacing={1.25} sx={{ mt: 1.5 }}>
                  {(data?.regionBreakdown || []).slice(0, 6).map((row) => (
                    <Grid key={`${row.country}-${row.region}`} size={{ xs: 12, md: 6, xl: 4 }}>
                      <Box
                        sx={{
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: "12px",
                          p: 1.5,
                          height: "100%",
                          bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === "dark" ? 0.34 : 0.64),
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" spacing={1}>
                          <Box minWidth={0}>
                            <Typography sx={{ fontWeight: 900 }} noWrap>
                              {row.region}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {row.country || "Mixed"}
                            </Typography>
                          </Box>
                          <Chip label={`${row.score}`} color={row.score >= 70 ? "success" : row.score >= 40 ? "warning" : "default"} size="small" />
                        </Stack>
                        <LinearProgress
                          value={row.score}
                          variant="determinate"
                          sx={{ mt: 1.25, height: 6, borderRadius: 999 }}
                        />
                        <Grid container spacing={1} sx={{ mt: 1 }}>
                          {[
                            ["Leads", row.totalLeads],
                            ["Pipeline", row.activePipeline],
                            ["Public", row.autoFound],
                            ["Overdue", row.overdue],
                          ].map(([label, value]) => (
                            <Grid key={label} size={6}>
                              <Typography variant="caption" color="text.secondary">{label}</Typography>
                              <Typography sx={{ fontWeight: 850 }}>{formatNumber(Number(value))}</Typography>
                            </Grid>
                          ))}
                        </Grid>
                        <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                          {row.topCategories.map((category) => (
                            <Chip key={category.id} label={category.label} size="small" variant="outlined" />
                          ))}
                        </Stack>
                      </Box>
                    </Grid>
                  ))}
                  {!loading && (data?.regionBreakdown || []).length === 0 ? (
                    <Grid size={12}>
                      <Alert severity="info">No CRM activity matched these filters yet. Start Prospect Scout to build a public-source pipeline.</Alert>
                    </Grid>
                  ) : null}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, xl: 5 }}>
            <Card sx={{ ...surfaceSx, height: "100%" }}>
              <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>
                      Prospect Scout
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Finds public indexed companies and keeps source evidence for CRM review.
                    </Typography>
                  </Box>
                  <Button variant="contained" startIcon={<SearchRoundedIcon />} onClick={startSearch} disabled={searching}>
                    {searching ? "Starting..." : "Start search"}
                  </Button>
                </Stack>

                <Grid container spacing={1.25} sx={{ mt: 1.5 }}>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Keywords"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      placeholder="auction, asset recovery, fleet disposal..."
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 5 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Max results"
                      type="number"
                      value={maxResults}
                      onChange={(e) => setMaxResults(Math.min(Number(data?.options.maxResults || 100), Math.max(1, Number(e.target.value || 1))))}
                      inputProps={{ min: 1, max: data?.options.maxResults || 100 }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 7 }}>
                    <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: "10px", p: 1 }}>
                      <Typography variant="caption" color="text.secondary">Search target</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>
                        {country} {regions.length ? `- ${regions.join(", ")}` : "- all regions"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {selectedCategoryLabels || "Recommended categories"}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                {run ? (
                  <Box sx={{ mt: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                      <Typography sx={{ fontWeight: 850 }}>
                        {statusLabel(run.status)} - {run.message}
                      </Typography>
                      <Chip size="small" label={`${Math.round(run.progress || 0)}%`} />
                    </Stack>
                    <LinearProgress value={run.progress || 0} variant="determinate" sx={{ mt: 1, height: 7, borderRadius: 999 }} />
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                      <Chip size="small" label={`${formatNumber(run.items?.length || 0)} found`} />
                      <Chip size="small" label={`${formatNumber(run.duplicateCount || 0)} duplicates`} />
                      {run.error ? <Chip size="small" color="warning" label={run.error} /> : null}
                    </Stack>
                  </Box>
                ) : null}

                <Divider sx={{ my: 2 }} />

                <Stack spacing={1}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                    Category signals
                  </Typography>
                  {(data?.categoryBreakdown || []).slice(0, 5).map((category) => (
                    <Box key={category.id}>
                      <Stack direction="row" justifyContent="space-between" spacing={1}>
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>{category.label}</Typography>
                        <Typography variant="body2" color="text.secondary">{category.score}</Typography>
                      </Stack>
                      <LinearProgress value={category.score} variant="determinate" sx={{ height: 5, borderRadius: 999 }} />
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, xl: 7 }}>
            <Card sx={{ ...surfaceSx, height: "100%" }}>
              <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>
                      Search results
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Review public-source evidence before importing into CRM.
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    color="success"
                    disabled={selectedResultIds.length === 0 || importing}
                    onClick={() => importResults(selectedResultIds)}
                  >
                    Import selected
                  </Button>
                </Stack>

                <TableContainer sx={{ mt: 1.5, maxHeight: 390 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox">
                          <Checkbox
                            size="small"
                            checked={runImportableIds.length > 0 && selectedResultIds.length === runImportableIds.length}
                            indeterminate={selectedResultIds.length > 0 && selectedResultIds.length < runImportableIds.length}
                            onChange={(e) => setSelectedResultIds(e.target.checked ? runImportableIds : [])}
                          />
                        </TableCell>
                        <TableCell>Company</TableCell>
                        <TableCell>Location</TableCell>
                        <TableCell>Fit</TableCell>
                        <TableCell>Source</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(run?.items || []).map((item) => {
                        const lead = item.lead || {};
                        const id = item.searchResultId;
                        const disabled = !id || item.duplicate;
                        return (
                          <TableRow key={id || `${lead.companyName}-${lead.sourceUrl}`} hover>
                            <TableCell padding="checkbox">
                              <Checkbox
                                size="small"
                                disabled={disabled}
                                checked={selectedResultIds.includes(id)}
                                onChange={() => toggleValue(id, selectedResultIds, setSelectedResultIds)}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 850 }}>
                                {lead.companyName || item.draftPreview?.companyName || "Unknown company"}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {lead.industry || item.draftPreview?.industry || (item.duplicate ? "Duplicate" : "Public prospect")}
                              </Typography>
                            </TableCell>
                            <TableCell>{lead.companyLocation || lead.contactLocation || item.draftPreview?.companyLocation || "--"}</TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                color={item.duplicate ? "warning" : "success"}
                                label={item.duplicate ? "Duplicate" : `${Math.round(Number(lead.confidence || 0) * 100)}%`}
                              />
                            </TableCell>
                            <TableCell>
                              {lead.sourceUrl ? (
                                <Button size="small" component="a" href={lead.sourceUrl} target="_blank" rel="noreferrer" endIcon={<OpenInNewRoundedIcon />}>
                                  Source
                                </Button>
                              ) : (
                                "--"
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {!run?.items?.length ? (
                        <TableRow>
                          <TableCell colSpan={5}>
                            <Typography color="text.secondary">Start a prospect search to populate this table.</Typography>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, xl: 8 }}>
            <Card sx={surfaceSx}>
              <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  Recent public prospects
                </Typography>
                <TableContainer sx={{ mt: 1, maxHeight: 360 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Company</TableCell>
                        <TableCell>Region</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell>Confidence</TableCell>
                        <TableCell>Suggested agent</TableCell>
                        <TableCell align="right">Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(data?.recentProspects || []).map((item) => (
                        <TableRow key={item.id} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 850 }}>{item.companyName || item.clientName || "Unknown company"}</Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>{item.evidence || item.sourceTitle || item.website}</Typography>
                          </TableCell>
                          <TableCell>{item.location || item.regions.join(", ") || item.country || "--"}</TableCell>
                          <TableCell>{item.category.label}</TableCell>
                          <TableCell>{item.confidence}%</TableCell>
                          <TableCell>{item.suggestedAgent?.label || "--"}</TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              {item.sourceUrl ? (
                                <Button size="small" component="a" href={item.sourceUrl} target="_blank" rel="noreferrer">
                                  Source
                                </Button>
                              ) : null}
                              <Button
                                size="small"
                                variant="outlined"
                                disabled={item.status === "imported" || importing}
                                onClick={() => importResults([item.id])}
                              >
                                {item.status === "imported" ? "Imported" : "Import"}
                              </Button>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                      {!loading && !(data?.recentProspects || []).length ? (
                        <TableRow>
                          <TableCell colSpan={6}>
                            <Typography color="text.secondary">No public-source prospects found for these filters yet.</Typography>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, xl: 4 }}>
            <Stack spacing={1.5}>
              <Card sx={surfaceSx}>
                <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>
                    Follow-up risk
                  </Typography>
                  <Stack spacing={1} sx={{ mt: 1 }}>
                    {(data?.staleLeads || []).slice(0, 5).map((lead) => (
                      <Box key={lead.id} sx={{ border: "1px solid", borderColor: "divider", borderRadius: "10px", p: 1 }}>
                        <Stack direction="row" justifyContent="space-between" spacing={1}>
                          <Typography variant="body2" sx={{ fontWeight: 850 }} noWrap>
                            {lead.companyName || lead.clientName || "Lead"}
                          </Typography>
                          <Chip size="small" color={lead.overdue ? "error" : "warning"} label={lead.overdue ? "Overdue" : "Stale"} />
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {statusLabel(lead.status)} - {lead.assignedTo || "Unassigned"} - due {formatDate(lead.dueDate)}
                        </Typography>
                      </Box>
                    ))}
                    {!data?.staleLeads?.length ? <Typography color="text.secondary">No overdue or stale lead risk in this view.</Typography> : null}
                  </Stack>
                </CardContent>
              </Card>

              <Card sx={surfaceSx}>
                <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>
                    Official context
                  </Typography>
                  <Stack spacing={1} sx={{ mt: 1 }}>
                    {(data?.marketSources || []).map((source) => (
                      <Box key={source.url} sx={{ border: "1px solid", borderColor: "divider", borderRadius: "10px", p: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 850 }}>{source.title}</Typography>
                        <Typography variant="caption" color="text.secondary">{source.note}</Typography>
                        <Button size="small" component="a" href={source.url} target="_blank" rel="noreferrer" endIcon={<OpenInNewRoundedIcon />}>
                          Open
                        </Button>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>

        <Grid container spacing={1.5}>
          {(data?.compliance || []).map((item) => (
            <Grid key={item.region} size={{ xs: 12, md: 6 }}>
              <Alert
                severity="info"
                icon={<ErrorOutlineRoundedIcon />}
                sx={{
                  borderRadius: "12px",
                  border: "1px solid",
                  borderColor: alpha(theme.palette.info.main, 0.25),
                }}
              >
                <Typography sx={{ fontWeight: 900 }}>{item.title}</Typography>
                <Stack component="ul" sx={{ pl: 2, my: 0.5 }}>
                  {item.bullets.map((bullet) => (
                    <Typography key={bullet} component="li" variant="body2">
                      {bullet}
                    </Typography>
                  ))}
                </Stack>
                <Button size="small" component="a" href={item.url} target="_blank" rel="noreferrer">
                  Review guidance
                </Button>
              </Alert>
            </Grid>
          ))}
        </Grid>
      </Stack>
    </Box>
  );
}
