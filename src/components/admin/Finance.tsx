"use client";

import { useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import { AdminTable } from "./AdminTable";
import { computeFinance, dashboardDB, fmtNaira, invoiceSubtotal, invoiceVat, quoteTotal, type Expense, type Invoice, type Payroll, type PurchaseOrder, type Quotation } from "@/lib/dashboard";

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
  const fin = useMemo(() => computeFinance(), []);
  const [activeTab, setActiveTab] = useState<(typeof financeTabs)[number][0]>("overview");
  const [invoices, setInvoices] = useState<Invoice[]>(dashboardDB.invoices);
  const [modal, setModal] = useState<"new" | "detail" | "expense" | "payroll" | "quotation" | "purchase" | null>(null);
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
  const [toast, setToast] = useState("");

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
  };

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

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

  const saveInvoice = () => {
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
    const invoice: Invoice = {
      no: `INV-${String(nextInvoiceSequence++).padStart(5, "0")}`,
      customer,
      amount: value,
      status: "Pending",
      date: new Date().toISOString().slice(0, 10),
      linkedShipment: linkedTracking,
      items: [{ desc: description.trim() || "Freight charges", amount: value }],
    };
    dashboardDB.invoices.unshift(invoice);
    setInvoices([...dashboardDB.invoices]);
    closeModal();
    showToast(`Invoice ${invoice.no} created, visible in ${customer}’s account`);
    setSelectedInvoice(invoice);
    setModal("detail");
  };

  const updateInvoiceStatus = (invoice: Invoice, status: string) => {
    invoice.status = status;
    if (status === "Paid" && !invoice.paidDate) invoice.paidDate = new Date().toISOString().slice(0, 10);
    if (status !== "Paid") invoice.paidDate = null;
    setInvoices([...dashboardDB.invoices]);
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

  const renderExpenseTab = () => <AdminTable<Expense> columns={[{ key: "cat", label: "Category", render: (expense) => <span className="link-cell" onClick={() => { setSelectedExpense(expense.cat); setModal("expense"); }}>{expense.cat}</span> }, { key: "vendor", label: "Vendor" }, { key: "amount", label: "Amount", render: (expense) => fmtNaira(expense.amount) }, { key: "date", label: "Date", render: (expense) => formatDate(expense.date) }, { key: "status", label: "Status", render: (expense) => <select className="switch-select" value={expense.status || "Unpaid"} onChange={(event) => { expense.status = event.target.value; setInvoices([...dashboardDB.invoices]); }}>{expenseStatuses.map((status) => <option value={status} key={status}>{status}</option>)}</select> }]} data={dashboardDB.expenses} />;

  const renderPayrollTab = () => <AdminTable<Payroll> columns={[{ key: "name", label: "Employee", render: (payroll) => <span className="link-cell" onClick={() => { setSelectedPayroll(payroll); setModal("payroll"); }}>{payroll.name}</span> }, { key: "role", label: "Role" }, { key: "gross", label: "Gross", render: (payroll) => fmtNaira(payroll.gross) }, { key: "deductions", label: "Deductions", render: (payroll) => fmtNaira(payroll.deductions) }, { key: "gross", label: "Net", render: (payroll) => fmtNaira(payroll.gross - payroll.deductions) }]} data={dashboardDB.payroll} />;

  const renderPurchaseTab = () => <AdminTable<PurchaseOrder> columns={[{ key: "no", label: "PO no.", render: (purchase) => <span className="mono link-cell" onClick={() => { setSelectedPurchase(purchase); setModal("purchase"); }}>{purchase.no}</span> }, { key: "supplier", label: "Supplier" }, { key: "total", label: "Total", render: (purchase) => fmtNaira(purchase.total) }, { key: "date", label: "Date", render: (purchase) => formatDate(purchase.date) }, { key: "status", label: "Status", render: (purchase) => <select className="switch-select" value={purchase.status} onChange={(event) => { purchase.status = event.target.value; setInvoices([...dashboardDB.invoices]); }}>{poStatuses.map((status) => <option value={status} key={status}>{status}</option>)}</select> }]} data={dashboardDB.purchaseOrders} />;

  const renderQuotationTab = () => <AdminTable<Quotation> columns={[{ key: "ref", label: "Reference", render: (quotation) => <span className="mono link-cell" onClick={() => { setSelectedQuotation(quotation); setModal("quotation"); }}>{quotation.ref}</span> }, { key: "customer", label: "Customer" }, { key: "route", label: "Route" }, { key: "amount", label: "Amount", render: (quotation) => fmtNaira(quotation.amount ?? quoteTotal(quotation).total) }, { key: "status", label: "Status", render: (quotation) => <select className="switch-select" value={quotation.status} onChange={(event) => { quotation.status = event.target.value; setInvoices([...dashboardDB.invoices]); }}>{quotationStatuses.map((status) => <option value={status} key={status}>{status}</option>)}</select> }]} data={dashboardDB.quotations} />;

  const body = activeTab === "overview" ? renderOverview() : activeTab === "invoices" ? renderInvoiceTab() : activeTab === "expenses" ? renderExpenseTab() : activeTab === "payroll" ? renderPayrollTab() : activeTab === "purchase" ? renderPurchaseTab() : renderQuotationTab();

  return <>
    <div className="view-head"><div><h1>Finance</h1><p>Accounts, invoicing, payroll, purchase orders and quotations.</p></div><div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>{activeTab === "invoices" && <button className="btn btn-primary" onClick={() => setModal("new")}><span aria-hidden="true">+</span> New invoice</button>}{activeTab === "expenses" && <button className="btn btn-primary" onClick={() => showToast("New expense form is a stub in this prototype")}>＋ New expense</button>}{activeTab === "payroll" && <button className="btn btn-primary" onClick={() => showToast("New payroll form is a stub in this prototype")}>＋ New payroll entry</button>}{activeTab === "purchase" && <button className="btn btn-primary" onClick={() => showToast("New PO form is a stub in this prototype")}>＋ New purchase order</button>}{activeTab === "quotations" && <button className="btn btn-primary" onClick={() => showToast("New quotation form is a stub in this prototype")}>＋ New quotation</button>}</div></div>
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
