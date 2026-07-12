"use client";

import { memo, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { FileText as FileTextIcon, Pilcrow, Save as SaveIcon, Send } from "lucide-react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
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
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  InputAdornment,
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
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
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
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import RestoreRoundedIcon from "@mui/icons-material/RestoreRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
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
  thumbnail_url?: string | null;
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
  thumbnailUrl?: string | null;
  reportType: string;
  createdAt: string;
  fairMarketValue: string;
  userEmail?: string;
  userDisplayName?: string;
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
  desktopMode?: boolean;
};

function RichCrNoteSurface({
  value,
  disabled,
  onChange,
  minHeight = 120,
  autoFocus,
  onExpand,
  desktopMode = false,
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
            width: 28,
            height: 28,
            borderRadius: "3px",
            border: "1px solid",
            borderColor: active ? "#df111b" : "transparent",
            bgcolor: active ? "#df111b" : "transparent",
            color: active ? "#fff" : "#3e423e",
            boxShadow: "none",
            "&:hover": {
              borderColor: active ? "#c91019" : "transparent",
              bgcolor: active ? "#c91019" : "#eceeed",
            },
            "& svg": { width: 16, height: 16, fontSize: 16 },
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
        border: "1px solid #dedfe1",
        borderRadius: "3px",
        bgcolor: disabled ? "#f7f8f8" : "#fff",
        overflow: "hidden",
        boxShadow: "none",
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.5}
        useFlexGap
        flexWrap="wrap"
        sx={{
          p: 1,
          borderBottom: "1px solid #dedfe1",
          bgcolor: "#f7f8f8",
        }}
      >
        {desktopMode ? (
          <>
            {toolbarButton("Bold", <FormatBoldRoundedIcon fontSize="small" />, Boolean(editor?.isActive("bold")), () => run(() => editor!.chain().focus().toggleBold().run()))}
            {toolbarButton("Italic", <FormatItalicRoundedIcon fontSize="small" />, Boolean(editor?.isActive("italic")), () => run(() => editor!.chain().focus().toggleItalic().run()))}
            {toolbarButton("Underline", <FormatUnderlinedRoundedIcon fontSize="small" />, Boolean(editor?.isActive("underline")), () => run(() => editor!.chain().focus().toggleUnderline().run()))}
            {toolbarButton("Paragraph", <Pilcrow size={16} />, Boolean(editor?.isActive("paragraph")), () => run(() => editor!.chain().focus().setParagraph().run()))}
            {toolbarButton("Bullet list", <FormatListBulletedRoundedIcon fontSize="small" />, Boolean(editor?.isActive("bulletList")), () => run(() => editor!.chain().focus().toggleBulletList().run()))}
            {toolbarButton("Numbered list", <FormatListNumberedRoundedIcon fontSize="small" />, Boolean(editor?.isActive("orderedList")), () => run(() => editor!.chain().focus().toggleOrderedList().run()))}
            {toolbarButton("Horizontal rule", <HorizontalRuleRoundedIcon fontSize="small" />, false, () => run(() => editor!.chain().focus().setHorizontalRule().run()))}
            {toolbarButton("Clear formatting", <FormatClearRoundedIcon fontSize="small" />, false, () => run(() => editor!.chain().focus().unsetAllMarks().clearNodes().run()))}
          </>
        ) : (
          <>
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
          </>
        )}
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
  desktopMode = false,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  desktopMode?: boolean;
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
    <Stack spacing={desktopMode ? 1 : 0.75}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Typography variant="caption" sx={desktopMode ? { color: "#17191d", fontSize: 14, fontWeight: 500, lineHeight: "14px" } : { color: "#17191d", fontWeight: 650 }}>
          {label}
        </Typography>
        {!desktopMode ? <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700 }}>CR HTML editor</Typography> : null}
      </Stack>
      <RichCrNoteSurface
        value={value}
        disabled={disabled}
        onChange={onChange}
        minHeight={desktopMode ? 280 : 124}
        onExpand={desktopMode ? undefined : openExpanded}
        desktopMode={desktopMode}
      />
      {!desktopMode ? <Typography variant="caption" color="text.secondary">{richNoteHelpText}</Typography> : null}

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

function closingDateTimeValue(settings: CrDisclaimerSettings) {
  if (!settings.closingDate) return "";
  const { hour, minute } = splitClosingTime(settings.closingTime);
  if (!hour) return settings.closingDate;
  let hour24 = Number(hour) % 12;
  if (settings.closingTimePeriod === "PM") hour24 += 12;
  return `${settings.closingDate}T${String(hour24).padStart(2, "0")}:${minute}`;
}

function parseClosingDateTime(value: string): Partial<CrDisclaimerSettings> {
  if (!value) return { closingDate: null, closingTime: null, closingTimePeriod: null };
  const [date, time = ""] = value.split("T");
  const [hourText = "0", minute = "00"] = time.split(":");
  const hour24 = Number(hourText);
  const period: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return { closingDate: date || null, closingTime: time ? `${hour12}:${minute}` : null, closingTimePeriod: time ? period : null };
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
  return (
    <Stack spacing={0.75}>
      <Typography sx={{ color: "#17191d", fontSize: 14, fontWeight: 500, lineHeight: "14px" }}>Closing date &amp; time</Typography>
      <TextField
        fullWidth
        size="small"
        type="datetime-local"
        value={closingDateTimeValue(settings)}
        disabled={disabled}
        onChange={(event) => onChange(parseClosingDateTime(event.target.value))}
        inputProps={{ step: 60, "aria-label": "Closing date & time" }}
        sx={{ "& .MuiInputBase-root": { height: 32, borderRadius: "3px", bgcolor: "#fff", fontSize: 13 } }}
      />
    </Stack>
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
  return (
    <Stack spacing={2.5}>
      <FormControlLabel
        sx={{ m: 0, minHeight: 42, width: "100%", border: "1px solid #dedfe1", borderRadius: "3px", px: 1.5, py: 1.5, bgcolor: "#fff", "& .MuiCheckbox-root": { width: 16, height: 16, p: 0, mr: 1 }, "& .MuiSvgIcon-root": { fontSize: 18 }, "& .MuiFormControlLabel-label": { color: "#17191d", fontSize: 13, fontWeight: 600, lineHeight: "16px", textTransform: "uppercase" } }}
        control={<Checkbox size="small" disabled={disabled} checked={Boolean(settings.unreserved)} onChange={(event) => onChange({ unreserved: event.target.checked })} />}
        label="Unreserved"
      />
      <ClosingDateTimePicker settings={settings} disabled={disabled} onChange={onChange} />
      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Stack spacing={0.75} alignItems="flex-start">
            <Typography sx={{ color: "#17191d", fontSize: 14, fontWeight: 500, lineHeight: "14px" }}>Bid increment</Typography>
            <FormControl size="small">
              <Select
                displayEmpty
                value={settings.bidIncrement ?? ""}
                disabled={disabled}
                onChange={(event) => onChange({ bidIncrement: parseAuctionBidValue(event.target.value) })}
                renderValue={(value) => value ? `$${Number(value).toLocaleString()}` : "Blank"}
                sx={{ minWidth: 78, height: 32, borderRadius: "3px", bgcolor: "#fff", fontSize: 13, "& .MuiSelect-select": { py: 0.75, pl: 1.25 } }}
              >
                <MenuItem value="">Blank</MenuItem>
                {auctionBidOptions.map((value) => <MenuItem key={`bid-${value}`} value={value}>${value.toLocaleString()}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Stack spacing={0.75} alignItems="flex-start">
            <Typography sx={{ color: "#17191d", fontSize: 14, fontWeight: 500, lineHeight: "14px" }}>Opening bid</Typography>
            <FormControl size="small">
              <Select
                displayEmpty
                value={settings.openingBid ?? ""}
                disabled={disabled}
                onChange={(event) => onChange({ openingBid: parseAuctionBidValue(event.target.value) })}
                renderValue={(value) => value ? `$${Number(value).toLocaleString()}` : "Blank"}
                sx={{ minWidth: 78, height: 32, borderRadius: "3px", bgcolor: "#fff", fontSize: 13, "& .MuiSelect-select": { py: 0.75, pl: 1.25 } }}
              >
                <MenuItem value="">Blank</MenuItem>
                {auctionBidOptions.map((value) => <MenuItem key={`opening-${value}`} value={value}>${value.toLocaleString()}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );
}

const CrLotDisclaimerRow = memo(function CrLotDisclaimerRow({
  lot,
  options,
  disabled,
  onChange,
  onPreviewImage,
}: {
  lot: CrDisclaimerLot;
  options: CrDisclaimerOption[];
  disabled: boolean;
  onChange: (lotKey: string, settings: CrDisclaimerSettings) => void;
  onPreviewImage: (url: string, lot: CrDisclaimerLot) => void;
}) {
  const images = Array.isArray(lot.imageUrls) ? lot.imageUrls.filter(Boolean) : [];
  const update = (patch: Partial<CrDisclaimerSettings>) => onChange(lot.lotKey, { ...lot.settings, ...patch });

  return (
    <Stack spacing={2.5} sx={{ minWidth: 0 }}>
      <Box>
        <Typography component="h3" sx={{ color: "#17191d", fontSize: 20, fontWeight: 600, lineHeight: "28px" }}>Lot {lot.lotNumber}</Typography>
        <Typography sx={{ color: "#737773", fontSize: 14, lineHeight: "20px" }}>{lot.title || "Untitled lot"} | {images.length} image{images.length === 1 ? "" : "s"}</Typography>
      </Box>

      {images.length ? (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(3, minmax(0, 1fr))", md: "repeat(5, minmax(0, 1fr))", xl: "repeat(8, minmax(0, 1fr))" }, gap: 1 }}>
          {images.map((url, index) => (
            <Box
              key={`${lot.lotKey}-img-${index}-${url}`}
              component="button"
              type="button"
              aria-label={`Open Lot ${lot.lotNumber} image ${index + 1}`}
              onClick={() => onPreviewImage(url, lot)}
              disabled={disabled}
              sx={{ minWidth: 0, overflow: "hidden", border: "1px solid #dedfe1", borderRadius: 0, bgcolor: "#f4f5f5", p: 0, aspectRatio: "4 / 3", cursor: disabled ? "default" : "zoom-in" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Lot ${lot.lotNumber} image ${index + 1}`} loading="lazy" decoding="async" style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }} />
            </Box>
          ))}
        </Box>
      ) : null}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "360px minmax(0, 1fr)" }, gap: 3 }}>
        <Stack spacing={2.5}>
          <Box component="fieldset" sx={{ display: "flex", flexDirection: "column", gap: 1, border: 0, m: 0, p: 0 }}>
            <Typography component="legend" sx={{ mb: 0.5, color: "#17191d", fontSize: 14, fontWeight: 600, lineHeight: "14px" }}>Disclaimer blocks</Typography>
            {options.map((option) => (
              <FormControlLabel
                key={`${lot.lotKey}-${option.key}`}
                sx={{ m: 0, minHeight: 42, alignItems: "flex-start", border: "1px solid #dedfe1", borderRadius: "3px", px: 1.5, py: 1.5, bgcolor: "#fff", "& .MuiCheckbox-root": { width: 16, height: 16, p: 0, mt: 0.25, mr: 1 }, "& .MuiSvgIcon-root": { fontSize: 18 }, "& .MuiFormControlLabel-label": { color: "#17191d", fontSize: 14, lineHeight: "16px" } }}
                control={<Checkbox size="small" disabled={disabled} checked={Boolean(lot.settings[option.key])} onChange={(event) => update({ [option.key]: event.target.checked } as Partial<CrDisclaimerSettings>)} />}
                label={option.label}
              />
            ))}
          </Box>
          <CrAuctionControls settings={lot.settings} disabled={disabled} onChange={update} />
        </Stack>

        <Box sx={{ minWidth: 0 }}>
          <RichCrNoteEditor label="Custom note" value={lot.settings.customText} onChange={(value) => update({ customText: value })} disabled={disabled} desktopMode />
        </Box>
      </Box>
    </Stack>
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
  const [activeLotIndex, setActiveLotIndex] = useState(0);
  const [lotSearch, setLotSearch] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);

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
    setActiveLotIndex(0);
    setLotSearch("");
    setBulkOpen(false);
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

  const visibleLots = useMemo(
    () => localLots.map((lot, index) => ({ lot, index })).filter(({ lot }) => !lotSearch.trim() || `${lot.lotNumber} ${lot.title}`.toLowerCase().includes(lotSearch.trim().toLowerCase())),
    [localLots, lotSearch]
  );
  const activeLot = localLots[Math.min(activeLotIndex, Math.max(localLots.length - 1, 0))];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={false}
      slotProps={{ backdrop: { sx: { bgcolor: "rgba(0,0,0,0.10)", backdropFilter: "blur(2px)" } } }}
      PaperProps={{
        sx: {
          width: { xs: "calc(100vw - 16px)", sm: "min(1480px, calc(100vw - 32px))" },
          height: { xs: "94vh", sm: "92vh" },
          maxHeight: { xs: "94vh", sm: "92vh" },
          m: { xs: 1, sm: 2 },
          borderRadius: "4px",
          overflow: "hidden",
          bgcolor: "#fff",
          backgroundImage: "none",
        },
      }}
    >
      <DialogTitle sx={{ position: "relative", flex: "0 0 auto", borderBottom: "1px solid #dedfe1", px: { xs: 2, sm: 3 }, pt: { xs: 2, sm: 2.5 }, pb: { xs: 2, sm: 2.25 } }}>
        <Stack direction="row" spacing={2} alignItems="flex-start" justifyContent="space-between">
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <FileTextIcon size={24} color="#df111b" />
              <Typography component="h2" sx={{ color: "#17191d", fontSize: 16, fontWeight: 500, lineHeight: 1 }}>CR Notes by Lot</Typography>
            </Stack>
            <Typography sx={{ mt: 1, color: "#737773", fontSize: 14, lineHeight: "20px" }}>Review images, disclaimers, notes, and auction controls for each lot.</Typography>
          </Box>
          <IconButton aria-label="Close CR notes" onClick={onClose} sx={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, border: "1px solid #dedfe1", borderRadius: "3px", color: "#555955" }}><CloseRoundedIcon sx={{ fontSize: 17 }} /></IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ display: "flex", minHeight: 0, flex: 1, flexDirection: "column", overflow: "hidden", p: 0 }}>
        {loading ? <Box sx={{ display: "grid", minHeight: 0, flex: 1, placeItems: "center" }}><CircularProgress size={26} sx={{ color: "#df111b" }} /></Box> : null}
        {error ? <Alert severity="error" sx={{ m: 2, borderRadius: "3px" }}>{error}</Alert> : null}
        {!loading && !error ? (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "280px minmax(0, 1fr)" }, minHeight: 0, flex: 1, overflow: "hidden" }}>
            <Box component="aside" sx={{ display: "flex", minHeight: 0, flexDirection: "column", borderRight: { lg: "1px solid #dedfe1" }, borderBottom: { xs: "1px solid #dedfe1", lg: 0 }, bgcolor: "#f7f8f8" }}>
              <Box sx={{ position: "relative", flex: "0 0 auto", borderBottom: "1px solid #dedfe1", p: 1.5 }}>
                <TextField
                  autoFocus
                  fullWidth
                  size="small"
                  value={lotSearch}
                  onChange={(event) => setLotSearch(event.target.value)}
                  placeholder="Find a lot"
                  inputProps={{ "aria-label": "Find a lot" }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 17, color: "#737773" }} /></InputAdornment> }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "3px", bgcolor: "#fff", fontSize: 13, "&.Mui-focused": { boxShadow: "0 0 0 3px rgba(223,17,27,0.25)" } } }}
                />
              </Box>
              <Stack spacing={0.75} sx={{ minHeight: 0, flex: 1, overflowY: "auto", p: 1.5 }}>
                {visibleLots.map(({ lot, index }) => {
                  const selected = activeLotIndex === index;
                  const thumbnail = lot.imageUrls?.[0];
                  return (
                    <Box key={lot.lotKey} sx={{ display: "flex", alignItems: "center", border: selected ? "1px solid #df111b" : "1px solid #dedfe1", bgcolor: selected ? "rgba(223,17,27,0.06)" : "#fff" }}>
                      <Box component="button" type="button" onClick={() => setActiveLotIndex(index)} sx={{ display: "flex", minWidth: 0, flex: 1, alignItems: "center", gap: 1.25, border: 0, bgcolor: "transparent", p: 1, color: "#17191d", font: "inherit", textAlign: "left", cursor: "pointer" }}>
                        {thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumbnail} alt="" loading="lazy" style={{ width: 48, height: 48, flex: "0 0 auto", border: "1px solid #dedfe1", objectFit: "cover" }} />
                        ) : <Box sx={{ display: "grid", width: 48, height: 48, flex: "0 0 auto", placeItems: "center", border: "1px solid #dedfe1", bgcolor: "#f4f5f5", color: "#737773", fontSize: 10 }}>No image</Box>}
                        <Box sx={{ minWidth: 0 }}><Typography noWrap sx={{ fontSize: 13, fontWeight: 650 }}>Lot {lot.lotNumber || index + 1}</Typography><Typography noWrap sx={{ mt: 0.25, color: "#737773", fontSize: 11 }}>{lot.title || "Untitled"}</Typography></Box>
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
              {localLots.length > 1 ? <Box sx={{ flex: "0 0 auto", borderTop: "1px solid #dedfe1", p: 1.5 }}>
                <Button fullWidth variant="outlined" onClick={() => setBulkOpen(true)} disabled={saving || !localLots.length} sx={{ minHeight: 36, borderRadius: "3px", borderColor: "#c7c9ca", color: "#17191d", fontSize: 12, fontWeight: 600, textTransform: "none" }}>Bulk apply ({selectedCount} selected)</Button>
              </Box> : null}
            </Box>

            <Box sx={{ minHeight: 0, minWidth: 0, overflowX: "hidden", overflowY: "auto" }}>
              <Stack spacing={2} sx={{ minWidth: 0, p: { xs: 2, sm: 3 }, pb: 5 }}>
                {filesBusy ? <Alert severity="warning" sx={{ borderRadius: "3px" }}>This report is already generating files. Save is available, but resubmit is disabled until it finishes.</Alert> : null}
                {activeLot ? (
                  <>
                    <CrLotDisclaimerRow lot={activeLot} options={options} disabled={saving} onChange={updateLotSettings} onPreviewImage={(url, selectedLot) => setPreviewImage({ url, lot: selectedLot })} />
                    {getCrSettingsActiveCount(activeLot.settings) > 0 ? <Button size="small" color="inherit" disabled={saving} onClick={() => clearLotSettings(activeLot.lotKey)} sx={{ alignSelf: "flex-end", color: "#737773", fontSize: 12, fontWeight: 600, textTransform: "none" }}>Clear lot notes</Button> : null}
                  </>
                ) : <Typography sx={{ color: "#737773", fontSize: 13 }}>No lots are available.</Typography>}
              </Stack>
            </Box>
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ flex: "0 0 auto", p: { xs: 1.5, sm: 2 }, gap: 1, flexWrap: "wrap", borderTop: "1px solid #dedfe1", bgcolor: "#fff" }}>
        <Button onClick={onClose} disabled={saving} variant="outlined" sx={{ height: 32, minHeight: 32, py: 0, borderRadius: "3px", borderColor: "#c7c9ca", color: "#17191d", textTransform: "none" }}>
          Cancel
        </Button>
        <Button
          variant="outlined"
          startIcon={<SaveIcon size={16} />}
          onClick={() => void onSave(payload)}
          disabled={loading || saving}
          sx={{ height: 32, minHeight: 32, py: 0, borderRadius: "3px", borderColor: "#c7c9ca", color: "#17191d", textTransform: "none" }}
        >
          Save
        </Button>
        <Button
          variant="contained"
          startIcon={<Send size={16} />}
          onClick={() => void onResubmit(payload)}
          disabled={loading || saving || filesBusy}
          sx={{ height: 32, minHeight: 32, py: 0, borderRadius: "3px", bgcolor: "#df111b", color: "#fff", textTransform: "none", boxShadow: "none", "&:hover": { bgcolor: "#c91019", boxShadow: "none" } }}
        >
          {saving ? "Working..." : "Save & Resubmit"}
        </Button>
      </DialogActions>
      <Dialog open={bulkOpen} onClose={() => setBulkOpen(false)} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: "4px", backgroundImage: "none" } }}>
        <DialogTitle sx={{ borderBottom: "1px solid #dedfe1", px: 3, py: 2 }}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
            <Box><Typography component="h3" sx={{ color: "#17191d", fontSize: 17, fontWeight: 650 }}>Bulk apply</Typography><Typography sx={{ mt: 0.5, color: "#737773", fontSize: 12 }}>Apply one set of CR notes to the selected lots.</Typography></Box>
            <IconButton aria-label="Close bulk apply" onClick={() => setBulkOpen(false)} sx={{ width: 32, height: 32, borderRadius: "3px" }}><CloseRoundedIcon sx={{ fontSize: 18 }} /></IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Chip size="small" label={`${selectedCount} selected`} sx={{ bgcolor: "#eef0f1", color: "#4b4f4b", fontSize: 11, fontWeight: 650 }} />
              <Button size="small" variant="outlined" disabled={saving || allSelected} onClick={selectAllLots} sx={{ borderRadius: "3px", color: "#17191d", textTransform: "none" }}>Select all</Button>
              <Button size="small" color="inherit" disabled={saving || selectedCount === 0} onClick={clearSelectedLots} sx={{ color: "#737773", textTransform: "none" }}>Clear selection</Button>
            </Stack>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, maxHeight: 176, overflowY: "auto", border: "1px solid #dedfe1", p: 1 }}>
              {localLots.map((lot) => <FormControlLabel key={`bulk-select-${lot.lotKey}`} sx={{ m: 0, minWidth: 0, px: 0.5, "& .MuiFormControlLabel-label": { minWidth: 0, overflow: "hidden", color: "#17191d", fontSize: 12, textOverflow: "ellipsis", whiteSpace: "nowrap" } }} control={<Checkbox size="small" disabled={saving} checked={selectedLotKeys.has(lot.lotKey)} onChange={(event) => toggleLotSelection(lot.lotKey, event.target.checked)} />} label={`Lot ${lot.lotNumber} — ${lot.title || "Untitled"}`} />)}
            </Box>
            <Box component="fieldset" sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 1, border: 0, m: 0, p: 0 }}>
              <Typography component="legend" sx={{ gridColumn: "1 / -1", mb: 0.5, color: "#17191d", fontSize: 13, fontWeight: 650 }}>Disclaimer blocks</Typography>
              {options.map((option) => <FormControlLabel key={`bulk-${option.key}`} sx={{ m: 0, minHeight: 46, border: "1px solid #dedfe1", borderRadius: "3px", px: 1.25, py: 0.75, "& .MuiFormControlLabel-label": { fontSize: 12.5, lineHeight: 1.35 } }} control={<Checkbox size="small" disabled={saving} checked={Boolean(bulkSettings[option.key])} onChange={(event) => updateBulkSettings({ [option.key]: event.target.checked } as Partial<CrDisclaimerSettings>)} />} label={option.label} />)}
            </Box>
            <CrAuctionControls settings={bulkSettings} disabled={saving} onChange={updateBulkSettings} />
            <RichCrNoteEditor label="Bulk custom note" value={bulkSettings.customText} onChange={(value) => updateBulkSettings({ customText: value })} disabled={saving} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ borderTop: "1px solid #dedfe1", px: 3, py: 2 }}>
          <Button variant="outlined" onClick={() => setBulkOpen(false)} sx={{ borderRadius: "3px", color: "#17191d", textTransform: "none" }}>Cancel</Button>
          <Button variant="contained" disabled={saving || selectedCount === 0} onClick={() => { applyBulkToSelected(); setBulkOpen(false); }} sx={{ borderRadius: "3px", bgcolor: "#df111b", textTransform: "none", boxShadow: "none", "&:hover": { bgcolor: "#c91019", boxShadow: "none" } }}>Apply to selected</Button>
        </DialogActions>
      </Dialog>
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
          ? `${base} - ${r.contract_no}`
          : r.address || base,
        contract_no: r.contract_no,
        lotNumberSummary: r.lot_number_summary,
        thumbnailUrl: r.thumbnail_url || null,
        reportType: r.reportType,
        createdAt: r.createdAt,
        fairMarketValue: r.fairMarketValue,
        userEmail: r.user?.email || undefined,
        userDisplayName: r.user?.username || r.user?.email || undefined,
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
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 5 });
  const [pageSizeMode, setPageSizeMode] = useState<"5" | "20" | "50" | "100" | "all" | "custom">("5");
  const [customPageSizeInput] = useState("150");
  const [archiveMode, setArchiveMode] = useState<"active" | "archived">("active");
  const [sameContractOpen, setSameContractOpen] = useState(false);
  const [sameContractLoading, setSameContractLoading] = useState(false);
  const [sameContractError, setSameContractError] = useState<string | null>(null);
  const [sameContractNumber, setSameContractNumber] = useState("");
  const [sameContractCurrentKey, setSameContractCurrentKey] = useState("");
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
  const [previewTitle, setPreviewTitle] = useState("");
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

  async function openPreview(id: string, title = "") {
    setPreviewTargetId(id);
    setPreviewTitle(title);
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

  function applyPageSize(nextSize: number, nextMode: "5" | "20" | "50" | "100" | "all" | "custom") {
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
    setSameContractCurrentKey(group.key);
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
                if (previewId) void openPreview(previewId, group.title);
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

  const desktopTileSx = {
    minWidth: 0,
    width: 47,
    height: 44,
    px: 0.25,
    py: 0.3,
    borderRadius: 0,
    borderColor: "divider",
    bgcolor: "background.paper",
    color: "text.primary",
    fontSize: "0.48rem",
    fontWeight: 550,
    lineHeight: 1.05,
    flexDirection: "column",
    gap: 0.35,
    whiteSpace: "normal",
    "&:hover": { borderColor: "#9b9da0", bgcolor: "action.hover" },
    "& .MuiButton-startIcon": { m: 0 },
    "& .MuiSvgIcon-root": { fontSize: "1rem" },
  } as const;

  function renderDesktopFiles(group: ReportGroup) {
    const previewId = getPreviewTargetId(group);
    return (
      <Stack direction="row" spacing={0.4} useFlexGap flexWrap="wrap" alignItems="center" sx={{ maxWidth: "100%", rowGap: 0.5 }}>
        <Button variant="outlined" startIcon={<VisibilityRoundedIcon />} sx={desktopTileSx} onClick={() => previewId && void openPreview(previewId, group.title)}>
          Data
        </Button>
        {buildFileLinks(group).map((file) => (
          <Button
            key={`${group.key}-${file.label}`}
            variant="outlined"
            disabled={!file.href}
            startIcon={getFileActionIcon(file.label)}
            sx={desktopTileSx}
            {...(file.href
              ? {
                  href: file.href,
                  ...(file.download ? { download: true } : { target: "_blank", rel: "noopener noreferrer" }),
                }
              : {})}
          >
            {file.label}
          </Button>
        ))}
      </Stack>
    );
  }

  function renderDesktopRowActions(group: ReportGroup) {
    const desktopActionSx = {
      width: 48,
      minWidth: 48,
      height: 44,
      borderRadius: 0,
      borderColor: "divider",
      bgcolor: "background.paper",
      color: "text.primary",
      px: 0.35,
      py: 0.3,
      fontSize: "0.5rem",
      fontWeight: 550,
      lineHeight: 1.05,
      whiteSpace: "normal",
      textAlign: "center",
      flexDirection: "column",
      gap: 0.25,
      "&:hover": { borderColor: "#9b9da0", bgcolor: "action.hover" },
      "& .MuiButton-startIcon": { m: 0 },
      "& .MuiSvgIcon-root": { fontSize: "0.95rem" },
    } as const;
    return (
      <Stack direction="row" spacing={0.4} useFlexGap flexWrap="wrap" alignItems="center" sx={{ maxWidth: "100%", rowGap: 0.5 }}>
        {group.contract_no ? (
          <Button variant="outlined" startIcon={<TableRowsRoundedIcon />} sx={{ ...desktopActionSx, width: 58, minWidth: 58 }} onClick={() => void openSameContractReports(group)}>
            Same Contract
          </Button>
        ) : null}
        {canUseCrDisclaimers(group) ? (
          <Button variant="outlined" startIcon={<NoteAddRoundedIcon />} sx={desktopActionSx} disabled={actionBusyId === group.key} onClick={() => void openCrDisclaimers(group)}>
            CR Notes
          </Button>
        ) : null}
        {group.release_status === "pending_release" ? (
          <Button variant="outlined" sx={{ ...desktopActionSx, color: "#087f5b" }} disabled={actionBusyId === group.key} onClick={() => void releaseReport(group.key)}>
            Release
          </Button>
        ) : null}
        <Button
          variant="outlined"
          startIcon={archiveMode === "archived" ? <RestoreRoundedIcon /> : <ArchiveRoundedIcon />}
          sx={desktopActionSx}
          disabled={actionBusyId === group.key}
          onClick={() => void setReportArchived(group.key, archiveMode !== "archived")}
        >
          {archiveMode === "archived" ? "Restore" : "Archive"}
        </Button>
        <Button
          variant="outlined"
          startIcon={<DeleteOutlineRoundedIcon />}
          onClick={() => openDelete(group.key)}
          sx={{ ...desktopActionSx, width: 44, minWidth: 44, borderColor: "#efb6ba", color: "#df111b" }}
        >
          Delete
        </Button>
      </Stack>
    );
  }

  const columns: ColumnDef<ReportGroup>[] = [
    {
      id: "title",
      accessorKey: "title",
      header: "Report",
      cell: ({ row }) => (
        <Stack direction="row" spacing={1.25} alignItems="center" minWidth={0}>
          {row.original.thumbnailUrl ? (
            <Box component="img" src={row.original.thumbnailUrl} alt="" sx={{ width: 70, height: 58, flexShrink: 0, objectFit: "cover", border: "1px solid", borderColor: "divider" }} />
          ) : (
            <Box sx={{ position: "relative", display: "grid", width: 70, height: 58, flexShrink: 0, placeItems: "center", overflow: "hidden", border: "1px solid", borderColor: "divider", bgcolor: "#ececed", color: "#111", fontSize: 22, fontWeight: 750 }}>
              {String(row.original.contract_no || row.original.key).slice(-3)}
              <Box sx={{ position: "absolute", inset: "auto 0 0", bgcolor: "#181918", color: "#fff", py: 0.2, textAlign: "center", fontSize: 8, fontWeight: 650 }}>
                {row.original.lotNumberSummary?.split(",")[0] || "Report"}
              </Box>
            </Box>
          )}
          <Stack spacing={0.25} minWidth={0}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 650,
                lineHeight: 1.25,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {row.original.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              Contract: {row.original.contract_no || "-"}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>{row.original.lotNumberSummary || "No lot summary"}</Typography>
          </Stack>
        </Stack>
      ),
    },
    {
      id: "lotsFmv",
      header: "Lots / FMV",
      enableSorting: false,
      cell: ({ row }) => (
        <Stack spacing={0.4}>
          <Typography variant="body2" sx={{ fontSize: "0.72rem" }}>
            Lot: {String(row.original.fairMarketValue || "").toLowerCase().includes("lot") ? String(row.original.fairMarketValue).match(/\d+/)?.[0] || "-" : row.original.lotNumberSummary ? row.original.lotNumberSummary.split(",").length : "-"}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: "0.72rem" }}>
            FMV: {String(row.original.fairMarketValue || "").toLowerCase().includes("lot") ? "-" : formatFMV(row.original.fairMarketValue)}
          </Typography>
        </Stack>
      ),
    },
    {
      id: "reportType",
      accessorFn: (row) => getReportTypeLabel(row.reportType),
      header: "Type",
      cell: ({ row }) => <Typography variant="body2" sx={{ fontSize: "0.72rem" }}>{getReportTypeLabel(row.original.reportType)}</Typography>,
    },
    {
      id: "createdAt",
      accessorFn: (row) => new Date(row.createdAt).getTime(),
      header: "Created",
      cell: ({ row }) => (
        <Stack spacing={0.2} minWidth={0}>
          <Typography variant="body2" sx={{ fontSize: "0.72rem", lineHeight: 1.25 }}>{new Date(row.original.createdAt).toLocaleDateString()}</Typography>
          <Typography variant="body2" sx={{ fontSize: "0.72rem", lineHeight: 1.25 }}>{new Date(row.original.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</Typography>
          <Typography variant="caption" color="text.secondary" noWrap>by {row.original.userEmail || "-"}</Typography>
        </Stack>
      ),
    },
    {
      id: "status",
      header: "Status",
      enableSorting: false,
      cell: ({ row }) => {
        const released = row.original.release_status !== "pending_release";
        return (
          <Stack spacing={0.5} alignItems="center">
            <Chip size="small" label={released ? "Released" : "Awaiting Release"} sx={{ height: 23, bgcolor: released ? "#e9f7f2" : "#fff4df", color: released ? "#087f5b" : "#a45a00", border: "1px solid", borderColor: released ? "#c5e9dd" : "#f2d6a5", fontSize: "0.62rem" }} />
            {row.original.released_at ? <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.56rem" }}>{new Date(row.original.released_at).toLocaleString()}</Typography> : null}
          </Stack>
        );
      },
    },
    {
      id: "files",
      header: "Files",
      enableSorting: false,
      cell: ({ row }) => renderDesktopFiles(row.original),
    },
    {
      id: "actions",
      enableSorting: false,
      header: "Actions",
      cell: ({ row }) => renderDesktopRowActions(row.original),
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
  const currentPage = pagination.pageIndex + 1;
  const pageValues = Array.from(new Set([1, currentPage - 1, currentPage, currentPage + 1, totalPages].filter((value) => value >= 1 && value <= totalPages))).sort((a, b) => a - b);

  return (
    <div className="admin-page-shell desktop-admin-page">
      <main className="w-full min-w-0 max-w-none mx-auto space-y-3 overflow-x-hidden">
        <header className="mb-5">
          <div className="flex items-center gap-2">
            <h1 className="desktop-page-title">{archiveMode === "archived" ? "Archived Reports" : "Approved Reports"}</h1>
            <span className="inline-flex min-w-8 items-center justify-center rounded-full border border-gray-300 bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
              {data?.total ?? 0}
            </span>
          </div>
          <p className="desktop-page-subtitle">{archiveMode === "archived" ? "Reports moved out of the active workspace." : "Reports that have been approved and released."}</p>
        </header>

        <section className="desktop-flat-panel p-3">
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: "minmax(220px, 2fr) 130px minmax(150px, 1fr) minmax(150px, 1fr)", xl: "minmax(220px,1fr) 130px 150px 12px 150px minmax(140px,0.75fr) 128px auto auto" }, gap: 1, alignItems: "center" }}>
            <TextField
              fullWidth
              size="small"
              value={q}
              onChange={(event) => { setQ(event.target.value); setPagination((previous) => ({ ...previous, pageIndex: 0 })); }}
              placeholder="Search reports..."
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: "text.secondary" }} /></InputAdornment> }}
            />
            <FormControl fullWidth size="small">
              <Select value={reportType} displayEmpty onChange={(event) => { setReportType(event.target.value); setPagination((previous) => ({ ...previous, pageIndex: 0 })); }}>
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="RealEstate">Real Estate</MenuItem>
                <MenuItem value="Salvage">Salvage</MenuItem>
                <MenuItem value="Asset">Asset</MenuItem>
                <MenuItem value="LotListing">Lot Listing</MenuItem>
              </Select>
            </FormControl>
            <TextField fullWidth size="small" type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPagination((previous) => ({ ...previous, pageIndex: 0 })); }} inputProps={{ "aria-label": "From date" }} />
            <Typography sx={{ display: { xs: "none", xl: "block" }, color: "text.secondary", textAlign: "center", fontSize: 12 }}>-</Typography>
            <TextField fullWidth size="small" type="date" value={to} onChange={(event) => { setTo(event.target.value); setPagination((previous) => ({ ...previous, pageIndex: 0 })); }} inputProps={{ "aria-label": "To date" }} />
            <TextField fullWidth size="small" value={userEmail} onChange={(event) => { setUserEmail(event.target.value); setPagination((previous) => ({ ...previous, pageIndex: 0 })); }} placeholder="All Creators" inputProps={{ "aria-label": "Created by" }} />
            <Stack direction="row" sx={{ height: 40, border: "1px solid", borderColor: "divider", p: 0.25 }}>
              <Button size="small" variant={archiveMode === "active" ? "contained" : "text"} onClick={() => { setArchiveMode("active"); setPagination((previous) => ({ ...previous, pageIndex: 0 })); }} sx={{ minWidth: 58, minHeight: 32 }}>Active</Button>
              <Button size="small" variant={archiveMode === "archived" ? "contained" : "text"} onClick={() => { setArchiveMode("archived"); setPagination((previous) => ({ ...previous, pageIndex: 0 })); }} sx={{ minWidth: 62, minHeight: 32 }}>Archived</Button>
            </Stack>
            <Button variant="contained" onClick={applyTextFiltersNow}>Apply</Button>
            <Stack direction="row" spacing={0.5}>
              <IconButton aria-label="Refresh reports" onClick={() => void load()} disabled={loading} sx={{ width: 40, height: 40, border: "1px solid", borderColor: "divider", borderRadius: "4px" }}><RefreshRoundedIcon sx={{ fontSize: 18 }} /></IconButton>
              <IconButton aria-label="Reset filters" onClick={onReset} sx={{ width: 40, height: 40, border: "1px solid", borderColor: "divider", borderRadius: "4px" }}><RestartAltRoundedIcon sx={{ fontSize: 18 }} /></IconButton>
            </Stack>
          </Box>
        </section>

        {/* List */}
        <section className="desktop-flat-panel overflow-hidden">
          {loading ? (
            <Typography color="text.secondary" sx={{ p: 3 }}>Loading...</Typography>
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
              <TableContainer sx={{ display: { xs: "none", xl: "block" }, maxWidth: "100%", overflowX: "hidden" }}>
                <Table
                  className="desktop-reports-table"
                  size="small"
                  sx={{
                    tableLayout: "fixed",
                    width: "100%",
                    minWidth: 0,
                    "& .MuiTableCell-root": {
                      px: 1.5,
                      py: 1,
                      fontSize: "0.72rem",
                      verticalAlign: "middle",
                    },
                    "& .MuiTableHead-root .MuiTableCell-root": {
                      height: 48,
                      fontSize: "0.7rem",
                      fontWeight: 650,
                      bgcolor: "background.paper",
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
                                  ? "20%"
                                  : header.column.id === "lotsFmv"
                                  ? "7%"
                                  : header.column.id === "reportType"
                                  ? "7%"
                                  : header.column.id === "createdAt"
                                  ? "11%"
                                  : header.column.id === "status"
                                  ? "9%"
                                  : header.column.id === "files"
                                  ? "25%"
                                  : header.column.id === "actions"
                                  ? "21%"
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
                            containIntrinsicSize: "84px",
                            minHeight: 84,
                          }}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell
                              key={cell.id}
                              align="left"
                              sx={{
                                overflow: "hidden",
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
              <Stack spacing={1.5} sx={{ display: { xs: "flex", xl: "none" }, p: { xs: 1.25, sm: 2 } }}>
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

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} sx={{ minHeight: 60, borderTop: "1px solid", borderColor: "divider", px: 2, py: 1.25 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.72rem" }}>
                  Showing {data?.total ? pagination.pageIndex * pagination.pageSize + 1 : 0} to {Math.min((pagination.pageIndex + 1) * pagination.pageSize, data?.total || 0)} of {data?.total || 0} reports
                </Typography>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <IconButton aria-label="Previous page" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} sx={{ width: 36, height: 36, border: "1px solid", borderColor: "divider", borderRadius: 0 }}><ChevronLeftRoundedIcon /></IconButton>
                  {pageValues.map((value, index) => (
                    <span key={value} className="contents">
                      {index > 0 && value - pageValues[index - 1] > 1 ? <Typography sx={{ px: 0.5, fontSize: 12 }}>...</Typography> : null}
                      <Button variant={value === currentPage ? "contained" : "outlined"} onClick={() => setPagination((previous) => ({ ...previous, pageIndex: value - 1 }))} sx={{ minWidth: 36, width: 36, minHeight: 36, borderRadius: 0, px: 0 }}>{value}</Button>
                    </span>
                  ))}
                  <IconButton aria-label="Next page" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} sx={{ width: 36, height: 36, border: "1px solid", borderColor: "divider", borderRadius: 0 }}><ChevronRightRoundedIcon /></IconButton>
                </Stack>
                <FormControl size="small" sx={{ width: 122 }}>
                  <Select
                    value={pageSizeMode}
                    onChange={(event) => {
                      const value = event.target.value as "5" | "20" | "50" | "100" | "all" | "custom";
                      if (value === "5" || value === "20" || value === "50" || value === "100") return applyPageSize(Number(value), value);
                      if (value === "all") return applyPageSize(LARGE_PAGE_SIZE, "all");
                      setPageSizeMode("custom");
                      commitCustomPageSize();
                    }}
                  >
                    <MenuItem value="5">5 per page</MenuItem>
                    <MenuItem value="20">20 per page</MenuItem>
                    <MenuItem value="50">50 per page</MenuItem>
                    <MenuItem value="100">100 per page</MenuItem>
                    <MenuItem value="all">500 per page</MenuItem>
                    <MenuItem value="custom">Custom</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </>
          )}
        </section>
      </main>
      <Dialog
        open={sameContractOpen}
        onClose={() => {
          setSameContractOpen(false);
          setSameContractCurrentKey("");
        }}
        fullWidth
        maxWidth={false}
        slotProps={{ backdrop: { sx: { bgcolor: "rgba(0,0,0,0.10)", backdropFilter: "blur(2px)" } } }}
        PaperProps={{
          sx: {
            width: { xs: "calc(100vw - 16px)", sm: "min(1280px, calc(100vw - 32px))" },
            height: { xs: "90vh", sm: "82vh" },
            maxHeight: { xs: "90vh", sm: "82vh" },
            m: { xs: 1, sm: 2 },
            borderRadius: "4px",
            overflow: "hidden",
            bgcolor: "#fff",
            backgroundImage: "none",
          },
        }}
      >
        <DialogTitle sx={{ position: "relative", flex: "0 0 auto", borderBottom: "1px solid #dedfe1", px: { xs: 2, sm: 3 }, pt: { xs: 2, sm: 2.5 }, pb: { xs: 2, sm: 2.25 } }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
            <Box>
              <Typography component="h2" sx={{ color: "#17191d", fontSize: 16, fontWeight: 500, lineHeight: 1 }}>Same Contract Reports</Typography>
              <Typography sx={{ mt: 1, color: "#737773", fontSize: 14, lineHeight: "20px" }}>Exact contract {sameContractNumber || "-"}. Every report and file remains independent.</Typography>
            </Box>
            <IconButton
              aria-label="Close same contract reports"
              onClick={() => {
                setSameContractOpen(false);
                setSameContractCurrentKey("");
              }}
              sx={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, border: "1px solid #dedfe1", borderRadius: "3px", color: "#555955" }}
            >
              <CloseRoundedIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ minHeight: 0, flex: 1, overflow: "auto", bgcolor: "#fff", p: { xs: 1.5, sm: 2.5 }, "&&": { pt: { xs: 1.5, sm: 2.5 } } }}>
          {sameContractError ? <Alert severity="error" sx={{ mb: 2, borderRadius: "3px" }}>{sameContractError}</Alert> : null}
          {sameContractLoading ? <Box sx={{ display: "grid", height: "100%", minHeight: 220, placeItems: "center" }}><CircularProgress size={26} sx={{ color: "#df111b" }} /></Box> : null}
          {!sameContractLoading && !sameContractError && !sameContractGroups.length ? (
            <Box sx={{ display: "grid", height: 208, placeItems: "center", border: "1px solid #dedfe1", color: "#737773", textAlign: "center" }}>
              <Box><TableRowsRoundedIcon sx={{ mb: 1, fontSize: 24 }} /><Typography sx={{ fontSize: 13 }}>No other reports use this exact contract.</Typography></Box>
            </Box>
          ) : null}
          {!sameContractLoading && sameContractGroups.length ? (
            <Stack spacing={1}>
              {sameContractGroups.map((report) => {
                const files = buildFileLinks(report).filter((file) => file.href);
                return (
                  <Box
                    component="article"
                    key={report.key}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", md: "minmax(280px, 1.2fr) 140px 180px minmax(280px, 1fr)" },
                      alignItems: { md: "center" },
                      gap: 2,
                      border: "1px solid #dedfe1",
                      p: 2,
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
                      {report.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={report.thumbnailUrl} alt="" loading="lazy" style={{ width: 56, height: 56, flex: "0 0 auto", border: "1px solid #dedfe1", objectFit: "cover" }} />
                      ) : (
                        <Box sx={{ display: "grid", width: 56, height: 56, flex: "0 0 auto", placeItems: "center", border: "1px solid #dedfe1", bgcolor: "#f4f5f5" }}><TableRowsRoundedIcon sx={{ fontSize: 21, color: "#737773" }} /></Box>
                      )}
                      <Box sx={{ minWidth: 0 }}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                          <Typography noWrap sx={{ minWidth: 0, color: "#17191d", fontSize: 14, fontWeight: 650 }}>{report.title}</Typography>
                          {report.key === sameContractCurrentKey ? <Chip label="Current" size="small" sx={{ height: 21, borderRadius: "10px", bgcolor: "#eef0f1", color: "#4b4f4b", fontSize: 10, fontWeight: 650 }} /> : null}
                        </Stack>
                        <Typography noWrap sx={{ mt: 0.5, color: "#737773", fontSize: 11 }}>{report.lotNumberSummary || "No lot summary"}</Typography>
                      </Box>
                    </Stack>
                    <Box><Typography sx={{ color: "#737773", fontSize: 11 }}>Created</Typography><Typography sx={{ mt: 0.5, color: "#17191d", fontSize: 13 }}>{new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(report.createdAt))}</Typography></Box>
                    <Box sx={{ minWidth: 0 }}><Typography sx={{ color: "#737773", fontSize: 11 }}>Owner</Typography><Typography noWrap sx={{ mt: 0.5, color: "#17191d", fontSize: 13 }}>{report.userDisplayName || report.userEmail || "Unknown"}</Typography></Box>
                    <Stack direction="row" justifyContent={{ md: "flex-end" }} spacing={0.75} useFlexGap flexWrap="wrap">
                      {files.map((file) => (
                        <Button
                          key={`${report.key}-${file.label}`}
                          size="small"
                          variant="outlined"
                          href={file.href}
                          {...(file.download ? { download: true } : { target: "_blank", rel: "noopener noreferrer" })}
                          sx={{ minWidth: "auto", minHeight: 28, borderRadius: "3px", borderColor: "#dedfe1", px: 1.25, color: "#17191d", fontSize: 11, fontWeight: 600, textTransform: "none", boxShadow: "none", "&:hover": { borderColor: "#b9bcbe", bgcolor: "#f7f8f8", boxShadow: "none" }, "&.Mui-focusVisible": { borderColor: "#df111b", boxShadow: "0 0 0 2px rgba(223,17,27,0.28)" } }}
                        >
                          {file.label}
                        </Button>
                      ))}
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          ) : null}
        </DialogContent>
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
        titleOverride={previewTitle}
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
          setPreviewTitle("");
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
