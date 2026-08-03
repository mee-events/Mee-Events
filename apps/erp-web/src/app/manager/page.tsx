"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { ManagerDashboardResponse } from "@me-event/api-contracts";
import {
  clearStoredSession,
  EmployeeApiError,
  type EmployeeSession,
  getManagerDashboard,
  readStoredSession,
} from "@/lib/employee-api";

export default function ManagerDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [dashboard, setDashboard] = useState<ManagerDashboardResponse | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (active: EmployeeSession) => {
      setError(null);
      try {
        setDashboard(await getManagerDashboard(active));
      } catch (cause) {
        if (cause instanceof EmployeeApiError && cause.status === 401) {
          clearStoredSession();
          router.replace("/login");
          return;
        }
        setError(
          cause instanceof EmployeeApiError
            ? cause.message
            : "Could not load manager dashboard.",
        );
      }
    },
    [router],
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

  if (session === null || dashboard === null) {
    return (
      <main className="leads-shell">
        <p className="leads-loading">{error ?? "Loading manager dashboard…"}</p>
      </main>
    );
  }

  return (
    <main className="leads-shell">
      <header className="leads-topbar">
        <div>
          <p className="breadcrumb">
            <Link href={"/" as never}>Home</Link>{" "}
            <span aria-hidden="true">/</span> Manager operations
          </p>
          <h1>Manager dashboard</h1>
          <p className="leads-subtitle">
            Operational ownership across assigned event records.
          </p>
        </div>
        <div className="leads-session">
          <Link className="claim-button" href={"/events" as never}>
            Event records
          </Link>
        </div>
      </header>

      {error !== null ? <p className="leads-error">{error}</p> : null}

      <section className="quote-panel">
        <h2>Snapshot</h2>
        <dl className="quote-meta">
          <div>
            <dt>Events</dt>
            <dd>{dashboard.assignedEvents}</dd>
          </div>
          <div>
            <dt>Active tasks</dt>
            <dd>{dashboard.activeTasks}</dd>
          </div>
          <div>
            <dt>Overdue</dt>
            <dd>{dashboard.overdueTasks}</dd>
          </div>
          <div>
            <dt>Completed today</dt>
            <dd>{dashboard.completedTasksToday}</dd>
          </div>
          <div>
            <dt>Progress today</dt>
            <dd>{dashboard.progressUpdatesToday}</dd>
          </div>
        </dl>
      </section>

      <section className="quote-panel">
        <h2>Overdue tasks</h2>
        {dashboard.overdueTaskList.length === 0 ? (
          <p>No overdue tasks.</p>
        ) : (
          <ul className="quote-timeline">
            {dashboard.overdueTaskList.map((task) => (
              <li key={task.id}>
                <strong>
                  <Link href={`/manager/tasks/${task.id}` as never}>
                    {task.title}
                  </Link>
                </strong>
                <span>
                  {task.eventNumber ?? task.eventRecordId} · {task.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="quote-panel">
        <h2>Upcoming tasks</h2>
        {dashboard.upcomingTasks.length === 0 ? (
          <p>No upcoming tasks.</p>
        ) : (
          <ul className="quote-timeline">
            {dashboard.upcomingTasks.map((task) => (
              <li key={task.id}>
                <strong>
                  <Link href={`/manager/tasks/${task.id}` as never}>
                    {task.title}
                  </Link>
                </strong>
                <span>
                  {task.eventNumber ?? "Event"} · due{" "}
                  {task.dueAt
                    ? new Date(task.dueAt).toLocaleString("en-IN")
                    : "unscheduled"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="quote-panel">
        <h2>Events</h2>
        <ul className="quote-timeline">
          {dashboard.myEvents.map((event) => (
            <li key={event.id}>
              <strong>
                <Link href={`/manager/events/${event.id}` as never}>
                  {event.eventNumber}
                </Link>
              </strong>
              <span>
                {event.eventName} · {event.status.replaceAll("_", " ")} ·{" "}
                {event.venueName ?? "Venue TBD"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
