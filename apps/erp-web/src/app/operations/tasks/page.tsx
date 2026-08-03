"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type {
  EventRecordSummary,
  OperationsTaskCategory,
  OperationsTaskPriority,
  OperationsTaskSummary,
} from "@me-event/api-contracts";
import {
  clearStoredSession,
  createOperationsTask,
  EmployeeApiError,
  type EmployeeSession,
  listEvents,
  listOperationsTasks,
  readStoredSession,
} from "@/lib/employee-api";

export default function OperationsTasksPage() {
  const router = useRouter();
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [rows, setRows] = useState<readonly OperationsTaskSummary[]>([]);
  const [events, setEvents] = useState<readonly EventRecordSummary[]>([]);
  const [eventRecordId, setEventRecordId] = useState("");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<OperationsTaskPriority>("normal");
  const [category, setCategory] = useState<OperationsTaskCategory>("other");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (active: EmployeeSession) => {
      try {
        const [tasks, eventList] = await Promise.all([
          listOperationsTasks(active),
          listEvents(active),
        ]);
        setRows(tasks.tasks);
        setEvents(eventList.events);
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
            : "Could not load tasks.",
        );
      }
    },
    [router, eventRecordId],
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

  async function handleCreate() {
    if (session === null || eventRecordId === "" || title.trim() === "") return;
    await createOperationsTask(session, {
      eventRecordId,
      title: title.trim(),
      priority,
      category,
      isMandatory: false,
    });
    setTitle("");
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
            <Link href={"/operations" as never}>Operations</Link> / Tasks
          </p>
          <h1>Operations tasks</h1>
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
        <label className="quote-field">
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
          />
        </label>
        <label className="quote-field">
          Priority
          <select
            value={priority}
            onChange={(e) =>
              setPriority(e.target.value as OperationsTaskPriority)
            }
          >
            <option value="low">low</option>
            <option value="normal">normal</option>
            <option value="high">high</option>
            <option value="urgent">urgent</option>
          </select>
        </label>
        <label className="quote-field">
          Category
          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as OperationsTaskCategory)
            }
          >
            <option value="stage_setup">stage_setup</option>
            <option value="decorations">decorations</option>
            <option value="catering">catering</option>
            <option value="photography">photography</option>
            <option value="dj">dj</option>
            <option value="welcome">welcome</option>
            <option value="food_service">food_service</option>
            <option value="cleanup">cleanup</option>
            <option value="other">other</option>
          </select>
        </label>
        <button
          type="button"
          className="claim-button"
          onClick={() => void handleCreate()}
        >
          Create task
        </button>
      </section>
      <section className="quote-panel">
        {rows.length === 0 ? (
          <p>No tasks yet.</p>
        ) : (
          <ul className="leads-list">
            {rows.map((row) => (
              <li key={row.id}>
                {row.title} — {row.status} · {row.priority} · {row.category} ·{" "}
                {row.eventNumber ?? row.eventRecordId} · {row.completionPercent}
                %
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
