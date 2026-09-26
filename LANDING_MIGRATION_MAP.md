# Public Landing Migration Map

Read-only inspection of the public landing experience in `index.html` and the existing Next.js home route. No application source, styles, or routing were changed for this inspection.

## Scope And Status Key

This map covers only content and interactions presented on the public landing page. The legacy file also contains whole customer/admin applications; those are explicitly listed under **Out of Current Scope**.

- **EXISTS**: a React equivalent appears to cover the legacy content/behavior inspected.
- **PARTIAL**: a React implementation exists, but content, markup, styling, or behavior differs.
- **MISSING**: no equivalent is present in the current React landing implementation.
- **UNKNOWN**: source inspection alone cannot establish parity; visual/runtime comparison is needed.

Status refers to observed source coverage, not a guarantee of pixel-perfect rendering. No side-by-side legacy-versus-React screenshot comparison was performed for this task.

## Public Landing Sections

| Legacy section | React equivalent | Status | Notes |
| --- | --- | --- | --- |
| Header and navigation shell | `Landing` header in `src/components/Landing.tsx` | PARTIAL | Sticky header structure and most links exist. The brand is not linked to `#home` in React; legacy includes that link. React omits Careers, changes the Admin entry to `/admin/login`, and changes the customer auth trigger implementation. |
| Logo and branding | Header/footer logo images in `Landing` | PARTIAL | React uses `/legacy-assets/embedded_asset_1.png`; legacy markup embeds a base64 image. The brand is present, but identical appearance has not been verified. The chat-branded image is absent because the chat widget is absent. |
| Desktop navigation | React `.navlinks` | PARTIAL | Services, Coverage, Track, About, and Contact are present. Careers is omitted. CTA labels/targets differ for admin/customer access. |
| Mobile navigation | No menu button/state in `Landing` | MISSING | Legacy has `#navToggle`, opens/closes the nav, and closes it after a nav link click. The shared CSS hides `.navlinks` at `max-width: 900px` and reveals `.navtoggle`, but the React markup has no toggle button or `open` state. Mobile navigation therefore does not have the legacy behavior. |
| Hero | `.hero` section in `Landing` | PARTIAL | Main headline, lead copy, route line, and waybill panel exist. Legacy waybill uses a date template; React renders fixed `JAAD/2026`. Visual equivalence is not screenshot-verified. |
| Hero and header CTAs | Links/buttons in React header and hero | PARTIAL | Hero quote and tracking anchor links appear equivalent. Header auth/admin actions differ; mobile visibility also differs because of the missing menu control. |
| Trust/stat strip | `.trust` in `Landing` | EXISTS | Four displayed metrics and labels match the legacy landing copy. Pixel equivalence remains unverified. |
| Services | `#services` and `.services-grid` | EXISTS | All six services and descriptions appear to match the inspected legacy content. |
| How It Works | `.steps` / `.steps-row` | EXISTS | Five steps and descriptions appear to match the legacy content. |
| Coverage | `#coverage` / `.coverage-grid` | EXISTS | Heading, explanatory copy, ten city labels, and 36/36 panel appear to match. |
| Tracking | `#track` / `.tracking` | PARTIAL | React has the visual section and a notice, but the input is not a form, has no tracking value handling, and always displays a fixed notice. Legacy validates empty input, distinguishes missing matches, looks up a matching booking, and can render shipment details. |
| About | `#about` / `.about-grid` | PARTIAL | Vision/Mission/Purpose layout exists. The React Mission and Purpose paragraphs are shortened compared with legacy copy. |
| Careers | No Careers section in `Landing` | MISSING | React has no Careers anchor target or listing. Legacy has Careers links and job-rendering code, but the inspected `index.html` contains no `#careers` section or `#careersPanel`; `renderPublicCareers()` returns when the panel is absent. Treat the actual intended public careers UI as unresolved until its source is identified. |
| Contact/quote | `#contact` / `.contact-grid` | PARTIAL | Contact details and the basic two-column layout exist. React omits Goods type, Estimated weight, Notes, the security/fraud notice, the emergency-hours sentence, required form semantics, and the legacy form's result message/reset behavior. |
| Footer | `.site-footer` in `Landing` | PARTIAL | React has a footer, but its structure/content differ substantially. Legacy has brand/social links, Careers and policy links, and a compact copyright/build line. React has a CTA band, four-column link grid, badge, and different legal links. |
| Public chat widget | No equivalent in `Landing` | MISSING | Legacy has a floating launcher, chat panel, starter prompts, text/file messages, FAQ/AI replies, and a bridge to the legacy support chat data. No React chat UI or behavior exists. |
| Customer login/signup modal | `authMode` and modal JSX in `Landing` | PARTIAL | React has login/signup UI, validation, account persistence, and demo verification. Its layout and flow differ from legacy. Legacy login enters the legacy customer application; React customer login/signup currently displays a notice rather than opening a customer app. |
| Legal/policy dialogs | Footer React links currently point to contact anchors | MISSING | Legacy footer links open Privacy, Terms, and Fraud Awareness modal content. React has no legal modal or corresponding policy content. |
| Social/contact links | React footer/contact markup | PARTIAL | Legacy includes WhatsApp, email, and a pending Instagram link. React contact details include email/phone, but no equivalent social-link group. |

## Landing Interactions

| Legacy interaction | React implementation | Status | Notes |
| --- | --- | --- | --- |
| Smooth anchor scrolling | Native `href="#…"` links; global `html { scroll-behavior: smooth; }` | EXISTS | Shared anchors use native browser navigation. Careers links have no target in the checked-in base markup. |
| Logo returns to home | Legacy brand links to `#home` | PARTIAL | React logo is a non-linked `div`; no return-to-home anchor behavior. |
| Mobile menu open/close | `#navToggle` click toggles `.open`; nav link click closes it | MISSING | No React menu toggle/state. This also leaves nav hidden at the mobile breakpoint under the current CSS. |
| Open/close customer auth modal | Legacy open button, close button, and backdrop click | PARTIAL | React opens login from a header button and closes on close/backdrop. Layout/state differ; no escape-key parity was established. |
| Login/signup tabs | Legacy toggles separate login/signup forms | PARTIAL | React switches a shared modal form based on `authMode`; copy, form fields, validation, and verification behavior differ. |
| Customer login | Legacy demo-account match and transition into legacy customer app | PARTIAL | React checks the local mock account and asks for a generated verification code, then displays a signed-in notice for customer accounts. The post-login customer app is outside this landing-only scope. |
| Customer signup | Legacy public signup form is wired to demo-account matching in the inspected script; there are duplicate/older auth scripts in the file | PARTIAL | React creates a mock account in `localStorage`, verifies it with a generated code, and displays a notice. These flows are not behaviorally equivalent. Confirm the intended legacy signup behavior before migration. |
| Admin access entry | Legacy opens a separate admin auth overlay | PARTIAL | React navigates to `/admin/login`. The entry point is part of the public header; admin authentication and application behavior are out of scope here. |
| Tracking submit | Legacy form validates input and searches `DB.bookings` | PARTIAL | React click handler shows a fixed “not yet live” message and does not read the input. |
| Quote submit | Legacy validates required fields, creates CRM lead/quotation/chat records, pushes a notification, persists data, shows confirmation, and resets the form | PARTIAL | React has a button that sets a generic notice; it does not collect all legacy fields or create/persist records. Avoid changing CRM/Finance/Support modules under this landing-only scope; define a narrow shared data contract before any future integration. |
| Public chat open/close and first greeting | Legacy opens panel and initializes greeting/prompt chips once | MISSING | No React chat component/state. |
| Chat send/reply and starter chips | Legacy handles local knowledge-base matching, Groq API replies/fallback, and agent handoff | MISSING | No React equivalent. The legacy file contains a client-side third-party API credential; do not copy it into React/client code during migration. Any future AI integration needs a server-side secret boundary. |
| Chat attachments | Legacy accepts images/PDF/docs up to 5MB and displays/sends attachments | MISSING | No React equivalent. |
| Chat bridge to support | Legacy writes visitor messages into shared legacy `DB.chats` and polls for agent responses | MISSING | Public UI behavior belongs in a later landing-chat slice; support-team/admin-side behavior remains out of scope. |
| Legal dialogs | Legacy footer opens Privacy, Terms, and Fraud Awareness text in an overlay; close button/backdrop dismiss | MISSING | React links do not open policy content. |
| Careers display/apply/PDF | Legacy helper attempts to render postings and has job PDF/application hooks | UNKNOWN | The helper checks for a missing `#careersPanel` and returns. HR management hooks exist in the legacy app, but the public panel is absent in the inspected static markup. Identify intended public markup before implementing anything. |
| Contact field validation/results | Legacy native required fields and post-submit confirmation/reset | PARTIAL | React inputs are not enclosed by a form and the fields omit several legacy inputs. |
| Browser history / login transition | Legacy hides public site and shows the legacy app shell after login | PARTIAL | React routes admin login separately and does not mount the legacy customer shell. Do not change either app shell in the landing migration. |

## Shared Components / Context

| Existing code | Potential reuse | Notes |
| --- | --- | --- |
| `src/context/AppContext.tsx` — `useAppDispatch()` | Keep using for setting the shared current user after public auth | `Landing` already uses it. Shared state has current user, theme, DB, navigation state, and auth readiness. Avoid adding duplicate global auth state. |
| `src/context/AppContext.tsx` — `useNavigate()` | Use only for intentional transitions to existing Next routes | `Landing` already uses it to enter the dashboard. Anchor navigation should remain native; customer-app navigation does not currently exist as a route. |
| `src/lib/auth.ts` — `Account`, `defaultAccounts`, `readAccounts()`, `saveAccount()` | Candidate reuse to remove duplicate mock-account helpers in `Landing` | `Landing` currently redeclares the account type/default accounts/reader and manually writes `localStorage`; `AdminAuth` already uses the shared helpers. Compare exact behavior and storage keys before reusing so the UI/flow does not change accidentally. |
| `src/components/AdminAuth.tsx` | Reuse shared auth data/helpers only; do not reuse its page markup as a landing modal | It is a dedicated admin route UI and has different content/layout than the public customer modal. Admin auth UI/route is out of current scope. |
| `src/components/Table.tsx` and `src/components/admin/AdminTable.tsx` | No landing reuse identified | These are data-table components for admin module views, not public marketing UI. |
| `public/legacy-assets/embedded_asset_1.png` | Existing React logo asset | React currently references this asset; compare it visually with the base64 brand source in `index.html` before claiming exact logo parity. |
| `public/legacy-assets/embedded_asset_2.jpg` | Possible asset candidate only if identified in legacy usage | Do not assume it is the chat image without checking its content/source mapping. |
| No shared public modal, nav, or chat component found | Do not create duplicates before identifying whether a narrowly reusable component is truly needed | The current modal/chat behavior is local to the legacy page; React `Landing` contains its auth modal inline. Keep implementation choices for a later migration step. |

## Landing CSS

`src/app/globals.css` imports `src/styles/legacy.css`; the landing component relies on selectors from that legacy stylesheet rather than a landing-specific stylesheet.

| Legacy CSS area | React usage | Notes |
| --- | --- | --- |
| Font import, variables, resets, body, links, image/button defaults, `.wrap`, headings, `.eyebrow` | Used by landing markup | Global rules also affect admin UI. Preserve existing values and avoid broad edits. |
| Header/nav, brand, CTA buttons, mobile nav toggle | Header and hero in `Landing` | Desktop rules apply. Mobile CSS hides `.navlinks` and styles `.navtoggle`, but React has no toggle element/state. |
| Hero, route line, manifest | `.hero`, `.hero-grid`, `.routeline`, `.hero-manifest` | Existing class names align; exact computed-style parity has not been screenshot-tested. |
| Trust, generic section heading, services grid/cards, steps | Corresponding React sections | Content is largely aligned with inspected legacy markup. Responsive rules collapse these layouts at 900px. |
| Coverage, tracking, about, contact, fields, contact info, fraud notice | React coverage/tracking/about/contact | React uses several styles but does not render the legacy fraud note or full quote form. Unused rules should not be removed during this scope. |
| Careers cards/panel | No current React landing use | CSS exists, but legacy `#careersPanel` target is absent from base markup and React has no Careers section. |
| `.landing-page .site-footer` footer CTA/grid/breakpoints | Current React footer | These page-specific rules describe the newer React footer structure, which differs from the legacy footer in `index.html`; source presence alone does not mean visual parity. |
| Chat launcher/panel/messages/chips/input | No React use | Styles remain in the shared CSS for legacy public chat. |
| Modal/auth shell/tabs/forms/verification | Current React auth modal uses many matching class names | Legacy and React modal structures/content differ. Other admin/auth markup also shares these global classes, increasing regression risk if edited. |
| `@media (max-width: 900px)` and footer `@media (max-width: 640px)` | Public layout responsiveness | The 900px rule is global and includes desktop-to-mobile layout changes. React mobile navigation is incomplete; verify at the original breakpoints after parity work. |

## Out of Current Scope

Do not migrate, refactor, or otherwise change these customer/admin application features during the public landing work:

- Legacy `#app` and `#customerApp` shells, sidebars, topbars, module views, and their navigation/session behavior.
- Existing Next.js admin routes, `AdminShell`, admin module components, and the separate `/admin/login` implementation.
- Admin/customer operational workflows: CRM pipeline and lead management, quotations/finance, shipments, customers, fleet, drivers, warehouse, HR/recruitment management, support tools, reports, roles/permissions, audit, notifications, theme/sound, exports, print/PDF, and persistence logic.
- The admin side of the legacy live-chat bridge, support inbox, notification behavior, and shared `DB.chats` management. A future public chat migration must not silently alter admin behavior.
- HR job-posting management and application-review workflows. Public Careers UI can be investigated later, but do not change HR/admin implementation to make it render.
- Downstream customer application functionality after public customer login/signup. The landing modal can be compared as a public entry interaction; the customer app itself is not part of this migration slice.

The legacy landing's public quote/tracking forms may depend on shared mock business records. Their public UI/validation is in landing scope; changes to admin business workflows or data ownership are not. Keep any future integration narrow and explicitly validated.

## Recommended Migration Order

1. Capture legacy and current React screenshots at matching desktop/mobile viewports; record content, geometry, and visible states before edits.
2. Reconcile static structure/copy in the existing `Landing` component section by section: branding/header, hero, stats, services, steps, coverage, tracking, about, contact, and footer. Preserve the existing classes and CSS values.
3. Resolve the Careers source discrepancy before implementing it: determine whether the missing `#careersPanel` is an accidental omission or obsolete legacy code. Do not touch HR management.
4. Restore public navigation behavior, including the mobile menu and all intended anchor targets, then compare responsive behavior.
5. Migrate public interactions one at a time: tracking form, quote form UI/validation, customer auth modal, and legal dialogs. Define integration boundaries before connecting quote submission to shared records.
6. Handle public chat as its own isolated slice. First establish the intended current contract and security boundary; do not port the legacy client-side API credential or edit admin support workflows.
7. Compare every migrated state against the baseline and run focused checks/build. Stop after the landing scope; do not proceed to customer/admin app migration automatically.