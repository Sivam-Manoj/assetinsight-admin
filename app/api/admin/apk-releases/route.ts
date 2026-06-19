import { NextResponse, type NextRequest } from "next/server";
import { SERVER_URL } from "@/lib/api";
import { proxyJsonWithAdminAuth } from "@/lib/adminProxy";

function setAccessCookie(resp: NextResponse, token: string) {
  resp.cookies.set("cv_admin", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 60,
  });
}

async function tryRefresh(request: NextRequest): Promise<string | null> {
  try {
    const url = new URL("/api/admin/refresh", request.url);
    const res = await fetch(url, { method: "POST", cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({}));
    return (data?.accessToken as string) || null;
  } catch {
    return null;
  }
}

async function forwardUpload(request: Request, token: string) {
  const formData = await request.formData();
  return fetch(`${SERVER_URL}/api/admin/apk-releases`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
    cache: "no-store",
  });
}

export async function GET(request: NextRequest) {
  return proxyJsonWithAdminAuth(request, "/api/admin/apk-releases");
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get("cv_admin")?.value;
  if (!token) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const retryRequest = request.clone();
  let res = await forwardUpload(request, token);
  if (res.status !== 401) {
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  }

  const newToken = await tryRefresh(request);
  if (!newToken) {
    const data = await res.json().catch(() => ({ message: "Unauthorized" }));
    return NextResponse.json(data, { status: 401 });
  }

  res = await forwardUpload(retryRequest, newToken);
  const data = await res.json().catch(() => ({}));
  const response = NextResponse.json(data, { status: res.status });
  setAccessCookie(response, newToken);
  return response;
}
