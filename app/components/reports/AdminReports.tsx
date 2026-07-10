"use client";

import { memo, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type PaginationState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import ConfirmModal from "@/app/components/common/ConfirmModal";
import ReportPreviewModal, {
  type ReportPreviewPayload,
} from "@/app/components/reports/ReportPreviewModal";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ArchiveRoundedIcon from "@mui/icons-material/ArchiveRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CollectionsRoundedIcon from "@mui/icons-material/CollectionsRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import FormatAlignCenterRoundedIcon from "@mui/icons-material/FormatAlignCenterRounded";
import FormatAlignJustifyRoundedIcon from "@mui/icons-material/FormatAlignJustifyRounded";
import FormatAlignLeftRoundedIcon from "@mui/icons-material/FormatAlignLeftRounded";
import FormatAlignRightRoundedIcon from "@mui/icons-material/FormatAlignRightRounded";
import FormatBoldRoundedIcon from "@mui/icons-material/FormatBoldRounded";
import FormatClearRoundedIcon from "@mui/icons-material/FormatClearRounded";
import FormatItalicRoundedIcon from "@mui/icons-material/FormatItalicRounded";
import FormatListBulletedRoundedIcon from "@mui/icons-material/FormatListBulletedRounded";
import FormatListNumberedRoundedIcon from "@mui/icons-material/FormatListNumberedRounded";
import FormatUnderlinedRoundedIcon from "@mui/icons-material/FormatUnderlinedRounded";
import HorizontalRuleRoundedIcon from "@mui/icons-material/HorizontalRuleRounded";
import NoteAddRoundedIcon from "@mui/icons-material/NoteAddRounded";
import NotesRoundedIcon from "@mui/icons-material/NotesRounded";
import OpenInFullRoundedIcon from "@mui/icons-material/OpenInFullRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import RedoRoundedIcon from "@mui/icons-material/RedoRounded";
import RestoreRoundedIcon from "@mui/icons-material/RestoreRounded";
import StrikethroughSRoundedIcon from "@mui/icons-material/StrikethroughSRounded";
import TableChartRoundedIcon from "@mui/icons-material/TableChartRounded";
import TableRowsRoundedIcon from "@mui/icons-material/TableRowsRounded";
import UndoRoundedIcon from "@mui/icons-material/UndoRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";

type ReportItem = {
  _id: string;
  filename: string;
  address: string;
  fairMarketValue: string;
  user?: { email?: string; username?: string } | null;
  reportType: "RealEstate" | "Salvage" | "Asset" | "LotListing" | string;
  createdAt: string;
  reportModel?: string;
  fileType?: "pdf" | "spec_pdf" | "cr_docx" | "docx" | "xlsx" | "images";
  approvalStatus?: "pending" | "approved" | "rejected";
  release_status?: "pending_release" | "released";
  release_assigned_to?: { _id?: string; email?: string; username?: string; companyName?: string; role?: string } | string | null;
  released_at?: string | null;
  downloadable?: boolean;
  report?: string;
  contract_no?: string;
  lot_number_summary?: string;
  preview_files?: { pdf?: string; spec_pdf?: string; cr_docx?: string; docx?: string; excel?: string; images?: string };
  crDisclaimerCount?: number;
  isRealEstateReport?: boolean;
  isLotListingReport?: boolean;
  property_type?: string;
  language?: string;
  adminArchivedAt?: string | null;
};

type ApiResponse = {
  items: ReportItem[];
  total: number;
  page: number;
  limit: number;
};

type ReportGroup = {
  key: string;
  title: string;
  contract_no?: string;
  lotNumberSummary?: string;
  reportType: string;
  createdAt: string;
  fairMarketValue: string;
  userEmail?: string;
  variants: { pdf?: ReportItem; specPdf?: ReportItem; crDocx?: ReportItem; docx?: ReportItem; xlsx?: ReportItem; images?: ReportItem };
  isAssetReport?: boolean;
  isRealEstateReport?: boolean;
  isLotListingReport?: boolean;
  preview_files?: { pdf?: string; spec_pdf?: string; cr_docx?: string; docx?: string; excel?: string; images?: string };
  crDisclaimerCount?: number;
  release_status?: "pending_release" | "released";
  release_assigned_to?: ReportItem["release_assigned_to"];
  released_at?: string | null;
  downloadable?: boolean;
  adminArchivedAt?: string | null;
};

type ReportFileLink = {
  label: string;
  href?: string;
  download?: boolean;
};

type CrDisclaimerSettings = {
  smallsOnsite: boolean;
  smallsOffsite: boolean;
  rollingStockOnsite: boolean;
  rollingStockOffsite: boolean;
  customText: string;
  unreserved: boolean;
  closingDate: string | null;
  closingTime: string | null;
  closingTimePeriod: "AM" | "PM" | null;
  bidIncrement: 5 | 25 | 100 | 1000 | null;
  openingBid: 5 | 25 | 100 | 1000 | null;
};

type CrDisclaimerFlagKey =
  | "smallsOnsite"
  | "smallsOffsite"
  | "rollingStockOnsite"
  | "rollingStockOffsite";

type CrDisclaimerOption = {
  key: CrDisclaimerFlagKey;
  label: string;
};

type CrDisclaimerLot = {
  lotKey: string;
  lotNumber: string;
  title: string;
  imageUrls?: string[];
  settings: CrDisclaimerSettings;
  activeCount?: number;
};

type CrDisclaimersPayload = {
  settings: CrDisclaimerSettings;
  lots: CrDisclaimerLot[];
};

const emptyCrDisclaimers: CrDisclaimerSettings = {
  smallsOnsite: false,
  smallsOffsite: false,
  rollingStockOnsite: false,
  rollingStockOffsite: false,
  customText: "",
  unreserved: false,
  closingDate: null,
  closingTime: null,
  closingTimePeriod: null,
  bidIncrement: null,
  openingBid: null,
};

const auctionBidOptions = [5, 25, 100, 1000] as const;
const closingHourOptions = Array.from({ length: 12 }, (_, index) => String(index + 1));
const closingMinuteOptions = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

const fallbackCrDisclaimerOptions: CrDisclaimerOption[] = [
  { key: "smallsOnsite", label: "Smalls - Notice on Every Lot - Onsite" },
  { key: "smallsOffsite", label: "Smalls - Notice on Every Lot - Offsite" },
  { key: "rollingStockOnsite", label: "Rolling Stock - Damage Disclaimer - Onsite" },
  { key: "rollingStockOffsite", label: "Rolling Stock - Damage Disclaimer - Offsite" },
];

const richNoteHelpText =
  "Use the toolbar for bold, italic, lists, paragraphs, and rules. Saved output becomes clean CR HTML.";

const richEditorExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    blockquote: false,
    codeBlock: false,
    bulletList: { keepMarks: true },
    orderedList: { keepMarks: true },
  }),
  Underline,
  TextAlign.configure({
    types: ["heading", "paragraph"],
    alignments: ["left", "center", "right", "justify"],
    defaultAlignment: "left",
  }),
];

type RichCrNoteSurfaceProps = {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  minHeight?: number;
  autoFocus?: boolean;
  onExpand?: () => void;
};

function RichCrNoteSurface({
  value,
  disabled,
  onChange,
  minHeight = 120,
  autoFocus,
  onExpand,
}: RichCrNoteSurfaceProps) {
  const [, setToolbarTick] = useState(0);
  const editor = useEditor({
    extensions: richEditorExtensions,
    content: value || "",
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor: activeEditor }) => {
      onChange(activeEditor.isEmpty ? "" : activeEditor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const refreshToolbar = () => setToolbarTick((tick) => tick + 1);
    editor.on("selectionUpdate", refreshToolbar);
    editor.on("transaction", refreshToolbar);
    editor.on("update", refreshToolbar);
    return () => {
      editor.off("selectionUpdate", refreshToolbar);
      editor.off("transaction", refreshToolbar);
      editor.off("update", refreshToolbar);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor || !autoFocus || disabled) return;
    const timeout = window.setTimeout(() => editor.commands.focus("end"), 50);
    return () => window.clearTimeout(timeout);
  }, [autoFocus, disabled, editor]);

  useEffect(() => {
    if (!editor) return;
    const nextValue = value || "";
    if (nextValue !== editor.getHTML()) {
      editor.commands.setContent(nextValue, { emitUpdate: false });
    }
  }, [editor, value]);

  const run = (command: () => boolean) => {
    if (!editor || disabled) return;
    command();
  };

  const toolbarButton = (
    buttonLabel: string,
    icon: ReactNode,
    active: boolean,
    onClick: () => void,
    forceDisabled = false
  ) => (
    <Tooltip key={buttonLabel} title={buttonLabel}>
      <span>
        <IconButton
          size="small"
          disabled={disabled || !editor || forceDisabled}
          onClick={onClick}
          aria-label={buttonLabel}
          sx={{
            width: 34,
            height: 34,
            borderRadius: 1,
            border: "1px solid",
            borderColor: active ? "#7c3aed" : "#dbe3ef",
            bgcolor: active ? "#ede9fe" : "#fff",
            color: active ? "#5b21b6" : "#334155",
            boxShadow: active ? "inset 0 0 0 1px rgba(124, 58, 237, 0.18)" : "none",
            "&:hover": {
              borderColor: "#8b5cf6",
              bgcolor: active ? "#ddd6fe" : "#f8fafc",
            },
            "&.Mui-disabled": {
              bgcolor: "#f8fafc",
              color: "#94a3b8",
            },
          }}
        >
          {icon}
        </IconButton>
      </span>
    </Tooltip>
  );

  const blockValue = editor?.isActive("heading", { level: 1 })
    ? "heading1"
    : editor?.isActive("heading", { level: 2 })
      ? "heading2"
      : editor?.isActive("heading", { level: 3 })
        ? "heading3"
        : "paragraph";

  const setBlockValue = (nextValue: string) => {
    if (!editor || disabled) return;
    const chain = editor.chain().focus();
    if (nextValue === "heading1") chain.toggleHeading({ level: 1 }).run();
    else if (nextValue === "heading2") chain.toggleHeading({ level: 2 }).run();
    else if (nextValue === "heading3") chain.toggleHeading({ level: 3 }).run();
    else chain.setParagraph().run();
  };

  return (
    <Box
      sx={{
        border: "1px solid #cbd5e1",
        borderRadius: 1.5,
        bgcolor: disabled ? "#f8fafc" : "#fff",
        overflow: "hidden",
        boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)",
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.5}
        useFlexGap
        flexWrap="wrap"
        sx={{
          p: 0.75,
          borderBottom: "1px solid #e2e8f0",
          bgcolor: "#f1f5f9",
        }}
      >
        <FormControl size="small" sx={{ minWidth: 142 }}>
          <Select
            value={blockValue}
            disabled={disabled || !editor}
            onChange={(event) => setBlockValue(String(event.target.value))}
            sx={{
              height: 34,
              borderRadius: 1,
              bgcolor: "#fff",
              fontSize: "0.82rem",
              fontWeight: 800,
              "& .MuiSelect-select": { py: 0.75 },
            }}
          >
            <MenuItem value="paragraph">Paragraph</MenuItem>
            <MenuItem value="heading1">Title</MenuItem>
            <MenuItem value="heading2">Heading</MenuItem>
            <MenuItem value="heading3">Subheading</MenuItem>
          </Select>
        </FormControl>
        <Divider orientation="vertical" flexItem sx={{ mx: 0.35, borderColor: "#cbd5e1" }} />
        {toolbarButton("Undo", <UndoRoundedIcon fontSize="small" />, false, () =>
          run(() => editor!.chain().focus().undo().run()),
          !editor?.can().undo()
        )}
        {toolbarButton("Redo", <RedoRoundedIcon fontSize="small" />, false, () =>
          run(() => editor!.chain().focus().redo().run()),
          !editor?.can().redo()
        )}
        <Divider orientation="vertical" flexItem sx={{ mx: 0.35, borderColor: "#cbd5e1" }} />
        {toolbarButton("Bold", <FormatBoldRoundedIcon fontSize="small" />, Boolean(editor?.isActive("bold")), () =>
          run(() => editor!.chain().focus().toggleBold().run())
        )}
        {toolbarButton(
          "Italic",
          <FormatItalicRoundedIcon fontSize="small" />,
          Boolean(editor?.isActive("italic")),
          () => run(() => editor!.chain().focus().toggleItalic().run())
        )}
        {toolbarButton(
          "Underline",
          <FormatUnderlinedRoundedIcon fontSize="small" />,
          Boolean(editor?.isActive("underline")),
          () => run(() => editor!.chain().focus().toggleUnderline().run())
        )}
        {toolbarButton(
          "Strikethrough",
          <StrikethroughSRoundedIcon fontSize="small" />,
          Boolean(editor?.isActive("strike")),
          () => run(() => editor!.chain().focus().toggleStrike().run())
        )}
        <Divider orientation="vertical" flexItem sx={{ mx: 0.35, borderColor: "#cbd5e1" }} />
        {toolbarButton(
          "Bullet list",
          <FormatListBulletedRoundedIcon fontSize="small" />,
          Boolean(editor?.isActive("bulletList")),
          () => run(() => editor!.chain().focus().toggleBulletList().run())
        )}
        {toolbarButton(
          "Numbered list",
          <FormatListNumberedRoundedIcon fontSize="small" />,
          Boolean(editor?.isActive("orderedList")),
          () => run(() => editor!.chain().focus().toggleOrderedList().run())
        )}
        {toolbarButton("Paragraph", <NotesRoundedIcon fontSize="small" />, Boolean(editor?.isActive("paragraph")), () =>
          run(() => editor!.chain().focus().setParagraph().run())
        )}
        <Divider orientation="vertical" flexItem sx={{ mx: 0.35, borderColor: "#cbd5e1" }} />
        {toolbarButton(
          "Align left",
          <FormatAlignLeftRoundedIcon fontSize="small" />,
          Boolean(editor?.isActive({ textAlign: "left" })),
          () => run(() => editor!.chain().focus().setTextAlign("left").run())
        )}
        {toolbarButton(
          "Align center",
          <FormatAlignCenterRoundedIcon fontSize="small" />,
          Boolean(editor?.isActive({ textAlign: "center" })),
          () => run(() => editor!.chain().focus().setTextAlign("center").run())
        )}
        {toolbarButton(
          "Align right",
          <FormatAlignRightRoundedIcon fontSize="small" />,
          Boolean(editor?.isActive({ textAlign: "right" })),
          () => run(() => editor!.chain().focus().setTextAlign("right").run())
        )}
        {toolbarButton(
          "Justify",
          <FormatAlignJustifyRoundedIcon fontSize="small" />,
          Boolean(editor?.isActive({ textAlign: "justify" })),
          () => run(() => editor!.chain().focus().setTextAlign("justify").run())
        )}
        <Divider orientation="vertical" flexItem sx={{ mx: 0.35, borderColor: "#cbd5e1" }} />
        {toolbarButton("Horizontal rule", <HorizontalRuleRoundedIcon fontSize="small" />, false, () =>
          run(() => editor!.chain().focus().setHorizontalRule().run())
        )}
        {toolbarButton("Clear formatting", <FormatClearRoundedIcon fontSize="small" />, false, () =>
          run(() => editor!.chain().focus().unsetAllMarks().clearNodes().run())
        )}
        {onExpand ? (
          <>
            <Box sx={{ flex: 1, minWidth: 8 }} />
            {toolbarButton("Open large editor", <OpenInFullRoundedIcon fontSize="small" />, false, onExpand)}
          </>
        ) : null}
      </Stack>
      <Box
        sx={{
          minHeight,
          px: 1.35,
          py: 1.1,
          cursor: disabled ? "not-allowed" : "text",
          "& .ProseMirror": {
            minHeight: Math.max(80, minHeight - 28),
            outline: "none",
            color: "#0f172a",
            fontSize: "0.95rem",
            lineHeight: 1.55,
            whiteSpace: "pre-wrap",
          },
          "& .ProseMirror p": { margin: "0.35rem 0" },
          "& .ProseMirror h1": {
            fontSize: "1.35rem",
            lineHeight: 1.25,
            margin: "0.55rem 0 0.35rem",
            fontWeight: 950,
          },
          "& .ProseMirror h2": {
            fontSize: "1.12rem",
            lineHeight: 1.3,
            margin: "0.5rem 0 0.3rem",
            fontWeight: 900,
          },
          "& .ProseMirror h3": {
            fontSize: "1rem",
            lineHeight: 1.35,
            margin: "0.45rem 0 0.25rem",
            fontWeight: 850,
          },
          "& .ProseMirror ul": {
            listStyleType: "disc",
            paddingLeft: "1.6rem",
            margin: "0.55rem 0",
          },
          "& .ProseMirror ol": {
            listStyleType: "decimal",
            paddingLeft: "1.6rem",
            margin: "0.55rem 0",
          },
          "& .ProseMirror li": {
            display: "list-item",
            margin: "0.25rem 0",
          },
          "& .ProseMirror li p": { margin: 0 },
          "& .ProseMirror hr": {
            border: 0,
            borderTop: "2px solid #cbd5e1",
            margin: "0.9rem 0",
          },
        }}
      >
        <EditorContent editor={editor} />
      </Box>
    </Box>
  );
}

function RichCrNoteEditor({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [expandedValue, setExpandedValue] = useState(value || "");

  const openExpanded = () => {
    setExpandedValue(value || "");
    setExpanded(true);
  };

  const saveExpanded = () => {
    onChange(expandedValue);
    setExpanded(false);
  };

  return (
    <Stack spacing={0.75}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Typography variant="caption" sx={{ color: "#475569", fontWeight: 900 }}>
          {label}
        </Typography>
        <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700 }}>
          CR HTML editor
        </Typography>
      </Stack>
      <RichCrNoteSurface
        value={value}
        disabled={disabled}
        onChange={onChange}
        minHeight={124}
        onExpand={openExpanded}
      />
      <Typography variant="caption" color="text.secondary">
        {richNoteHelpText}
      </Typography>

      <Dialog
        open={expanded}
        onClose={() => setExpanded(false)}
        fullWidth
        maxWidth="lg"
        PaperProps={{
          sx: {
            borderRadius: 2,
            width: "min(1240px, calc(100vw - 28px))",
            maxHeight: "calc(100vh - 28px)",
          },
        }}
      >
        <DialogTitle sx={{ pb: 1.25 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 950, letterSpacing: 0 }}>
                {label}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Edit the CR note with Word-style formatting.
              </Typography>
            </Box>
            <IconButton onClick={() => setExpanded(false)} aria-label="Close editor" sx={{ border: "1px solid #e2e8f0" }}>
              <CloseRoundedIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: "#f8fafc", p: 2 }}>
          <RichCrNoteSurface
            value={expandedValue}
            disabled={disabled}
            onChange={setExpandedValue}
            minHeight={520}
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button onClick={() => setExpanded(false)} variant="outlined" sx={{ borderRadius: 1.25 }}>
            Cancel
          </Button>
          <Button onClick={saveExpanded} variant="contained" disabled={disabled} sx={{ borderRadius: 1.25, px: 2.5 }}>
            Save note
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
type CrDisclaimersDialogProps = {
  open: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;
  filesBusy: boolean;
  initialSettings: CrDisclaimerSettings;
  initialLots: CrDisclaimerLot[];
  options: CrDisclaimerOption[];
  onClose: () => void;
  onSave: (payload: CrDisclaimersPayload) => Promise<void>;
  onResubmit: (payload: CrDisclaimersPayload) => Promise<void>;
};

function normalizeDialogLot(lot: CrDisclaimerLot, fallbackSettings: CrDisclaimerSettings): CrDisclaimerLot {
  return {
    ...lot,
    settings: { ...emptyCrDisclaimers, ...fallbackSettings, ...(lot.settings || {}) },
  };
}

function getCrSettingsActiveCount(settings: CrDisclaimerSettings) {
  return Number(Boolean(settings.smallsOnsite)) +
    Number(Boolean(settings.smallsOffsite)) +
    Number(Boolean(settings.rollingStockOnsite)) +
    Number(Boolean(settings.rollingStockOffsite)) +
    Number(Boolean(settings.customText?.trim())) +
    Number(Boolean(settings.unreserved)) +
    Number(Boolean(settings.closingDate || settings.closingTime)) +
    Number(Boolean(settings.bidIncrement)) +
    Number(Boolean(settings.openingBid));
}

function parseAuctionBidValue(value: unknown): CrDisclaimerSettings["bidIncrement"] {
  const numeric = Number(String(value ?? "").replace(/[$,\s]/g, ""));
  return auctionBidOptions.includes(numeric as (typeof auctionBidOptions)[number])
    ? (numeric as CrDisclaimerSettings["bidIncrement"])
    : null;
}

function formatClosingDateLabel(dateValue: string | null, timeValue: string | null, periodValue: "AM" | "PM" | null) {
  const date = String(dateValue || "").trim();
  const time = String(timeValue || "").trim();
  const period = periodValue ? ` ${periodValue}` : "";
  if (!date && !time) return "";
  const dateLabel = date
    ? (() => {
        const parts = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        return parts ? `${Number(parts[2])}/${Number(parts[3])}/${parts[1]}` : date;
      })()
    : "";
  return [dateLabel, time ? `${time}${period}` : ""].filter(Boolean).join(" ");
}

function splitClosingTime(value: string | null) {
  const match = String(value || "").trim().match(/^(\d{1,2})(?::(\d{1,2}))?$/);
  if (!match) return { hour: "", minute: "00" };
  const hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  if (!Number.isInteger(hour) || hour < 1 || hour > 12 || !Number.isInteger(minute) || minute < 0 || minute > 59) {
    return { hour: "", minute: "00" };
  }
  return { hour: String(hour), minute: String(minute).padStart(2, "0") };
}

function ClosingDateTimePicker({
  settings,
  disabled,
  onChange,
}: {
  settings: CrDisclaimerSettings;
  disabled?: boolean;
  onChange: (patch: Partial<CrDisclaimerSettings>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState("");
  const [draftHour, setDraftHour] = useState("");
  const [draftMinute, setDraftMinute] = useState("00");
  const [draftPeriod, setDraftPeriod] = useState<"AM" | "PM">("AM");

  const displayValue = formatClosingDateLabel(settings.closingDate, settings.closingTime, settings.closingTimePeriod);

  const openPicker = () => {
    if (disabled) return;
    const timeParts = splitClosingTime(settings.closingTime);
    setDraftDate(settings.closingDate || "");
    setDraftHour(timeParts.hour);
    setDraftMinute(timeParts.minute);
    setDraftPeriod(settings.closingTimePeriod || "AM");
    setOpen(true);
  };

  const clearPicker = () => {
    onChange({ closingDate: null, closingTime: null, closingTimePeriod: null });
    setOpen(false);
  };

  const applyPicker = () => {
    const normalizedTime = draftHour ? `${draftHour}:${draftMinute}` : null;
    onChange({
      closingDate: draftDate || null,
      closingTime: normalizedTime || null,
      closingTimePeriod: normalizedTime ? draftPeriod : null,
    });
    setOpen(false);
  };

  return (
    <>
      <TextField
        fullWidth
        size="small"
        label="Closing Date & Time"
        value={displayValue}
        placeholder="Set close date and time"
        disabled={disabled}
        onClick={openPicker}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openPicker();
          }
        }}
        inputProps={{ readOnly: true }}
        InputLabelProps={{ shrink: true }}
        sx={{
          "& .MuiInputBase-root": {
            borderRadius: 2,
            bgcolor: "#fff",
            cursor: disabled ? "default" : "pointer",
          },
          "& input": { cursor: disabled ? "default" : "pointer" },
        }}
      />
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            Closing Date & Time
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This exports into the Excel Close Date column.
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <TextField
              fullWidth
              type="date"
              label="Date"
              value={draftDate}
              InputLabelProps={{ shrink: true }}
              onChange={(event) => setDraftDate(event.target.value)}
            />
            <Grid container spacing={1}>
              <Grid size={{ xs: 4 }}>
                <FormControl fullWidth>
                  <InputLabel id="cr-closing-picker-hour-label">Hour</InputLabel>
                  <Select
                    labelId="cr-closing-picker-hour-label"
                    label="Hour"
                    value={draftHour}
                    onChange={(event) => setDraftHour(String(event.target.value || ""))}
                  >
                    <MenuItem value="">Blank</MenuItem>
                    {closingHourOptions.map((hour) => (
                      <MenuItem key={`closing-hour-${hour}`} value={hour}>
                        {hour}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 4 }}>
                <FormControl fullWidth disabled={!draftHour}>
                  <InputLabel id="cr-closing-picker-minute-label">Minute</InputLabel>
                  <Select
                    labelId="cr-closing-picker-minute-label"
                    label="Minute"
                    value={draftMinute}
                    onChange={(event) => setDraftMinute(String(event.target.value || "00"))}
                  >
                    {closingMinuteOptions.map((minute) => (
                      <MenuItem key={`closing-minute-${minute}`} value={minute}>
                        {minute}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 4 }}>
                <FormControl fullWidth disabled={!draftHour}>
                  <InputLabel id="cr-closing-picker-period-label">AM/PM</InputLabel>
                  <Select
                    labelId="cr-closing-picker-period-label"
                    label="AM/PM"
                    value={draftPeriod}
                    onChange={(event) => setDraftPeriod(event.target.value === "PM" ? "PM" : "AM")}
                  >
                    <MenuItem value="AM">AM</MenuItem>
                    <MenuItem value="PM">PM</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" onClick={clearPicker}>
            Clear
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={applyPicker}>
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function CrAuctionControls({
  settings,
  disabled,
  onChange,
}: {
  settings: CrDisclaimerSettings;
  disabled?: boolean;
  onChange: (patch: Partial<CrDisclaimerSettings>) => void;
}) {
  const selectSx = {
    "& .MuiSelect-select": { py: 1.05 },
    "& .MuiInputBase-root": { borderRadius: 2 },
  };

  return (
    <Box sx={{ border: "1px solid #dbeafe", bgcolor: "#f8fbff", borderRadius: 2, p: 1.25 }}>
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Chip size="small" label="Auction import" sx={{ fontWeight: 900, bgcolor: "#dbeafe", color: "#1e3a8a" }} />
          <Typography variant="caption" color="text.secondary">
            Applies to Excel Description, Close Date, Bid Increment, and Opening Bid.
          </Typography>
        </Stack>
        <Grid container spacing={1}>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <FormControlLabel
              sx={{
                m: 0,
                minHeight: 40,
                px: 1,
                width: "100%",
                border: "1px solid #cbd5e1",
                borderRadius: 2,
                bgcolor: settings.unreserved ? "#fff7ed" : "#fff",
                "& .MuiFormControlLabel-label": { fontWeight: 800, fontSize: "0.82rem" },
              }}
              control={
                <Checkbox
                  size="small"
                  disabled={disabled}
                  checked={Boolean(settings.unreserved)}
                  onChange={(event) => onChange({ unreserved: event.target.checked })}
                />
              }
              label="Unreserved"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 5.5 }}>
            <ClosingDateTimePicker settings={settings} disabled={disabled} onChange={onChange} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.25 }}>
            <FormControl fullWidth size="small" sx={selectSx}>
              <InputLabel id="cr-bid-increment-label">Bid Increment</InputLabel>
              <Select
                labelId="cr-bid-increment-label"
                label="Bid Increment"
                value={settings.bidIncrement ?? ""}
                disabled={disabled}
                onChange={(event) => onChange({ bidIncrement: parseAuctionBidValue(event.target.value) })}
                sx={{ bgcolor: "#fff" }}
              >
                <MenuItem value="">Blank</MenuItem>
                {auctionBidOptions.map((value) => (
                  <MenuItem key={`bid-${value}`} value={value}>
                    ${value.toLocaleString()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.25 }}>
            <FormControl fullWidth size="small" sx={selectSx}>
              <InputLabel id="cr-opening-bid-label">Opening Bid</InputLabel>
              <Select
                labelId="cr-opening-bid-label"
                label="Opening Bid"
                value={settings.openingBid ?? ""}
                disabled={disabled}
                onChange={(event) => onChange({ openingBid: parseAuctionBidValue(event.target.value) })}
                sx={{ bgcolor: "#fff" }}
              >
                <MenuItem value="">Blank</MenuItem>
                {auctionBidOptions.map((value) => (
                  <MenuItem key={`opening-${value}`} value={value}>
                    ${value.toLocaleString()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
}

const CrLotDisclaimerRow = memo(function CrLotDisclaimerRow({
  lot,
  options,
  disabled,
  selected,
  onSelectedChange,
  onChange,
  onPreviewImage,
}: {
  lot: CrDisclaimerLot;
  options: CrDisclaimerOption[];
  disabled: boolean;
  selected: boolean;
  onSelectedChange: (lotKey: string, selected: boolean) => void;
  onChange: (lotKey: string, settings: CrDisclaimerSettings) => void;
  onPreviewImage: (url: string, lot: CrDisclaimerLot) => void;
}) {
  const update = (patch: Partial<CrDisclaimerSettings>) => {
    onChange(lot.lotKey, { ...lot.settings, ...patch });
  };
  const images = Array.isArray(lot.imageUrls) ? lot.imageUrls.filter(Boolean) : [];
  const activeCount = getCrSettingsActiveCount(lot.settings);

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2.5,
        bgcolor: "#fff",
        borderColor: activeCount > 0 ? "#c4b5fd" : "divider",
        boxShadow: activeCount > 0 ? "0 10px 30px rgba(109, 40, 217, 0.08)" : "none",
      }}
    >
      <CardContent sx={{ p: { xs: 1.5, md: 2 }, "&:last-child": { pb: { xs: 1.5, md: 2 } } }}>
        <Stack spacing={1.15}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} alignItems={{ xs: "stretch", md: "flex-start" }} justifyContent="space-between">
            <Stack direction="row" spacing={1} alignItems="flex-start" minWidth={0}>
              <Checkbox
                size="small"
                disabled={disabled}
                checked={selected}
                onChange={(event) => onSelectedChange(lot.lotKey, event.target.checked)}
                sx={{ p: 0.25, mt: -0.25 }}
                inputProps={{ "aria-label": `Select lot ${lot.lotNumber}` }}
              />
            <Stack minWidth={0}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "#111827" }}>
                  Lot {lot.lotNumber}
                </Typography>
                {activeCount > 0 ? (
                  <Chip
                    size="small"
                    label={`${activeCount} notes`}
                    sx={{ height: 20, fontSize: "0.65rem", fontWeight: 800, bgcolor: "#ede9fe", color: "#5b21b6" }}
                  />
                ) : null}
                {images.length > 0 ? (
                  <Chip
                    size="small"
                    label={`${images.length} image${images.length === 1 ? "" : "s"}`}
                    variant="outlined"
                    sx={{ height: 20, fontSize: "0.65rem", fontWeight: 800 }}
                  />
                ) : null}
              </Stack>
              <Typography variant="caption" color="text.secondary" title={lot.title}>
                {lot.title || "Untitled lot"}
              </Typography>
            </Stack>
            </Stack>
          </Stack>
          <Stack
            direction="row"
            spacing={1}
            sx={{
              overflowX: "auto",
              pb: 0.25,
              scrollbarWidth: "thin",
              minHeight: images.length ? 84 : "auto",
            }}
          >
            {images.length > 0 ? (
              images.map((url, index) => (
                <button
                  key={`${lot.lotKey}-img-${index}-${url}`}
                  type="button"
                  onClick={() => onPreviewImage(url, lot)}
                  disabled={disabled}
                  style={{
                    width: 92,
                    height: 72,
                    flex: "0 0 auto",
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: 0,
                    overflow: "hidden",
                    background: "#f8fafc",
                    cursor: disabled ? "default" : "zoom-in",
                    position: "relative",
                  }}
                  title={`Open Lot ${lot.lotNumber} image ${index + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Lot ${lot.lotNumber} image ${index + 1}`}
                    loading="lazy"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      right: 5,
                      bottom: 5,
                      minWidth: 18,
                      height: 18,
                      borderRadius: 999,
                      background: "rgba(17,24,39,0.76)",
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 800,
                      lineHeight: "18px",
                    }}
                  >
                    {index + 1}
                  </span>
                </button>
              ))
            ) : (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  width: "100%",
                  border: "1px dashed #cbd5e1",
                  borderRadius: 1.5,
                  bgcolor: "#f8fafc",
                  px: 1.5,
                  py: 1.25,
                }}
              >
                No lot images available for this row.
              </Typography>
            )}
          </Stack>
          <Grid container spacing={0.25}>
            {options.map((option) => (
              <Grid key={`${lot.lotKey}-${option.key}`} size={{ xs: 12, sm: 6 }}>
                <FormControlLabel
                  sx={{
                    m: 0,
                    width: "100%",
                    "& .MuiFormControlLabel-label": {
                      fontSize: "0.76rem",
                      lineHeight: 1.2,
                      fontWeight: 700,
                    },
                  }}
                  control={
                    <Checkbox
                      size="small"
                      disabled={disabled}
                      checked={Boolean(lot.settings[option.key])}
                      onChange={(event) => update({ [option.key]: event.target.checked } as Partial<CrDisclaimerSettings>)}
                    />
                  }
                  label={option.label}
                />
              </Grid>
            ))}
          </Grid>
          <CrAuctionControls settings={lot.settings} disabled={disabled} onChange={update} />
          <RichCrNoteEditor
            label="Custom note"
            value={lot.settings.customText}
            onChange={(value) => update({ customText: value })}
            disabled={disabled}
          />
        </Stack>
      </CardContent>
    </Card>
  );
});

function CrDisclaimersDialog({
  open,
  loading,
  saving,
  error,
  filesBusy,
  initialSettings,
  initialLots,
  options,
  onClose,
  onSave,
  onResubmit,
}: CrDisclaimersDialogProps) {
  const [localLots, setLocalLots] = useState<CrDisclaimerLot[]>([]);
  const [selectedLotKeys, setSelectedLotKeys] = useState<Set<string>>(new Set());
  const [bulkSettings, setBulkSettings] = useState<CrDisclaimerSettings>(emptyCrDisclaimers);
  const [previewImage, setPreviewImage] = useState<{ url: string; lot: CrDisclaimerLot } | null>(null);

  useEffect(() => {
    if (!open) return;
    const nextLots =
      initialLots.length
        ? initialLots.map((lot) => normalizeDialogLot(lot, initialSettings))
        : [
            {
              lotKey: "global",
              lotNumber: "All",
              title: "All visible lots",
              settings: { ...emptyCrDisclaimers, ...initialSettings },
            },
          ];
    setLocalLots(nextLots);
    setSelectedLotKeys(new Set(nextLots.map((lot) => lot.lotKey)));
    setBulkSettings({ ...emptyCrDisclaimers });
  }, [initialLots, initialSettings, open]);

  const payload: CrDisclaimersPayload = {
    settings: emptyCrDisclaimers,
    lots: localLots,
  };

  const updateLotSettings = useCallback((lotKey: string, settings: CrDisclaimerSettings) => {
    setLocalLots((prev) =>
      prev.map((lot) => (lot.lotKey === lotKey ? { ...lot, settings } : lot))
    );
  }, []);

  const clearLotSettings = useCallback((lotKey: string) => {
    setLocalLots((prev) =>
      prev.map((lot) =>
        lot.lotKey === lotKey ? { ...lot, settings: { ...emptyCrDisclaimers } } : lot
      )
    );
  }, []);

  const selectedCount = selectedLotKeys.size;
  const allSelected = localLots.length > 0 && selectedCount === localLots.length;
  const toggleLotSelection = useCallback((lotKey: string, selected: boolean) => {
    setSelectedLotKeys((prev) => {
      const next = new Set(prev);
      if (selected) next.add(lotKey);
      else next.delete(lotKey);
      return next;
    });
  }, []);
  const selectAllLots = useCallback(() => {
    setSelectedLotKeys(new Set(localLots.map((lot) => lot.lotKey)));
  }, [localLots]);
  const clearSelectedLots = useCallback(() => setSelectedLotKeys(new Set()), []);
  const updateBulkSettings = useCallback((patch: Partial<CrDisclaimerSettings>) => {
    setBulkSettings((prev) => ({ ...prev, ...patch }));
  }, []);
  const applyBulkToSelected = useCallback(() => {
    if (!selectedLotKeys.size) return;
    setLocalLots((prev) =>
      prev.map((lot) =>
        selectedLotKeys.has(lot.lotKey)
          ? { ...lot, settings: { ...emptyCrDisclaimers, ...bulkSettings } }
          : lot
      )
    );
  }, [bulkSettings, selectedLotKeys]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xl"
      PaperProps={{
        sx: {
          width: { xs: "calc(100% - 16px)", md: "min(1500px, calc(100% - 48px))" },
          height: { xs: "94vh", md: "90vh" },
          maxHeight: { xs: "94vh", md: "90vh" },
          m: { xs: 1, md: 3 },
          borderRadius: { xs: 2, md: 2 },
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle sx={{ borderBottom: "1px solid #e5e7eb", px: { xs: 2, md: 3 }, py: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between">
          <Stack spacing={0.25}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6" sx={{ fontWeight: 900, color: "#0f172a" }}>
                CR Disclaimers
              </Typography>
              {localLots.length > 0 ? (
                <Chip
                  size="small"
                  label={`${localLots.length} lot${localLots.length === 1 ? "" : "s"}`}
                  sx={{ height: 22, fontSize: "0.7rem", fontWeight: 800, bgcolor: "#eef2ff", color: "#3730a3" }}
                />
              ) : null}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Choose notes for each lot. Save &amp; Resubmit refreshes Excel/CR links.
            </Typography>
          </Stack>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ bgcolor: "#f8fafc", p: { xs: 1.5, md: 2.25 } }}>
        <Stack spacing={1.5}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          {filesBusy ? (
            <Alert severity="warning">This report is already generating files. Save is available, but resubmit is disabled until it finishes.</Alert>
          ) : null}
          {!loading ? (
            <Card variant="outlined" sx={{ borderRadius: 2.5, bgcolor: "#fff" }}>
              <CardContent sx={{ p: { xs: 1.5, md: 2 }, "&:last-child": { pb: { xs: 1.5, md: 2 } } }}>
                <Stack spacing={1.25}>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between">
                    <Stack spacing={0.25}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                        Multi-lot apply
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Select lots below, choose disclaimer settings here, then apply them to all selected lots.
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Chip
                        size="small"
                        color={selectedCount ? "primary" : "default"}
                        label={`${selectedCount} selected`}
                        sx={{ fontWeight: 800 }}
                      />
                      <Button size="small" variant="outlined" disabled={saving || allSelected} onClick={selectAllLots}>
                        Select all
                      </Button>
                      <Button size="small" variant="text" disabled={saving || selectedCount === 0} onClick={clearSelectedLots}>
                        Clear selection
                      </Button>
                    </Stack>
                  </Stack>
                  <Grid container spacing={0.25}>
                    {options.map((option) => (
                      <Grid key={`bulk-${option.key}`} size={{ xs: 12, sm: 6, md: 3 }}>
                        <FormControlLabel
                          sx={{
                            m: 0,
                            width: "100%",
                            "& .MuiFormControlLabel-label": {
                              fontSize: "0.76rem",
                              lineHeight: 1.2,
                              fontWeight: 700,
                            },
                          }}
                          control={
                            <Checkbox
                              size="small"
                              disabled={saving}
                              checked={Boolean(bulkSettings[option.key])}
                              onChange={(event) =>
                                updateBulkSettings({ [option.key]: event.target.checked } as Partial<CrDisclaimerSettings>)
                              }
                            />
                          }
                          label={option.label}
                        />
                      </Grid>
                    ))}
                  </Grid>
                  <CrAuctionControls
                    settings={bulkSettings}
                    disabled={saving}
                    onChange={updateBulkSettings}
                  />
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "flex-start" }}>
                    <RichCrNoteEditor
                      label="Bulk custom note"
                      value={bulkSettings.customText}
                      onChange={(value) => updateBulkSettings({ customText: value })}
                      disabled={saving}
                    />
                    <Button
                      variant="contained"
                      disabled={saving || selectedCount === 0}
                      onClick={applyBulkToSelected}
                      sx={{ minWidth: { md: 180 }, fontWeight: 900 }}
                    >
                      Apply to selected
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ) : null}
          {loading ? (
            <Typography variant="body2" color="text.secondary">
              Loading CR disclaimer settings...
            </Typography>
          ) : (
            <Stack spacing={1}>
              {localLots.map((lot) => (
                <Stack key={lot.lotKey} spacing={0.75}>
                  <CrLotDisclaimerRow
                    lot={lot}
                    options={options}
                    disabled={saving}
                    selected={selectedLotKeys.has(lot.lotKey)}
                    onSelectedChange={toggleLotSelection}
                    onChange={updateLotSettings}
                    onPreviewImage={(url, selectedLot) => setPreviewImage({ url, lot: selectedLot })}
                  />
                  {getCrSettingsActiveCount(lot.settings) > 0 ? (
                    <Button
                      size="small"
                      variant="text"
                      color="inherit"
                      disabled={saving}
                      onClick={() => clearLotSettings(lot.lotKey)}
                      sx={{ alignSelf: "flex-end", fontWeight: 800, color: "text.secondary" }}
                    >
                      Clear lot notes
                    </Button>
                  ) : null}
                </Stack>
              ))}
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: { xs: 1.5, md: 2 }, gap: 1, flexWrap: "wrap", borderTop: "1px solid #e5e7eb" }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="outlined"
          onClick={() => void onSave(payload)}
          disabled={loading || saving}
        >
          Save
        </Button>
        <Button
          variant="contained"
          onClick={() => void onResubmit(payload)}
          disabled={loading || saving || filesBusy}
        >
          {saving ? "Working..." : "Save & Resubmit"}
        </Button>
      </DialogActions>
      <Dialog
        open={Boolean(previewImage)}
        onClose={() => setPreviewImage(null)}
        fullWidth
        maxWidth="lg"
        PaperProps={{ sx: { bgcolor: "#020617", borderRadius: 2, overflow: "hidden" } }}
      >
        <DialogTitle sx={{ color: "#fff", fontWeight: 900, pb: 1 }}>
          Lot {previewImage?.lot.lotNumber}
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.72)" }}>
            {previewImage?.lot.title || "Lot image"}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 0, bgcolor: "#020617" }}>
          {previewImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewImage.url}
              alt={`Lot ${previewImage.lot.lotNumber}`}
              style={{
                width: "100%",
                maxHeight: "78vh",
                objectFit: "contain",
                display: "block",
                background: "#020617",
              }}
            />
          ) : null}
        </DialogContent>
        <DialogActions sx={{ bgcolor: "#020617" }}>
          <Button onClick={() => setPreviewImage(null)} sx={{ color: "#fff" }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}

const LARGE_PAGE_SIZE = 500;

function formatFMV(value: string) {
  return value || "N/A";
}

function getReportTypeLabel(reportType: string) {
  return reportType === "LotListing" ? "Lot Listing" : reportType;
}

function getPreviewTargetId(group: ReportGroup) {
  return (
    group.variants.pdf?._id ||
    group.variants.specPdf?._id ||
    group.variants.crDocx?._id ||
    group.variants.docx?._id ||
    group.variants.xlsx?._id ||
    group.variants.images?._id ||
    group.key
  );
}

function groupReportItems(items: ReportItem[]): ReportGroup[] {
  const map = new Map<string, ReportGroup>();
  for (const r of items) {
    const key = String(r.report || r._id);
    let group = map.get(key);
    if (!group) {
      const base =
        r.reportType === "RealEstate"
          ? "Real Estate"
          : r.reportType === "Salvage"
            ? "Salvage"
            : r.reportType === "LotListing"
              ? "Lot Listing"
              : "Asset";
      group = {
        key,
        title: r.contract_no
          ? `${base} - ${r.contract_no}${r.lot_number_summary ? ` - ${r.lot_number_summary}` : ""}`
          : r.address || base,
        contract_no: r.contract_no,
        lotNumberSummary: r.lot_number_summary,
        reportType: r.reportType,
        createdAt: r.createdAt,
        fairMarketValue: r.fairMarketValue,
        userEmail: r.user?.email || undefined,
        variants: {},
        isAssetReport: r.reportType === "Asset",
        isRealEstateReport: r.reportType === "RealEstate" || r.isRealEstateReport,
        isLotListingReport: r.reportType === "LotListing" || r.isLotListingReport || (r as any).isLotListing,
        preview_files: r.preview_files,
        crDisclaimerCount: Number(r.crDisclaimerCount || 0),
        release_status: r.release_status || "released",
        release_assigned_to: r.release_assigned_to || null,
        released_at: r.released_at || null,
        downloadable: r.downloadable !== false,
        adminArchivedAt: r.adminArchivedAt || null,
      };
      map.set(key, group);
    } else if (group.release_status !== "pending_release" && r.release_status === "pending_release") {
      group.release_status = "pending_release";
      group.release_assigned_to = r.release_assigned_to || null;
      group.released_at = r.released_at || null;
      group.downloadable = false;
    }

    if (new Date(r.createdAt).getTime() > new Date(group.createdAt).getTime()) group.createdAt = r.createdAt;
    const fileType = String(r.fileType || r.filename.split(".").pop() || "").toLowerCase();
    if (fileType === "pdf") group.variants.pdf = r;
    else if (fileType === "spec_pdf") group.variants.specPdf = r;
    else if (fileType === "cr_docx") group.variants.crDocx = r;
    else if (fileType === "docx") group.variants.docx = r;
    else if (fileType === "xlsx") group.variants.xlsx = r;
    else if (fileType === "images" || fileType === "zip") group.variants.images = r;
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function buildFileLinks(group: ReportGroup): ReportFileLink[] {
  if (group.isLotListingReport) {
    return [
      { label: "CR", href: `/api/admin/reports/${group.key}/spec-pdf/download`, download: true },
      { label: "CR DOCX", href: group.preview_files?.cr_docx || `/api/admin/reports/${group.key}/cr-docx`, download: true },
      { label: "Excel", href: group.preview_files?.excel },
      { label: "Images", href: group.preview_files?.images },
    ];
  }

  if ((group.isAssetReport || group.isRealEstateReport) && group.preview_files) {
    return [
      {
        label: group.isAssetReport ? "CR" : "PDF",
        href: group.isAssetReport
          ? `/api/admin/reports/${group.key}/spec-pdf/download`
          : group.preview_files.spec_pdf || group.preview_files.pdf,
        download: group.isAssetReport,
      },
      ...(group.isAssetReport
        ? [
            {
              label: "CR DOCX",
              href: group.preview_files.cr_docx || `/api/admin/reports/${group.key}/cr-docx`,
              download: true,
            },
          ]
        : []),
      { label: "DOCX", href: group.preview_files.docx },
      { label: "Excel", href: group.preview_files.excel },
      { label: "Images", href: group.preview_files.images },
    ];
  }

  if (group.isAssetReport) {
    return [
      { label: "CR", href: `/api/admin/reports/${group.key}/spec-pdf/download`, download: true },
      { label: "CR DOCX", href: `/api/admin/reports/${group.key}/cr-docx`, download: true },
      {
        label: "DOCX",
        href: group.variants.docx ? `/api/admin/reports/${group.variants.docx._id}/download` : undefined,
      },
      {
        label: "Excel",
        href: group.variants.xlsx ? `/api/admin/reports/${group.variants.xlsx._id}/download` : undefined,
      },
      {
        label: "Images",
        href: group.variants.images ? `/api/admin/reports/${group.variants.images._id}/download` : undefined,
      },
    ];
  }

  return [
    {
      label: "PDF",
      href: group.variants.specPdf
        ? `/api/admin/reports/${group.variants.specPdf._id}/download`
        : group.variants.pdf
          ? `/api/admin/reports/${group.variants.pdf._id}/download`
          : undefined,
    },
    {
      label: "DOCX",
      href: group.variants.docx ? `/api/admin/reports/${group.variants.docx._id}/download` : undefined,
    },
    {
      label: "Excel",
      href:
        group.variants.xlsx && group.variants.xlsx.approvalStatus === "approved"
          ? `/api/admin/reports/${group.variants.xlsx._id}/download`
          : undefined,
    },
    {
      label: "Images",
      href:
        group.variants.images && group.variants.images.approvalStatus === "approved"
          ? `/api/admin/reports/${group.variants.images._id}/download`
          : undefined,
    },
  ];
}

function getFileActionIcon(label: string) {
  const key = label.toLowerCase();
  if (key === "cr" || key.includes("pdf") || key.includes("conditional report")) return <PictureAsPdfRoundedIcon />;
  if (key.includes("docx")) return <NoteAddRoundedIcon />;
  if (key.includes("excel")) return <TableChartRoundedIcon />;
  if (key.includes("image")) return <CollectionsRoundedIcon />;
  return undefined;
}

const actionButtonSx = {
  minWidth: "auto",
  height: 26,
  px: 0.62,
  py: 0,
  borderRadius: 1.25,
  textTransform: "none",
  fontSize: "0.62rem",
  fontWeight: 800,
  lineHeight: 1,
  boxShadow: "none",
  whiteSpace: "nowrap",
  transition: "background-color 120ms ease, border-color 120ms ease",
  "&:hover": { boxShadow: "none" },
  "& .MuiButton-startIcon": { mr: 0.32, ml: -0.22 },
  "& .MuiSvgIcon-root": { fontSize: "0.8rem" },
};

export default function AdminReports() {
  // Filters
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [reportType, setReportType] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [debouncedUserEmail, setDebouncedUserEmail] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 });
  const [pageSizeMode, setPageSizeMode] = useState<"20" | "50" | "100" | "all" | "custom">("20");
  const [customPageSizeInput, setCustomPageSizeInput] = useState("150");
  const [archiveMode, setArchiveMode] = useState<"active" | "archived">("active");
  const [sameContractOpen, setSameContractOpen] = useState(false);
  const [sameContractLoading, setSameContractLoading] = useState(false);
  const [sameContractError, setSameContractError] = useState<string | null>(null);
  const [sameContractNumber, setSameContractNumber] = useState("");
  const [sameContractGroups, setSameContractGroups] = useState<ReportGroup[]>([]);

  // Data
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<ReportPreviewPayload | null>(null);
  const [previewTargetId, setPreviewTargetId] = useState<string | null>(null);
  const [previewSaving, setPreviewSaving] = useState(false);
  const [previewSaveError, setPreviewSaveError] = useState<string | null>(null);
  const [previewSaveSuccess, setPreviewSaveSuccess] = useState<string | null>(null);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [crDialogOpen, setCrDialogOpen] = useState(false);
  const [crDialogLoading, setCrDialogLoading] = useState(false);
  const [crDialogSaving, setCrDialogSaving] = useState(false);
  const [crDialogError, setCrDialogError] = useState<string | null>(null);
  const [crDialogTarget, setCrDialogTarget] = useState<ReportGroup | null>(null);
  const [crDialogFilesBusy, setCrDialogFilesBusy] = useState(false);
  const [crInitialSettings, setCrInitialSettings] = useState<CrDisclaimerSettings>(emptyCrDisclaimers);
  const [crInitialLots, setCrInitialLots] = useState<CrDisclaimerLot[]>([]);
  const [crOptions, setCrOptions] = useState<CrDisclaimerOption[]>(fallbackCrDisclaimerOptions);
  const [crCounts, setCrCounts] = useState<Record<string, number>>({});
  const [crSubmitSuccess, setCrSubmitSuccess] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedQ(q.trim());
    }, 350);
    return () => window.clearTimeout(id);
  }, [q]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedUserEmail(userEmail.trim());
    }, 350);
    return () => window.clearTimeout(id);
  }, [userEmail]);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (debouncedQ) p.set("q", debouncedQ);
    if (reportType) p.set("reportType", reportType);
    p.set("approvalStatus", "approved");
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (debouncedUserEmail) p.set("userEmail", debouncedUserEmail);
    if (archiveMode === "archived") p.set("archived", "true");
    p.set("page", String(pagination.pageIndex + 1));
    p.set("limit", String(pagination.pageSize));
    return p.toString();
  }, [debouncedQ, reportType, from, to, debouncedUserEmail, archiveMode, pagination.pageIndex, pagination.pageSize]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reports?${queryString}&_t=${Date.now()}`, {
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to load reports");
      setData(json as ApiResponse);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load reports";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  function openDelete(id: string) {
    setPendingDeleteId(id);
    setConfirmOpen(true);
  }

  async function openPreview(id: string) {
    setPreviewTargetId(id);
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewData(null);
    setPreviewSaveError(null);
    setPreviewSaveSuccess(null);
    try {
      const res = await fetch(`/api/admin/reports/${id}/preview`, {
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((json as { message?: string })?.message || "Failed to load report data");
      }
      setPreviewData(json as ReportPreviewPayload);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load report data";
      setPreviewError(message);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function saveAssetScheduleSheet(assetScheduleSheet: NonNullable<ReportPreviewPayload["assetScheduleSheet"]>) {
    if (!previewTargetId) return;
    try {
      setPreviewSaving(true);
      setPreviewSaveError(null);
      setPreviewSaveSuccess(null);
      const res = await fetch(`/api/admin/reports/${previewTargetId}/asset-schedule-sheet`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ assetScheduleSheet }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((json as { message?: string })?.message || "Failed to save asset schedule sheet");
      }
      const payload = json as ReportPreviewPayload;
      setPreviewData(payload);
      setPreviewSaveSuccess(
        payload.files_regeneration_queued
          ? "Changes saved. Files are regenerating for My Reports."
          : "Changes saved."
      );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to save asset schedule sheet";
      setPreviewSaveError(message);
    } finally {
      setPreviewSaving(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/admin/reports/${pendingDeleteId}`, {
        method: "DELETE",
      });
      if (!(res.ok || res.status === 204)) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || "Failed to delete");
      }
      setConfirmOpen(false);
      setPendingDeleteId(null);
      await load();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to delete report";
      setError(message);
    } finally {
      setDeleting(false);
    }
  }

  async function setReportArchived(id: string, archived: boolean) {
    try {
      setActionBusyId(id);
      setError(null);
      const res = await fetch(`/api/admin/reports/${id}/${archived ? "archive" : "restore"}`, {
        method: "PATCH",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.message || (archived ? "Failed to complete report" : "Failed to restore report"));
      }
      await load();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : archived ? "Failed to complete report" : "Failed to restore report";
      setError(message);
    } finally {
      setActionBusyId(null);
    }
  }

  async function releaseReport(id: string) {
    try {
      setActionBusyId(id);
      const res = await fetch(`/api/admin/reports/${id}/release`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to release report");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to release report");
    } finally {
      setActionBusyId(null);
    }
  }

  function canUseCrDisclaimers(group: ReportGroup) {
    return Boolean(group.isAssetReport || group.isLotListingReport);
  }

  function getCrCount(group: ReportGroup) {
    return crCounts[group.key] ?? Number(group.crDisclaimerCount || 0);
  }

  function closeCrDialog() {
    setCrDialogOpen(false);
    setCrDialogTarget(null);
    setCrDialogError(null);
    setCrDialogFilesBusy(false);
    setCrInitialSettings(emptyCrDisclaimers);
    setCrInitialLots([]);
    setCrOptions(fallbackCrDisclaimerOptions);
  }

  async function openCrDisclaimers(group: ReportGroup) {
    if (!canUseCrDisclaimers(group)) return;
    setCrDialogTarget(group);
    setCrDialogOpen(true);
    setCrDialogLoading(true);
    setCrDialogError(null);
    setCrSubmitSuccess(null);
    try {
      const res = await fetch(`/api/admin/reports/${group.key}/cr-disclaimers`, {
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to load CR disclaimers");
      const payload = json?.data || {};
      setCrInitialSettings({ ...emptyCrDisclaimers, ...(payload.settings || {}) });
      setCrInitialLots(
        Array.isArray(payload.lots)
          ? payload.lots.map((lot: any, index: number) => ({
              lotKey: String(lot?.lotKey || `index:${index}`),
              lotNumber: String(lot?.lotNumber || index + 1),
              title: String(lot?.title || `Lot ${lot?.lotNumber || index + 1}`),
              imageUrls: Array.isArray(lot?.imageUrls)
                ? lot.imageUrls.map((url: unknown) => String(url || "").trim()).filter(Boolean)
                : [],
              settings: { ...emptyCrDisclaimers, ...(payload.settings || {}), ...(lot?.settings || {}) },
              activeCount: Number(lot?.activeCount || 0),
            }))
          : []
      );
      setCrOptions(Array.isArray(payload.options) && payload.options.length ? payload.options : fallbackCrDisclaimerOptions);
      setCrCounts((prev) => ({ ...prev, [group.key]: Number(payload.activeLotCount ?? payload.activeCount ?? 0) }));
      setCrDialogFilesBusy(Boolean(payload.files_regenerating || payload.files_generating));
    } catch (e: unknown) {
      setCrDialogError(e instanceof Error ? e.message : "Failed to load CR disclaimers");
    } finally {
      setCrDialogLoading(false);
    }
  }

  async function saveCrDisclaimers(payload: CrDisclaimersPayload, resubmit: boolean) {
    if (!crDialogTarget) return;
    try {
      setCrDialogSaving(true);
      setCrDialogError(null);
      setCrSubmitSuccess(null);
      const endpoint = resubmit
        ? `/api/admin/reports/${crDialogTarget.key}/rerun-excel-cr`
        : `/api/admin/reports/${crDialogTarget.key}/cr-disclaimers`;
      const res = await fetch(endpoint, {
        method: resubmit ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: payload.settings,
          lots: payload.lots.map((lot) => ({
            lotKey: lot.lotKey,
            settings: lot.settings,
          })),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || (resubmit ? "Failed to resubmit Excel/CR" : "Failed to save CR disclaimers"));
      const activeCount = Number(json?.data?.activeLotCount ?? json?.data?.activeCount ?? 0);
      setCrCounts((prev) => ({ ...prev, [crDialogTarget.key]: activeCount }));
      if (resubmit) {
        await load();
        setCrSubmitSuccess("Excel/CR resubmitted successfully. The CR and Excel buttons now point to refreshed files.");
      }
      closeCrDialog();
    } catch (e: unknown) {
      setCrDialogError(e instanceof Error ? e.message : resubmit ? "Failed to resubmit Excel/CR" : "Failed to save CR disclaimers");
    } finally {
      setCrDialogSaving(false);
    }
  }

  function onReset() {
    setQ("");
    setDebouncedQ("");
    setReportType("");
    setFrom("");
    setTo("");
    setUserEmail("");
    setDebouncedUserEmail("");
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }

  const totalPages = useMemo(() => {
    return data
      ? Math.max(1, Math.ceil((data.total || 0) / pagination.pageSize))
      : 1;
  }, [data, pagination.pageSize]);

  function applyPageSize(nextSize: number, nextMode: "20" | "50" | "100" | "all" | "custom") {
    const safeSize = Math.max(1, Math.floor(nextSize));
    setPageSizeMode(nextMode);
    setPagination((prev) => ({
      ...prev,
      pageIndex: 0,
      pageSize: safeSize,
    }));
  }

  function commitCustomPageSize() {
    const parsed = Number(customPageSizeInput);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    applyPageSize(parsed, "custom");
  }

  function applyTextFiltersNow() {
    setDebouncedQ(q.trim());
    setDebouncedUserEmail(userEmail.trim());
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }

  const groups = useMemo<ReportGroup[]>(() => groupReportItems((data?.items || []) as ReportItem[]), [data]);

  async function openSameContractReports(group: ReportGroup) {
    if (!group.contract_no) return;
    setSameContractNumber(group.contract_no);
    setSameContractGroups([]);
    setSameContractError(null);
    setSameContractOpen(true);
    setSameContractLoading(true);
    try {
      const params = new URLSearchParams({
        contractNo: group.contract_no,
        approvalStatus: "approved",
        page: "1",
        limit: "200",
      });
      const response = await fetch(`/api/admin/reports?${params.toString()}&_t=${Date.now()}`, { cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.message || "Failed to load reports for this contract");
      setSameContractGroups(groupReportItems(Array.isArray(body?.items) ? body.items : []));
    } catch (sameContractError) {
      setSameContractError(sameContractError instanceof Error ? sameContractError.message : "Failed to load same-contract reports");
    } finally {
      setSameContractLoading(false);
    }
  }

  function renderReportActions(group: ReportGroup, options: { wrap?: boolean } = {}) {
    const previewId = getPreviewTargetId(group);
    const archiveLabel = archiveMode === "archived" ? "Restore" : "Done";
    const archiveTooltip =
      archiveMode === "archived" ? "Restore report to active list" : "Move report to archived list";

    return (
      <Stack
        direction="row"
        flexWrap={options.wrap ? "wrap" : "nowrap"}
        useFlexGap
        spacing={0.38}
        sx={{
          alignItems: "center",
          minWidth: 0,
          width: "100%",
          maxWidth: "100%",
          overflow: "visible",
          rowGap: options.wrap ? 0.75 : 0,
          "& > span": { flexShrink: 0 },
        }}
      >
        <Tooltip title="Open report data">
          <span>
            <Button
              size="small"
              variant="contained"
              startIcon={<VisibilityRoundedIcon />}
              sx={{
                ...actionButtonSx,
                bgcolor: "#0284c7",
                color: "#fff",
                "&:hover": { bgcolor: "#0369a1", boxShadow: "0 8px 18px rgba(2, 132, 199, 0.22)" },
              }}
              onClick={() => {
                if (previewId) void openPreview(previewId);
              }}
            >
              Data
            </Button>
          </span>
        </Tooltip>

        {(group.isAssetReport || group.isLotListingReport) && group.contract_no ? (
          <Tooltip title="View every report using this contract number">
            <span>
              <Button
                size="small"
                variant="outlined"
                startIcon={<TableRowsRoundedIcon />}
                sx={{
                  ...actionButtonSx,
                  borderColor: "#94a3b8",
                  color: "#334155",
                  bgcolor: "#fff",
                  "&:hover": { borderColor: "#64748b", bgcolor: "#f8fafc" },
                }}
                onClick={() => void openSameContractReports(group)}
              >
                Same
              </Button>
            </span>
          </Tooltip>
        ) : null}

        {buildFileLinks(group).map((link) => {
          const linkKey = link.label.toLowerCase();
          const tooltipLabel = linkKey === "cr" ? "CR" : link.label;
          const isPdf = linkKey === "cr" || linkKey.includes("pdf");
          const isExcel = link.label.toLowerCase().includes("excel");
          const color = isPdf ? "#4f46e5" : isExcel ? "#2563eb" : "#7c3aed";
          const hover = isPdf ? "#4338ca" : isExcel ? "#1d4ed8" : "#6d28d9";
          return (
            <Tooltip key={`${group.key}-${link.label}`} title={link.href ? tooltipLabel : `${tooltipLabel} unavailable`}>
              <span>
                <Button
                  size="small"
                  variant="contained"
                  disabled={!link.href}
                  startIcon={getFileActionIcon(link.label)}
                  sx={{
                    ...actionButtonSx,
                    bgcolor: color,
                    color: "#fff",
                    "&:hover": { bgcolor: hover, boxShadow: `0 8px 18px ${color}33` },
                    "&.Mui-disabled": {
                      bgcolor: "#e5e7eb",
                      color: "#94a3b8",
                    },
                  }}
                  {...(link.href
                    ? {
                        href: link.href,
                        ...(link.download
                          ? { download: true }
                          : { target: "_blank", rel: "noopener noreferrer" }),
                      }
                    : {})}
                >
                  {link.label}
                </Button>
              </span>
            </Tooltip>
          );
        })}

        {canUseCrDisclaimers(group) ? (
          <Tooltip title="Select CR disclaimers and resubmit Excel/CR">
            <span>
              <Button
                size="small"
                variant="outlined"
                disabled={actionBusyId === group.key}
                startIcon={<NoteAddRoundedIcon />}
                sx={{
                  ...actionButtonSx,
                  borderColor: "#a78bfa",
                  color: "#6d28d9",
                  bgcolor: "#faf5ff",
                  "&:hover": {
                    borderColor: "#8b5cf6",
                    bgcolor: "#f3e8ff",
                  },
                }}
                onClick={() => void openCrDisclaimers(group)}
              >
                Notes
                {getCrCount(group) > 0 ? (
                  <Chip
                    size="small"
                    label={String(getCrCount(group))}
                    sx={{
                      ml: 0.35,
                      height: 14,
                      fontSize: "0.52rem",
                      fontWeight: 900,
                      bgcolor: "#ede9fe",
                      color: "#5b21b6",
                    }}
                  />
                ) : null}
              </Button>
            </span>
          </Tooltip>
        ) : null}

        <Tooltip
          title={
            group.release_status === "pending_release"
              ? "Release this approved report so the user can download files"
              : group.released_at
                ? `Released ${new Date(group.released_at).toLocaleString()}`
                : "Released"
          }
        >
          <span>
            {group.release_status === "pending_release" ? (
              <Button
                size="small"
                variant="contained"
                disabled={actionBusyId === group.key}
                sx={{
                  ...actionButtonSx,
                  bgcolor: "#7c3aed",
                  color: "#fff",
                  "&:hover": { bgcolor: "#6d28d9", boxShadow: "0 8px 18px rgba(124, 58, 237, 0.22)" },
                }}
                onClick={() => void releaseReport(group.key)}
              >
                Release
              </Button>
            ) : (
              <Chip
                size="small"
                label="Released"
                sx={{
                  height: 26,
                  fontSize: "0.62rem",
                  fontWeight: 900,
                  bgcolor: "#ecfdf5",
                  color: "#047857",
                  border: "1px solid #a7f3d0",
                  borderRadius: 1.25,
                }}
              />
            )}
          </span>
        </Tooltip>

        <Tooltip title={archiveTooltip}>
          <span>
            <Button
              size="small"
              variant="outlined"
              disabled={actionBusyId === group.key}
              startIcon={archiveMode === "archived" ? <RestoreRoundedIcon /> : <ArchiveRoundedIcon />}
              sx={{
                ...actionButtonSx,
                borderColor: archiveMode === "archived" ? "#16a34a" : "#f59e0b",
                color: archiveMode === "archived" ? "#15803d" : "#b45309",
                bgcolor: archiveMode === "archived" ? "#f0fdf4" : "#fffbeb",
                "&:hover": {
                  borderColor: archiveMode === "archived" ? "#15803d" : "#d97706",
                  bgcolor: archiveMode === "archived" ? "#dcfce7" : "#fef3c7",
                },
              }}
              onClick={() => void setReportArchived(group.key, archiveMode !== "archived")}
            >
              {archiveLabel}
            </Button>
          </span>
        </Tooltip>

        <Tooltip title="Delete report">
          <span>
            <IconButton
              size="small"
              color="error"
              sx={{
                width: 26,
                height: 26,
                borderRadius: 1.25,
                border: "1px solid #fca5a5",
                borderColor: "#f87171",
                color: "#dc2626",
                bgcolor: "#fff7f7",
                "&:hover": {
                  borderColor: "#ef4444",
                  bgcolor: "#fee2e2",
                },
              }}
              onClick={() => openDelete(group.key)}
            >
              <DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    );
  }

  const columns: ColumnDef<ReportGroup>[] = [
      {
        id: "title",
        accessorKey: "title",
        header: "Report",
        cell: ({ row }) => (
          <Stack direction="row" spacing={0.75} alignItems="flex-start" minWidth={0} sx={{ maxWidth: 260 }}>
            <Stack spacing={0.25} minWidth={0}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 700,
                lineHeight: 1.25,
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {row.original.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              Contract: {row.original.contract_no || "-"}
            </Typography>
            </Stack>
          </Stack>
        ),
      },
      {
        id: "fairMarketValue",
        accessorFn: (row) => row.fairMarketValue || "",
        header: "FMV",
        cell: ({ row }) => (
          <Chip size="small" color="success" label={formatFMV(row.original.fairMarketValue)} sx={{ height: 24, fontWeight: 700, maxWidth: 110 }} />
        ),
      },
      {
        id: "reportType",
        accessorFn: (row) => getReportTypeLabel(row.reportType),
        header: "Type",
        cell: ({ row }) => (
          <Chip size="small" variant="outlined" color="secondary" label={getReportTypeLabel(row.original.reportType)} sx={{ height: 24 }} />
        ),
      },
      {
        id: "createdAt",
        accessorFn: (row) => new Date(row.createdAt).getTime(),
        header: "Created",
        cell: ({ row }) => (
          <Stack spacing={0.25} minWidth={0} sx={{ maxWidth: 190 }}>
            <Typography variant="body2" sx={{ lineHeight: 1.2 }}>
              {new Date(row.original.createdAt).toLocaleDateString()}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {row.original.userEmail || "-"}
            </Typography>
          </Stack>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        header: "Actions",
        cell: ({ row }) => renderReportActions(row.original),
      },
    ];

  const table = useReactTable({
    data: groups,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: totalPages,
    rowCount: data?.total ?? groups.length,
  });

  const rows = table.getRowModel().rows;

  return (
    <div className="admin-page-shell">
      <main className="w-full max-w-none mx-auto space-y-4">
        {/* Hero Summary */}
        <section className="admin-glass-surface rounded-xl p-4 md:p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
                {archiveMode === "archived" ? "Archived Reports" : "Approved Reports"}
              </h1>
              <p className="text-gray-600">
                Search, download, refresh, and complete approved reports.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="rounded-xl border border-rose-200 bg-white/70 px-4 py-2 shadow-sm">
                <div className="text-xs text-gray-600">{archiveMode === "archived" ? "Archived" : "Approved"}</div>
                <div className="text-lg font-semibold text-gray-900">
                  {data?.total ?? 0}
                </div>
              </div>
              <div className="rounded-xl border border-rose-200 bg-white/70 px-4 py-2 shadow-sm hidden sm:block">
                <div className="text-xs text-gray-600">Page</div>
                <div className="text-lg font-semibold text-gray-900">
                  {pagination.pageIndex + 1}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="admin-glass-surface rounded-xl p-4 md:p-5">
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button
                  variant={archiveMode === "active" ? "contained" : "outlined"}
                  color="primary"
                  onClick={() => {
                    setArchiveMode("active");
                    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                  }}
                >
                  Active
                </Button>
                <Button
                  variant={archiveMode === "archived" ? "contained" : "outlined"}
                  color="secondary"
                  onClick={() => {
                    setArchiveMode("archived");
                    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                  }}
                >
                  Archived
                </Button>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="Search"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                }}
                placeholder="Filename or address"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select
                  value={reportType}
                  label="Type"
                  onChange={(e) => {
                    setReportType(e.target.value);
                    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="RealEstate">Real Estate</MenuItem>
                  <MenuItem value="Salvage">Salvage</MenuItem>
                  <MenuItem value="Asset">Asset</MenuItem>
                  <MenuItem value="LotListing">Lot Listing</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="From"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                }}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="To"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                }}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                fullWidth
                size="small"
                label="Created By"
                value={userEmail}
                onChange={(e) => {
                  setUserEmail(e.target.value);
                  setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                }}
                placeholder="user@example.com"
              />
            </Grid>
          </Grid>
          <Stack
            direction={{ xs: "column", xl: "row" }}
            spacing={1.5}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", xl: "center" }}
            sx={{ mt: 2 }}
          >
            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
              <Button variant="contained" onClick={applyTextFiltersNow}>Apply</Button>
              <Button variant="outlined" onClick={() => load()} disabled={loading}>
                {loading ? "Refreshing..." : "Refresh"}
              </Button>
              <Button variant="outlined" color="secondary" onClick={onReset}>Reset</Button>
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} alignItems={{ xs: "stretch", sm: "center" }}>
              <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 150 } }}>
                <InputLabel>Rows</InputLabel>
                <Select
                  value={pageSizeMode}
                  label="Rows"
                  onChange={(e) => {
                    const value = e.target.value as "20" | "50" | "100" | "all" | "custom";
                    if (value === "20" || value === "50" || value === "100") {
                      applyPageSize(Number(value), value);
                      return;
                    }
                    if (value === "all") {
                      applyPageSize(LARGE_PAGE_SIZE, "all");
                      return;
                    }
                    setPageSizeMode("custom");
                    commitCustomPageSize();
                  }}
                >
                  <MenuItem value="20">20</MenuItem>
                  <MenuItem value="50">50</MenuItem>
                  <MenuItem value="100">100</MenuItem>
                  <MenuItem value="all">500</MenuItem>
                  <MenuItem value="custom">Custom</MenuItem>
                </Select>
              </FormControl>

              {pageSizeMode === "custom" ? (
                <TextField
                  size="small"
                  label="Custom rows"
                  value={customPageSizeInput}
                  onChange={(e) => setCustomPageSizeInput(e.target.value)}
                  onBlur={commitCustomPageSize}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      commitCustomPageSize();
                    }
                  }}
                  inputProps={{ inputMode: "numeric", min: 1 }}
                  sx={{ width: { xs: "100%", sm: 132 } }}
                />
              ) : null}

              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Button variant="outlined" color="secondary" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                  Prev
                </Button>
                <Typography variant="body2" sx={{ minWidth: 112, textAlign: "center" }}>
                  Page {pagination.pageIndex + 1} of {table.getPageCount()}
                </Typography>
                <Button variant="outlined" color="secondary" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                  Next
                </Button>
              </Stack>
            </Stack>
          </Stack>
        </section>

        {/* List */}
        <section className="admin-glass-surface rounded-xl p-3 md:p-4">
          {loading ? (
            <Typography color="text.secondary">Loading...</Typography>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            <>
              {crSubmitSuccess ? (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setCrSubmitSuccess(null)}>
                  {crSubmitSuccess}
                </Alert>
              ) : null}
              {/* Table on md+ */}
              <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
                <Chip size="small" color="secondary" variant="outlined" label={`${rows.length} visible`} />
              </Stack>
              <TableContainer sx={{ display: { xs: "none", lg: "block" }, overflow: "visible" }}>
                <Table
                  size="small"
                  sx={{
                    tableLayout: "fixed",
                    width: "100%",
                    "& .MuiTableCell-root": {
                      px: 0.75,
                      py: 1,
                      fontSize: "0.76rem",
                      verticalAlign: "middle",
                    },
                  }}
                >
                  <TableHead>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableCell
                            key={header.id}
                            align="left"
                            sx={{
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                              width:
                                header.column.id === "title"
                                  ? "18%"
                                  : header.column.id === "fairMarketValue"
                                  ? "7%"
                                  : header.column.id === "reportType"
                                  ? "7%"
                                  : header.column.id === "createdAt"
                                  ? "12%"
                                  : header.column.id === "actions"
                                  ? "56%"
                                  : "auto",
                            }}
                          >
                            {header.isPlaceholder ? null : header.column.getCanSort() ? (
                              <TableSortLabel
                                active={!!header.column.getIsSorted()}
                                direction={header.column.getIsSorted() === "desc" ? "desc" : "asc"}
                                onClick={header.column.getToggleSortingHandler()}
                              >
                                {flexRender(header.column.columnDef.header, header.getContext())}
                              </TableSortLabel>
                            ) : (
                              flexRender(header.column.columnDef.header, header.getContext())
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableHead>
                  <TableBody>
                    {rows.length ? (
                      rows.map((row) => (
                        <TableRow
                          key={row.id}
                          hover
                          sx={{
                            contentVisibility: "auto",
                            containIntrinsicSize: "64px",
                          }}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell
                              key={cell.id}
                              align="left"
                              sx={{
                                overflow: cell.column.id === "actions" ? "visible" : "hidden",
                              }}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length}>
                          <Typography color="text.secondary">No {archiveMode === "archived" ? "archived" : "approved"} reports match the current filters.</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Cards on mobile */}
              <Stack spacing={1.5} sx={{ display: { xs: "flex", lg: "none" } }}>
                {rows.length ? (
                  rows.map((row) => {
                    const g = row.original;
                    return (
                      <Card
                        key={g.key}
                        variant="outlined"
                        sx={{
                          contentVisibility: "auto",
                          containIntrinsicSize: "260px",
                          borderRadius: 2,
                        }}
                      >
                        <CardContent>
                          <Stack spacing={1.5}>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
                              <Stack direction="row" spacing={0.75} minWidth={0}>
                              <Stack spacing={0.5} minWidth={0}>
                                <Typography variant="subtitle2" sx={{ wordBreak: "break-word" }}>{g.title}</Typography>
                                <Typography variant="body2" color="text.secondary">Contract: {g.contract_no || "-"}</Typography>
                              </Stack>
                              </Stack>
                              <Chip size="small" variant="outlined" color="secondary" label={getReportTypeLabel(g.reportType)} />
                            </Stack>
                            <Grid container spacing={1.5}>
                              <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" color="text.secondary">FMV</Typography>
                                <Stack sx={{ mt: 0.5 }}>
                                  <Chip size="small" color="success" label={formatFMV(g.fairMarketValue)} sx={{ alignSelf: "flex-start" }} />
                                </Stack>
                              </Grid>
                              <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" color="text.secondary">Created</Typography>
                                <Typography variant="body2">{new Date(g.createdAt).toLocaleString()}</Typography>
                              </Grid>
                              <Grid size={{ xs: 12 }}>
                                <Typography variant="caption" color="text.secondary">Created By</Typography>
                                <Typography variant="body2">{g.userEmail || "-"}</Typography>
                              </Grid>
                            </Grid>
                            {renderReportActions(g, { wrap: true })}
                          </Stack>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <Card variant="outlined">
                    <CardContent>
                      <Typography color="text.secondary">No {archiveMode === "archived" ? "archived" : "approved"} reports match the current filters.</Typography>
                    </CardContent>
                  </Card>
                )}
              </Stack>

              {/* Pagination */}
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} sx={{ mt: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  {data ? (
                    <>
                      Showing {rows.length} of {data.total} {archiveMode === "archived" ? "archived" : "approved"} reports
                    </>
                  ) : null}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button variant="outlined" color="secondary" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                    Prev
                  </Button>
                  <Typography variant="body2" sx={{ minWidth: 100, textAlign: "center" }}>
                    Page {pagination.pageIndex + 1} of {table.getPageCount()}
                  </Typography>
                  <Button variant="outlined" color="secondary" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                    Next
                  </Button>
                </Stack>
              </Stack>
            </>
          )}
        </section>
      </main>
      <Dialog
        open={sameContractOpen}
        onClose={() => setSameContractOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2, maxHeight: "88vh" } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                Reports for contract {sameContractNumber}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {sameContractGroups.length} report{sameContractGroups.length === 1 ? "" : "s"}. Each row has its own files and lot data.
              </Typography>
            </Box>
            <IconButton aria-label="Close" onClick={() => setSameContractOpen(false)}>
              <CloseRoundedIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ p: { xs: 1, sm: 2 } }}>
          {sameContractError ? <Alert severity="error" sx={{ mb: 2 }}>{sameContractError}</Alert> : null}
          {sameContractLoading ? (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>Loading contract reports...</Typography>
          ) : sameContractGroups.length ? (
            <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}>
              <Table size="small" sx={{ minWidth: 840 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Report</TableCell>
                    <TableCell>Lots</TableCell>
                    <TableCell>Created By</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Files</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sameContractGroups.map((report) => (
                    <TableRow key={report.key} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>{report.title}</Typography>
                        <Typography variant="caption" color="text.secondary">ID {report.key.slice(-8)}</Typography>
                      </TableCell>
                      <TableCell>{report.lotNumberSummary || "-"}</TableCell>
                      <TableCell>{report.userEmail || "-"}</TableCell>
                      <TableCell>{new Date(report.createdAt).toLocaleString()}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                          {buildFileLinks(report).filter((file) => file.href).map((file) => (
                            <Button
                              key={`${report.key}-${file.label}`}
                              size="small"
                              variant="outlined"
                              startIcon={getFileActionIcon(file.label)}
                              href={file.href}
                              {...(file.download ? { download: true } : { target: "_blank", rel: "noopener noreferrer" })}
                              sx={{ ...actionButtonSx, height: 28, fontSize: "0.68rem" }}
                            >
                              {file.label}
                            </Button>
                          ))}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
              No approved reports were found for this contract.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button onClick={() => setSameContractOpen(false)} variant="contained">Close</Button>
        </DialogActions>
      </Dialog>
      <ConfirmModal
        open={confirmOpen}
        title="Delete this report?"
        description={
          <>
            This action cannot be undone. The report file (if present) and its
            record will be permanently removed.
          </>
        }
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => {
          setConfirmOpen(false);
          setPendingDeleteId(null);
        }}
        loading={deleting}
      />
      <ReportPreviewModal
        open={previewOpen}
        loading={previewLoading}
        error={previewError}
        preview={previewData}
        savingAssetSheet={previewSaving}
        assetSheetSaveError={previewSaveError}
        assetSheetSaveSuccess={previewSaveSuccess}
        onSaveAssetSheet={saveAssetScheduleSheet}
        onClose={() => {
          setPreviewOpen(false);
          setPreviewLoading(false);
          setPreviewError(null);
          setPreviewData(null);
          setPreviewTargetId(null);
          setPreviewSaving(false);
          setPreviewSaveError(null);
          setPreviewSaveSuccess(null);
        }}
      />
      <CrDisclaimersDialog
        open={crDialogOpen}
        loading={crDialogLoading}
        saving={crDialogSaving}
        error={crDialogError}
        filesBusy={crDialogFilesBusy}
        initialSettings={crInitialSettings}
        initialLots={crInitialLots}
        options={crOptions}
        onClose={closeCrDialog}
        onSave={(settings) => saveCrDisclaimers(settings, false)}
        onResubmit={(settings) => saveCrDisclaimers(settings, true)}
      />
    </div>
  );
}
