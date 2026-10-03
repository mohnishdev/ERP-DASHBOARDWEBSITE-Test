"use client";

import { useCallback, useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import { AdminTable } from "./AdminTable";
import { computeFinance, dashboardDB, fmtNaira, invoiceSubtotal, invoiceVat, quoteTotal, type Expense, type Invoice, type Payroll, type PurchaseOrder, type Quotation } from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/client";
import { isSimulationMode } from "@/lib/supabase/mode";
import { persistSimulationState } from "@/lib/simulation-store";

const financeTabs = [
  ["overview", "Overview"],
  ["invoices", "Invoices"],
  ["expenses", "Expenses"],
  ["payroll", "Payroll"],
  ["purchase", "Purchase orders"],
  ["quotations", "Quotations"],
] as const;

const invoiceStatuses = ["Paid", "Pending", "Overdue"];
const expenseStatuses = ["Paid", "Unpaid"];
const poStatuses = ["Ordered", "Pending", "Received"];
const quotationStatuses = ["Pending", "Approved", "Declined"];

let nextInvoiceSequence = 410;

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function invoiceRows(invoice: Invoice) {
  return invoice.items.map((item) => [item.desc, fmtNaira(item.amount)]);
}

function DonutChart({ segments, size }: { segments: { value: number; color: string }[]; size: number }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1;
  const radius = size * 0.386;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  return <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size, flexShrink: 0 }} aria-label="Revenue allocation chart">
    {segments.map((segment, index) => {
      const dash = (segment.value / total) * circumference;
      const offset = segments.slice(0, index).reduce((sum, previous) => sum + (previous.value / total) * circumference, 0);
      return <circle key={segment.color} cx={center} cy={center} r={radius} fill="none" stroke={segment.color} strokeWidth={size * 0.136} strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-offset} transform={`rotate(-90 ${center} ${center})`} />;
    })}
  </svg>;
}

function InvoiceDocument({ invoice }: { invoice: Invoice }) {
  const vat = invoiceVat(invoice.amount);
  const subtotal = invoiceSubtotal(invoice.amount);
  const signedLine = invoice.status === "Paid" ? `Signed electronically, ${formatDate(invoice.paidDate || invoice.date)}` : "Received by";
  return <div className="doc" style={{ position: "relative" }}>
    <div className="doc-head"><div><img src="/legacy-assets/embedded_asset_1.png" alt="JAAD Logistics" style={{ height: 30 }} /></div><div className="co">JAAD Logistics Ltd<br />info@jaadlogistics.com</div></div>
    <h2>Invoice {invoice.no}</h2>
    <div className="doc-grid"><div><div className="lbl">Billed to</div>{invoice.customer}</div><div style={{ textAlign: "right" }}><div className="lbl">Date</div>{formatDate(invoice.date)}<br /><div className="lbl" style={{ marginTop: 8 }}>Status</div>{invoice.status}</div></div>
    <table><thead><tr><th>Description</th><th style={{ textAlign: "right" }}>Amount</th></tr></thead><tbody>
      {invoice.items.map((item) => <tr key={item.desc}><td>{item.desc}</td><td style={{ textAlign: "right" }}>{fmtNaira(item.amount)}</td></tr>)}
      <tr><td style={{ textAlign: "right" }}>Subtotal</td><td style={{ textAlign: "right" }}>{fmtNaira(subtotal)}</td></tr>
      <tr><td style={{ textAlign: "right" }}>VAT, 7.5%</td><td style={{ textAlign: "right" }}>{fmtNaira(vat)}</td></tr>
      <tr className="doc-total-row"><td>Total</td><td style={{ textAlign: "right" }}>{fmtNaira(invoice.amount)}</td></tr>
    </tbody></table>
    <div className="doc-sign"><div className="line">Prepared by</div><div className="line">{signedLine}</div></div>
    {invoice.status === "Paid" && <div className="paid-stamp">PAID</div>}
  </div>;
}

function ExpenseDocument({ category }: { category: string }) {
  const list = dashboardDB.expenses.filter((expense) => expense.cat === category);
  const total = list.reduce((sum, expense) => sum + expense.amount, 0);
  const rows = list.flatMap((expense) => expense.items.map((item) => <tr key={`${expense.cat}-${item.desc}`}><td>{formatDate(expense.date)}</td><td>{expense.vendor}</td><td>{item.desc}</td><td style={{ textAlign: "right" }}>{fmtNaira(item.amount)}</td></tr>));

  return <div className="doc">
    <div className="doc-head"><div><img src="/legacy-assets/embedded_asset_1.png" alt="JAAD Logistics" style={{ height: 30 }} /></div><div className="co">JAAD Logistics Ltd<br />info@jaadlogistics.com</div></div>
    <h2>{category} expenses</h2>
    <div className="doc-grid"><div><div className="lbl">Category</div>{category}</div><div style={{ textAlign: "right" }}><div className="lbl">Entries</div>{list.length}</div></div>
    <table><thead><tr><th>Date</th><th>Vendor</th><th>Item</th><th style={{ textAlign: "right" }}>Amount</th></tr></thead><tbody>{rows}<tr className="doc-total-row"><td colSpan={3}>Total</td><td style={{ textAlign: "right" }}>{fmtNaira(total)}</td></tr></tbody></table>
    <div className="doc-sign"><div className="line">Approved by</div><div className="line">Finance officer</div></div>
  </div>;
}

function PayrollDocument({ payroll }: { payroll: Payroll }) {
  const net = payroll.gross - payroll.deductions;
  return <div className="doc">
    <div className="doc-head"><div><img src="/legacy-assets/embedded_asset_1.png" alt="JAAD Logistics" style={{ height: 30 }} /></div><div className="co">JAAD Logistics Ltd<br />info@jaadlogistics.com</div></div>
    <h2>Payslip · {payroll.name}</h2>
    <div className="doc-grid"><div><div className="lbl">Role</div>{payroll.role}</div><div style={{ textAlign: "right" }}><div className="lbl">Period</div>August 2026</div></div>
    <table><tbody><tr><td>Gross pay</td><td style={{ textAlign: "right" }}>{fmtNaira(payroll.gross)}</td></tr><tr><td>Deductions</td><td style={{ textAlign: "right" }}>({fmtNaira(payroll.deductions)})</td></tr><tr className="doc-total-row"><td>Net pay</td><td style={{ textAlign: "right" }}>{fmtNaira(net)}</td></tr></tbody></table>
    <div className="doc-sign"><div className="line">Finance officer</div><div className="line">Employee acknowledgement</div></div>
  </div>;
}

function QuotationDocument({ quotation }: { quotation: Quotation }) {
  const total = quoteTotal(quotation);
  const rows = quotation.items.map((item) => <tr key={`${quotation.ref}-${item.desc}`}><td>{item.desc}</td><td style={{ textAlign: "right" }}>{item.qty}</td><td style={{ textAlign: "right" }}>{fmtNaira(item.rate)}</td><td style={{ textAlign: "right" }}>{fmtNaira(item.qty * item.rate)}</td></tr>);
  return <div className="doc">
    <div className="doc-head"><div><img src="/legacy-assets/embedded_asset_1.png" alt="JAAD Logistics" style={{ height: 30 }} /></div><div className="co">JAAD Logistics Ltd<br />info@jaadlogistics.com</div></div>
    <h2>Quotation {quotation.ref}</h2>
    <div className="doc-grid"><div><div className="lbl">Quoted to</div>{quotation.customer}<br />{quotation.contact}</div><div style={{ textAlign: "right" }}><div className="lbl">Date</div>{formatDate(quotation.date)}<br /><div className="lbl" style={{ marginTop: 8 }}>Valid until</div>{formatDate(quotation.validUntil)}</div></div>
    <div className="doc-grid"><div><div className="lbl">Route</div>{quotation.route}</div><div style={{ textAlign: "right" }}><div className="lbl">Mode</div>{quotation.mode}</div></div>
    <table><thead><tr><th>Description</th><th style={{ textAlign: "right" }}>Qty</th><th style={{ textAlign: "right" }}>Rate</th><th style={{ textAlign: "right" }}>Amount</th></tr></thead><tbody>{rows}<tr><td colSpan={3} style={{ textAlign: "right" }}>Subtotal</td><td style={{ textAlign: "right" }}>{fmtNaira(total.subtotal)}</td></tr><tr><td colSpan={3} style={{ textAlign: "right" }}>VAT, 7.5%</td><td style={{ textAlign: "right" }}>{fmtNaira(total.vat)}</td></tr><tr className="doc-total-row"><td colSpan={3} style={{ textAlign: "right" }}>Total</td><td style={{ textAlign: "right" }}>{fmtNaira(total.total)}</td></tr></tbody></table>
    <div className="doc-sign"><div className="line">Prepared by, JAAD Logistics</div><div className="line">Accepted by, customer</div></div>
  </div>;
}

export function Finance() {
  const [, setDataRevision] = useState(0);
  const [invoices, setInvoices] = useState<Invoice[]>(dashboardDB.invoices);
  const fin = computeFinance();
  const [activeTab, setActiveTab] = useState<(typeof financeTabs)[number][0]>("overview");
  const [modal, setModal] = useState<"new" | "detail" | "expense" | "payroll" | "quotation" | "purchase" | "newExpense" | "newPayroll" | "newQuotation" | "newPurchase" | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<string | null>(null);
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseOrder | null>(null);
  const [tracking, setTracking] = useState("");
  const [customer, setCustomer] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [hint, setHint] = useState("");
  const [expenseForm, setExpenseForm] = useState({ category: "", vendor: "", amount: "", date: "", description: "" });
  const [payrollForm, setPayrollForm] = useState({ name: dashboardDB.employees[0]?.name || "", role: dashboardDB.employees[0]?.role || "", gross: "", deductions: "" });
  const [quotationForm, setQuotationForm] = useState({ customer: "", contact: "", route: "", mode: "Trucks / Haulage", validUntil: "", description: "", amount: "" });
  const [purchaseForm, setPurchaseForm] = useState({ supplier: "", items: "", total: "", date: "" });
  const [toast, setToast] = useState("");

  const loadFinanceData = useCallback(async () => {
    if (isSimulationMode()) return;
    try {
      const supabase = createClient();
      const [invoiceResult, invoiceItemsResult, expenseResult, expenseItemsResult, payrollResult, purchaseResult, quotationResult, quotationItemsResult] = await Promise.all([
        supabase.from("invoices").select("id, invoice_no, customer_name, amount, status, invoice_date, linked_booking_id, posted").order("invoice_date", { ascending: false }),
        supabase.from("invoice_items").select("invoice_id, description, amount"),
        supabase.from("expenses").select("id, category, vendor, amount, expense_date, status").order("expense_date", { ascending: false }),
        supabase.from("expense_items").select("expense_id, description, amount"),
        supabase.from("payroll_entries").select("employee_name, role_title, gross, deductions"),
        supabase.from("purchase_orders").select("po_no, supplier, total, status, description, items_description, order_date, po_date").order("po_date", { ascending: false }),
        supabase.from("quotations").select("id, ref, customer_name, contact, route, mode, quote_date, valid_until, status, amount").order("quote_date", { ascending: false }),
        supabase.from("quotation_items").select("quotation_id, description, qty, rate"),
      ]);
      const error = invoiceResult.error || invoiceItemsResult.error || expenseResult.error || expenseItemsResult.error || payrollResult.error || purchaseResult.error || quotationResult.error || quotationItemsResult.error;
      if (error) throw error;
      const invoiceItems = invoiceItemsResult.data || [];
      const expenseItems = expenseItemsResult.data || [];
      const quotationItems = quotationItemsResult.data || [];
      const invoices: Invoice[] = (invoiceResult.data || []).map((row) => ({ no: row.invoice_no, customer: row.customer_name, amount: Number(row.amount) || 0, status: row.status, date: row.invoice_date, linkedShipment: dashboardDB.bookings.find((booking) => booking.id === row.linked_booking_id)?.tracking || null, posted: row.posted, items: invoiceItems.filter((item) => item.invoice_id === row.id).map((item) => ({ desc: item.description, amount: Number(item.amount) || 0 })) }));
      const expenses: Expense[] = (expenseResult.data || []).map((row) => ({ id: row.id, cat: row.category, vendor: row.vendor, amount: Number(row.amount) || 0, date: row.expense_date, status: row.status || "Paid", items: expenseItems.filter((item) => item.expense_id === row.id).map((item) => ({ desc: item.description, amount: Number(item.amount) || 0 })) }));
      const payroll: Payroll[] = (payrollResult.data || []).map((row) => ({ name: row.employee_name, role: row.role_title, gross: Number(row.gross) || 0, deductions: Number(row.deductions) || 0 }));
      const purchaseOrders: PurchaseOrder[] = (purchaseResult.data || []).map((row) => ({ no: row.po_no, supplier: row.supplier, total: Number(row.total) || 0, status: row.status, items: row.description || row.items_description || "", date: row.order_date || row.po_date }));
      const quotations: Quotation[] = (quotationResult.data || []).map((row) => ({ ref: row.ref, customer: row.customer_name, contact: row.contact || "", route: row.route || "", mode: row.mode || "", date: row.quote_date, validUntil: row.valid_until || "", status: row.status, amount: Number(row.amount) || undefined, items: quotationItems.filter((item) => item.quotation_id === row.id).map((item) => ({ desc: item.description, qty: Number(item.qty) || 1, rate: Number(item.rate) || 0 })) }));
      dashboardDB.invoices.splice(0, dashboardDB.invoices.length, ...invoices);
      dashboardDB.expenses.splice(0, dashboardDB.expenses.length, ...expenses);
      dashboardDB.payroll.splice(0, dashboardDB.payroll.length, ...payroll);
      dashboardDB.purchaseOrders.splice(0, dashboardDB.purchaseOrders.length, ...purchaseOrders);
      dashboardDB.quotations.splice(0, dashboardDB.quotations.length, ...quotations);
      setInvoices(invoices);
      setDataRevision((revision) => revision + 1);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not load finance data");
    }
  }, []);

  useEffect(() => { queueMicrotask(() => { void loadFinanceData(); }); }, [loadFinanceData]);

  const closeModal = () => {
    setModal(null);
    setTracking("");
    setCustomer("");
    setAmount("");
    setDescription("");
    setHint("");
    setSelectedInvoice(null);
    setSelectedExpense(null);
    setSelectedPayroll(null);
    setSelectedQuotation(null);
    setSelectedPurchase(null);
    setExpenseForm({ category: "", vendor: "", amount: "", date: "", description: "" });
    setPayrollForm({ name: dashboardDB.employees[0]?.name || "", role: dashboardDB.employees[0]?.role || "", gross: "", deductions: "" });
    setQuotationForm({ customer: "", contact: "", route: "", mode: "Trucks / Haulage", validUntil: "", description: "", amount: "" });
    setPurchaseForm({ supplier: "", items: "", total: "", date: "" });
  };

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  const autofillFromTracking = () => {
    if (!tracking.trim()) {
      setHint("");
      return;
    }
    const booking = dashboardDB.bookings.find((item) => item.tracking.toLowerCase() === tracking.trim().toLowerCase());
    if (!booking) {
      setHint("No shipment found with that tracking number — you can still fill this in manually.");
      return;
    }
    setCustomer(booking.customer);
    setAmount(String(booking.value || ""));
    setDescription(`${booking.type} freight, ${booking.origin} to ${booking.destination}`);
    setHint(`Filled in from ${tracking}, ${booking.customer}.`);
  };

  const saveInvoice = async () => {
    const value = Number(amount) || 0;
    if (!customer || !value) {
      showToast("Choose a customer and add an amount");
      return;
    }
    const linkedTracking = tracking.trim() || null;
    if (linkedTracking && dashboardDB.invoices.some((invoice) => invoice.linkedShipment?.toLowerCase() === linkedTracking.toLowerCase())) {
      showToast("An invoice already exists for that shipment");
      return;
    }
    const invoiceNo = `INV-${String(nextInvoiceSequence++).padStart(5, "0")}`;
    if (!isSimulationMode()) {
      try {
        const supabase = createClient();
        let linkedBookingId: string | null = null;
        if (linkedTracking) {
          const { data: booking, error } = await supabase.from("bookings").select("id").eq("tracking_no", linkedTracking).maybeSingle();
          if (error) throw error;
          if (!booking) { showToast("No shipment found for that tracking number"); return; }
          linkedBookingId = booking.id;
        }
        const { data: customerRecord, error: customerError } = await supabase.from("customers").select("id").eq("name", customer).maybeSingle();
        if (customerError) throw customerError;
        const invoiceAmount = value;
        const itemDescription = description.trim() || "Freight charges";
        const { data: savedInvoice, error: invoiceError } = await supabase.from("invoices").insert({ invoice_no: invoiceNo, customer_id: customerRecord?.id || null, customer_name: customer, amount: invoiceAmount, status: "Pending", invoice_date: new Date().toISOString().slice(0, 10), linked_booking_id: linkedBookingId }).select("id").single();
        if (invoiceError) throw invoiceError;
        const { error: itemError } = await supabase.from("invoice_items").insert({ invoice_id: savedInvoice.id, description: itemDescription, amount: invoiceAmount });
        if (itemError) {
          await supabase.from("invoices").delete().eq("id", savedInvoice.id);
          throw itemError;
        }
        const invoice: Invoice = { no: invoiceNo, customer, amount: invoiceAmount, status: "Pending", date: new Date().toISOString().slice(0, 10), linkedShipment: linkedTracking, items: [{ desc: itemDescription, amount: invoiceAmount }] };
        dashboardDB.invoices.unshift(invoice);
        setInvoices([...dashboardDB.invoices]);
        closeModal();
        showToast(`Invoice ${invoice.no} created`);
        setSelectedInvoice(invoice);
        setModal("detail");
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Could not create invoice");
      }
      return;
    }
    const invoice: Invoice = {
      no: invoiceNo,
      customer,
      amount: value,
      status: "Pending",
      date: new Date().toISOString().slice(0, 10),
      linkedShipment: linkedTracking,
      items: [{ desc: description.trim() || "Freight charges", amount: value }],
    };
    dashboardDB.invoices.unshift(invoice);
    persistSimulationState(dashboardDB);
    setInvoices([...dashboardDB.invoices]);
    closeModal();
    showToast(`Invoice ${invoice.no} created, visible in ${customer}’s account`);
    setSelectedInvoice(invoice);
    setModal("detail");
  };

  const saveNewExpense = () => {
    const category = expenseForm.category.trim();
    const amountValue = Number(expenseForm.amount) || 0;
    if (!category || !amountValue) { showToast("Add a category and an amount"); return; }
    const descriptionValue = expenseForm.description.trim() || category;
    const date = expenseForm.date || new Date().toISOString().slice(0, 10);
    if (!isSimulationMode()) {
      void (async () => {
        try {
          const supabase = createClient();
          const vendor = expenseForm.vendor.trim() || "Unspecified vendor";
          const { data: savedExpense, error } = await supabase.from("expenses").insert({ category, vendor, amount: amountValue, expense_date: date, status: "Unpaid" }).select("id").single();
          if (error) throw error;
          const { error: itemError } = await supabase.from("expense_items").insert({ expense_id: savedExpense.id, description: descriptionValue, amount: amountValue });
          if (itemError) {
            await supabase.from("expenses").delete().eq("id", savedExpense.id);
            throw itemError;
          }
          dashboardDB.expenses.unshift({ cat: category, vendor, amount: amountValue, date, status: "Unpaid", items: [{ desc: descriptionValue, amount: amountValue }] });
          setDataRevision((revision) => revision + 1);
          closeModal();
          setActiveTab("expenses");
          showToast("Expense logged");
        } catch (error) {
          showToast(error instanceof Error ? error.message : "Could not log expense");
        }
      })();
      return;
    }
    const existing = dashboardDB.expenses.find((expense) => expense.cat.toLowerCase() === category.toLowerCase());
    if (existing) {
      existing.items.push({ desc: descriptionValue, amount: amountValue });
      existing.amount += amountValue;
      existing.vendor = expenseForm.vendor.trim() || existing.vendor;
      existing.date = date;
    } else {
      dashboardDB.expenses.unshift({ cat: category, vendor: expenseForm.vendor.trim(), amount: amountValue, date, status: "Unpaid", items: [{ desc: descriptionValue, amount: amountValue }] });
    }
    persistSimulationState(dashboardDB);
    setDataRevision((revision) => revision + 1);
    closeModal();
    setActiveTab("expenses");
    showToast(`Expense logged${existing ? ` under ${category}` : ""}`);
  };

  const saveNewPayroll = () => {
    const gross = Number(payrollForm.gross) || 0;
    if (!payrollForm.name || !gross) { showToast("Choose an employee and add a gross pay amount"); return; }
    if (!isSimulationMode()) {
      void (async () => {
        try {
          const supabase = createClient();
          const values = { employee_name: payrollForm.name, role_title: payrollForm.role.trim(), gross, deductions: Number(payrollForm.deductions) || 0 };
          const { error } = await supabase.from("payroll_entries").upsert(values, { onConflict: "employee_name" });
          if (error) throw error;
          const existingIndex = dashboardDB.payroll.findIndex((entry) => entry.name === payrollForm.name);
          const row: Payroll = { name: values.employee_name, role: values.role_title, gross: values.gross, deductions: values.deductions };
          if (existingIndex >= 0) dashboardDB.payroll.splice(existingIndex, 1, row);
          else dashboardDB.payroll.unshift(row);
          setDataRevision((revision) => revision + 1);
          closeModal();
          setActiveTab("payroll");
          showToast(`Payroll entry saved for ${payrollForm.name}`);
        } catch (error) {
          showToast(error instanceof Error ? error.message : "Could not save payroll entry");
        }
      })();
      return;
    }
    const existing = dashboardDB.payroll.find((entry) => entry.name === payrollForm.name);
    if (existing) {
      existing.role = payrollForm.role.trim();
      existing.gross = gross;
      existing.deductions = Number(payrollForm.deductions) || 0;
    } else {
      dashboardDB.payroll.unshift({ name: payrollForm.name, role: payrollForm.role.trim(), gross, deductions: Number(payrollForm.deductions) || 0 });
    }
    persistSimulationState(dashboardDB);
    setDataRevision((revision) => revision + 1);
    closeModal();
    setActiveTab("payroll");
    showToast(`${existing ? "Updated payroll entry for" : "Payroll entry added for"} ${payrollForm.name}`);
  };

  const saveNewQuotation = () => {
    const customerName = quotationForm.customer.trim();
    const route = quotationForm.route.trim();
    const descriptionValue = quotationForm.description.trim();
    if (!customerName || !route || !descriptionValue) { showToast("Add a customer, route and description"); return; }
    const sequence = dashboardDB.quotations.reduce((highest, quotation) => Math.max(highest, Number(quotation.ref.replace("QUO-", "")) || 0), 1042) + 1;
    if (!isSimulationMode()) {
      void (async () => {
        try {
          const supabase = createClient();
          const ref = `QUO-${String(sequence).padStart(4, "0")}`;
          const rate = Number(quotationForm.amount) || 0;
          const { data: savedQuotation, error } = await supabase.from("quotations").insert({ ref, customer_name: customerName, contact: quotationForm.contact.trim(), route, mode: quotationForm.mode, quote_date: new Date().toISOString().slice(0, 10), valid_until: quotationForm.validUntil || new Date().toISOString().slice(0, 10), status: "Pending", amount: rate }).select("id").single();
          if (error) throw error;
          const { error: itemError } = await supabase.from("quotation_items").insert({ quotation_id: savedQuotation.id, description: descriptionValue, qty: 1, rate });
          if (itemError) {
            await supabase.from("quotations").delete().eq("id", savedQuotation.id);
            throw itemError;
          }
          dashboardDB.quotations.unshift({ ref, customer: customerName, contact: quotationForm.contact.trim(), route, mode: quotationForm.mode, date: new Date().toISOString().slice(0, 10), validUntil: quotationForm.validUntil, status: "Pending", amount: rate, items: [{ desc: descriptionValue, qty: 1, rate }] });
          setDataRevision((revision) => revision + 1);
          closeModal();
          setActiveTab("quotations");
          showToast(`Quotation ${ref} saved`);
        } catch (error) {
          showToast(error instanceof Error ? error.message : "Could not save quotation");
        }
      })();
      return;
    }
    const quotation: Quotation = {
      ref: `QUO-${String(sequence).padStart(4, "0")}`,
      customer: customerName,
      contact: quotationForm.contact.trim(),
      route,
      mode: quotationForm.mode,
      date: new Date().toISOString().slice(0, 10),
      validUntil: quotationForm.validUntil || new Date().toISOString().slice(0, 10),
      status: "Pending",
      items: [{ desc: descriptionValue, qty: 1, rate: Number(quotationForm.amount) || 0 }],
    };
    dashboardDB.quotations.unshift(quotation);
    persistSimulationState(dashboardDB);
    setDataRevision((revision) => revision + 1);
    closeModal();
    setActiveTab("quotations");
    showToast(`Quotation ${quotation.ref} saved`);
  };

  const saveNewPurchaseOrder = () => {
    const supplier = purchaseForm.supplier.trim();
    const items = purchaseForm.items.trim();
    const total = Number(purchaseForm.total) || 0;
    if (!supplier || !items || total <= 0) {
      showToast("Add a supplier, item details and a total greater than zero");
      return;
    }
    const sequence = dashboardDB.purchaseOrders.reduce((highest, purchase) => Math.max(highest, Number(purchase.no.replace("PO-", "")) || 0), 116) + 1;
    if (!isSimulationMode()) {
      void (async () => {
        try {
          const supabase = createClient();
          const purchaseOrder: PurchaseOrder = { no: `PO-${String(sequence).padStart(4, "0")}`, supplier, total, status: "Pending", items, date: purchaseForm.date || new Date().toISOString().slice(0, 10) };
          const { error } = await supabase.from("purchase_orders").insert({ po_no: purchaseOrder.no, supplier, total, status: "Pending", items_description: items, description: items, po_date: purchaseOrder.date, order_date: purchaseOrder.date });
          if (error) throw error;
          dashboardDB.purchaseOrders.unshift(purchaseOrder);
          setDataRevision((revision) => revision + 1);
          closeModal();
          setActiveTab("purchase");
          showToast(`Purchase order ${purchaseOrder.no} created`);
        } catch (error) {
          showToast(error instanceof Error ? error.message : "Could not create purchase order");
        }
      })();
      return;
    }
    const purchaseOrder: PurchaseOrder = {
      no: `PO-${String(sequence).padStart(4, "0")}`,
      supplier,
      total,
      status: "Pending",
      items,
      date: purchaseForm.date || new Date().toISOString().slice(0, 10),
    };
    dashboardDB.purchaseOrders.unshift(purchaseOrder);
    persistSimulationState(dashboardDB);
    setDataRevision((revision) => revision + 1);
    closeModal();
    setActiveTab("purchase");
    showToast(`Purchase order ${purchaseOrder.no} created`);
  };

  const updateInvoiceStatus = (invoice: Invoice, status: string) => {
    if (!isSimulationMode()) {
      void (async () => {
        try {
          const supabase = createClient();
          const { error } = await supabase.from("invoices").update({ status, posted: status === "Paid" }).eq("invoice_no", invoice.no);
          if (error) throw error;
          invoice.status = status;
          if (status === "Paid" && !invoice.paidDate) invoice.paidDate = new Date().toISOString().slice(0, 10);
          if (status !== "Paid") invoice.paidDate = null;
          setInvoices([...dashboardDB.invoices]);
          setDataRevision((revision) => revision + 1);
        } catch (error) {
          showToast(error instanceof Error ? error.message : "Could not update invoice");
        }
      })();
      return;
    }
    invoice.status = status;
    if (status === "Paid" && !invoice.paidDate) invoice.paidDate = new Date().toISOString().slice(0, 10);
    if (status !== "Paid") invoice.paidDate = null;
    persistSimulationState(dashboardDB);
    setInvoices([...dashboardDB.invoices]);
  };

  const updateExpenseStatus = (expense: Expense, status: string) => {
    if (!isSimulationMode()) {
      void (async () => {
        try {
          const supabase = createClient();
          if (!expense.id) throw new Error("Could not locate the expense record");
          const { error } = await supabase.from("expenses").update({ status }).eq("id", expense.id);
          if (error) throw error;
          expense.status = status;
          setDataRevision((revision) => revision + 1);
        } catch (error) {
          showToast(error instanceof Error ? error.message : "Could not update expense");
        }
      })();
      return;
    }
    expense.status = status;
    persistSimulationState(dashboardDB);
    setDataRevision((revision) => revision + 1);
  };

  const updatePurchaseStatus = (purchase: PurchaseOrder, status: string) => {
    if (!isSimulationMode()) {
      void (async () => {
        try {
          const supabase = createClient();
          const { error } = await supabase.from("purchase_orders").update({ status }).eq("po_no", purchase.no);
          if (error) throw error;
          purchase.status = status;
          setDataRevision((revision) => revision + 1);
        } catch (error) {
          showToast(error instanceof Error ? error.message : "Could not update purchase order");
        }
      })();
      return;
    }
    purchase.status = status;
    persistSimulationState(dashboardDB);
    setDataRevision((revision) => revision + 1);
  };

  const updateQuotationStatus = (quotation: Quotation, status: string) => {
    if (!isSimulationMode()) {
      void (async () => {
        try {
          const supabase = createClient();
          const { error } = await supabase.from("quotations").update({ status }).eq("ref", quotation.ref);
          if (error) throw error;
          quotation.status = status;
          setDataRevision((revision) => revision + 1);
        } catch (error) {
          showToast(error instanceof Error ? error.message : "Could not update quotation");
        }
      })();
      return;
    }
    quotation.status = status;
    persistSimulationState(dashboardDB);
    setDataRevision((revision) => revision + 1);
  };

  const downloadInvoice = (invoice: Invoice) => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.setFontSize(15);
    doc.text(`Invoice ${invoice.no}`, 48, 56);
    doc.setFontSize(10.5);
    doc.text(`Billed to: ${invoice.customer}`, 48, 82);
    doc.text(`Date: ${formatDate(invoice.date)}`, 48, 100);
    doc.text(`Status: ${invoice.status}`, 48, 118);
    let y = 154;
    invoiceRows(invoice).forEach(([label, value]) => {
      doc.text(label, 48, y);
      doc.text(value, 547, y, { align: "right" });
      y += 18;
    });
    doc.text(`Total: ${fmtNaira(invoice.amount)}`, 48, y + 16);
    doc.save(`${invoice.no}.pdf`);
  };

  const renderOverview = () => {
    const donutSegments = [
      { value: fin.expenses, color: "#b3790f" },
      { value: fin.payrollNet, color: "#2563c7" },
      { value: Math.max(fin.netAfterAll, 0), color: "#1f9d5c" },
    ];
    return <>
      <div className="note">Currency: Nigerian Naira. VAT (7.5%) is charged only on invoices we send to customers, and is included in the amount they pay. It is not added to our own expenses, purchase orders or salaries. Every figure below is calculated live from the Invoices, Expenses and Payroll tabs, not hardcoded.</div>
      <div className="grid g-4" style={{ marginBottom: 14 }}>
        <div className="card kpi-card"><div className="card-title">Revenue, MTD</div><div className="kpi-value">{fmtNaira(fin.revenue)}</div><div className="card-meta">from paid invoices, excl. VAT</div></div>
        <div className="card kpi-card"><div className="card-title">Expenses, MTD</div><div className="kpi-value">{fmtNaira(fin.expenses)}</div><div className="card-meta">{fin.expenseCount} payments out</div></div>
        <div className="card kpi-card"><div className="card-title">Net position, MTD</div><div className="kpi-value">{fmtNaira(fin.netAfterAll)}</div><div className="card-meta">after payroll</div></div>
        <div className="card kpi-card"><div className="card-title">VAT collected, 7.5%</div><div className="kpi-value">{fmtNaira(fin.vat)}</div><div className="card-meta">held for FIRS, from paid invoices</div></div>
      </div>
      <div className="grid g-7-5">
        <div className="card"><div className="card-title" style={{ marginBottom: 14 }}>Where revenue goes<small>Revenue split across expenses, payroll and net profit</small></div><div style={{ display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
          <DonutChart segments={donutSegments} size={190} />
          <div style={{ flex: 1, minWidth: 200 }}>
            {[['#b3790f', 'Operating expenses', fin.expenses], ['#2563c7', 'Payroll, net of deductions', fin.payrollNet], ['#1f9d5c', 'Net profit', Math.max(fin.netAfterAll, 0)]].map(([color, label, value]) => <div key={label as string} style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "9px 0", borderBottom: "1px solid var(--border)" }}><span style={{ width: 11, height: 11, borderRadius: 3, background: color as string, display: "inline-block", flexShrink: 0, marginTop: 3 }} /><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>{label}</div><div style={{ fontFamily: "var(--font-d)", fontWeight: 700, fontSize: 15, wordBreak: "break-word" }}>{fmtNaira(value as number)}</div></div></div>)}
          </div>
        </div></div>
        <div className="card"><div className="card-title" style={{ marginBottom: 10 }}>P&amp;L snapshot</div>
          <table className="mini-table"><tbody><tr><td>Revenue (paid invoices, excl. VAT)</td><td>{fmtNaira(fin.revenue)}</td></tr><tr><td>Operating expenses</td><td>({fmtNaira(fin.expenses)})</td></tr><tr><td>Payroll, net</td><td>({fmtNaira(fin.payrollNet)})</td></tr><tr><td><strong>Net position</strong></td><td><strong>{fmtNaira(fin.netAfterAll)}</strong></td></tr><tr><td>VAT collected (owed to FIRS, not company income)</td><td>{fmtNaira(fin.vat)}</td></tr></tbody></table>
        </div>
      </div>
    </>;
  };

  const renderInvoiceTab = () => <AdminTable<Invoice> columns={[{ key: "no", label: "Invoice no.", render: (invoice) => <span className="mono link-cell" onClick={() => { setSelectedInvoice(invoice); setModal("detail"); }}>{invoice.no}</span> }, { key: "customer", label: "Customer" }, { key: "amount", label: "Amount", render: (invoice) => fmtNaira(invoice.amount) }, { key: "date", label: "Date", render: (invoice) => formatDate(invoice.date) }, { key: "status", label: "Status", render: (invoice) => <select className="switch-select" value={invoice.status} onChange={(event) => updateInvoiceStatus(invoice, event.target.value)}>{invoiceStatuses.map((status) => <option value={status} key={status}>{status}</option>)}</select> }]} data={invoices} />;

  const renderExpenseTab = () => <AdminTable<Expense> columns={[{ key: "cat", label: "Category", render: (expense) => <span className="link-cell" onClick={() => { setSelectedExpense(expense.cat); setModal("expense"); }}>{expense.cat}</span> }, { key: "vendor", label: "Vendor" }, { key: "amount", label: "Amount", render: (expense) => fmtNaira(expense.amount) }, { key: "date", label: "Date", render: (expense) => formatDate(expense.date) }, { key: "status", label: "Status", render: (expense) => <select className="switch-select" value={expense.status || "Unpaid"} onChange={(event) => updateExpenseStatus(expense, event.target.value)}>{expenseStatuses.map((status) => <option value={status} key={status}>{status}</option>)}</select> }]} data={dashboardDB.expenses} />;

  const renderPayrollTab = () => <AdminTable<Payroll> columns={[{ key: "name", label: "Employee", render: (payroll) => <span className="link-cell" onClick={() => { setSelectedPayroll(payroll); setModal("payroll"); }}>{payroll.name}</span> }, { key: "role", label: "Role" }, { key: "gross", label: "Gross", render: (payroll) => fmtNaira(payroll.gross) }, { key: "deductions", label: "Deductions", render: (payroll) => fmtNaira(payroll.deductions) }, { key: "gross", label: "Net", render: (payroll) => fmtNaira(payroll.gross - payroll.deductions) }]} data={dashboardDB.payroll} />;

  const renderPurchaseTab = () => <AdminTable<PurchaseOrder> columns={[{ key: "no", label: "PO no.", render: (purchase) => <span className="mono link-cell" onClick={() => { setSelectedPurchase(purchase); setModal("purchase"); }}>{purchase.no}</span> }, { key: "supplier", label: "Supplier" }, { key: "total", label: "Total", render: (purchase) => fmtNaira(purchase.total) }, { key: "date", label: "Date", render: (purchase) => formatDate(purchase.date) }, { key: "status", label: "Status", render: (purchase) => <select className="switch-select" value={purchase.status} onChange={(event) => updatePurchaseStatus(purchase, event.target.value)}>{poStatuses.map((status) => <option value={status} key={status}>{status}</option>)}</select> }]} data={dashboardDB.purchaseOrders} />;

  const renderQuotationTab = () => <AdminTable<Quotation> columns={[{ key: "ref", label: "Reference", render: (quotation) => <span className="mono link-cell" onClick={() => { setSelectedQuotation(quotation); setModal("quotation"); }}>{quotation.ref}</span> }, { key: "customer", label: "Customer" }, { key: "route", label: "Route" }, { key: "amount", label: "Amount", render: (quotation) => fmtNaira(quotation.amount ?? quoteTotal(quotation).total) }, { key: "status", label: "Status", render: (quotation) => <select className="switch-select" value={quotation.status} onChange={(event) => updateQuotationStatus(quotation, event.target.value)}>{quotationStatuses.map((status) => <option value={status} key={status}>{status}</option>)}</select> }]} data={dashboardDB.quotations} />;

  const body = activeTab === "overview" ? renderOverview() : activeTab === "invoices" ? renderInvoiceTab() : activeTab === "expenses" ? renderExpenseTab() : activeTab === "payroll" ? renderPayrollTab() : activeTab === "purchase" ? renderPurchaseTab() : renderQuotationTab();

  return <>
    <div className="view-head"><div><h1>Finance</h1><p>Accounts, invoicing, payroll, purchase orders and quotations.</p></div><div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>{activeTab === "invoices" && <button className="btn btn-primary" onClick={() => setModal("new")}><span aria-hidden="true">+</span> New invoice</button>}{activeTab === "expenses" && <button className="btn btn-primary" onClick={() => setModal("newExpense")}>＋ New expense</button>}{activeTab === "payroll" && <button className="btn btn-primary" onClick={() => setModal("newPayroll")}>＋ New payroll entry</button>}{activeTab === "purchase" && <button className="btn btn-primary" onClick={() => setModal("newPurchase")}>＋ New purchase order</button>}{activeTab === "quotations" && <button className="btn btn-primary" onClick={() => setModal("newQuotation")}>＋ New quotation</button>}</div></div>
    <div className="tabs">{financeTabs.map(([key, label]) => <div className={`tab${activeTab === key ? " active" : ""}`} key={key} onClick={() => setActiveTab(key)}>{label}</div>)}</div>
    {body}
    {modal && <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
      <div className={modal === "detail" || modal === "expense" || modal === "payroll" || modal === "quotation" || modal === "purchase" ? "modal doc-modal" : "modal"}>
        {modal === "new" ? <>
          <div className="modal-head"><h3>New invoice</h3><button className="x-btn" onClick={closeModal}>×</button></div>
          <div className="modal-body">
            <div className="field"><label>Tracking number (optional — auto-fills the rest)</label><input placeholder="e.g. JAAD/2807/2026/00231" value={tracking} onChange={(event) => setTracking(event.target.value)} onBlur={autofillFromTracking} /></div>
            <div className="grid g-2"><div className="field"><label>Customer</label><select value={customer} onChange={(event) => setCustomer(event.target.value)}><option value="">Choose a customer</option>{dashboardDB.customers.map((item) => <option key={item.name}>{item.name}</option>)}</select></div><div className="field"><label>Amount (₦, VAT-inclusive)</label><input type="number" placeholder="0" value={amount} onChange={(event) => setAmount(event.target.value)} /></div></div>
            <div className="field"><label>Description</label><input placeholder="e.g. Air freight, Lagos to Ikoyi" value={description} onChange={(event) => setDescription(event.target.value)} /></div>
            <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 2 }}>{hint}</div>
          </div>
          <div className="modal-foot"><button className="btn" onClick={closeModal}>Cancel</button><button className="btn btn-primary" onClick={saveInvoice}>Save invoice</button></div>
        </> : modal === "newExpense" ? <>
          <div className="modal-head"><h3>New expense</h3><button className="x-btn" type="button" onClick={closeModal}>×</button></div>
          <div className="modal-body">
            <div className="grid g-2">
              <div className="field"><label>Category</label><input placeholder="e.g. Fuel, Maintenance, Toll & levies" value={expenseForm.category} onChange={(event) => setExpenseForm({ ...expenseForm, category: event.target.value })} /></div>
              <div className="field"><label>Vendor</label><input value={expenseForm.vendor} onChange={(event) => setExpenseForm({ ...expenseForm, vendor: event.target.value })} /></div>
              <div className="field"><label>Amount (₦)</label><input type="number" min="0" step="1" placeholder="0" value={expenseForm.amount} onChange={(event) => setExpenseForm({ ...expenseForm, amount: event.target.value })} /></div>
              <div className="field"><label>Date</label><input type="date" value={expenseForm.date} onChange={(event) => setExpenseForm({ ...expenseForm, date: event.target.value })} /></div>
            </div>
            <div className="field"><label>What was this for?</label><input placeholder="e.g. Diesel for KJA-441-XL" value={expenseForm.description} onChange={(event) => setExpenseForm({ ...expenseForm, description: event.target.value })} /></div>
          </div>
          <div className="modal-foot"><button className="btn" type="button" onClick={closeModal}>Cancel</button><button className="btn btn-primary" type="button" onClick={saveNewExpense}>Save expense</button></div>
        </> : modal === "newPayroll" ? <>
          <div className="modal-head"><h3>New payroll entry</h3><button className="x-btn" type="button" onClick={closeModal}>×</button></div>
          <div className="modal-body"><div className="grid g-2">
            <div className="field"><label>Employee</label><select value={payrollForm.name} onChange={(event) => { const name = event.target.value; const employee = dashboardDB.employees.find((item) => item.name === name); setPayrollForm({ ...payrollForm, name, role: employee?.role || "" }); }}>{dashboardDB.employees.map((employee) => <option key={employee.name}>{employee.name}</option>)}</select></div>
            <div className="field"><label>Role</label><input placeholder="Auto-fills from employee" value={payrollForm.role} onChange={(event) => setPayrollForm({ ...payrollForm, role: event.target.value })} /></div>
            <div className="field"><label>Gross pay (₦)</label><input type="number" min="0" step="1" placeholder="0" value={payrollForm.gross} onChange={(event) => setPayrollForm({ ...payrollForm, gross: event.target.value })} /></div>
            <div className="field"><label>Deductions (₦)</label><input type="number" min="0" step="1" placeholder="0" value={payrollForm.deductions} onChange={(event) => setPayrollForm({ ...payrollForm, deductions: event.target.value })} /></div>
          </div></div>
          <div className="modal-foot"><button className="btn" type="button" onClick={closeModal}>Cancel</button><button className="btn btn-primary" type="button" onClick={saveNewPayroll}>Save entry</button></div>
        </> : modal === "newQuotation" ? <>
          <div className="modal-head"><h3>New quotation</h3><button className="x-btn" type="button" onClick={closeModal}>×</button></div>
          <div className="modal-body">
            <div className="grid g-2">
              <div className="field"><label>Customer</label><input value={quotationForm.customer} onChange={(event) => setQuotationForm({ ...quotationForm, customer: event.target.value })} /></div>
              <div className="field"><label>Contact</label><input placeholder="Name, phone" value={quotationForm.contact} onChange={(event) => setQuotationForm({ ...quotationForm, contact: event.target.value })} /></div>
              <div className="field"><label>Route</label><input placeholder="Origin to destination" value={quotationForm.route} onChange={(event) => setQuotationForm({ ...quotationForm, route: event.target.value })} /></div>
              <div className="field"><label>Mode</label><select value={quotationForm.mode} onChange={(event) => setQuotationForm({ ...quotationForm, mode: event.target.value })}><option>Trucks / Haulage</option><option>Air Freight</option><option>Sea Freight</option></select></div>
              <div className="field"><label>Valid until</label><input type="date" value={quotationForm.validUntil} onChange={(event) => setQuotationForm({ ...quotationForm, validUntil: event.target.value })} /></div>
            </div>
            <div className="form-section-title">Line item</div>
            <div className="grid g-3"><div className="field" style={{ gridColumn: "span 2" }}><label>Description</label><input value={quotationForm.description} onChange={(event) => setQuotationForm({ ...quotationForm, description: event.target.value })} /></div><div className="field"><label>Amount</label><input type="number" min="0" step="1" value={quotationForm.amount} onChange={(event) => setQuotationForm({ ...quotationForm, amount: event.target.value })} /></div></div>
          </div>
          <div className="modal-foot"><button className="btn" type="button" onClick={closeModal}>Cancel</button><button className="btn btn-primary" type="button" onClick={saveNewQuotation}>Save quotation</button></div>
        </> : modal === "newPurchase" ? <>
          <div className="modal-head"><h3>New purchase order</h3><button className="x-btn" type="button" onClick={closeModal}>×</button></div>
          <div className="modal-body"><div className="grid g-2">
            <div className="field"><label>Supplier</label><input value={purchaseForm.supplier} onChange={(event) => setPurchaseForm({ ...purchaseForm, supplier: event.target.value })} /></div>
            <div className="field"><label>Total (₦)</label><input type="number" min="1" step="1" value={purchaseForm.total} onChange={(event) => setPurchaseForm({ ...purchaseForm, total: event.target.value })} /></div>
            <div className="field"><label>Date</label><input type="date" value={purchaseForm.date} onChange={(event) => setPurchaseForm({ ...purchaseForm, date: event.target.value })} /></div>
          </div><div className="field"><label>Items</label><textarea rows={3} value={purchaseForm.items} onChange={(event) => setPurchaseForm({ ...purchaseForm, items: event.target.value })} /></div></div>
          <div className="modal-foot"><button className="btn" type="button" onClick={closeModal}>Cancel</button><button className="btn btn-primary" type="button" onClick={saveNewPurchaseOrder}>Save purchase order</button></div>
        </> : modal === "detail" && selectedInvoice ? <>
          <div className="modal-head"><h3>{selectedInvoice.no}</h3><button className="x-btn" onClick={closeModal}>×</button></div>
          <div className="modal-body"><InvoiceDocument invoice={selectedInvoice} /></div>
          <div className="modal-foot"><button className="btn" onClick={closeModal}>Close</button><button className="btn" onClick={() => downloadInvoice(selectedInvoice)}>Download PDF</button><button className="btn btn-primary" onClick={() => window.print()}>Print</button></div>
        </> : modal === "expense" && selectedExpense ? <>
          <div className="modal-head"><h3>{selectedExpense} expenses</h3><button className="x-btn" onClick={closeModal}>×</button></div>
          <div className="modal-body"><ExpenseDocument category={selectedExpense} /></div>
          <div className="modal-foot"><button className="btn" onClick={closeModal}>Close</button><button className="btn btn-primary" onClick={() => window.print()}>Print</button></div>
        </> : modal === "payroll" && selectedPayroll ? <>
          <div className="modal-head"><h3>Payslip, {selectedPayroll.name}</h3><button className="x-btn" onClick={closeModal}>×</button></div>
          <div className="modal-body"><PayrollDocument payroll={selectedPayroll} /></div>
          <div className="modal-foot"><button className="btn" onClick={closeModal}>Close</button><button className="btn btn-primary" onClick={() => window.print()}>Print</button></div>
        </> : modal === "quotation" && selectedQuotation ? <>
          <div className="modal-head"><h3>{selectedQuotation.ref} {selectedQuotation.status}</h3><button className="x-btn" onClick={closeModal}>×</button></div>
          <div className="modal-body"><QuotationDocument quotation={selectedQuotation} /></div>
          <div className="modal-foot"><button className="btn" onClick={closeModal}>Close</button><button className="btn btn-primary" onClick={() => window.print()}>Print</button></div>
        </> : modal === "purchase" && selectedPurchase ? <>
          <div className="modal-head"><h3>{selectedPurchase.no} {selectedPurchase.status}</h3><button className="x-x-btn" onClick={closeModal}>×</button></div>
          <div className="modal-body"><div className="doc"><div className="doc-head"><div><img src="/legacy-assets/embedded_asset_1.png" alt="JAAD Logistics" style={{ height: 30 }} /></div><div className="co">JAAD Logistics Ltd<br />info@jaadlogistics.com</div></div><h2>Purchase order {selectedPurchase.no}</h2><div className="doc-grid"><div><div className="lbl">Supplier</div>{selectedPurchase.supplier}</div><div style={{ textAlign: "right" }}><div className="lbl">Date</div>{formatDate(selectedPurchase.date)}<br /><div className="lbl" style={{ marginTop: 8 }}>Status</div>{selectedPurchase.status}</div></div><div className="doc-grid"><div><div className="lbl">Items</div>{selectedPurchase.items}</div></div><table><tbody><tr className="doc-total-row"><td>Total</td><td style={{ textAlign: "right" }}>{fmtNaira(selectedPurchase.total)}</td></tr></tbody></table><div className="doc-sign"><div className="line">Raised by, JAAD Logistics</div><div className="line">Supplier acknowledgement</div></div></div></div>
          <div className="modal-foot"><button className="btn" onClick={closeModal}>Close</button><button className="btn btn-primary" onClick={() => window.print()}>Print</button></div>
        </> : null}
      </div>
    </div>}
    {toast && <div className="toast-wrap"><div className="toast">{toast}</div></div>}
  </>;
}
