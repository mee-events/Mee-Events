# ME Event Mobile UI/UX Direction v1

- Status: Customer App approved in Figma; old local prototype archived separately
- Date: 2026-07-28
- Scope: Customer App experience and future vendor and worker entry points
- Excluded: authentication, backend, database, payments, and ERP

Approved design:
<https://www.figma.com/make/BMuiRvO5Sm6s0AkPAwJWtE/Mee-Events>

## Product experience

ME Event should feel like a trusted event-planning companion, not a public
directory of unrelated vendors. The customer starts with an occasion or service,
builds a simple event brief, and speaks with a ME Event expert. ME Event controls
the offer, public presentation, final customer price, and vendor visibility.

The Figma prototype is a design demonstration only. It must not be treated as a
live service, real payment system, or legally binding booking experience.

## Approved interaction coverage

The approved Customer App prototype demonstrates:

- premium onboarding and a customer-focused Home experience;
- service exploration, category filters, and service details;
- a connected four-step event-planning journey;
- Enquiries and one central Event Workspace;
- quotation, booking, payment, event-program, file, and manager-chat controls;
- Account entry points for future Vendor and Worker applications.

The old code-first Flutter prototype is archived separately. It is no longer
active and must not be used as a visual reference for the new Figma-led
application.

## Reference research

The interface direction synthesises common strengths from several product
categories without copying any one brand:

- Wedding planning: inspiration, vendor-quality signals, saved ideas, planning
  checklists, budgets, and guided task completion.
- Birthday and general event discovery: occasion-first entry points, clear
  categories, search, filtering, and saved interests.
- Shopping: familiar product cards, readable attributes, concise search, filter
  chips, favourites, and a short path to action.
- Matrimonial and trust-sensitive products: controlled contact visibility,
  privacy cues, verification status, and deliberate identity disclosure.

Research references:

- WedMeGood app: <https://www.wedmegood.com/download-app>
- The Knot planning app: <https://www.theknot.com/wedding-planning-app?vers=0>
- Zola planning app: <https://www.zola.com/wedding-planning/app>
- Eventbrite mobile discovery:
  <https://www.eventbrite.com/help/en-us/articles/783059/how-to-use-the-eventbrite-iphone-app/>
- Amazon shopping features:
  <https://www.aboutamazon.com/news/retail/amazon-shopping-features-rufus-lens>
- Flipkart shopping technology:
  <https://stories.flipkart.com/technology-smart-shopping-flipkart-app>
- BharatMatrimony privacy and security:
  <https://www.bharatmatrimony.com/privacy-security.php>

## Customer information architecture

The primary customer navigation is:

1. Home
2. Explore
3. Plan
4. Enquiries
5. Account

The preferred journey is:

```text
Event type
→ Function or occasion detail
→ Service need
→ ME Event offering
→ Customer enquiry
→ ME Event expert follow-up
→ Future ERP vendor comparison and fulfilment assignment
```

Examples:

```text
Wedding → Mehndi → Decoration → Mehndi backdrop → ME Event offering
Birthday → First birthday → Decoration → Balloon stage → ME Event offering
Corporate → Product launch → Branding and stage → ME Event offering
```

Multiple approved vendors may fulfil an offering. Customers do not choose the
operational vendor in this version. The future ERP will compare availability,
price, quality, capacity, location, and operational suitability after an enquiry.

## Visual language

The design intentionally contains no black colour. It uses:

- Warm ivory canvas: `#FFFCF6`
- White surfaces: `#FFFFFF`
- Deep botanical green text: `#23342D`
- Primary green: `#176B4D`
- Celebration coral: `#E66C61`
- Marigold gold: `#D39A36`
- Soft lavender: `#8B7AB8`
- Calm blue: `#4D83A8`

Rounded cards, generous spacing, calm type hierarchy, and restrained celebration
accents create a premium but approachable experience. Colour is semantic and
never the only indicator of state.

## Role experiences

### Customer

- Browses occasions and ME Event offerings.
- Builds a guided event brief.
- Tracks enquiries and ME Event follow-up.
- Sees approved ME Event pricing.
- Sees vendor identity only when ME Event explicitly enables visibility.

### Vendor

- Prepares a profile for approval.
- Adds products for sale, products for rent, and services.
- Provides images, details, categories, and internal base prices.
- Sees draft, approval, price-review, and published states.
- Cannot control final customer price or public contact visibility.

### Worker

- Prepares a skills and availability profile.
- Applies for approval before receiving assignments.
- Does not contact customers directly.
- Receives future work, attendance, and payment status through ME Event.

## Interaction rules

- Primary actions should be clear and singular on each screen.
- Forms use progressive disclosure rather than one long application.
- Every network-backed action must later support loading, success, empty, error,
  offline, duplicate submission, and expired-session states.
- Touch targets must be at least 44 logical pixels.
- Text and controls must support system font scaling.
- Phone login and OTP remain disabled until secure backend and database
  integration are approved.
- Preview submissions must show that no information was transmitted.

## Responsive direction

The mobile application remains the primary experience. The approved Figma phone
prototype is the visual source of truth until a new application implementation
is created.

## Next design validation

Before authentication begins:

1. Founder approves the complete Customer App prototype in Figma.
2. Each approved screen is translated into a documented component and state.
3. The 21 event types and 41 service taxonomy are imported from the approved
   source documents.
4. Priority customer journey is expanded into full ceremony and service depth.
5. Usability testing validates navigation, service comprehension, and enquiry
   completion with representative customers.
