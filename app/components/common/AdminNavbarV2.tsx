"use client";

import {
  BarChart3,
  CheckCircle2,
  FileCheck2,
  FileClock,
  Grid2X2,
  Headphones,
  KeyRound,
  ListChecks,
  LogOut,
  Menu,
  MonitorSmartphone,
  Search,
  Shield,
  Smartphone,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ThemeModeToggle from "@/app/components/common/ThemeModeToggle";
import { ADMIN_MOBILE_TITLEBAR_HEIGHT } from "@/app/components/common/adminLayout.constants";

const SIDEBAR_WIDTH = 208;
const MOBILE_DRAWER_WIDTH = 280;

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
};

type AdminProfile = {
  role?: string;
  email?: string;
  username?: string;
  companyName?: string;
} | null;

export default function AdminNavbarV2({ children }: { children?: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<AdminProfile>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [deviceRequestCount, setDeviceRequestCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        let response = await fetch("/api/admin/me", { cache: "no-store" });
        if (response.status === 401) {
          const refresh = await fetch("/api/admin/refresh", { method: "POST", cache: "no-store" });
          if (refresh.ok) response = await fetch("/api/admin/me", { cache: "no-store" });
        }
        if (!response.ok || !mounted) return;
        const payload = await response.json().catch(() => ({}));
        if (mounted) setProfile(payload?.user || null);
      } catch {
        // Route protection handles an expired session.
      }
    })();

    const intervalId = window.setInterval(() => {
      fetch("/api/admin/refresh", { method: "POST", cache: "no-store" }).catch(() => undefined);
    }, 20 * 60 * 1000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  const role = profile?.role || null;
  const roleLabel = role === "superadmin" ? "superadmin" : role === "admin" ? "admin" : role === "user" ? "user" : "loading";
  const displayName = profile?.username || profile?.companyName || profile?.email || "Administrator";
  const homeHref = role === "superadmin" || role === "admin" ? "/dashboard" : "/reports";

  useEffect(() => {
    if (role !== "admin" && role !== "superadmin") return;
    let active = true;
    const loadCount = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch("/api/admin/devices/summary", { cache: "no-store" });
        if (!response.ok || !active) return;
        const body = await response.json().catch(() => ({}));
        if (active) setDeviceRequestCount(Number(body?.summary?.requests || 0));
      } catch {
        // The Devices page will surface actionable API errors.
      }
    };
    void loadCount();
    const interval = window.setInterval(loadCount, 30_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [role]);

  const items = useMemo<NavItem[]>(() => {
    if (role === "user") return [{ href: "/reports", label: "Approved Reports", icon: FileCheck2 }];
    if (role !== "superadmin" && role !== "admin") return [];

    return [
      { href: "/dashboard", label: "Dashboard", icon: Grid2X2 },
      { href: "/preview-reports", label: "Preview Reports", icon: FileClock },
      { href: "/reports", label: "Approved Reports", icon: FileCheck2 },
      { href: "/users", label: "Users", icon: Users },
      {
        href: "/devices",
        label: "Devices",
        icon: MonitorSmartphone,
        badge: deviceRequestCount,
      },
      ...(role === "superadmin" ? [{ href: "/admins", label: "Admins", icon: Shield }] : []),
      { href: "/crm", label: "CRM", icon: Headphones },
      { href: "/spec-sheet", label: "CR Management", icon: ListChecks },
      { href: "/revenue-radar", label: "Revenue Radar", icon: BarChart3 },
      { href: "/approvals", label: "Released Appraisals", icon: CheckCircle2 },
      { href: "/apk-manager", label: "APK Manager", icon: Smartphone },
      { href: "/api", label: "API", icon: KeyRound },
    ];
  }, [deviceRequestCount, role]);

  const filteredItems = useMemo(() => {
    const normalized = searchValue.trim().toLowerCase();
    return normalized ? items.filter((item) => item.label.toLowerCase().includes(normalized)) : items;
  }, [items, searchValue]);

  async function onLogout() {
    try {
      setLoggingOut(true);
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  const sidebarContent = (mobile = false) => (
    <Box sx={{ display: "flex", height: "100%", flexDirection: "column", bgcolor: "#111211", color: "#fff" }}>
      <Box sx={{ display: "flex", minHeight: 84, alignItems: "center", justifyContent: "space-between", px: 2.5 }}>
        <Link href={homeHref} aria-label="Asset Insight home" style={{ display: "flex", alignItems: "center" }}>
          <Box sx={{ position: "relative", width: 128, height: 58 }}>
            <Image
              src="/logo.png"
              alt="Asset Insight"
              fill
              sizes="128px"
              priority
              style={{ objectFit: "contain", filter: "invert(1) hue-rotate(180deg) brightness(1.08)" }}
            />
          </Box>
        </Link>
        {mobile ? (
          <IconButton aria-label="Close navigation" onClick={() => setMobileOpen(false)} sx={{ color: "#d7d7d7" }}>
            <X size={20} />
          </IconButton>
        ) : null}
      </Box>

      <List component="nav" aria-label="Admin navigation" sx={{ flex: 1, overflow: "hidden", px: 1, py: 1 }}>
        {items.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <ListItemButton
              key={href}
              component={Link}
              href={href}
              selected={active}
              sx={{
                minHeight: 36,
                mb: 0.25,
                gap: 1.5,
                borderRadius: "3px",
                px: 1.5,
                py: 0.65,
                color: active ? "#fff" : "#d0d0d0",
                bgcolor: active ? "#df111b" : "transparent",
                "&.Mui-selected": { bgcolor: "#df111b", color: "#fff" },
                "&.Mui-selected:hover": { bgcolor: "#c90e17" },
                "&:hover": { bgcolor: active ? "#c90e17" : "rgba(255,255,255,0.07)", color: "#fff" },
              }}
            >
              <ListItemIcon sx={{ minWidth: 22, color: "inherit" }}>
                <Icon size={19} strokeWidth={2} />
              </ListItemIcon>
              <ListItemText primary={label} primaryTypographyProps={{ fontSize: 13.5, fontWeight: active ? 650 : 500, noWrap: true }} />
              {badge ? (
                <Box
                  component="span"
                  aria-label={`${badge} device requests`}
                  sx={{
                    display: "inline-grid",
                    minWidth: 20,
                    height: 20,
                    placeItems: "center",
                    borderRadius: "10px",
                    bgcolor: active ? "#fff" : "#df111b",
                    color: active ? "#df111b" : "#fff",
                    px: 0.65,
                    fontSize: 10.5,
                    fontWeight: 750,
                  }}
                >
                  {badge > 99 ? "99+" : badge}
                </Box>
              ) : null}
            </ListItemButton>
          );
        })}
      </List>

      <Box sx={{ borderTop: "1px solid #303230", p: 1 }}>
        <Box sx={{ display: "flex", minHeight: 48, alignItems: "center", gap: 1.5, px: 1, color: "#e6e6e6" }}>
          <Box sx={{ display: "grid", width: 32, height: 32, flexShrink: 0, placeItems: "center", bgcolor: "#272927", fontSize: 12, fontWeight: 700 }}>
            {displayName.slice(0, 2).toUpperCase()}
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography noWrap sx={{ fontSize: 13, fontWeight: 600, color: "#f3f3f3" }}>{displayName}</Typography>
            <Typography noWrap sx={{ fontSize: 11, color: "#777b77", textTransform: "lowercase" }}>{roleLabel}</Typography>
          </Box>
        </Box>
        <Stack direction="row" alignItems="center" spacing={0.25} sx={{ mt: 0.25 }}>
          <IconButton aria-label="Search navigation" onClick={() => setSearchOpen(true)} sx={{ width: 40, height: 40, color: "#c7c9c7", borderRadius: 0, "&:hover": { bgcolor: "rgba(255,255,255,0.07)", color: "#fff" } }}>
            <Search size={19} />
          </IconButton>
          <ThemeModeToggle variant="sidebar" />
          <IconButton aria-label="Logout" onClick={onLogout} disabled={loggingOut} sx={{ width: 40, height: 40, color: "#c7c9c7", borderRadius: 0, "&:hover": { bgcolor: "rgba(255,255,255,0.07)", color: "#fff" } }}>
            <LogOut size={19} />
          </IconButton>
        </Stack>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Box
        component="header"
        sx={{
          position: "fixed",
          inset: "0 0 auto 0",
          zIndex: (currentTheme) => currentTheme.zIndex.drawer + 2,
          display: { xs: "flex", lg: "none" },
          height: ADMIN_MOBILE_TITLEBAR_HEIGHT,
          alignItems: "center",
          borderBottom: "1px solid #454745",
          bgcolor: "#0c0d0c",
          color: "#fff",
          px: 1,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ width: "100%" }}>
          <IconButton aria-label="Open navigation menu" onClick={() => setMobileOpen(true)} sx={{ color: "#fff" }}>
            <Menu size={21} />
          </IconButton>
          <Typography sx={{ flex: 1, fontSize: 14, fontWeight: 600 }}>Asset Insight</Typography>
          <ThemeModeToggle variant="sidebar" />
        </Stack>
      </Box>

      <Box component="aside" sx={{ display: { xs: "none", lg: "block" }, position: "fixed", top: 0, bottom: 0, left: 0, zIndex: (currentTheme) => currentTheme.zIndex.drawer, width: SIDEBAR_WIDTH, borderRight: "1px solid #303230", overflow: "hidden" }}>
        {sidebarContent()}
      </Box>
      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        PaperProps={{ sx: { top: ADMIN_MOBILE_TITLEBAR_HEIGHT, width: MOBILE_DRAWER_WIDTH, height: `calc(100% - ${ADMIN_MOBILE_TITLEBAR_HEIGHT}px)`, border: 0 } }}
      >
        {sidebarContent(true)}
      </Drawer>

      <Box component="main" sx={{ ml: { xs: 0, lg: `${SIDEBAR_WIDTH}px` }, pt: { xs: `${ADMIN_MOBILE_TITLEBAR_HEIGHT}px`, lg: 0 }, minWidth: 0, maxWidth: "100%", minHeight: "100vh", overflowX: "hidden" }}>
        {children}
      </Box>

      <Dialog open={searchOpen} onClose={() => setSearchOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ pb: 1, fontSize: 18, fontWeight: 650 }}>Navigate</DialogTitle>
        <DialogContent sx={{ pt: "8px !important" }}>
          <TextField
            autoFocus
            fullWidth
            size="small"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Go to a page..."
            InputProps={{ startAdornment: <InputAdornment position="start"><Search size={17} /></InputAdornment> }}
          />
          <List sx={{ mt: 1, px: 0 }}>
            {filteredItems.map(({ href, label, icon: Icon }) => (
              <ListItemButton key={href} onClick={() => { setSearchOpen(false); setSearchValue(""); router.push(href); }} sx={{ borderRadius: "3px" }}>
                <ListItemIcon sx={{ minWidth: 34 }}><Icon size={18} /></ListItemIcon>
                <ListItemText primary={label} />
              </ListItemButton>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
