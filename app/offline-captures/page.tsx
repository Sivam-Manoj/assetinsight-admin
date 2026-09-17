import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminNavbarV2 from "@/app/components/common/AdminNavbarV2";
import OfflineCapturesPage from "@/app/components/offline-captures/OfflineCapturesPage";
import { SERVER_URL } from "@/lib/api";

export const metadata = { title: "Offline Captures | Asset Insight Admin" };

export default async function Page() {
  const token = (await cookies()).get("cv_admin")?.value;
  if (!token) redirect("/login");
  const response = await fetch(`${SERVER_URL}/api/admin/me`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!response.ok) redirect("/login");
  const payload = await response.json().catch(() => ({}));
  if (payload.user?.role !== "admin" && payload.user?.role !== "superadmin") redirect("/reports");
  return <AdminNavbarV2><OfflineCapturesPage /></AdminNavbarV2>;
}
