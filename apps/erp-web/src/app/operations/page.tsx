"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { OperationsDashboardResponse } from "@me-event/api-contracts";
import {
  clearStoredSession,
  EmployeeApiError,
  type EmployeeSession,
  getOperationsDashboard,
  readStoredSession,
} from "@/lib/employee-api";

export default function OperationsPage() {
  const router = useRouter();
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [dashboard, setDashboard] =
    useState<OperationsDashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (active: EmployeeSession) => {
      try {
        setDashboard(await getOperationsDashboard(active));
      } catch (cause) {
        if (cause instanceof EmployeeApiError && cause.status === 401) {
          clearStoredSession();
          router.replace("/login");
          return;
        }
        setError(
          cause instanceof EmployeeApiError
            ? cause.message
            : "Could not load operations.",
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
        <p className="leads-loading">{error ?? "Loading operations…"}</p>
      </main>
    );
  }

  return (
    <main className="leads-shell">
      <header className="leads-topbar">
        <div>
          <p className="breadcrumb">
            <Link href={"/" as never}>Home</Link> / Operations
          </p>
          <h1>Operations dashboard</h1>
          <p className="leads-subtitle">
            {dashboard.totalEvents} events · {dashboard.inProgressEvents} in
            progress · {dashboard.completedEvents} completed ·{" "}
            {dashboard.openIssues} open issues · {dashboard.pendingTasks}{" "}
            pending tasks · {dashboard.checkedInWorkers} checked in
          </p>
        </div>
        <div className="leads-session">
          <Link className="claim-button" href={"/operations/events" as never}>
            Events
          </Link>
          <Link className="claim-button" href={"/operations/tasks" as never}>
            Tasks
          </Link>
          <Link
            className="claim-button"
            href={"/operations/attendance" as never}
          >
            Attendance
          </Link>
          <Link className="claim-button" href={"/operations/issues" as never}>
            Issues
          </Link>
          <Link className="claim-button" href={"/operations/progress" as never}>
            Progress
          </Link>
          <Link
            className="claim-button"
            href={"/operations/materials" as never}
          >
            Materials
          </Link>
        </div>
      </header>
      {error !== null ? <p className="leads-error">{error}</p> : null}
      <section className="quote-panel">
        <h2>Event progress</h2>
        {dashboard.progress.length === 0 ? (
          <p>No event operations yet. Open Events to ensure progress.</p>
        ) : (
          <ul className="leads-list">
            {dashboard.progress.map((row) => (
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
      <section className="quote-panel">
        <h2>Recent tasks</h2>
        {dashboard.recentTasks.length === 0 ? (
          <p>No recent tasks.</p>
        ) : (
          <ul className="leads-list">
            {dashboard.recentTasks.map((row) => (
              <li key={row.id}>
                {row.title} — {row.status} · {row.priority} ·{" "}
                {row.eventNumber ?? row.eventRecordId}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="quote-panel">
        <h2>Recent issues</h2>
        {dashboard.recentIssues.length === 0 ? (
          <p>No recent issues.</p>
        ) : (
          <ul className="leads-list">
            {dashboard.recentIssues.map((row) => (
              <li key={row.id}>
                {row.issueType} — {row.status} · {row.priority} ·{" "}
                {row.eventNumber ?? row.eventRecordId}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
