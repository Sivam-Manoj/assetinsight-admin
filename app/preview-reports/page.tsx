import AdminNavbarV2 from "@/app/components/common/AdminNavbarV2";
import PreviewReportsPage from "@/app/components/preview-reports/PreviewReportsPage";
import { requireSuperadminPage } from "@/lib/requireSuperadminPage";

export default async function Page() {
  await requireSuperadminPage();

  return (
    <AdminNavbarV2>
      <PreviewReportsPage />
    </AdminNavbarV2>
  );
}
