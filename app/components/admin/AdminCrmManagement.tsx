"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";
import { Doughnut, Bar, Line, Pie } from "react-chartjs-2";
import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import MicRoundedIcon from "@mui/icons-material/MicRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  ListSubheader,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

type CrmUserItem = {
  _id: string;
  email: string;
  username?: string;
  companyName?: string;
  contactPhone?: string;
  crmAddress?: string;
  crmQuadrant?: string;
  crmSpecializations?: string[];
  isBlocked?: boolean;
  isCrmAgent: boolean;
  crmAssignedAt?: string;
  createdAt: string;
};

type UsersResponse = {
  items: CrmUserItem[];
  total: number;
  page: number;
  limit: number;
};

type CrmLeadItem = {
  _id: string;
  clientName: string;
  companyName?: string;
  email?: string;
  phoneRaw?: string;
  phoneFormatted?: string;
  contactSocials?: string;
  companyLocation?: string;
  industry?: string;
  website?: string;
  listItems?: string[];
  status: string;
  lostReason?: string;
  priority: string;
  statusChangedAt?: string;
  taskStartDate?: string;
  dueDate?: string;
  latestComment?: string;
  latestAttachmentUrls?: string[];
  latestRecordingUrl?: string;
  updates?: CrmLeadUpdateItem[];
  assignedTo?: { _id: string; email?: string; username?: string; role?: string };
  assignedBy?: { _id: string; email?: string; username?: string; role?: string };
  createdAt: string;
  updatedAt?: string;
};

type LeadsResponse = {
  items: CrmLeadItem[];
  total: number;
  page: number;
  limit: number;
  statusCounts?: Array<{
    _id: string;
    count: number;
  }>;
  overdueCount?: number;
};

type CrmLeadUpdateItem = {
  _id?: string;
  comment?: string;
  status?: string;
  lostReason?: string;
  attachmentUrls?: string[];
  recordingUrl?: string;
  createdBy?: { _id?: string; email?: string; username?: string; role?: string };
  createdAt?: string;
  editedAt?: string;
  isDeleted?: boolean;
  deletedAt?: string;
};

type CrmImportFileItem = {
  sourceBatchId: string;
  sourceFileName?: string;
  sourceFileUrl?: string;
  sourceFileKey?: string;
  importedAt: string;
  latestLeadAt: string;
  leadCount: number;
};

type ImportFilesResponse = {
  items: CrmImportFileItem[];
  total: number;
  page: number;
  limit: number;
};

type AssignmentByUploadItem = {
  sourceBatchId: string;
  sourceFileName?: string;
  importedAt: string;
  leadCount: number;
  overdueCount: number;
  agentId: string;
  agentEmail?: string;
  agentUsername?: string;
};

type AssignmentByUploadSummary = {
  sourceBatchId: string;
  sourceFileName?: string;
  importedAt: string;
  leadCount: number;
  overdueCount: number;
  agents: Array<{
    agentId: string;
    agentEmail?: string;
    agentUsername?: string;
    leadCount: number;
  }>;
};

type CrmTransferStatus = "pending" | "accepted" | "rejected" | "cancelled";

type CrmTransferUser = {
  _id?: string;
  email?: string;
  username?: string;
};

type CrmTransferLead = {
  _id?: string;
  clientName?: string;
  title?: string;
  status?: string;
  dueDate?: string;
};

type CrmTransferItem = {
  _id: string;
  leadId?: CrmTransferLead | null;
  fromUserId?: CrmTransferUser | null;
  toUserId?: CrmTransferUser | null;
  requestedBy?: CrmTransferUser | null;
  respondedBy?: CrmTransferUser | null;
  status: CrmTransferStatus;
  note?: string;
  respondedAt?: string;
  createdAt: string;
  updatedAt?: string;
};

type CrmTransferReportResponse = {
  items: CrmTransferItem[];
  total: number;
  page: number;
  limit: number;
  statusCounts?: Array<{
    _id: string;
    count: number;
  }>;
};

type CrmNearestReassignItem = {
  leadId: string;
  clientName?: string;
  companyName?: string;
  location?: string;
  currentAssignee?: CrmTransferUser | null;
  proposedAssignee?: (CrmTransferUser & { crmAddress?: string }) | null;
  changed: boolean;
  method: string;
  distanceKm?: number;
  matchedRegion?: string;
  reason?: string;
};

type CrmNearestReassignResponse = {
  apply: boolean;
  reviewed: number;
  changedCount: number;
  appliedCount: number;
  items: CrmNearestReassignItem[];
};

type ExcelRow = Record<string, unknown>;

type ImportPreviewSource = "excel" | "autoFind";

type PreviewLeadRow = {
  rowNumber: number;
  title: string;
  clientName: string;
  companyName: string;
  email: string;
  phone: string;
  socials: string;
  lists: string[];
  location: string;
  industry: string;
  website: string;
  notes: string;
  dueDate: string;
  duplicateKey: string;
};

type DuplicateIssue = {
  rowNumber: number;
  duplicateKey: string;
  reason: string;
};

type AutoFindLead = {
  clientName: string;
  companyName: string;
  email: string;
  phoneRaw: string;
  website: string;
  companyLocation: string;
  contactLocation: string;
  contactSocials: string;
  contactLinkedinUrl: string;
  companyLinkedinUrl: string;
  industry: string;
  suggestedSpecialization: string;
  categories: string[];
  sourceUrl: string;
  sourceTitle: string;
  sourcePlatform: string;
  confidence: number;
  evidence: string;
  queryUsed: string;
};

type AutoFindResultItem = {
  searchResultId: string;
  fingerprint: string;
  duplicate: boolean;
  duplicateReasons: string[];
  lead: AutoFindLead;
};

type AutoFindOptions = {
  countries: string[];
  canadaProvinces: string[];
  usStates: string[];
  categories: string[];
  maxResults: number;
};

type AutoFindRunStatus = "queued" | "running" | "completed" | "failed";

type AutoFindRunProgress = {
  runId: string;
  status: AutoFindRunStatus;
  progress: number;
  totalBatches: number;
  completedBatches: number;
  failedBatches: number;
  message?: string;
  items?: AutoFindResultItem[];
  rawJson?: unknown;
  searched?: number;
  duplicateCount?: number;
  error?: string;
};

const AUTO_SELECT_ALL_VALUE = "__all__";

const CRM_STATUSES = [
  "new_lead",
  "contacted",
  "inspection_required",
  "inspection_complete",
  "proposal_submitted",
  "decision_pending",
  "won",
  "lost",
] as const;

const CRM_STATUS_FILTER_OPTIONS = [...CRM_STATUSES, "archived"] as const;

const CRM_LOST_REASONS = [
  "not_interested",
  "timing",
  "competitor",
  "no_assets",
] as const;

const MONTH_OPTIONS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
] as const;

const CRM_SPECIALIZATION_LABELS: Record<string, string> = {
  industrial_construction: "Industrial & Construction",
  farm_equipment_sales: "Farm & Farm Equipment Sales",
  others: "Others",
};

function formatCrmSpecializations(values?: string[]): string {
  if (!Array.isArray(values) || values.length === 0) return "";
  return values
    .map((value) => CRM_SPECIALIZATION_LABELS[value] || value)
    .filter(Boolean)
    .join(", ");
}

function defaultAutoFindCategories(categories?: string[]): string[] {
  if (!Array.isArray(categories)) return [];
  return categories
    .filter((category) => ["Salvage And Seized Vehicles", "Heavy Trucks", "Tractors", "Excavators"].includes(category))
    .slice(0, 4);
}

function sanitizeAdminErrorMessage(message: string): string {
  const text = String(message || "").trim();
  if (!text) return text;
  const normalized = text.toLowerCase();
  if (
    normalized.includes("quota") ||
    normalized.includes("billing") ||
    normalized.includes("insufficient_quota") ||
    normalized.includes("platform.openai.com") ||
    normalized.includes("openai")
  ) {
    return "Please check billing or usage limits of the Web Search API.";
  }
  return text;
}

function parseCrmQuadrants(value?: string): string[] {
  return String(value || "")
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
}

function formatCrmQuadrants(value?: string): string {
  const quadrants = parseCrmQuadrants(value);
  return quadrants.join(", ");
}

function toIsoDateValue(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function toDateInputValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "";
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.toISOString().slice(0, 10) : "";
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : "";
  }
  const text = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const date = new Date(text);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : "";
}

function toText(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function extractPrimaryEmail(value: unknown): string {
  const text = toText(value).toLowerCase();
  if (!text) return "";

  const matched = text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  if (matched?.[0]) return matched[0].toLowerCase();

  const firstToken = text
    .split(/[\s,;|/]+/g)
    .map((x) => x.trim())
    .find(Boolean);
  return (firstToken || "").toLowerCase();
}

function extractPrimaryPhone(value: unknown): string {
  const text = toText(value);
  if (!text) return "";
  const firstToken = text
    .split(/[\n,;|/]+/g)
    .map((x) => x.trim())
    .find(Boolean);
  return firstToken || text;
}

function deriveClientName(input: {
  providedClientName: string;
  title: string;
  companyName: string;
  email: string;
}): string {
  if (input.providedClientName) return input.providedClientName;
  if (input.title && input.companyName) return `${input.title} - ${input.companyName}`;
  if (input.companyName) return input.companyName;

  const emailLocal = input.email.split("@")[0]?.replace(/[._-]+/g, " ").trim() || "";
  if (emailLocal) return emailLocal;
  if (input.title) return input.title;

  return "Unknown Client";
}

function toLookup(row: ExcelRow): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row || {})) {
    out[key.trim().toLowerCase()] = value;
  }
  return out;
}

function pickField(rowLookup: Record<string, unknown>, candidates: string[]): unknown {
  for (const key of candidates) {
    const value = rowLookup[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return undefined;
}

function deriveProvidedClientName(rowLookup: Record<string, unknown>): string {
  const fullName = toText(
    pickField(rowLookup, [
      "contact full name",
      "client name",
      "client_name",
      "client",
      "customer",
      "customer name",
      "name",
      "contact",
      "contact person",
      "contact name",
      "full name",
      "person name",
    ])
  );
  if (fullName) return fullName;

  const firstName = toText(pickField(rowLookup, ["first name", "firstname"]));
  const lastName = toText(pickField(rowLookup, ["last name", "lastname"]));
  return [firstName, lastName].filter(Boolean).join(" ").trim();
}

function composeSocials(rowLookup: Record<string, unknown>): string {
  const values: string[] = [];
  const seen = new Set<string>();

  const add = (value: unknown) => {
    const raw = toText(value);
    if (!raw) return;
    const parts = raw
      .split(/[\n,;|]+/g)
      .map((item) => item.trim())
      .filter(Boolean);
    for (const part of parts) {
      const key = part.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      values.push(part);
    }
  };

  add(pickField(rowLookup, ["contact socials", "social", "socials", "social links"]));
  add(pickField(rowLookup, ["contact li profile url", "contact linkedin", "linkedin", "linkedin profile"]));
  add(pickField(rowLookup, ["company li profile url", "company linkedin"]));

  return values.join(", ");
}

function composeLocation(rowLookup: Record<string, unknown>): string {
  const direct = toText(
    pickField(rowLookup, ["company location", "contact location", "location", "address"])
  );
  if (direct) return direct;

  const companyCity = toText(pickField(rowLookup, ["company city"]));
  const companyState = toText(pickField(rowLookup, ["company state", "company state abbr"]));
  const companyCountry = toText(pickField(rowLookup, ["company country", "company country (alpha 2)", "company country (alpha 3)"]));
  const companyLocation = [companyCity, companyState, companyCountry].filter(Boolean).join(", ");
  if (companyLocation) return companyLocation;

  const contactCity = toText(pickField(rowLookup, ["contact city"]));
  const contactState = toText(pickField(rowLookup, ["contact state", "contact state abbr"]));
  const contactCountry = toText(pickField(rowLookup, ["contact country", "contact country (alpha 2)", "contact country (alpha 3)"]));
  return [contactCity, contactState, contactCountry].filter(Boolean).join(", ");
}

function composeNotes(rowLookup: Record<string, unknown>): string {
  const values: string[] = [];
  const seen = new Set<string>();

  const addRaw = (value: unknown) => {
    const text = toText(value);
    if (!text) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    values.push(text);
  };

  const addLabel = (label: string, candidates: string[]) => {
    const text = toText(pickField(rowLookup, candidates));
    if (!text) return;
    const entry = `${label}: ${text}`;
    const key = entry.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    values.push(entry);
  };

  addRaw(pickField(rowLookup, ["notes", "note", "comments", "comment", "remarks"]));
  addLabel("Research Date", ["research date"]);
  addLabel("Department", ["department"]);
  addLabel("Seniority", ["seniority"]);
  addLabel("Company Description", ["company description", "description"]);
  addLabel("Company Annual Revenue", ["company annual revenue"]);
  addLabel("Company Revenue Range", ["company revenue range"]);
  addLabel("Company Staff Count", ["company staff count"]);
  addLabel("Company Staff Count Range", ["company staff count range"]);
  addLabel("Company Founded Date", ["company founded date"]);
  addLabel("Company Post Code", ["company post code"]);
  addLabel("SIC Code", ["sic code"]);
  addLabel("NAICS Code", ["naics code"]);

  return values.join(" | ");
}

function splitListValues(value: unknown): { values: string[]; hasInlineDuplicates: boolean } {
  const text = toText(value);
  if (!text) return { values: [], hasInlineDuplicates: false };

  const rawParts = text
    .split(/[\n,;|]/g)
    .map((x) => x.trim())
    .filter(Boolean);

  const deduped: string[] = [];
  const seen = new Set<string>();
  let hasInlineDuplicates = false;

  for (const item of rawParts) {
    const key = item.toLowerCase();
    if (seen.has(key)) {
      hasInlineDuplicates = true;
      continue;
    }
    seen.add(key);
    deduped.push(item);
  }

  return { values: deduped, hasInlineDuplicates };
}

function normalizePhoneForKey(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits;
}

function statusLabel(value: string): string {
  if (value === "new_lead") return "New Lead";
  if (value === "contacted") return "Contacted";
  if (value === "inspection_required") return "Inspection Required";
  if (value === "inspection_complete") return "Inspection Complete";
  if (value === "proposal_submitted") return "Proposal Submitted";
  if (value === "decision_pending") return "Decision Pending";
  if (value === "won") return "Won";
  if (value === "archived") return "Archived";
  if (value === "lost") return "Lost";
  return value.replace(/_/g, " ").replace(/\b\w/g, (x) => x.toUpperCase());
}

function normalizeLeadStatus(value?: string, lostReason?: string): string {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "new_lead" || raw === "contacted" || raw === "inspection_required" || raw === "inspection_complete" || raw === "proposal_submitted" || raw === "decision_pending" || raw === "won") {
    return raw;
  }
  if (raw === "lost") return "lost";
  if (raw === "pending" || !raw) return "new_lead";
  if (raw === "in_progress" || raw === "no_answer") return "contacted";
  if (raw === "completed" || raw === "archived") return "won";
  if (raw === "not_interested") return "lost";
  if (String(lostReason || "").trim()) return "lost";
  return "new_lead";
}

function lostReasonLabel(value?: string): string {
  if (value === "not_interested") return "Not Interested";
  if (value === "timing") return "Timing";
  if (value === "competitor") return "Competitor";
  if (value === "no_assets") return "No Assets";
  return value ? statusLabel(value) : "";
}

function transferStatusLabel(value?: string): string {
  if (value === "pending") return "Pending";
  if (value === "accepted") return "Accepted";
  if (value === "rejected") return "Rejected";
  if (value === "cancelled") return "Cancelled";
  return value ? statusLabel(value) : "";
}

function transferStatusColor(value?: string): "default" | "success" | "warning" | "error" | "info" {
  if (value === "accepted") return "success";
  if (value === "rejected") return "error";
  if (value === "cancelled") return "default";
  if (value === "pending") return "warning";
  return "info";
}

function crmTransferUserLabel(input?: CrmTransferUser | null): string {
  return input?.username || input?.email || "-";
}

function statusWithLostReasonLabel(status?: string, lostReason?: string): string {
  const normalizedStatus = normalizeLeadStatus(status, lostReason);
  const base = statusLabel(normalizedStatus);
  const reason = lostReasonLabel(lostReason);
  return status === "lost" && reason ? `${base} • ${reason}` : base;
}

function toDateTimeValue(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";
  return date.toLocaleString();
}

function leadUpdateAuthorLabel(update: CrmLeadUpdateItem): string {
  const name = update.createdBy?.username || update.createdBy?.email || "Unknown";
  const role = String(update.createdBy?.role || "").toLowerCase();
  if (role === "admin" || role === "superadmin") return `${name} (Admin)`;
  return `${name} (CRM)`;
}

function sortedLeadUpdates(updates?: CrmLeadUpdateItem[]): CrmLeadUpdateItem[] {
  if (!Array.isArray(updates)) return [];
  return [...updates].sort((a, b) => {
    const aTime = new Date(a.createdAt || 0).getTime();
    const bTime = new Date(b.createdAt || 0).getTime();
    return bTime - aTime;
  });
}

function isLikelyImageUrl(url?: string): boolean {
  const clean = String(url || "").trim().split("?")[0].toLowerCase();
  return /\.(png|jpe?g|gif|webp|bmp|heic|heif|svg)$/i.test(clean);
}

function normalizeUpdateId(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object") return "";

  const maybeOid = toText((value as { $oid?: unknown }).$oid);
  if (maybeOid) return maybeOid;

  const nested = toText((value as { _id?: unknown })._id);
  if (nested && nested !== "[object Object]") return nested;

  const maybeHex = (value as { toHexString?: () => string }).toHexString;
  if (typeof maybeHex === "function") {
    const out = toText(maybeHex.call(value));
    if (out) return out;
  }

  const fallback = toText(value);
  return fallback === "[object Object]" ? "" : fallback;
}

function buildPreviewRows(rows: ExcelRow[]): {
  parsedRows: PreviewLeadRow[];
  duplicateIssues: DuplicateIssue[];
} {
  const parsedRows: PreviewLeadRow[] = [];
  const duplicateIssues: DuplicateIssue[] = [];
  const firstSeenByListIdentity = new Map<string, number>();

  rows.forEach((rawRow, idx) => {
    const rowNumber = idx + 2;
    const row = toLookup(rawRow);

    const providedTitle = toText(
      pickField(row, ["title", "task", "task title", "designation", "role", "job title", "position"])
    );
    const title = providedTitle || "CRM Follow-up";
    const companyName = toText(
      pickField(row, ["company name - cleaned", "company", "company name", "business", "organization"])
    );
    const providedClientName = deriveProvidedClientName(row);
    const email = extractPrimaryEmail(
      pickField(row, ["email 1", "email 2", "personal email", "email", "emails", "email address", "mail", "e-mail"])
    );
    const phone = extractPrimaryPhone(
      pickField(row, [
        "contact phone 1",
        "contact phone 2",
        "contact phone 3",
        "contact mobile phone",
        "contact mobile phone 2",
        "contact mobile phone 3",
        "company phone 1",
        "company phone 2",
        "company phone 3",
        "phone",
        "phones",
        "phone number",
        "number",
        "mobile",
        "contact number",
        "telephone",
      ])
    );
    const clientName = deriveClientName({
      providedClientName,
      title: providedTitle,
      companyName,
      email,
    });
    const socials = composeSocials(row);
    const location = composeLocation(row);
    const industry = toText(pickField(row, ["company industry", "industry", "sector"]));
    const website = toText(pickField(row, ["website", "company website domain", "site", "url", "web"]));
    const notes = composeNotes(row);
    const dueDate = toDateInputValue(pickField(row, ["due date", "due", "task due date", "deadline", "follow up date"]));

    const listInfo = splitListValues(
      pickField(row, ["list", "lists", "list name", "lead list", "segment", "tags"])
    );

    const identity =
      email ||
      normalizePhoneForKey(phone) ||
      `${clientName.toLowerCase()}|${companyName.toLowerCase()}`;

    const listKeyForRow =
      listInfo.values.length > 0
        ? [...listInfo.values].map((x) => x.toLowerCase()).sort().join("|")
        : "no-list";
    const duplicateKey = `${identity}::${listKeyForRow}`;

    if (listInfo.hasInlineDuplicates) {
      duplicateIssues.push({
        rowNumber,
        duplicateKey,
        reason: "Duplicate list items inside the Lists cell",
      });
    }

    for (const listItem of listInfo.values) {
      const listItemKey = listItem.toLowerCase();
      const listIdentityKey = `${identity}::${listItemKey}`;
      const firstSeen = firstSeenByListIdentity.get(listIdentityKey);
      if (typeof firstSeen === "number") {
        duplicateIssues.push({
          rowNumber,
          duplicateKey: listIdentityKey,
          reason: `List item "${listItem}" already assigned to this lead on row ${firstSeen}`,
        });
      } else {
        firstSeenByListIdentity.set(listIdentityKey, rowNumber);
      }
    }

    parsedRows.push({
      rowNumber,
      title,
      clientName,
      companyName,
      email,
      phone,
      socials,
      lists: listInfo.values,
      location,
      industry,
      website,
      notes,
      dueDate,
      duplicateKey,
    });
  });

  return { parsedRows, duplicateIssues };
}

function autoFindResultToExcelRow(item: AutoFindResultItem): ExcelRow {
  const lead = item.lead;
  return {
    Title: "CRM Auto Find Client",
    "Client Name": lead.clientName,
    "Company Name": lead.companyName,
    Email: lead.email,
    Phone: lead.phoneRaw,
    Website: lead.website,
    "Company Location": lead.companyLocation,
    "Contact Location": lead.contactLocation,
    "Contact Socials": lead.contactSocials,
    "Contact Linkedin": lead.contactLinkedinUrl,
    "Company Linkedin": lead.companyLinkedinUrl,
    Industry: lead.industry,
    "CRM Specialization": lead.suggestedSpecialization,
    Categories: (lead.categories || []).join(", "),
    "Source URL": lead.sourceUrl,
    "Source Title": lead.sourceTitle,
    "Source Platform": lead.sourcePlatform,
    Confidence: Math.round((lead.confidence || 0) * 100),
    Evidence: lead.evidence,
    "Query Used": lead.queryUsed,
    Notes: [lead.evidence, lead.sourceUrl ? `Source: ${lead.sourceUrl}` : ""].filter(Boolean).join(" | "),
    List: ["Auto Find", ...(lead.categories || [])].join(", "),
  };
}

export default function AdminCrmManagement() {
  const crmTheme = useTheme();
  const matchesMd = useMediaQuery(crmTheme.breakpoints.up("md"));
  const autoFindSelectMenuProps = useMemo(
    () => ({
      PaperProps: {
        sx: {
          maxHeight: { xs: "calc(100dvh - 96px)", md: 420 },
          maxWidth: { xs: "calc(100vw - 32px)", sm: 440 },
          overflowY: "auto",
        },
      },
      MenuListProps: {
        dense: true,
        sx: { py: 0.5 },
      },
    }),
    []
  );
  const autoFindSelectSx = {
    "& .MuiSelect-select": {
      display: "block",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
  };
  const autoFindMenuItemSx = {
    alignItems: "flex-start",
    gap: 0.75,
    minHeight: 36,
    whiteSpace: "normal",
    wordBreak: "break-word",
  };
  const [openCrmDropdown, setOpenCrmDropdown] = useState<string | null>(null);
  const [openAutoFindDropdown, setOpenAutoFindDropdown] = useState<"country" | "regions" | "categories" | null>(null);
  function renderDropdownMenuHeader(label: string, onClose: () => void) {
    return (
      <ListSubheader
        disableSticky
        sx={{
          bgcolor: "background.paper",
          borderBottom: "1px solid",
          borderColor: "divider",
          lineHeight: "normal",
          px: 1,
          py: 0.5,
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            {label}
          </Typography>
          <IconButton
            size="small"
            aria-label={`Close ${label} dropdown`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onClose();
            }}
          >
            <CloseRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Stack>
      </ListSubheader>
    );
  }
  function renderAutoFindMenuHeader(label: string) {
    return renderDropdownMenuHeader(label, () => setOpenAutoFindDropdown(null));
  }
  function renderCrmMenuHeader(label: string) {
    return renderDropdownMenuHeader(label, () => setOpenCrmDropdown(null));
  }
  function crmSelectOpenProps(key: string) {
    return {
      open: openCrmDropdown === key,
      onOpen: () => setOpenCrmDropdown(key),
      onClose: () => setOpenCrmDropdown(null),
      MenuProps: autoFindSelectMenuProps,
    };
  }
  const [toasts, setToasts] = useState<{ id: number; type: "success" | "error" | "info"; message: string }[]>([]);
  function pushToast(message: string, type: "success" | "error" | "info" = "info") {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message: sanitizeAdminErrorMessage(message) }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }

  const [users, setUsers] = useState<UsersResponse | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userQ, setUserQ] = useState("");
  const [crmFilter, setCrmFilter] = useState<"all" | "crm" | "noncrm">("all");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const [leads, setLeads] = useState<LeadsResponse | null>(null);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [leadQ, setLeadQ] = useState("");
  const [leadStatus, setLeadStatus] = useState<string>("");
  const [leadAssignedTo, setLeadAssignedTo] = useState<string>("");
  const [leadMonths, setLeadMonths] = useState<string[]>([]);
  const [leadYear, setLeadYear] = useState<string>("");
  const [leadFromDate, setLeadFromDate] = useState("");
  const [leadToDate, setLeadToDate] = useState("");
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);
  const [leadDetailsLoadingId, setLeadDetailsLoadingId] = useState<string | null>(null);
  const [showLeadDetailsModal, setShowLeadDetailsModal] = useState(false);
  const [activeLeadDetails, setActiveLeadDetails] = useState<CrmLeadItem | null>(null);
  const [leadDetailsError, setLeadDetailsError] = useState("");
  const [adminReply, setAdminReply] = useState("");
  const [adminReplyStatus, setAdminReplyStatus] = useState<string>("");
  const [adminReplyLostReason, setAdminReplyLostReason] = useState<string>("");
  const [submittingAdminReply, setSubmittingAdminReply] = useState(false);
  const [savingLeadStatus, setSavingLeadStatus] = useState(false);
  const [timelineBusyKey, setTimelineBusyKey] = useState<string | null>(null);
  const [editingUpdateId, setEditingUpdateId] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState("");
  const [editingStatus, setEditingStatus] = useState<string>("new_lead");
  const [editingLostReason, setEditingLostReason] = useState<string>("");

  const [importFiles, setImportFiles] = useState<ImportFilesResponse | null>(null);
  const [loadingImportFiles, setLoadingImportFiles] = useState(false);
  const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null);

  const [assignmentsByUpload, setAssignmentsByUpload] = useState<AssignmentByUploadItem[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  const [transferReport, setTransferReport] = useState<CrmTransferReportResponse | null>(null);
  const [loadingTransfers, setLoadingTransfers] = useState(false);
  const [transferStatusFilter, setTransferStatusFilter] = useState<string>("");
  const [transferAgentSearch, setTransferAgentSearch] = useState("");
  const [transferFromSearch, setTransferFromSearch] = useState("");
  const [transferToSearch, setTransferToSearch] = useState("");
  const [nearestReassignReport, setNearestReassignReport] = useState<CrmNearestReassignResponse | null>(null);
  const [nearestReassignBusy, setNearestReassignBusy] = useState(false);

  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [importPreviewSource, setImportPreviewSource] = useState<ImportPreviewSource>("excel");
  const [importing, setImporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCrmOpsModal, setShowCrmOpsModal] = useState(false);
  const [parsingPreview, setParsingPreview] = useState(false);
  const [previewRows, setPreviewRows] = useState<PreviewLeadRow[]>([]);
  const [duplicateIssues, setDuplicateIssues] = useState<DuplicateIssue[]>([]);
  const [previewParseError, setPreviewParseError] = useState<string>("");
  const [previewSheetName, setPreviewSheetName] = useState("");
  const [defaultImportDueDate, setDefaultImportDueDate] = useState("");
  const [previewDueDateOverrides, setPreviewDueDateOverrides] = useState<Record<number, string>>({});
  const [selectedPreviewRows, setSelectedPreviewRows] = useState<number[]>([]);
  const [bulkPreviewDueDate, setBulkPreviewDueDate] = useState("");

  const [autoFindOptions, setAutoFindOptions] = useState<AutoFindOptions | null>(null);
  const [autoFindCountry, setAutoFindCountry] = useState<"Canada" | "United States">("Canada");
  const [autoFindRegions, setAutoFindRegions] = useState<string[]>([]);
  const [autoFindCategories, setAutoFindCategories] = useState<string[]>([]);
  const [autoFindKeywords, setAutoFindKeywords] = useState("");
  const [autoFinding, setAutoFinding] = useState(false);
  const [autoFindResults, setAutoFindResults] = useState<AutoFindResultItem[]>([]);
  const [selectedAutoFindIds, setSelectedAutoFindIds] = useState<string[]>([]);
  const [autoFindPreviewResultIds, setAutoFindPreviewResultIds] = useState<string[]>([]);
  const [autoFindRawJson, setAutoFindRawJson] = useState<unknown>(null);
  const [autoFindRunId, setAutoFindRunId] = useState("");
  const [autoFindRunStatus, setAutoFindRunStatus] = useState<AutoFindRunStatus | "">("");
  const [autoFindProgress, setAutoFindProgress] = useState(0);
  const [autoFindProgressMessage, setAutoFindProgressMessage] = useState("");
  const [autoFindCompletedBatches, setAutoFindCompletedBatches] = useState(0);
  const [autoFindTotalBatches, setAutoFindTotalBatches] = useState(10);
  const [autoFindFailedBatches, setAutoFindFailedBatches] = useState(0);
  const [autoFindDuplicateCount, setAutoFindDuplicateCount] = useState(0);
  const autoFindPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoFindActiveRunRef = useRef("");

  function stopAutoFindPolling() {
    if (autoFindPollRef.current) {
      clearInterval(autoFindPollRef.current);
      autoFindPollRef.current = null;
    }
    autoFindActiveRunRef.current = "";
  }

  function clearAutoFindRunState() {
    stopAutoFindPolling();
    setAutoFinding(false);
    setAutoFindRunId("");
    setAutoFindRunStatus("");
    setAutoFindProgress(0);
    setAutoFindProgressMessage("");
    setAutoFindCompletedBatches(0);
    setAutoFindTotalBatches(10);
    setAutoFindFailedBatches(0);
    setAutoFindDuplicateCount(0);
  }

  function clearAutoFindResultsState() {
    setAutoFindResults([]);
    setSelectedAutoFindIds([]);
    setAutoFindPreviewResultIds([]);
    setAutoFindRawJson(null);
  }

  function applyAutoFindRunPayload(payload: AutoFindRunProgress) {
    setAutoFindRunId(payload.runId || "");
    setAutoFindRunStatus(payload.status || "");
    setAutoFindProgress(Math.max(0, Math.min(100, Number(payload.progress) || 0)));
    setAutoFindProgressMessage(payload.message || payload.error || "");
    setAutoFindCompletedBatches(Number(payload.completedBatches) || 0);
    setAutoFindTotalBatches(Number(payload.totalBatches) || 10);
    setAutoFindFailedBatches(Number(payload.failedBatches) || 0);
    setAutoFindDuplicateCount(Number(payload.duplicateCount) || 0);

    if (Array.isArray(payload.items)) {
      setAutoFindResults(payload.items);
      setAutoFindRawJson(payload.rawJson || { items: payload.items });
      setSelectedAutoFindIds(payload.items.filter((item) => !item.duplicate).map((item) => item.searchResultId));
    }
  }

  async function pollAutoFindRun(runId: string) {
    try {
      const res = await fetch(`/api/admin/crm/leads/auto-find/runs/${encodeURIComponent(runId)}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to load auto-find progress");
      if (autoFindActiveRunRef.current !== runId) return;

      const payload = json as AutoFindRunProgress;
      applyAutoFindRunPayload(payload);

      if (payload.status === "completed") {
        stopAutoFindPolling();
        setAutoFinding(false);
        const items = Array.isArray(payload.items) ? payload.items : [];
        pushToast(`Found ${items.length} client lead${items.length === 1 ? "" : "s"}`, "success");
      } else if (payload.status === "failed") {
        stopAutoFindPolling();
        setAutoFinding(false);
        pushToast(payload.error || payload.message || "Auto-find search failed", "error");
      }
    } catch (e: unknown) {
      if (autoFindActiveRunRef.current !== runId) return;
      stopAutoFindPolling();
      setAutoFinding(false);
      pushToast(e instanceof Error ? e.message : "Failed to load auto-find progress", "error");
    }
  }

  const userQuery = useMemo(() => {
    const p = new URLSearchParams();
    if (userQ.trim()) p.set("q", userQ.trim());
    if (crmFilter === "crm") p.set("isCrmAgent", "true");
    if (crmFilter === "noncrm") p.set("isCrmAgent", "false");
    p.set("page", "1");
    p.set("limit", "100");
    return p.toString();
  }, [crmFilter, userQ]);

  const leadDateRange = useMemo(() => {
    if (leadFromDate || leadToDate) {
      return { from: leadFromDate, to: leadToDate };
    }

    const year = Number.parseInt(leadYear, 10);
    if (!Number.isFinite(year) || year < 1970 || year > 9999 || leadMonths.length > 0) {
      return { from: "", to: "" };
    }

    return {
      from: `${year}-01-01`,
      to: `${year}-12-31`,
    };
  }, [leadFromDate, leadMonths.length, leadToDate, leadYear]);

  const leadQuery = useMemo(() => {
    const p = new URLSearchParams();
    if (leadQ.trim()) p.set("q", leadQ.trim());
    if (leadStatus) p.set("status", leadStatus);
    if (leadAssignedTo) p.set("assignedTo", leadAssignedTo);
    if (!leadFromDate && !leadToDate && leadMonths.length > 0 && leadYear) {
      p.set("months", leadMonths.join(","));
      p.set("year", leadYear);
    }
    if (leadDateRange.from) p.set("from", leadDateRange.from);
    if (leadDateRange.to) p.set("to", leadDateRange.to);
    p.set("page", "1");
    p.set("limit", "100");
    return p.toString();
  }, [leadAssignedTo, leadDateRange.from, leadDateRange.to, leadFromDate, leadMonths, leadQ, leadStatus, leadToDate, leadYear]);

  async function loadUsers() {
    setLoadingUsers(true);
    try {
      const res = await fetch(`/api/admin/crm/users?${userQuery}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to load CRM users");
      setUsers(json as UsersResponse);
    } catch (e: unknown) {
      pushToast(e instanceof Error ? e.message : "Failed to load CRM users", "error");
    } finally {
      setLoadingUsers(false);
    }
  }

  async function loadLeads() {
    setLoadingLeads(true);
    try {
      const res = await fetch(`/api/admin/crm/leads?${leadQuery}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to load CRM leads");
      setLeads(json as LeadsResponse);
    } catch (e: unknown) {
      pushToast(e instanceof Error ? e.message : "Failed to load CRM leads", "error");
    } finally {
      setLoadingLeads(false);
    }
  }

  async function loadImportFiles() {
    setLoadingImportFiles(true);
    try {
      const res = await fetch(`/api/admin/crm/import-files?page=1&limit=100`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to load imported Excel files");
      setImportFiles(json as ImportFilesResponse);
    } catch (e: unknown) {
      pushToast(e instanceof Error ? e.message : "Failed to load imported Excel files", "error");
    } finally {
      setLoadingImportFiles(false);
    }
  }

  async function loadAssignmentsByUpload() {
    setLoadingAssignments(true);
    try {
      const res = await fetch(`/api/admin/crm/assignments-by-upload`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to load assignments");
      setAssignmentsByUpload(Array.isArray(json?.items) ? json.items : []);
    } catch (e: unknown) {
      pushToast(e instanceof Error ? e.message : "Failed to load assignment distribution", "error");
    } finally {
      setLoadingAssignments(false);
    }
  }

  async function loadTransferReport() {
    setLoadingTransfers(true);
    try {
      const qs = new URLSearchParams();
      if (transferStatusFilter) qs.set("status", transferStatusFilter);
      if (transferAgentSearch.trim()) qs.set("agent", transferAgentSearch.trim());
      if (transferFromSearch.trim()) qs.set("from", transferFromSearch.trim());
      if (transferToSearch.trim()) qs.set("to", transferToSearch.trim());
      qs.set("page", "1");
      qs.set("limit", "100");
      const res = await fetch(`/api/admin/crm/transfers?${qs.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to load transfer report");
      setTransferReport(json as CrmTransferReportResponse);
    } catch (e: unknown) {
      pushToast(e instanceof Error ? e.message : "Failed to load transfer report", "error");
    } finally {
      setLoadingTransfers(false);
    }
  }

  async function runNearestReassignment(apply: boolean) {
    setNearestReassignBusy(true);
    try {
      const res = await fetch(`/api/admin/crm/leads/reassign-nearest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apply, limit: 100, includeClosed: false }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to recompute nearest assignments");
      setNearestReassignReport(json as CrmNearestReassignResponse);
      pushToast(
        apply
          ? `Applied nearest assignment to ${json?.appliedCount || 0} lead${json?.appliedCount === 1 ? "" : "s"}`
          : `Found ${json?.changedCount || 0} proposed reassignment${json?.changedCount === 1 ? "" : "s"}`,
        "success"
      );
      if (apply) {
        await Promise.all([loadLeads(), loadAssignmentsByUpload()]);
      }
    } catch (e: unknown) {
      pushToast(e instanceof Error ? e.message : "Failed to recompute nearest assignments", "error");
    } finally {
      setNearestReassignBusy(false);
    }
  }

  async function loadAutoFindOptions() {
    try {
      const res = await fetch(`/api/admin/crm/leads/auto-find`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to load auto-find options");
      const options = json as AutoFindOptions;
      setAutoFindOptions(options);
      if (!autoFindCategories.length && Array.isArray(options.categories)) {
        setAutoFindCategories(defaultAutoFindCategories(options.categories));
      }
    } catch (e: unknown) {
      pushToast(e instanceof Error ? e.message : "Failed to load auto-find options", "error");
    }
  }

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userQuery]);

  useEffect(() => {
    loadLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadQuery]);

  useEffect(() => {
    const handle = setTimeout(() => {
      void loadTransferReport();
    }, 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transferStatusFilter, transferAgentSearch, transferFromSearch, transferToSearch]);

  useEffect(() => {
    loadImportFiles();
    loadAssignmentsByUpload();
    loadAutoFindOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => stopAutoFindPolling();
  }, []);

  useEffect(() => {
    if (!leadAssignedTo) return;
    setSelectedUserIds((prev) => (prev.length === 1 && prev[0] === leadAssignedTo ? prev : [leadAssignedTo]));
  }, [leadAssignedTo]);

  async function toggleCrmAgent(user: CrmUserItem) {
    try {
      setUpdatingUserId(user._id);
      const res = await fetch(`/api/admin/crm/users/${user._id}/agent`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCrmAgent: !user.isCrmAgent }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to update CRM role");
      pushToast(!user.isCrmAgent ? "CRM role assigned" : "CRM role removed", "success");
      await Promise.all([loadUsers(), loadLeads()]);
    } catch (e: unknown) {
      pushToast(e instanceof Error ? e.message : "Failed to update CRM role", "error");
    } finally {
      setUpdatingUserId(null);
    }
  }

  function toggleSelectedUser(id: string, checked: boolean) {
    setSelectedUserIds((prev) => {
      if (checked) {
        if (prev.includes(id)) return prev;
        return [...prev, id];
      }
      return prev.filter((x) => x !== id);
    });
  }

  function resetPreviewState() {
    setExcelFile(null);
    setPreviewRows([]);
    setDuplicateIssues([]);
    setPreviewParseError("");
    setPreviewSheetName("");
    setDefaultImportDueDate("");
    setPreviewDueDateOverrides({});
    setSelectedPreviewRows([]);
    setBulkPreviewDueDate("");
  }

  function openExcelImportModal() {
    if (importPreviewSource !== "excel") {
      resetPreviewState();
      setImportPreviewSource("excel");
      setAutoFindPreviewResultIds([]);
    }
    setShowImportModal(true);
  }

  function closeImportPreviewModal() {
    if (importing) return;
    setShowImportModal(false);
    if (importPreviewSource === "autoFind") {
      resetPreviewState();
      setImportPreviewSource("excel");
      setAutoFindPreviewResultIds([]);
    }
  }

  function dueDateForPreviewRow(row: PreviewLeadRow): string {
    return previewDueDateOverrides[row.rowNumber] || defaultImportDueDate || row.dueDate || "";
  }

  function setPreviewRowDueDate(rowNumber: number, dueDate: string) {
    setPreviewDueDateOverrides((prev) => {
      const next = { ...prev };
      if (dueDate) next[rowNumber] = dueDate;
      else delete next[rowNumber];
      return next;
    });
  }

  function togglePreviewRowSelection(rowNumber: number, checked: boolean) {
    setSelectedPreviewRows((prev) => {
      if (checked) {
        if (prev.includes(rowNumber)) return prev;
        return [...prev, rowNumber];
      }
      return prev.filter((value) => value !== rowNumber);
    });
  }

  function applyBulkPreviewDueDate() {
    if (!bulkPreviewDueDate) {
      pushToast("Choose a due date to apply", "error");
      return;
    }
    const targetRows = selectedPreviewRows.filter((rowNumber) => !duplicateIssuesByRow.has(rowNumber));
    if (targetRows.length === 0) {
      pushToast("Select at least one ready row", "error");
      return;
    }
    setPreviewDueDateOverrides((prev) => {
      const next = { ...prev };
      targetRows.forEach((rowNumber) => {
        next[rowNumber] = bulkPreviewDueDate;
      });
      return next;
    });
    pushToast(`Due date applied to ${targetRows.length} row${targetRows.length === 1 ? "" : "s"}`, "success");
  }

  async function handleExcelFileChange(file: File | null) {
    setImportPreviewSource("excel");
    setAutoFindPreviewResultIds([]);
    setExcelFile(file);
    setPreviewRows([]);
    setDuplicateIssues([]);
    setPreviewParseError("");
    setPreviewSheetName("");
    setPreviewDueDateOverrides({});
    setSelectedPreviewRows([]);
    setBulkPreviewDueDate("");

    if (!file) return;

    try {
      setParsingPreview(true);
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const firstSheet = workbook.SheetNames[0];
      if (!firstSheet) throw new Error("Excel file has no sheets");

      const worksheet = workbook.Sheets[firstSheet];
      const rows = XLSX.utils.sheet_to_json<ExcelRow>(worksheet, { defval: "" });
      if (!rows.length) throw new Error("Excel file has no data rows");

      const built = buildPreviewRows(rows);
      setPreviewRows(built.parsedRows);
      setDuplicateIssues(built.duplicateIssues);
      setPreviewSheetName(firstSheet);
    } catch (e: unknown) {
      setPreviewParseError(e instanceof Error ? e.message : "Failed to parse Excel file");
    } finally {
      setParsingPreview(false);
    }
  }

  async function onImportLeads() {
    if (!excelFile) {
      pushToast("Please choose an Excel file first", "error");
      return;
    }

    if (duplicateIssues.length > 0) {
      pushToast("Remove duplicate rows before importing", "error");
      return;
    }

    try {
      setImporting(true);
      const wasAutoFindPreview = importPreviewSource === "autoFind";
      const formData = new FormData();
      formData.append("file", excelFile);
      formData.append("duplicateMode", "skip");
      const effectiveAssigneeIds = leadAssignedTo ? [leadAssignedTo] : selectedUserIds;
      if (effectiveAssigneeIds.length > 0) {
        formData.append("assignedToUserIds", JSON.stringify(effectiveAssigneeIds));
      }
      if (defaultImportDueDate) {
        formData.append("defaultDueDate", defaultImportDueDate);
      }
      const dueDateOverrides = Object.fromEntries(
        Object.entries(previewDueDateOverrides).filter(([, dueDate]) => Boolean(dueDate))
      );
      if (Object.keys(dueDateOverrides).length > 0) {
        formData.append("dueDateOverrides", JSON.stringify(dueDateOverrides));
      }

      const res = await fetch(`/api/admin/crm/leads/import`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to import CRM leads");

      const dupCount = json?.duplicateCount || 0;
      const msg = dupCount > 0
        ? `Imported ${json?.imported || 0} CRM leads (${dupCount} duplicate${dupCount === 1 ? "" : "s"} skipped)`
        : `Imported ${json?.imported || 0} CRM leads`;
      pushToast(msg, "success");
      resetPreviewState();
      setImportPreviewSource("excel");
      if (wasAutoFindPreview) {
        clearAutoFindRunState();
        clearAutoFindResultsState();
      }
      setAutoFindPreviewResultIds([]);
      setShowImportModal(false);
      await Promise.all([
        loadLeads(),
        loadImportFiles(),
        ...(wasAutoFindPreview ? [loadAssignmentsByUpload()] : []),
      ]);
    } catch (e: unknown) {
      pushToast(e instanceof Error ? e.message : "Failed to import CRM leads", "error");
    } finally {
      setImporting(false);
    }
  }

  function toggleAutoFindSelection(id: string, checked: boolean) {
    const item = autoFindResults.find((result) => result.searchResultId === id);
    if (item?.duplicate) {
      setSelectedAutoFindIds((prev) => prev.filter((value) => value !== id));
      return;
    }

    setSelectedAutoFindIds((prev) => {
      if (checked) {
        if (prev.includes(id)) return prev;
        return [...prev, id];
      }
      return prev.filter((value) => value !== id);
    });
  }

  function deleteAutoFindRow(id: string) {
    setAutoFindResults((prev) => prev.filter((item) => item.searchResultId !== id));
    setSelectedAutoFindIds((prev) => prev.filter((value) => value !== id));
    setAutoFindPreviewResultIds((prev) => prev.filter((value) => value !== id));
  }

  function resetAutoFindFilters() {
    clearAutoFindRunState();
    clearAutoFindResultsState();
    setAutoFindRegions([]);
    setAutoFindCategories(defaultAutoFindCategories(autoFindOptions?.categories));
  }

  function applyAutoFindRegionSelection(value: string | string[]) {
    const values = typeof value === "string" ? value.split(",") : value;
    if (values.includes(AUTO_SELECT_ALL_VALUE)) {
      const allSelected = autoFindRegions.length === autoFindRegionOptions.length && autoFindRegionOptions.length > 0;
      setAutoFindRegions(allSelected ? [] : [...autoFindRegionOptions]);
      return;
    }
    setAutoFindRegions(values);
  }

  function applyAutoFindCategorySelection(value: string | string[]) {
    const values = typeof value === "string" ? value.split(",") : value;
    const categoryOptions = autoFindOptions?.categories || [];
    if (values.includes(AUTO_SELECT_ALL_VALUE)) {
      const allSelected = autoFindCategories.length === categoryOptions.length && categoryOptions.length > 0;
      setAutoFindCategories(allSelected ? defaultAutoFindCategories(categoryOptions) : [...categoryOptions]);
      return;
    }
    setAutoFindCategories(values);
  }

  async function onAutoFindClients() {
    if (autoFindCategories.length === 0) {
      pushToast("Select at least one category", "error");
      return;
    }

    try {
      clearAutoFindRunState();
      clearAutoFindResultsState();
      setAutoFinding(true);
      setAutoFindRunStatus("queued");
      setAutoFindProgressMessage("Queued");
      const res = await fetch(`/api/admin/crm/leads/auto-find`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: autoFindCountry,
          regions: autoFindRegions,
          categories: autoFindCategories,
          keywords: autoFindKeywords,
          maxResults: autoFindOptions?.maxResults || 100,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to auto find clients");
      const runId = String(json?.runId || "");
      if (!runId) throw new Error("Auto-find run id was not returned");

      autoFindActiveRunRef.current = runId;
      setAutoFindRunId(runId);
      setAutoFindRunStatus((json?.status as AutoFindRunStatus) || "queued");
      setAutoFindProgress(Number(json?.progress) || 0);
      setAutoFindProgressMessage(json?.message || "Queued");
      setAutoFindCompletedBatches(Number(json?.completedBatches) || 0);
      setAutoFindTotalBatches(Number(json?.totalBatches) || 10);
      setAutoFindFailedBatches(Number(json?.failedBatches) || 0);

      void pollAutoFindRun(runId);
      autoFindPollRef.current = setInterval(() => {
        void pollAutoFindRun(runId);
      }, 1000);
    } catch (e: unknown) {
      stopAutoFindPolling();
      setAutoFinding(false);
      pushToast(e instanceof Error ? e.message : "Failed to auto find clients", "error");
    }
  }

  function openAutoFindImportPreview() {
    const readySelectedItems = autoFindResults
      .filter((item) => !item.duplicate && selectedAutoFindIds.includes(item.searchResultId))
      .filter((item) => item.searchResultId);
    const readySelectedIds = readySelectedItems.map((item) => item.searchResultId);

    if (readySelectedIds.length === 0) {
      pushToast("Select at least one auto-found lead", "error");
      return;
    }

    const excelRows = readySelectedItems.map(autoFindResultToExcelRow);
    const built = buildPreviewRows(excelRows);
    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Auto Find");
    const workbookOutput = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
    const generatedFile = new File(
      [workbookOutput],
      `crm-auto-find-${new Date().toISOString().slice(0, 10)}.xlsx`,
      { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
    );

    setImportPreviewSource("autoFind");
    setExcelFile(generatedFile);
    setPreviewRows(built.parsedRows);
    setDuplicateIssues(built.duplicateIssues);
    setPreviewParseError("");
    setPreviewSheetName("Auto Find");
    setPreviewDueDateOverrides({});
    setSelectedPreviewRows([]);
    setBulkPreviewDueDate("");
    setAutoFindPreviewResultIds(readySelectedIds);
    setShowImportModal(true);
  }

  function exportAutoFindExcel() {
    if (autoFindResults.length === 0) {
      pushToast("No auto-find results to export", "error");
      return;
    }
    const rows = autoFindResults.map((item) => {
      const lead = item.lead;
      return {
        Title: "CRM Auto Find Client",
        "Client Name": lead.clientName,
        "Company Name": lead.companyName,
        Email: lead.email,
        Phone: lead.phoneRaw,
        Website: lead.website,
        "Company Location": lead.companyLocation,
        "Contact Location": lead.contactLocation,
        "Contact Socials": lead.contactSocials,
        "Contact Linkedin": lead.contactLinkedinUrl,
        "Company Linkedin": lead.companyLinkedinUrl,
        Industry: lead.industry,
        "CRM Specialization": lead.suggestedSpecialization,
        Categories: (lead.categories || []).join(", "),
        "Source URL": lead.sourceUrl,
        "Source Title": lead.sourceTitle,
        "Source Platform": lead.sourcePlatform,
        Confidence: Math.round((lead.confidence || 0) * 100),
        Evidence: lead.evidence,
        "Query Used": lead.queryUsed,
        Notes: [lead.evidence, lead.sourceUrl ? `Source: ${lead.sourceUrl}` : ""].filter(Boolean).join(" | "),
        List: ["Auto Find", ...(lead.categories || [])].join(", "),
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Auto Find Leads");
    XLSX.writeFile(workbook, `crm-auto-find-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function downloadAutoFindJson() {
    const payload = {
      leads: autoFindResults.map((item) => item.lead),
      items: autoFindResults,
      original: autoFindRawJson,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `crm-auto-find-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function deleteImportedFile(item: CrmImportFileItem) {
    const label = item.sourceFileName || "this uploaded Excel file";
    const ok = window.confirm(
      `Delete ${label}? This will also permanently delete ${item.leadCount} CRM leads imported from it.`
    );
    if (!ok) return;

    try {
      setDeletingBatchId(item.sourceBatchId);
      const res = await fetch(`/api/admin/crm/import-files/${item.sourceBatchId}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to delete imported file");

      pushToast(`Deleted file batch and ${json?.deletedLeads || item.leadCount} associated leads`, "success");
      await Promise.all([loadLeads(), loadImportFiles()]);
    } catch (e: unknown) {
      pushToast(e instanceof Error ? e.message : "Failed to delete imported file", "error");
    } finally {
      setDeletingBatchId(null);
    }
  }

  async function deleteLead(lead: CrmLeadItem) {
    const label = lead.clientName || lead.email || "this lead";
    const ok = window.confirm(
      `Permanently delete lead "${label}"? This will also delete all updates, attachments, and recordings associated with it.`
    );
    if (!ok) return;

    try {
      setDeletingLeadId(lead._id);
      const res = await fetch(`/api/admin/crm/leads/${encodeURIComponent(lead._id)}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to delete lead");

      pushToast(`Lead "${label}" deleted`, "success");
      if (activeLeadDetails?._id === lead._id) {
        closeLeadDetailsModal();
      }
      await loadLeads();
    } catch (e: unknown) {
      pushToast(e instanceof Error ? e.message : "Failed to delete lead", "error");
    } finally {
      setDeletingLeadId(null);
    }
  }

  function closeLeadDetailsModal() {
    if (submittingAdminReply || savingLeadStatus) return;
    setShowLeadDetailsModal(false);
    setActiveLeadDetails(null);
    setLeadDetailsError("");
    setAdminReply("");
    setAdminReplyStatus("");
    setAdminReplyLostReason("");
    setTimelineBusyKey(null);
    setEditingUpdateId(null);
    setEditingComment("");
    setEditingStatus("new_lead");
    setEditingLostReason("");
  }

  async function openLeadDetailsModal(leadId: string) {
    setShowLeadDetailsModal(true);
    setLeadDetailsLoadingId(leadId);
    setLeadDetailsError("");
    setAdminReply("");

    try {
      const res = await fetch(`/api/admin/crm/leads/${leadId}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to load lead details");

      const item = json?.item as CrmLeadItem;
      setActiveLeadDetails(item);
      setAdminReplyStatus(item?.status || "new_lead");
      setAdminReplyLostReason(item?.lostReason || "");
      setEditingStatus(item?.status || "new_lead");
      setEditingLostReason(item?.lostReason || "");
    } catch (e: unknown) {
      setLeadDetailsError(e instanceof Error ? e.message : "Failed to load lead details");
    } finally {
      setLeadDetailsLoadingId(null);
    }
  }

  function applyLeadMutation(item: CrmLeadItem) {
    setActiveLeadDetails(item);
    setAdminReplyStatus(item?.status || "new_lead");
    setAdminReplyLostReason(item?.lostReason || "");
    setLeads((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: (prev.items || []).map((lead) => (lead._id === item._id ? item : lead)),
      };
    });
  }

  function beginEditLeadUpdate(update: CrmLeadUpdateItem) {
    const updateId = normalizeUpdateId(update?._id);
    if (!updateId) return;
    setEditingUpdateId(updateId);
    setEditingComment(update.comment || "");
    setEditingStatus(update.status || activeLeadDetails?.status || "new_lead");
    setEditingLostReason(update.lostReason || activeLeadDetails?.lostReason || "");
  }

  function cancelEditLeadUpdate() {
    setEditingUpdateId(null);
    setEditingComment("");
    setEditingStatus(activeLeadDetails?.status || "new_lead");
    setEditingLostReason(activeLeadDetails?.lostReason || "");
  }

  async function saveEditedLeadUpdate(update: CrmLeadUpdateItem) {
    const leadId = toText(activeLeadDetails?._id);
    const updateId = normalizeUpdateId(update?._id);
    if (!leadId || !updateId) return;
    const safeLeadId = encodeURIComponent(leadId);
    const safeUpdateId = encodeURIComponent(updateId);

    if (editingStatus === "lost" && !editingLostReason) {
      pushToast("Lost reason is required", "error");
      return;
    }

    try {
      setTimelineBusyKey(`edit:${updateId}`);
      const res = await fetch(`/api/admin/crm/leads/${safeLeadId}/updates/${safeUpdateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment: editingComment,
          status: editingStatus,
          lostReason: editingStatus === "lost" ? editingLostReason : undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to edit update");

      const item = json?.item as CrmLeadItem;
      applyLeadMutation(item);
      setEditingUpdateId(null);
      setEditingComment("");
      setEditingLostReason("");
      pushToast("Update edited", "success");
    } catch (e: unknown) {
      pushToast(e instanceof Error ? e.message : "Failed to edit update", "error");
    } finally {
      setTimelineBusyKey(null);
    }
  }

  async function deleteLeadUpdate(update: CrmLeadUpdateItem) {
    const leadId = toText(activeLeadDetails?._id);
    const updateId = normalizeUpdateId(update?._id);
    if (!leadId || !updateId) return;
    const safeLeadId = encodeURIComponent(leadId);
    const safeUpdateId = encodeURIComponent(updateId);
    const ok = window.confirm("Delete this update and all media attached to it?");
    if (!ok) return;

    try {
      setTimelineBusyKey(`delete:${updateId}`);
      const res = await fetch(`/api/admin/crm/leads/${safeLeadId}/updates/${safeUpdateId}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to delete update");

      const item = json?.item as CrmLeadItem;
      applyLeadMutation(item);
      pushToast("Update deleted", "success");
    } catch (e: unknown) {
      pushToast(e instanceof Error ? e.message : "Failed to delete update", "error");
    } finally {
      setTimelineBusyKey(null);
    }
  }

  async function deleteLeadUpdateAttachment(update: CrmLeadUpdateItem, url: string) {
    const leadId = toText(activeLeadDetails?._id);
    const updateId = normalizeUpdateId(update?._id);
    if (!leadId || !updateId || !url) return;
    const safeLeadId = encodeURIComponent(leadId);
    const safeUpdateId = encodeURIComponent(updateId);

    try {
      setTimelineBusyKey(`attachment:${updateId}:${url}`);
      const res = await fetch(`/api/admin/crm/leads/${safeLeadId}/updates/${safeUpdateId}/attachments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: [url] }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to delete attachment");

      const item = json?.item as CrmLeadItem;
      applyLeadMutation(item);
      pushToast("Attachment removed", "success");
    } catch (e: unknown) {
      pushToast(e instanceof Error ? e.message : "Failed to delete attachment", "error");
    } finally {
      setTimelineBusyKey(null);
    }
  }

  async function deleteLeadUpdateRecording(update: CrmLeadUpdateItem) {
    const leadId = toText(activeLeadDetails?._id);
    const updateId = normalizeUpdateId(update?._id);
    if (!leadId || !updateId) return;
    const safeLeadId = encodeURIComponent(leadId);
    const safeUpdateId = encodeURIComponent(updateId);

    try {
      setTimelineBusyKey(`recording:${updateId}`);
      const res = await fetch(`/api/admin/crm/leads/${safeLeadId}/updates/${safeUpdateId}/recording`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to delete recording");

      const item = json?.item as CrmLeadItem;
      applyLeadMutation(item);
      pushToast("Voice recording deleted", "success");
    } catch (e: unknown) {
      pushToast(e instanceof Error ? e.message : "Failed to delete recording", "error");
    } finally {
      setTimelineBusyKey(null);
    }
  }

  async function submitAdminLeadReply() {
    if (!activeLeadDetails) return;
    const comment = adminReply.trim();
    if (!comment) {
      pushToast("Reply comment is required", "error");
      return;
    }
    if ((adminReplyStatus || activeLeadDetails.status) === "lost" && !(adminReplyLostReason || activeLeadDetails.lostReason)) {
      pushToast("Lost reason is required", "error");
      return;
    }

    try {
      setSubmittingAdminReply(true);
      const res = await fetch(`/api/admin/crm/leads/${activeLeadDetails._id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment,
          status: adminReplyStatus || activeLeadDetails.status,
          lostReason:
            (adminReplyStatus || activeLeadDetails.status) === "lost"
              ? (adminReplyLostReason || activeLeadDetails.lostReason)
              : undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to submit admin reply");

      const item = json?.item as CrmLeadItem;
      setActiveLeadDetails(item);
      setAdminReply("");
      setAdminReplyStatus(item?.status || adminReplyStatus);
      setAdminReplyLostReason(item?.lostReason || "");
      pushToast("Reply sent to CRM thread", "success");
      await loadLeads();
    } catch (e: unknown) {
      pushToast(e instanceof Error ? e.message : "Failed to submit admin reply", "error");
    } finally {
      setSubmittingAdminReply(false);
    }
  }

  async function saveAdminLeadStatus() {
    if (!activeLeadDetails) return;
    const nextStatus = adminReplyStatus || activeLeadDetails.status || "new_lead";
    const nextLostReason = nextStatus === "lost" ? adminReplyLostReason : "";

    if (nextStatus === "lost" && !nextLostReason) {
      pushToast("Lost reason is required", "error");
      return;
    }

    try {
      setSavingLeadStatus(true);
      const res = await fetch(`/api/admin/crm/leads/${activeLeadDetails._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          lostReason: nextStatus === "lost" ? nextLostReason : undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to save lead status");

      const item = json?.item as CrmLeadItem;
      applyLeadMutation(item);
      pushToast("Lead status updated", "success");
      await loadLeads();
    } catch (e: unknown) {
      pushToast(e instanceof Error ? e.message : "Failed to save lead status", "error");
    } finally {
      setSavingLeadStatus(false);
    }
  }

  const crmUsersCount = users?.items?.filter((u) => u.isCrmAgent).length || 0;
  const totalUsersCount = users?.total || 0;
  const duplicateIssuesByRow = useMemo(() => {
    const map = new Map<number, string[]>();
    duplicateIssues.forEach((issue) => {
      const existing = map.get(issue.rowNumber) || [];
      existing.push(issue.reason);
      map.set(issue.rowNumber, existing);
    });
    return map;
  }, [duplicateIssues]);
  const rowCountWithDuplicates = duplicateIssuesByRow.size;
  const readyPreviewRows = Math.max(0, previewRows.length - rowCountWithDuplicates);
  const readyPreviewRowNumbers = useMemo(
    () => previewRows.filter((row) => !duplicateIssuesByRow.has(row.rowNumber)).map((row) => row.rowNumber),
    [duplicateIssuesByRow, previewRows]
  );
  const selectedReadyPreviewRows = useMemo(
    () => selectedPreviewRows.filter((rowNumber) => readyPreviewRowNumbers.includes(rowNumber)),
    [readyPreviewRowNumbers, selectedPreviewRows]
  );
  const allReadyPreviewRowsSelected =
    readyPreviewRowNumbers.length > 0 && readyPreviewRowNumbers.every((rowNumber) => selectedPreviewRows.includes(rowNumber));
  const effectiveImportAssigneeIds = useMemo(
    () => (leadAssignedTo ? [leadAssignedTo] : selectedUserIds),
    [leadAssignedTo, selectedUserIds]
  );
  const selectedAssignees = useMemo(
    () => (users?.items || []).filter((u) => effectiveImportAssigneeIds.includes(u._id)),
    [effectiveImportAssigneeIds, users?.items]
  );
  const autoFindRegionOptions = useMemo(
    () => (autoFindCountry === "Canada" ? autoFindOptions?.canadaProvinces || [] : autoFindOptions?.usStates || []),
    [autoFindCountry, autoFindOptions?.canadaProvinces, autoFindOptions?.usStates]
  );
  const allAutoFindRegionsSelected = autoFindRegionOptions.length > 0 && autoFindRegions.length === autoFindRegionOptions.length;
  const allAutoFindCategoriesSelected = Boolean(autoFindOptions?.categories?.length) && autoFindCategories.length === (autoFindOptions?.categories || []).length;
  const selectedAutoFindReadyCount = useMemo(
    () => autoFindResults.filter((item) => !item.duplicate && selectedAutoFindIds.includes(item.searchResultId)).length,
    [autoFindResults, selectedAutoFindIds]
  );
  const isAutoFindImportPreview = importPreviewSource === "autoFind";
  const importPreviewBusy = importing;
  const importPreviewCanImport =
    !importPreviewBusy &&
    !parsingPreview &&
    previewRows.length > 0 &&
    duplicateIssues.length === 0 &&
    Boolean(excelFile);
  useEffect(() => {
    setAutoFindRegions((prev) => prev.filter((region) => autoFindRegionOptions.includes(region)));
  }, [autoFindRegionOptions]);
  const activeLeadUpdates = useMemo(
    () => sortedLeadUpdates(activeLeadDetails?.updates),
    [activeLeadDetails?.updates]
  );
  const crmAgentUsers = useMemo(
    () => (users?.items || []).filter((u) => u.isCrmAgent),
    [users?.items]
  );
  const leadStatusCountMap = useMemo(() => {
    const map = new Map<string, number>();
    CRM_STATUSES.forEach((status) => {
      map.set(status, 0);
    });
    (leads?.statusCounts || []).forEach((entry) => {
      const key = typeof entry?._id === "string" ? entry._id : "";
      if (!map.has(key)) return;
      map.set(key, Number(entry?.count || 0));
    });

    const hasServerCounts = Array.from(map.values()).some((count) => count > 0);
    if (!hasServerCounts && (leads?.items || []).length > 0) {
      (leads?.items || []).forEach((lead) => {
        const normalizedStatus = normalizeLeadStatus(lead.status, lead.lostReason);
        if (!map.has(normalizedStatus)) return;
        map.set(normalizedStatus, (map.get(normalizedStatus) || 0) + 1);
      });
    }

    return map;
  }, [leads?.items, leads?.statusCounts]);

  const overdueLeadsCount = Number(leads?.overdueCount || 0);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const out = new Set<number>([currentYear, currentYear - 1, currentYear + 1]);
    (leads?.items || []).forEach((lead) => {
      const dt = new Date(lead.createdAt || "");
      if (Number.isFinite(dt.getTime())) out.add(dt.getFullYear());
    });
    return [...out].sort((a, b) => b - a);
  }, [leads?.items]);

  const crmVsNonCrmChartData = useMemo(() => {
    const nonCrmCount = Math.max(totalUsersCount - crmUsersCount, 0);
    return {
      labels: ["CRM Agents", "Non-CRM Users"],
      datasets: [
        {
          data: [crmUsersCount, nonCrmCount],
          backgroundColor: ["rgba(14,165,233,0.85)", "rgba(148,163,184,0.8)"],
          borderColor: ["#0284C7", "#64748B"],
          borderWidth: 1,
        },
      ],
    };
  }, [crmUsersCount, totalUsersCount]);

  const leadStatusChartData = useMemo(() => {
    const counts = CRM_STATUSES.map((status) => leadStatusCountMap.get(status) || 0);
    return {
      labels: CRM_STATUSES.map((status) => statusLabel(status)),
      datasets: [
        {
          label: "Leads",
          data: counts,
          backgroundColor: ["#0EA5E9", "#2563EB", "#F59E0B", "#6366F1", "#EC4899", "#7C3AED", "#16A34A", "#EF4444"],
          borderRadius: 6,
        },
      ],
    };
  }, [leadStatusCountMap]);

  const importTrendChartData = useMemo(() => {
    const items = (importFiles?.items || []).slice(0, 7).reverse();
    return {
      labels: items.map((item, idx) => (item.sourceFileName || `Batch ${idx + 1}`).slice(0, 16)),
      datasets: [
        {
          label: "Imported leads",
          data: items.map((item) => item.leadCount),
          borderColor: "#F43F5E",
          backgroundColor: "rgba(244,63,94,0.18)",
          fill: true,
          tension: 0.35,
          pointRadius: 2,
        },
      ],
    };
  }, [importFiles?.items]);

  const assignmentUploadRows = useMemo<AssignmentByUploadSummary[]>(() => {
    const grouped = new Map<string, AssignmentByUploadSummary>();

    for (const row of assignmentsByUpload) {
      const existing = grouped.get(row.sourceBatchId);
      if (existing) {
        existing.leadCount += row.leadCount || 0;
        existing.overdueCount += row.overdueCount || 0;
        existing.agents.push({
          agentId: row.agentId,
          agentEmail: row.agentEmail,
          agentUsername: row.agentUsername,
          leadCount: row.leadCount || 0,
        });
        continue;
      }

      grouped.set(row.sourceBatchId, {
        sourceBatchId: row.sourceBatchId,
        sourceFileName: row.sourceFileName,
        importedAt: row.importedAt,
        leadCount: row.leadCount || 0,
        overdueCount: row.overdueCount || 0,
        agents: [
          {
            agentId: row.agentId,
            agentEmail: row.agentEmail,
            agentUsername: row.agentUsername,
            leadCount: row.leadCount || 0,
          },
        ],
      });
    }

    return Array.from(grouped.values()).sort((a, b) => {
      const aTime = new Date(a.importedAt || "").getTime() || 0;
      const bTime = new Date(b.importedAt || "").getTime() || 0;
      return bTime - aTime;
    });
  }, [assignmentsByUpload]);

  const transferStatusCountMap = useMemo(() => {
    const map = new Map<string, number>();
    ["pending", "accepted", "rejected", "cancelled"].forEach((status) => map.set(status, 0));
    (transferReport?.statusCounts || []).forEach((entry) => {
      const key = typeof entry?._id === "string" ? entry._id : "";
      if (!map.has(key)) return;
      map.set(key, Number(entry?.count || 0));
    });
    return map;
  }, [transferReport?.statusCounts]);

  const compactChartOptions = useMemo<ChartOptions<"bar">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: {
          ticks: { color: "#475569", font: { size: 11 } },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: { color: "#475569", font: { size: 11 }, precision: 0 },
          grid: { color: "rgba(148,163,184,0.25)" },
        },
      },
    }),
    []
  );

  const compactLineOptions = useMemo<ChartOptions<"line">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: {
          ticks: { color: "#475569", font: { size: 11 } },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: { color: "#475569", font: { size: 11 }, precision: 0 },
          grid: { color: "rgba(148,163,184,0.25)" },
        },
      },
    }),
    []
  );

  const leadStatusPieData = useMemo(() => {
    const counts = CRM_STATUSES.map((status) => leadStatusCountMap.get(status) || 0);
    return {
      labels: CRM_STATUSES.map(statusLabel),
      datasets: [{
        data: counts,
        backgroundColor: [
          "rgba(14,165,233,0.8)",
          "rgba(37,99,235,0.8)",
          "rgba(245,158,11,0.8)",
          "rgba(99,102,241,0.8)",
          "rgba(236,72,153,0.8)",
          "rgba(124,58,237,0.8)",
          "rgba(22,163,74,0.8)",
          "rgba(239,68,68,0.8)",
        ],
        borderColor: ["#0EA5E9", "#2563EB", "#F59E0B", "#6366F1", "#EC4899", "#7C3AED", "#16A34A", "#EF4444"],
        borderWidth: 1.5,
      }],
    };
  }, [leadStatusCountMap]);

  const leadStatusLegendItems = useMemo(
    () =>
      CRM_STATUSES.map((status, index) => ({
        key: status,
        label: statusLabel(status),
        count: Number(leadStatusPieData.datasets[0]?.data?.[index] || 0),
        color: String(leadStatusPieData.datasets[0]?.borderColor?.[index] || "#64748B"),
      })),
    [leadStatusPieData]
  );

  const leadsPerAgentData = useMemo(() => {
    const agentMap = new Map<string, number>();
    (leads?.items || []).forEach((lead) => {
      const name = lead.assignedTo?.username || lead.assignedTo?.email || "Unassigned";
      agentMap.set(name, (agentMap.get(name) || 0) + 1);
    });
    const entries = [...agentMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    return {
      labels: entries.map(([name]) => name.length > 14 ? name.slice(0, 14) + "..." : name),
      datasets: [{
        label: "Leads",
        data: entries.map(([, count]) => count),
        backgroundColor: "rgba(244,63,94,0.75)",
        borderColor: "#F43F5E",
        borderWidth: 1,
        borderRadius: 6,
      }],
    };
  }, [leads?.items]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: "auto" }}>
      <Stack spacing={3}>
        {/* ── Header + Filters + Stats ── */}
        <Card>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Stack spacing={2.5}>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "flex-start", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="h5" fontWeight={800}>CRM Control Center</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Assign CRM roles, import lead sheets, and monitor task activity.
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<GroupsRoundedIcon />}
                  onClick={() => setShowCrmOpsModal(true)}
                >
                  Team Ops
                </Button>
              </Box>

              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Salesperson</InputLabel>
                    <Select value={leadAssignedTo} label="Salesperson" onChange={(e) => setLeadAssignedTo(e.target.value)} {...crmSelectOpenProps("control-salesperson")}>
                      {renderCrmMenuHeader("Salesperson")}
                      <MenuItem value="">All CRM Agents</MenuItem>
                      {crmAgentUsers.map((u) => (
                        <MenuItem key={u._id} value={u._id}>{u.username || u.email}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Months</InputLabel>
                    <Select
                      multiple
                      value={leadMonths}
                      label="Months"
                      onChange={(e) => setLeadMonths(typeof e.target.value === "string" ? e.target.value.split(",") : e.target.value)}
                      {...crmSelectOpenProps("control-months")}
                      renderValue={(selected) => {
                        const values = Array.isArray(selected) ? selected : [];
                        if (!values.length) return "All Months";
                        return values
                          .map((value) => MONTH_OPTIONS.find((m) => m.value === value)?.label || value)
                          .join(", ");
                      }}
                    >
                      {renderCrmMenuHeader("Months")}
                      {MONTH_OPTIONS.map((m) => (
                        <MenuItem key={m.value} value={m.value}>
                          <Checkbox size="small" checked={leadMonths.includes(m.value)} />
                          <Typography variant="body2">{m.label}</Typography>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Year</InputLabel>
                    <Select value={leadYear} label="Year" onChange={(e) => setLeadYear(e.target.value)} {...crmSelectOpenProps("control-year")}>
                      {renderCrmMenuHeader("Year")}
                      <MenuItem value="">All</MenuItem>
                      {yearOptions.map((year) => (
                        <MenuItem key={year} value={String(year)}>{year}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="From Date"
                    value={leadFromDate}
                    onChange={(e) => setLeadFromDate(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="To Date"
                    value={leadToDate}
                    onChange={(e) => setLeadToDate(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Grid>
              </Grid>

              <Grid container spacing={1.5}>
                {([
                  { label: "CRM Agents", value: crmUsersCount, color: "primary.main" },
                  { label: "Total Leads", value: leads?.total || 0, color: "info.main" },
                  { label: "Total Users", value: totalUsersCount, color: "text.primary" },
                  { label: "Overdue", value: overdueLeadsCount, color: "error.main" },
                ] as const).map((stat) => (
                  <Grid key={stat.label} size={{ xs: 6, sm: 3 }}>
                    <Card variant="outlined" sx={{ textAlign: "center", py: 1.5 }}>
                      <Typography variant="overline" color="text.secondary" sx={{ fontSize: "0.65rem" }}>
                        {stat.label}
                      </Typography>
                      <Typography variant="h5" fontWeight={800} color={stat.color}>
                        {stat.value}
                      </Typography>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Stack>
          </CardContent>
        </Card>

        {/* ── Charts ── */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={700}>Lead Status Distribution</Typography>
                <Typography variant="caption" color="text.secondary">Breakdown of all leads by current status.</Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }} sx={{ mt: 1.5 }}>
                  <Box sx={{ height: 220, flex: { xs: "0 0 auto", sm: 1 }, minWidth: 0 }}>
                    <Pie
                      data={leadStatusPieData}
                      options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }}
                    />
                  </Box>
                  <Stack spacing={1} sx={{ width: { xs: "100%", sm: 190 }, flexShrink: 0 }}>
                    {leadStatusLegendItems.map((item) => (
                      <Stack
                        key={item.key}
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{ borderRadius: 2, px: 1.25, py: 0.85, bgcolor: "rgba(148,163,184,0.08)" }}
                      >
                        <Stack direction="row" spacing={1} alignItems="center" minWidth={0}>
                          <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: item.color, flexShrink: 0 }} />
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.78rem" }} noWrap>
                            {item.label}
                          </Typography>
                        </Stack>
                        <Typography variant="subtitle2" fontWeight={800} sx={{ minWidth: 20, textAlign: "right" }}>
                          {item.count}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={700}>Leads per Agent</Typography>
                <Typography variant="caption" color="text.secondary">Top assigned CRM agents by lead count.</Typography>
                <Box sx={{ height: 220, mt: 1.5 }}>
                  <Bar data={leadsPerAgentData} options={compactChartOptions} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* ── Import Leads ── */}
        <Card>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2}>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>Import Leads (Excel)</Typography>
                <Typography variant="body2" color="text.secondary">
                  Upload Excel, preview extracted rows, and block duplicates before import.
                </Typography>
              </Box>
              <Button variant="contained" startIcon={<CloudUploadRoundedIcon />} onClick={openExcelImportModal}>
                Upload Preview
              </Button>
            </Stack>
            {excelFile && (
              <Chip
                icon={<AttachFileRoundedIcon sx={{ fontSize: 16 }} />}
                label={excelFile.name}
                color="info"
                variant="outlined"
                size="small"
                sx={{ mt: 1.5 }}
              />
            )}
          </CardContent>
        </Card>

        {/* Auto Find Clients */}
        <Card>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "flex-start" }} spacing={2}>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>Auto Find New Leads</Typography>
                <Typography variant="body2" color="text.secondary">
                  Search public web results for CRM prospects, preview them, then import selected leads.
                </Typography>
              </Box>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ width: { xs: "100%", md: "auto" } }}>
                <Button
                  variant="outlined"
                  startIcon={<DownloadRoundedIcon />}
                  onClick={exportAutoFindExcel}
                  disabled={autoFindResults.length === 0}
                >
                  Excel
                </Button>
                <Button
                  variant="outlined"
                  onClick={downloadAutoFindJson}
                  disabled={autoFindResults.length === 0}
                >
                  JSON
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CloudUploadRoundedIcon />}
                  onClick={openAutoFindImportPreview}
                  disabled={autoFinding || selectedAutoFindReadyCount === 0}
                >
                  {`Import ${selectedAutoFindReadyCount}`}
                </Button>
              </Stack>
            </Stack>

            <Grid container spacing={1.5} sx={{ mt: 2 }}>
              <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Country</InputLabel>
                  <Select
                    value={autoFindCountry}
                    label="Country"
                    open={openAutoFindDropdown === "country"}
                    onOpen={() => setOpenAutoFindDropdown("country")}
                    onClose={() => setOpenAutoFindDropdown(null)}
                    MenuProps={autoFindSelectMenuProps}
                    sx={autoFindSelectSx}
                    onChange={(e) => {
                      setAutoFindCountry(e.target.value as "Canada" | "United States");
                      setAutoFindRegions([]);
                    }}
                  >
                    {renderAutoFindMenuHeader("Country")}
                    {(autoFindOptions?.countries || ["Canada", "United States"]).map((country) => (
                      <MenuItem key={country} value={country} sx={autoFindMenuItemSx}>
                        <Typography variant="body2">{country}</Typography>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>{autoFindCountry === "Canada" ? "Provinces" : "States"}</InputLabel>
                  <Select
                    multiple
                    value={autoFindRegions}
                    label={autoFindCountry === "Canada" ? "Provinces" : "States"}
                    open={openAutoFindDropdown === "regions"}
                    onOpen={() => setOpenAutoFindDropdown("regions")}
                    onClose={() => setOpenAutoFindDropdown(null)}
                    MenuProps={autoFindSelectMenuProps}
                    sx={autoFindSelectSx}
                    renderValue={(selected) => {
                      const values = selected as string[];
                      if (!values.length || values.length === autoFindRegionOptions.length) return "All";
                      return values.join(", ");
                    }}
                    onChange={(e) => {
                      applyAutoFindRegionSelection(e.target.value);
                    }}
                  >
                    {renderAutoFindMenuHeader(autoFindCountry === "Canada" ? "Provinces" : "States")}
                    <MenuItem value={AUTO_SELECT_ALL_VALUE} sx={autoFindMenuItemSx}>
                      <Checkbox size="small" checked={allAutoFindRegionsSelected || autoFindRegions.length === 0} sx={{ flexShrink: 0 }} />
                      <Typography variant="body2">All</Typography>
                    </MenuItem>
                    {autoFindRegionOptions.map((region) => (
                      <MenuItem key={region} value={region} sx={autoFindMenuItemSx}>
                        <Checkbox size="small" checked={autoFindRegions.includes(region)} sx={{ flexShrink: 0 }} />
                        <Typography variant="body2">{region}</Typography>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Categories</InputLabel>
                  <Select
                    multiple
                    value={autoFindCategories}
                    label="Categories"
                    open={openAutoFindDropdown === "categories"}
                    onOpen={() => setOpenAutoFindDropdown("categories")}
                    onClose={() => setOpenAutoFindDropdown(null)}
                    MenuProps={autoFindSelectMenuProps}
                    sx={autoFindSelectSx}
                    renderValue={(selected) => {
                      const values = selected as string[];
                      if (values.length === (autoFindOptions?.categories || []).length) return "All";
                      return values.join(", ");
                    }}
                    onChange={(e) => {
                      applyAutoFindCategorySelection(e.target.value);
                    }}
                  >
                    {renderAutoFindMenuHeader("Categories")}
                    <MenuItem value={AUTO_SELECT_ALL_VALUE} sx={autoFindMenuItemSx}>
                      <Checkbox size="small" checked={allAutoFindCategoriesSelected} sx={{ flexShrink: 0 }} />
                      <Typography variant="body2">All</Typography>
                    </MenuItem>
                    {(autoFindOptions?.categories || []).map((category) => (
                      <MenuItem key={category} value={category} sx={autoFindMenuItemSx}>
                        <Checkbox size="small" checked={autoFindCategories.includes(category)} sx={{ flexShrink: 0 }} />
                        <Typography variant="body2">{category}</Typography>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  size="small"
                  label="Keywords"
                  placeholder="auction, fleet, insurance"
                  value={autoFindKeywords}
                  onChange={(e) => setAutoFindKeywords(e.target.value)}
                  fullWidth
                />
              </Grid>
            </Grid>

            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1.5} sx={{ mt: 1.5 }}>
              <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.5}>
                {selectedAssignees.length > 0 ? selectedAssignees.map((agent) => (
                  <Chip key={agent._id} label={`Import to ${agent.username || agent.email}${agent.crmAddress ? ` (${agent.crmAddress})` : ""}`} size="small" variant="outlined" />
                )) : (
                  <Chip label="Imports auto-distribute to all active CRM agents" size="small" variant="outlined" />
                )}
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ width: { xs: "100%", sm: "auto" } }}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshRoundedIcon />}
                  onClick={resetAutoFindFilters}
                >
                  {autoFinding ? "Cancel" : "Reset"}
                </Button>
                <Button
                  variant="contained"
                  startIcon={<SearchRoundedIcon />}
                  onClick={() => void onAutoFindClients()}
                  disabled={autoFinding || autoFindCategories.length === 0}
                >
                  {autoFinding ? `Searching ${Math.round(autoFindProgress)}%` : "Find New Leads"}
                </Button>
              </Stack>
            </Stack>

            {(autoFinding || autoFindRunStatus) && (
              <Box sx={{ mt: 2 }} data-auto-find-run-id={autoFindRunId || undefined}>
                <LinearProgress
                  variant="determinate"
                  value={Math.max(0, Math.min(100, autoFindProgress))}
                  sx={{ borderRadius: 1 }}
                />
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={0.75} sx={{ mt: 0.75 }}>
                  <Typography variant="caption" color="text.secondary">
                    {autoFindProgressMessage || (autoFinding ? "Searching public web sources" : "Search complete")}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {`${autoFindCompletedBatches}/${autoFindTotalBatches} searches | ${autoFindResults.length} found | ${autoFindDuplicateCount} duplicate${autoFindDuplicateCount === 1 ? "" : "s"}${autoFindFailedBatches ? ` | ${autoFindFailedBatches} failed` : ""}`}
                  </Typography>
                </Stack>
              </Box>
            )}

            {autoFindResults.length > 0 && (
              <TableContainer sx={{ maxHeight: 420, mt: 2 }}>
                <Table size="small" stickyHeader sx={{ minWidth: 2200 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox" />
                      <TableCell sx={{ fontWeight: 700 }}>Client Name</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Company Name</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Website</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Company Location</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Contact Location</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Socials</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>LinkedIn</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Industry</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Specialization</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Categories</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Source</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Confidence</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Evidence</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {autoFindResults.map((item) => {
                      const lead = item.lead;
                      const selected = !item.duplicate && selectedAutoFindIds.includes(item.searchResultId);
                      return (
                        <TableRow key={item.searchResultId} hover>
                          <TableCell padding="checkbox">
                            <Checkbox
                              size="small"
                              checked={selected}
                              disabled={autoFinding || item.duplicate}
                              onChange={(e) => toggleAutoFindSelection(item.searchResultId, e.target.checked)}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={700} noWrap sx={{ maxWidth: 180 }}>{lead.clientName || "-"}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>{lead.companyName || "-"}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" noWrap sx={{ display: "block", maxWidth: 180 }}>{lead.email || "-"}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" noWrap sx={{ display: "block", maxWidth: 140 }}>{lead.phoneRaw || "-"}</Typography>
                          </TableCell>
                          <TableCell>
                            {lead.website ? (
                              <Button href={lead.website} target="_blank" rel="noreferrer" size="small" variant="text" sx={{ maxWidth: 180, justifyContent: "flex-start", p: 0 }}>
                                <Typography variant="caption" noWrap>{lead.website}</Typography>
                              </Button>
                            ) : (
                              <Typography variant="caption">-</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" noWrap sx={{ display: "block", maxWidth: 190 }}>{lead.companyLocation || "-"}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" noWrap sx={{ display: "block", maxWidth: 190 }}>{lead.contactLocation || "-"}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" noWrap sx={{ display: "block", maxWidth: 180 }}>{lead.contactSocials || "-"}</Typography>
                          </TableCell>
                          <TableCell>
                            <Stack spacing={0.25}>
                              {lead.contactLinkedinUrl ? (
                                <Button href={lead.contactLinkedinUrl} target="_blank" rel="noreferrer" size="small" variant="text" sx={{ maxWidth: 170, justifyContent: "flex-start", p: 0 }}>
                                  <Typography variant="caption" noWrap>Contact</Typography>
                                </Button>
                              ) : null}
                              {lead.companyLinkedinUrl ? (
                                <Button href={lead.companyLinkedinUrl} target="_blank" rel="noreferrer" size="small" variant="text" sx={{ maxWidth: 170, justifyContent: "flex-start", p: 0 }}>
                                  <Typography variant="caption" noWrap>Company</Typography>
                                </Button>
                              ) : null}
                              {!lead.contactLinkedinUrl && !lead.companyLinkedinUrl && <Typography variant="caption">-</Typography>}
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" noWrap sx={{ display: "block", maxWidth: 170 }}>{lead.industry || "-"}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={CRM_SPECIALIZATION_LABELS[lead.suggestedSpecialization] || lead.suggestedSpecialization || "-"} size="small" color="info" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" noWrap sx={{ display: "block", maxWidth: 240 }}>{(lead.categories || []).join(", ") || "-"}</Typography>
                          </TableCell>
                          <TableCell>
                            <Button
                              href={lead.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              size="small"
                              variant="text"
                              startIcon={<OpenInNewRoundedIcon sx={{ fontSize: 14 }} />}
                              sx={{ maxWidth: 260, justifyContent: "flex-start" }}
                            >
                              <Typography variant="caption" noWrap>{lead.sourceTitle || lead.sourcePlatform || "Source"}</Typography>
                            </Button>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={`${Math.round((lead.confidence || 0) * 100)}%`}
                              size="small"
                              color={(lead.confidence || 0) >= 0.75 ? "success" : "default"}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ maxWidth: 320 }}>
                              {lead.evidence || "-"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {item.duplicate ? (
                              <Typography variant="caption" color="warning.main" display="block" sx={{ maxWidth: 260 }}>
                                {item.duplicateReasons.join("; ")}
                              </Typography>
                            ) : (
                              <Chip label="Ready" size="small" color="success" variant="outlined" />
                            )}
                          </TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => deleteAutoFindRow(item.searchResultId)}
                              disabled={autoFinding || importing}
                            >
                              <DeleteRoundedIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        {/* ── Lead Activity Table ── */}
        <Card>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "flex-end" }} spacing={2}>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>Lead Activity</Typography>
                <Typography variant="body2" color="text.secondary">Latest CRM tasks across all assigned agents.</Typography>
              </Box>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ width: "100%", maxWidth: { md: 500 } }}>
                <TextField
                  size="small"
                  placeholder="Search lead, email, phone"
                  value={leadQ}
                  onChange={(e) => setLeadQ(e.target.value)}
                  slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18 }} /></InputAdornment> } }}
                  fullWidth
                />
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Status</InputLabel>
                  <Select value={leadStatus} label="Status" onChange={(e) => setLeadStatus(e.target.value)} {...crmSelectOpenProps("lead-status")}>
                    {renderCrmMenuHeader("Status")}
                    <MenuItem value="">All</MenuItem>
                    {CRM_STATUS_FILTER_OPTIONS.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s === "archived" ? "Archived (Won)" : statusLabel(s)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Agent</InputLabel>
                  <Select value={leadAssignedTo} label="Agent" onChange={(e) => setLeadAssignedTo(e.target.value)} {...crmSelectOpenProps("lead-agent")}>
                    {renderCrmMenuHeader("Agent")}
                    <MenuItem value="">All</MenuItem>
                    {crmAgentUsers.map((u) => <MenuItem key={u._id} value={u._id}>{u.username || u.email}</MenuItem>)}
                  </Select>
                </FormControl>
              </Stack>
            </Stack>

            {leadAssignedTo && (
              <Chip
                label={`Filtered: ${crmAgentUsers.find((u) => u._id === leadAssignedTo)?.username || crmAgentUsers.find((u) => u._id === leadAssignedTo)?.email || "Agent"}`}
                color="info"
                variant="outlined"
                size="small"
                sx={{ mt: 1.5 }}
              />
            )}

            {loadingLeads && <LinearProgress sx={{ mt: 2, borderRadius: 1 }} />}

            <TableContainer sx={{ maxHeight: 420, mt: 2 }}>
              <Table size="small" stickyHeader sx={{ tableLayout: "fixed", minWidth: 760 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Lead</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Assigned To</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Dates</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 240 }}>Latest Comment</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 130 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {!loadingLeads && (leads?.items || []).length === 0 && (
                    <TableRow><TableCell colSpan={6} sx={{ color: "text.secondary", py: 4, textAlign: "center" }}>No CRM leads found</TableCell></TableRow>
                  )}
                  {(leads?.items || []).map((lead) => (
                    <TableRow key={lead._id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{lead.clientName}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {lead.email || "-"} {lead.phoneFormatted || lead.phoneRaw ? `· ${lead.phoneFormatted || lead.phoneRaw}` : ""}
                        </Typography>
                        {(lead.companyLocation || lead.industry) && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            {[lead.companyLocation, lead.industry].filter(Boolean).join(" · ")}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{(lead.assignedTo?.username || lead.assignedTo?.email || "-") as string}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={statusWithLostReasonLabel(lead.status, lead.lostReason)} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" display="block">Start: {toIsoDateValue(lead.taskStartDate) || "-"}</Typography>
                        <Typography variant="caption" display="block">Due: {toIsoDateValue(lead.dueDate) || "-"}</Typography>
                      </TableCell>
                      <TableCell sx={{ width: 240 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            display: "block",
                            width: "100%",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {lead.latestComment || "-"}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ width: 130 }}>
                        <Stack direction="row" spacing={0.5}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<VisibilityRoundedIcon sx={{ fontSize: 16 }} />}
                            onClick={() => void openLeadDetailsModal(lead._id)}
                            disabled={leadDetailsLoadingId === lead._id}
                          >
                            {leadDetailsLoadingId === lead._id ? "…" : "View"}
                          </Button>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => void deleteLead(lead)}
                            disabled={deletingLeadId === lead._id}
                          >
                            <DeleteRoundedIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Transfer Report */}
        <Card>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "flex-end" }} spacing={2}>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>Transfer Report</Typography>
                <Typography variant="body2" color="text.secondary">Audit CRM lead transfers between agents.</Typography>
              </Box>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ width: { xs: "100%", md: "auto" }, minWidth: { md: 720 } }}>
                <TextField
                  size="small"
                  label="CRM Agent"
                  placeholder="Search employee"
                  value={transferAgentSearch}
                  onChange={(e) => setTransferAgentSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void loadTransferReport();
                  }}
                  slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18 }} /></InputAdornment> } }}
                  fullWidth
                />
                <TextField
                  size="small"
                  label="From"
                  placeholder="Transferred from"
                  value={transferFromSearch}
                  onChange={(e) => setTransferFromSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void loadTransferReport();
                  }}
                  slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18 }} /></InputAdornment> } }}
                  fullWidth
                />
                <TextField
                  size="small"
                  label="To"
                  placeholder="Transferred to"
                  value={transferToSearch}
                  onChange={(e) => setTransferToSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void loadTransferReport();
                  }}
                  slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18 }} /></InputAdornment> } }}
                  fullWidth
                />
                <FormControl size="small" fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select value={transferStatusFilter} label="Status" onChange={(e) => setTransferStatusFilter(e.target.value)} {...crmSelectOpenProps("transfer-status")}>
                    {renderCrmMenuHeader("Status")}
                    <MenuItem value="">All</MenuItem>
                    {(["pending", "accepted", "rejected", "cancelled"] as const).map((status) => (
                      <MenuItem key={status} value={status}>{transferStatusLabel(status)}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RefreshRoundedIcon />}
                  onClick={() => void loadTransferReport()}
                  disabled={loadingTransfers}
                  sx={{ minWidth: 110 }}
                >
                  {loadingTransfers ? "Refreshing…" : "Refresh"}
                </Button>
              </Stack>
            </Stack>

            <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.75} sx={{ mt: 1.5 }}>
              {(["pending", "accepted", "rejected", "cancelled"] as const).map((status) => (
                <Chip
                  key={status}
                  label={`${transferStatusLabel(status)}: ${transferStatusCountMap.get(status) || 0}`}
                  size="small"
                  color={transferStatusColor(status)}
                  variant="outlined"
                />
              ))}
            </Stack>

            {(transferAgentSearch.trim() || transferFromSearch.trim() || transferToSearch.trim()) && (
              <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.75} sx={{ mt: 1 }}>
                {transferAgentSearch.trim() && (
                  <Chip
                    label={`CRM Agent: ${transferAgentSearch.trim()}`}
                    size="small"
                    onDelete={() => setTransferAgentSearch("")}
                  />
                )}
                {transferFromSearch.trim() && (
                  <Chip
                    label={`From: ${transferFromSearch.trim()}`}
                    size="small"
                    onDelete={() => setTransferFromSearch("")}
                  />
                )}
                {transferToSearch.trim() && (
                  <Chip
                    label={`To: ${transferToSearch.trim()}`}
                    size="small"
                    onDelete={() => setTransferToSearch("")}
                  />
                )}
              </Stack>
            )}

            {loadingTransfers && <LinearProgress sx={{ mt: 2, borderRadius: 1 }} />}

            <TableContainer sx={{ maxHeight: 420, mt: 2 }}>
              <Table size="small" stickyHeader sx={{ minWidth: 980 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Lead</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>From</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>To</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Requested</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Responded</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 260 }}>Note</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {!loadingTransfers && (transferReport?.items || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ color: "text.secondary", py: 3, textAlign: "center" }}>No transfer records found</TableCell>
                    </TableRow>
                  )}
                  {(transferReport?.items || []).map((item) => (
                    <TableRow key={item._id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 220 }}>
                          {item.leadId?.clientName || "Deleted lead"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 220 }}>
                          {item.leadId?.title || item.leadId?.status || "-"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 160 }}>{crmTransferUserLabel(item.fromUserId)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 160 }}>{crmTransferUserLabel(item.toUserId)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={transferStatusLabel(item.status)} size="small" color={transferStatusColor(item.status)} variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{toDateTimeValue(item.createdAt)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{toDateTimeValue(item.respondedAt)}</Typography>
                        {item.respondedBy ? (
                          <Typography variant="caption" color="text.secondary" display="block">
                            By: {crmTransferUserLabel(item.respondedBy)}
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell sx={{ width: 260 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", maxWidth: 260 }} noWrap>
                          {item.note || "-"}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* ── Uploaded Excel Files ── */}
        <Card>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2}>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>Uploaded Excel Files</Typography>
                <Typography variant="body2" color="text.secondary">Delete a file to remove every CRM lead imported from that batch.</Typography>
              </Box>
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshRoundedIcon />}
                onClick={() => void loadImportFiles()}
                disabled={loadingImportFiles || deletingBatchId !== null}
              >
                {loadingImportFiles ? "Refreshing…" : "Refresh"}
              </Button>
            </Stack>
            <TableContainer sx={{ maxHeight: 360, mt: 2 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>File</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Imported</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Leads</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingImportFiles ? (
                    <TableRow><TableCell colSpan={4}><LinearProgress /></TableCell></TableRow>
                  ) : (importFiles?.items || []).length === 0 ? (
                    <TableRow><TableCell colSpan={4} sx={{ color: "text.secondary", py: 3, textAlign: "center" }}>No imported files</TableCell></TableRow>
                  ) : (importFiles?.items || []).map((item) => (
                    <TableRow key={item.sourceBatchId} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 300 }}>{item.sourceFileName || "Unnamed"}</Typography>
                        <Typography variant="caption" color="text.secondary">Batch: {item.sourceBatchId}</Typography>
                        {item.sourceFileUrl && (
                          <Button size="small" href={item.sourceFileUrl} target="_blank" rel="noreferrer" startIcon={<OpenInNewRoundedIcon sx={{ fontSize: 14 }} />} sx={{ fontSize: "0.7rem", p: 0, minWidth: 0, mt: 0.5 }}>R2</Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" display="block">{toIsoDateValue(item.importedAt) || "-"}</Typography>
                        <Typography variant="caption" display="block" color="text.secondary">Latest: {toIsoDateValue(item.latestLeadAt) || "-"}</Typography>
                      </TableCell>
                      <TableCell><Chip label={item.leadCount} size="small" color="info" variant="outlined" /></TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          startIcon={<DeleteRoundedIcon sx={{ fontSize: 16 }} />}
                          onClick={() => void deleteImportedFile(item)}
                          disabled={deletingBatchId === item.sourceBatchId}
                        >
                          {deletingBatchId === item.sourceBatchId ? "…" : "Delete"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* ── Lead Assignment by Upload ── */}
        <Card>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2}>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>Lead Assignment by Upload</Typography>
                <Typography variant="body2" color="text.secondary">See how many leads each upload created and which agents received them.</Typography>
              </Box>
              <Button variant="outlined" size="small" startIcon={<RefreshRoundedIcon />} onClick={() => void loadAssignmentsByUpload()} disabled={loadingAssignments}>
                {loadingAssignments ? "Refreshing…" : "Refresh"}
              </Button>
            </Stack>
            <TableContainer sx={{ maxHeight: 420, mt: 2 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Upload File</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Imported</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Leads</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Agents</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingAssignments ? (
                    <TableRow><TableCell colSpan={4}><LinearProgress /></TableCell></TableRow>
                  ) : assignmentUploadRows.length === 0 ? (
                    <TableRow><TableCell colSpan={4} sx={{ color: "text.secondary", py: 3, textAlign: "center" }}>No assignment data</TableCell></TableRow>
                  ) : assignmentUploadRows.map((row) => (
                    <TableRow key={row.sourceBatchId} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 220 }}>{row.sourceFileName || "Unnamed"}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 220 }}>{row.sourceBatchId}</Typography>
                      </TableCell>
                      <TableCell><Typography variant="caption">{row.importedAt ? new Date(row.importedAt).toLocaleDateString() : "-"}</Typography></TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Chip label={row.leadCount} size="small" color="info" variant="outlined" />
                          {row.overdueCount > 0 && <Chip label={`${row.overdueCount} overdue`} size="small" color="error" variant="outlined" />}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                          {row.agents.map((agent) => (
                            <Chip
                              key={`${row.sourceBatchId}-${agent.agentId}`}
                              label={`${agent.agentUsername || agent.agentEmail || "?"} (${agent.leadCount})`}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Nearest Lead Assignment Repair */}
        <Card>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2}>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>Nearest Assignment Repair</Typography>
                <Typography variant="body2" color="text.secondary">
                  Preview and apply nearest-salesperson reassignment for active CRM leads using lead location and CRM service address.
                </Typography>
              </Box>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ width: { xs: "100%", sm: "auto" } }}>
                <Button variant="outlined" startIcon={<SearchRoundedIcon />} onClick={() => void runNearestReassignment(false)} disabled={nearestReassignBusy}>
                  Preview
                </Button>
                <Button variant="contained" color="warning" onClick={() => void runNearestReassignment(true)} disabled={nearestReassignBusy || !nearestReassignReport?.changedCount}>
                  Apply {nearestReassignReport?.changedCount || 0}
                </Button>
              </Stack>
            </Stack>
            {nearestReassignBusy && <LinearProgress sx={{ mt: 2 }} />}
            {nearestReassignReport && (
              <TableContainer sx={{ maxHeight: 360, mt: 2 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Lead</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Current</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Nearest</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Match</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {nearestReassignReport.items.length === 0 ? (
                      <TableRow><TableCell colSpan={4} sx={{ color: "text.secondary", py: 3, textAlign: "center" }}>No leads reviewed</TableCell></TableRow>
                    ) : nearestReassignReport.items.slice(0, 50).map((item) => (
                      <TableRow key={item.leadId} hover selected={item.changed}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700} noWrap sx={{ maxWidth: 220 }}>{item.clientName || item.companyName || "Lead"}</Typography>
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block", maxWidth: 240 }}>{item.location || "-"}</Typography>
                        </TableCell>
                        <TableCell><Typography variant="caption">{item.currentAssignee?.username || item.currentAssignee?.email || "-"}</Typography></TableCell>
                        <TableCell>
                          <Typography variant="caption" display="block">{item.proposedAssignee?.username || item.proposedAssignee?.email || "-"}</Typography>
                          <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ maxWidth: 220 }}>{item.proposedAssignee?.crmAddress || ""}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={item.changed ? "Change" : "Keep"} size="small" color={item.changed ? "warning" : "success"} variant="outlined" sx={{ mr: 0.5 }} />
                          <Typography variant="caption" color="text.secondary">
                            {item.distanceKm ? `${item.distanceKm} km` : item.matchedRegion || item.method}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        {/* ── CRM Team Manager Dialog ── */}
        <Dialog open={showCrmOpsModal} onClose={() => setShowCrmOpsModal(false)} maxWidth="xl" fullWidth fullScreen={!matchesMd} scroll="paper">
          <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
            <Box>
              <Typography variant="h6" fontWeight={800}>CRM Team Manager</Typography>
              <Typography variant="body2" color="text.secondary">Assign/remove CRM roles and monitor team distribution.</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" startIcon={<RefreshRoundedIcon />} onClick={() => void loadUsers()} disabled={loadingUsers}>
                {loadingUsers ? "…" : "Refresh"}
              </Button>
              <IconButton size="small" onClick={() => setShowCrmOpsModal(false)}><CloseRoundedIcon /></IconButton>
            </Stack>
          </DialogTitle>
          <DialogContent dividers sx={{ p: 0 }}>
            <Grid container sx={{ minHeight: 500 }}>
              <Grid size={{ xs: 12, lg: 7 }} sx={{ p: 2, borderRight: { lg: "1px solid" }, borderColor: { lg: "divider" } }}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} mb={2}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Email, username, company"
                    value={userQ}
                    onChange={(e) => setUserQ(e.target.value)}
                    slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18 }} /></InputAdornment> } }}
                  />
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>CRM Filter</InputLabel>
                    <Select value={crmFilter} label="CRM Filter" onChange={(e) => setCrmFilter(e.target.value as "all" | "crm" | "noncrm")} {...crmSelectOpenProps("team-crm-filter")}>
                      {renderCrmMenuHeader("CRM Filter")}
                      <MenuItem value="all">All users</MenuItem>
                      <MenuItem value="crm">CRM only</MenuItem>
                      <MenuItem value="noncrm">Non-CRM only</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>

                <Grid container spacing={1} mb={2}>
                  {([
                    { label: "Agents", value: crmUsersCount, color: "primary.main" },
                    { label: "Total", value: totalUsersCount, color: "text.primary" },
                    { label: "Selected", value: selectedUserIds.length, color: "success.main" },
                  ] as const).map((s) => (
                    <Grid key={s.label} size={{ xs: 4 }}>
                      <Card variant="outlined" sx={{ textAlign: "center", py: 1 }}>
                        <Typography variant="overline" sx={{ fontSize: "0.6rem" }}>{s.label}</Typography>
                        <Typography variant="h6" fontWeight={800} color={s.color}>{s.value}</Typography>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                {loadingUsers && <LinearProgress sx={{ mb: 1 }} />}

                <TableContainer sx={{ maxHeight: 380 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox" />
                        <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>CRM Role</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(users?.items || []).length === 0 && !loadingUsers && (
                        <TableRow><TableCell colSpan={4} sx={{ textAlign: "center", py: 3, color: "text.secondary" }}>No users found</TableCell></TableRow>
                      )}
                      {(users?.items || []).map((u) => (
                        <TableRow key={u._id} hover>
                          <TableCell padding="checkbox">
                            <Checkbox
                              size="small"
                              checked={selectedUserIds.includes(u._id)}
                              disabled={!u.isCrmAgent}
                              onChange={(e) => toggleSelectedUser(u._id, e.target.checked)}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>{u.email}</Typography>
                            <Typography variant="caption" color="text.secondary">{u.username || "-"} {u.companyName ? `· ${u.companyName}` : ""}</Typography>
                            {u.crmAddress ? (
                              <Typography variant="caption" display="block" color="text.secondary" noWrap sx={{ maxWidth: 260 }}>
                                Base: {u.crmAddress}
                              </Typography>
                            ) : null}
                            {(u.crmQuadrant || formatCrmSpecializations(u.crmSpecializations)) ? (
                              <Typography variant="caption" display="block" color="info.main">
                                {[formatCrmQuadrants(u.crmQuadrant) ? `Quadrant ${formatCrmQuadrants(u.crmQuadrant)}` : "", formatCrmSpecializations(u.crmSpecializations)].filter(Boolean).join(" · ")}
                              </Typography>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={u.isCrmAgent ? "CRM Agent" : "Not Assigned"}
                              size="small"
                              color={u.isCrmAgent ? "success" : "default"}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              variant="outlined"
                              color={u.isCrmAgent ? "error" : "primary"}
                              onClick={() => toggleCrmAgent(u)}
                              disabled={updatingUserId === u._id || Boolean(u.isBlocked)}
                            >
                              {u.isCrmAgent ? "Remove" : "Assign"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              <Grid size={{ xs: 12, lg: 5 }} sx={{ p: 2, overflow: "auto" }}>
                <Stack spacing={2}>
                  <Card variant="outlined">
                    <CardContent sx={{ py: 1.5 }}>
                      <Typography variant="subtitle2" fontWeight={700} gutterBottom>Team Mix</Typography>
                      <Box sx={{ height: 180 }}>
                        <Doughnut data={crmVsNonCrmChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } } } }} />
                      </Box>
                    </CardContent>
                  </Card>
                  <Card variant="outlined">
                    <CardContent sx={{ py: 1.5 }}>
                      <Typography variant="subtitle2" fontWeight={700} gutterBottom>Lead Status Snapshot</Typography>
                      <Box sx={{ height: 180 }}><Bar data={leadStatusChartData} options={compactChartOptions} /></Box>
                    </CardContent>
                  </Card>
                  <Card variant="outlined">
                    <CardContent sx={{ py: 1.5 }}>
                      <Typography variant="subtitle2" fontWeight={700} gutterBottom>Recent Import Trend</Typography>
                      <Box sx={{ height: 180 }}><Line data={importTrendChartData} options={compactLineOptions} /></Box>
                    </CardContent>
                  </Card>
                </Stack>
              </Grid>
            </Grid>
          </DialogContent>
        </Dialog>

        {/* ── Import Preview Dialog ── */}
        <Dialog open={showImportModal} onClose={closeImportPreviewModal} maxWidth="xl" fullWidth fullScreen={!matchesMd} scroll="paper">
          <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
            <Box>
              <Typography variant="h6" fontWeight={800}>CRM Excel Upload Preview</Typography>
              <Typography variant="body2" color="text.secondary">Extracted rows shown below. Duplicates are blocked before upload.</Typography>
            </Box>
            <IconButton size="small" disabled={importPreviewBusy} onClick={closeImportPreviewModal}><CloseRoundedIcon /></IconButton>
          </DialogTitle>
          <DialogContent dividers sx={{ p: 0 }}>
            <Grid container sx={{ minHeight: 500 }}>
              {/* Left sidebar */}
              <Grid size={{ xs: 12, lg: 4 }} sx={{ borderRight: { lg: "1px solid" }, borderColor: { lg: "divider" }, display: "flex", flexDirection: "column" }}>
                <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="success"
                    size="large"
                    startIcon={<CloudUploadRoundedIcon />}
                    onClick={() => void onImportLeads()}
                    disabled={!importPreviewCanImport}
                  >
                    {importPreviewBusy ? "Importing…" : "Import Leads to CRM"}
                  </Button>
                  {previewRows.length > 0 && !duplicateIssues.length && (excelFile || isAutoFindImportPreview) && (
                    <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: "block", textAlign: "center" }}>
                      {readyPreviewRows} leads ready to import
                    </Typography>
                  )}
                </Box>

                <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
                  {isAutoFindImportPreview ? (
                    <Card variant="outlined">
                      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <CheckCircleRoundedIcon color="success" sx={{ fontSize: 20 }} />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={700}>Auto Find leads selected</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {autoFindPreviewResultIds.length} selected result{autoFindPreviewResultIds.length === 1 ? "" : "s"} prefilled for review
                            </Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      {/* File upload zone */}
                      <Button
                        component="label"
                        variant="outlined"
                        fullWidth
                        color={excelFile ? "success" : "primary"}
                        startIcon={excelFile ? <CheckCircleRoundedIcon /> : <CloudUploadRoundedIcon />}
                        sx={{ py: 3, border: "2px dashed", borderColor: excelFile ? "success.main" : "divider" }}
                      >
                        {excelFile ? excelFile.name : "Click to upload .xlsx, .xls, .csv"}
                        <input type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => void handleExcelFileChange(e.target.files?.[0] || null)} />
                      </Button>

                      {excelFile && !importing && (
                        <Button fullWidth variant="outlined" color="error" size="small" sx={{ mt: 1.5 }} onClick={resetPreviewState}>
                          Cancel Upload
                        </Button>
                      )}
                    </>
                  )}

                  {parsingPreview && <LinearProgress sx={{ mt: 2 }} />}
                  {previewParseError && <Alert severity="error" sx={{ mt: 2 }}>{previewParseError}</Alert>}

                  <Alert severity="info" sx={{ mt: 2 }}>
                    Imported CRM leads now start as <strong>New Lead</strong>. Reminder scheduling is handled automatically from the selected status.
                  </Alert>

                  {/* Stats */}
                  <Grid container spacing={1} sx={{ mt: 1.5 }}>
                    {([
                      { label: "Sheet", value: previewSheetName || "-" },
                      { label: "Rows", value: previewRows.length },
                      { label: "Ready", value: readyPreviewRows },
                      { label: "Duplicates", value: rowCountWithDuplicates },
                    ] as const).map((s) => (
                      <Grid key={s.label} size={{ xs: 6 }}>
                        <Card variant="outlined" sx={{ textAlign: "center", py: 0.75 }}>
                          <Typography variant="overline" sx={{ fontSize: "0.55rem" }}>{s.label}</Typography>
                          <Typography variant="subtitle2" fontWeight={700} noWrap>{s.value}</Typography>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>

                  {/* Assigned agents */}
                  <Card variant="outlined" sx={{ mt: 2 }}>
                    <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                      <Typography variant="caption" color="text.secondary">Assigned CRM reps for import</Typography>
                      <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.5} sx={{ mt: 1 }}>
                        {selectedAssignees.length > 0 ? selectedAssignees.map((agent) => (
                          <Chip key={agent._id} label={`${agent.username || agent.email}${agent.crmAddress ? ` · ${agent.crmAddress}` : formatCrmQuadrants(agent.crmQuadrant) ? ` · Q${formatCrmQuadrants(agent.crmQuadrant)}` : ""}`} size="small" variant="outlined" />
                        )) : (
                          <Typography variant="caption" color="text.secondary">Auto-distribute among all active CRM agents</Typography>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>

                  <Card variant="outlined" sx={{ mt: 2 }}>
                    <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                      <Typography variant="subtitle2" fontWeight={700}>Due Date Setup</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Set one default due date, then override individual rows or selected rows.
                      </Typography>
                      <TextField
                        label="Default due date"
                        type="date"
                        size="small"
                        fullWidth
                        value={defaultImportDueDate}
                        onChange={(e) => setDefaultImportDueDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ mt: 1.5 }}
                      />
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1 }}>
                        <TextField
                          label="Selected rows due date"
                          type="date"
                          size="small"
                          fullWidth
                          value={bulkPreviewDueDate}
                          onChange={(e) => setBulkPreviewDueDate(e.target.value)}
                          InputLabelProps={{ shrink: true }}
                        />
                        <Button variant="outlined" onClick={applyBulkPreviewDueDate} disabled={selectedReadyPreviewRows.length === 0}>
                          Apply
                        </Button>
                      </Stack>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                        <Checkbox
                          size="small"
                          checked={allReadyPreviewRowsSelected}
                          indeterminate={selectedReadyPreviewRows.length > 0 && !allReadyPreviewRowsSelected}
                          disabled={readyPreviewRowNumbers.length === 0}
                          onChange={(e) => setSelectedPreviewRows(e.target.checked ? readyPreviewRowNumbers : [])}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {selectedReadyPreviewRows.length} selected for bulk due date
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>

                  {duplicateIssues.length > 0 && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      <Typography variant="subtitle2">Duplicate entries detected</Typography>
                      <Typography variant="caption">
                        {isAutoFindImportPreview ? "Remove duplicate auto-found rows before importing." : "Remove duplicates from file before importing."}
                      </Typography>
                      <Box component="ul" sx={{ mt: 1, pl: 2, maxHeight: 120, overflow: "auto" }}>
                        {duplicateIssues.slice(0, 12).map((issue, idx) => (
                          <Typography component="li" variant="caption" key={`${issue.rowNumber}-${idx}`}>Row {issue.rowNumber}: {issue.reason}</Typography>
                        ))}
                        {duplicateIssues.length > 12 && <Typography component="li" variant="caption">+{duplicateIssues.length - 12} more</Typography>}
                      </Box>
                    </Alert>
                  )}
                </Box>
              </Grid>

              {/* Right — preview cards */}
              <Grid size={{ xs: 12, lg: 8 }} sx={{ overflow: "auto", p: 2 }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700}>Extracted Lead Details</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {previewRows.length} lead{previewRows.length !== 1 ? "s" : ""} parsed · {readyPreviewRows} ready · {rowCountWithDuplicates} duplicate{rowCountWithDuplicates !== 1 ? "s" : ""}
                  </Typography>
                </Box>

                {previewRows.length === 0 ? (
                  <Box sx={{ textAlign: "center", py: 8, color: "text.secondary" }}>
                    <CloudUploadRoundedIcon sx={{ fontSize: 48, opacity: 0.3 }} />
                    <Typography variant="body2" sx={{ mt: 1.5 }}>
                      {isAutoFindImportPreview ? "Select auto-found leads to preview" : "Upload an Excel file to preview leads"}
                    </Typography>
                    <Typography variant="caption">
                      {isAutoFindImportPreview ? "Auto Find rows will appear here before import" : "Supported: .xlsx, .xls, .csv"}
                    </Typography>
                  </Box>
                ) : (
                  <Grid container spacing={1.5}>
                    {previewRows.map((row) => {
                      const issues = duplicateIssuesByRow.get(row.rowNumber) || [];
                      const hasIssue = issues.length > 0;
                      return (
                        <Grid key={`${row.rowNumber}-${row.duplicateKey}`} size={{ xs: 12, sm: 6, xl: 4 }}>
                          <Card variant="outlined" sx={{ borderColor: hasIssue ? "warning.main" : "divider" }}>
                            <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                <Checkbox
                                  size="small"
                                  checked={selectedPreviewRows.includes(row.rowNumber)}
                                  disabled={hasIssue}
                                  onChange={(e) => togglePreviewRowSelection(row.rowNumber, e.target.checked)}
                                  sx={{ p: 0.25, mr: 0.75 }}
                                />
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                  <Typography variant="body2" fontWeight={700} noWrap>{row.clientName || "Unnamed"}</Typography>
                                  <Typography variant="caption" color="text.secondary" noWrap>{row.title}{row.title && row.companyName ? " · " : ""}{row.companyName}</Typography>
                                </Box>
                                <Stack alignItems="flex-end" spacing={0.25}>
                                  <Chip label={hasIssue ? "Duplicate" : "Ready"} size="small" color={hasIssue ? "warning" : "success"} variant="outlined" sx={{ height: 20, fontSize: "0.65rem" }} />
                                  <Typography variant="caption" color="text.secondary">#{row.rowNumber}</Typography>
                                </Stack>
                              </Stack>
                              <Stack spacing={0.5} sx={{ mt: 1 }}>
                                {row.email && <Typography variant="caption" noWrap>{row.email}</Typography>}
                                {row.phone && <Typography variant="caption" noWrap>{row.phone}</Typography>}
                                {row.website && <Typography variant="caption" noWrap>{row.website}</Typography>}
                              </Stack>
                              <TextField
                                label="Due date"
                                type="date"
                                size="small"
                                fullWidth
                                value={dueDateForPreviewRow(row)}
                                onChange={(e) => setPreviewRowDueDate(row.rowNumber, e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                disabled={hasIssue}
                                sx={{ mt: 1 }}
                              />
                              <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.5} sx={{ mt: 1 }}>
                                {row.location && <Chip label={row.location} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.6rem" }} />}
                                {row.industry && <Chip label={row.industry} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.6rem" }} />}
                                {row.lists.map((list, li) => <Chip key={li} label={list} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.6rem" }} />)}
                              </Stack>
                              {row.notes && <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }} noWrap>{row.notes}</Typography>}
                              {hasIssue && (
                                <Alert severity="warning" sx={{ mt: 1, py: 0, "& .MuiAlert-message": { py: 0.5 } }}>
                                  {issues.map((reason, idx) => <Typography variant="caption" display="block" key={`${row.rowNumber}-${idx}`}>{reason}</Typography>)}
                                </Alert>
                              )}
                            </CardContent>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>
                )}
              </Grid>
            </Grid>
          </DialogContent>
        </Dialog>

        {/* ── Lead Details Dialog ── */}
        <Dialog open={showLeadDetailsModal} onClose={closeLeadDetailsModal} maxWidth="md" fullWidth fullScreen={!matchesMd} scroll="paper">
          <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
            <Box>
              <Typography variant="h6" fontWeight={800}>Lead Conversation & Files</Typography>
              <Typography variant="body2" color="text.secondary">Review CRM history, play recordings, and reply to the assigned rep.</Typography>
            </Box>
            <IconButton size="small" onClick={closeLeadDetailsModal} disabled={submittingAdminReply || savingLeadStatus}><CloseRoundedIcon /></IconButton>
          </DialogTitle>
          <DialogContent dividers>
            {leadDetailsLoadingId ? (
              <LinearProgress />
            ) : leadDetailsError ? (
              <Alert severity="error">{leadDetailsError}</Alert>
            ) : !activeLeadDetails ? (
              <Alert severity="info">Lead details are unavailable.</Alert>
            ) : (
              <Stack spacing={2.5}>
                {/* Lead info card */}
                <Card variant="outlined">
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" spacing={1}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={700}>{activeLeadDetails.clientName}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {activeLeadDetails.companyName || "No company"} · {activeLeadDetails.email || "No email"}
                        </Typography>
                      </Box>
                      <Chip label={statusWithLostReasonLabel(activeLeadDetails.status, activeLeadDetails.lostReason)} variant="outlined" size="small" />
                    </Stack>
                    <Grid container spacing={1} sx={{ mt: 1.5 }}>
                      <Grid size={{ xs: 6 }}><Typography variant="caption"><strong>Phone:</strong> {activeLeadDetails.phoneFormatted || activeLeadDetails.phoneRaw || "-"}</Typography></Grid>
                      <Grid size={{ xs: 6 }}><Typography variant="caption"><strong>Due:</strong> {toIsoDateValue(activeLeadDetails.dueDate) || "-"}</Typography></Grid>
                      <Grid size={{ xs: 6 }}><Typography variant="caption"><strong>Lists:</strong> {activeLeadDetails.listItems?.join(", ") || "-"}</Typography></Grid>
                      <Grid size={{ xs: 6 }}><Typography variant="caption"><strong>Updated:</strong> {toDateTimeValue(activeLeadDetails.updatedAt)}</Typography></Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Reply card */}
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" fontWeight={700}>Reply to CRM agent</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Add a clear instruction. It appears in the mobile CRM task timeline.
                    </Typography>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ mt: 1.5 }}>
                      <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel>Status</InputLabel>
                        <Select value={adminReplyStatus} label="Status" onChange={(e) => setAdminReplyStatus(e.target.value)} {...crmSelectOpenProps("reply-status")}>
                          {renderCrmMenuHeader("Status")}
                          {CRM_STATUSES.map((status) => <MenuItem key={status} value={status}>{statusLabel(status)}</MenuItem>)}
                        </Select>
                      </FormControl>
                      {(adminReplyStatus || activeLeadDetails?.status) === "lost" ? (
                        <FormControl size="small" sx={{ minWidth: 180 }}>
                          <InputLabel>Lost Reason</InputLabel>
                          <Select value={adminReplyLostReason} label="Lost Reason" onChange={(e) => setAdminReplyLostReason(e.target.value)} {...crmSelectOpenProps("reply-lost-reason")}>
                            {renderCrmMenuHeader("Lost Reason")}
                            {CRM_LOST_REASONS.map((reason) => <MenuItem key={reason} value={reason}>{lostReasonLabel(reason)}</MenuItem>)}
                          </Select>
                        </FormControl>
                      ) : null}
                      <TextField
                        size="small"
                        fullWidth
                        multiline
                        rows={3}
                        placeholder="Add admin reply visible to CRM rep…"
                        value={adminReply}
                        onChange={(e) => setAdminReply(e.target.value)}
                      />
                    </Stack>
                    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, flexWrap: "wrap", mt: 1.5 }}>
                      <Button
                        variant="outlined"
                        onClick={() => void saveAdminLeadStatus()}
                        disabled={
                          savingLeadStatus ||
                          (
                            (adminReplyStatus || activeLeadDetails.status || "new_lead") === (activeLeadDetails.status || "new_lead") &&
                            (((adminReplyStatus || activeLeadDetails.status || "new_lead") !== "lost") ||
                              (adminReplyLostReason || "") === (activeLeadDetails.lostReason || ""))
                          )
                        }
                      >
                        {savingLeadStatus ? "Saving..." : "Save Status"}
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={<SendRoundedIcon />}
                        onClick={() => void submitAdminLeadReply()}
                        disabled={submittingAdminReply || savingLeadStatus || !adminReply.trim()}
                      >
                        {submittingAdminReply ? "Sending…" : "Send Reply"}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>

                {/* Activity timeline */}
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" fontWeight={700}>Activity Timeline</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Every comment, attachment, and voice note between admin and CRM rep.
                    </Typography>

                    {activeLeadUpdates.length === 0 ? (
                      <Alert severity="info" sx={{ mt: 2 }}>No updates yet on this lead.</Alert>
                    ) : (
                      <Stack spacing={1.5} sx={{ mt: 2 }}>
                        {activeLeadUpdates.map((update, idx) => {
                          const updateId = normalizeUpdateId(update._id);
                          return (
                            <Card key={updateId || `${idx}-${update.createdAt || "na"}`} variant="outlined">
                              <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                  <Typography variant="caption" fontWeight={700}>{leadUpdateAuthorLabel(update)}</Typography>
                                  <Typography variant="caption" color="text.secondary">{toDateTimeValue(update.createdAt)}</Typography>
                                </Stack>
                                <Typography variant="caption" color="text.secondary">Status: {statusWithLostReasonLabel(update.status || activeLeadDetails.status, update.lostReason || activeLeadDetails.lostReason)}</Typography>

                                <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                                  {update.editedAt && !update.isDeleted && <Chip label="Edited" size="small" color="info" variant="outlined" sx={{ height: 18, fontSize: "0.6rem" }} />}
                                  {update.isDeleted && <Chip label="Deleted" size="small" color="error" variant="outlined" sx={{ height: 18, fontSize: "0.6rem" }} />}
                                </Stack>

                                {update.isDeleted && (
                                  <Alert severity="error" sx={{ mt: 1, py: 0 }}>This update was deleted.</Alert>
                                )}

                                {!update.isDeleted && editingUpdateId === updateId && (
                                  <Stack spacing={1} sx={{ mt: 1 }}>
                                    <TextField size="small" multiline rows={3} value={editingComment} onChange={(e) => setEditingComment(e.target.value)} placeholder="Edit update message" fullWidth />
                                    <FormControl size="small" fullWidth>
                                      <Select value={editingStatus} onChange={(e) => setEditingStatus(e.target.value)} {...crmSelectOpenProps(`edit-status-${updateId}`)}>
                                        {renderCrmMenuHeader("Status")}
                                        {CRM_STATUSES.map((status) => <MenuItem key={`${updateId}-${status}`} value={status}>{statusLabel(status)}</MenuItem>)}
                                      </Select>
                                    </FormControl>
                                    {editingStatus === "lost" ? (
                                      <FormControl size="small" fullWidth>
                                        <InputLabel>Lost Reason</InputLabel>
                                        <Select value={editingLostReason} label="Lost Reason" onChange={(e) => setEditingLostReason(e.target.value)} {...crmSelectOpenProps(`edit-lost-reason-${updateId}`)}>
                                          {renderCrmMenuHeader("Lost Reason")}
                                          {CRM_LOST_REASONS.map((reason) => <MenuItem key={`${updateId}-${reason}`} value={reason}>{lostReasonLabel(reason)}</MenuItem>)}
                                        </Select>
                                      </FormControl>
                                    ) : null}
                                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                                      <Button size="small" variant="outlined" onClick={cancelEditLeadUpdate} disabled={timelineBusyKey === `edit:${updateId}`}>Cancel</Button>
                                      <Button size="small" variant="contained" onClick={() => void saveEditedLeadUpdate(update)} disabled={timelineBusyKey === `edit:${updateId}`}>
                                        {timelineBusyKey === `edit:${updateId}` ? "Saving…" : "Save"}
                                      </Button>
                                    </Stack>
                                  </Stack>
                                )}

                                {!update.isDeleted && update.comment && (
                                  <Typography variant="body2" sx={{ mt: 1, p: 1, borderRadius: 1, bgcolor: "action.hover" }}>{update.comment}</Typography>
                                )}

                                {!update.isDeleted && editingUpdateId !== updateId && (
                                  <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
                                    <Button size="small" variant="outlined" startIcon={<EditRoundedIcon sx={{ fontSize: 14 }} />} onClick={() => beginEditLeadUpdate(update)} disabled={Boolean(timelineBusyKey) || !updateId}>Edit</Button>
                                    <Button size="small" variant="outlined" color="error" startIcon={<DeleteRoundedIcon sx={{ fontSize: 14 }} />} onClick={() => void deleteLeadUpdate(update)} disabled={timelineBusyKey === `delete:${updateId}` || !updateId}>
                                      {timelineBusyKey === `delete:${updateId}` ? "…" : "Delete"}
                                    </Button>
                                  </Stack>
                                )}

                                {!update.isDeleted && update.attachmentUrls?.length ? (
                                  <Box sx={{ mt: 1.5 }}>
                                    <Typography variant="caption" fontWeight={600}><AttachFileRoundedIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: "text-bottom" }} />Attachments</Typography>
                                    <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} sx={{ mt: 0.5 }}>
                                      {update.attachmentUrls.map((url, fileIdx) => (
                                        <Card key={`${url}-${fileIdx}`} variant="outlined" sx={{ p: 1 }}>
                                          {isLikelyImageUrl(url) ? (
                                            <a href={url} target="_blank" rel="noreferrer">
                                              {/* eslint-disable-next-line @next/next/no-img-element */}
                                              <img src={url} alt={`Attachment ${fileIdx + 1}`} style={{ height: 80, width: 120, objectFit: "cover", borderRadius: 4 }} />
                                            </a>
                                          ) : (
                                            <Button size="small" href={url} target="_blank" rel="noreferrer">File {fileIdx + 1}</Button>
                                          )}
                                          <Button size="small" color="error" fullWidth sx={{ mt: 0.5, fontSize: "0.65rem" }} onClick={() => void deleteLeadUpdateAttachment(update, url)} disabled={timelineBusyKey === `attachment:${updateId}:${url}` || !updateId}>
                                            {timelineBusyKey === `attachment:${updateId}:${url}` ? "…" : "Remove"}
                                          </Button>
                                        </Card>
                                      ))}
                                    </Stack>
                                  </Box>
                                ) : null}

                                {!update.isDeleted && update.recordingUrl && (
                                  <Box sx={{ mt: 1.5 }}>
                                    <Typography variant="caption" fontWeight={600}><MicRoundedIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: "text-bottom" }} />Voice Recording</Typography>
                                    <audio controls src={update.recordingUrl} style={{ width: "100%", marginTop: 4 }} preload="none" />
                                    <Button size="small" color="error" sx={{ mt: 0.5 }} onClick={() => void deleteLeadUpdateRecording(update)} disabled={timelineBusyKey === `recording:${updateId}` || !updateId}>
                                      {timelineBusyKey === `recording:${updateId}` ? "Deleting…" : "Delete audio"}
                                    </Button>
                                  </Box>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              </Stack>
            )}
          </DialogContent>
        </Dialog>

      </Stack>

      {/* ── Toast notifications ── */}
      {toasts.map((t) => (
        <Snackbar key={t.id} open anchorOrigin={{ vertical: "bottom", horizontal: "right" }} sx={{ position: "fixed" }}>
          <Alert
            severity={t.type === "success" ? "success" : t.type === "error" ? "error" : "info"}
            variant="filled"
            sx={(theme) => {
              const severity = t.type === "success" ? "success" : t.type === "error" ? "error" : "info";
              const shade = theme.palette.mode === "dark" ? "dark" : "main";
              const bg = theme.palette[severity][shade];
              return {
                width: "100%",
                bgcolor: bg,
                color: theme.palette.getContrastText(bg),
                border: "1px solid",
                borderColor: theme.palette.mode === "dark" ? theme.palette[severity].light : theme.palette[severity].dark,
                "& .MuiAlert-icon": {
                  color: "inherit",
                },
              };
            }}
          >
            {t.message}
          </Alert>
        </Snackbar>
      ))}
    </Box>
  );
}
