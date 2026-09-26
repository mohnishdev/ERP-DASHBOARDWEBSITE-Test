# `index.html` To React Migration Map

Step 1 planning artifact. This maps the public site and the customer/admin applications embedded in `index.html` to the current Next.js App Router code. No application code was moved or changed to create this map. `admin.html` was not used as source; the existing React admin implementation is treated as the reuse target.

## Status Key

- **REUSE**: an existing React route/component is the intended target; compare behavior and markup before changing it.
- **PARTIAL**: a React equivalent exists but is not yet behaviorally or visually equivalent.
- **MISSING**: no current React route/component equivalent was found.
- **UNRESOLVED**: legacy navigation or rendering refers to a target whose source markup is absent or contradictory.
- **LEGACY-ONLY**: behavior exists in `index.html` but has no current React equivalent; migrate only as its own approved slice.

These labels describe code presence, not a claim of pixel-perfect or complete feature parity.

## Application Boundaries

| Legacy area | Legacy root / destination | Existing React target | Mapping status and boundary |
| --- | --- | --- | --- |
| Public website | `#publicSite`; `/` and its hash sections | `/` -> `src/app/page.tsx` -> `src/components/Landing.tsx` | **PARTIAL / REUSE**. The landing route/component already exists; reconcile and extend it rather than creating another landing page. |
| Customer application | `#customerApp`, `#csidebar`, `#ctopbar`, `#cmain`; `custNavigate(view)` | `/customer` -> `src/app/customer/page.tsx` -> `src/components/customer/CustomerPortal.tsx` | **PARTIAL / REUSE**. A customer-only shell and Overview now use shared `AppContext` mock data. Other customer views remain unmigrated. `AdminShell` continues to reject non-admin users; customer routes use a separate gate. |
| Admin ERP | `#app`, `#sidebar`, `#topbar`, `#main`; `navigate(view)` | Existing `/admin/*` routes, `AdminShell`, sidebar/topbar, and module components | **REUSE / PARTIAL**. Reuse current React pages and compare each legacy view to its existing module; do not build a second admin shell inside `Landing`. |

## Public Landing Screens And Destinations

Sections below are one public page with hash navigation, not separate Next routes.

| Legacy screen/anchor | Existing React target | Existing coverage | Remaining gap / legacy-only behavior |
| --- | --- | --- | --- |
| Home / brand, `#home` | `Landing` header and hero at `/` | Header logo now links to `#home`; hero is present. | Header action set and mobile navigation differ. The embedded legacy logo and local React PNG have not been proven visually equivalent. |
| Services, `#services` | `Landing` services section | Six service cards are represented. | Compare any remaining exact markup/copy differences before altering. |
| Booking steps, section has no ID | `Landing` `.steps` section | Five steps are represented. | There is no standalone route; retain as a section of the landing page. |
| Coverage, `#coverage` | `Landing` coverage section | Coverage copy, city list, and coverage stat are represented. | No separate route. |
| Tracking, `#track` | `Landing` tracking section | Input/button/notice are present. | Legacy empty/match/no-match handling and booking-document result are **LEGACY-ONLY**. Keep tracking lookup as a separate behavior slice. |
| About, `#about` | `Landing` About section | Legacy Vision/Mission/Purpose copy is represented. | No separate route. |
| Quote/contact, `#contact` | `Landing` contact section | Static quote fields and contact information are represented. | Legacy submit validates fields, writes CRM lead/quotation/chat records, persists, notifies, confirms, and resets. React submission is not equivalent; keep it as a separate data/behavior slice. |
| Careers, `#careers` links | No current landing section/component | Legacy links and later renderer functions exist. | **UNRESOLVED**. `index.html` has no `#careers`/`#careersPanel` target in the static public markup, while `renderPublicCareers()` depends on `#careersPanel`. Preserve the literal reference if needed; do not invent a destination or migrate HR posting management as a shortcut. |
| Public footer | Existing footer in `Landing` | Legacy social links/icons, Careers/policy references, and copyright/build text have been added as static content. | Existing React footer layout still contains React-specific CTA/columns. Pixel/structure reconciliation is a later, explicitly scoped static comparison; links do not imply legal/Careers behavior exists. |

## Login Entry Flows

Keep customer and admin entry flows distinct. Sharing an account helper does not mean sharing their screen, destination, or authorization rules.

| Legacy entry | Legacy outcome | Existing React target | Remaining gap / boundary |
| --- | --- | --- | --- |
| Customer “Sign up / Login” | Opens `#custAuthOverlay`, switches login/signup forms; legacy auth then calls `enterApp()` to show the customer shell for a customer account. | `Landing` customer verification now routes to `/customer`; the route renders `CustomerPortal` and uses shared `AppContext` session state. | **PARTIAL**. Demo customer login/signup reaches Overview. The customer-specific screens after Overview remain pending; auth remains the existing mock verification flow. |
| Admin header entry | Opens `#adminAuthOverlay`, then legacy `enterApp()` shows `#app`. | Public header links to `/admin/login`; `src/app/admin/login/page.tsx` renders `src/components/AdminAuth.tsx`; successful verification targets `/admin/dashboard` inside `AdminShell`. | **PARTIAL / REUSE**. The route exists but interaction and modal structure differ. Reuse the admin route; do not reproduce admin auth in the customer flow. |
| Demo verification | Legacy later script displays a generated verification code in-page and switches the public root to an app shell. | `Landing` has its own verification UI; `AdminAuth` has a separate admin verification UI. | **PARTIAL**. Preserve separation and compare each flow independently. Do not port plaintext/demo credential handling as production authentication. |

## Customer Application Views

Legacy customer destination keys are registered around `custNavigate(view)` and render into `#cmain`. The React customer shell and Overview are implemented at `/customer`; the other customer destinations listed below remain unmigrated.

| Legacy destination/view | Main legacy content/behavior | React target to reuse | Mapping status |
| --- | --- | --- | --- |
| `overview` | Shipment/invoice/support/announcement summaries | `/customer` -> `src/components/customer/CustomerPortal.tsx`, using `AppContext.DB` | **PARTIAL**. Customer-filtered shipment/invoice KPIs, announcements, and recent shipments render. Detail links and other destinations remain for later slices. |
| `shipments` | Customer-filtered bookings, detail, and booking modal | `/customer/shipments` -> `src/components/customer/CustomerPortal.tsx`, using shared `AppContext.DB` booking data | **PARTIAL**. Customer-filtered five-column list and read-only customer-safe shipment detail dialog with tracking history are implemented. Booking modal/submission and print/PDF actions remain pending; admin-only invoice issuance is omitted. |
| `track` | Customer tracking input and result region; legacy handler calls shared `doTrack()` | `/customer/track` -> `src/components/customer/CustomerPortal.tsx` | **PARTIAL**. Customer-scoped exact lookup, blank-result clearing, no-match handling, and shipment/history rendering are implemented. Shared PDF/print actions and any backend/live-tracking behavior remain pending. Public/admin tracking data is not exposed through this customer lookup. |
| `invoices` | Customer-filtered invoices, details, print/PDF | `/customer/invoices` -> `src/components/customer/CustomerPortal.tsx`, using shared `AppContext.DB` invoice data | **PARTIAL**. Customer-filtered posted-invoice list with legacy Invoice/Date/Amount/Status columns is implemented. Invoice detail, print, and PDF actions remain pending; admin Finance UI is not reused as customer UI. |
| `support` | Customer chat, attachment sending, polling/updates | `/customer/support` -> `src/components/customer/CustomerPortal.tsx`; shares the existing `SupportChat` shape and `jaad_erp_state_v3` `data.chats` slot | **PARTIAL**. Customer text thread, resolved banner, and message send are implemented. File attachments, polling for admin replies, notifications, and live synchronization are pending. The admin Support component itself was not modified. |
| `profile` | Customer profile form, photo preview, local save/password UI | `/customer/profile` -> `src/components/customer/CustomerPortal.tsx`, using `AppContext` customer identity and customer contact data | **PARTIAL**. Legacy Profile structure and fields are implemented. Photo selection, save, and password buttons are intentionally inert; their legacy handlers only provide mock notices and remain a separate behavior slice. |
| Calculator modal | Shared calculator overlay opened from customer app | No calculator page was found; `src/app/admin/calculator/` is empty | **MISSING**. Confirm whether this is still required before allocating a screen. |

## Admin Navigation And Reuse Map

The legacy admin shell has a renderer registry and nested module tabs. Existing React modules/routes below are the reuse targets; this map does not claim all behavior/detail views are already equivalent.

| Legacy destination | Legacy subviews/tabs | Existing React route/component | Reuse status / migration note |
| --- | --- | --- | --- |
| `dashboard` | Overview, breakdown | `/admin/dashboard` -> `DashboardPage` -> `Dashboard` | **REUSE / PARTIAL**. Compare tabs, summary calculations, and any legacy-only dashboard widgets. |
| `crm` | Pipeline, leads and lead detail/edit/import flows | `/admin/crm-leads` -> `CRMLeadsPage` -> `CRMLeads` | **REUSE / PARTIAL**. CRM component exists; compare each tab/modal/operation before creating anything. |
| `customers` | Customer list, detail/profile, links to leads/invoices, assignment/import/export | `/admin/customers` -> `CustomerManagementPage` -> `CustomerManagement` | **REUSE / PARTIAL**. Do not duplicate customer-management screens under the customer portal. |
| `shipments` | Bookings, dispatch, tracking, manifests, POD, returns | `/admin/shipments` -> `ShipmentsPage` -> `Shipments` | **REUSE / PARTIAL**. One React module owns the shipment areas; compare subviews and document actions individually. |
| `fleet` | Vehicles, maintenance, fuel, insurance | `/admin/fleet` -> `FleetPage` -> `Fleet` | **REUSE / PARTIAL**. Existing fleet module. |
| `drivers` | Profiles, performance | `/admin/drivers` -> `DriversPage` -> `DriverManagement` | **REUSE / PARTIAL**. Existing driver module. |
| `warehouse` | Inventory and reorder levels | `/admin/warehouse` -> `WarehousePage` -> `Warehouse` | **REUSE / PARTIAL**. Purchase orders are a Finance view in the current app. |
| `finance` | Overview, invoices, expenses, payroll, purchase orders, quotations | `/admin/finance` -> `FinancePage` -> `Finance` | **REUSE / PARTIAL**. Existing finance tabs/documents; compare static and interactive details by tab. |
| `hr` | Employees, recruitment, postings, leave, EOY | `/admin/hr` -> `HRPage` -> `HR` | **REUSE / PARTIAL**. Existing HR module. Public Careers is a separate unresolved landing target; do not conflate it with HR management. |
| `support` | Tickets, live chat, team chat, knowledge base | `/admin/support` -> `SupportPage` -> `Support` | **REUSE / PARTIAL**. Existing admin-facing support tabs. Public chat widget and customer support portal are separate experiences. |
| `email` | Inbox, compose, sent, drafts, templates | `/admin/support` -> `Support` with `currentView === "email"` | **REUSE / PARTIAL**. Existing communications UI shares the Support route/component, not a separate `/admin/email` route. |
| `sms` | Compose, sent | `/admin/support` -> `Support` with `currentView === "sms"` | **REUSE / PARTIAL**. Existing local communication view; live delivery requires provider integration. |
| `call` | Dialer, log | `/admin/support` -> `Support` with `currentView === "call"` | **REUSE / PARTIAL**. Existing local call-log/simulation view; no live telephony provider implied. |
| `whatsapp` | Compose/log/conversations | `/admin/support` -> `Support` with `currentView === "whatsapp"` | **REUSE / PARTIAL**. Existing local communication view; no live WhatsApp connection implied. |
| `reports` | Operations, finance, HR, fleet, sales reports/export choices | No `/admin/reports` page or Reports component found | **MISSING**. Existing data/export helpers in other modules are not a full Reports screen. |
| `admin` | Users, roles, announcements, audit, integrations | `/admin/admin` -> `AdministrationPage` -> `Administration` | **REUSE / PARTIAL**. Existing administration module. |
| `calculator` | Calculator | Empty `src/app/admin/calculator/`; no calculator component found | **MISSING**. Do not assume the folder is a route implementation. Confirm scope when reached. |

## Overlays And Shared UI

| Legacy overlay/shared surface | Current React target | Mapping status / boundary |
| --- | --- | --- |
| Customer auth overlay | Inline modal in `Landing` | **PARTIAL**. Current form/verification exists; customer app destination is missing. |
| Admin auth overlay | `/admin/login` and `AdminAuth` | **PARTIAL / REUSE**. Use the dedicated admin route, not customer modal state. |
| Privacy/Terms/Fraud legal overlay | None found | **MISSING**. Current footer references are static anchors only; dialog behavior/content remains a dedicated slice. |
| Public chat widget/panel | None in `Landing` | **MISSING**. Admin `Support` live-chat UI exists but is not the public widget. |
| App detail/edit/booking modals | Module-specific React modals exist in several admin modules; customer booking/detail modals have no customer UI target | **PARTIAL**. Map per owning screen rather than add one copied global legacy modal system. |
| Calculator overlay | No current calculator component/page | **MISSING**. |
| `#modal-root`, `#print-area`, `#toast-wrap` | No single matching global legacy root contract; React uses local JSX/modals/toasts in modules | **PARTIAL / distributed**. Reuse local ownership where available; do not introduce a broad portal abstraction without a concrete need. |

## Cross-Cutting Behavior And Reuse

| Legacy behavior/dependency | Existing React reuse point | Current boundary / remaining work |
| --- | --- | --- |
| User/session state and navigation | `src/context/AppContext.tsx`, `/customer` route guard | Holds current user/type and maps known admin destinations. The customer Overview route separately gates on `currentUser.type === "customer"`; verified customer auth now pushes to `/customer`. The customer shell currently exposes only Overview. Add customer destinations as their screens are migrated, without routing through `AdminShell`. |
| Accounts/auth helper | `src/lib/auth.ts`, `AdminAuth`, and `Landing` | `AdminAuth` uses shared `readAccounts`/`saveAccount`; `Landing` still duplicates account type/defaults/read/write logic. Compare storage keys and flow before consolidating; do not silently change customer/admin outcomes. |
| Admin shell/navigation | `AdminShell`, `Sidebar`, `Topbar` | Existing admin shell. Preserve and reuse for existing admin routes rather than rebuilding from `#app` within `Landing`. |
| Business data | `src/lib/dashboard.ts`, `src/data/db.ts`, `AppContext` | Current React app also uses prototype/mock data. Legacy `DB` shape/persistence and current dashboard data must be compared before sharing writes; no live backend should be assumed. |
| Persistence | Legacy whole-DB localStorage key and cross-tab sync | Current React persistence is distributed among helpers/components. There is no drop-in equivalent contract for the entire legacy DB. Map data ownership per screen before connecting writes. |
| Table rendering | `Table` and `AdminTable` | Reuse in admin list screens that already call `AdminTable`; not a public landing or customer portal component by default. |
| Tracking | Landing notice; admin Shipments module | Public, customer, and admin tracking have different inputs/permissions/results. Keep three presentation boundaries; migrate the underlying lookup contract separately. |
| Quote creation | Landing notice; CRM/Finance/Support mock modules exist | Legacy submission writes a lead, quotation, chat item, notification, and persistent state. Define a narrow shared contract before connecting this across modules. |
| Public chat and agent handoff | Admin `Support` chat inbox only | Public widget, AI/FAQ, attachments, and synchronization are not present in React. The legacy client source embeds a third-party API credential; never port it into browser code. Any AI integration requires server-side secret handling. |
| Email/SMS/call/WhatsApp | Existing `Support` communication views | UI/log simulations exist; their presence does not establish external provider delivery. Keep provider integrations as distinct work. |
| Files, print, PDF | `jspdf` dependency and existing document behavior in some modules | Reuse only after matching each legacy output/action to an existing React equivalent. Legacy also uses `FileReader` data URLs; customer/public upload behavior remains separate. |
| Notifications, theme, sound, role preview | `AppContext`, `Topbar`, `Sidebar`, Administration | Existing admin-focused React behavior. Do not copy it into the landing or customer shell. |

## Recommended Screen-By-Screen Migration Loop

For each selected screen, stop at its boundary before taking the next one:

1. Identify its legacy destination key, DOM region, CSS classes, renderer, handlers, and data collections.
2. Choose the existing React route/component from the map. Create a new route/component only when the map marks the target missing and that screen is selected.
3. Compare the legacy markup to the current React implementation; preserve class names, DOM hierarchy, content, and existing CSS values before changing behavior.
4. Migrate only that screen's behavior. Put cross-cutting work (auth contracts, tracking, quote writes, legal overlays, chat, file/PDF) into a separate approved slice when it crosses screen or data ownership boundaries.
5. Compare legacy and React at matching desktop/mobile viewports, run TypeScript and production build, record differences and stop for the next instruction.

## Suggested Next Steps

1. Customer Overview, My Shipments list/detail, customer-scoped Track lookup, invoice list, Profile structure, and text-only Support thread are implemented at `/customer`, `/customer/shipments`, `/customer/track`, `/customer/invoices`, `/customer/profile`, and `/customer/support`. Booking creation, shipment print/PDF, invoice detail/print/PDF, Profile photo/save/password, and Support attachments/polling remain pending. Continue one behavior slice at a time.
2. Keep the existing mock customer auth flow separate from admin login. Any production authentication/backend contract remains future work.
3. For admin screens, select one legacy module/subview at a time and reuse the corresponding React module listed above; investigate only actual parity gaps.
4. Select shared behavior only after its owning screens and data contract are identified.

No migration was performed as part of Step 1. Wait for the next screen or slice to be selected.