"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type {
  EventRecordSummary,
  WorkerSummary,
  WorkerTaskSummary,
} from "@me-event/api-contracts";
import {
  assignWorker,
  clearStoredSession,
  EmployeeApiError,
  type EmployeeSession,
  listEvents,
  listWorkers,
  listWorkerTasks,
  readStoredSession,
} from "@/lib/employee-api";

export default function WorkerTasksPage() {
  const router = useRouter();
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [tasks, setTasks] = useState<readonly WorkerTaskSummary[]>([]);
  const [workers, setWorkers] = useState<readonly WorkerSummary[]>([]);
  const [events, setEvents] = useState<readonly EventRecordSummary[]>([]);
  const [workerId, setWorkerId] = useState("");
  const [eventRecordId, setEventRecordId] = useState("");
  const [title, setTitle] = useState("On-site duty");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (active: EmployeeSession) => {
      setError(null);
      try {
        const [taskList, workerList, eventList] = await Promise.all([
          listWorkerTasks(active),
          listWorkers(active),
          listEvents(active),
        ]);
        setTasks(taskList.tasks);
        setWorkers(workerList.workers);
        setEvents(eventList.events);
        if (workerId === "" && workerList.workers[0] !== undefined) {
          setWorkerId(workerList.workers[0].id);
        }
        if (eventRecordId === "" && eventList.events[0] !== undefined) {
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
            : "Could not load tasks.",
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

  async function handleAssign() {
    if (session === null) return;
    setBusy(true);
    setError(null);
    try {
      await assignWorker(session, {
        workerId,
        eventRecordId,
        title: title.trim(),
      });
      await load(session);
    } catch (cause) {
      setError(
        cause instanceof EmployeeApiError
          ? cause.message
          : "Could not assign worker.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (session === null) {
    return (
      <main className="leads-shell">
        <p className="leads-loading">{error ?? "Loading tasks…"}</p>
      </main>
    );
  }

  return (
    <main className="leads-shell">
      <header className="leads-topbar">
        <div>
          <p className="breadcrumb">
            <Link href={"/workers" as never}>Workers</Link>{" "}
            <span aria-hidden="true">/</span> Tasks
          </p>
          <h1>Worker tasks</h1>
        </div>
      </header>

      {error !== null ? <p className="leads-error">{error}</p> : null}

      <section className="quote-panel">
        <h2>Assign worker</h2>
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
                {e.eventNumber} — {e.eventName}
              </option>
            ))}
          </select>
        </label>
        <label className="quote-field">
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <button
          type="button"
          className="claim-button"
          disabled={busy || workerId === "" || eventRecordId === ""}
          onClick={() => void handleAssign()}
        >
          {busy ? "Assigning…" : "Assign"}
        </button>
      </section>

      <section className="quote-panel">
        <h2>All tasks</h2>
        {tasks.length === 0 ? (
          <p>No tasks yet.</p>
        ) : (
          <ul className="leads-list">
            {tasks.map((task) => (
              <li key={task.id}>
                <strong>{task.title}</strong> — {task.workerDisplayName} ·{" "}
                {task.status} · {task.eventNumber ?? task.eventRecordId}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
