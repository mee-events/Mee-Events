"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type {
  EventManagerDashboardResponse,
  EventProgressUpdateKind,
  EventTaskPriority,
  ManagerCandidateSummary,
} from "@me-event/api-contracts";
import {
  assignEventManager,
  clearStoredSession,
  createEventProgress,
  createEventTask,
  EmployeeApiError,
  type EmployeeSession,
  getEventManagerDashboard,
  listManagerCandidates,
  readStoredSession,
} from "@/lib/employee-api";

export default function ManagerEventOpsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const eventId = params.id;
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [dashboard, setDashboard] =
    useState<EventManagerDashboardResponse | null>(null);
  const [candidates, setCandidates] = useState<
    readonly ManagerCandidateSummary[]
  >([]);
  const [managerUserId, setManagerUserId] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState<EventTaskPriority>("normal");
  const [progressKind, setProgressKind] =
    useState<EventProgressUpdateKind>("morning");
  const [progressSummary, setProgressSummary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (active: EmployeeSession) => {
      setError(null);
      try {
        const [detail, people] = await Promise.all([
          getEventManagerDashboard(active, eventId),
          listManagerCandidates(active),
        ]);
        setDashboard(detail);
        setCandidates(people.candidates);
        if (detail.assignment !== undefined) {
          setManagerUserId(detail.assignment.managerUserId);
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
    [eventId, router],
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
    if (session === null || managerUserId.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      await assignEventManager(session, eventId, {
        managerUserId,
        priority: "normal",
      });
      await load(session);
    } catch (cause) {
      setError(
        cause instanceof EmployeeApiError
          ? cause.message
          : "Could not assign manager.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateTask() {
    if (session === null || taskTitle.trim().length === 0) return;
    setBusy(true);
    setError(null);
    try {
      await createEventTask(session, eventId, {
        title: taskTitle.trim(),
        priority: taskPriority,
        status: "pending",
      });
      setTaskTitle("");
      await load(session);
    } catch (cause) {
      setError(
        cause instanceof EmployeeApiError
          ? cause.message
          : "Could not create task.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleProgress() {
    if (session === null || progressSummary.trim().length === 0) return;
    setBusy(true);
    setError(null);
    try {
      await createEventProgress(session, eventId, {
        updateKind: progressKind,
        summary: progressSummary.trim(),
      });
      setProgressSummary("");
      await load(session);
    } catch (cause) {
      setError(
        cause instanceof EmployeeApiError
          ? cause.message
          : "Could not save progress.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (session === null || dashboard === null) {
    return (
      <main className="leads-shell">
        <p className="leads-loading">{error ?? "Loading event operations…"}</p>
      </main>
    );
  }

  const event = dashboard.event;

  return (
    <main className="leads-shell">
      <header className="leads-topbar">
        <div>
          <p className="breadcrumb">
            <Link href={"/manager" as never}>Manager</Link>{" "}
            <span aria-hidden="true">/</span> {event.eventNumber}
          </p>
          <h1>{event.eventName}</h1>
          <p className="leads-subtitle">
            {event.customerDisplayName ?? "Customer"} ·{" "}
            {event.eventDate ?? "Date TBD"} · {event.venueName ?? "Venue TBD"}
          </p>
        </div>
        <div className="leads-session">
          <Link className="claim-button" href={`/events/${event.id}` as never}>
            Event record
          </Link>
        </div>
      </header>

      {error !== null ? <p className="leads-error">{error}</p> : null}

      <section className="quote-panel">
        <h2>Manager assignment</h2>
        <dl className="quote-meta">
          <div>
            <dt>Status</dt>
            <dd>{event.status.replaceAll("_", " ")}</dd>
          </div>
          <div>
            <dt>Current manager</dt>
            <dd>
              {dashboard.assignment?.managerDisplayName ??
                dashboard.assignment?.managerUserId ??
                "Unassigned"}
            </dd>
          </div>
        </dl>
        <label className="quote-field">
          Assign manager
          <select
            value={managerUserId}
            onChange={(e) => setManagerUserId(e.target.value)}
          >
            <option value="">Select manager…</option>
            {candidates.map((candidate) => (
              <option key={candidate.userId} value={candidate.userId}>
                {candidate.displayName} ({candidate.role})
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="claim-button"
          disabled={busy || managerUserId.length === 0}
          onClick={() => void handleAssign()}
        >
          Save assignment
        </button>
        {dashboard.assignment?.managerNotes !== undefined ? (
          <p className="leads-subtitle">
            Manager notes: {dashboard.assignment.managerNotes}
          </p>
        ) : null}
      </section>

      <section className="quote-panel">
        <h2>Task board</h2>
        <label className="quote-field">
          New task
          <input
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            placeholder="Task name"
          />
        </label>
        <label className="quote-field">
          Priority
          <select
            value={taskPriority}
            onChange={(e) =>
              setTaskPriority(e.target.value as EventTaskPriority)
            }
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </label>
        <button
          type="button"
          className="claim-button"
          disabled={busy || taskTitle.trim().length === 0}
          onClick={() => void handleCreateTask()}
        >
          Create task
        </button>
        <ul className="quote-timeline">
          {dashboard.tasks.map((task) => (
            <li key={task.id}>
              <strong>
                <Link href={`/manager/tasks/${task.id}` as never}>
                  {task.title}
                </Link>
              </strong>
              <span>
                {task.status.replaceAll("_", " ")}
                {task.overdue ? " · overdue" : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="quote-panel">
        <h2>Overdue / upcoming</h2>
        <p className="leads-subtitle">
          Overdue: {dashboard.overdueTasks.length} · Upcoming:{" "}
          {dashboard.upcomingTasks.length}
        </p>
      </section>

      <section className="quote-panel">
        <h2>Daily progress</h2>
        <label className="quote-field">
          Update kind
          <select
            value={progressKind}
            onChange={(e) =>
              setProgressKind(e.target.value as EventProgressUpdateKind)
            }
          >
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
            <option value="evening">Evening</option>
            <option value="completion_summary">Completion summary</option>
          </select>
        </label>
        <label className="quote-field">
          Summary
          <textarea
            value={progressSummary}
            onChange={(e) => setProgressSummary(e.target.value)}
            rows={3}
            placeholder="Today's operational update…"
          />
        </label>
        <button
          type="button"
          className="claim-button"
          disabled={busy || progressSummary.trim().length === 0}
          onClick={() => void handleProgress()}
        >
          Save progress
        </button>
        <ul className="quote-timeline">
          {dashboard.progressUpdates.map((item) => (
            <li key={item.id}>
              <strong>{item.updateKind.replaceAll("_", " ")}</strong>
              <span>{item.summary}</span>
              <small>{item.reportDate}</small>
            </li>
          ))}
        </ul>
      </section>

      <section className="quote-panel">
        <h2>Timeline</h2>
        <ul className="quote-timeline">
          {dashboard.timeline.map((entry) => (
            <li key={entry.id}>
              <strong>{entry.title}</strong>
              <span>{entry.content ?? entry.entryType}</span>
              <small>
                {new Date(entry.occurredAt).toLocaleString("en-IN")}
              </small>
            </li>
          ))}
        </ul>
      </section>

      <section className="quote-panel">
        <h2>Activity feed</h2>
        <ul className="quote-timeline">
          {dashboard.activities.map((activity) => (
            <li key={activity.id}>
              <strong>{activity.activityType}</strong>
              <span>{activity.content ?? ""}</span>
              <small>
                {new Date(activity.occurredAt).toLocaleString("en-IN")}
              </small>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
