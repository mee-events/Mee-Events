import type { Pool } from "pg";

/** Handler failures at this attempt count move the row to `failed`. */
export const OUTBOX_MAX_ATTEMPTS = 8;

/**
 * Claimed `processing` rows stay unclaimable until `available_at`.
 * A crash leaves the lease in the past so the next tick can retry.
 */
export const OUTBOX_LEASE_SECONDS = 30;

export interface OutboxClaim {
  readonly id: string;
  readonly payload: unknown;
  readonly attempts: number;
}

/**
 * Claim due `pending` or lease-expired `processing` rows with
 * `FOR UPDATE SKIP LOCKED`. Extends `available_at` as the processing lease.
 */
export async function claimOutboxBatch(
  pool: Pool,
  topic: string,
  batchSize: number,
  leaseSeconds: number = OUTBOX_LEASE_SECONDS,
): Promise<readonly OutboxClaim[]> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<OutboxClaim>(
      `WITH next_rows AS (
         SELECT id
         FROM outbox_events
         WHERE topic = $1
           AND status IN ('pending', 'processing')
           AND available_at <= now()
         ORDER BY created_at ASC
         FOR UPDATE SKIP LOCKED
         LIMIT $2
       )
       UPDATE outbox_events o
       SET status = 'processing',
           attempts = o.attempts + 1,
           available_at = now() + make_interval(secs => $3::int)
       FROM next_rows
       WHERE o.id = next_rows.id
       RETURNING o.id, o.payload, o.attempts`,
      [topic, batchSize, leaseSeconds],
    );
    await client.query("COMMIT");
    return result.rows;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function markOutboxPublished(
  pool: Pool,
  id: string,
  attempts: number,
): Promise<boolean> {
  const result = await pool.query<{ id: string }>(
    `UPDATE outbox_events
     SET status = 'published',
         published_at = now(),
         last_error = NULL
     WHERE id = $1
       AND status = 'processing'
       AND attempts = $2
     RETURNING id`,
    [id, attempts],
  );
  return result.rows[0] !== undefined;
}

export async function markOutboxAttemptFailed(
  pool: Pool,
  id: string,
  attempts: number,
  message: string,
  maxAttempts: number = OUTBOX_MAX_ATTEMPTS,
): Promise<"failed" | "pending" | "ignored"> {
  const result = await pool.query<{ status: "failed" | "pending" }>(
    `UPDATE outbox_events
     SET status = CASE
           WHEN attempts >= $4 THEN 'failed'
           ELSE 'pending'
         END,
         available_at = now() + make_interval(secs => LEAST(300, attempts * 5)),
         last_error = $3
     WHERE id = $1
       AND status = 'processing'
       AND attempts = $2
     RETURNING status`,
    [id, attempts, message.slice(0, 2000), maxAttempts],
  );
  const status = result.rows[0]?.status;
  if (status === "failed" || status === "pending") {
    return status;
  }
  return "ignored";
}
