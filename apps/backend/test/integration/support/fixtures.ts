import type { AuthenticatedPrincipal } from "../../../src/modules/platform-foundation/domain/platform-foundation";
import type { PlatformRole } from "@me-event/shared-types";
import { createHash } from "node:crypto";
import type { Pool } from "pg";
import { PostgresEnquiryRepository } from "../../../src/modules/enquiries/adapters/postgres-enquiry.repository";
import { PostgresLeadRepository } from "../../../src/modules/crm/adapters/postgres-lead.repository";

export const HYDERABAD_BRANCH_ID = "00000000-0000-4000-8000-000000000001";

export interface SyntheticUser {
  readonly id: string;
  readonly mobileNumber: string;
  readonly principal: AuthenticatedPrincipal;
}

export interface SyntheticEnquiry {
  readonly user: SyntheticUser;
  readonly customerId: string;
  readonly enquiryId: string;
  readonly eventTypeId: string;
  readonly branchId: string;
  readonly outboxId: string;
}

export interface SyntheticLeadFlow extends SyntheticEnquiry {
  readonly leadId: string;
  readonly employee: SyntheticUser;
}

export function stableUuid(label: string): string {
  const hex = createHash("sha256").update(`mee-dbint:${label}`).digest("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `8${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join("-");
}

export function syntheticMobile(label: string): string {
  const source = createHash("sha256")
    .update(`mee-dbint-mobile:${label}`)
    .digest("hex")
    .slice(0, 12);
  const suffix = (BigInt(`0x${source}`) % 1_000_000_000n)
    .toString()
    .padStart(9, "0");
  return `+919${suffix}`;
}

export async function insertSyntheticUser(
  pool: Pool,
  label: string,
  role: PlatformRole = "customer",
  branchId: string = HYDERABAD_BRANCH_ID,
): Promise<SyntheticUser> {
  const id = stableUuid(`user:${label}`);
  const mobileNumber = syntheticMobile(label);
  await pool.query(
    `INSERT INTO app_users (id, mobile_e164, display_name, last_active_role)
     VALUES ($1, $2, $3, $4)`,
    [id, mobileNumber, `Synthetic DBINT ${label}`, role],
  );
  await pool.query(
    `INSERT INTO role_assignments (
       id, user_id, role, state, scope_type, scope_id, verified_at
     ) VALUES ($1, $2, $3, 'active', 'branch', $4, now())`,
    [stableUuid(`role:${label}:${role}`), id, role, branchId],
  );
  return {
    id,
    mobileNumber,
    principal: {
      userId: id,
      sessionId: stableUuid(`session-principal:${label}`),
      activeRole: role,
      roleAssignments: [{ role, active: true, scopeId: branchId }],
      branchId,
    },
  };
}

export async function insertSyntheticBranch(
  pool: Pool,
  label: string,
): Promise<string> {
  const id = stableUuid(`branch:${label}`);
  await pool.query(
    `INSERT INTO branches (id, code, name, city, state)
     VALUES ($1, $2, $3, 'Secunderabad', 'Telangana')`,
    [id, `T${stableCode(label, 6)}`, `Synthetic DBINT branch ${label}`],
  );
  return id;
}

export async function createSyntheticEnquiry(
  pool: Pool,
  label: string,
  branchId: string = HYDERABAD_BRANCH_ID,
): Promise<SyntheticEnquiry> {
  const user = await insertSyntheticUser(
    pool,
    `${label}:customer`,
    "customer",
    branchId,
  );
  const eventType = await pool.query<{ id: string }>(
    `SELECT id FROM event_types WHERE code = 'wedding'`,
  );
  const eventTypeId = eventType.rows[0]?.id;
  if (eventTypeId === undefined) {
    throw new Error("Migration-created wedding event type is missing");
  }
  const repository = new PostgresEnquiryRepository(pool);
  const created = await repository.createEnquiry({
    branchId,
    userId: user.id,
    eventTypeId,
    referenceCode: `ENQ-${stableCode(label, 10)}`,
    eventDate: "2027-02-14",
    location: `Synthetic venue ${label}`,
    guestCount: 240,
    budgetMin: 100_000,
    budgetMax: 200_000,
    notes: `Synthetic integration enquiry ${label}`,
    serviceCategoryCodes: ["catering", "decoration"],
    planItems: [],
    contactPreference: "phone",
    firstResponseDueAt: new Date("2026-08-26T13:00:00.000Z"),
    requestId: `dbint-enquiry-${label}`,
  });
  const context = await pool.query<{
    customer_id: string;
    outbox_id: string;
  }>(
    `SELECT e.customer_id, o.id AS outbox_id
     FROM enquiries e
     JOIN outbox_events o
       ON o.aggregate_id = e.id AND o.topic = 'enquiry.submitted'
     WHERE e.id = $1`,
    [created.enquiryId],
  );
  const row = context.rows[0];
  if (row === undefined) {
    throw new Error("Synthetic enquiry companion rows are missing");
  }
  return {
    user,
    customerId: row.customer_id,
    enquiryId: created.enquiryId,
    eventTypeId,
    branchId,
    outboxId: row.outbox_id,
  };
}

export async function createSyntheticLeadFlow(
  pool: Pool,
  label: string,
  branchId: string = HYDERABAD_BRANCH_ID,
): Promise<SyntheticLeadFlow> {
  const enquiry = await createSyntheticEnquiry(pool, label, branchId);
  const leads = new PostgresLeadRepository(pool);
  const created = await leads.createFromEnquirySubmitted({
    enquiryId: enquiry.enquiryId,
    branchId,
    customerId: enquiry.customerId,
    firstResponseDueAt: "2026-08-26T13:00:00.000Z",
  });
  await pool.query(
    `UPDATE outbox_events
     SET status = 'published', published_at = now()
     WHERE id = $1`,
    [enquiry.outboxId],
  );
  const employee = await insertSyntheticUser(
    pool,
    `${label}:employee`,
    "employee",
    branchId,
  );
  const claimed = await leads.claimLead(
    created.leadId,
    employee.id,
    "employee",
    `dbint-claim-${label}`,
  );
  if (claimed === undefined) {
    throw new Error("Synthetic lead could not be claimed");
  }
  return { ...enquiry, leadId: created.leadId, employee };
}

export function stableCode(label: string, length: number): string {
  return createHash("sha256")
    .update(`mee-dbint-code:${label}`)
    .digest("hex")
    .slice(0, length)
    .toUpperCase();
}
