"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type {
  EventOperationsDetailResponse,
  EventProgressSummary,
  EventRecordSummary,
} from "@me-event/api-contracts";
import {
  clearStoredSession,
  EmployeeApiError,
  type EmployeeSession,
  ensureEventOperations,
  getEventOperations,
  listEvents,
  listOperationsEvents,
  readStoredSession,
  recalculateOperationsProgress,
} from "@/lib/employee-api";

export function OperationsEventsClient() {
  const router = useRouter();
  const search = useSearchParams();
  const focusId = search.get("id");
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [rows, setRows] = useState<readonly EventProgressSummary[]>([]);
  const [events, setEvents] = useState<readonly EventRecordSummary[]>([]);
  const [detail, setDetail] = useState<EventOperationsDetailResponse | null>(
    null,
  );
  const [eventRecordId, setEventRecordId] = useState(focusId ?? "");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (active: EmployeeSession) => {
      try {
        const [ops, eventList] = await Promise.all([
          listOperationsEvents(active),
          listEvents(active),
        ]);
        setRows(ops.events);
        setEvents(eventList.events);
        const selected =
          eventRecordId ||
          focusId ||
          ops.events[0]?.eventRecordId ||
          eventList.events[0]?.id ||
          "";
        if (selected !== "") {
          setEventRecordId(selected);
          try {
            setDetail(await getEventOperations(active, selected));
          } catch {
            setDetail(null);
          }
        }
      } catch (cause) {
        if (cause instanceof EmployeeApiError && cause.status === 401) {
          clearStoredSession();
          router.replace("/login");
          return;
        }
        setError(
          cause instanceof EmployeeApiError
            ? cause.message
            : "Could not load event operations.",
        );
      }
    },
    [router, eventRecordId, focusId],
  );

  useEffect(() => {
    const stored = readStoredSession();
    if (stored === null) {
      router.replace("/login");
      return;
    }
    setSession(stored);
    void load(stored);
  }, [router, load]);

  async function handleEnsure() {
    if (session === null || eventRecordId === "") return;
    await ensureEventOperations(session, eventRecordId);
    await load(session);
  }

  async function handleRecalculate() {
    if (session === null || eventRecordId === "") return;
    await recalculateOperationsProgress(session, eventRecordId);
    await load(session);
  }

  if (session === null) {
    return (
      <main className="leads-shell">
        <p className="leads-loading">{error ?? "Loading…"}</p>
      </main>
    );
  }

  return (
    <main className="leads-shell">
      <header className="leads-topbar">
        <div>
          <p className="breadcrumb">
            <Link href={"/operations" as never}>Operations</Link> / Events
          </p>
          <h1>Event operations</h1>
        </div>
      </header>
      {error !== null ? <p className="leads-error">{error}</p> : null}
      <section className="quote-panel">
        <label className="quote-field">
          Event
          <select
            value={eventRecordId}
            onChange={(e) => setEventRecordId(e.target.value)}
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.eventNumber} — {e.eventName}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="claim-button"
          onClick={() => void handleEnsure()}
        >
          Ensure operations
        </button>
        <button
          type="button"
          className="claim-button"
          onClick={() => void handleRecalculate()}
        >
          Recalculate progress
        </button>
      </section>
      <section className="quote-panel">
        <h2>Progress list</h2>
        {rows.length === 0 ? (
          <p>No event progress yet.</p>
        ) : (
          <ul className="leads-list">
            {rows.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/operations/events?id=${row.eventRecordId}` as never}
                >
                  {row.eventNumber ?? row.eventRecordId}
                </Link>{" "}
                — {row.status} · {row.overallCompletionPercent}% ·{" "}
                {row.completedTasks}/{row.totalTasks} tasks
              </li>
            ))}
          </ul>
        )}
      </section>
      {detail !== null ? (
        <section className="quote-panel">
          <h2>
            Detail — {detail.eventNumber ?? detail.eventRecordId} ·{" "}
            {detail.progress.overallCompletionPercent}%
          </h2>
          <p className="leads-subtitle">
            Completion: {detail.completion.status} · tasks {detail.tasks.length}{" "}
            · attendance {detail.attendance.length} · issues{" "}
            {detail.issues.length} · materials {detail.materials.length}
          </p>
          <ul className="leads-list">
            {detail.tasks.map((task) => (
              <li key={task.id}>
                {task.title} — {task.status} · {task.completionPercent}%
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
