# ME Event Catalogue Taxonomy v1

- Status: proposed for product approval
- Source: `Total Events 21.pdf` and `Events Services - 41.pdf`
- Visual review date: 2026-07-27

## Purpose

The source PDFs contain valuable business knowledge, but the "21 events" list
mixes event occasions with service departments. The application must preserve
the source catalogue while separating concepts so customers can plan an event and
vendors can classify listings consistently.

## Canonical hierarchy

```text
Event type
  -> Function or ceremony
    -> Service category
      -> Service subcategory
        -> Listing
          -> Offering variant
```

Examples:

```text
Wedding
  -> Mehndi
    -> Decoration
      -> Mehndi backdrop
        -> ME Event offering
```

```text
Birthday
  -> First birthday
    -> Decoration
      -> Balloon stage decoration
        -> ME Event offering
```

```text
Corporate event
  -> Product launch
    -> Branding and stage decoration
      -> Branded stage setup
        -> ME Event offering
```

## Source event and department index

The 21 source entries are retained for traceability:

1. Engagement ceremony
2. Pre-wedding events
3. Mehndi events
4. Sangeet events and decor
5. Wedding event services
6. Reception event services
7. Half-saree and dhoti ceremony
8. Birthday party event
9. Cradle ceremony
10. House-warming ceremony
11. Festival event services
12. Catering services and manpower
13. Sound and lighting services
14. Photography and videography
15. Event decoration services
16. Event venue services
17. Tent-house material supply
18. Corporate events and party organization
19. Advertising and promotions
20. Event material and equipment store
21. Fibre decoration manufacturing

Entries 1-11 and 18 primarily represent event types or functions. Entries 12-17
and 19-21 primarily represent service departments. They must not be stored as one
flat customer-facing enum.

## Source service index

The 41 source services are retained as catalogue seeds:

1. Flower house decoration
2. Wedding items and return gifts
3. Flower garlands and jewellery florist
4. Mehndi and makeup artist
5. Couple grand-entry event
6. Event special effects
7. Event entertainment
8. Dandiya dance group and choreographer
9. Live music, orchestra, and live band
10. DJ sound and lighting decor
11. Caterers and food counters
12. Event catering and manpower services
13. Event stage flower decoration
14. Photography and videography
15. Haldi ceremony
16. Mangalasnanam event
17. Backdrop decoration
18. Pooja samagri services and pandit
19. Bride-to-be and groom bachelor party
20. Tent-house material supplier
21. Barat band, buggi, and dhol services
22. Bride and groom wedding entry
23. Traditional wedding concepts
24. Wedding mandap decoration
25. Holiday and honeymoon packages
26. Saree and dhoti ceremony grand entry
27. Birthday party special entries
28. Birthday balloon decoration
29. Birthday entertainment and games
30. Live food stalls for events
31. Cradle ceremony decoration
32. House-warming decoration
33. Indian festival event services
34. Venues: banquet halls and gardens
35. Venues: hotels and resorts
36. Corporate product-launch events
37. Promoters for brand promotion
38. Event material and stage machines
39. Event antique items and counters
40. Fibre pillars and mandapam
41. Fibre antique items and related products

Spelling and display names require business copy review before publication. The
scanned PDF labels remain source aliases so historical records and searches can
still resolve them.

## Catalogue entities

### Event type

Examples: Wedding, Birthday, Corporate Event, House Warming, Festival.

Required properties:

- Stable ID and code
- Display name and source aliases
- Description and cover media
- Active and display-order controls
- Supported functions

### Function or ceremony

Examples: Engagement, Mehndi, Haldi, Sangeet, Reception, Product Launch.

Required properties:

- Parent event-type relationship
- Date/time and venue requirement flags
- Suggested service categories
- Requirement-question template

### Service category and subcategory

Examples: Decoration -> Backdrops; Catering -> Food Counters; Entertainment ->
Live Band.

Required properties:

- Stable hierarchy independent from events
- Applicability to multiple event types/functions
- Required vendor evidence and listing fields
- Sale/rent/service eligibility

### Listing

A listing is a vendor-supplied or ME Event-owned catalogue input. Customers see
an ME Event offering. Multiple eligible vendors may support the same offering;
the future ERP will compare and assign them after enquiry qualification. Each
listing must declare one offering type:

- `sale`
- `rental`
- `service`

One vendor may own listings of any or all offering types.

Required properties:

- Owner and approval status
- Service subcategory
- Title, description, photos, and service area
- Vendor base-price version
- ME Event customer-price version
- Availability and lead-time information
- Vendor-visibility policy inherited from the vendor unless overridden
- Published version and pending revision

### Offering variant

Variants allow one listing to represent sizes, durations, capacities, materials,
menus, package levels, or other controlled options without duplicating the
listing.

Examples:

- 20-foot, 40-foot, 60-foot stage
- Silver, Gold, Diamond, Platinum catering menu
- Four-hour or full-day photography package
- Vehicle or entry-concept choice

## Data-driven rules

- Catalogue content must come from managed data, not hard-coded application
  enums.
- A service can apply to many event types and functions.
- New event types and services must be publishable without an app release.
- Deactivation hides new selection but preserves existing enquiries and deals.
- Published names, descriptions, and prices are versioned.
- Search indexes source aliases, approved display names, and common spelling
  variants.
- Customer-facing text requires content review before publication.

## PDF follow-up

The service PDF contains many detailed subcategories and placeholder labels such
as numbered variants. These should be migrated through a controlled catalogue
workbook and business copy review rather than copied verbatim into production.
