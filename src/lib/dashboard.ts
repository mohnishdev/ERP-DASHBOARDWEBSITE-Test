export type Booking = {
  id: string;
  tracking: string;
  customer: string;
  origin: string;
  destination: string;
  type: string;
  status: string;
  pickup: string;
  weight: string;
  value: number;
  notes: string;
};

type FleetVehicle = { plate: string; status: string };
type Driver = { name: string; status: string };
type Lead = { priority: string };
type Invoice = { amount: number; status: string };
type Expense = { amount: number; cat: string };
type Ticket = { status: string };
type Announcement = { id: string; title: string; body: string };

export const dashboardDB = {
  dismissedAlerts: [] as string[],
  announcements: [] as Announcement[],
  bookings: [
    { id: "s1", tracking: "JAAD/2807/2026/00231", customer: "EricBoss Furnitures", origin: "Lagos", destination: "Ikoyi, Lagos", type: "Air", status: "Delivered", pickup: "2026-07-28", weight: "840kg", value: 2100000, notes: "Signed by FRANCO on arrival." },
    { id: "s2", tracking: "JAAD/2907/2026/00232", customer: "Arbico PLC", origin: "Lagos", destination: "Port Harcourt", type: "Haulage", status: "Delivered", pickup: "2026-07-29", weight: "12t", value: 4600000, notes: "" },
    { id: "s3", tracking: "JAAD/3007/2026/00233", customer: "Doyetek Industries", origin: "Lagos", destination: "Kano", type: "Haulage", status: "In Transit", pickup: "2026-07-30", weight: "18t", value: 5200000, notes: "On manifest MNF/JAAD/3007/2026/005." },
    { id: "s4", tracking: "JAAD/0108/2026/00234", customer: "Sahara Textiles", origin: "Lagos", destination: "Ibadan", type: "Road", status: "Assigned", pickup: "2026-08-01", weight: "3.2t", value: 980000, notes: "" },
    { id: "s5", tracking: "JAAD/0108/2026/00236", customer: "Nova Retail Group", origin: "Lagos", destination: "Kano", type: "Haulage", status: "Assigned", pickup: "2026-08-01", weight: "20t", value: 6100000, notes: "" },
    { id: "s6", tracking: "JAAD/0208/2026/00237", customer: "Coastal Agro Exports", origin: "Port Harcourt", destination: "Lagos", type: "Sea", status: "Pending", pickup: "2026-08-02", weight: "26t", value: 8900000, notes: "" },
    { id: "s7", tracking: "JAAD/0208/2026/00238", customer: "Zenith Manufacturing", origin: "Lagos", destination: "Enugu", type: "Road", status: "Exception", pickup: "2026-08-02", weight: "1.4t", value: 410000, notes: "Delivery address incomplete, awaiting confirmation." },
    { id: "s8", tracking: "JAAD/2607/2026/00229", customer: "Ubuntu Foods Ltd", origin: "Lagos", destination: "Aba", type: "Road", status: "Cancelled", pickup: "2026-07-26", weight: "1.1t", value: 260000, notes: "Customer cancelled before pickup, no charge." },
  ] as Booking[],
  fleet: [
    { plate: "ABJ-220-KT", status: "Available" },
    { plate: "KJA-441-XL", status: "Maintenance" },
    { plate: "LSD-118-BC", status: "In Transit" },
    { plate: "ENU-902-QP", status: "Out of service" },
    { plate: "PHC-055-RT", status: "Idle" },
  ] as FleetVehicle[],
  drivers: [
    { name: "Musa Bello", status: "Available" },
    { name: "Chidi Okafor", status: "On trip" },
    { name: "Tunde Fashola", status: "Available" },
    { name: "Grace Adeyemi", status: "Off duty" },
  ] as Driver[],
  leads: ["Warm", "Hot", "Hot", "Cold", "Warm", "Hot"].map((priority) => ({ priority })) as Lead[],
  invoices: [
    { amount: 2100000, status: "Paid" },
    { amount: 4600000, status: "Paid" },
    { amount: 5200000, status: "Overdue" },
    { amount: 600000, status: "Pending" },
  ] as Invoice[],
  expenses: [
    { amount: 840000, cat: "Fuel" },
    { amount: 310000, cat: "Maintenance" },
    { amount: 64000, cat: "Toll & levies" },
  ] as Expense[],
  tickets: [{ status: "Open" }, { status: "Open" }, { status: "Resolved" }] as Ticket[],
};

export const shipmentColors: Record<string, string> = { Pending: "#ca8a04", Assigned: "#2563c7", "In Transit": "#7c3aed", Delivered: "#1f9d5c", Cancelled: "#63676f" };
export const fleetColors: Record<string, string> = { Available: "#1f9d5c", "In Transit": "#2563c7", Maintenance: "#ca8a04", "Out of service": "#e2362b" };

function countBy<T>(items: T[], getValue: (item: T) => string, keys: string[]) {
  const counts = Object.fromEntries(keys.map((key) => [key, 0]));
  items.forEach((item) => {
    const value = getValue(item);
    if (value in counts) counts[value] += 1;
  });
  return counts;
}

export function shipmentCounts() {
  return countBy(dashboardDB.bookings, (booking) => booking.status, ["Pending", "Assigned", "In Transit", "Delivered", "Cancelled"]);
}

export function fleetCounts() {
  return countBy(dashboardDB.fleet, (vehicle) => vehicle.status, ["Available", "In Transit", "Maintenance", "Out of service"]);
}

export function driverCounts() {
  return countBy(dashboardDB.drivers, (driver) => driver.status, ["Available", "On trip", "Off duty"]);
}

export function leadPriorityCounts() {
  return countBy(dashboardDB.leads, (lead) => lead.priority, ["Hot", "Warm", "Cold"]);
}

export function invoiceStatusCounts() {
  return countBy(dashboardDB.invoices, (invoice) => invoice.status, ["Paid", "Pending", "Overdue"]);
}

export function ticketStatusCounts() {
  return countBy(dashboardDB.tickets, (ticket) => ticket.status, ["Open", "Resolved"]);
}

function invoiceVat(amount: number) {
  return Math.round(amount - amount / 1.075);
}

export function computeFinance() {
  const paidInvoices = dashboardDB.invoices.filter((invoice) => invoice.status === "Paid");
  const revenue = paidInvoices.reduce((sum, invoice) => sum + invoice.amount - invoiceVat(invoice.amount), 0);
  const expenses = dashboardDB.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const maintenanceSpend = dashboardDB.expenses.filter((expense) => expense.cat === "Maintenance").reduce((sum, expense) => sum + expense.amount, 0);
  const pendingInvoices = dashboardDB.invoices.filter((invoice) => invoice.status === "Pending" || invoice.status === "Overdue");
  return {
    revenue,
    expenses,
    expenseCount: dashboardDB.expenses.length,
    profit: revenue - expenses,
    maintenanceSpend,
    pendingInvoiceCount: pendingInvoices.length,
    pendingInvoiceTotal: pendingInvoices.reduce((sum, invoice) => sum + invoice.amount, 0),
  };
}

export function fmtNaira(value: number) {
  return `₦${(Number(value) || 0).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}
