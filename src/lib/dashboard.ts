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

export type Invoice = {
  no: string;
  customer: string;
  amount: number;
  status: string;
  date: string;
  linkedShipment: string | null;
  items: { desc: string; amount: number }[];
};

type FleetVehicle = { plate: string; status: string };
type Driver = { name: string; status: string };
export type Lead = {
  id: string;
  company: string;
  contactName: string;
  jobTitle: string;
  email: string;
  phone: string;
  source: string;
  industry: string;
  priority: string;
  status: string;
  assignedTo: string;
  followUp: string;
  transportMode: string;
  cargoType: string;
  origin: string;
  destination: string;
  frequency: string;
  volume: string;
  currentProvider: string;
  requirements: string;
  value: number;
  notesLog: { t: string; by: string; text: string }[];
};

export type Customer = {
  name: string;
  type: string;
  contact: string;
  credit: number;
  balance: number;
  since: string;
  status: string;
  assignedTo?: string;
};
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
  customers: [
    { name: "EricBoss Furnitures", type: "B2B", contact: "John, 0810 612 8219", credit: 3000000, balance: 0, since: "2024", status: "Active" },
    { name: "Arbico PLC", type: "B2B", contact: "Franco, Ikoyi Lagos", credit: 8000000, balance: 1200000, since: "2022", status: "Active" },
    { name: "Doyetek Industries", type: "B2B", contact: "Ops desk, Lagos", credit: 6000000, balance: 0, since: "2023", status: "Active" },
    { name: "Sahara Textiles", type: "B2B", contact: "Aisha Mohammed", credit: 1500000, balance: 0, since: "2026", status: "On hold" },
  ] as Customer[],
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
  leads: [
    { id: "ld1", company: "Sahara Textiles", contactName: "Aisha Mohammed", jobTitle: "Procurement Lead", email: "aisha@saharatextiles.ng", phone: "0803 221 4471", source: "Website", industry: "Textiles & Apparel", priority: "Warm", status: "Qualified", assignedTo: "Abidoye Joseph Damilare", followUp: "2026-08-08", transportMode: "Trucks / Haulage", cargoType: "Bales of fabric", origin: "Lagos", destination: "Ibadan", frequency: "Monthly", volume: "3.2t per run", currentProvider: "GIG Logistics", requirements: "Needs weekend pickup availability", value: 980000, notesLog: [{ t: "2026-07-20 10:00", by: "Abidoye Joseph Damilare", text: "Initial inquiry via website contact form." }, { t: "2026-07-25 14:30", by: "Abidoye Joseph Damilare", text: "Sent rate card, awaiting response." }] },
    { id: "ld2", company: "Coastal Agro Exports", contactName: "Peter Effiong", jobTitle: "Logistics Manager", email: "peter@coastalagro.com", phone: "0805 663 2210", source: "Referral", industry: "Agro exports", priority: "Hot", status: "Contacted", assignedTo: "Oluwaseun John", followUp: "2026-08-04", transportMode: "Sea Freight", cargoType: "Bagged produce", origin: "Port Harcourt", destination: "Lagos", frequency: "Weekly", volume: "26t per run", currentProvider: "None currently", requirements: "Temperature-sensitive handling for some SKUs", value: 8900000, notesLog: [{ t: "2026-07-27 09:15", by: "Oluwaseun John", text: "Referred by Arbico PLC. Called to introduce JAAD services." }] },
    { id: "ld3", company: "Nova Retail Group", contactName: "Blessing Eze", jobTitle: "Supply Chain Director", email: "blessing@novaretail.ng", phone: "0701 884 2093", source: "Social Media", industry: "Retail", priority: "Hot", status: "Won", assignedTo: "Abidoye Joseph Damilare", followUp: "", transportMode: "Trucks / Haulage", cargoType: "General retail goods", origin: "Lagos", destination: "Kano", frequency: "Monthly", volume: "20t per run", currentProvider: "DHL Nigeria", requirements: "Needs proof of delivery photos every run", value: 6100000, notesLog: [{ t: "2026-07-10 11:00", by: "Abidoye Joseph Damilare", text: "Reached out via Instagram DM." }, { t: "2026-07-22 16:40", by: "Abidoye Joseph Damilare", text: "Signed haulage contract, converted to customer." }] },
    { id: "ld4", company: "Benin Timber Co.", contactName: "Osaze Igbinedion", jobTitle: "Operations Head", email: "osaze@benintimber.com", phone: "0812 440 7761", source: "WhatsApp", industry: "Timber & construction materials", priority: "Cold", status: "New", assignedTo: "None", followUp: "2026-08-12", transportMode: "Cargo", cargoType: "Timber planks", origin: "Benin City", destination: "Lagos", frequency: "One-time", volume: "8t", currentProvider: "", requirements: "", value: 2500000, notesLog: [{ t: "2026-08-01 12:20", by: "System", text: "Inbound WhatsApp enquiry logged automatically." }] },
    { id: "ld5", company: "Zenith Manufacturing", contactName: "Uche Nnamdi", jobTitle: "Plant Manager", email: "uche@zenithmfg.ng", phone: "0909 112 5540", source: "Cold Call", industry: "Manufacturing", priority: "Warm", status: "Lost", assignedTo: "Oluwaseun John", followUp: "", transportMode: "Trucks / Haulage", cargoType: "Machine parts", origin: "Lagos", destination: "Enugu", frequency: "Quarterly", volume: "1.4t", currentProvider: "Kobo Logistics", requirements: "", value: 900000, notesLog: [{ t: "2026-06-18 10:00", by: "Oluwaseun John", text: "Quoted, price was above their budget." }, { t: "2026-06-30 09:00", by: "Oluwaseun John", text: "Confirmed lost to a cheaper competitor." }] },
    { id: "ld6", company: "Kaduna AutoParts Hub", contactName: "Ibrahim Yakubu", jobTitle: "Owner", email: "ibrahim@kdautoparts.com", phone: "0706 220 9981", source: "Trade Show", industry: "Automotive parts", priority: "Hot", status: "Proposal Sent", assignedTo: "Abidoye Joseph Damilare", followUp: "2026-08-06", transportMode: "Trucks / Haulage", cargoType: "Auto parts, palletised", origin: "Lagos", destination: "Kaduna", frequency: "Weekly", volume: "4.5t per run", currentProvider: "ABC Transport Cargo", requirements: "Needs proof of delivery photos every run", value: 1450000, notesLog: [{ t: "2026-07-29 15:00", by: "Abidoye Joseph Damilare", text: "Met at the Lagos Trade Fair. Sent proposal same day." }] },
  ] as Lead[],
  invoices: [
    { no: "INV-00405", customer: "EricBoss Furnitures", amount: 2100000, status: "Paid", date: "2026-07-28", linkedShipment: null, items: [{ desc: "Air freight, Lagos to Ikoyi", amount: 2100000 }] },
    { no: "INV-00406", customer: "Arbico PLC", amount: 4600000, status: "Paid", date: "2026-07-29", linkedShipment: null, items: [{ desc: "Haulage, Lagos to Port Harcourt", amount: 4600000 }] },
    { no: "INV-00407", customer: "Doyetek Industries", amount: 5200000, status: "Overdue", date: "2026-07-14", linkedShipment: null, items: [{ desc: "Haulage, Lagos to Kano", amount: 5200000 }] },
    { no: "INV-00408", customer: "Nova Retail Group", amount: 600000, status: "Pending", date: "2026-08-01", linkedShipment: null, items: [{ desc: "Balance on haulage contract, August", amount: 600000 }] },
  ] as Invoice[],
  trackingEvents: {
    s1: [["2026-07-28 07:10", "Booked, awaiting pickup"], ["2026-07-28 09:40", "Picked up, Lagos"], ["2026-07-28 14:05", "Departed origin hub"], ["2026-07-28 19:20", "Arrived Ikoyi facility"], ["2026-07-29 08:15", "Delivered, signed by FRANCO"]],
    s3: [["2026-07-30 06:30", "Booked, awaiting pickup"], ["2026-07-30 08:00", "Picked up, Lagos"], ["2026-07-30 09:20", "Manifested onto MNF/JAAD/3007/2026/005"], ["2026-08-01 03:10", "Passed Ibadan checkpoint"], ["2026-08-02 06:45", "In transit, approaching Kaduna"]],
    s7: [["2026-08-02 07:00", "Booked, awaiting pickup"], ["2026-08-02 09:30", "Picked up, Lagos"], ["2026-08-02 13:10", "Exception: incorrect delivery address on file"]],
  } as Record<string, string[][]>,
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
