"use client";

import { useState } from "react";
import { jsPDF } from "jspdf";
import { AdminTable } from "./AdminTable";
import { dashboardDB, fmtNaira, type Invoice } from "@/lib/dashboard";

const financeTabs = [
  ["overview", "Overview"],
  ["invoices", "Invoices"],
  ["expenses", "Expenses"],
  ["payroll", "Payroll"],
  ["purchase", "Purchase orders"],
  ["quotations", "Quotations"],
] as const;

const invoiceStatuses = ["Paid", "Pending", "Overdue"];
let nextInvoiceSequence = 410;

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function invoiceVat(amount: number) {
  return Math.round(amount - amount / 1.075);
}

function invoiceRows(invoice: Invoice) {
  return invoice.items.map((item) => [item.desc, fmtNaira(item.amount)]);
}

function InvoiceDocument({ invoice }: { invoice: Invoice }) {
  const vat = invoiceVat(invoice.amount);
  const subtotal = invoice.amount - vat;
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
    <div className="doc-sign"><div className="line">Prepared by</div><div className="line">{invoice.status === "Paid" ? `Signed electronically, ${formatDate(invoice.date)}` : "Received by"}</div></div>
    {invoice.status === "Paid" && <div className="paid-stamp">PAID</div>}
  </div>;
}

export function Finance() {
  const [activeTab, setActiveTab] = useState<(typeof financeTabs)[number][0]>("overview");
  const [invoices, setInvoices] = useState<Invoice[]>(dashboardDB.invoices);
  const [modal, setModal] = useState<"new" | "detail" | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
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

  return <>
    <div className="view-head"><div><h1>Finance</h1><p>Accounts, invoicing, payroll, purchase orders and quotations.</p></div><div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>{activeTab === "invoices" && <button className="btn btn-primary" onClick={() => setModal("new")}><span aria-hidden="true">+</span> New invoice</button>}</div></div>
    <div className="tabs">{financeTabs.map(([key, label]) => <div className={`tab${activeTab === key ? " active" : ""}`} key={key} onClick={() => setActiveTab(key)}>{label}</div>)}</div>
    {activeTab === "invoices" ? <AdminTable<Invoice>
      columns={[
        { key: "no", label: "Invoice no.", render: (invoice) => <span className="mono link-cell" onClick={() => { setSelectedInvoice(invoice); setModal("detail"); }}>{invoice.no}</span> },
        { key: "customer", label: "Customer" },
        { key: "amount", label: "Amount", render: (invoice) => fmtNaira(invoice.amount) },
        { key: "date", label: "Date", render: (invoice) => formatDate(invoice.date) },
        { key: "status", label: "Status", render: (invoice) => <select className={`switch-select st-${invoice.status.toLowerCase()}`} value={invoice.status} onChange={(event) => updateInvoiceStatus(invoice, event.target.value)} aria-label={`Status: ${invoice.status}`}>{invoiceStatuses.map((status) => <option value={status} key={status}>{status}</option>)}</select> },
      ]}
      data={invoices}
    /> : <div />}
    {modal && <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
      <div className={modal === "detail" ? "modal doc-modal" : "modal"}>
        {modal === "new" ? <>
          <div className="modal-head"><h3>New invoice</h3><button className="x-btn" onClick={closeModal}>×</button></div>
          <div className="modal-body">
            <div className="field"><label>Tracking number (optional — auto-fills the rest)</label><input placeholder="e.g. JAAD/2807/2026/00231" value={tracking} onChange={(event) => setTracking(event.target.value)} onBlur={autofillFromTracking} /></div>
            <div className="grid g-2"><div className="field"><label>Customer</label><select value={customer} onChange={(event) => setCustomer(event.target.value)}><option value="">Choose a customer</option>{dashboardDB.customers.map((item) => <option key={item.name}>{item.name}</option>)}</select></div><div className="field"><label>Amount (₦, VAT-inclusive)</label><input type="number" placeholder="0" value={amount} onChange={(event) => setAmount(event.target.value)} /></div></div>
            <div className="field"><label>Description</label><input placeholder="e.g. Air freight, Lagos to Ikoyi" value={description} onChange={(event) => setDescription(event.target.value)} /></div>
            <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 2 }}>{hint}</div>
          </div>
          <div className="modal-foot"><button className="btn" onClick={closeModal}>Cancel</button><button className="btn btn-primary" onClick={saveInvoice}>Save invoice</button></div>
        </> : <>
          <div className="modal-head"><h3>{selectedInvoice?.no}</h3><button className="x-btn" onClick={closeModal}>×</button></div>
          {selectedInvoice && <div className="modal-body"><InvoiceDocument invoice={selectedInvoice} /></div>}
          {selectedInvoice && <div className="modal-foot"><button className="btn" onClick={closeModal}>Close</button><button className="btn" onClick={() => downloadInvoice(selectedInvoice)}>Download PDF</button><button className="btn btn-primary" onClick={() => window.print()}>Print</button></div>}
        </>}
      </div>
    </div>}
    {toast && <div className="toast-wrap"><div className="toast">{toast}</div></div>}
  </>;
}
