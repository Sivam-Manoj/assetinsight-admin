"use client";

import RefreshRounded from "@mui/icons-material/RefreshRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useRef, useState } from "react";
import { visibleCreditWarnings } from "@/lib/creditWarnings";

type OpenAICredits = {
  remainingCredits?: number | null;
  totalGrantedCredits?: number | null;
  requestCount?: number | null;
  webSearchCount?: number | null;
  lowBalanceThreshold?: number | null;
  usageSourceAvailable?: boolean;
  status?: string;
  syncedAt?: string;
  warnings?: string[];
};

function finiteNumber(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value: unknown): string {
  const parsed = finiteNumber(value);
  return parsed === null ? "--" : parsed.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatStatus(value?: string): string {
  return typeof value === "string" && value.trim()
    ? value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "--";
}

function formatSyncedAt(value?: string): string {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "--"
    : date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function DashboardCredits() {
  const [credits, setCredits] = useState<OpenAICredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  const loadCredits = useCallback(async (sync = false) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(sync ? "/api/admin/openai-credits/sync" : "/api/admin/openai-credits", {
        method: sync ? "POST" : "GET",
        cache: "no-store",
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || "Failed to load OpenAI credits.");
      const nextCredits = payload?.data ?? payload;
      if (!nextCredits || typeof nextCredits !== "object" || Array.isArray(nextCredits)) {
        throw new Error("OpenAI credits returned an unreadable response. Please retry.");
      }
      if (!controller.signal.aborted) setCredits(nextCredits);
    } catch (currentError) {
      if (!controller.signal.aborted) {
        setError(currentError instanceof Error ? currentError.message : "Failed to load OpenAI credits.");
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCredits();
    return () => requestRef.current?.abort();
  }, [loadCredits]);

  const balance = finiteNumber(credits?.remainingCredits);
  const lowThreshold = finiteNumber(credits?.lowBalanceThreshold) ?? 100;
  const isLow = balance !== null && balance < lowThreshold;
  const warnings = visibleCreditWarnings(credits?.warnings);
  if (credits?.usageSourceAvailable === false && warnings.length === 0) {
    warnings.push("OpenAI usage is currently unavailable; this balance may not include the latest usage.");
  }
  const warning = warnings.join(" ");
  const message = [error ? `${error}${credits ? " Showing the last loaded balance." : ""}` : "", warning].filter(Boolean).join(" ");
  const metrics = [
    { label: "Remaining", value: credits?.remainingCredits, low: isLow },
    { label: "Budget", value: credits?.totalGrantedCredits, low: false },
    { label: "Requests", value: credits?.requestCount, low: false },
    { label: "Web searches", value: credits?.webSearchCount, low: false },
  ];

  return (
    <Box
      component="section"
      aria-label="OpenAI Credits"
      aria-busy={loading}
      sx={{ border: "1px solid", borderColor: "divider", borderRadius: "4px", bgcolor: "background.paper", minWidth: 0 }}
    >
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "minmax(130px, 1.05fr) repeat(4, minmax(0, 1fr)) minmax(142px, 1.2fr)" }, alignItems: "center", columnGap: 2, rowGap: 2, px: 2, py: 1.5 }}>
        <Box sx={{ gridColumn: { xs: "1 / -1", md: "auto" }, display: { xs: "flex", md: "block" }, justifyContent: "space-between", alignItems: "center", minWidth: 0 }}>
          <Typography component="h2" sx={{ fontSize: 13, fontWeight: 650, whiteSpace: "nowrap" }}>OpenAI Credits</Typography>
          <Button
            size="small"
            aria-label="Sync OpenAI credits"
            disabled={loading}
            onClick={() => void loadCredits(true)}
            startIcon={<RefreshRounded sx={{ fontSize: "15px !important" }} />}
            sx={{ minWidth: 0, minHeight: 30, px: 0.75, ml: { xs: 0, md: -0.75 }, mt: { xs: 0, md: 0.25 }, fontSize: 12, color: "text.secondary" }}
          >
            {loading && credits ? "Syncing…" : "Sync"}
          </Button>
        </Box>
        {metrics.map((metric) => (
          <Box key={metric.label} sx={{ minWidth: 0, borderLeft: { md: "1px solid" }, borderColor: { md: "divider" }, pl: { md: 2 } }}>
            <Typography sx={{ color: "text.secondary", fontSize: 12 }}>{metric.label}</Typography>
            <Typography sx={{ mt: 0.25, fontSize: 22, fontWeight: 650, lineHeight: 1.15, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em", color: metric.low ? "error.main" : "text.primary", overflowWrap: "anywhere" }}>
              {loading && !credits ? "…" : formatNumber(metric.value)}
            </Typography>
          </Box>
        ))}
        <Box role="status" aria-live="polite" sx={{ gridColumn: { xs: "1 / -1", md: "auto" }, minWidth: 0, borderLeft: { md: "1px solid" }, borderColor: { md: "divider" }, pl: { md: 2 } }}>
          {isLow ? <Typography sx={{ color: "error.main", fontSize: 12, fontWeight: 600 }}>Low · below {formatNumber(lowThreshold)}</Typography> : null}
          <Typography noWrap sx={{ color: "text.secondary", fontSize: 12 }} title={formatStatus(credits?.status)}>
            {loading && !credits ? "Loading credits…" : `Status · ${formatStatus(credits?.status)}`}
          </Typography>
          <Typography sx={{ mt: 0.35, fontSize: 12, color: "text.secondary" }}>Synced {formatSyncedAt(credits?.syncedAt)}</Typography>
        </Box>
      </Box>
      {message ? (
        <Tooltip title={message} placement="top" describeChild>
          <Alert
            tabIndex={0}
            severity={error ? "error" : "warning"}
            icon={false}
            action={error ? <Button color="inherit" size="small" disabled={loading} onClick={() => void loadCredits()} sx={{ minHeight: 24, py: 0, fontSize: 12 }}>Retry</Button> : undefined}
            sx={{ borderRadius: "0 0 4px 4px", borderTop: "1px solid", borderColor: "divider", px: 2, py: 0.25, fontSize: 12, "& .MuiAlert-message": { py: 0.25, minWidth: 0, overflow: { md: "hidden" }, textOverflow: { md: "ellipsis" }, whiteSpace: { md: "nowrap" } }, "& .MuiAlert-action": { pt: 0 } }}
          >
            {message}
          </Alert>
        </Tooltip>
      ) : null}
    </Box>
  );
}
