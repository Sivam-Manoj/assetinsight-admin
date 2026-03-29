"use client";

import type { ReactNode } from "react";
import Modal from "@/app/components/common/Modal";

export type ReportPreviewField = {
  label: string;
  value: string;
};

export type ReportPreviewPayload = {
  title: string;
  meta: ReportPreviewField[];
  data: Record<string, unknown>;
  variant?: "scheduleA";
  currencyCode?: string;
  scheduleRows?: Array<{
    lot_number_display: string;
    lot_heading: string;
    title: string;
    serial_or_vin: string;
    description: string;
    condition: string;
    estimated_value: string;
    section_estimated_value: string;
    image_url?: string;
  }>;
};

type ReportPreviewModalProps = {
  open: boolean;
  loading: boolean;
  error: string | null;
  preview: ReportPreviewPayload | null;
  onClose: () => void;
};

function formatLabel(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatPrimitive(value: string | number | boolean) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function isUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function renderValue(value: unknown, depth = 0): ReactNode {
  if (value === null || value === undefined || value === "") {
    return <span className="text-sm text-gray-400">-</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-sm text-gray-400">No items</span>;

    const primitives = value.every(
      (item) =>
        item === null ||
        item === undefined ||
        typeof item === "string" ||
        typeof item === "number" ||
        typeof item === "boolean"
    );

    if (primitives) {
      return (
        <div className="flex flex-wrap gap-2">
          {value.map((item, index) => (
            <span
              key={`${depth}-${index}-${String(item)}`}
              className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800"
            >
              {item === null || item === undefined || item === "" ? "-" : formatPrimitive(item as string | number | boolean)}
            </span>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {value.map((item, index) => (
          <div key={`${depth}-${index}`} className="rounded-2xl border border-gray-200 bg-gray-50/80 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
              Item {index + 1}
            </div>
            {renderValue(item, depth + 1)}
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return <span className="text-sm text-gray-400">No data</span>;

    return (
      <div className={`grid gap-3 ${depth === 0 ? "md:grid-cols-2" : "grid-cols-1"}`}>
        {entries.map(([key, nestedValue]) => (
          <section key={`${depth}-${key}`} className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
              {formatLabel(key)}
            </div>
            {renderValue(nestedValue, depth + 1)}
          </section>
        ))}
      </div>
    );
  }

  if (typeof value === "string" && isUrl(value)) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-sm font-medium text-sky-700 underline decoration-sky-300 underline-offset-2"
      >
        {value}
      </a>
    );
  }

  return <div className="whitespace-pre-wrap break-words text-sm text-gray-800">{formatPrimitive(value as string | number | boolean)}</div>;
}

function renderScheduleA(preview: ReportPreviewPayload) {
  const rows = Array.isArray(preview.scheduleRows) ? preview.scheduleRows : [];
  const currencyCode = preview.currencyCode || "CAD";

  if (!rows.length) {
    return <div className="py-10 text-center text-sm text-gray-500">No Schedule A rows available.</div>;
  }

  return (
    <div className="space-y-6 px-4 py-5 md:px-8 md:py-6">
      <div className="rounded-3xl border border-sky-100 bg-white px-5 py-4 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Schedule A</div>
        <h2 className="mt-1 text-xl font-semibold text-gray-900">{preview.title}</h2>
      </div>

      {rows.map((row, index) => (
        <section key={`${row.lot_number_display}-${row.lot_heading}-${index}`} className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-slate-900 px-5 py-3 text-sm font-semibold text-white">
            Lot - {row.lot_number_display} - {row.lot_heading}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full border-collapse">
              <thead>
                <tr className="bg-sky-50 text-xs uppercase tracking-[0.14em] text-slate-700">
                  <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold">Title</th>
                  <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold">SN/VIN</th>
                  <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold">Description</th>
                  <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold">Condition</th>
                  <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold">
                    <div>Est. Value</div>
                    <div className="mt-1 text-[11px] font-semibold normal-case tracking-normal text-slate-500">
                      ({currencyCode}) {row.section_estimated_value}
                    </div>
                  </th>
                  <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold">Image</th>
                </tr>
              </thead>
              <tbody>
                <tr className="align-top">
                  <td className="border-b border-gray-100 px-4 py-4 text-sm font-semibold text-gray-900">{row.title}</td>
                  <td className="border-b border-gray-100 px-4 py-4 text-sm text-gray-700">{row.serial_or_vin}</td>
                  <td className="border-b border-gray-100 px-4 py-4 text-sm text-gray-700">{row.description}</td>
                  <td className="border-b border-gray-100 px-4 py-4 text-sm text-gray-700">{row.condition}</td>
                  <td className="border-b border-gray-100 px-4 py-4 text-sm font-semibold text-gray-900">{row.estimated_value}</td>
                  <td className="border-b border-gray-100 px-4 py-4">
                    {row.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.image_url}
                        alt={row.title}
                        className="h-20 w-28 rounded-xl border border-gray-200 object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-28 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-400">
                        No Image
                      </div>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

export default function ReportPreviewModal({
  open,
  loading,
  error,
  preview,
  onClose,
}: ReportPreviewModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={preview?.variant === "scheduleA" ? "Schedule A Preview" : preview?.title || "Report Data"}
      maxWidthClass="max-w-6xl"
      fullScreen
      footer={
        <button
          onClick={onClose}
          className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow"
        >
          Close
        </button>
      }
    >
      {loading ? (
        <div className="py-10 text-center text-sm text-gray-500">Loading report data...</div>
      ) : error ? (
        <div className="m-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : preview ? (
        preview.variant === "scheduleA" ? (
          renderScheduleA(preview)
        ) : (
          <div className="space-y-5 p-4 md:p-6">
            {preview.meta.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-3">
                {preview.meta.map((field) => (
                  <div key={`${field.label}-${field.value}`} className="rounded-2xl border border-sky-100 bg-sky-50/70 p-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">{field.label}</div>
                    <div className="mt-1 break-words text-sm font-medium text-gray-900">{field.value}</div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="rounded-3xl border border-gray-200 bg-gray-50/60 p-4">
              <div className="mb-3 text-sm font-semibold text-gray-900">Report Data</div>
              {renderValue(preview.data)}
            </div>
          </div>
        )
      ) : (
        <div className="py-10 text-center text-sm text-gray-500">No report data available.</div>
      )}
    </Modal>
  );
}
