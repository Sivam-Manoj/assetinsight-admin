import Link from "next/link";

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";

const endpoints = [
  ["GET", "/api/v1/assets", "List approved asset report summaries"],
  ["GET", "/api/v1/assets/:id", "Get one approved asset report with full lots and files"],
  ["GET", "/api/v1/assets/:id/lots", "List lots for one approved asset report"],
  ["GET", "/api/v1/assets/:id/lots/:lotId", "Get one lot by lot_id or lot_number"],
  ["GET", "/api/v1/lot-listings", "List approved lot listing summaries"],
  ["GET", "/api/v1/lot-listings/:id", "Get one approved lot listing with full lots and files"],
  ["GET", "/api/v1/lot-listings/:id/lots", "List lots for one approved lot listing"],
  ["GET", "/api/v1/lot-listings/:id/lots/:lotId", "Get one lot listing lot by lot_id or lot_number"],
  ["GET", "/api/v1/lots?source=asset|lot-listing", "List lots across approved records"],
] as const;

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-100">
      <code>{children}</code>
    </pre>
  );
}

export default function ApiDocumentationPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto max-w-5xl px-5 py-10 md:py-14">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
              Asset Insight API
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-normal md:text-5xl">
              API Documentation
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              Use read-only API keys to access approved asset reports, approved lot listings,
              and their lot details from server-side integrations.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-100"
          >
            Admin login
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Base URL</div>
            <div className="mt-2 break-all font-mono text-sm">{SERVER_URL}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Auth</div>
            <div className="mt-2 font-mono text-sm">Authorization: Bearer cvak_...</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Access</div>
            <div className="mt-2 text-sm">Approved assets and approved lot listings only</div>
          </div>
        </div>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-bold">Authentication</h2>
          <p className="text-slate-600">
            Send the API key from a backend service. Do not expose API keys in browser,
            mobile, or public client code.
          </p>
          <CodeBlock>{`curl "${SERVER_URL}/api/v1/assets?limit=10" \\
  -H "Authorization: Bearer cvak_your_key_here"`}</CodeBlock>
          <p className="text-sm text-slate-600">
            You can also send the key as <code className="rounded bg-slate-200 px-1">x-api-key</code>.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-bold">Endpoints</h2>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Path</th>
                  <th className="px-4 py-3">Description</th>
                </tr>
              </thead>
              <tbody>
                {endpoints.map(([method, path, description]) => (
                  <tr key={path} className="border-t border-slate-200">
                    <td className="px-4 py-3 font-mono font-semibold text-blue-700">{method}</td>
                    <td className="px-4 py-3 font-mono">{path}</td>
                    <td className="px-4 py-3 text-slate-600">{description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Query Parameters</h2>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <ul className="space-y-3 text-sm text-slate-700">
                <li><code>page</code>: defaults to 1.</li>
                <li><code>limit</code>: defaults to 25, maximum 100.</li>
                <li><code>q</code>: text search for report, lot, contract, and location fields.</li>
                <li><code>from</code> and <code>to</code>: filter by created date.</li>
                <li><code>updatedAfter</code>: filter by update date.</li>
                <li><code>contractNo</code>: filter by contract number.</li>
                <li><code>source</code>: only on <code>/api/v1/lots</code>, accepts <code>asset</code> or <code>lot-listing</code>.</li>
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Errors</h2>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <ul className="space-y-3 text-sm text-slate-700">
                <li><code>401 missing_api_key</code>: no key was sent.</li>
                <li><code>401 invalid_api_key</code>: key is malformed or unknown.</li>
                <li><code>403 revoked_api_key</code>: key has been revoked.</li>
                <li><code>429 rate_limited</code>: key exceeded the request limit.</li>
                <li><code>404 not_found</code>: approved record or lot was not found.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-bold">Response Shape</h2>
          <CodeBlock>{`{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 0,
    "totalPages": 0
  }
}`}</CodeBlock>
          <CodeBlock>{`{
  "error": {
    "code": "invalid_api_key",
    "message": "Invalid API key"
  }
}`}</CodeBlock>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-bold">JavaScript Example</h2>
          <CodeBlock>{`const res = await fetch("${SERVER_URL}/api/v1/lot-listings?limit=25", {
  headers: {
    Authorization: "Bearer cvak_your_key_here"
  }
});

if (!res.ok) {
  throw new Error(await res.text());
}

const payload = await res.json();`}</CodeBlock>
        </section>
      </section>
    </main>
  );
}
