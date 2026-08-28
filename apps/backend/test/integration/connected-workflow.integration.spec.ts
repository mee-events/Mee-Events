import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgresBookingRepository } from "../../src/modules/bookings/adapters/postgres-booking.repository";
import { PostgresLeadRepository } from "../../src/modules/crm/adapters/postgres-lead.repository";
import { EnquirySubmittedOutboxProcessor } from "../../src/modules/crm/application/enquiry-submitted-outbox.processor";
import { PostgresEnquiryRepository } from "../../src/modules/enquiries/adapters/postgres-enquiry.repository";
import { LeadUpdatedOutboxProcessor } from "../../src/modules/enquiries/application/lead-updated-outbox.processor";
import { PostgresEventRecordRepository } from "../../src/modules/event-records/adapters/postgres-event-record.repository";
import { PostgresPaymentRepository } from "../../src/modules/payments/adapters/postgres-payment.repository";
import { PaymentService } from "../../src/modules/payments/application/payment.service";
import { PostgresQuotationRepository } from "../../src/modules/quotations/adapters/postgres-quotation.repository";
import { QuotationService } from "../../src/modules/quotations/application/quotation.service";
import { createIntegrationPool } from "./support/database";
import {
  HYDERABAD_BRANCH_ID,
  createSyntheticEnquiry,
  createSyntheticLeadFlow,
  insertSyntheticBranch,
  insertSyntheticUser,
  stableCode,
  stableUuid,
} from "./support/fixtures";
import {
  confirmPendingAdvance,
  createApprovedQuotationFlow,
  createPendingAdvanceFlow,
  createSentQuotationFlow,
} from "./support/workflow";

async function strandExpiredProcessing(
  pool: Pool,
  outboxId: string,
  attempts: number,
): Promise<void> {
  await pool.query(
    `UPDATE outbox_events
     SET status = 'processing',
         attempts = $2,
         available_at = now() - interval '1 second',
         published_at = NULL
     WHERE id = $1`,
    [outboxId, attempts],
  );
}

describe("DBINT-05 enquiry transaction and Pattern B", () => {
  let pool: Pool;

  beforeAll(() => {
    pool = createIntegrationPool();
  });

  afterAll(async () => {
    await pool.end();
  });

  it("commits customer, enquiry, audit, and outbox together with mapped values", async () => {
    const flow = await createSyntheticEnquiry(pool, "enquiry-atomic-success");
    const result = await pool.query<{
      branch_id: string;
      customer_id: string;
      reference_code: string;
      status: string;
      version: number;
      audit_action: string;
      audit_version: number;
      outbox_topic: string;
      aggregate_id: string;
      aggregate_version: number;
      payload: Record<string, unknown>;
    }>(
      `SELECT e.branch_id, e.customer_id, e.reference_code, e.status, e.version,
              a.action AS audit_action, a.after_version AS audit_version,
              o.topic AS outbox_topic, o.aggregate_id, o.aggregate_version,
              o.payload
       FROM enquiries e
       JOIN audit_events a
         ON a.entity_type = 'enquiry' AND a.entity_id = e.id
       JOIN outbox_events o
         ON o.topic = 'enquiry.submitted' AND o.aggregate_id = e.id
       WHERE e.id = $1`,
      [flow.enquiryId],
    );
    expect(result.rows[0]).toMatchObject({
      branch_id: HYDERABAD_BRANCH_ID,
      customer_id: flow.customerId,
      reference_code: `ENQ-${stableCode("enquiry-atomic-success", 10)}`,
      status: "received",
      version: 1,
      audit_action: "enquiry.created",
      audit_version: 1,
      outbox_topic: "enquiry.submitted",
      aggregate_id: flow.enquiryId,
      aggregate_version: 1,
      payload: {
        enquiryId: flow.enquiryId,
        branchId: HYDERABAD_BRANCH_ID,
        customerId: flow.customerId,
        firstResponseDueAt: "2026-08-26T13:00:00.000Z",
      },
    });
  });

  it("rolls back the customer upsert when a dependent branch is invalid", async () => {
    const label = "enquiry-atomic-rollback";
    const user = await insertSyntheticUser(pool, `${label}:customer`);
    const eventType = await pool.query<{ id: string }>(
      `SELECT id FROM event_types WHERE code = 'wedding'`,
    );
    const eventTypeId = eventType.rows[0]?.id;
    if (eventTypeId === undefined) {
      throw new Error("Migration-created wedding event type is missing");
    }
    const repository = new PostgresEnquiryRepository(pool);
    await expect(
      repository.createEnquiry({
        branchId: stableUuid("missing-branch"),
        userId: user.id,
        eventTypeId,
        referenceCode: `ENQ-${stableCode(label, 10)}`,
        serviceCategoryCodes: [],
        planItems: [],
        contactPreference: "phone",
        firstResponseDueAt: new Date("2026-08-26T13:00:00.000Z"),
        requestId: `dbint-enquiry-${label}`,
      }),
    ).rejects.toMatchObject({ code: "23503" });

    const state = await pool.query<{
      customers: number;
      enquiries: number;
      audits: number;
      outbox: number;
    }>(
      `SELECT
         (SELECT count(*)::int FROM customers WHERE user_id = $1) AS customers,
         (SELECT count(*)::int FROM enquiries WHERE reference_code = $2) AS enquiries,
         (SELECT count(*)::int FROM audit_events WHERE request_id = $3) AS audits,
         (SELECT count(*)::int FROM outbox_events WHERE payload->>'referenceCode' = $2) AS outbox`,
      [user.id, `ENQ-${stableCode(label, 10)}`, `dbint-enquiry-${label}`],
    );
    expect(state.rows[0]).toEqual({
      customers: 0,
      enquiries: 0,
      audits: 0,
      outbox: 0,
    });
  });
});

describe("DBINT-06 enquiry outbox to CRM lead", () => {
  let pool: Pool;

  beforeAll(() => {
    pool = createIntegrationPool();
  });

  afterAll(async () => {
    await pool.end();
  });

  it("creates one lead under concurrent processors and fails malformed payload safely", async () => {
    const flow = await createSyntheticEnquiry(pool, "outbox-to-lead");
    const leads = new PostgresLeadRepository(pool);
    const first = new EnquirySubmittedOutboxProcessor(pool, leads);
    const second = new EnquirySubmittedOutboxProcessor(pool, leads);
    await Promise.all([first.tick(), second.tick()]);

    const leadRows = await pool.query<{
      id: string;
      branch_id: string;
      customer_id: string;
      enquiry_id: string;
    }>(
      `SELECT id, branch_id, customer_id, enquiry_id FROM leads WHERE enquiry_id = $1`,
      [flow.enquiryId],
    );
    expect(leadRows.rows).toHaveLength(1);
    expect(leadRows.rows[0]).toMatchObject({
      branch_id: flow.branchId,
      customer_id: flow.customerId,
      enquiry_id: flow.enquiryId,
    });
    const leadId = leadRows.rows[0]?.id;
    expect(leadId).toBeDefined();

    const companions = await pool.query<{
      activities: number;
      audits: number;
      outbox_status: string;
      attempts: number;
    }>(
      `SELECT
         (SELECT count(*)::int FROM lead_activities WHERE lead_id = $1) AS activities,
         (SELECT count(*)::int FROM audit_events WHERE entity_type = 'lead' AND entity_id = $1 AND action = 'crm.lead.created') AS audits,
         status AS outbox_status,
         attempts
       FROM outbox_events WHERE id = $2`,
      [leadId, flow.outboxId],
    );
    expect(companions.rows[0]).toEqual({
      activities: 1,
      audits: 1,
      outbox_status: "published",
      attempts: 1,
    });

    await first.tick();
    const repeated = await pool.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM leads WHERE enquiry_id = $1`,
      [flow.enquiryId],
    );
    expect(repeated.rows[0]?.count).toBe(1);

    const malformedId = stableUuid("outbox-malformed-enquiry-submitted");
    await pool.query(
      `INSERT INTO outbox_events (
         id, topic, aggregate_type, aggregate_id, aggregate_version,
         payload, attempts
       ) VALUES ($1, 'enquiry.submitted', 'enquiry', $2, 1, $3::jsonb, 7)`,
      [
        malformedId,
        flow.enquiryId,
        JSON.stringify({ enquiryId: 42, branchId: flow.branchId }),
      ],
    );
    await second.tick();
    const malformed = await pool.query<{
      status: string;
      attempts: number;
      last_error: string | null;
    }>(`SELECT status, attempts, last_error FROM outbox_events WHERE id = $1`, [
      malformedId,
    ]);
    expect(malformed.rows[0]).toMatchObject({
      status: "failed",
      attempts: 8,
    });
    expect(malformed.rows[0]?.last_error).toContain("enquiryId");
    expect(repeated.rows[0]?.count).toBe(1);
    first.onModuleDestroy();
    second.onModuleDestroy();
  });

  it("retries stranded processing after crash and keeps one lead under two workers", async () => {
    const flow = await createSyntheticEnquiry(pool, "outbox-crash-before-lead");
    await strandExpiredProcessing(pool, flow.outboxId, 1);
    const leads = new PostgresLeadRepository(pool);
    const first = new EnquirySubmittedOutboxProcessor(pool, leads);
    const second = new EnquirySubmittedOutboxProcessor(pool, leads);
    await Promise.all([first.tick(), second.tick()]);

    const leadRows = await pool.query<{ id: string }>(
      `SELECT id FROM leads WHERE enquiry_id = $1`,
      [flow.enquiryId],
    );
    expect(leadRows.rows).toHaveLength(1);
    const outbox = await pool.query<{ status: string; attempts: number }>(
      `SELECT status, attempts FROM outbox_events WHERE id = $1`,
      [flow.outboxId],
    );
    expect(outbox.rows[0]).toMatchObject({
      status: "published",
      attempts: 2,
    });
    await first.tick();
    const repeated = await pool.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM leads WHERE enquiry_id = $1`,
      [flow.enquiryId],
    );
    expect(repeated.rows[0]?.count).toBe(1);
    first.onModuleDestroy();
    second.onModuleDestroy();
  });

  it("publishes after crash when the lead already exists", async () => {
    const flow = await createSyntheticEnquiry(pool, "outbox-crash-after-lead");
    const leads = new PostgresLeadRepository(pool);
    const created = await leads.createFromEnquirySubmitted({
      enquiryId: flow.enquiryId,
      branchId: flow.branchId,
      customerId: flow.customerId,
      firstResponseDueAt: "2026-08-26T13:00:00.000Z",
    });
    expect(created.created).toBe(true);
    await strandExpiredProcessing(pool, flow.outboxId, 1);
    const processor = new EnquirySubmittedOutboxProcessor(pool, leads);
    await processor.tick();
    const leadRows = await pool.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM leads WHERE enquiry_id = $1`,
      [flow.enquiryId],
    );
    expect(leadRows.rows[0]?.count).toBe(1);
    const outbox = await pool.query<{ status: string }>(
      `SELECT status FROM outbox_events WHERE id = $1`,
      [flow.outboxId],
    );
    expect(outbox.rows[0]?.status).toBe("published");
    processor.onModuleDestroy();
  });

  it("does not steal an unexpired processing lease", async () => {
    const flow = await createSyntheticEnquiry(pool, "outbox-active-lease");
    await pool.query(
      `UPDATE outbox_events
       SET status = 'processing',
           attempts = 1,
           available_at = now() + interval '5 minutes'
       WHERE id = $1`,
      [flow.outboxId],
    );
    const leads = new PostgresLeadRepository(pool);
    const processor = new EnquirySubmittedOutboxProcessor(pool, leads);
    await processor.tick();
    const outbox = await pool.query<{ status: string; attempts: number }>(
      `SELECT status, attempts FROM outbox_events WHERE id = $1`,
      [flow.outboxId],
    );
    expect(outbox.rows[0]).toEqual({ status: "processing", attempts: 1 });
    const leadRows = await pool.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM leads WHERE enquiry_id = $1`,
      [flow.enquiryId],
    );
    expect(leadRows.rows[0]?.count).toBe(0);
    processor.onModuleDestroy();
  });

  it("dead-letters a stranded poison payload instead of looping pending", async () => {
    const malformedId = stableUuid("outbox-poison-stranded-processing");
    await pool.query(
      `INSERT INTO outbox_events (
         id, topic, aggregate_type, aggregate_id, aggregate_version,
         payload, status, attempts, available_at
       ) VALUES (
         $1, 'enquiry.submitted', 'enquiry', $2, 1, $3::jsonb,
         'processing', 7, now() - interval '1 second'
       )`,
      [
        malformedId,
        stableUuid("outbox-poison-stranded-enquiry"),
        JSON.stringify({ enquiryId: 42, branchId: HYDERABAD_BRANCH_ID }),
      ],
    );
    const leads = new PostgresLeadRepository(pool);
    const processor = new EnquirySubmittedOutboxProcessor(pool, leads);
    await processor.tick();
    const malformed = await pool.query<{
      status: string;
      attempts: number;
    }>(`SELECT status, attempts FROM outbox_events WHERE id = $1`, [
      malformedId,
    ]);
    expect(malformed.rows[0]).toEqual({ status: "failed", attempts: 8 });
    processor.onModuleDestroy();
  });

  it("inserts one lead when two createFromEnquirySubmitted calls race", async () => {
    const flow = await createSyntheticEnquiry(pool, "lead-unique-race");
    const leads = new PostgresLeadRepository(pool);
    const payload = {
      enquiryId: flow.enquiryId,
      branchId: flow.branchId,
      customerId: flow.customerId,
      firstResponseDueAt: "2026-08-26T13:00:00.000Z",
    };
    const results = await Promise.all([
      leads.createFromEnquirySubmitted(payload),
      leads.createFromEnquirySubmitted(payload),
    ]);
    expect(new Set(results.map((row) => row.leadId)).size).toBe(1);
    expect(results.filter((row) => row.created)).toHaveLength(1);
    const count = await pool.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM leads WHERE enquiry_id = $1`,
      [flow.enquiryId],
    );
    expect(count.rows[0]?.count).toBe(1);
  });
});

describe("DBINT-07 CRM lead update back to enquiry", () => {
  let pool: Pool;

  beforeAll(() => {
    pool = createIntegrationPool();
  });

  afterAll(async () => {
    await pool.end();
  });

  it("publishes supported status changes idempotently and rejects malformed payload", async () => {
    const flow = await createSyntheticLeadFlow(pool, "lead-to-enquiry");
    const leads = new PostgresLeadRepository(pool);
    const enquiries = new PostgresEnquiryRepository(pool);
    const updated = await leads.updateStatus(
      flow.leadId,
      "contacted",
      flow.employee.id,
      "employee",
      "dbint-lead-contacted",
      HYDERABAD_BRANCH_ID,
    );
    expect(updated?.status).toBe("contacted");

    const processor = new LeadUpdatedOutboxProcessor(pool, enquiries);
    await processor.tick();
    expect(
      (await enquiries.findForCustomerUser(flow.user.id, flow.enquiryId))
        ?.status,
    ).toBe("in_discussion");

    const evidence = await pool.query<{
      activities: number;
      audits: number;
      published: number;
      distinct_versions: number;
    }>(
      `SELECT
         (SELECT count(*)::int FROM lead_activities WHERE lead_id = $1 AND activity_type IN ('ownership', 'status_change')) AS activities,
         (SELECT count(*)::int FROM audit_events WHERE entity_type = 'lead' AND entity_id = $1 AND action IN ('crm.lead.claimed', 'crm.lead.status_updated')) AS audits,
         (SELECT count(*)::int FROM outbox_events WHERE aggregate_id = $1 AND topic = 'crm.lead.updated' AND status = 'published') AS published,
         (SELECT count(DISTINCT aggregate_version)::int FROM outbox_events WHERE aggregate_id = $1 AND topic = 'crm.lead.updated') AS distinct_versions`,
      [flow.leadId],
    );
    expect(evidence.rows[0]).toEqual({
      activities: 3,
      audits: 2,
      published: 2,
      distinct_versions: 2,
    });
    await processor.tick();

    const before = await pool.query<{ status: string; version: number }>(
      `SELECT status, version FROM enquiries WHERE id = $1`,
      [flow.enquiryId],
    );
    const malformedId = stableUuid("outbox-malformed-lead-updated");
    await pool.query(
      `INSERT INTO outbox_events (
         id, topic, aggregate_type, aggregate_id, aggregate_version,
         payload, attempts
       ) VALUES ($1, 'crm.lead.updated', 'lead', $2, 99, $3::jsonb, 7)`,
      [
        malformedId,
        flow.leadId,
        JSON.stringify({
          leadId: flow.leadId,
          enquiryId: flow.enquiryId,
          status: "not-a-real-status",
        }),
      ],
    );
    await processor.tick();
    const after = await pool.query<{ status: string; version: number }>(
      `SELECT status, version FROM enquiries WHERE id = $1`,
      [flow.enquiryId],
    );
    expect(after.rows[0]).toEqual(before.rows[0]);
    expect(
      (
        await pool.query<{ status: string; attempts: number }>(
          `SELECT status, attempts FROM outbox_events WHERE id = $1`,
          [malformedId],
        )
      ).rows[0],
    ).toEqual({ status: "failed", attempts: 8 });
    processor.onModuleDestroy();
  });

  it("retries stranded crm.lead.updated processing without duplicating enquiry status", async () => {
    const flow = await createSyntheticLeadFlow(pool, "lead-updated-crash");
    const pending = await pool.query<{ id: string }>(
      `SELECT id FROM outbox_events
       WHERE topic = 'crm.lead.updated' AND aggregate_id = $1 AND status = 'pending'`,
      [flow.leadId],
    );
    expect(pending.rows.length).toBeGreaterThan(0);
    for (const row of pending.rows) {
      await strandExpiredProcessing(pool, row.id, 1);
    }
    const enquiries = new PostgresEnquiryRepository(pool);
    const first = new LeadUpdatedOutboxProcessor(pool, enquiries);
    const second = new LeadUpdatedOutboxProcessor(pool, enquiries);
    await Promise.all([first.tick(), second.tick()]);
    expect(
      (await enquiries.findForCustomerUser(flow.user.id, flow.enquiryId))
        ?.status,
    ).toBe("contact_pending");
    const published = await pool.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM outbox_events
       WHERE topic = 'crm.lead.updated' AND aggregate_id = $1 AND status = 'published'`,
      [flow.leadId],
    );
    expect(published.rows[0]?.count).toBe(pending.rows.length);
    const before = (
      await enquiries.findForCustomerUser(flow.user.id, flow.enquiryId)
    )?.status;
    await first.tick();
    expect(
      (await enquiries.findForCustomerUser(flow.user.id, flow.enquiryId))
        ?.status,
    ).toBe(before);
    first.onModuleDestroy();
    second.onModuleDestroy();
  });
});

describe("DBINT-08 quotation lifecycle", () => {
  let pool: Pool;

  beforeAll(() => {
    pool = createIntegrationPool();
  });

  afterAll(async () => {
    await pool.end();
  });

  it("creates, sends, and approves once with decimal and ownership guarantees", async () => {
    const flow = await createSyntheticLeadFlow(pool, "quotation-lifecycle");
    const repository = new PostgresQuotationRepository(pool);
    const service = new QuotationService(repository);
    const draft = await service.create(
      flow.employee.principal,
      {
        leadId: flow.leadId,
        items: [
          {
            itemType: "service",
            title: "Synthetic lifecycle service",
            quantity: 2,
            unitPrice: 1_000,
            sortOrder: 0,
          },
        ],
        gstPercent: 18,
        discountAmount: 0,
        discountPercent: 0,
        advancePercent: 30,
      },
      "dbint-quotation-lifecycle-create",
    );
    expect(draft).toMatchObject({
      status: "draft",
      leadId: flow.leadId,
      enquiryId: flow.enquiryId,
      customerId: flow.customerId,
      revision: {
        revisionNumber: 1,
        subtotal: "2000.00",
        gstAmount: "360.00",
        finalAmount: "2360.00",
        advanceAmount: "708.00",
      },
    });
    expect(draft.items).toEqual([
      expect.objectContaining({
        quantity: "2.00",
        unitPrice: "1000.00",
        lineTotal: "2000.00",
      }),
    ]);

    const sent = await service.send(
      flow.employee.principal,
      draft.id,
      "dbint-quotation-lifecycle-send",
    );
    expect(sent.status).toBe("sent");
    const plan = await pool.query<{
      total_amount: string;
      advance_amount: string;
      balance_amount: string;
    }>(
      `SELECT total_amount, advance_amount, balance_amount
       FROM payment_plans WHERE quotation_id = $1`,
      [draft.id],
    );
    expect(plan.rows[0]).toEqual({
      total_amount: "2360.00",
      advance_amount: "708.00",
      balance_amount: "1652.00",
    });

    const other = await insertSyntheticUser(pool, "quotation-other-customer");
    await expect(
      service.getOwn(other.principal, draft.id),
    ).rejects.toMatchObject({ code: "QUOTATION_NOT_FOUND", status: 404 });
    await expect(
      service.approve(
        other.principal,
        draft.id,
        "dbint-quotation-wrong-approve",
      ),
    ).rejects.toMatchObject({ code: "QUOTATION_NOT_APPROVABLE", status: 409 });

    const approved = await service.approve(
      flow.user.principal,
      draft.id,
      "dbint-quotation-valid-approve",
    );
    expect(approved.status).toBe("approved");
    await expect(
      service.approve(
        flow.user.principal,
        draft.id,
        "dbint-quotation-duplicate-approve",
      ),
    ).rejects.toMatchObject({ code: "QUOTATION_NOT_APPROVABLE", status: 409 });

    const companions = await pool.query<{
      activities: number;
      audits: number;
      outbox: number;
    }>(
      `SELECT
         (SELECT count(*)::int FROM quotation_activities WHERE quotation_id = $1 AND activity_type IN ('created', 'sent', 'approved')) AS activities,
         (SELECT count(*)::int FROM audit_events WHERE entity_type = 'quotation' AND entity_id = $1 AND action IN ('quotation.created', 'quotation.sent', 'quotation.approved')) AS audits,
         (SELECT count(*)::int FROM outbox_events WHERE aggregate_type = 'quotation' AND aggregate_id = $1 AND topic IN ('quotation.created', 'quotation.sent', 'quotation.approved')) AS outbox`,
      [draft.id],
    );
    expect(companions.rows[0]).toEqual({ activities: 3, audits: 3, outbox: 3 });
  });
});

describe("DBINT-09 advance submission", () => {
  let pool: Pool;

  beforeAll(() => {
    pool = createIntegrationPool();
  });

  afterAll(async () => {
    await pool.end();
  });

  it("binds the plan amount and rejects wrong owner, state, and duplicates", async () => {
    const approved = await createApprovedQuotationFlow(pool, "advance-valid");
    const repository = new PostgresPaymentRepository(pool);
    const service = new PaymentService(repository);
    const other = await insertSyntheticUser(pool, "advance-other-customer");

    await expect(
      service.submitAdvance(other.principal, {
        quotationId: approved.approved.id,
        method: "upi",
      }),
    ).rejects.toMatchObject({ code: "ADVANCE_NOT_SUBMITTABLE", status: 409 });

    const unsentApproval = await createSentQuotationFlow(
      pool,
      "advance-not-approved",
    );
    await expect(
      service.submitAdvance(unsentApproval.user.principal, {
        quotationId: unsentApproval.quotation.id,
        method: "cash",
      }),
    ).rejects.toMatchObject({ code: "ADVANCE_NOT_SUBMITTABLE", status: 409 });

    const payment = await service.submitAdvance(
      approved.user.principal,
      {
        quotationId: approved.approved.id,
        method: "upi",
        notes: "Synthetic submission evidence",
      },
      "dbint-advance-valid-submit",
    );
    expect(payment).toMatchObject({
      quotationId: approved.approved.id,
      amount: "708.00",
      status: "pending",
      method: "upi",
    });
    await expect(
      service.submitAdvance(approved.user.principal, {
        quotationId: approved.approved.id,
        method: "upi",
      }),
    ).rejects.toMatchObject({ code: "ADVANCE_NOT_SUBMITTABLE", status: 409 });

    const evidence = await pool.query<{
      payments: number;
      activities: number;
      audits: number;
      outbox: number;
    }>(
      `SELECT
         (SELECT count(*)::int FROM payments WHERE quotation_id = $1 AND kind = 'advance') AS payments,
         (SELECT count(*)::int FROM quotation_activities WHERE quotation_id = $1 AND content LIKE 'Advance payment submitted%') AS activities,
         (SELECT count(*)::int FROM audit_events WHERE entity_type = 'payment' AND entity_id = $2 AND action = 'payment.advance_submitted') AS audits,
         (SELECT count(*)::int FROM outbox_events WHERE aggregate_type = 'payment' AND aggregate_id = $2 AND topic = 'payment.advance_submitted') AS outbox`,
      [approved.approved.id, payment.id],
    );
    expect(evidence.rows[0]).toEqual({
      payments: 1,
      activities: 1,
      audits: 1,
      outbox: 1,
    });
  });
});

describe("DBINT-10 and DBINT-11 advance confirmation, concurrency, and Pattern B", () => {
  let pool: Pool;

  beforeAll(() => {
    pool = createIntegrationPool();
  });

  afterAll(async () => {
    await pool.end();
  });

  it("allows one concurrent confirmation and creates one internally consistent outcome", async () => {
    const flow = await createPendingAdvanceFlow(
      pool,
      "confirmation-concurrent",
    );
    const results = await Promise.allSettled([
      flow.paymentService.confirmAdvance(
        flow.employee.principal,
        flow.payment.id,
        "dbint-confirm-concurrent-a",
      ),
      flow.paymentService.confirmAdvance(
        flow.employee.principal,
        flow.payment.id,
        "dbint-confirm-concurrent-b",
      ),
    ]);
    const fulfilled = results.filter((result) => result.status === "fulfilled");
    expect(fulfilled).toHaveLength(1);
    expect(
      results
        .filter((result) => result.status === "rejected")
        .map((result) => errorCode(result.reason)),
    ).toEqual(["PAYMENT_NOT_CONFIRMABLE"]);
    const outcome = fulfilled[0];
    if (outcome?.status !== "fulfilled") {
      throw new Error("Concurrent confirmation did not produce a winner");
    }

    expect(outcome.value.payment.status).toBe("paid");
    expect(outcome.value.booking).toMatchObject({
      quotationId: flow.approved.id,
      enquiryId: flow.enquiryId,
      leadId: flow.leadId,
      eventRecordId: outcome.value.eventRecord.id,
      eventNumber: outcome.value.eventRecord.eventNumber,
    });
    expect(outcome.value.eventRecord).toMatchObject({
      bookingId: outcome.value.booking.id,
      quotationId: flow.approved.id,
      enquiryId: flow.enquiryId,
      leadId: flow.leadId,
      customerId: flow.customerId,
      budgetAmount: "2360.00",
      advancePaid: "708.00",
      pendingAmount: "1652.00",
      status: "booking_confirmed",
    });

    const state = await pool.query<{
      bookings: number;
      events: number;
      booking_activities: number;
      quotation_activities: number;
      timelines: number;
      event_activities: number;
      histories: number;
      audits: number;
      outbox: number;
      lead_status: string;
      enquiry_status: string;
    }>(
      `SELECT
         (SELECT count(*)::int FROM bookings WHERE quotation_id = $1) AS bookings,
         (SELECT count(*)::int FROM event_records WHERE quotation_id = $1) AS events,
         (SELECT count(*)::int FROM booking_activities WHERE booking_id = $2) AS booking_activities,
         (SELECT count(*)::int FROM quotation_activities WHERE quotation_id = $1 AND content LIKE 'Advance confirmed%') AS quotation_activities,
         (SELECT count(*)::int FROM event_timelines WHERE event_record_id = $3) AS timelines,
         (SELECT count(*)::int FROM event_activities WHERE event_record_id = $3) AS event_activities,
         (SELECT count(*)::int FROM event_status_history WHERE event_record_id = $3) AS histories,
         (SELECT count(*)::int FROM audit_events WHERE (entity_type, entity_id) IN (('payment', $4), ('booking', $2), ('event_record', $3)) AND action IN ('payment.advance_confirmed', 'booking.created', 'event_record.created')) AS audits,
         (SELECT count(*)::int FROM outbox_events WHERE (aggregate_type, aggregate_id) IN (('payment', $4), ('booking', $2), ('event_record', $3)) AND topic IN ('payment.advance_confirmed', 'booking.created', 'event_record.created')) AS outbox,
         (SELECT status FROM leads WHERE id = $5) AS lead_status,
         (SELECT status FROM enquiries WHERE id = $6) AS enquiry_status`,
      [
        flow.approved.id,
        outcome.value.booking.id,
        outcome.value.eventRecord.id,
        flow.payment.id,
        flow.leadId,
        flow.enquiryId,
      ],
    );
    expect(state.rows[0]).toEqual({
      bookings: 1,
      events: 1,
      booking_activities: 1,
      quotation_activities: 1,
      timelines: 2,
      event_activities: 1,
      histories: 1,
      audits: 3,
      outbox: 3,
      lead_status: "converted",
      enquiry_status: "closed",
    });

    const bookings = new PostgresBookingRepository(pool);
    const events = new PostgresEventRecordRepository(pool);
    expect(
      await bookings.findForCustomerUser(
        flow.user.id,
        outcome.value.booking.id,
      ),
    ).toMatchObject({ id: outcome.value.booking.id });
    expect(
      await events.findForCustomerUser(
        flow.user.id,
        outcome.value.eventRecord.id,
      ),
    ).toMatchObject({ id: outcome.value.eventRecord.id });

    await expect(
      flow.paymentService.confirmAdvance(
        flow.employee.principal,
        flow.payment.id,
        "dbint-confirm-after-success",
      ),
    ).rejects.toMatchObject({ code: "PAYMENT_NOT_CONFIRMABLE", status: 409 });
    expect(
      (
        await pool.query<{ bookings: number; events: number }>(
          `SELECT
             (SELECT count(*)::int FROM bookings WHERE quotation_id = $1) AS bookings,
             (SELECT count(*)::int FROM event_records WHERE quotation_id = $1) AS events`,
          [flow.approved.id],
        )
      ).rows[0],
    ).toEqual({ bookings: 1, events: 1 });
  });
});

describe("DBINT-12 forced lifecycle rollback", () => {
  let pool: Pool;

  beforeAll(() => {
    pool = createIntegrationPool();
  });

  afterAll(async () => {
    await pool.end();
  });

  it("rolls back a paid update and every companion after a late booking uniqueness failure", async () => {
    const occupied = await createPendingAdvanceFlow(pool, "rollback-occupied");
    const occupiedResult = await confirmPendingAdvance(
      occupied,
      "rollback-occupied",
    );
    const target = await createPendingAdvanceFlow(pool, "rollback-target");
    const before = await pool.query<{
      quotation_activities: number;
      lead_status: string;
      enquiry_status: string;
    }>(
      `SELECT
         (SELECT count(*)::int FROM quotation_activities WHERE quotation_id = $1) AS quotation_activities,
         (SELECT status FROM leads WHERE id = $2) AS lead_status,
         (SELECT status FROM enquiries WHERE id = $3) AS enquiry_status`,
      [target.approved.id, target.leadId, target.enquiryId],
    );

    await expect(
      target.paymentRepository.confirmAdvance({
        paymentId: target.payment.id,
        branchId: HYDERABAD_BRANCH_ID,
        actorUserId: target.employee.id,
        actorRole: "employee",
        requestId: "dbint-forced-lifecycle-rollback",
        bookingNumber: occupiedResult.booking.bookingNumber,
        eventNumber: `EV-${stableCode("rollback-target", 10)}`,
      }),
    ).rejects.toMatchObject({ code: "23505" });

    const after = await pool.query<{
      payment_status: string;
      bookings: number;
      events: number;
      quotation_activities: number;
      audits: number;
      outbox: number;
      lead_status: string;
      enquiry_status: string;
    }>(
      `SELECT
         (SELECT status FROM payments WHERE id = $1) AS payment_status,
         (SELECT count(*)::int FROM bookings WHERE quotation_id = $2) AS bookings,
         (SELECT count(*)::int FROM event_records WHERE quotation_id = $2) AS events,
         (SELECT count(*)::int FROM quotation_activities WHERE quotation_id = $2) AS quotation_activities,
         (SELECT count(*)::int FROM audit_events WHERE request_id = $3) AS audits,
         (SELECT count(*)::int FROM outbox_events WHERE topic IN ('payment.advance_confirmed', 'booking.created', 'event_record.created') AND payload->>'paymentId' = $1::text) AS outbox,
         (SELECT status FROM leads WHERE id = $4) AS lead_status,
         (SELECT status FROM enquiries WHERE id = $5) AS enquiry_status`,
      [
        target.payment.id,
        target.approved.id,
        "dbint-forced-lifecycle-rollback",
        target.leadId,
        target.enquiryId,
      ],
    );
    expect(after.rows[0]).toEqual({
      payment_status: "pending",
      bookings: 0,
      events: 0,
      quotation_activities: before.rows[0]?.quotation_activities,
      audits: 0,
      outbox: 0,
      lead_status: before.rows[0]?.lead_status,
      enquiry_status: before.rows[0]?.enquiry_status,
    });
  });
});

describe("DBINT-13 ownership and branch isolation", () => {
  let pool: Pool;

  beforeAll(() => {
    pool = createIntegrationPool();
  });

  afterAll(async () => {
    await pool.end();
  });

  it("denies cross-customer reads and isolates branch list projections", async () => {
    const customerA = await createPendingAdvanceFlow(pool, "ownership-a");
    const resultA = await confirmPendingAdvance(customerA, "ownership-a");
    const customerB = await createPendingAdvanceFlow(pool, "ownership-b");
    const resultB = await confirmPendingAdvance(customerB, "ownership-b");

    const enquiries = new PostgresEnquiryRepository(pool);
    const quotations = new PostgresQuotationRepository(pool);
    const payments = new PostgresPaymentRepository(pool);
    const bookings = new PostgresBookingRepository(pool);
    const events = new PostgresEventRecordRepository(pool);
    expect(
      await enquiries.findForCustomerUser(
        customerA.user.id,
        customerB.enquiryId,
      ),
    ).toBeUndefined();
    expect(
      await quotations.findForCustomerUser(
        customerA.user.id,
        customerB.approved.id,
      ),
    ).toBeUndefined();
    expect(
      (await payments.listForCustomerUser(customerA.user.id)).map(
        (payment) => payment.id,
      ),
    ).not.toContain(customerB.payment.id);
    expect(
      await bookings.findForCustomerUser(customerA.user.id, resultB.booking.id),
    ).toBeUndefined();
    expect(
      await events.findForCustomerUser(
        customerA.user.id,
        resultB.eventRecord.id,
      ),
    ).toBeUndefined();
    expect(
      await bookings.findForCustomerUser(customerA.user.id, resultA.booking.id),
    ).toMatchObject({ id: resultA.booking.id });

    const secondBranch = await insertSyntheticBranch(pool, "isolation-branch");
    const branchFlow = await createPendingAdvanceFlow(
      pool,
      "isolation-branch-flow",
      secondBranch,
    );
    const branchResult = await confirmPendingAdvance(
      branchFlow,
      "isolation-branch-flow",
    );
    const leads = new PostgresLeadRepository(pool);
    expect(
      (await leads.listForBranch(secondBranch)).map((row) => row.id),
    ).toEqual([branchFlow.leadId]);
    expect(
      (await quotations.listForBranch(secondBranch)).map((row) => row.id),
    ).toEqual([branchFlow.approved.id]);
    expect(
      (await bookings.listForBranch(secondBranch)).map((row) => row.id),
    ).toEqual([branchResult.booking.id]);
    expect(
      (await events.listForBranch(secondBranch)).map((row) => row.id),
    ).toEqual([branchResult.eventRecord.id]);
    expect(
      (await leads.listForBranch(HYDERABAD_BRANCH_ID)).map((row) => row.id),
    ).not.toContain(branchFlow.leadId);
    expect(
      (await events.listForBranch(HYDERABAD_BRANCH_ID)).map((row) => row.id),
    ).not.toContain(branchResult.eventRecord.id);
    expect(
      await leads.findById(branchFlow.leadId, HYDERABAD_BRANCH_ID),
    ).toBeUndefined();
    expect(await leads.findById(branchFlow.leadId, secondBranch)).toMatchObject(
      { id: branchFlow.leadId },
    );
    expect(
      await quotations.findById(branchFlow.approved.id, HYDERABAD_BRANCH_ID),
    ).toBeUndefined();
    expect(
      await quotations.findById(branchFlow.approved.id, secondBranch),
    ).toMatchObject({ id: branchFlow.approved.id });
    expect(
      await bookings.findById(branchResult.booking.id, HYDERABAD_BRANCH_ID),
    ).toBeUndefined();
    expect(
      await bookings.findById(branchResult.booking.id, secondBranch),
    ).toMatchObject({ id: branchResult.booking.id });
    expect(
      await events.findById(branchResult.eventRecord.id, HYDERABAD_BRANCH_ID),
    ).toBeUndefined();
    expect(
      await events.findById(branchResult.eventRecord.id, secondBranch),
    ).toMatchObject({ id: branchResult.eventRecord.id });
  });
});

function errorCode(error: unknown): string | undefined {
  if (error === null || typeof error !== "object" || !("code" in error)) {
    return undefined;
  }
  const { code } = error;
  return typeof code === "string" ? code : undefined;
}
