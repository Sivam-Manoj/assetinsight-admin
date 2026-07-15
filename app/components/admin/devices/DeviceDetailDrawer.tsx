"use client";

import {
  Ban,
  Camera,
  Check,
  Clock3,
  HardDrive,
  Laptop,
  Network,
  RotateCcw,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Typography,
  alpha,
} from "@mui/material";
import { ADMIN_MOBILE_TITLEBAR_HEIGHT } from "@/app/components/common/adminLayout.constants";
import type {
  DeviceDetailResponse,
  DeviceRegistration,
  IpObservation,
} from "./types";

type Props = {
  open: boolean;
  loading: boolean;
  detail: DeviceDetailResponse | null;
  onClose: () => void;
  onAction: (
    action: "approve" | "approve_all" | "reject" | "revoke" | "restore" | "disable_all",
    device: DeviceRegistration
  ) => void;
  onIpAction: (ip: IpObservation, blocked: boolean) => void;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown, fallback = "Not reported") {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return fallback;
}

function bytes(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Not reported";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = Math.max(0, value);
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size >= 10 || index === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[index]}`;
}

function dateTime(value?: string) {
  if (!value) return "Not recorded";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "Not recorded"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(parsed);
}

function DetailSection({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof UserRound;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      component="section"
      sx={{ border: "1px solid", borderColor: "divider", p: 1.75, bgcolor: "background.paper" }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.35 }}>
        <Icon size={18} strokeWidth={1.9} />
        <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{title}</Typography>
      </Stack>
      {children}
    </Box>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "minmax(100px, 42%) 1fr", gap: 1.5, py: 0.45 }}>
      <Typography sx={{ color: "text.secondary", fontSize: 12.5 }}>{label}</Typography>
      <Typography component="div" sx={{ minWidth: 0, overflowWrap: "anywhere", fontSize: 12.5, fontWeight: 500 }}>
        {value}
      </Typography>
    </Box>
  );
}

function cameraSummary(metadata: Record<string, unknown>) {
  const camera = asRecord(metadata.camera);
  const devices = Array.isArray(camera.devices) ? camera.devices : [];
  const first = asRecord(devices[0]);
  const capability = asRecord(first.capabilities);
  const width = asRecord(capability.width);
  const height = asRecord(capability.height);
  const maxResolution =
    width.max && height.max ? `${text(width.max)} × ${text(height.max)}` : text(first.maxResolution);
  return {
    verification: text(camera.verification),
    count: text(camera.count ?? devices.length, "0"),
    lens: text(first.label || first.position || first.name),
    resolution: maxResolution,
  };
}

export default function DeviceDetailDrawer({
  open,
  loading,
  detail,
  onClose,
  onAction,
  onIpAction,
}: Props) {
  const device = detail?.device;
  const metadata = asRecord(device?.metadata);
  const browser = asRecord(metadata.browser);
  const os = asRecord(metadata.os);
  const app = asRecord(metadata.app);
  const screen = asRecord(metadata.screen);
  const storage = asRecord(metadata.storage || metadata.disk);
  const camera = cameraSummary(metadata);
  const canDecide = device && ["pending", "rerequest_pending"].includes(device.status);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        role: "dialog",
        "aria-modal": true,
        "aria-labelledby": "device-detail-title",
        sx: {
          width: { xs: "100%", sm: 460 },
          maxWidth: "100vw",
          top: { xs: ADMIN_MOBILE_TITLEBAR_HEIGHT, lg: 0 },
          height: {
            xs: `calc(100dvh - ${ADMIN_MOBILE_TITLEBAR_HEIGHT}px)`,
            lg: "100%",
          },
          maxHeight: {
            xs: `calc(100dvh - ${ADMIN_MOBILE_TITLEBAR_HEIGHT}px)`,
            lg: "100%",
          },
          borderLeft: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
        },
      }}
    >
      <Box sx={{ display: "flex", height: "100%", minHeight: 0, flexDirection: "column" }}>
        <Box sx={{ position: "sticky", top: 0, zIndex: 2, flexShrink: 0, borderBottom: "1px solid", borderColor: "divider", bgcolor: "background.paper", px: 2.25, py: 1.75 }}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
            <Box>
              <Typography id="device-detail-title" component="h2" sx={{ fontSize: 20, fontWeight: 700 }}>Device request</Typography>
              <Typography sx={{ mt: 0.35, color: "text.secondary", fontSize: 12 }}>
                {device ? `Request ${device.id.slice(-10).toUpperCase()}` : "Loading request"}
              </Typography>
              {device ? (
                <Chip
                  size="small"
                  label={device.status.replaceAll("_", " ")}
                  color={device.status === "approved" ? "success" : device.status === "pending" || device.status === "rerequest_pending" ? "warning" : "error"}
                  variant="outlined"
                  sx={{ mt: 1, textTransform: "capitalize" }}
                />
              ) : null}
            </Box>
            <IconButton aria-label="Close device details" onClick={onClose} size="small"><X size={19} /></IconButton>
          </Stack>
        </Box>

        {loading ? (
          <Box sx={{ display: "grid", flex: 1, placeItems: "center", minHeight: 320 }}>
            <CircularProgress size={28} />
          </Box>
        ) : device ? (
          <Stack spacing={1.25} sx={{ minHeight: 0, flex: 1, overflowY: "auto", p: 2.25, pb: 3 }}>
            <DetailSection icon={UserRound} title="User">
              <DetailRow label="Name" value={device.user.username || device.user.companyName || "Not provided"} />
              <DetailRow label="Email" value={device.user.email} />
              <DetailRow
                label="Approval policy"
                value={device.user.deviceApprovalMode === "all_devices" ? "All future devices" : "Per device"}
              />
            </DetailSection>

            <DetailSection icon={Laptop} title="Device identity">
              <DetailRow label="Installation type" value={device.platform === "web" ? "Web browser" : "Native app"} />
              <DetailRow label="Platform" value={`${text(os.name, device.platform)} ${text(os.version, "")}`.trim()} />
              <DetailRow label="Model" value={text(metadata.model || metadata.deviceModel || device.displayName)} />
              <DetailRow
                label="Browser / App"
                value={
                  device.platform === "web"
                    ? `${text(browser.name)} ${text(browser.version, "")}`.trim()
                    : `${text(app.version)}${app.build ? ` (${text(app.build)})` : ""}`
                }
              />
              <DetailRow
                label="Screen / Form factor"
                value={`${text(screen.width)} × ${text(screen.height)} · ${device.formFactor}`}
              />
            </DetailSection>

            <DetailSection icon={Camera} title="Camera">
              <DetailRow label="Verification" value={camera.verification.replaceAll("_", " ")} />
              <DetailRow label="Camera count" value={camera.count} />
              <DetailRow label="Primary lens" value={camera.lens} />
              <DetailRow label="Capability range" value={camera.resolution} />
            </DetailSection>

            <DetailSection icon={HardDrive} title="Storage">
              <DetailRow
                label="Type"
                value={device.platform === "web" ? "Browser-origin storage quota" : "Device disk"}
              />
              <DetailRow label="Quota / Total" value={bytes(storage.quotaBytes ?? storage.totalBytes)} />
              <DetailRow label="Available / Free" value={bytes(storage.availableBytes ?? storage.freeBytes)} />
              {storage.usageBytes !== undefined ? <DetailRow label="Origin usage" value={bytes(storage.usageBytes)} /> : null}
            </DetailSection>

            <DetailSection icon={Network} title="IP history">
              {detail.ipObservations.length ? (
                <Stack divider={<Divider flexItem />}>
                  {detail.ipObservations.map((ip) => (
                    <Box key={ip.id || ip._id} sx={{ py: 0.75 }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontFamily: "var(--font-geist-mono)", fontSize: 12.5, fontWeight: 650 }}>{ip.ip}</Typography>
                          <Typography sx={{ color: "text.secondary", fontSize: 11.5 }}>
                            First seen {dateTime(ip.firstSeenAt)} · Last seen {dateTime(ip.lastSeenAt)} · {ip.count || 0} requests
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          color={ip.blocked ? "success" : "error"}
                          variant="text"
                          startIcon={ip.blocked ? <RotateCcw size={14} /> : <Ban size={14} />}
                          onClick={() => onIpAction(ip, !ip.blocked)}
                        >
                          {ip.blocked ? "Unblock" : "Block"}
                        </Button>
                      </Stack>
                      {ip.blockReason ? <Typography sx={{ mt: 0.5, color: "text.secondary", fontSize: 11.5 }}>Reason: {ip.blockReason}</Typography> : null}
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography sx={{ color: "text.secondary", fontSize: 12.5 }}>No IP observations recorded.</Typography>
              )}
            </DetailSection>

            <DetailSection icon={Clock3} title="Request timeline">
              <Stack spacing={1.25}>
                {detail.audit.length ? detail.audit.map((event) => (
                  <Box key={event._id} sx={{ position: "relative", pl: 2.25, "&::before": { content: '""', position: "absolute", left: 3, top: 6, width: 7, height: 7, borderRadius: "50%", bgcolor: "primary.main" } }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 650 }}>{event.action.replaceAll(".", " ")}</Typography>
                    <Typography sx={{ color: "text.secondary", fontSize: 11.5 }}>{dateTime(event.createdAt)}{event.actor?.email ? ` · ${event.actor.email}` : ""}</Typography>
                    {event.reason ? <Typography sx={{ mt: 0.35, fontSize: 11.5 }}>{event.reason}</Typography> : null}
                  </Box>
                )) : (
                  <Typography sx={{ color: "text.secondary", fontSize: 12.5 }}>No audit events recorded.</Typography>
                )}
              </Stack>
            </DetailSection>
          </Stack>
        ) : (
          <Box sx={{ display: "grid", flex: 1, placeItems: "center", p: 4 }}>
            <Typography color="text.secondary">Device details are unavailable.</Typography>
          </Box>
        )}

        {device ? (
          <Box sx={{ position: "sticky", bottom: 0, zIndex: 2, flexShrink: 0, borderTop: "1px solid", borderColor: "divider", bgcolor: (theme) => alpha(theme.palette.background.paper, 0.97), p: 1.75, backdropFilter: "blur(8px)" }}>
            {canDecide ? (
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Button fullWidth color="error" variant="outlined" startIcon={<Ban size={16} />} onClick={() => onAction("reject", device)}>Reject</Button>
                <Button fullWidth color="secondary" variant="outlined" startIcon={<ShieldCheck size={16} />} onClick={() => onAction("approve_all", device)}>Approve all</Button>
                <Button fullWidth variant="contained" startIcon={<Check size={16} />} onClick={() => onAction("approve", device)}>Approve device</Button>
              </Stack>
            ) : (
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                {device.status === "approved" ? (
                  <Button fullWidth color="error" variant="outlined" startIcon={<Ban size={16} />} onClick={() => onAction("revoke", device)}>Revoke device</Button>
                ) : (
                  <Button fullWidth variant="contained" startIcon={<RotateCcw size={16} />} onClick={() => onAction("restore", device)}>Restore device</Button>
                )}
                {device.user.deviceApprovalMode === "all_devices" ? (
                  <Button fullWidth color="secondary" variant="outlined" onClick={() => onAction("disable_all", device)}>Require per-device approval</Button>
                ) : null}
              </Stack>
            )}
          </Box>
        ) : null}
      </Box>
    </Drawer>
  );
}
