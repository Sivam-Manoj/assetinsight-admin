import { type NextRequest } from "next/server";
import { proxyJsonWithAdminAuth } from "@/lib/adminProxy";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.search || "";
  return proxyJsonWithAdminAuth(request, `/api/admin/openai-credits${search}`, {
    method: "GET",
  });
}
