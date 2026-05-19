import AdminNavbarV2 from "@/app/components/common/AdminNavbarV2";
import AdminApiKeys from "@/app/components/admin/AdminApiKeys";
import { SERVER_URL } from "@/lib/api";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Page() {
  const token = (await cookies()).get("cv_admin")?.value;
  if (!token) redirect("/login");

  const res = await fetch(`${SERVER_URL}/api/admin/me`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) redirect("/login");

  const data: { user?: { role?: string } } = await res
    .json()
    .catch(() => ({} as { user?: { role?: string } }));
  const role = data?.user?.role;
  if (role !== "admin" && role !== "superadmin") redirect("/reports");

  return (
    <AdminNavbarV2>
      <AdminApiKeys />
    </AdminNavbarV2>
  );
}
