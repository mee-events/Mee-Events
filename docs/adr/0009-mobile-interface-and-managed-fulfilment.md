# ADR 0009: Mobile interface direction and managed fulfilment

- Status: partially superseded by ADR 0010
- Date: 2026-07-27

## Context

The first ME Event product is the customer, vendor, and worker application. ERP
development follows after the application model succeeds. One customer-facing
offering may be supported by multiple vendors, but vendor comparison and
operational assignment belong to the future ERP.

The application needs a differentiated, trustworthy interface informed by
wedding planning, event discovery, shopping, and privacy-sensitive products.
The founder has explicitly excluded black from the visual identity.

## Decision

- Build the application interface before authentication, backend integration,
  database integration, or ERP implementation.
- Use a five-tab customer structure: Home, Explore, Plan, Enquiries, Account.
- Present ME Event offerings to customers rather than an operational vendor
  selection interface.
- Defer multiple-vendor comparison and fulfilment assignment to the ERP.
- Preserve a read-only vendor visibility state that only ME Event can control.
- Provide interface previews for Customer, Vendor, and Worker roles using local
  fixtures.
- Use a light, warm palette with botanical green text and celebration accents.
  Do not use black as a UI colour.
- Explicitly label all local-data and unavailable submission behavior.

## Consequences

- The customer journey stays simple even when multiple vendors can fulfil a
  service.
- Product taxonomy and ME Event offering design can be validated before backend
  contracts are committed.
- The future ERP needs comparison, assignment, pricing, and fulfilment tools, but
  those do not appear in the customer application.
- The role preview is temporary and will be replaced by verified role switching
  after secure authentication is implemented.
- Accessibility testing must validate contrast because the palette uses softer
  tones rather than black.
