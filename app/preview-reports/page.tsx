import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminNavbarV2 from "@/app/components/common/AdminNavbarV2";
import PreviewReportsPage from "@/app/components/preview-reports/PreviewReportsPage";
import { SERVER_URL } from "@/lib/api";

export default async function Page() {
  const token = (await cookies()).get("cv_admin")?.value;
  if (!token) redirect("/login");

  const response = await fetch(`${SERVER_URL}/api/admin/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) redirect("/login");

  const payload: { user?: { role?: string } } = await response.json().catch(() => ({}));
  if (!["admin", "superadmin"].includes(payload.user?.role || "")) redirect("/reports");

  return (
    <AdminNavbarV2>
      <PreviewReportsPage />
    </AdminNavbarV2>
  );
}
