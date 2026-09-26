# Public Landing Visual And Behavior Baseline

Baseline date: 2026-09-26. Scope: legacy public page in `index.html` versus the current React home route (`src/app/page.tsx` -> `src/components/Landing.tsx`). No source, JSX, CSS, routing, admin routes, or customer/admin application implementation was changed or inspected as part of this baseline.

## Method And Evidence

- Opened the legacy page as `file:///.../index.html` and the React page at `http://localhost:3001/` in separate browser pages.
- Measured both at matching Playwright CSS viewport sizes: 1440x900, 901x900, 900x900, 768x1024, 640x900, 639x900, and 390x844/900.
- Read rendered DOM text, visibility, element bounds, computed grid columns, and public interaction states. The browser runs used only public landing UI; no credentials were submitted and no quote was submitted.
- **Screenshot limitation:** screenshot tooling was available, but its captured React viewport was cropped/narrow and did not consistently reflect the emulated Playwright viewport. The two page screenshots therefore cannot be treated as a reliable matched-size, pixel-by-pixel comparison. This report uses runtime DOM/geometry measurements where available and marks source-only conclusions separately. Pixel-level color, font-rendering, and visual-asset equivalence remain unverified.

Evidence labels used below:

- **Runtime**: confirmed by DOM inspection or safe browser interaction.
- **Source**: inferred from the corresponding legacy/React markup, handlers, or CSS.
- **Runtime + source**: the markup/behavior was inspected and the rendered result was also checked.

## A. Visual Differences

| Area | Legacy | React | Difference | Evidence |
| --- | --- | --- | --- | --- |
| Header/navigation | Logo links to `#home`; six nav links including Careers; quote CTA, customer-auth button, Admin button; menu button exists for mobile. | Logo is not linked; five nav links; quote CTA, `/admin/login` link, customer-auth button; no mobile menu button. | Header actions, link count/targets, brand behavior, and responsive control differ. At desktop, both headers measured 77px high. | Runtime + source |
| Logo/branding | Repeated embedded JPEG data URI; loaded image natural size 556x376. | Local `/legacy-assets/embedded_asset_1.png`; loaded natural size 305x201. | Source and intrinsic dimensions differ. Rendered logo equivalence cannot be confirmed from the cropped screenshot output. | Runtime + source |
| Hero | Same core headline/lead/route-line/manifest content; visible waybill label is `JAAD/{{DATE}}`. | Same main headline/lead/route-line/manifest structure; label is fixed `JAAD/2026`. | Waybill label differs. At 1440px, both hero sections measured 671px high and the grid tracks matched at about 614px/454px. Screenshot-level styling comparison is unavailable. | Runtime + source |
| Hero CTAs | “Request a quote” links to Contact; “Track a shipment” links to Tracking. | Same two labels and anchor destinations. | No markup/target difference found for the two hero CTAs. Pixel equivalence not established. | Runtime + source |
| Trust/stat section | Four metrics: 36, 10+, 200+, Mon–Sat; same labels. | Same four values and labels. | No content difference found. | Runtime + source |
| Services | Six service cards and descriptions. | Same six services and descriptions. | No content difference found. Desktop three-column and responsive one-column grid metrics match at sampled widths. | Runtime + source |
| How It Works | Five numbered steps and descriptions. | Same five steps and descriptions. | No content difference found. Responsive grid collapses at the same 900px breakpoint. | Runtime + source |
| Coverage | Same coverage heading, explanatory copy, ten city labels, and 36/36 panel. | Same inspected content. | No content difference found. Pixel parity not established. | Runtime + source |
| Tracking | Form with tracking input and result region. Empty input receives a specific prompt; matching data may render a shipment document. | Input and button exist but are not inside a form; no required flag or input identifier; button displays a generic “not yet live” notice. | React does not distinguish empty, unmatched, and matching references. | Runtime + source |
| About | Vision, Mission, Purpose; longer Mission/Purpose copy. At desktop measured height 726px; at 390px, 966px. | Same three-column/stacked content structure; Mission and Purpose copy shortened. Height measured 684px desktop and 777px at 390px. | Text omissions change section height: React is 42px shorter on desktop and 189px shorter at 390px. | Runtime + source |
| Contact/quote | Contact block plus quote inputs for name, company, phone, email, pickup, delivery, goods, weight, and notes; fraud/security note; hours mention emergency requests. | Six inputs (name, company, phone, email, pickup, delivery); no goods/weight/notes fields, fraud note, or emergency-hours sentence. Inputs are not in a form. | Contact form content and semantics are reduced. Desktop section measured 777px legacy vs 547px React; at 390px, 1545px vs 1026px. | Runtime + source |
| Footer | Brand, social icons, Careers and policy links, short copyright/build line. Desktop height 179px; 390px height 283px. | CTA band, brand description/badge, four-column link grid, footer legal links; desktop height 613px; 390px height 1263px. | Footer content, hierarchy, links, and layout differ substantially; React footer is taller at both measured sizes. | Runtime + source |
| Customer authentication modal | Single customer modal with legacy login/signup forms. Desktop modal measured 380x621px; at 390px measured 340x639px. | React auth shell is a two-column panel with a form. Desktop shell measured 920x603px; form-side modal 480x601px. At 390px shell is 340x730px, while its modal column measures 248px starting at x=244 and is clipped by the shell. | Modal structure and dimensions differ. The React form column is clipped at mobile width. The header entry button is hidden on mobile in both implementations. | Runtime + source |
| Public chat | Floating chat launcher and panel are present. | No chat markup/state in the landing. | Entire public chat surface is missing in React. | Runtime + source |
| Legal dialogs | Footer opens Privacy, Terms, and Fraud Awareness content in a modal. | No policy modal or policy targets; footer links point to Contact anchors. | Legal dialog surface and destinations are missing. | Runtime + source |
| Careers | Navigation/footer contain Careers links. Script attempts to render jobs into `#careersPanel`. | No Careers link, section, or panel. | Legacy markup has no `#careers`/`#careersPanel` target, so the legacy render helper returns without inserting jobs; intended public Careers content remains unresolved. | Runtime + source |
| Whole-page geometry | At 1440px document height measured 4463px; at 768px, 6756px; at 390px, 8304px. | At 1440px measured 4626px; at 768px, 7102px; at 390px, 8558px. | React total height is +163px desktop, +346px tablet, and +254px mobile, largely reflecting About/Contact/Footer differences. | Runtime |

At the sampled widths, both pages had no document-level horizontal overflow. The emulated mobile browser reserves a 10px scrollbar gutter (390px `innerWidth`, 380px document client/scroll width) on both pages.

## B. Responsive Differences

The landing CSS breakpoint at 900px was sampled on either side and at the boundary. The React footer additionally has a 640px breakpoint in the loaded shared stylesheet.

| Area | Desktop (1440px / 901px) | Tablet (900px / 768px) | Mobile (640px / 639px / 390px) | Difference |
| --- | --- | --- | --- | --- |
| Header/nav | Both nav lists display at 901px and 1440px. | At 900px and below, both nav lists are `display:none`. Legacy menu toggle becomes visible; React has no toggle element. | Legacy menu button remains visible. React has no menu button. At 390px, legacy Admin + menu + quote are visible while customer-auth is hidden; React only shows quote, with both ghost CTAs hidden. | React nav links cannot be revealed at narrow widths. Header action sets differ. No horizontal overflow was measured. |
| Hero | Both use two grid columns; at 1440px measured tracks are approximately 614px/454px. | Both switch to one column at the 900px breakpoint. | Both remain one column. At 390px, hero grid content width is 324px; hero measured 816px React vs 834px legacy. | Structural breakpoint behavior matches; height/copy differs. |
| Services/cards | Both use three service columns. | Both switch to one column at 900px. | Both stay one column. | Sampled grid behavior matches. |
| How It Works | Both use five columns. | Both stack steps at 900px. | Both remain stacked. | Sampled grid behavior matches. |
| Coverage/About/Contact | Both use two columns where source styles specify. | Both switch to one column at 900px. | Both remain one column. | Stacking behavior matches, but About and Contact heights/content differ. |
| Tracking | Same single panel arrangement by source. | Same section flow. | Both remain in normal document flow; no horizontal overflow. React input/form behavior remains different. | No sampled layout overflow; behavior differs. |
| Footer | React uses a four-column footer grid; legacy uses its flex footer structure. | At 900px, React becomes a two-column grid and CTA column; legacy footer remains flex. | At 640px React footer grid becomes one column; legacy remains flex/wrapping. At 390px footer heights are 1263px React vs 283px legacy. | Footer responsive rules/layout differ. |
| Authentication modal | Legacy dialog 380px; React shell 920px, two-column with roughly 480px form side. | No separate tablet modal measurement; source keeps the same shell rules. | Both auth header triggers are hidden. Legacy modal is 340px wide. React outer shell is 340px but the 248px second column is offset and clipped. | React modal geometry is not mobile-safe in current rendering. |
| Chat/hidden content | Legacy chat launcher exists. | Legacy chat remains present. | Legacy chat remains present; React has no launcher/panel at any sampled width. | Missing in React. |
| Horizontal overflow | Both had no document horizontal overflow at 1440px or 901px. | None measured at 900px or 768px. | None measured at 640px, 639px, or 390px; React modal overflow is clipped inside its shell, not reflected in document scroll width. | No page-level overflow found, but modal content clipping is present in React. |

## C. Interaction Differences

| Interaction | Legacy | React | Difference | Evidence |
| --- | --- | --- | --- | --- |
| Navigation links | Six links including Careers; shared anchors work. | Five links; shared anchors are native links. | Careers link omitted in React; Admin/customer entry controls differ. | Runtime + source |
| Logo home behavior | Brand anchor points to `#home`. | Brand is a non-anchor container. | React has no logo-to-home action. | Source + DOM |
| Mobile menu | Menu button toggles `.navlinks.open`; clicking a nav link closes it. Tested at 390px. | No toggle button or open state. | React links remain hidden at <=900px. | Runtime + source |
| Anchor scrolling | `href` anchors and global smooth-scroll rule. Legacy mobile Services click set `#services` and closed the menu. | Uses native `href` anchors and same smooth-scroll CSS. | Common targets are structurally equivalent; Careers target is absent in both base markup and React, though only legacy links to it. | Runtime + source |
| Customer auth modal open/close | Customer button opens; close button/backdrop logic exists. | “Sign up / Login” opens modal; close button/backdrop logic exists. | Both work as public entry points on desktop; markup/layout and form flows differ. Header trigger is hidden on mobile in both. | Runtime + source |
| Login/signup tabs | Switches between separately rendered legacy forms; tested tab display switch. | Switches React modal state between forms; tested tab labels/state. | Tab action exists in both; fields, copy, validation, verification, and post-login outcomes differ. No credentials were submitted. | Runtime + source |
| Customer login/signup submit | Legacy validates/matches demo accounts and then enters the legacy customer app. | React performs mock account checks; signup writes local storage and uses a generated verification code; customer auth ends at a notice. | Not equivalent. Downstream customer app transition is intentionally outside this baseline’s implementation scope. | Source |
| Admin access | Public header opens a separate legacy admin auth overlay. | Public header links to `/admin/login`. | Entry mechanism differs; admin auth behavior itself is out of scope. | Runtime + source |
| Tracking submission | Empty submission displays “Enter a tracking number”; non-empty searches bookings and may display no-match or shipment details. Empty submit was tested without data changes. | Empty input can be clicked and always displays “Tracking not yet live”; there is no form, validation, or lookup. | React does not branch on the entered reference. | Runtime + source |
| Quote/contact submission | Native form has five required inputs; valid submit creates lead/quotation/chat records, sends notification, persists data, confirms, and resets. No valid submission was performed. | No form, no required inputs, only six contact fields; button changes a generic notice. This notice action was tested. | React has no equivalent validation/record-creation behavior. | Runtime + source |
| Public chat open/close | Launcher opens panel, adds welcome message/chips once; close button hides panel. Open/close tested without sending a message. | No launcher or panel. | Missing in React. | Runtime + source |
| Chat replies/attachments/human handoff | Legacy has starter chips, FAQ/AI reply/fallback, file upload, and live-agent bridge. | No equivalent. | Entire interaction family missing. Legacy includes a client-exposed third-party API credential; do not copy it into client code in a later migration. | Source |
| Legal/policy dialogs | Privacy/Terms/Fraud links open populated modal; tested Privacy open/close. | No legal target/overlay; policy links point to Contact. | Missing policy dialog behavior/content. | Runtime + source |
| Careers links/target | Careers links exist; browser DOM has no `#careers` or `#careersPanel`; render helper no-ops. | No link or target. | Legacy public destination is itself unresolved; do not invent content without confirming intended source. | Runtime + source |

## D. Assets

| Asset | Legacy | React | Difference / verification |
| --- | --- | --- | --- |
| Logo | Embedded base64 JPEG in public markup; loaded dimensions 556x376. | `/legacy-assets/embedded_asset_1.png`; loaded dimensions 305x201. | Different representation and intrinsic dimensions. Whether the visible marks are the same artwork is unverified because the screenshot captures were not reliable at matching size. |
| Chat brand image | Embedded logo image in chat header. | No chat UI/image. | Missing with the React chat surface. |
| Chat/social icons | Inline SVG icons for chat and footer social controls; five SVGs occur in the legacy public-site DOM. | No inline SVGs in current landing DOM. | Legacy icons/links have no React equivalents as rendered. |
| Fonts | Remote Google Fonts import for Space Grotesk, Inter, IBM Plex Mono. | Same font import is present in shared CSS. | Same source family list; exact loaded-font/rendering parity was not confirmed. |
| CSS-generated decoration | Route-line, gradients, cards, and other decoration are CSS, not image assets. | Same classes/styles are available to the React landing. | Pixel equivalence unverified due screenshot limitation. |
| Other local legacy assets | `public/legacy-assets/embedded_asset_2.jpg` exists in the project. | No confirmed current Landing reference identified during this comparison. | Do not assume it is a public-chat asset without verifying its content/use. |

## E. Difference Groups

These are grouped by migration dependency and implementation scope, not ranked as product preferences.

### 1. Structural/Markup Differences

- Header has different links/actions, and the React logo is not a home anchor.
- React omits Careers navigation/section, customer quote fields, contact fraud note, social links, legal modal markup, and public chat markup.
- React footer is a different content hierarchy from legacy.
- React tracking and quote controls are not native forms; fields/semantics differ.
- Auth modal layout/structure differs.

### 2. Visual/Styling Differences

- Screenshot-level colors, typography, spacing, shadows, borders, and image crop cannot be declared equal or different from this capture session.
- Runtime section heights differ: About, Contact, Footer, and total page height differ at desktop and mobile sizes.
- Auth dialog geometry differs; at 390px React modal content is clipped inside its shell.
- Logo source/intrinsic dimensions differ; artwork equivalence remains unverified.

### 3. Missing Responsive Behavior

- React hides `.navlinks` at <=900px but has no hamburger/toggle element or open/close state.
- At 390px, React hides both Admin access and customer-auth controls; only the quote CTA remains visible.
- React auth form column is clipped at the sampled mobile width.
- Footer responsive layout differs: legacy flex footer versus React four/two/one-column grid rules.

### 4. Missing Public Landing Interactions

- Tracking validation and booking lookup/result branches.
- Quote form validation, confirmation/reset, and record creation behavior.
- Public chat, starter chips, replies, attachments, and agent handoff.
- Privacy/Terms/Fraud Awareness dialogs.
- Logo-to-home behavior and Careers navigation/target.

### 5. Unresolved/Unknown Behavior

- Legacy Careers renderer refers to a target absent from `index.html`; intended public job-listing source/markup needs clarification.
- Legacy contains duplicate/older authentication scripts; intended signup semantics should be confirmed before porting.
- Pixel-perfect comparison of screenshots and visual equivalence of legacy embedded logo versus React PNG could not be verified with the current screenshot tool output.
- Valid quote submit was deliberately not run because legacy behavior writes shared business records; only markup/source behavior was inspected.

## F. Recommended Next Step

For Step 3, keep work to the existing `Landing.tsx` static markup/copy and avoid CSS or behavior changes:

1. Restore the legacy public copy currently missing from About (Mission/Purpose), Contact hours/security content, and the visible quote-field set.
2. Restore the legacy footer’s static content hierarchy and links, rather than adding new destinations or behavior.
3. Make the existing brand markup match the legacy home-anchor structure; retain the current asset only after a direct visual asset comparison confirms it is equivalent.
4. Defer Careers markup until the missing legacy panel/target is resolved. Defer required-field semantics, submission handling, mobile-menu state, modal changes, legal dialogs, and chat to later behavior-specific steps.

These are recommendations only. No changes have been made. Stop here pending the next instruction.