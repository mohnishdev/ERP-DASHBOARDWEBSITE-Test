"use client";

import { useEffect, useState } from "react";
import { dashboardDB } from "@/lib/dashboard";

const reportCategories = [
  { name: "Operational", description: "Bookings, dispatch performance, on-time rate.", source: () => dashboardDB.bookings },
  { name: "Financial", description: "Revenue, expenses, receivables, VAT summary.", source: () => dashboardDB.invoices },
  { name: "HR", description: "Headcount, attendance, leave balances.", source: () => dashboardDB.employees },
  { name: "Fleet", description: "Utilization, maintenance, fuel spend.", source: () => dashboardDB.fleet },
  { name: "Sales", description: "Pipeline, conversion, campaign performance.", source: () => dashboardDB.leads },
];

function exportReport(category: typeof reportCategories[number], format: "CSV" | "PDF" | "Excel", notify: (message: string) => void) {
  if (format !== "CSV") {
    notify(`${format} export for ${category.name} needs the real backend connected. Sample data has no PDF/Excel renderer in this prototype.`);
    return;
  }
  const rows = category.source() as unknown as Record<string, unknown>[];
  if (!rows.length) { notify(`No ${category.name.toLowerCase()} data to export`); return; }
  const headers = Object.keys(rows[0]).filter((key) => typeof rows[0][key] !== "object");
  const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => {
    const value = String(row[header] ?? "").replace(/"/g, '""');
    return /[",\n]/.test(value) ? `"${value}"` : value;
  }).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${category.name.toLowerCase()}-report.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function Reports() {
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  return <>
    <div className="view-head"><div><h1>Reports</h1><p>Operational, financial, HR, fleet and sales exports.</p></div></div>
    <div className="grid g-3">
      {reportCategories.map((category) => <div className="card" key={category.name}>
        <div className="card-title" style={{ marginBottom: 6 }}>{category.name}</div>
        <p style={{ color: "var(--text-dim)", fontSize: 12.3, margin: "0 0 14px" }}>{category.description}</p>
        <div className="row-actions">
          {(["CSV", "PDF", "Excel"] as const).map((format) => <button className="btn btn-sm" type="button" key={format} onClick={() => exportReport(category, format, setNotice)}>{format}</button>)}
        </div>
      </div>)}
    </div>
    {notice && <div className="toast-wrap"><div className="toast" role="status">{notice}</div></div>}
  </>;
}