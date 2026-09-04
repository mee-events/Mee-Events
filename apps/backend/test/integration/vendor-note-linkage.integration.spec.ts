import type {
  AddVendorNoteRequest,
  VendorAssignmentSummary,
  VendorDetailResponse,
} from "@me-event/api-contracts";
import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgresVendorRepository } from "../../src/modules/vendors/adapters/postgres-vendor.repository";
import { VendorService } from "../../src/modules/vendors/application/vendor.service";
import type { AuthenticatedPrincipal } from "../../src/modules/platform-foundation/domain/platform-foundation";
import { createIntegrationPool } from "./support/database";
import { insertSyntheticUser, stableUuid } from "./support/fixtures";
import {
  confirmPendingAdvance,
  createPendingAdvanceFlow,
} from "./support/workflow";

interface NoteSideEffects {
  readonly notes: number;
  readonly assignment_history: number;
  readonly event_timelines: number;
  readonly event_activities: number;
  readonly vendor_timelines: number;
  readonly vendor_activities: number;
  readonly audits: number;
  readonly outbox: number;
}

describe("DBINT-15 vendor note relationship integrity", () => {
  let pool: Pool;
  let service: VendorService;
  let employee: AuthenticatedPrincipal;
  let vendorA: VendorDetailResponse;
  let vendorB: VendorDetailResponse;
  let assignmentA: VendorAssignmentSummary;
  let assignmentB: VendorAssignmentSummary;

  beforeAll(async () => {
    pool = createIntegrationPool();
    service = new VendorService(new PostgresVendorRepository(pool));

    const flowA = await createPendingAdvanceFlow(pool, "vendor-note-event-a");
    const eventA = await confirmPendingAdvance(flowA, "vendor-note-event-a");
    const flowB = await createPendingAdvanceFlow(pool, "vendor-note-event-b");
    const eventB = await confirmPendingAdvance(flowB, "vendor-note-event-b");
    employee = flowA.employee.principal;

    vendorA = await service.create(
      employee,
      {
        businessName: "DBINT Vendor Note A",
        ownerName: "Synthetic Owner A",
        phoneE164: "+919700000001",
        categoryCodes: ["decoration"],
        city: "Hyderabad",
        state: "Telangana",
      },
      "dbint-vendor-note-create-a",
    );
    vendorB = await service.create(
      employee,
      {
        businessName: "DBINT Vendor Note B",
        ownerName: "Synthetic Owner B",
        phoneE164: "+919700000002",
        categoryCodes: ["catering"],
        city: "Hyderabad",
        state: "Telangana",
      },
      "dbint-vendor-note-create-b",
    );
    assignmentA = await service.assign(
      employee,
      {
        vendorId: vendorA.id,
        eventRecordId: eventA.eventRecord.id,
        status: "assigned",
      },
      "dbint-vendor-note-assign-a",
    );
    assignmentB = await service.assign(
      employee,
      {
        vendorId: vendorB.id,
        eventRecordId: eventB.eventRecord.id,
        status: "assigned",
      },
      "dbint-vendor-note-assign-b",
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  it("writes a same-vendor assignment/event note and its Pattern B side effects atomically", async () => {
    const before = await readNoteSideEffects(
      pool,
      vendorA.id,
      vendorB.id,
      assignmentA,
      assignmentB,
    );
    const note = await service.addCrmNote(
      employee,
      vendorA.id,
      {
        noteType: "internal",
        content: "DBINT valid same-vendor linkage",
        assignmentId: assignmentA.id,
        eventRecordId: assignmentA.eventRecordId,
      },
      "dbint-vendor-note-valid",
    );
    expect(note).toMatchObject({
      vendorId: vendorA.id,
      assignmentId: assignmentA.id,
      eventRecordId: assignmentA.eventRecordId,
    });
    const after = await readNoteSideEffects(
      pool,
      vendorA.id,
      vendorB.id,
      assignmentA,
      assignmentB,
    );
    expect(after).toEqual(incrementEverySideEffect(before));
  });

  it("rejects cross-vendor, mismatched, nonexistent, and wrong-branch targets with no side effects", async () => {
    const invalidBodies: readonly AddVendorNoteRequest[] = [
      {
        noteType: "internal",
        content: "DBINT Vendor B assignment",
        assignmentId: assignmentB.id,
      },
      {
        noteType: "internal",
        content: "DBINT Vendor B event",
        eventRecordId: assignmentB.eventRecordId,
      },
      {
        noteType: "internal",
        content: "DBINT mismatched assignment and event",
        assignmentId: assignmentA.id,
        eventRecordId: assignmentB.eventRecordId,
      },
      {
        noteType: "internal",
        content: "DBINT nonexistent assignment",
        assignmentId: stableUuid("vendor-note-missing-assignment"),
      },
      {
        noteType: "internal",
        content: "DBINT nonexistent event",
        eventRecordId: stableUuid("vendor-note-missing-event"),
      },
    ];

    for (const [index, body] of invalidBodies.entries()) {
      const before = await readNoteSideEffects(
        pool,
        vendorA.id,
        vendorB.id,
        assignmentA,
        assignmentB,
      );
      await expect(
        service.addCrmNote(
          employee,
          vendorA.id,
          body,
          `dbint-vendor-note-invalid-${index}`,
        ),
      ).rejects.toMatchObject({
        code: "VENDOR_NOTE_TARGET_NOT_FOUND",
        status: 404,
      });
      await expect(
        readNoteSideEffects(
          pool,
          vendorA.id,
          vendorB.id,
          assignmentA,
          assignmentB,
        ),
      ).resolves.toEqual(before);
    }

    const beforeWrongBranch = await readNoteSideEffects(
      pool,
      vendorA.id,
      vendorB.id,
      assignmentA,
      assignmentB,
    );
    await expect(
      service.addCrmNote(
        {
          ...employee,
          branchId: stableUuid("vendor-note-wrong-branch"),
        },
        vendorA.id,
        {
          noteType: "internal",
          content: "DBINT wrong branch",
          assignmentId: assignmentA.id,
          eventRecordId: assignmentA.eventRecordId,
        },
        "dbint-vendor-note-wrong-branch",
      ),
    ).rejects.toMatchObject({
      code: "VENDOR_NOTE_TARGET_NOT_FOUND",
      status: 404,
    });
    await expect(
      readNoteSideEffects(
        pool,
        vendorA.id,
        vendorB.id,
        assignmentA,
        assignmentB,
      ),
    ).resolves.toEqual(beforeWrongBranch);
  });

  describe("vendor note classification database persistence", () => {
    let vendorOwner: AuthenticatedPrincipal;

    beforeAll(async () => {
      const vendorUser = await insertSyntheticUser(
        pool,
        "vendor-note-classification-user",
        "vendor_owner",
      );
      await pool.query(
        `INSERT INTO vendor_members (
           id, vendor_id, user_id, member_role, status
         ) VALUES ($1, $2, $3, 'owner', 'active')
         ON CONFLICT (id) DO NOTHING`,
        [
          stableUuid("vendor-note-classification-member"),
          vendorA.id,
          vendorUser.id,
        ],
      );
      vendorOwner = {
        userId: vendorUser.id,
        sessionId: stableUuid("vendor-note-classification-session"),
        activeRole: "vendor_owner",
        roleAssignments: [
          {
            role: "vendor_owner",
            active: true,
            scopeType: "vendor",
            scopeId: vendorA.id,
          },
        ],
      };
    });

    it("persists vendor-self notes with omitted noteType as 'vendor' in database and response", async () => {
      const note = await service.addOwnNote(
        vendorOwner,
        {
          vendorId: vendorA.id,
          content: "DBINT vendor self note omitted noteType",
          assignmentId: assignmentA.id,
          eventRecordId: assignmentA.eventRecordId,
        },
        stableUuid("dbint-vendor-self-note-omitted"),
      );

      expect(note.noteType).toBe("vendor");
      expect(note.content).toBe("DBINT vendor self note omitted noteType");

      const dbRow = await pool.query<{ note_type: string; content: string }>(
        `SELECT note_type, content FROM vendor_notes WHERE id = $1`,
        [note.id],
      );
      expect(dbRow.rows[0]?.note_type).toBe("vendor");
      expect(dbRow.rows[0]?.content).toBe(
        "DBINT vendor self note omitted noteType",
      );
    });

    it("persists vendor-self notes with explicit 'vendor' noteType in database and response", async () => {
      const note = await service.addOwnNote(
        vendorOwner,
        {
          vendorId: vendorA.id,
          content: "DBINT vendor self note explicit vendor",
          noteType: "vendor",
        },
        stableUuid("dbint-vendor-self-note-explicit"),
      );

      expect(note.noteType).toBe("vendor");

      const dbRow = await pool.query<{ note_type: string }>(
        `SELECT note_type FROM vendor_notes WHERE id = $1`,
        [note.id],
      );
      expect(dbRow.rows[0]?.note_type).toBe("vendor");
    });

    it("rejects vendor-self notes attempting 'internal' or 'progress' classification without DB write", async () => {
      await expect(
        service.addOwnNote(
          vendorOwner,
          {
            vendorId: vendorA.id,
            content: "DBINT vendor self attempted internal",
            noteType: "internal",
          },
          stableUuid("dbint-vendor-self-attempted-internal"),
        ),
      ).rejects.toMatchObject({
        code: "INVALID_VENDOR_NOTE_TYPE",
        status: 400,
      });

      await expect(
        service.addOwnNote(
          vendorOwner,
          {
            vendorId: vendorA.id,
            content: "DBINT vendor self attempted progress",
            noteType: "progress",
          },
          stableUuid("dbint-vendor-self-attempted-progress"),
        ),
      ).rejects.toMatchObject({
        code: "INVALID_VENDOR_NOTE_TYPE",
        status: 400,
      });

      const dbRows = await pool.query(
        `SELECT id FROM vendor_notes WHERE content LIKE 'DBINT vendor self attempted%'`,
      );
      expect(dbRows.rowCount).toBe(0);
    });

    it("allows CRM employees to persist 'internal', 'progress', and 'vendor' notes in database", async () => {
      const internalNote = await service.addCrmNote(
        employee,
        vendorA.id,
        {
          content: "DBINT CRM internal note",
          noteType: "internal",
        },
        stableUuid("dbint-crm-internal-note"),
      );
      expect(internalNote.noteType).toBe("internal");
      const dbInternal = await pool.query<{ note_type: string }>(
        `SELECT note_type FROM vendor_notes WHERE id = $1`,
        [internalNote.id],
      );
      expect(dbInternal.rows[0]?.note_type).toBe("internal");

      const progressNote = await service.addCrmNote(
        employee,
        vendorA.id,
        {
          content: "DBINT CRM progress note",
          noteType: "progress",
        },
        stableUuid("dbint-crm-progress-note"),
      );
      expect(progressNote.noteType).toBe("progress");
      const dbProgress = await pool.query<{ note_type: string }>(
        `SELECT note_type FROM vendor_notes WHERE id = $1`,
        [progressNote.id],
      );
      expect(dbProgress.rows[0]?.note_type).toBe("progress");

      const vendorTypeNote = await service.addCrmNote(
        employee,
        vendorA.id,
        {
          content: "DBINT CRM vendor classification note",
          noteType: "vendor",
        },
        stableUuid("dbint-crm-vendor-note"),
      );
      expect(vendorTypeNote.noteType).toBe("vendor");
      const dbVendor = await pool.query<{ note_type: string }>(
        `SELECT note_type FROM vendor_notes WHERE id = $1`,
        [vendorTypeNote.id],
      );
      expect(dbVendor.rows[0]?.note_type).toBe("vendor");
    });
  });
});

async function readNoteSideEffects(
  pool: Pool,
  vendorAId: string,
  vendorBId: string,
  assignmentA: VendorAssignmentSummary,
  assignmentB: VendorAssignmentSummary,
): Promise<NoteSideEffects> {
  const result = await pool.query<NoteSideEffects>(
    `SELECT
       (SELECT count(*)::int FROM vendor_notes
        WHERE vendor_id IN ($1, $2)) AS notes,
       (SELECT count(*)::int FROM vendor_assignment_history
        WHERE assignment_id IN ($3, $4) AND change_type = 'note_added') AS assignment_history,
       (SELECT count(*)::int FROM event_timelines
        WHERE event_record_id IN ($5, $6) AND entry_type = 'vendor_note_added') AS event_timelines,
       (SELECT count(*)::int FROM event_activities
        WHERE event_record_id IN ($5, $6) AND activity_type = 'vendor_note') AS event_activities,
       (SELECT count(*)::int FROM vendor_timelines
        WHERE vendor_id IN ($1, $2) AND entry_type = 'vendor_note_added') AS vendor_timelines,
       (SELECT count(*)::int FROM vendor_activities
        WHERE vendor_id IN ($1, $2) AND activity_type = 'vendor_note') AS vendor_activities,
       (SELECT count(*)::int FROM audit_events
        WHERE entity_type = 'vendor' AND entity_id IN ($1, $2)
          AND action = 'vendor.note_added') AS audits,
       (SELECT count(*)::int FROM outbox_events
        WHERE aggregate_type = 'vendor' AND aggregate_id IN ($1, $2)
          AND topic = 'vendor.note_added') AS outbox`,
    [
      vendorAId,
      vendorBId,
      assignmentA.id,
      assignmentB.id,
      assignmentA.eventRecordId,
      assignmentB.eventRecordId,
    ],
  );
  const row = result.rows[0];
  if (row === undefined) {
    throw new Error("Vendor note side-effect snapshot is missing");
  }
  return row;
}

function incrementEverySideEffect(before: NoteSideEffects): NoteSideEffects {
  return {
    notes: before.notes + 1,
    assignment_history: before.assignment_history + 1,
    event_timelines: before.event_timelines + 1,
    event_activities: before.event_activities + 1,
    vendor_timelines: before.vendor_timelines + 1,
    vendor_activities: before.vendor_activities + 1,
    audits: before.audits + 1,
    outbox: before.outbox + 1,
  };
}
