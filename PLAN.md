# Wedding Planner MK — Product Plan (DRAFT)

> Status: planning. Nothing gets built until every section below is marked **AGREED**.
> Last updated: 2026-11-05

---

## 1. Research summary

### Local / regional competitors
| Product | What it is | Planning tools | Vendor self-management | Availability calendar | Business model | Weak spots |
|---|---|---|---|---|---|---|
| **Marry.mk** | MK venue directory (Skopje, Tetovo, Gostivar, Ohrid, Bitola) | None | "Venue dashboard" (unclear) | Claimed, request-based | Not disclosed | English only, live directory shows 1 test venue, no reviews, no menus |
| **Dasma** (Google Play, `com.edasma.app`) | MK app listing halls, photographers, musicians, decorators, beauty | Unknown | Unknown | Unknown | Unknown | Store page couldn't be read — **you should install and test it** |
| **VULA** (vula.app) | Albania/Kosovo all-in-one: guests, RSVP, seating, budget, tasks, website, vendor marketplace | Strong | Yes (profiles, inbox, quotes) | No | Couples: free + €29.99 one-time Pro. Vendors: €80–150/year, no commission | No Macedonian language, no MK vendors, manual payments |
| **Svadbas.com** | Croatian vendor directory (HR + EN) | Light | Vendor registration | No | Vendor listings | Directory, not a planner |

### Global apps (what to learn from, what to avoid)
- **The Knot / WeddingWire** (now also acquiring **Zola**, Oct 2026): planning tools are free and act as a funnel; money comes from vendor advertising. Vendors complain about expensive contracts and poor lead quality. → *Don't build an ad-driven vendor trap.*
- **Zola**: registry + invitations + vendor fees. Registry culture doesn't fit MK (guests give cash).
- **Bridebook (UK)**: free for couples, venues pay; strong venue availability + "shortlist" flow.

### Gap in the market
Nobody in North Macedonia combines **(a)** a real planner for the couple with **(b)** live restaurant availability + menu prices per person + **(c)** vendor-managed listings, in **Macedonian (Cyrillic)**.

### Why this can't be a US app clone (MK wedding specifics)
- The **restaurant/hall is the center** of the wedding: price is quoted **per person (по куверт)**, menus are fixed packages, a **deposit (капара)** reserves the date, peak dates (summer Saturdays/Sundays) go 12+ months ahead.
- **Live band (оркестар)** is a core vendor, not an add-on; often priced per night + hours.
- **Big guest lists (200–500+)** split by **bride's side / groom's side**, organized by **family/household**, not individuals.
- **Cash gifts in envelopes** instead of registries → couples track who gave what (and often reciprocate later).
- Roles: **кум/кума**, **стар сват**, parents often pay for and co-decide parts of the wedding.
- Multiple events: engagement/веридба, "girl's night"/моминска, groom's house gathering, church/civil ceremony, the reception.
- **Diaspora** (Germany, Switzerland, Austria, Australia, USA) plans remotely → needs EUR prices, English option, and online communication.
- Prices often quoted in **EUR**, paid in **MKD** or cash.
- **Online payments**: Stripe does not support North Macedonia merchants directly → local processors (e.g. CaSys/cPay) or a foreign entity. Big decision for any booking/deposit feature.

---

## 2. Proposed product shape (to be confirmed)

### Roles
1. **Couple / Organizer** — plans the wedding; can invite collaborators (partner, parents, кум, planner).
2. **Restaurant / Venue owner** — manages venue(s), halls, capacity, menus & prices per person, calendar of available dates, inquiries.
3. **Music band** — profile, lineup, genres, price ranges, sample videos, calendar.
4. **Photo / video studio** — packages, portfolio, calendar.
5. *(later?)* Other vendors: decor/flowers, cakes, dresses/suits, beauty, cars, invitations, wedding planners.
6. **Admin** — verifies vendors, moderates content, manages categories.

### Couple's planner modules
- Wedding profile (date, city, guest count estimate, budget)
- Budget (planned vs. actual, deposits, payment due dates, who pays)
- Guest list (sides, families/households, RSVP, table seating)
- Gift/envelope tracker
- Timeline / checklist (MK-specific default template)
- Day-of schedule (run of show)
- Vendor manager (booked + shortlisted vendors, contracts, notes)
- Inspiration / notes

### Marketplace
- Search & filter vendors by city, date availability, price, capacity, category
- Vendor profile pages (photos, menus, packages, reviews)
- Inquiry / booking request → vendor accepts / declines / sends offer
- Messaging between couple and vendor
- Reviews after the wedding

---

## 3. Decisions log
_(Filled in as we agree on each question.)_

| # | Topic | Decision | Status |
|---|---|---|---|
| 1 | Languages | Macedonian (Cyrillic) + Albanian + English from day one. All UI translated; vendor content may be single-language. | AGREED |
| 2 | MVP vendor types | Restaurants/venues, music bands, photo/video studios. Others later. | AGREED |
| 3 | Booking depth (v1) | Contact only: couples see vendor info, prices and available dates, then contact the vendor. No in-app booking or payments in v1. | AGREED |
| 4 | Monetization direction | Couples pay (free tier + premium), vendors list for free. Final pricing TBD. | AGREED (direction) |
| 5 | Couple → vendor contact | In-app inquiry form (date, guest count, message) delivered to vendor dashboard + phone/Viber/WhatsApp buttons. No real-time chat in v1. | AGREED |
| 6 | Collaborators | Both partners share one plan; can invite helpers (parents, кум/кума, planner) with edit or view-only access. | AGREED |
| 7 | Planner MVP modules | Budget + payments, guest list + seating, checklist + timeline/day-of schedule. Gift/envelope tracker moved to post-MVP. | AGREED |
| 8 | Unlisted vendors | Couple can add any vendor manually as a private entry in their plan. | AGREED |
| 9 | Restaurant calendar | One restaurant → many halls (each with capacity). Each hall has a per-day calendar: free / tentative / reserved. | AGREED |
| 10 | Menus & prices | Menu packages priced per person with course list, plus priced extras (drinks, cake, decor…). Couple can compare and estimate total. | AGREED |
| 11 | Currency | Vendor chooses EUR or MKD per price; app shows approximate conversion. | AGREED |
| 12 | Vendor onboarding | Self sign-up → admin approval before public. Admin can pre-create listings that vendors later claim. | AGREED |
| 13 | Band pricing | Packages (lineup, members, hours, price) + extra-hour price + travel fee by city; search shows "from" price. | AGREED |
| 14 | Photo/video studios | Priced packages, photo portfolio gallery, video links (YouTube/Vimeo/Instagram embeds — no self-hosted video), per-day calendar. | AGREED |
| 15 | Band calendar | Per-day free/tentative/booked calendar, same as venues; included in date search. | AGREED |
| 16 | Reviews | Verified only: couple must have the vendor in their plan and the wedding date must have passed. Vendor can reply publicly; admin moderates. | AGREED |
| 17 | Web stack | Next.js (App Router, TypeScript) + PostgreSQL + Prisma + Tailwind. API layer designed to be reused by the mobile app. Monorepo from the start. | AGREED |
| 18 | Mobile | React Native / Expo later, sharing types, validation (zod) and API with web. | AGREED |
| 19 | Login | Email + password (with verification + reset) and Google login. | AGREED |
| 20 | Hosting | Railway (app + Postgres) + Cloudflare R2 for images. | AGREED |
| 21 | Free vs premium (couples) | Free: planner, budget, checklist, guest list up to a limit, partner access. Premium: unlimited guests, seating plan, extra collaborators (parents/кум/planner), PDF/Excel export & print. | AGREED (guest limit TBD) |
| 22 | Premium price model | One-time payment per wedding (~€20–30), valid until after the wedding. Exact price TBD. | AGREED (price TBD) |
| 22a | Payment processor | Launch free. Premium limits exist in code behind a switch; paywall stays off until a processor and company are chosen. | AGREED |
| 22b | Free guest limit | 100 guests (applies once paywall is switched on). | AGREED |
| 23 | Launch area | All of North Macedonia searchable from day one; vendor onboarding focused on Skopje first. | AGREED |
| 24 | Name / brand | You choose it yourself. Placeholder name `Svadba` (codename) used in code until then. | OPEN (yours) |
| 25 | Guest list structure | Guests grouped in households (family). Each person has: side (bride / groom / both), age group (child / young / adult / older), events invited to, RSVP status, table. Invitations counted per household. | AGREED |
| 26 | RSVP | Couple sets RSVP manually + optional personal link per household, shared via Viber/WhatsApp, where guests confirm. | AGREED |
| 27 | Seating | Long rectangular tables, round tables, head table (младенци + кумови). Drag-and-drop hall floor plan. Premium feature. | AGREED |
| 28 | Budget payer | Each expense has a payer: couple / bride's family / groom's family / кум / other. Totals per payer. | AGREED |
| 29 | Multiple events | One wedding has several events (веридба, моминска вечер, church/civil ceremony, reception, custom). One guest list; guests marked per event; budget items and schedule can link to an event. | AGREED |
| 30 | Vendor inquiries | Vendor inbox with statuses: new → replied → offer sent → booked / declined. Email alerts both ways. Marking "booked" can block the date in the calendar. | AGREED |
| 31 | Vendor accounts | One owner can manage several businesses and invite staff logins. | AGREED |
| 32 | Search filters (v1) | City, free on my date, guest capacity, price per person, venue features (parking, garden, accommodation, accessibility…), map view. | AGREED |
| 33 | Promoted listings | Not in v1. Possible later, always labeled "Promoted". | AGREED |
| 34 | Shortlist | Favorites + side-by-side compare of 2–4 vendors. | AGREED |
| 35 | Notifications | Email + in-app notification bell. Push later with mobile. | AGREED |
| 36 | Visual style | Elegant, modern, light: warm neutrals, serif headings, lots of white space. | AGREED |
| 37 | Admin | Admin panel in the same app: approve vendors, moderate reviews, manage cities/categories/venue features, users, basic stats. | AGREED |
| 38 | Default templates | Macedonian default checklist (by months before wedding) and budget categories; couple can fully edit/add/delete; admin can edit the defaults. Draft in section 9. | AGREED |
| 39 | Maps | OpenStreetMap via MapLibre (tiles from MapTiler or Protomaps) + "Open in Google Maps" button for directions. | AGREED |
| 40 | Vendor stats | Basic monthly stats: profile views, inquiries, favourites. | AGREED |
| 41 | Privacy | Guest phone/email optional; privacy policy + terms in MK/AL/EN; cookie notice; account export + delete; old weddings auto-archived. Follow MK personal data law (GDPR-aligned). | AGREED |
| 42 | Launch | Couples and vendors open at the same time; catalog grows after launch. | AGREED |
| 43 | Vendor onboarding (ops) | You (or a helper) contact vendors; admin pre-fills profiles from their Instagram/website and sends a claim link. | AGREED |
| 44 | Build order | Foundation → Vendors → Planner → Marketplace → Launch → Mobile (section 6). | AGREED |

---

## 4. Open questions (next rounds)

Done: payments approach, templates, maps, privacy, launch, phases, scope, languages, vendor types, contact, collaborators, planner modules, venue/band/photo profiles, reviews, stack, login, hosting, premium model, launch area.

**Still open (none block building):**
- App name + domain (you).
- Exact premium price — only needed when the paywall is switched on.
- Payment processor + company setup — only needed for premium.
- Marketing channels for launch (Instagram, Facebook groups, wedding fairs).
- Review and approve sections 6–9 below.

## 5. Name ideas (for reference only — you're choosing)
- Свадбено / Svadbeno, Прстен / Prsten, Капара / Kapara, Kumče, Venčaj
- "Dasma" (Albanian for wedding) is already used by a competitor app.

---

## 6. Build phases (DRAFT — to approve)

Each phase ends with something working that you can click through.

**Phase 0 — Foundation** ✅ done 2026-11-05 (Google login and R2/Resend are wired but need real keys)
- Monorepo (pnpm + Turborepo): `apps/web` (Next.js), later `apps/mobile` (Expo), `packages/db` (Prisma), `packages/shared` (zod schemas, types, constants), `packages/i18n` (MK/AL/EN messages).
- Postgres + Prisma, Railway deploy, Cloudflare R2 image upload (resized with sharp).
- Auth: email+password (verify, reset) + Google. Roles: COUPLE, VENDOR, ADMIN (a user can have more than one).
- i18n routing (`/mk`, `/sq`, `/en`), Cyrillic + Latin fonts.
- Design system: colors, fonts, base components (button, input, card, dialog, calendar, table).
- Admin panel shell: users, cities, categories, venue features.
- Email sending (Resend or similar) with MK/AL/EN templates.

**Phase 1 — Vendor side**
- Vendor sign-up → create business (venue / band / photo) → submit for approval.
- Admin: approve/reject, pre-create listing, send claim link.
- Business profile: description (per language), photos, contact, address + map pin, city.
- Venues: halls (capacity min/max, features), menu packages per person + extras, per-hall calendar.
- Bands: lineup, genres, packages, extra-hour price, travel fee by city, video links, calendar.
- Photo/video: packages, portfolio galleries, video links, calendar.
- Staff invitations, multiple businesses per owner.
- Public vendor profile page (read-only for now).

**Phase 2 — Couple planner**
- Create wedding (date, city, estimated guests, budget), invite partner + helpers (edit/view).
- Events within the wedding.
- Guest list: households, people, side, age group, events, RSVP; RSVP links per household; search/filter, counts by side/age/event.
- Seating: tables (long/round/head), drag-and-drop floor plan, assign guests.
- Budget: categories, expenses with payer, planned vs. actual, payments (deposit, due dates, paid).
- Checklist (MK defaults, editable) + day-of schedule per event.
- Vendor manager: add listed vendors or private entries, status (considering / booked), notes, linked expenses.
- Premium limits implemented behind a feature switch (off).

**Phase 3 — Marketplace**
- Search per category with filters (city, date free, capacity, price per person, features) + map view.
- Favorites + compare (2–4).
- Inquiry form → vendor inbox with statuses + email alerts; "booked" blocks the calendar and adds the vendor to the couple's plan.
- Verified reviews + vendor replies + admin moderation.
- Notification bell.
- Vendor stats (views, inquiries, favourites).

**Phase 4 — Launch prep**
- Privacy policy, terms, cookie notice (MK/AL/EN), account export/delete, auto-archive.
- SEO for vendor pages (per-language URLs, sitemap), performance, error tracking (Sentry), backups.
- Seed real vendors (admin pre-fill), test with real couples.

**Phase 5 — Mobile (Expo)**
- Couple app first (planner + search), then vendor app (inbox + calendar). Push notifications.

**Later / post-MVP**
- Gift/envelope tracker, premium payments, more vendor types (decor, cakes, dresses, beauty, cars, invitations, planners), promoted listings, online invitation page, Viber notifications.

---

## 7. Data model (DRAFT — main tables)

**Accounts**
- `User` (email, password hash, name, locale, roles[])
- `Account` / `Session` (Google login, sessions)

**Reference data (admin-managed)**
- `City` (names MK/AL/EN, region)
- `VendorCategory` (VENUE, BAND, PHOTO_VIDEO — extendable)
- `VenueFeature` (parking, garden, accommodation, accessible…, names MK/AL/EN)
- `ChecklistTemplateItem`, `BudgetTemplateCategory` (defaults, MK/AL/EN)

**Vendors**
- `Business` (category, name, slug, description per language, city, address, lat/lng, phone, viber, whatsapp, email, website, instagram, status: DRAFT / PENDING / APPROVED / REJECTED, claimToken)
- `BusinessMember` (user, business, role: OWNER / STAFF)
- `Photo` (business, gallery?, url, order)
- `VideoLink` (business, url, provider)
- `Hall` (business, name, capacityMin, capacityMax, features[])
- `MenuPackage` (business, name, pricePerPerson, currency, courses list, notes)
- `Extra` (business, name, price, currency, unit: per person / fixed)
- `ServicePackage` (business — bands & photo: name, price, currency, hours, members, includes)
- `TravelFee` (business, city, price)
- `PortfolioGallery` (business, title — photo studios)
- `AvailabilityDay` (business, hall?, date, status: FREE / TENTATIVE / BOOKED) — no row = unknown/free per vendor setting
- `BusinessStatDaily` (business, date, views, inquiries, favourites)

**Couples**
- `Wedding` (title, date, city, estimatedGuests, totalBudget, currency, premium flag, archivedAt)
- `WeddingMember` (user, wedding, role: OWNER / PARTNER / EDITOR / VIEWER)
- `Event` (wedding, type: ENGAGEMENT / BACHELORETTE / CEREMONY / RECEPTION / CUSTOM, name, date, place)
- `Household` (wedding, name, side, phone?, rsvpToken, notes)
- `Guest` (household, name, side, ageGroup, rsvpStatus, tableSeat?)
- `GuestEvent` (guest, event) — who is invited to what
- `SeatingPlan` (event), `Table` (plan, type LONG / ROUND / HEAD, name, seats, x, y, rotation), `Seat` (table, guest)
- `BudgetCategory` (wedding, name, planned)
- `Expense` (category, name, planned, actual, payer, event?, plannedVendor?)
- `Payment` (expense, amount, dueDate, paidAt, type DEPOSIT / INSTALLMENT / FINAL)
- `Task` (wedding, title, dueDate / monthsBefore, done, assignee?)
- `ScheduleItem` (event, time, title, notes)
- `PlannedVendor` (wedding, business? OR private name/phone/category, status CONSIDERING / BOOKED, notes)

**Marketplace**
- `Favorite` (user/wedding, business)
- `Inquiry` (wedding, business, hall?, date, guestCount, message, status NEW / REPLIED / OFFER_SENT / BOOKED / DECLINED)
- `InquiryMessage` (inquiry, author, text) — replies thread, not real-time chat
- `Review` (business, wedding, author, rating, text, status, vendorReply)
- `Notification` (user, type, payload, readAt)

---

## 8. Screen list (DRAFT)

**Public:** home · search (per category, list + map) · vendor profile (venue / band / photo) · compare · login / register / reset · RSVP page (from link) · privacy / terms.

**Couple:** onboarding wizard (date, city, guests, budget) · dashboard (countdown, progress, budget summary, next tasks) · guests (households table + filters + counts) · seating editor · budget · checklist · events + day-of schedule · my vendors · favorites · inquiries · settings + members.

**Vendor:** onboarding (choose type, create business) · dashboard (stats, new inquiries) · profile editor · photos/portfolio · halls · menus & extras / packages · calendar · inquiries inbox · reviews · team · business switcher.

**Admin:** dashboard stats · pending vendors · all businesses (pre-create, claim link) · users · reviews moderation · cities · categories · venue features · default checklist/budget templates.

---

## 9. Default templates (DRAFT — to refine together)

**Budget categories:** Restaurant/venue · Drinks · Music/band · Photo & video · Wedding dress · Groom's suit · Rings · Decor & flowers · Cake · Invitations · Hair & makeup · Transport/cars · Church/civil ceremony fees · Engagement (веридба) · Bachelorette/моминска · Gifts for кум/кума & parents · Honeymoon · Other.

**Checklist (months before):**
- 12+: set date & budget, guest estimate, book restaurant (pay капара), choose кум/кума
- 10–12: book band, book photo/video
- 8–10: wedding dress, decor, church date
- 6–8: invitations design, cars, hair & makeup
- 3–6: rings, suit, menu tasting & final menu, cake
- 1–3: send invitations, collect RSVPs, civil registry papers
- last month: seating plan, final guest count to restaurant, day-of schedule, final payments
- after: reviews, archive

---

## Sources
- https://www.marry.mk/about
- https://play.google.com/store/apps/details?id=com.edasma.app
- https://vula.app/en , https://vula.app/en/pricing
- https://www.svadbas.com/en
- https://www.pymnts.com/?p=4312526 (Knot Worldwide vendor complaints)
- https://www.thestar.com.my/tech/tech-news/2026/10/15/the-knot-worldwide-to-acquire-zola-in-wedding-platform-union-sources-say
