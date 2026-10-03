"use client";

import { useEffect, useState } from "react";
import { dashboardDB } from "@/lib/dashboard";
import { useAppState } from "@/context/AppContext";
import { createClient } from "@/lib/supabase/client";
import { isSimulationMode } from "@/lib/supabase/mode";

const reportCategories = [
  { name: "Operational", module: "shipments", description: "Bookings, dispatch performance, on-time rate.", source: () => dashboardDB.bookings },
  { name: "Financial", module: "finance", description: "Revenue, expenses, receivables, VAT summary.", source: () => dashboardDB.invoices },
  { name: "HR", module: "hr", description: "Headcount, attendance, leave balances.", source: () => dashboardDB.employees },
  { name: "Fleet", module: "fleet", description: "Utilization, maintenance, fuel spend.", source: () => dashboardDB.fleet },
  { name: "Sales", module: "crm", description: "Pipeline, conversion, campaign performance.", source: () => dashboardDB.leads },
];

function exportReport(category: typeof reportCategories[number], rows: Record<string, unknown>[], format: "CSV" | "PDF" | "Excel", notify: (message: string) => void) {
  if (format !== "CSV") {
    notify(`${format} export for ${category.name} needs the real backend connected. Sample data has no PDF/Excel renderer in this prototype.`);
    return;
  }
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
  const { currentUser } = useAppState();
  const [reportRows, setReportRows] = useState<Record<string, Record<string, unknown>[]>>(() => Object.fromEntries(reportCategories.map((category) => [category.name, category.source() as unknown as Record<string, unknown>[]])));

  useEffect(() => {
    if (isSimulationMode()) return;
    queueMicrotask(() => {
      void (async () => {
        try {
          const modules = currentUser?.modules;
          const allowed = (module: string) => modules === "all" || Boolean(modules?.includes(module));
          const supabase = createClient();
          const [operational, invoices, expenses, employees, fleet, sales] = await Promise.all([
            allowed("shipments") ? supabase.from("bookings").select("tracking_no, customer_name, origin, destination, status, pickup_date") : Promise.resolve({ data: [], error: null }),
            allowed("finance") ? supabase.from("invoices").select("invoice_no, customer_name, amount, status, invoice_date") : Promise.resolve({ data: [], error: null }),
            allowed("finance") ? supabase.from("expenses").select("category, vendor, amount, expense_date, status") : Promise.resolve({ data: [], error: null }),
            allowed("hr") ? supabase.from("employees").select("name, department, role_title, status, hired_year") : Promise.resolve({ data: [], error: null }),
            allowed("fleet") ? supabase.from("fleet_vehicles").select("plate, type, status, next_service_date, fuel_liters, insurer") : Promise.resolve({ data: [], error: null }),
            allowed("crm") ? supabase.from("leads").select("company, contact_name, email, phone, priority, status, assigned_to, value, created_at") : Promise.resolve({ data: [], error: null }),
          ]);
          const error = operational.error || invoices.error || expenses.error || employees.error || fleet.error || sales.error;
          if (error) throw error;
          const financialRows = [...(invoices.data || []).map((row) => ({ ...row, record_type: "Invoice" })), ...(expenses.data || []).map((row) => ({ ...row, record_type: "Expense" }))];
          setReportRows({ Operational: operational.data || [], Financial: financialRows, HR: employees.data || [], Fleet: fleet.data || [], Sales: sales.data || [] });
        } catch (error) {
          setNotice(error instanceof Error ? error.message : "Could not load reports");
        }
      })();
    });
  }, [currentUser?.modules]);

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
          {(["CSV", "PDF", "Excel"] as const).map((format) => <button className="btn btn-sm" type="button" key={format} onClick={() => exportReport(category, reportRows[category.name] || [], format, setNotice)}>{format}</button>)}
        </div>
      </div>)}
    </div>
    {notice && <div className="toast-wrap"><div className="toast" role="status">{notice}</div></div>}
  </>;
}