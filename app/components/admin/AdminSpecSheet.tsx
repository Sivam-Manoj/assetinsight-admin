"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
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

export default function AdminSpecSheet() {
  const [categories, setCategories] = useState<SpecCategory[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
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
    () => categories.find((category) => category._id === selectedId) || categories[0],
    [categories, selectedId]
  );

  const loadCategories = useCallback(
    async (nextSearch = "") => {
      setLoading(true);
      setError("");
      try {
        const qs = nextSearch.trim()
          ? `?q=${encodeURIComponent(nextSearch.trim())}`
          : "";
        const data = await readJson<{ data: SpecCategory[] }>(
          await fetch(`/api/admin/spec-sheet/categories${qs}`, { cache: "no-store" })
        );
        setCategories(data.data || []);
        setSelectedId((current) => {
          if (current && data.data?.some((category) => category._id === current)) {
            return current;
          }
          return data.data?.[0]?._id || "";
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load Spec Sheet");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadCategories("");
  }, [loadCategories]);

  useEffect(() => {
    if (!selectedCategory) {
      setFieldDrafts({});
      return;
    }
    setFieldDrafts(
      Object.fromEntries(selectedCategory.fields.map((field) => [field._id, field.name]))
    );
  }, [selectedCategory]);

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
        await fetch(
          `/api/admin/spec-sheet/categories/${selectedCategory._id}/extract-fields`,
          {
            method: "POST",
            body: form,
          }
        )
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

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, minHeight: "100%" }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", md: "center" }}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: 0 }}>
            Spec Sheet
          </Typography>
          <Typography color="text.secondary">
            Manage category field lists before connecting them to report generation.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={() => setCategoryDialog({ open: true, name: "", description: "" })}
        >
          New Category
        </Button>
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

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "360px minmax(0, 1fr)" },
          gap: 2,
          alignItems: "start",
        }}
      >
        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
          <Box sx={{ p: 2 }}>
            <TextField
              fullWidth
              size="small"
              label="Search categories"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") loadCategories(search);
              }}
            />
            <Button sx={{ mt: 1 }} size="small" onClick={() => loadCategories(search)}>
              Search
            </Button>
          </Box>
          <Divider />
          {loading ? (
            <Stack alignItems="center" sx={{ py: 5 }}>
              <CircularProgress size={28} />
            </Stack>
          ) : (
            <List sx={{ maxHeight: { lg: "calc(100vh - 270px)" }, overflow: "auto" }}>
              {categories.length === 0 ? (
                <Box sx={{ p: 3, color: "text.secondary" }}>
                  No categories yet.
                </Box>
              ) : (
                categories.map((category) => (
                  <ListItemButton
                    key={category._id}
                    selected={selectedCategory?._id === category._id}
                    onClick={() => setSelectedId(category._id)}
                    sx={{ alignItems: "flex-start", py: 1.25 }}
                  >
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography sx={{ fontWeight: 800 }}>{category.name}</Typography>
                          <Chip size="small" label={`${category.fields.length} fields`} />
                        </Stack>
                      }
                      secondary={category.description || "No description"}
                    />
                  </ListItemButton>
                ))
              )}
            </List>
          )}
        </Paper>

        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
          {!selectedCategory ? (
            <Box sx={{ p: 4, color: "text.secondary" }}>
              Create or select a category to manage fields.
            </Box>
          ) : (
            <>
              <Box sx={{ p: { xs: 2, md: 3 } }}>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={2}
                  alignItems={{ xs: "stretch", md: "flex-start" }}
                  justifyContent="space-between"
                >
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <Typography variant="h5" sx={{ fontWeight: 900 }}>
                        {selectedCategory.name}
                      </Typography>
                      <Chip label={`${selectedCategory.fields.length} ordered fields`} />
                    </Stack>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                      {selectedCategory.description || "No category description."}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
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
                      Edit
                    </Button>
                    <Button
                      color="error"
                      variant="outlined"
                      startIcon={<DeleteOutlineRoundedIcon />}
                      onClick={deleteSelectedCategory}
                    >
                      Delete
                    </Button>
                  </Stack>
                </Stack>
              </Box>

              <Divider />

              <Box sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
                  Fields
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ mb: 2 }}>
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
                  <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={addField}>
                    Add Field
                  </Button>
                </Stack>

                <Box sx={{ overflowX: "auto" }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell width={72}>Order</TableCell>
                        <TableCell>Field Name</TableCell>
                        <TableCell width={210} align="right">
                          Actions
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedCategory.fields.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} sx={{ color: "text.secondary" }}>
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
                                <Typography sx={{ fontWeight: 800 }}>{field.order}</Typography>
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
                                <IconButton
                                  size="small"
                                  disabled={index === 0 || busy}
                                  onClick={() => reorderFields(index, index - 1)}
                                  aria-label="Move field up"
                                >
                                  <ArrowUpwardRoundedIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  disabled={index === selectedCategory.fields.length - 1 || busy}
                                  onClick={() => reorderFields(index, index + 1)}
                                  aria-label="Move field down"
                                >
                                  <ArrowDownwardRoundedIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  disabled={!changed || busy}
                                  onClick={() => updateField(field)}
                                  aria-label="Save field"
                                >
                                  <SaveRoundedIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="error"
                                  disabled={busy}
                                  onClick={() => deleteField(field)}
                                  aria-label="Delete field"
                                >
                                  <DeleteOutlineRoundedIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </Box>
              </Box>

              <Divider />

              <Box sx={{ p: { xs: 2, md: 3 } }}>
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
                  <Button
                    variant="contained"
                    disabled={!extractFile || extracting}
                    onClick={extractFields}
                  >
                    {extracting ? "Extracting..." : "Extract Fields"}
                  </Button>
                </Stack>

                {extractionNotes && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    {extractionNotes}
                  </Alert>
                )}

                {extractedFields.length > 0 && (
                  <Paper variant="outlined" sx={{ mt: 2, borderRadius: 2, overflow: "hidden" }}>
                    <Box sx={{ p: 2 }}>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        alignItems={{ xs: "stretch", sm: "center" }}
                        justifyContent="space-between"
                      >
                        <Box>
                          <Typography sx={{ fontWeight: 900 }}>
                            Proposed ordered fields
                          </Typography>
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
            </>
          )}
        </Paper>
      </Box>

      <Dialog
        open={categoryDialog.open}
        onClose={() => setCategoryDialog({ open: false, name: "", description: "" })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {categoryDialog.id ? "Edit Category" : "New Category"}
        </DialogTitle>
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
