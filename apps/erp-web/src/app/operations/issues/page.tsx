"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type {
  EventIssuePriority,
  EventIssueSummary,
  EventIssueType,
  EventRecordSummary,
} from "@me-event/api-contracts";
import {
  clearStoredSession,
  createOperationsIssue,
  EmployeeApiError,
  type EmployeeSession,
  listEvents,
  listOperationsIssues,
  readStoredSession,
} from "@/lib/employee-api";

export default function OperationsIssuesPage() {
  const router = useRouter();
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [rows, setRows] = useState<readonly EventIssueSummary[]>([]);
  const [events, setEvents] = useState<readonly EventRecordSummary[]>([]);
  const [eventRecordId, setEventRecordId] = useState("");
  const [description, setDescription] = useState("");
  const [issueType, setIssueType] = useState<EventIssueType>("other");
  const [priority, setPriority] = useState<EventIssuePriority>("normal");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (active: EmployeeSession) => {
      try {
        const [issues, eventList] = await Promise.all([
          listOperationsIssues(active),
          listEvents(active),
        ]);
        setRows(issues.issues);
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
            : "Could not load issues.",
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
    if (session === null || eventRecordId === "" || description.trim() === "") {
      return;
    }
    await createOperationsIssue(session, {
      eventRecordId,
      description: description.trim(),
      issueType,
      priority,
    });
    setDescription("");
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
            <Link href={"/operations" as never}>Operations</Link> / Issues
          </p>
          <h1>Event issues</h1>
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
          Type
          <select
            value={issueType}
            onChange={(e) => setIssueType(e.target.value as EventIssueType)}
          >
            <option value="vendor_late">vendor_late</option>
            <option value="material_missing">material_missing</option>
            <option value="equipment_failure">equipment_failure</option>
            <option value="rain">rain</option>
            <option value="staff_absent">staff_absent</option>
            <option value="emergency">emergency</option>
            <option value="other">other</option>
          </select>
        </label>
        <label className="quote-field">
          Priority
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as EventIssuePriority)}
          >
            <option value="low">low</option>
            <option value="normal">normal</option>
            <option value="high">high</option>
            <option value="critical">critical</option>
          </select>
        </label>
        <label className="quote-field">
          Description
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Issue description"
          />
        </label>
        <button
          type="button"
          className="claim-button"
          onClick={() => void handleCreate()}
        >
          Create issue
        </button>
      </section>
      <section className="quote-panel">
        {rows.length === 0 ? (
          <p>No issues yet.</p>
        ) : (
          <ul className="leads-list">
            {rows.map((row) => (
              <li key={row.id}>
                {row.issueType} — {row.status} · {row.priority} ·{" "}
                {row.eventNumber ?? row.eventRecordId}: {row.description}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
