-- Migration 0017: Persist preferred external vendor on customer enquiries.
-- Additive only — guest_count, location, and notes already exist on enquiries.
-- CRM table remains `leads` (not crm_leads).
-- Date: 2026-08-09

BEGIN;

ALTER TABLE enquiries
  ADD COLUMN IF NOT EXISTS preferred_external_vendor text;

COMMENT ON COLUMN enquiries.preferred_external_vendor IS
  'Optional customer-supplied external vendor preference from enquiry checkout.';

COMMIT;
