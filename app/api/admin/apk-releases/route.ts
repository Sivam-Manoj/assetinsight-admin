import { NextResponse, type NextRequest } from "next/server";
import { SERVER_URL } from "@/lib/api";
import { proxyJsonWithAdminAuth } from "@/lib/adminProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeErrorMessage(text: string, fallback: string): string {
  if (!text) return fallback;
  const preMatch = text.match(/<pre>([\s\S]*?)<\/pre>/i);
  const body = preMatch?.[1] || text;
  return body
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500) || fallback;
}

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
    const res = await fetch(url, {
      method: "POST",
      cache: "no-store",
      headers: { cookie: request.headers.get("cookie") || "" },
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({}));
    return (data?.accessToken as string) || null;
  } catch {
    return null;
  }
}

async function forwardUpload(request: NextRequest, token: string) {
  const contentType = request.headers.get("content-type");
  if (!contentType?.includes("multipart/form-data")) {
    return new Response(JSON.stringify({ message: "Multipart APK upload is required" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  return fetch(`${SERVER_URL}/api/admin/apk-releases`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": contentType,
    },
    body: request.body,
    // Required by Node fetch when streaming a request body.
    duplex: "half",
    cache: "no-store",
  } as RequestInit & { duplex: "half" });
}

export async function GET(request: NextRequest) {
  return proxyJsonWithAdminAuth(request, "/api/admin/apk-releases");
}

export async function POST(request: NextRequest) {
  try {
    const existingToken = request.cookies.get("cv_admin")?.value;
    if (!existingToken) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

    // Refresh before streaming the upload. Once the request body is forwarded,
    // it cannot be replayed safely for a retry without buffering the whole APK.
    const refreshedToken = await tryRefresh(request);
    const token = refreshedToken || existingToken;
    const res = await forwardUpload(request, token);
    const text = await res.text();
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: normalizeErrorMessage(text, "Failed to upload APK") };
    }
    const response = NextResponse.json(data, { status: res.status });
    if (refreshedToken) setAccessCookie(response, refreshedToken);
    return response;
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to upload APK. Please try again." },
      { status: 502 }
    );
  }
}
