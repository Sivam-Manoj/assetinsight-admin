"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";

type SpecField = {
  _id: string;
  name: string;
  normalizedName: string;
  order: number;
};

type SpecCategory = {
  _id: string;
  name: string;
  normalizedName: string;
  description: string;
  fields: SpecField[];
  createdAt: string;
  updatedAt: string;
};

type ExtractedField = {
  name: string;
  order: number;
};

type CategoryDialogState = {
  open: boolean;
  id?: string;
  name: string;
  description: string;
};

async function readJson<T = any>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || "Request failed");
  }
  return data as T;
}

function normalizeFieldName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function categoryInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "S";
}

export default function AdminSpecSheet() {
  const [categories, setCategories] = useState<SpecCategory[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [categoryDialog, setCategoryDialog] = useState<CategoryDialogState>({
    open: false,
    name: "",
    description: "",
  });
  const [fieldDrafts, setFieldDrafts] = useState<Record<string, string>>({});
  const [newFieldName, setNewFieldName] = useState("");
  const [extractFile, setExtractFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractedFields, setExtractedFields] = useState<ExtractedField[]>([]);
  const [extractionNotes, setExtractionNotes] = useState("");

  const selectedCategory = useMemo(
    () => categories.find((category) => category._id === selectedId) || null,
    [categories, selectedId]
  );

  const loadCategories = useCallback(async (nextSearch = "") => {
    setLoading(true);
    setError("");
    try {
      const qs = nextSearch.trim() ? `?q=${encodeURIComponent(nextSearch.trim())}` : "";
      const data = await readJson<{ data: SpecCategory[] }>(
        await fetch(`/api/admin/spec-sheet/categories${qs}`, { cache: "no-store" })
      );
      setCategories(data.data || []);
      setSelectedId((current) =>
        current && data.data?.some((category) => category._id === current) ? current : ""
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load Spec Sheet");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories("");
  }, [loadCategories]);

  useEffect(() => {
    if (!selectedCategory) {
      setFieldDrafts({});
      if (drawerOpen) setDrawerOpen(false);
      return;
    }
    setFieldDrafts(
      Object.fromEntries(selectedCategory.fields.map((field) => [field._id, field.name]))
    );
  }, [selectedCategory, drawerOpen]);

  useEffect(() => {
    setNewFieldName("");
    setExtractFile(null);
    setExtractedFields([]);
    setExtractionNotes("");
  }, [selectedId]);

  function openCategoryDrawer(categoryId: string) {
    setSelectedId(categoryId);
    setDrawerOpen(true);
  }

  function closeCategoryDrawer() {
    setDrawerOpen(false);
  }

  function upsertCategory(category: SpecCategory) {
    setCategories((current) => {
      const exists = current.some((item) => item._id === category._id);
      const next = exists
        ? current.map((item) => (item._id === category._id ? category : item))
        : [...current, category];
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
    setSelectedId(category._id);
  }

  async function saveCategoryDialog() {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const isEdit = Boolean(categoryDialog.id);
      const data = await readJson<{ data: SpecCategory; message?: string }>(
        await fetch(
          isEdit
            ? `/api/admin/spec-sheet/categories/${categoryDialog.id}`
            : "/api/admin/spec-sheet/categories",
          {
            method: isEdit ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: categoryDialog.name,
              description: categoryDialog.description,
            }),
          }
        )
      );
      upsertCategory(data.data);
      setDrawerOpen(true);
      setCategoryDialog({ open: false, name: "", description: "" });
      setSuccess(data.message || "Category saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save category");
    } finally {
      setBusy(false);
    }
  }

  async function deleteSelectedCategory() {
    if (!selectedCategory) return;
    if (!window.confirm(`Delete "${selectedCategory.name}" and all of its fields?`)) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const data = await readJson<{ message?: string }>(
        await fetch(`/api/admin/spec-sheet/categories/${selectedCategory._id}`, {
          method: "DELETE",
        })
      );
      setCategories((current) => current.filter((item) => item._id !== selectedCategory._id));
      setSelectedId("");
      setDrawerOpen(false);
      setSuccess(data.message || "Category deleted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete category");
    } finally {
      setBusy(false);
    }
  }

  async function addField() {
    if (!selectedCategory) return;
    const name = newFieldName.trim();
    if (!name) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const data = await readJson<{ data: SpecCategory; message?: string }>(
        await fetch(`/api/admin/spec-sheet/categories/${selectedCategory._id}/fields`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        })
      );
      upsertCategory(data.data);
      setNewFieldName("");
      setSuccess(data.message || "Field added");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add field");
    } finally {
      setBusy(false);
    }
  }

  async function updateField(field: SpecField) {
    if (!selectedCategory) return;
    const name = (fieldDrafts[field._id] || "").trim();
    if (!name) {
      setError("Field name is required");
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const data = await readJson<{ data: SpecCategory; message?: string }>(
        await fetch(
          `/api/admin/spec-sheet/categories/${selectedCategory._id}/fields/${field._id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name }),
          }
        )
      );
      upsertCategory(data.data);
      setSuccess(data.message || "Field updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update field");
    } finally {
      setBusy(false);
    }
  }

  async function deleteField(field: SpecField) {
    if (!selectedCategory) return;
    if (!window.confirm(`Delete field "${field.name}"?`)) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const data = await readJson<{ data: SpecCategory; message?: string }>(
        await fetch(
          `/api/admin/spec-sheet/categories/${selectedCategory._id}/fields/${field._id}`,
          { method: "DELETE" }
        )
      );
      upsertCategory(data.data);
      setSuccess(data.message || "Field deleted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete field");
    } finally {
      setBusy(false);
    }
  }

  async function reorderFields(fromIndex: number, toIndex: number) {
    if (!selectedCategory) return;
    const fields = [...selectedCategory.fields];
    if (toIndex < 0 || toIndex >= fields.length) return;
    const [moved] = fields.splice(fromIndex, 1);
    fields.splice(toIndex, 0, moved);
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const data = await readJson<{ data: SpecCategory; message?: string }>(
        await fetch(`/api/admin/spec-sheet/categories/${selectedCategory._id}/fields/reorder`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fieldIds: fields.map((field) => field._id) }),
        })
      );
      upsertCategory(data.data);
      setSuccess(data.message || "Fields reordered");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reorder fields");
    } finally {
      setBusy(false);
    }
  }

  async function extractFields() {
    if (!selectedCategory || !extractFile) return;
    setExtracting(true);
    setError("");
    setSuccess("");
    setExtractedFields([]);
    setExtractionNotes("");
    try {
      const form = new FormData();
      form.append("file", extractFile);
      const data = await readJson<{
        data: { fields: ExtractedField[]; notes: string };
        message?: string;
      }>(
        await fetch(`/api/admin/spec-sheet/categories/${selectedCategory._id}/extract-fields`, {
          method: "POST",
          body: form,
        })
      );
      setExtractedFields(data.data?.fields || []);
      setExtractionNotes(data.data?.notes || "");
      setSuccess(data.message || "Fields extracted for review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to extract fields");
    } finally {
      setExtracting(false);
    }
  }

  async function saveExtracted(mode: "append" | "replace") {
    if (!selectedCategory || extractedFields.length === 0) return;
    if (mode === "replace" && !window.confirm("Replace all existing fields with this extracted list?")) {
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const data = await readJson<{ data: SpecCategory; message?: string }>(
        await fetch(`/api/admin/spec-sheet/categories/${selectedCategory._id}/fields/bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode, fields: extractedFields }),
        })
      );
      upsertCategory(data.data);
      setExtractedFields([]);
      setExtractionNotes("");
      setExtractFile(null);
      setSuccess(mode === "replace" ? "Extracted fields replaced category fields" : "Extracted fields appended");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save extracted fields");
    } finally {
      setBusy(false);
    }
  }

  const existingFieldKeys = useMemo(
    () => new Set((selectedCategory?.fields || []).map((field) => normalizeFieldName(field.name))),
    [selectedCategory]
  );

  const totalFields = useMemo(
    () => categories.reduce((count, category) => count + category.fields.length, 0),
    [categories]
  );

  const showEmptyState = !loading && categories.length === 0;

  const drawerContent = selectedCategory ? (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "background.default" }}>
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 2,
          bgcolor: "background.paper",
          borderBottom: "1px solid",
          borderColor: "divider",
          px: { xs: 2, md: 3 },
          py: 2,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="flex-start" justifyContent="space-between">
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: 0 }}>
                {selectedCategory.name}
              </Typography>
              <Chip size="small" label={`${selectedCategory.fields.length} fields`} />
            </Stack>
            <Typography color="text.secondary" sx={{ mt: 0.75 }}>
              {selectedCategory.description || "No description yet."}
            </Typography>
          </Box>
          <IconButton onClick={closeCategoryDrawer} aria-label="Close Spec Sheet category drawer">
            <CloseRoundedIcon />
          </IconButton>
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<EditRoundedIcon />}
            onClick={() =>
              setCategoryDialog({
                open: true,
                id: selectedCategory._id,
                name: selectedCategory.name,
                description: selectedCategory.description || "",
              })
            }
          >
            Edit Category
          </Button>
          <Button
            color="error"
            variant="outlined"
            size="small"
            startIcon={<DeleteOutlineRoundedIcon />}
            onClick={deleteSelectedCategory}
          >
            Delete
          </Button>
        </Stack>
      </Box>

      <Box sx={{ flex: 1, overflow: "auto", p: { xs: 2, md: 3 } }}>
        <Paper
          variant="outlined"
          sx={{
            borderRadius: "8px",
            borderColor: "divider",
            overflow: "hidden",
            bgcolor: "background.paper",
          }}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
              Ordered Fields
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
              <TextField
                fullWidth
                size="small"
                label="Add field name"
                value={newFieldName}
                onChange={(event) => setNewFieldName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") addField();
                }}
              />
              <Button
                variant="contained"
                startIcon={<AddRoundedIcon />}
                onClick={addField}
                disabled={busy}
                sx={{ minWidth: { sm: 132 } }}
              >
                Add
              </Button>
            </Stack>
          </Box>
          <Divider />
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width={70}>#</TableCell>
                  <TableCell>Field Name</TableCell>
                  <TableCell width={176} align="right">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedCategory.fields.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} sx={{ color: "text.secondary", py: 3 }}>
                      Add fields manually or extract them from a PDF/image.
                    </TableCell>
                  </TableRow>
                ) : (
                  selectedCategory.fields.map((field, index) => {
                    const draft = fieldDrafts[field._id] ?? field.name;
                    const changed = draft.trim() !== field.name;
                    return (
                      <TableRow key={field._id} hover>
                        <TableCell>
                          <Chip size="small" label={field.order} sx={{ fontWeight: 800 }} />
                        </TableCell>
                        <TableCell>
                          <TextField
                            fullWidth
                            size="small"
                            value={draft}
                            onChange={(event) =>
                              setFieldDrafts((current) => ({
                                ...current,
                                [field._id]: event.target.value,
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Move up">
                            <span>
                              <IconButton
                                size="small"
                                disabled={index === 0 || busy}
                                onClick={() => reorderFields(index, index - 1)}
                              >
                                <ArrowUpwardRoundedIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Move down">
                            <span>
                              <IconButton
                                size="small"
                                disabled={index === selectedCategory.fields.length - 1 || busy}
                                onClick={() => reorderFields(index, index + 1)}
                              >
                                <ArrowDownwardRoundedIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Save field">
                            <span>
                              <IconButton
                                size="small"
                                disabled={!changed || busy}
                                onClick={() => updateField(field)}
                              >
                                <SaveRoundedIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Delete field">
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                disabled={busy}
                                onClick={() => deleteField(field)}
                              >
                                <DeleteOutlineRoundedIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Box>
        </Paper>

        <Paper
          variant="outlined"
          sx={{
            mt: 2,
            borderRadius: "8px",
            borderColor: "divider",
            overflow: "hidden",
            bgcolor: "background.paper",
          }}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 900, mb: 0.5 }}>
              Extract Fields From PDF/Image
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Upload a source document and review the ordered field names before saving.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} alignItems={{ sm: "center" }}>
              <Button variant="outlined" component="label" startIcon={<UploadFileRoundedIcon />}>
                Choose file
                <input
                  hidden
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(event) => {
                    setExtractFile(event.target.files?.[0] || null);
                    setExtractedFields([]);
                    setExtractionNotes("");
                  }}
                />
              </Button>
              <Typography color="text.secondary" sx={{ flex: 1 }}>
                {extractFile ? extractFile.name : "PDF or image, used only for field extraction."}
              </Typography>
              <Button variant="contained" disabled={!extractFile || extracting} onClick={extractFields}>
                {extracting ? "Extracting..." : "Extract"}
              </Button>
            </Stack>

            {extractionNotes && (
              <Alert severity="info" sx={{ mt: 2 }}>
                {extractionNotes}
              </Alert>
            )}

            {extractedFields.length > 0 && (
              <Paper variant="outlined" sx={{ mt: 2, borderRadius: "8px", overflow: "hidden" }}>
                <Box sx={{ p: 2 }}>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    alignItems={{ xs: "stretch", sm: "center" }}
                    justifyContent="space-between"
                  >
                    <Box>
                      <Typography sx={{ fontWeight: 900 }}>Proposed ordered fields</Typography>
                      <Typography color="text.secondary" variant="body2">
                        Existing duplicates are flagged and skipped when appended.
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <Button onClick={() => saveExtracted("append")} disabled={busy}>
                        Append
                      </Button>
                      <Button
                        variant="contained"
                        color="warning"
                        onClick={() => saveExtracted("replace")}
                        disabled={busy}
                      >
                        Replace
                      </Button>
                      <Button
                        onClick={() => {
                          setExtractedFields([]);
                          setExtractionNotes("");
                        }}
                      >
                        Cancel
                      </Button>
                    </Stack>
                  </Stack>
                </Box>
                <Divider />
                <Box sx={{ maxHeight: 320, overflow: "auto" }}>
                  {extractedFields.map((field) => (
                    <Stack
                      key={`${field.order}-${field.name}`}
                      direction="row"
                      spacing={1.5}
                      alignItems="center"
                      sx={{ px: 2, py: 1, borderBottom: "1px solid", borderColor: "divider" }}
                    >
                      <Chip size="small" label={field.order} />
                      <Typography sx={{ flex: 1 }}>{field.name}</Typography>
                      {existingFieldKeys.has(normalizeFieldName(field.name)) && (
                        <Chip size="small" color="warning" label="duplicate" />
                      )}
                    </Stack>
                  ))}
                </Box>
              </Paper>
            )}
          </Box>
        </Paper>
      </Box>
    </Box>
  ) : null;

  return (
    <Box
      sx={{
        minHeight: "100%",
        p: { xs: 2, md: 3 },
        bgcolor: (t) => (t.palette.mode === "dark" ? "background.default" : "#eef4ff"),
      }}
    >
      <Stack
        direction={{ xs: "column", lg: "row" }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", lg: "flex-start" }}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 950, letterSpacing: 0, lineHeight: 1 }}>
            Spec Sheet
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1, fontSize: "1rem" }}>
            Manage category field lists before connecting them to report generation.
          </Typography>
        </Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
          <Button
            variant="outlined"
            startIcon={<RefreshRoundedIcon />}
            onClick={() => loadCategories(search)}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => setCategoryDialog({ open: true, name: "", description: "" })}
            sx={{ boxShadow: "0 14px 28px rgba(79,70,229,0.22)" }}
          >
            New Category
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      <Paper
        variant="outlined"
        sx={{
          borderRadius: "8px",
          borderColor: "rgba(148,163,184,0.28)",
          bgcolor: "background.paper",
          p: { xs: 2, md: 2.5 },
          mb: 2.5,
          boxShadow: "0 18px 45px rgba(37,99,235,0.08)",
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          alignItems={{ xs: "stretch", md: "center" }}
          justifyContent="space-between"
        >
          <TextField
            size="small"
            placeholder="Search categories"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") loadCategories(search);
            }}
            sx={{ maxWidth: { md: 460 } }}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip label={`${categories.length} categories`} />
            <Chip label={`${totalFields} fields`} />
            <Button size="small" onClick={() => loadCategories(search)}>
              Search
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {loading ? (
        <Stack alignItems="center" sx={{ py: 8 }}>
          <CircularProgress />
        </Stack>
      ) : showEmptyState ? (
        <Paper
          variant="outlined"
          sx={{
            borderRadius: "8px",
            borderStyle: "dashed",
            borderColor: "rgba(99,102,241,0.35)",
            bgcolor: "rgba(255,255,255,0.76)",
            p: { xs: 3, md: 5 },
            textAlign: "center",
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 900 }}>
            No categories yet
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1, mb: 2 }}>
            Create the first category, then open it to add ordered field names.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => setCategoryDialog({ open: true, name: "", description: "" })}
          >
            Create Category
          </Button>
        </Paper>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              xl: "repeat(3, minmax(0, 1fr))",
            },
            gap: 2,
          }}
        >
          {categories.map((category) => (
            <Paper
              key={category._id}
              component={ButtonBase}
              onClick={() => openCategoryDrawer(category._id)}
              variant="outlined"
              sx={{
                display: "block",
                textAlign: "left",
                borderRadius: "8px",
                borderColor: "rgba(148,163,184,0.28)",
                bgcolor: "background.paper",
                p: 0,
                overflow: "hidden",
                transition: "transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease",
                "&:hover": {
                  transform: "translateY(-2px)",
                  borderColor: "primary.main",
                  boxShadow: "0 20px 48px rgba(37,99,235,0.12)",
                },
              }}
            >
              <Box sx={{ p: 2.25 }}>
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                  <Box
                    sx={{
                      width: 46,
                      height: 46,
                      borderRadius: "8px",
                      display: "grid",
                      placeItems: "center",
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                      fontWeight: 900,
                      flexShrink: 0,
                    }}
                  >
                    {categoryInitials(category.name)}
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.15 }}>
                      {category.name}
                    </Typography>
                    <Typography
                      color="text.secondary"
                      sx={{
                        mt: 0.75,
                        minHeight: 44,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {category.description || "No description added yet."}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
              <Divider />
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ px: 2.25, py: 1.5 }}>
                <Chip size="small" label={`${category.fields.length} fields`} sx={{ fontWeight: 700 }} />
                <Typography variant="caption" color="text.secondary">
                  Updated {formatUpdatedAt(category.updatedAt)}
                </Typography>
              </Stack>
            </Paper>
          ))}
        </Box>
      )}

      <Drawer
        anchor="right"
        open={drawerOpen && Boolean(selectedCategory)}
        onClose={closeCategoryDrawer}
        PaperProps={{
          sx: {
            width: { xs: "100%", md: 760, xl: 880 },
            maxWidth: "100%",
            borderTopLeftRadius: { xs: 0, md: "8px" },
            borderBottomLeftRadius: { xs: 0, md: "8px" },
            overflow: "hidden",
          },
        }}
      >
        {drawerContent}
      </Drawer>

      <Dialog
        open={categoryDialog.open}
        onClose={() => setCategoryDialog({ open: false, name: "", description: "" })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{categoryDialog.id ? "Edit Category" : "New Category"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Category name"
              value={categoryDialog.name}
              onChange={(event) =>
                setCategoryDialog((current) => ({ ...current, name: event.target.value }))
              }
              autoFocus
              fullWidth
            />
            <TextField
              label="Description"
              value={categoryDialog.description}
              onChange={(event) =>
                setCategoryDialog((current) => ({ ...current, description: event.target.value }))
              }
              minRows={3}
              multiline
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCategoryDialog({ open: false, name: "", description: "" })}>
            Cancel
          </Button>
          <Button variant="contained" disabled={busy} onClick={saveCategoryDialog}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
