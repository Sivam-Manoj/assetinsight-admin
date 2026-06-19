"use client";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AndroidRoundedIcon from "@mui/icons-material/AndroidRounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

type ApkRelease = {
  id: string;
  latestVersionName?: string;
  latestVersionCode?: number;
  versionName: string;
  versionCode: number;
  releaseNotes?: string;
  mandatory: boolean;
  downloadUrl: string;
  apkUrl?: string;
  sizeBytes: number;
  sha256?: string;
  originalName?: string;
  isActive: boolean;
  uploadedBy?: { username?: string; email?: string } | null;
  createdAt?: string;
};

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function formatDate(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

export default function ApkManagerPage() {
  const [releases, setReleases] = useState<ApkRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [versionName, setVersionName] = useState("");
  const [versionCode, setVersionCode] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [mandatory, setMandatory] = useState(false);
  const [apkFile, setApkFile] = useState<File | null>(null);

  const latest = useMemo(() => releases.find((release) => release.isActive) || releases[0], [releases]);

  async function loadReleases() {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/admin/apk-releases", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to load APK releases");
      setReleases(Array.isArray(data?.data) ? data.data : []);
    } catch (err: any) {
      setError(err?.message || "Failed to load APK releases");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReleases();
  }, []);

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setApkFile(event.target.files?.[0] || null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!apkFile) {
      setError("Choose an APK file before uploading.");
      return;
    }

    try {
      setUploading(true);
      setError("");
      setSuccess("");
      const formData = new FormData();
      formData.append("apk", apkFile);
      formData.append("versionName", versionName.trim());
      formData.append("versionCode", versionCode.trim());
      formData.append("releaseNotes", releaseNotes.trim());
      formData.append("mandatory", mandatory ? "true" : "false");

      const res = await fetch("/api/admin/apk-releases", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to upload APK");

      setSuccess("APK uploaded and activated.");
      setVersionName("");
      setVersionCode("");
      setReleaseNotes("");
      setMandatory(false);
      setApkFile(null);
      const input = document.getElementById("apk-file-input") as HTMLInputElement | null;
      if (input) input.value = "";
      await loadReleases();
    } catch (err: any) {
      setError(err?.message || "Failed to upload APK");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        p: { xs: 2, md: 3 },
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", md: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h3" fontWeight={900} letterSpacing={-1}>
            APK Manager
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Upload Android builds, publish the latest APK, and control optional or mandatory updates.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshRoundedIcon />}
          onClick={loadReleases}
          disabled={loading || uploading}
          sx={{ alignSelf: { xs: "flex-start", md: "center" } }}
        >
          Refresh
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "minmax(320px, 0.8fr) minmax(0, 1.6fr)" },
          gap: 2.5,
        }}
      >
        <Box>
          <Card sx={{ borderRadius: 4, boxShadow: "0 18px 48px rgba(15,23,42,0.08)" }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 3,
                    display: "grid",
                    placeItems: "center",
                    bgcolor: "success.light",
                    color: "success.contrastText",
                  }}
                >
                  <AndroidRoundedIcon />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={900}>
                    Latest Android APK
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Public website and app update checks use this release.
                  </Typography>
                </Box>
              </Stack>

              {latest ? (
                <Stack spacing={1.25}>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip color="primary" label={`v${latest.versionName}`} sx={{ fontWeight: 800 }} />
                    <Chip label={`Code ${latest.versionCode}`} />
                    <Chip
                      color={latest.mandatory ? "error" : "success"}
                      variant={latest.mandatory ? "filled" : "outlined"}
                      label={latest.mandatory ? "Mandatory" : "Optional"}
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    Uploaded {formatDate(latest.createdAt)} by{" "}
                    {latest.uploadedBy?.username || latest.uploadedBy?.email || "admin"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Size: {formatBytes(latest.sizeBytes)}
                  </Typography>
                  <Button
                    component="a"
                    href={latest.downloadUrl || latest.apkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="contained"
                    startIcon={<DownloadRoundedIcon />}
                    sx={{ alignSelf: "flex-start", mt: 1 }}
                  >
                    Download APK
                  </Button>
                </Stack>
              ) : (
                <Typography color="text.secondary">No APK has been uploaded yet.</Typography>
              )}
            </CardContent>
          </Card>

          <Card sx={{ mt: 2.5, borderRadius: 4 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={900} sx={{ mb: 2 }}>
                Upload new version
              </Typography>
              <Box component="form" onSubmit={onSubmit}>
                <Stack spacing={2}>
                  <Button
                    component="label"
                    variant="outlined"
                    startIcon={<CloudUploadRoundedIcon />}
                    disabled={uploading}
                  >
                    Choose APK
                    <input id="apk-file-input" hidden type="file" accept=".apk,application/vnd.android.package-archive" onChange={onFileChange} />
                  </Button>
                  {apkFile && (
                    <Typography variant="body2" color="text.secondary">
                      {apkFile.name} · {formatBytes(apkFile.size)}
                    </Typography>
                  )}
                  <TextField
                    label="Version name"
                    placeholder="1.0.8"
                    value={versionName}
                    onChange={(event) => setVersionName(event.target.value)}
                    required
                    fullWidth
                  />
                  <TextField
                    label="Version code"
                    placeholder="108"
                    type="number"
                    value={versionCode}
                    onChange={(event) => setVersionCode(event.target.value)}
                    required
                    fullWidth
                    inputProps={{ min: 1, step: 1 }}
                  />
                  <TextField
                    label="Release notes"
                    value={releaseNotes}
                    onChange={(event) => setReleaseNotes(event.target.value)}
                    fullWidth
                    multiline
                    minRows={4}
                  />
                  <FormControlLabel
                    control={<Switch checked={mandatory} onChange={(event) => setMandatory(event.target.checked)} />}
                    label="Mandatory update"
                  />
                  {mandatory && (
                    <Alert severity="warning">
                      Mandatory updates block old Android versions until users start the installer.
                    </Alert>
                  )}
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={uploading}
                    startIcon={uploading ? <CircularProgress size={18} color="inherit" /> : <CloudUploadRoundedIcon />}
                  >
                    {uploading ? "Uploading..." : "Upload and activate"}
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box>
          <Paper sx={{ borderRadius: 4, overflow: "hidden" }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "stretch", sm: "center" }}
              spacing={1}
              sx={{ p: 2.5 }}
            >
              <Box>
                <Typography variant="h6" fontWeight={900}>
                  Release history
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Older entries stay available for audit; the newest upload becomes the active APK.
                </Typography>
              </Box>
              <Chip label={`${releases.length} releases`} />
            </Stack>
            <Divider />
            {loading ? (
              <Box sx={{ p: 6, textAlign: "center" }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Version</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Size</TableCell>
                      <TableCell>Uploaded</TableCell>
                      <TableCell>Notes</TableCell>
                      <TableCell align="right">Download</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {releases.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                            No APK releases yet.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      releases.map((release) => (
                        <TableRow key={release.id} hover>
                          <TableCell>
                            <Typography fontWeight={900}>v{release.versionName}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Code {release.versionCode}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                              {release.isActive && <Chip size="small" color="primary" label="Active" />}
                              <Chip
                                size="small"
                                color={release.mandatory ? "error" : "success"}
                                variant={release.mandatory ? "filled" : "outlined"}
                                label={release.mandatory ? "Mandatory" : "Optional"}
                              />
                            </Stack>
                          </TableCell>
                          <TableCell>{formatBytes(release.sizeBytes)}</TableCell>
                          <TableCell>
                            <Typography variant="body2">{formatDate(release.createdAt)}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {release.uploadedBy?.username || release.uploadedBy?.email || "admin"}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ maxWidth: 280 }}>
                            <Typography variant="body2" color="text.secondary" noWrap>
                              {release.releaseNotes || "-"}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              component="a"
                              href={release.downloadUrl || release.apkUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              startIcon={<DownloadRoundedIcon />}
                            >
                              APK
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
