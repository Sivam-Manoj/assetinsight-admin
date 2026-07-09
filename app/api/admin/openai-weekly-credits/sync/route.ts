import { type NextRequest } from "next/server";
import { proxyJsonWithAdminAuth } from "@/lib/adminProxy";

export async function POST(request: NextRequest) {
  return proxyJsonWithAdminAuth(request, "/api/admin/openai-weekly-credits/sync", {
    method: "POST",
  });
}
