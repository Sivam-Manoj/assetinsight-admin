const MAX_BODY_BYTES = 2_048;

export class PreviewResubmitRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PreviewResubmitRequestError";
    this.status = status;
  }
}

/** Cookie-authenticated, small, revision-only mutation. Never forward actor/data fields. */
export async function readPreviewResubmitRequest(request: Request): Promise<{ baseRevision: string }> {
  const fetchSite = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host")?.split(",", 1)[0]?.trim()
    || request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto")?.split(",", 1)[0]?.trim()
    || new URL(request.url).protocol.replace(/:$/, "");
  const expectedOrigin = host ? `${protocol}://${host}` : new URL(request.url).origin;
  if ((fetchSite && fetchSite !== "same-origin" && fetchSite !== "none")
    || (origin ? origin !== expectedOrigin : fetchSite !== "same-origin")) {
    throw new PreviewResubmitRequestError("This action must be requested from the admin application.", 403);
  }
  if (request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() !== "application/json") {
    throw new PreviewResubmitRequestError("A JSON request is required.", 415);
  }
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (!Number.isFinite(declaredLength) || declaredLength < 0 || declaredLength > MAX_BODY_BYTES) {
    throw new PreviewResubmitRequestError("The request is too large.", 413);
  }

  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BODY_BYTES) {
          await reader.cancel();
          throw new PreviewResubmitRequestError("The request is too large.", 413);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new PreviewResubmitRequestError("The request must contain valid JSON.", 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new PreviewResubmitRequestError("A saved preview revision is required.", 400);
  }
  const revision = (body as Record<string, unknown>).baseRevision;
  if (typeof revision !== "string" || !revision.trim() || revision.length > 512) {
    throw new PreviewResubmitRequestError("Reload and review the saved preview before resubmitting.", 400);
  }
  return { baseRevision: revision };
}
