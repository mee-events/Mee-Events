"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type {
  EventRecordSummary,
  WorkerPayoutSummary,
  WorkerSummary,
} from "@me-event/api-contracts";
import {
  clearStoredSession,
  createWorkerPayout,
  EmployeeApiError,
  type EmployeeSession,
  listEvents,
  listWorkers,
  listWorkerPayouts,
  readStoredSession,
  updateWorkerPayout,
} from "@/lib/employee-api";

export default function FinanceWorkersPage() {
  const router = useRouter();
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [rows, setRows] = useState<readonly WorkerPayoutSummary[]>([]);
  const [workers, setWorkers] = useState<readonly WorkerSummary[]>([]);
  const [events, setEvents] = useState<readonly EventRecordSummary[]>([]);
  const [workerId, setWorkerId] = useState("");
  const [eventRecordId, setEventRecordId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (active: EmployeeSession) => {
      try {
        const [payouts, workerList, eventList] = await Promise.all([
          listWorkerPayouts(active),
          listWorkers(active),
          listEvents(active),
        ]);
        setRows(payouts.payouts);
        setWorkers(workerList.workers);
        setEvents(eventList.events);
        if (workerId === "" && workerList.workers[0]) {
          setWorkerId(workerList.workers[0].id);
        }
        if (eventRecordId === "" && eventList.events[0]) {
          setEventRecordId(eventList.events[0].id);
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
            : "Could not load payouts.",
        );
      }
    },
    [router, workerId, eventRecordId],
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
            <Link href={"/finance" as never}>Finance</Link> / Workers
          </p>
          <h1>Worker payouts</h1>
        </div>
      </header>
      {error !== null ? <p className="leads-error">{error}</p> : null}
      <section className="quote-panel">
        <label className="quote-field">
          Worker
          <select
            value={workerId}
            onChange={(e) => setWorkerId(e.target.value)}
          >
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.displayName}
              </option>
            ))}
          </select>
        </label>
        <label className="quote-field">
          Event
          <select
            value={eventRecordId}
            onChange={(e) => setEventRecordId(e.target.value)}
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.eventNumber}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="claim-button"
          onClick={() =>
            void createWorkerPayout(session, {
              eventRecordId,
              workerId,
              amount: 2000,
            }).then(() => load(session))
          }
        >
          Create ₹2000 payout
        </button>
      </section>
      <section className="quote-panel">
        <ul className="leads-list">
          {rows.map((row) => (
            <li key={row.id}>
              {row.workerDisplayName ?? row.workerId} · {row.status} · ₹
              {row.amount}{" "}
              {row.status === "pending" ? (
                <button
                  type="button"
                  className="claim-button"
                  onClick={() =>
                    void updateWorkerPayout(session, row.id, {
                      status: "approved",
                    })
                      .then(() =>
                        updateWorkerPayout(session, row.id, { status: "paid" }),
                      )
                      .then(() => load(session))
                  }
                >
                  Approve & pay
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
