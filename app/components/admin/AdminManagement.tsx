"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  blockAdminAPI,
  createAdminAPI,
  deleteAdminAPI,
  listAdminsAPI,
  updateAdminPasswordAPI,
} from "@/lib/api";
import Link from "next/link";
import Modal from "@/app/components/common/Modal";
import ConfirmModal from "@/app/components/common/ConfirmModal";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  Grid,
  InputLabel,
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
  Typography,
} from "@mui/material";

type AdminUser = {
  _id: string;
  email: string;
  username?: string;
  role: "admin" | "superadmin" | string;
  isBlocked?: boolean;
  companyName?: string;
  createdAt?: string;
};

export default function AdminManagement() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<
    { id: number; type: "success" | "error" | "info"; message: string }[]
  >([]);

  // Filters & sorting
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "roleRank", desc: false }]);

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmType, setConfirmType] = useState<"delete" | "block">("delete");
  const [targetUser, setTargetUser] = useState<AdminUser | null>(null);
  const [processing, setProcessing] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<AdminUser | null>(null);
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  function pushToast(
    message: string,
    type: "success" | "error" | "info" = "info"
  ) {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const data = await listAdminsAPI();
      setAdmins(data.admins || []);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load admins";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await createAdminAPI({
        email,
        username: username || undefined,
        password: password || undefined,
        companyName: companyName || undefined,
      });
      setEmail("");
      setUsername("");
      setPassword("");
      setCompanyName("");
      await load();
      setCreateOpen(false);
      pushToast("Admin created successfully", "success");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to create admin";
      setError(message);
      pushToast(message, "error");
    } finally {
      setCreating(false);
    }
  }

  function openDelete(u: AdminUser) {
    if (u.role === "superadmin") return;
    setConfirmType("delete");
    setTargetUser(u);
    setConfirmOpen(true);
  }

  function openBlock(u: AdminUser) {
    if (u.role === "superadmin") return;
    setConfirmType("block");
    setTargetUser(u);
    setConfirmOpen(true);
  }

  function openPasswordModal(u: AdminUser) {
    setPasswordTarget(u);
    setNextPassword("");
    setConfirmPassword("");
    setPasswordError(null);
    setPasswordOpen(true);
  }

  async function confirmAction() {
    if (!targetUser) return;
    try {
      setProcessing(true);
      if (confirmType === "delete") {
        await deleteAdminAPI(targetUser._id);
        pushToast("Admin deleted", "success");
      } else {
        await blockAdminAPI(targetUser._id, !targetUser.isBlocked);
        pushToast(
          targetUser.isBlocked ? "Admin unblocked" : "Admin blocked",
          "success"
        );
      }
      setConfirmOpen(false);
      setTargetUser(null);
      await load();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Action failed";
      pushToast(message, "error");
    } finally {
      setProcessing(false);
    }
  }

  async function onPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordTarget) return;

    if (nextPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters long.");
      return;
    }

    if (nextPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    try {
      setUpdatingPassword(true);
      setPasswordError(null);
      await updateAdminPasswordAPI(passwordTarget._id, nextPassword);
      setPasswordOpen(false);
      setPasswordTarget(null);
      setNextPassword("");
      setConfirmPassword("");
      pushToast(`Password updated for ${passwordTarget.email}`, "success");
      await load();
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Failed to update password";
      setPasswordError(message);
      pushToast(message, "error");
    } finally {
      setUpdatingPassword(false);
    }
  }

  const filtered = useMemo(() => {
    let list = [...admins];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (u) =>
          (u.email || "").toLowerCase().includes(q) ||
          (u.username || "").toLowerCase().includes(q) ||
          (u.companyName || "").toLowerCase().includes(q)
      );
    }
    if (roleFilter) list = list.filter((u) => u.role === roleFilter);
    if (statusFilter) {
      list = list.filter((u) =>
        statusFilter === "blocked" ? !!u.isBlocked : !u.isBlocked
      );
    }
    return list;
  }, [admins, search, roleFilter, statusFilter]);

  const columns = useMemo<ColumnDef<AdminUser>[]>(
    () => [
      {
        id: "email",
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {row.original.email}
          </Typography>
        ),
      },
      {
        id: "username",
        accessorFn: (row) => row.username || "",
        header: "Username",
        cell: ({ row }) => row.original.username || "-",
      },
      {
        id: "company",
        accessorFn: (row) => row.companyName || "",
        header: "Company",
        cell: ({ row }) => row.original.companyName || "-",
      },
      {
        id: "roleRank",
        accessorFn: (row) => (row.role === "superadmin" ? 0 : row.role === "admin" ? 1 : 2),
        header: "Role",
        cell: ({ row }) => (
          <Chip
            size="small"
            label={row.original.role}
            color={row.original.role === "superadmin" ? "warning" : "secondary"}
            variant="outlined"
          />
        ),
      },
      {
        id: "status",
        accessorFn: (row) => (row.isBlocked ? "blocked" : "active"),
        header: "Status",
        cell: ({ row }) => (
          <Typography variant="body2" color={row.original.isBlocked ? "error.main" : "success.main"}>
            {row.original.isBlocked ? "Blocked" : "Active"}
          </Typography>
        ),
      },
      {
        id: "createdAt",
        accessorFn: (row) => (row.createdAt ? new Date(row.createdAt).getTime() : 0),
        header: "Created",
        cell: ({ row }) => (row.original.createdAt ? new Date(row.original.createdAt).toLocaleString() : "-"),
      },
      {
        id: "actions",
        enableSorting: false,
        header: "Actions",
        cell: ({ row }) => {
          const u = row.original;
          return (
            <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="flex-end">
              <Button
                size="small"
                variant="outlined"
                onClick={() => openPasswordModal(u)}
              >
                Password
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                disabled={u.role === "superadmin"}
                onClick={() => openBlock(u)}
              >
                {u.isBlocked ? "Unblock" : "Block"}
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                disabled={u.role === "superadmin"}
                onClick={() => openDelete(u)}
              >
                Delete
              </Button>
            </Stack>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = table.getRowModel().rows;

  return (
    <div className="admin-page-shell">
      <header className="sticky top-0 z-10 admin-glass-surface rounded-2xl shadow-[0_18px_42px_rgba(15,23,42,0.14)]">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-rose-500 shadow-[0_12px_24px_rgba(244,63,94,0.28)] ring-1 ring-rose-300 flex items-center justify-center text-white font-bold">
              CV
            </div>
            <div>
              <div className="text-sm text-gray-500">Asset Insight</div>
              <div className="font-semibold text-gray-900">
                Admin Management
              </div>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="shrink-0 px-3 sm:px-4 py-2 rounded-lg border border-rose-300 text-rose-700 bg-white hover:bg-rose-50 active:bg-rose-100 shadow-sm hover:shadow transition-all text-sm sm:text-base"
          >
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Dashboard</span>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto pt-3 space-y-3">
        <section className="admin-glass-surface rounded-2xl p-3 md:p-4 shadow-[0_22px_54px_rgba(15,23,42,0.14)]">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(260px,1fr)_auto] gap-3 xl:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl md:text-2xl font-semibold text-gray-900 leading-tight">
                  Admin Management
                </h1>
                <Chip size="small" color="secondary" variant="outlined" label={`${rows.length} filtered`} />
              </div>
              <p className="mt-1 text-sm text-gray-600">
                Create accounts, manage access, and review admin status from one compact console.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                ["Total", admins.length],
                ["Superadmins", admins.filter((a) => a.role === "superadmin").length],
                ["Blocked", admins.filter((a) => a.isBlocked).length],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="min-w-[92px] rounded-xl border border-rose-200 bg-white/75 px-3 py-2 shadow-[0_14px_26px_rgba(190,18,60,0.10)]"
                >
                  <div className="text-[11px] font-medium text-gray-600 leading-none">{label}</div>
                  <div className="mt-1 text-lg font-semibold text-gray-900 tabular-nums leading-none">
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 lg:grid-cols-[minmax(280px,1fr)_160px_160px_auto] gap-2 items-center">
            <div>
              <TextField
                fullWidth
                size="small"
                label="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="email, username, or company"
              />
            </div>
            <div>
              <FormControl fullWidth size="small">
                <InputLabel>Role</InputLabel>
                <Select value={roleFilter} label="Role" onChange={(e) => setRoleFilter(e.target.value)}>
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="superadmin">Superadmin</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>
            </div>
            <div>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="blocked">Blocked</MenuItem>
                </Select>
              </FormControl>
            </div>
            <button
              onClick={() => setCreateOpen(true)}
              className="cursor-pointer inline-flex min-h-10 items-center justify-center gap-2 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-medium shadow-[0_14px_28px_rgba(244,63,94,0.26)] hover:shadow-[0_18px_34px_rgba(244,63,94,0.32)] active:shadow-sm transition-all"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Admin
            </button>
          </div>
          <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <Typography variant="caption" color="text.secondary">
              Sort by clicking any desktop table header.
            </Typography>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                {error}
              </p>
            )}
          </div>
        </section>

        {/* List Admins */}
        <section className="admin-glass-surface rounded-2xl p-3 md:p-4 shadow-[0_22px_54px_rgba(15,23,42,0.14)]">
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" sx={{ mb: 1.5 }}>
            <Typography variant="h6" fontWeight={700}>Admins</Typography>
            <Chip size="small" color="secondary" variant="outlined" label={`${rows.length} filtered`} />
          </Stack>
          {loading ? (
            <Typography color="text.secondary">Loading...</Typography>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            <>
              <TableContainer
                sx={{
                  display: { xs: "none", md: "block" },
                  maxHeight: "calc(100vh - 318px)",
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Table size="small" sx={{ minWidth: 760 }}>
                  <TableHead>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableCell
                            key={header.id}
                            align={header.column.id === "actions" ? "right" : "left"}
                            sx={{ fontWeight: 800, py: 1, bgcolor: "background.paper", position: "sticky", top: 0, zIndex: 1 }}
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
                        <TableRow key={row.id} hover>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id} align={cell.column.id === "actions" ? "right" : "left"} sx={{ py: 0.9 }}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length}>
                          <Typography color="text.secondary">No admins match the current filters.</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <Stack spacing={1.25} sx={{ display: { xs: "flex", md: "none" } }}>
                {rows.length ? (
                  rows.map((row) => {
                    const u = row.original;
                    return (
                      <Card
                        key={u._id}
                        variant="outlined"
                        sx={{
                          borderRadius: 2,
                          boxShadow: "0 14px 30px rgba(15, 23, 42, 0.10)",
                        }}
                      >
                        <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                          <Stack spacing={1.25}>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
                              <Stack spacing={0.5} minWidth={0}>
                                <Typography variant="subtitle2" sx={{ wordBreak: "break-word" }}>
                                  {u.email}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {u.username || "-"}
                                </Typography>
                              </Stack>
                              <Chip
                                size="small"
                                label={u.role}
                                color={u.role === "superadmin" ? "warning" : "secondary"}
                                variant="outlined"
                              />
                            </Stack>
                            <Grid container spacing={1}>
                              <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" color="text.secondary">Company</Typography>
                                <Typography variant="body2">{u.companyName || "-"}</Typography>
                              </Grid>
                              <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="caption" color="text.secondary">Status</Typography>
                                <Typography variant="body2" color={u.isBlocked ? "error.main" : "success.main"}>
                                  {u.isBlocked ? "Blocked" : "Active"}
                                </Typography>
                              </Grid>
                              <Grid size={{ xs: 12 }}>
                                <Typography variant="caption" color="text.secondary">Created</Typography>
                                <Typography variant="body2">
                                  {u.createdAt ? new Date(u.createdAt).toLocaleString() : "-"}
                                </Typography>
                              </Grid>
                            </Grid>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ alignItems: "center" }}>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => openPasswordModal(u)}
                              >
                                Password
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="secondary"
                                disabled={u.role === "superadmin"}
                                onClick={() => openBlock(u)}
                              >
                                {u.isBlocked ? "Unblock" : "Block"}
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                disabled={u.role === "superadmin"}
                                onClick={() => openDelete(u)}
                              >
                                Delete
                              </Button>
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <Card variant="outlined">
                    <CardContent>
                      <Typography color="text.secondary">No admins match the current filters.</Typography>
                    </CardContent>
                  </Card>
                )}
              </Stack>
            </>
          )}
        </section>
      </main>

      {/* Create Admin Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Admin"
        maxWidthClass="max-w-xl"
        footer={
          <>
            <button
              onClick={() => setCreateOpen(false)}
              className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 active:bg-gray-100 shadow-sm hover:shadow transition-all"
            >
              Cancel
            </button>
            <button
              form="create-admin-form"
              type="submit"
              disabled={creating}
              className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-medium shadow-md hover:shadow-lg active:shadow-sm transition-all"
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </>
        }
      >
        <form
          id="create-admin-form"
          onSubmit={onCreate}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              type="email"
              className="mt-1 w-full rounded-xl border border-gray-300 hover:border-gray-400 focus:border-rose-400 focus:ring-rose-400 shadow-sm px-3 py-2.5"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Username (optional)
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              type="text"
              className="mt-1 w-full rounded-xl border border-gray-300 hover:border-gray-400 focus:border-rose-400 focus:ring-rose-400 shadow-sm px-3 py-2.5"
              placeholder="admin"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Temporary Password (optional)
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="text"
              className="mt-1 w-full rounded-xl border border-gray-300 hover:border-gray-400 focus:border-rose-400 focus:ring-rose-400 shadow-sm px-3 py-2.5"
              placeholder="auto-generated if blank"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Company (optional)
            </label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              type="text"
              className="mt-1 w-full rounded-xl border border-gray-300 hover:border-gray-400 focus:border-rose-400 focus:ring-rose-400 shadow-sm px-3 py-2.5"
              placeholder="Company"
            />
          </div>
        </form>
        {error && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
            {error}
          </p>
        )}
      </Modal>

      <Modal
        open={passwordOpen}
        onClose={() => {
          setPasswordOpen(false);
          setPasswordTarget(null);
          setNextPassword("");
          setConfirmPassword("");
          setPasswordError(null);
        }}
        title={
          passwordTarget?.role === "superadmin"
            ? "Change Superadmin Password"
            : "Change Admin Password"
        }
        maxWidthClass="max-w-lg"
        footer={
          <>
            <button
              onClick={() => {
                setPasswordOpen(false);
                setPasswordTarget(null);
                setNextPassword("");
                setConfirmPassword("");
                setPasswordError(null);
              }}
              className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 active:bg-gray-100 shadow-sm hover:shadow transition-all"
            >
              Cancel
            </button>
            <button
              form="change-admin-password-form"
              type="submit"
              disabled={updatingPassword}
              className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-medium shadow-md hover:shadow-lg active:shadow-sm transition-all disabled:opacity-60"
            >
              {updatingPassword ? "Saving..." : "Update Password"}
            </button>
          </>
        }
      >
        <form
          id="change-admin-password-form"
          onSubmit={onPasswordSubmit}
          className="grid grid-cols-1 gap-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Account
            </label>
            <div className="mt-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
              {passwordTarget?.email || "-"}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              New Password
            </label>
            <input
              value={nextPassword}
              onChange={(e) => setNextPassword(e.target.value)}
              required
              minLength={6}
              type="password"
              className="mt-1 w-full rounded-xl border border-gray-300 hover:border-gray-400 focus:border-rose-400 focus:ring-rose-400 shadow-sm px-3 py-2.5"
              placeholder="At least 6 characters"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Confirm Password
            </label>
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              type="password"
              className="mt-1 w-full rounded-xl border border-gray-300 hover:border-gray-400 focus:border-rose-400 focus:ring-rose-400 shadow-sm px-3 py-2.5"
              placeholder="Re-enter the password"
            />
          </div>
        </form>
        {passwordError && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
            {passwordError}
          </p>
        )}
      </Modal>

      {/* Confirm Modal for block/delete */}
      <ConfirmModal
        open={confirmOpen}
        title={
          confirmType === "delete"
            ? "Delete this admin?"
            : targetUser?.isBlocked
            ? "Unblock this admin?"
            : "Block this admin?"
        }
        description={
          confirmType === "delete" ? (
            <>
              This action cannot be undone. The admin account will be
              permanently removed.
            </>
          ) : targetUser?.isBlocked ? (
            <>This will restore access for {targetUser?.email}.</>
          ) : (
            <>This will prevent {targetUser?.email} from signing in.</>
          )
        }
        confirmText={
          confirmType === "delete"
            ? "Delete"
            : targetUser?.isBlocked
            ? "Unblock"
            : "Block"
        }
        cancelText="Cancel"
        onConfirm={confirmAction}
        onCancel={() => {
          setConfirmOpen(false);
          setTargetUser(null);
        }}
        loading={processing}
      />

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-[90] space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-xl border px-4 py-3 shadow-md backdrop-blur ${
              t.type === "success"
                ? "bg-emerald-50/90 text-emerald-800 border-emerald-200"
                : t.type === "error"
                ? "bg-red-50/90 text-red-800 border-red-200"
                : "bg-sky-50/90 text-sky-800 border-sky-200"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
