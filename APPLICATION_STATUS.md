# Application Status

Snapshot of the code currently present in this workspace, updated 2026-09-26.

## At A Glance

- The application is a Next.js App Router project using Next.js 15.4, React 19, and TypeScript.
- The public home route (`/`) renders the existing React `Landing` component.
- Admin areas have React routes and module components for dashboard, CRM, customers, shipments, fleet, drivers, warehouse, finance, HR, support, and administration.
- Current app data and authentication are prototype/mock implementations backed by in-memory objects and browser storage. The checked-in app does not currently use Supabase.
- The original `index.html` and `admin.html` remain in the repository as legacy/reference sources. They have not been removed.
- `src/styles/legacy.css` contains the reused legacy styling for the React app.

## Current Routes

| Route | Current implementation |
| --- | --- |
| `/` | `src/app/page.tsx` renders `src/components/Landing.tsx` |
| `/admin/login` | `src/app/admin/login/page.tsx` renders `src/components/AdminAuth.tsx` |
| `/admin/dashboard` | Dashboard module |
| `/admin/crm-leads` | CRM and lead management |
| `/admin/customers` | Customer management |
| `/admin/shipments` | Shipment operations |
| `/admin/fleet` | Fleet management |
| `/admin/drivers` | Driver management |
| `/admin/warehouse` | Warehouse inventory |
| `/admin/finance` | Finance |
| `/admin/hr` | HR and careers |
| `/admin/support` | Support channels and tickets |
| `/admin/admin` | Administration, users, roles, integrations, and audit views |

The route files are under `src/app/admin/`; their page UI is primarily implemented in `src/components/admin/`.

## Shared Application Structure

- `src/app/layout.tsx` provides the root layout, `AppProvider`, and global stylesheet import. Its current metadata is generic (`ERP Dashboard`) and should be reviewed separately if product metadata work is in scope.
- `src/context/AppContext.tsx` owns shared client-side state for the current user, theme, navigation, tabs, and dashboard data.
- `src/lib/dashboard.ts` holds mock business data and related types.
- `src/lib/auth.ts` provides mock account helpers and browser-storage keys.
- `src/components/admin/AdminShell.tsx`, `Sidebar.tsx`, and `Topbar.tsx` provide the admin shell.
- `src/components/Table.tsx` is the shared generic table. `src/components/admin/AdminTable.tsx` adapts existing module table callbacks to it.
- `src/components/AdminAuth.tsx` implements the admin login flow; `src/components/Landing.tsx` contains the public page and its current client-side interactions.
- `public/legacy-assets/` contains assets reused by the UI.

## Legacy HTML And React Coverage

### `index.html`

`index.html` is not only a static landing page. It contains the public marketing page, customer/admin authentication and app markup, and extensive imperative JavaScript that manipulates the DOM directly. Its script includes interactions for navigation, chat, tracking, quote submission, authentication, legal dialogs, and legacy application views.

The public page already has a React counterpart at `/` in `src/components/Landing.tsx`, so a migration should reconcile that implementation with the original rather than create a duplicate landing page. The existing React component implements the main marketing sections and several interactions, but it is not yet a proven 100% markup, styling, or behavior match for all of `index.html`. The embedded legacy customer/admin application is represented separately by the current Next.js admin routes only in part; it needs an explicit feature-by-feature comparison before deciding what remains in scope.

### `admin.html`

`admin.html` remains in the repository and contains legacy admin UI and behavior. The Next.js admin routes/components already implement the core admin modules, but this status document does not claim a complete 1:1 migration of every legacy interaction or view.

## Styling And Visual Preservation

- `src/app/globals.css` imports `src/styles/legacy.css`.
- The legacy stylesheet includes styles for both public-facing content and admin UI. Global selectors and overlapping class names mean changes should be narrowly scoped.
- The repository's `.github/copilot-instructions.md` requires preserving the existing UI during migration: do not redesign, change spacing/colors/typography/responsive behavior, or refactor unrelated modules; migrate incrementally and wait before moving to another component/page.

## Current Data And Backend Status

- Admin/customer accounts are mock accounts. The app restores a session from browser `sessionStorage`; customer/account data may also use `localStorage`.
- Business records are supplied by mock dashboard data, not by a live database service.
- The dependency manifest contains Next.js, React, Tailwind's PostCSS integration, and `jspdf`; it does not currently list Supabase client dependencies.
- `README.md` describes a Supabase-backed Next.js 16 implementation and files such as migrations and API routes that are not present in the current source tree. Treat that README as stale until reconciled with the actual code.

## Recent Reusable Table Work

- Added the shared generic table with dynamic equal-width columns, per-column alignment/rendering, truncation, horizontal scrolling, and empty/loading states.
- Kept the existing `AdminTable` interface compatible for current module callbacks.
- Warehouse uses the shared table and follows its default left alignment; no Warehouse-only alignment exception remains.

## Validation Previously Run

- `npx tsc --noEmit` passed after the shared table and Warehouse alignment changes.
- `npm run build` passed. It emitted existing warnings in other components, primarily for raw `<img>` usage and unused variables.
- The running local app was visually checked at `http://localhost:3001` during the table work.

## Suggested Next Migration Boundary

For the requested `index.html` conversion, begin with an inventory and side-by-side comparison of the **public landing experience** only. Reuse and correct the existing `Landing` component, retain the legacy source, and validate desktop/mobile appearance and interactions before considering the old customer/admin app markup. Do not migrate other pages automatically.