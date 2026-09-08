# Asset Insight Admin

The production administration console for Asset Insight. It is a Next.js App Router application used by verified `admin` and `superadmin` accounts to manage reports, users, devices, CRM workflows, and approvals. Its Support page is a private requester experience: an administrator can contact the Asset Insight Developer team and can read only requests owned by the same account.

## Runtime architecture

```mermaid
flowchart LR
  Browser["Admin browser"] -->|"HTTPS + HttpOnly session cookies"| Next["Next.js admin app"]
  Next -->|"Bearer access token"| API["Asset Insight backend"]
  API --> Mongo[("MongoDB")]
  API --> R2["Cloudflare R2"]
```

Browser code calls same-origin route handlers under `/api/admin/*`; backend access and refresh tokens remain in HttpOnly cookies. The support workspace uses `/api/admin/support/*` as a strict, method-and-path allow-listed proxy to the ownership-scoped `/api/support/*` customer API. It does not expose the developer inbox, agent search, internal notes, assignments, priorities, activity, or todo APIs. Image and video bodies stream through the authenticated proxy to the backend, which validates and stores them in R2 before returning a renderable attachment.

## Environment

Create `.env.local` for local development or configure the same value in the production process environment:

```env
# Backend origin only; do not append /api.
NEXT_PUBLIC_SERVER_URL=http://127.0.0.1:4000

# Optional provider credentials used by existing image tooling.
HITPAW_API_KEY=
PICSART_API_KEY=
```

Never commit real credentials. The admin application does not need MongoDB or R2 credentials; those remain in the authenticated backend.

## Commands

Use Node.js 22 through 26 with npm 10 or 11. The local compatibility gate is
verified with Node.js 26.7 and npm 11.

```bash
npm ci
npm run dev
npm run lint
npx tsc --noEmit
npm run build
npm start
```

The support feature should be checked at desktop, tablet, portrait mobile, and landscape mobile widths. Only the request list and message timeline are intended to scroll; the document and reply composer remain fixed to the viewport.

## Report approvals

Both `admin` and `superadmin` can open Pending Approvals. Ordinary `user` accounts remain limited to their permitted reports; the backend authorizes every decision. Pending rows group sibling files by parent report, but review/approve/return actions use the actual row/artifact ID.

Real Estate and Salvage use **Approve & release**: successful approval publishes their complete current files without a second release step. Asset approval/release behavior is unchanged. Older already-approved Real Estate/Salvage reports that still have a pending release retain a **Legacy release** action; the UI never invents download readiness or rewrites existing records.

Processing/incomplete file sets cannot be approved. Approval errors remain visible and retain the row for review/retry. Pending/approve/return requests use the shared HttpOnly-cookie BFF, refreshing only on `401` and preserving genuine `403`/`409` responses. Focused policy tests: `node --test tests/report-approval-ui-policy.test.mjs`.

Canadian Salvage assessment v2 approval loads the current report revision before
showing mandatory evidence-limit acknowledgements and a review note. The BFF
forwards only `{salvageReviewAcknowledgement: {baseRevision, limitationCodes,
note}}`; the backend supplies reviewer identity/time and records the audit against
the approved artifact generation, not as a signature in existing files. A `409`
clears the checked limitations and note and requires a manual reload/re-review;
it never retries approval automatically. Legacy Salvage and other report families
retain their existing decisions. No new role or separate release step is added.

## Production deployment

Production runs as the `assetinsight-admin` PM2 application from `ecosystem.config.cjs`, normally as two cluster workers on port `3001` behind Nginx.

```bash
npm run deploy
```

The deploy command fast-forwards `main`, installs the lockfile exactly, builds Next.js, reloads only `assetinsight-admin`, and saves PM2 state. Run it from the production admin checkout after the intended commit is available on `origin/main`.

Post-deploy checks:

```bash
pm2 status assetinsight-admin
curl --fail --head http://127.0.0.1:3001/login
curl --fail --head https://admin.assetinsightvaluator.com/login
```

Then verify that the signed-in administrator sees only their own requests, can create a request, can retry a reply without duplication, and can upload and render one image and one video. Confirm that developer-only support routes remain unavailable through the admin proxy. Do not expose port `3001` publicly; Nginx is the public TLS boundary.

For support media, install the location in `ops/nginx/support-upload-location.conf` inside the admin HTTPS server block. It disables request buffering only for the authenticated raw-upload route and aligns the proxy timeout with the 15-minute application limit. Always run `nginx -t` before a graceful reload.

## Support workflow invariants

- Every support read or mutation is authorized by the backend's ownership-scoped customer support middleware and the authenticated User ID.
- A known conversation ID owned by another account must still return `404`.
- Internal developer notes are never returned by the customer message API.
- A stable `clientMessageId` is reused only while retrying the same logical reply.
- Attachments are not rendered or claimable until the backend verifies them as `ready`.
- Uploads use the server-mediated streaming endpoint; browser R2 credentials and bucket CORS are not required.
- New-request media is attached only after the initial request creates a conversation ID. A partial media failure must keep that request selected instead of creating a duplicate.
- Developer queue access is a separate backend capability and is not implied by `admin` or `superadmin` role membership.
- Public media URLs are bearer-like references and must not be written to application logs.
