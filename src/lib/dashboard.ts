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
  paidDate?: string | null;
  linkedShipment: string | null;
  items: { desc: string; amount: number }[];
};

export type Expense = {
  cat: string;
  vendor: string;
  amount: number;
  date: string;
  status: string;
  items: { desc: string; amount: number }[];
};

export type Payroll = {
  name: string;
  role: string;
  gross: number;
  deductions: number;
};

export type Employee = {
  name: string;
  dept: string;
  role: string;
  status: string;
  email: string;
  phone: string;
  hired: string;
  photo: string;
  eoyVotes?: number;
};

export type Applicant = {
  name: string;
  role: string;
  stage: string;
};

export type JobPosting = {
  title: string;
  location: string;
  type: string;
  desc: string;
};

export type LeaveRequest = {
  name: string;
  type: string;
  from: string;
  to: string;
  status: string;
  reason: string;
  requestedOn: string;
};

export type SupportMessage = { from: string; text: string; time: string; img?: string; fileName?: string; automated?: boolean };
export type SupportTeamMessage = { who: string; text: string; time: string; img?: string; fileName?: string };
export type SupportChat = { id: string; visitor: string; lastSeen?: string; status: string; ticketId: string | null; messages: SupportMessage[]; waitingForAgent?: boolean; humanTookOver?: boolean; clearedIndex?: number };
export type SupportTicket = { id: string; customer: string; subject: string; priority: string; status: string; channel: string; opened: string; closed: string };
export type SupportEmail = { id: string; to: string; from?: string; cc: string; bcc: string; subject: string; body: string; invoiceNo: string; attachment: string; attachmentName: string; status: string; folder: string; date: string };
export type EmailTemplate = { id: string; name: string; subject: string; body: string };
export type SupportSms = { to: string; body: string; status: string; date: string };
export type SupportCall = { id: string; number: string; status: string; result: string; date: string; started?: number; ended?: number; duration: string };
export type WhatsAppMessage = { id: string; chatId: string; from: string; to: string; body: string; status: string; date: string; time: string; attachment?: string; attachmentName?: string };

export type PurchaseOrder = {
  no: string;
  supplier: string;
  total: number;
  status: string;
  items: string;
  date: string;
};

export type Quotation = {
  ref: string;
  customer: string;
  contact: string;
  route: string;
  mode: string;
  date: string;
  validUntil: string;
  status: string;
  amount?: number;
  items: { desc: string; qty: number; rate: number }[];
};

type FleetVehicle = {
  plate: string;
  type: string;
  status: string;
  driver: string;
  service: string;
  fuelL: number;
  insurer: string;
};
type Driver = {
  name: string;
  license: string;
  expiry: string;
  trips: number;
  rating: number;
  status: string;
};
type InventoryItem = {
  sku: string;
  name: string;
  qty: number;
  reorder: number;
  loc: string;
  status: string;
};
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
export const jobPostingsStorageKey = "jaad_job_postings";
export type AdminUser = { name: string; email: string; role: string; status: string };
export type AdminRole = { role: string; desc: string; users: number; perms: string[] };
export type AuditEntry = { who: string; action: string; time: string };
export type Integration = { name: string; status: string };
export type Announcement = { id: string; title: string; body: string; date?: string };

export const dashboardDB = {
  dismissedAlerts: [] as string[],
  announcements: [] as Announcement[],
  users: [
    { name: "Oluwaseun John", email: "oluwaseun@jaadlogistics.com", role: "Super Admin", status: "Active" },
    { name: "Abidoye Joseph Damilare", email: "admin@jaadlogistics.com", role: "Super Admin", status: "Active" },
    { name: "Kelechi Uche", email: "kelechi@jaadlogistics.com", role: "Operations Manager", status: "Active" },
    { name: "Fatima Sani", email: "fatima@jaadlogistics.com", role: "Customer Service", status: "Active" },
    { name: "Musa Bello", email: "musa@jaadlogistics.com", role: "Driver", status: "Suspended" },
  ] as AdminUser[],
  roles: [
    { role: "Super Admin", desc: "Full access to every module, including system settings and RBAC itself.", users: 1, perms: ["dashboard", "crm", "customers", "shipments", "fleet", "drivers", "warehouse", "finance", "hr", "support", "reports", "admin"] },
    { role: "Operations Manager", desc: "Runs day-to-day logistics: bookings, dispatch, fleet, drivers and warehouse.", users: 3, perms: ["dashboard", "shipments", "fleet", "drivers", "warehouse"] },
    { role: "Finance Officer", desc: "Handles invoicing, expenses, payroll and financial reporting.", users: 2, perms: ["dashboard", "finance", "reports"] },
    { role: "Customer Service", desc: "Manages leads, customer accounts and support tickets.", users: 4, perms: ["dashboard", "crm", "customers", "support"] },
    { role: "Driver", desc: "Sees only the shipments assigned to them.", users: 12, perms: ["shipments"] },
    { role: "Sales & Lead Manager", desc: "Owns the pipeline: capturing, qualifying and converting leads into customer accounts.", users: 2, perms: ["dashboard", "crm", "customers"] },
    { role: "CRM Specialist", desc: "Works leads day to day, logs notes and follow-ups. No access to finance or admin.", users: 3, perms: ["dashboard", "crm"] },
    { role: "Fleet Manager", desc: "Manages vehicles, driver assignment and maintenance schedules.", users: 2, perms: ["dashboard", "fleet", "drivers"] },
    { role: "Warehouse Manager", desc: "Manages inventory and stock levels.", users: 2, perms: ["dashboard", "warehouse"] },
    { role: "HR Manager", desc: "Handles employees, recruitment and leave requests.", users: 1, perms: ["dashboard", "hr"] },
    { role: "Support Agent", desc: "Handles tickets and live chat only.", users: 5, perms: ["dashboard", "support"] },
  ] as AdminRole[],
  auditLog: [
    { who: "Abidoye Joseph Damilare", action: "Created booking JAAD/0208/2026/00238", time: "2026-08-02 09:14" },
    { who: "Oluwaseun John", action: "Approved leave request for Tunde Fashola", time: "2026-08-01 16:40" },
    { who: "System", action: "Marked INV-00407 overdue", time: "2026-08-01 00:05" },
    { who: "Abidoye Joseph Damilare", action: "Generated manifest MNF/JAAD/3007/2026/005", time: "2026-07-30 08:05" },
  ] as AuditEntry[],
  integrations: [
    { name: "Supabase (Postgres, Auth, Realtime, Storage)", status: "Connected" },
    { name: "Google Maps", status: "Not connected" },
    { name: "Twilio", status: "Not connected" },
    { name: "WhatsApp Business API", status: "Not connected" },
    { name: "Paystack", status: "Not connected" },
    { name: "Flutterwave", status: "Not connected" },
    { name: "Stripe", status: "Not connected" },
    { name: "Postmark / Resend", status: "Connected" },
    { name: "Cloudflare Turnstile", status: "Connected" },
  ] as Integration[],
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
    { plate: "ABJ-220-KT", type: "Flatbed trailer", status: "Available", driver: "Musa Bello", service: "2026-09-14", fuelL: 2100, insurer: "AXA Mansard" },
    { plate: "KJA-441-XL", type: "Container truck", status: "Maintenance", driver: "Unassigned", service: "2026-08-04", fuelL: 1840, insurer: "AXA Mansard" },
    { plate: "LSD-118-BC", type: "20-ton haulage", status: "In Transit", driver: "Chidi Okafor", service: "2026-10-02", fuelL: 2650, insurer: "Leadway Assurance" },
    { plate: "ENU-902-QP", type: "10-ton box truck", status: "Out of service", driver: "Unassigned", service: "2026-08-20", fuelL: 900, insurer: "Leadway Assurance" },
    { plate: "PHC-055-RT", type: "Low-bed trailer", status: "Idle", driver: "Tunde Fashola", service: "2026-09-30", fuelL: 3100, insurer: "AXA Mansard" },
  ] as FleetVehicle[],
  drivers: [
    { name: "Musa Bello", license: "FCT-DL-88214", expiry: "2027-03-01", trips: 142, rating: 4.8, status: "Available" },
    { name: "Chidi Okafor", license: "LAG-DL-55021", expiry: "2026-11-12", trips: 98, rating: 4.6, status: "On trip" },
    { name: "Tunde Fashola", license: "LAG-DL-77310", expiry: "2026-08-19", trips: 76, rating: 4.4, status: "Available" },
    { name: "Grace Adeyemi", license: "OGN-DL-40217", expiry: "2027-01-05", trips: 54, rating: 4.9, status: "Off duty" },
  ] as Driver[],
  inventory: [
    { sku: "PKG-BOX-01", name: "Heavy duty cartons", qty: 340, reorder: 150, loc: "Lagos hub", status: "In stock" },
    { sku: "PKG-STR-02", name: "Strapping rolls", qty: 60, reorder: 80, loc: "Lagos hub", status: "Low stock" },
    { sku: "PKG-PLT-03", name: "Wooden pallets", qty: 210, reorder: 100, loc: "Port Harcourt yard", status: "In stock" },
    { sku: "PPE-VST-04", name: "Hi-vis safety vests", qty: 22, reorder: 30, loc: "Lagos hub", status: "Low stock" },
  ] as InventoryItem[],
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
  quotations: [
    { ref: "QUO-1042", customer: "EricBoss Furnitures", contact: "John, 0810 612 8219, 22 Paradise Street, Berger, Lagos", route: "Berger, Lagos to Ikoyi, Lagos", mode: "Air Freight", date: "2026-08-01", validUntil: "2026-08-16", status: "Pending", items: [{ desc: "250 x 4000 x 80, packaged units", qty: 12, rate: 45000 }, { desc: "210 x 4000 x 12, packaged units", qty: 12, rate: 38000 }, { desc: "70 x 4000 x 13, packaged units", qty: 13, rate: 22000 }] },
    { ref: "QUO-1041", customer: "Coastal Agro Exports", contact: "Peter Effiong, 0805 663 2210", route: "Port Harcourt to Lagos", mode: "Sea Freight", date: "2026-07-29", validUntil: "2026-08-12", status: "Pending", items: [{ desc: "Bagged produce, 26 tonnes", qty: 1, rate: 8900000 }] },
    { ref: "QUO-1038", customer: "Nova Retail Group", contact: "Blessing Eze, 0701 884 2093", route: "Lagos to Kano", mode: "Trucks / Haulage", date: "2026-07-20", validUntil: "2026-08-03", status: "Approved", items: [{ desc: "General retail goods, 20 tonnes", qty: 1, rate: 6100000 }] },
  ] as Quotation[],
  payroll: [
    { name: "Oluwaseun John", role: "Managing Director", gross: 1800000, deductions: 270000 },
    { name: "Abidoye Joseph Damilare", role: "Admin / Virtual Assistant", gross: 650000, deductions: 97500 },
    { name: "Musa Bello", role: "Long-Haul Driver", gross: 420000, deductions: 63000 },
  ] as Payroll[],
  employees: [
    { name: "Oluwaseun John", dept: "Executive", role: "Managing Director", status: "Active", email: "oluwaseun@jaadlogistics.com", phone: "0806 147 2153", hired: "2018", photo: "" },
    { name: "Abidoye Joseph Damilare", dept: "Administration", role: "Admin / Virtual Assistant", status: "Active", email: "admin@jaadlogistics.com", phone: "0806 147 2153", hired: "2023", photo: "" },
    { name: "Musa Bello", dept: "Operations", role: "Long-Haul Driver", status: "Active", email: "musa@jaadlogistics.com", phone: "0803 000 1111", hired: "2021", photo: "" },
    { name: "Chidi Okafor", dept: "Operations", role: "Long-Haul Driver", status: "Active", email: "chidi@jaadlogistics.com", phone: "0803 000 2222", hired: "2022", photo: "" },
    { name: "Grace Adeyemi", dept: "Operations", role: "Short-Haul Driver", status: "Active", email: "grace@jaadlogistics.com", phone: "0803 000 3333", hired: "2024", photo: "" },
  ] as Employee[],
  applicants: [
    { name: "Kelechi Uche", role: "Dispatch Supervisor", stage: "Interview" },
    { name: "Fatima Sani", role: "Customer Service Officer", stage: "Screening" },
    { name: "David Okon", role: "Fleet Maintenance Officer", stage: "Offer" },
  ] as Applicant[],
  leave: [
    { name: "Grace Adeyemi", type: "Annual", from: "2026-08-10", to: "2026-08-14", status: "Requested", reason: "Family event out of state.", requestedOn: "2026-07-30" },
    { name: "Tunde Fashola", type: "Sick", from: "2026-08-03", to: "2026-08-04", status: "Approved", reason: "Recovering from a minor injury.", requestedOn: "2026-08-01" },
  ] as LeaveRequest[],
  jobPostings: [] as JobPosting[],
  purchaseOrders: [
    { no: "PO-0114", supplier: "Berger Truck Parts", total: 310000, status: "Received", items: "Brake pads, service kit", date: "2026-07-25" },
    { no: "PO-0115", supplier: "SafetyFirst Nigeria", total: 145000, status: "Pending", items: "20 hi-vis vests, 10 hard hats", date: "2026-08-01" },
    { no: "PO-0116", supplier: "PalletCo Lagos", total: 220000, status: "Ordered", items: "150 wooden pallets", date: "2026-07-30" },
  ] as PurchaseOrder[],
  expenses: [
    { cat: "Fuel", vendor: "NNPC Retail Ikeja", amount: 840000, date: "2026-07-30", status: "Paid", items: [{ desc: "Diesel, ABJ-220-KT and LSD-118-BC", amount: 520000 }, { desc: "Diesel, PHC-055-RT", amount: 320000 }] },
    { cat: "Maintenance", vendor: "Berger Truck Parts", amount: 310000, date: "2026-07-29", status: "Paid", items: [{ desc: "KJA-441-XL brake service", amount: 210000 }, { desc: "General parts stock", amount: 100000 }] },
    { cat: "Toll & levies", vendor: "Lagos-Ibadan expressway", amount: 64000, date: "2026-08-01", status: "Unpaid", items: [{ desc: "Toll charges, July", amount: 64000 }] },
  ] as Expense[],
  trackingEvents: {
    s1: [["2026-07-28 07:10", "Booked, awaiting pickup"], ["2026-07-28 09:40", "Picked up, Lagos"], ["2026-07-28 14:05", "Departed origin hub"], ["2026-07-28 19:20", "Arrived Ikoyi facility"], ["2026-07-29 08:15", "Delivered, signed by FRANCO"]],
    s3: [["2026-07-30 06:30", "Booked, awaiting pickup"], ["2026-07-30 08:00", "Picked up, Lagos"], ["2026-07-30 09:20", "Manifested onto MNF/JAAD/3007/2026/005"], ["2026-08-01 03:10", "Passed Ibadan checkpoint"], ["2026-08-02 06:45", "In transit, approaching Kaduna"]],
    s7: [["2026-08-02 07:00", "Booked, awaiting pickup"], ["2026-08-02 09:30", "Picked up, Lagos"], ["2026-08-02 13:10", "Exception: incorrect delivery address on file"]],
  } as Record<string, string[][]>,
  tickets: [
    { id: "TCK-2291", customer: "Doyetek Industries", subject: "Shipment JAAD/3007/2026/00233 delayed at Kaduna", priority: "High", status: "Open", channel: "WhatsApp", opened: "2026-08-02 09:10", closed: "" },
    { id: "TCK-2290", customer: "Zenith Manufacturing", subject: "Delivery address needs correction", priority: "Urgent", status: "Open", channel: "Call", opened: "2026-08-02 08:20", closed: "" },
    { id: "TCK-2287", customer: "EricBoss Furnitures", subject: "Requesting proof of delivery copy", priority: "Low", status: "Resolved", channel: "Email", opened: "2026-07-29 11:00", closed: "2026-07-29 15:40" },
  ] as SupportTicket[],
  chats: [
    { id: "c1", visitor: "Website visitor, Chika A.", lastSeen: "2m ago", status: "Open", ticketId: null, messages: [{ from: "visitor", text: "Hi, how much to move 2 pallets from Lagos to Abuja?", time: "09:41" }, { from: "agent", text: "Hi Chika, thanks for reaching out. Could you share the weight and preferred pickup date?", time: "09:43" }, { from: "visitor", text: "About 600kg total, pickup any day this week works.", time: "09:44" }] },
    { id: "c2", visitor: "Website visitor, Emeka O.", lastSeen: "19m ago", status: "Pending", ticketId: null, messages: [{ from: "visitor", text: "Do you handle customs clearance for imports?", time: "09:20" }, { from: "agent", text: "Yes, we assist with customs brokerage on imports and exports. What are you bringing in?", time: "09:25" }] },
    { id: "c3", visitor: "Website visitor, Rita B.", lastSeen: "1h ago", status: "Resolved", ticketId: null, messages: [{ from: "visitor", text: "Is same-day pickup available in Lagos?", time: "08:30" }] },
  ] as SupportChat[],
  teamChat: [
    { who: "Kelechi Uche", text: "Morning team, heads up that the Kano route truck (KJA-441-XL) is in for brake service today.", time: "08:15" },
    { who: "Fatima Sani", text: "Noted, I will let Nova Retail Group know their pickup may shift by a few hours.", time: "08:20" },
  ] as SupportTeamMessage[],
  kb: [
    { q: "What services do you offer?", a: "Truck hire, cargo transportation, interstate deliveries, heavy equipment transportation, business logistics, corporate haulage, dedicated truck services and scheduled deliveries." },
    { q: "What areas do you cover?", a: "All 36 states in Nigeria, including Lagos, Abuja, Port Harcourt, Kano, Ibadan, Benin, Enugu, Aba, Onitsha and Kaduna." },
    { q: "Can I track my shipment?", a: "Yes. Every shipment gets a JAAD tracking number and status updates are available in Shipment Operations > Tracking." },
    { q: "Do you deliver on weekends?", a: "Standard delivery runs Monday to Saturday, 8am to 6pm. Emergency haulage requests may be accommodated." },
  ] as { q: string; a: string }[],
  emails: [] as SupportEmail[],
  emailTemplates: [
    { id: "tpl1", name: "Invoice Sent", subject: "Invoice {{invoice}} from JAAD Logistics", body: "Hello {{customer}},\n\nPlease find your invoice {{invoice}} attached/available in your JAAD account.\n\nRegards,\nJAAD Logistics Ltd" },
    { id: "tpl2", name: "Shipment Update", subject: "Shipment update {{tracking}}", body: "Hello {{customer}},\n\nYour shipment {{tracking}} has been updated.\n\nRegards,\nJAAD Logistics Ltd" },
  ] as EmailTemplate[],
  smsMessages: [] as SupportSms[],
  calls: [] as SupportCall[],
  whatsappMessages: [] as WhatsAppMessage[],
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

export function invoiceVat(amount: number) {
  return Math.round(amount - amount / 1.075);
}

export function invoiceSubtotal(amount: number) {
  return amount - invoiceVat(amount);
}

export function quoteTotal(quote: Quotation) {
  const subtotal = quote.items.reduce((sum, item) => sum + item.qty * item.rate, 0);
  const vat = Math.round(subtotal * 0.075);
  return { subtotal, vat, total: subtotal + vat };
}

export function computeFinance() {
  const VAT_RATE = 0.075;
  const paidInvoices = dashboardDB.invoices.filter((invoice) => invoice.status === "Paid");
  const revenue = paidInvoices.reduce((sum, invoice) => sum + invoiceSubtotal(invoice.amount), 0);
  const vat = paidInvoices.reduce((sum, invoice) => sum + invoiceVat(invoice.amount), 0);
  const expenses = dashboardDB.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const expenseCount = dashboardDB.expenses.length;
  const profit = revenue - expenses;
  const maintenanceSpend = dashboardDB.expenses.filter((expense) => expense.cat === "Maintenance").reduce((sum, expense) => sum + expense.amount, 0);
  const pendingInvoices = dashboardDB.invoices.filter((invoice) => invoice.status === "Pending" || invoice.status === "Overdue");
  const pendingInvoiceCount = pendingInvoices.length;
  const pendingInvoiceTotal = pendingInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const payrollGross = dashboardDB.payroll.reduce((sum, person) => sum + person.gross, 0);
  const payrollDeductions = dashboardDB.payroll.reduce((sum, person) => sum + person.deductions, 0);
  const payrollNet = payrollGross - payrollDeductions;
  const netAfterAll = revenue - expenses - payrollNet;
  return {
    revenue,
    expenses,
    expenseCount,
    profit,
    maintenanceSpend,
    pendingInvoiceCount,
    pendingInvoiceTotal,
    payrollGross,
    payrollDeductions,
    payrollNet,
    vat,
    netAfterAll,
    VAT_RATE,
  };
}

export function fmtNaira(value: number) {
  return `₦${(Number(value) || 0).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}
