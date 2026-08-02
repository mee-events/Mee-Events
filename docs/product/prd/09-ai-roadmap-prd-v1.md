# AI Roadmap PRD v1

- Status: accepted
- Date: 2026-08-01
- Parent: `00-master-prd-v1.md`
- Precondition: ADR 0010 slices 1-4 stable in production

## 1. Principle

AI supports business decisions; it never replaces business logic,
authorization, or audit. Every AI-assisted action produces a human-reviewable
suggestion that flows through the same capability-guarded commands as manual
actions. No AI feature ships before the workflow it assists is stable.

## 2. Data readiness prerequisites

AI features depend on structured operational data that the core slices
produce:

- Catalogue with versioned offerings and prices (slice 2)
- Enquiries with structured requirements (slice 2)
- Quotation versions and outcomes (slice 3)
- Event Records with programs, tasks, and completion data (slice 4)
- Vendor and worker performance history (slices 5-6)
- Cost and settlement actuals (slice 6)

## 3. Staged roadmap

### Stage 1 (after slices 1-4): sales assistance

- AI quotation assistant: draft line items from enquiry requirements and
  historical quotations; sales employee reviews and sends
- AI budget builder: estimate budgets from event type, guest count, and
  historical deal data
- AI checklist generator: propose event task checklists per function

### Stage 2 (after slice 5): planning and matching

- AI event planner: guided plan creation for customers from occasion,
  budget, and preferences
- AI vendor matching: rank eligible vendors for a work order on
  availability, price, quality, and location; operations decides
- AI schedule/timeline generator: propose program timelines from function
  templates and past events
- AI worker assignment optimization: suggest crews from skills,
  availability, and performance

### Stage 3 (after slice 6): intelligence and support

- AI customer support assistant: enquiry status, FAQs, and handoff to humans
- AI sales assistant: follow-up prioritisation and next-best-action for
  leads
- AI insights dashboard: profitability drivers, demand forecasting, and
  anomaly alerts for management

## 4. Non-functional requirements

- AI suggestions are labelled as suggestions and record the model/version in
  audit metadata when acted upon
- Customer data privacy: no customer personal data leaves the platform
  boundary without an approved data-processing agreement
- Every AI feature has a manual fallback path
- Cost and latency budgets are defined per feature before launch

## 5. Out of scope

- Autonomous approval of prices, payments, refunds, or settlements
- AI-generated customer commitments without human review
- Replacing the CRM/ERP pipelines with agentic automation
